# Деплой через FTP, SFTP или SSH

Инструкция для первого выката Laravel + Inertia + React приложения на обычный хостинг, где основная работа идет через FTP и phpMyAdmin/Adminer.

Этап 8 с AI-агентом здесь сознательно не учитываем. Сначала нужно стабильно выложить базовое приложение, базу знаний, сотрудников, права, поиск и файлы.

Сводный аудит и сравнение вариантов деплоя лежит в `docs/implementation/FINAL_AUDIT_AND_DEPLOY.md`.

Локальные рабочие доступы для деплоя можно хранить в `docs/private/DEPLOY_ACCESS.local.md`. Этот файл должен оставаться локальным и не попадать в Git.

## 0. Короткое Решение По Деплою

Лучший вариант: попросить у хостинга SSH/SFTP и возможность запускать `php artisan` на сервере. Тогда можно сделать нормальный GitHub/SSH deploy или хотя бы ручной SFTP deploy с миграциями на сервере.

Если есть только FTP, проект все равно можно выложить, но это будет ручной deploy:

- файлы собираются локально;
- `vendor` тоже готовится локально;
- база переносится SQL-дампом через phpMyAdmin;
- `storage` и `public/storage` настраиваются через панель хостинга или поддержку;
- при будущих изменениях схемы БД миграции придется превращать в SQL-дамп/SQL-патч или запускать через доступный terminal.

GitHub Actions по FTP может автоматизировать заливку файлов. Текущий workflow использует split-схему: backend Laravel уходит в `ds-art-app`, а публичные файлы из `public` уходят в `public_html`. Миграции можно запускать из GitHub Actions отдельным ручным флагом только если MySQL хостинга доступен извне для GitHub runner. Это не заменяет SSH полностью: `storage:link`, права папок, server cache и rollback БД без SSH остаются ручными.

## 0.1 Ответ На Текущий Сценарий

Если сейчас просто залить файлы по FTP, это не создаст таблицы, не добавит новые столбцы и вообще никак не изменит MySQL-схему.

FTP меняет только файлы приложения на сервере.

Это значит:

- если на сервере уже есть MySQL-база с актуальной схемой, а production `.env` указывает именно на нее, сайт может подняться;
- если база пустая, старая или в ней нет нужных миграций, сайт не поднимется корректно;
- новые поля вроде publication meta, access tables, article blocks, assets и audit log сами по себе от FTP не появятся.

Для первого тестового выката через FTP база будет в порядке только в одном из трех случаев:

- [ ] кто-то с доступом к phpMyAdmin/Adminer импортирует актуальный SQL-дамп из локальной базы;
- [ ] кто-то с SSH/terminal на сервере выполнит миграции.
- [ ] GitHub Actions сможет подключиться к production MySQL и выполнить workflow с `run_migrations=true`.

Если доступа к панели хостинга, к БД или к внешнему MySQL-подключению сейчас нет, то корректный первый выклад только по FTP без отдельной подготовки БД гарантировать нельзя.

## 1. Что Должно Быть На Хостинге

- [ ] PHP 8.3 или 8.4.
- [ ] MySQL 8 или совместимая версия.
- [ ] Доступ к FTP/SFTP.
- [ ] Доступ к phpMyAdmin или Adminer.
- [ ] Желательно SSH, но инструкция ниже учитывает вариант без SSH.
- [ ] Возможность выбрать корневую папку сайта или хотя бы загрузить файлы в `public_html`.
- [ ] Права записи на `storage` и `bootstrap/cache`.
- [ ] Возможность создать `public/storage` symlink или аналогичный публичный доступ к `storage/app/public`.
- [ ] Достаточные лимиты загрузки файлов: `upload_max_filesize`, `post_max_size`, `max_execution_time`.

## 2. Важное Правило Laravel

Публичной должна быть только папка `public`.

Нельзя просто положить весь Laravel-проект в открытую папку сайта так, чтобы из браузера были доступны:

- `.env`
- `vendor`
- `storage`
- `app`
- `database`

Правильная схема:

- Laravel-приложение лежит вне публичной папки.
- В публичную папку сайта попадает только содержимое `public`.

## 3. Рекомендуемая Структура На Хостинге

Если хостинг позволяет создать папки рядом с `public_html`, делаем так:

```text
/home/user/
  ds-art-app/
    app/
    bootstrap/
    config/
    database/
    public/
    resources/
    routes/
    storage/
    vendor/
    .env
    artisan
    composer.json

  public_html/
    index.php
    .htaccess
    build/
    favicon.ico
    storage -> ../ds-art-app/storage/app/public
```

Если хостинг позволяет выбрать document root, можно поставить корень сайта сразу на:

```text
ds-art-app/public
```

Тогда `index.php` менять не нужно. Но для текущего Beget-сценария выбран второй вариант: `public_html` остается document root, а workflow автоматически кладет туда публичные файлы и исправленный `index.php`.

## 4. Локальная Подготовка Перед Заливкой

На локальной машине перед FTP-загрузкой:

```powershell
composer install --no-dev --optimize-autoloader
npm install
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan event:clear
```

Если SSH нет, на этом шаге не нужно локально делать `php artisan optimize`: такие cache-файлы в `bootstrap/cache` могут утащить на сервер локальные значения из `.env`.

Сборка фронта:

```powershell
npm run build
```

Если используется Herd Node, сборку запускать так:

```powershell
$env:PATH='C:\Users\tovil\.config\herd\bin\nvm\v25.9.0;' + $env:PATH; npm run build
```

Важно: текущий Vite в проекте требует Node `20.19+`. Если системный `node -v` старее, собирать через Herd Node обязательно.

Перед архивированием проверить:

```powershell
php artisan test --filter=KnowledgeBasePagesTest --stop-on-failure
php artisan test --filter=Settings --stop-on-failure
npm run types:check
vendor\bin\pint.bat --test
```

## 5. Что Загружать По FTP

В папку приложения на хостинге, например `ds-art-app`, загрузить:

- [ ] `app`
- [ ] `bootstrap`
- [ ] `config`
- [ ] `database`
- [ ] `resources`
- [ ] `routes`
- [ ] `storage`
- [ ] `vendor`
- [ ] `artisan`
- [ ] `composer.json`
- [ ] `composer.lock`

В публичную папку сайта, например `public_html`, загрузить содержимое локальной папки `public`:

- [ ] `index.php`
- [ ] `.htaccess`
- [ ] `build`
- [ ] `favicon.ico`, если есть
- [ ] остальные публичные файлы из `public`

Папки `node_modules` на хостинг не загружаем.

`.env` не переносим как обычный deploy-артефакт из локальной машины. Его нужно создать или отредактировать отдельно на сервере по шаблону `.env.production.example`.

## 6. Если Public Лежит Отдельно

Если содержимое `public` лежит в `public_html`, а приложение в `ds-art-app`, нужно поправить `public_html/index.php`.

Текущий GitHub Actions workflow делает это автоматически. Если деплой выполняется руками, правка такая:

Было:

```php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
```

Должно стать:

```php
require __DIR__.'/../ds-art-app/vendor/autoload.php';
$app = require_once __DIR__.'/../ds-art-app/bootstrap/app.php';
```

Также путь maintenance-файла должен смотреть в приложение:

```php
if (file_exists($maintenance = __DIR__.'/../ds-art-app/storage/framework/maintenance.php')) {
    require $maintenance;
}
```

Если document root выставлен прямо на `ds-art-app/public`, `index.php` не меняем.

## 7. Production `.env`

На хостинге создать `.env` в корне Laravel-приложения.
Локальный `.env` не использовать бездумно: в нем могут быть dev-домены, локальные DB-доступы и другие неподходящие значения.

В проекте есть шаблон:

```text
.env.production.example
```

Его можно использовать как основу и заменить значения домена, базы данных и `APP_KEY`.

Пример:

```env
APP_NAME="DS Art"
APP_ENV=production
APP_KEY=base64:PUT_REAL_KEY_HERE
APP_DEBUG=false
APP_URL=https://example.com

APP_LOCALE=ru
APP_FALLBACK_LOCALE=ru
APP_FAKER_LOCALE=ru_RU

LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=database_name
DB_USERNAME=database_user
DB_PASSWORD=database_password

SESSION_DRIVER=file
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null

CACHE_STORE=file
QUEUE_CONNECTION=sync
FILESYSTEM_DISK=public

MAIL_MAILER=log
MAIL_FROM_ADDRESS="no-reply@example.com"
MAIL_FROM_NAME="${APP_NAME}"

VITE_APP_NAME="${APP_NAME}"
```

`APP_KEY` можно сгенерировать локально:

```powershell
php artisan key:generate --show
```

Сгенерированное значение вставить в `.env` на хостинге.

## 8. База Данных

База должна быть живой MySQL-БД на хостинге. Все изменения в сотрудниках, правах, статьях, тегах, черновиках и файлах пишутся backend-ом в MySQL и `storage` при обычных HTTP-запросах.

Отдельный realtime-сервер для MVP не нужен. Важно не перепутать это с WebSocket-realtime: текущий продукт сохраняет данные сразу, но не синхронизирует открытые вкладки мгновенно без перехода или перезагрузки Inertia-данных.

На 24.04.2026 локальная база уже содержит актуальную схему проекта:

- `24` статьи;
- `15` разделов;
- `47` записей в `knowledge_article_blocks`;
- таблицы `knowledge_user_permissions`, `knowledge_user_category_permissions`, `knowledge_user_article_permissions`;
- таблицу `audit_logs`;
- publication-поля статьи: `is_published`, `scheduled_publish_at`, `tags`.

Если production-база должна сразу соответствовать локальному состоянию, safest путь для первого выката без SSH:

1. Локально выполнить все миграции и убедиться, что сайт полностью работает.
2. Экспортировать полный SQL-дамп именно этой локальной базы.
3. Импортировать этот дамп в production MySQL.
4. Только после этого заливать файлы и прописывать production `.env`.

### Вариант С SSH

Если есть SSH:

```bash
php artisan migrate --force
php artisan db:seed --force
php artisan knowledge-base:sync-article-structure
```

Сиды на production запускать только если нужен демо-контент.

### Вариант Только FTP + phpMyAdmin

Если SSH нет:

- [ ] Локально поднять актуальную БД.
- [ ] Локально выполнить все миграции и сиды.
- [ ] Экспортировать SQL-дамп.
- [ ] Импортировать SQL-дамп через phpMyAdmin на хостинге.
- [ ] После импорта проверить, что production `.env` смотрит именно в эту БД.
- [ ] При последующих обновлениях не затирать живую БД локальным дампом без бэкапа production-БД.

Локальный экспорт можно сделать через `mysqldump`, если он доступен:

```powershell
mysqldump -h 127.0.0.1 -P 3306 -u root ds_art > ds_art_prod.sql
```

Если `mysqldump` недоступен, экспортировать через Adminer/phpMyAdmin локально.

### Вариант GitHub Actions + FTP + Прямой MySQL

Если SSH нет, но Beget разрешает подключение к production MySQL извне, можно выполнить миграции из GitHub Actions:

1. В GitHub Actions secrets добавить `PRODUCTION_APP_KEY`, `PRODUCTION_DB_HOST`, `PRODUCTION_DB_PORT`, `PRODUCTION_DB_DATABASE`, `PRODUCTION_DB_USERNAME`, `PRODUCTION_DB_PASSWORD`.
2. В GitHub Actions variables добавить `PRODUCTION_APP_URL`, `FTP_APP_DIR=/ds-art-app`, `FTP_PUBLIC_DIR=/public_html`.
3. Запустить workflow `deploy production over ftp` вручную.
4. Для первого запуска включить `run_migrations=true`.
5. `seed_database=true` включать только один раз на пустой production-БД, если нужны стартовые demo-данные.

Если workflow падает на миграциях с timeout, connection refused или access denied, значит прямое подключение к MySQL с GitHub runner заблокировано. Тогда остается SSH или SQL-импорт через phpMyAdmin/Adminer.

## 9. Файлы И Storage

В проекте файлы сотрудников, обложки, изображения и ассеты статей пишутся на `public` disk.

Для Laravel это означает:

```text
storage/app/public
```

Должна быть публичная ссылка:

```text
public/storage -> storage/app/public
```

Если есть SSH:

```bash
php artisan storage:link
```

Если SSH нет:

- [ ] Попробовать создать symlink через панель хостинга.
- [ ] Если symlink недоступен, уточнить у хостинга способ публикации `storage/app/public`.
- [ ] Без публичного `storage` загруженные файлы и изображения могут сохраняться в БД, но не открываться в браузере.

## 10. Права На Папки

Laravel должен иметь право писать в:

- [ ] `storage`
- [ ] `bootstrap/cache`

Типовые права:

```text
storage: 775
bootstrap/cache: 775
```

Если хостинг требует другие права, использовать рекомендации хостинга.

## 11. Что Не Нужны Сейчас

На текущем MVP не подключаем просто так:

- [ ] Redis
- [ ] Horizon
- [ ] очереди
- [ ] Laravel Pulse
- [ ] Scout/Meilisearch

Почему: сейчас нет реальной нагрузки, долгих фоновых задач и отдельной observability-задачи. Если они появятся, подключим точечно.

## 12. Проверка После Заливки

После деплоя проверить:

- [ ] Открывается `/login`.
- [ ] Можно войти под admin.
- [ ] Можно войти под employee.
- [ ] Admin видит `/admin`.
- [ ] Employee видит `/employee`.
- [ ] Открываются сотрудники.
- [ ] Открывается база знаний.
- [ ] Открывается статья.
- [ ] Создается тестовая статья.
- [ ] Загружается файл/изображение.
- [ ] Поиск работает.
- [ ] Employee не видит admin-only статью.
- [ ] `/admin/access` работает.
- [ ] Ошибки не светятся пользователю, потому что `APP_DEBUG=false`.

## 12.1 Минимальный Чек-Лист Для Твоего Первого Тестового Выката

Если ты сейчас хочешь сделать именно первый ручной выкат через FTP, то порядок должен быть таким:

1. Локально выполнить `composer install --no-dev --optimize-autoloader` и `npm run build`.
2. Локально сделать SQL-дамп актуальной базы.
3. Получить от работы не только FTP, но и способ импортировать этот дамп в production MySQL.
4. Получить production `.env`-параметры для БД.
5. Залить Laravel-файлы и содержимое `public`.
6. Проверить, что `index.php` указывает в правильную папку приложения.
7. Проверить, что `storage` доступен публично через `public/storage`.
8. Проверить логин под `admin@agency.ru` и `anna@agency.ru`.

Если шагов `2-4` нет, то сейчас у тебя нет полного набора для безопасного первого выката, даже если сам FTP рабочий.

## 13. Бэкап Перед Любым Обновлением

Перед каждым обновлением на хостинге:

- [ ] Сделать экспорт MySQL через phpMyAdmin.
- [ ] Скачать папку `storage/app/public`.
- [ ] Скачать текущий `.env`.
- [ ] Только после этого заливать новую версию файлов.

## 14. Обновление Уже Залитого Приложения

Перед обновлением:

```powershell
npm run build
composer install --no-dev --optimize-autoloader
```

Если на хостинге есть SSH, после заливки и настройки production `.env` выполнить:

```bash
php artisan optimize
```

Если SSH нет, не переносить на прод локально сгенерированные `bootstrap/cache/*.php`.

По FTP обновить:

- [ ] `app`
- [ ] `bootstrap`
- [ ] `config`
- [ ] `database`
- [ ] `resources`
- [ ] `routes`
- [ ] `vendor`
- [ ] `public/build`

Не затирать без необходимости:

- [ ] `.env`
- [ ] `storage/app/public`

Если появились новые миграции:

- при SSH выполнить `php artisan migrate --force`
- без SSH подготовить локальную БД и импортировать новый SQL-дамп через phpMyAdmin

## 15. Откат

Если после обновления что-то сломалось:

- [ ] Вернуть предыдущие файлы из локального архива.
- [ ] Вернуть SQL-дамп через phpMyAdmin.
- [ ] Вернуть папку `storage/app/public`, если обновление затрагивало файлы.
- [ ] Проверить `.env`, `APP_KEY`, DB-доступы и права на `storage`.
