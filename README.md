# DS Art Staff Cabinet

Внутренний кабинет агентства для сотрудников, прав доступа и базы знаний. Проект собран как Laravel/Inertia/React приложение с темной и светлой темой, редактором материалов и управлением доступами по ролям.

## Стек

- Laravel 13, PHP 8.3+
- MySQL для production, SQLite для тестов
- Inertia.js, React 19, TypeScript
- Vite 8, Tailwind CSS 4
- Laravel Fortify для авторизации

## Что готово

- Авторизация администратора и сотрудника.
- Экран сотрудников, карточка сотрудника и настройки профиля.
- Экран прав доступа с правами действий и доступом к разделам базы знаний.
- База знаний: разделы, подразделы, статьи, поиск, быстрый поиск в сайдбаре.
- Редактор статей с блоками, обложками, иконками, тегами, черновиками и сохранением статуса.
- Управление контентом в базе знаний: выбор элементов, bulk-действия, перемещение и сортировка drag-and-drop.
- Темная и светлая тема, приведенные к текущему UI/UX-киту проекта.
- Документация по этапам, финальному аудиту и FTP-деплою.

## Что не закрыто перед production

- Первый production-деплой еще не выполнен и не проверен на реальном хостинге.
- Production `.env`, подключение MySQL, права на `storage/` и `bootstrap/cache/` нужно настроить на сервере.
- При FTP-only деплое база данных не обновляется сама: нужно отдельно импортировать SQL dump или выполнить миграции через SSH/панель хостинга.
- Нужен финальный ручной QA-проход на домене после выката.
- AI-агент из `phase-08` пока оставлен как следующая большая фича, не как blocker MVP.

## Тестовые доступы

Сидеры создают две учетные записи для локальной и тестовой проверки:

- `admin@agency.ru` / `password` - администратор, Михаил Соколов
- `anna@agency.ru` / `password` - сотрудник, Анна Волкова

Пароли тестовые. На реальном домене их нужно заменить перед передачей доступа команде.

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

## Проверки

```bash
composer lint:check
npm run types:check
npm run build
php artisan test
```

## Документация

- [Финальный аудит и деплой](docs/implementation/FINAL_AUDIT_AND_DEPLOY.md)
- [GitHub-деплой](docs/implementation/GITHUB_DEPLOY.md)
- [FTP-деплой](docs/implementation/DEPLOY_FTP.md)
- [Статус реализации](docs/implementation/STATUS.md)
- [Фазы реализации](docs/implementation/phases)
- [Прототип](docs/prototype)

## Безопасность

Не коммитить реальные доступы и окружение:

- `.env`
- `.env.production`
- `docs/private/*.local.md`
- `storage/`
- `public/storage`

Локальные FTP/DB-доступы хранятся только в `docs/private/DEPLOY_ACCESS.local.md`; этот файл намеренно игнорируется git.
