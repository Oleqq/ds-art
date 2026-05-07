# DS Art Staff Cabinet

Внутреннее приложение агентства DS Art для сотрудников, базы знаний, управления доступами и ручного production-deploy через companion-пакет.

## Что это за проект

Проект вырос из HTML-прототипа `docs/prototype/staff-cabinet (10).html` и доведен до рабочего Laravel-приложения на Inertia + React. Сейчас это уже не демо-макет, а почти релизный staff cabinet с двумя основными ролями:

- `admin` управляет сотрудниками, правами, структурой базы знаний и публикацией материалов;
- `employee` работает со своим профилем, видит только разрешенные разделы и может создавать или редактировать статьи в рамках выданных прав.

## Стек

- PHP `8.3+`
- Laravel `13`
- Laravel Fortify
- MySQL
- Inertia.js + React `19` + TypeScript
- Vite `8`
- Tailwind CSS `4`
- PHPUnit `12`
- Laravel Pint + ESLint + Prettier

## Как устроен проект

### Основной runtime flow

1. `routes/web.php` определяет web-маршруты для `admin`, `employee`, auth и служебных endpoints.
2. `app/Http/Controllers/...` принимает запрос, использует Form Requests и Policies.
3. `app/Support/...`, модели и Storage/Mail закрывают прикладную логику.
4. Laravel передает данные в `Inertia::render(...)`.
5. `resources/js/pages/...` и `resources/js/features/...` рендерят экран и отправляют изменения обратно через Inertia или JSON endpoints.

### Ключевые папки

- `app/Http/Controllers/Admin`
  - сотрудники, права доступа, база знаний, административные действия;
- `app/Http/Controllers/Employee`
  - профиль сотрудника, employee-flow базы знаний, личные сценарии;
- `app/Http/Controllers/Auth`
  - активация сотрудника по email-коду и onboarding;
- `app/Http/Requests`
  - валидация входящих данных;
- `app/Models`
  - `User`, `Employee`, `KnowledgeCategory`, `KnowledgeArticle`, ACL-модели, asset-модели;
- `app/Policies`
  - backend-авторизация;
- `app/Support/Employees`
  - активация сотрудников, пароли, служебные employee-сценарии;
- `app/Support/KnowledgeBase`
  - доступ, поиск, представление, синхронизация структуры статьи, каскадные операции;
- `app/Mail`
  - письма активации сотрудника;
- `resources/js/pages`
  - Inertia-страницы по ролям и разделам;
- `resources/js/features/employees`
  - список сотрудников, карточки, профиль, файлы, формы;
- `resources/js/features/knowledge-base`
  - дерево БЗ, редактор статьи, поиск, экспорт, media-блоки;
- `resources/views/mail`
  - email-шаблоны;
- `database/migrations`
  - схема сотрудников, базы знаний, ACL, аудита, активации;
- `database/seeders`
  - стартовые данные локальной среды;
- `docs`
  - roadmap, implementation-доки, deploy-инструкции и прототип.

## Основные продуктовые потоки

### Сотрудники

- список, карточка, создание, редактирование и удаление сотрудника;
- фото профиля, файлы, график работы, заметки руководителя;
- раздельные admin- и employee-представления данных.

### Активация сотрудника

1. Администратор создает сотрудника.
2. Сотрудник открывает `/register`.
3. На рабочую почту уходит код активации.
4. Сотрудник задает свой пароль.
5. Профиль активируется, после чего пользователь входит в приложение.

### База знаний

- древовидные разделы и вложенные категории;
- статьи с блоками, файлами, изображениями, видео, обложками и иконками;
- поиск по категориям, статьям, нормализованным блокам и asset-данным;
- drag-and-drop, копирование ссылки, перемещение, дублирование;
- единый shell для `admin` и `employee`, но с разными permission flags.

### Доступ и безопасность

- ACL на уровне сотрудника;
- персональная видимость разделов и статей;
- `access_level` статьи: `inherit`, `employees`, `admins`, `author`;
- аудит критичных действий;
- SMTP-конфигурация для production через `SMTP_*` с fallback на `MAIL_*`.

## Репозитории и deploy

- основной репозиторий приложения: `C:\dev\ds-art`
- companion manual deploy-пакет: `C:\dev\ds-art-manual-deploy`
  - `ds-art-app`
  - `public_html`

Локальная сборка делается в основном репозитории, после чего обновляется companion-пакет для ручного FTP-deploy.

## Этапы разработки

- `Phase 01`
  - фундамент Laravel/Inertia/React проекта;
- `Phase 02`
  - auth, роли, layouts;
- `Phase 03`
  - сотрудники и профиль;
- `Phase 04`
  - структура базы знаний;
- `Phase 05`
  - статьи, редактор, asset-слой;
- `Phase 06`
  - права доступа, поиск, стабилизация пользовательских потоков;
- `Phase 07`
  - production-готовность, deploy и операционные инструкции;
- `Phase 08`
  - AI-агент, сознательно оставлен в post-release backlog.

История этапов и подробные заметки по областям лежат в [docs/ROADMAP.md](docs/ROADMAP.md) и [docs/implementation](docs/implementation/README.md).

## Локальный запуск

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
npm run dev
```

Для production-сборки:

```bash
npm run build
```

Для текущего Vite нужен Node `20.19+` или `22.12+`. На этой машине сборка уже проверялась через Herd Node `v25.9.0`.

## Проверки

```bash
composer run lint:check
npm run lint:check
npm run format:check
npm run types:check
php artisan test
```

Полный локальный прогон:

```bash
composer run ci:check
```

## Что не коммитим

- `.env`, `.env.production`, `.env.local`, backup-env файлы;
- `docs/private/*`;
- локальная рабочая папка с заметками;
- `.cache/`;
- `public/build`, `public/hot`, `storage/app/public` и пользовательские файлы;
- локальные дампы, временные артефакты, IDE-кэш и служебные логи.

## Документация

- [Общая дорожная карта](docs/ROADMAP.md)
- [Индекс implementation-доков](docs/implementation/README.md)
- [Текущий статус проекта](docs/implementation/STATUS.md)
- [SMTP и активация сотрудников](docs/SMTP_И_АКТИВАЦИЯ_СОТРУДНИКОВ.md)
- [Deploy через FTP](docs/implementation/DEPLOY_FTP.md)
- [Финальный аудит и deploy checklist](docs/implementation/FINAL_AUDIT_AND_DEPLOY.md)
