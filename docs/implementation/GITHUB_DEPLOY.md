# GitHub Deploy На Реальный Домен

Дата: 24.04.2026.

## Коротко

В репозитории добавлен ручной workflow:

```text
.github/workflows/deploy-production-ftp.yml
```

Он собирает проект в GitHub Actions и загружает файлы на хостинг по FTP. Workflow не запускается автоматически на каждый push. Его нужно запускать руками из GitHub: `Actions -> deploy production over ftp -> Run workflow`.

Важно: обычный FTP-деплой обновляет только файлы. В workflow добавлены ручные флаги для миграций и первичного seed. Из-за того, что MySQL на Beget может не принимать внешние подключения от GitHub Actions, миграции запускаются уже после загрузки файлов через временный защищенный PHP-runner на самом хостинге. `storage:link`, права папок и production `.env` все равно нужно настроить на хостинге отдельно.

## Лучший Вариант На Хостинге

Попросить у Project Manager или у поддержки хостинга:

- SSH-доступ;
- Composer на сервере;
- PHP CLI той же версии, что web PHP;
- возможность выставить document root домена на папку `ds-art-app/public`;
- доступ к phpMyAdmin/Adminer;
- возможность создать symlink `public/storage -> storage/app/public`.

Если SSH дадут, деплой станет нормальным:

```bash
git pull
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan storage:link
php artisan optimize
```

## Временный Вариант Через GitHub Actions + FTP

Этот вариант подходит, если SSH пока нет, но есть FTP и доступ к панели хостинга.

### 1. Настроить Папки На Хостинге

Текущий workflow использует split-схему, поэтому document root менять не обязательно:

```text
/home/account/
  ds-art-app/
    app/
    bootstrap/
    config/
    public/
    storage/
    vendor/
    .env

  public_html/
    index.php
    .htaccess
    build/
```

Laravel-приложение загружается в `ds-art-app`, а содержимое папки `public` загружается в `public_html`. Workflow автоматически заменяет `public_html/index.php`, чтобы он подключал приложение из:

```text
../ds-art-app/vendor/autoload.php
../ds-art-app/bootstrap/app.php
```

Важно: в `public_html` не должен лежать весь Laravel-проект. Там должны быть только публичные файлы.

### 2. Создать Production `.env`

На сервере в папке `ds-art-app` создать `.env` на основе:

```text
.env.production.example
```

Минимально заменить:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://real-domain.ru
APP_KEY=base64:REAL_GENERATED_KEY

DB_CONNECTION=mysql
DB_HOST=...
DB_PORT=3306
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...

FILESYSTEM_DISK=public
QUEUE_CONNECTION=sync
CACHE_STORE=file
SESSION_DRIVER=file
```

`APP_KEY` можно сгенерировать локально:

```powershell
php artisan key:generate --show
```

### 3. Настроить GitHub Secrets И Variables

В GitHub:

```text
Repository -> Settings -> Secrets and variables -> Actions
```

Добавить secrets:

```text
FTP_HOST
FTP_USERNAME
FTP_PASSWORD
```

Добавить repository variables:

```text
FTP_APP_DIR
FTP_PUBLIC_DIR
PRODUCTION_APP_URL
```

Пример `FTP_APP_DIR`:

```text
/ds-art-app
```

Пример `FTP_PUBLIC_DIR`:

```text
/public_html
```

Точный путь зависит от FTP-корня. Если при подключении по FTP ты уже находишься в домашней папке аккаунта, обычно достаточно `/ds-art-app`. Если FTP открывается внутри другой директории, путь нужно проверить в файловом менеджере хостинга.

### 4. База Данных

Для первого запуска нужен один из вариантов:

1. SSH есть: выполнить миграции на сервере.

```bash
php artisan migrate --force
php artisan db:seed --force
```

2. SSH нет: убедиться, что production `.env` лежит на сервере в `ds-art-app/.env`, затем запустить workflow вручную с `run_migrations=true`.

`seed_database=true` включать только один раз на пустой production-базе, если нужны тестовые пользователи, Анна Волкова и стартовая база знаний. Повторно seed на живой базе не запускать: сидеры обновляют demo-структуру и могут удалить пользователей/сотрудников, которых нет в demo-наборе.

3. Если server-side migration runner падает из-за production `.env`, прав папок или версии PHP, импортировать SQL dump через phpMyAdmin/Adminer либо попросить SSH/терминал у хостинга.

Без одного из этих шагов таблицы и столбцы не появятся. Простая загрузка файлов по FTP базу не создаст.

### 5. Storage

Нужно, чтобы Laravel мог писать в:

```text
storage/
bootstrap/cache/
```

И чтобы публичные файлы открывались через:

```text
public/storage -> storage/app/public
```

Если SSH есть:

```bash
php artisan storage:link
```

Если SSH нет, symlink нужно создать через панель хостинга или попросить поддержку.

### 6. Запуск Деплоя

После настройки secrets:

1. Открыть GitHub репозиторий `DS-Art`.
2. Перейти в `Actions`.
3. Выбрать `deploy production over ftp`.
4. Нажать `Run workflow`.
5. Для первого запуска базы включить `run_migrations=true`. `seed_database=true` включать только на пустой базе и только один раз.
6. Дождаться успешного завершения.

Если шаг `Run server-side production database tasks` падает, открыть лог этого шага. Чаще всего причина в том, что на сервере нет `ds-art-app/.env`, неверные DB-параметры в `.env`, нет прав на `storage` / `bootstrap/cache`, либо web PHP не той версии.

После деплоя проверить:

- `/login`;
- вход под админом;
- вход под Анной;
- `/admin/knowledge-base`;
- `/admin/access`;
- создание тестовой статьи;
- загрузку изображения;
- открытие загруженного файла из браузера.

## Что Workflow Делает

- ставит PHP 8.4;
- ставит Node 22;
- выполняет `composer install --no-dev --optimize-autoloader`;
- выполняет `npm ci`;
- выполняет `npm run build`;
- чистит локальные Laravel cache перед упаковкой;
- загружает backend Laravel по FTP в `FTP_APP_DIR`;
- загружает публичные файлы из `public` по FTP в `FTP_PUBLIC_DIR` или `/public_html`, если переменная не задана;
- автоматически переписывает `public_html/index.php` под split-схему `public_html -> ../ds-art-app`.
- при ручных флагах `run_migrations` / `seed_database` создает временный `__ds_art_deploy_runner.php` в публичной папке, вызывает его по одноразовому токену, запускает `php artisan migrate --force` / `php artisan db:seed --force` уже на хостинге и затем удаляет runner по FTP.

Workflow не загружает:

- `.env`;
- `.env.production`;
- `auth.json`;
- `node_modules`;
- `tests`;
- `docs/private`;
- текущие пользовательские файлы из `storage/app/public`;
- `public/storage`.

Это сделано специально, чтобы не затереть production-секреты и загруженные пользователями файлы.

## Когда Появится SSH

После получения SSH лучше заменить FTP workflow на SSH-deploy:

- `git pull` на сервере;
- `composer install`;
- `npm run build` либо загрузка готового `public/build`;
- `php artisan migrate --force`;
- `php artisan optimize`;
- нормальный rollback через git.

Это будет заметно безопаснее для production.
