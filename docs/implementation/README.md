# Implementation Docs

Этот раздел теперь используется как технический индекс проекта, а не как дневник промежуточных правок.

## С чего начинать

1. Открыть [README проекта](../../README.md).
2. Прочитать [текущий статус](STATUS.md).
3. Перейти в нужную предметную область из `areas/`.
4. Если нужен исторический контекст по этапам разработки - смотреть `phases/`.

## Что лежит в этой папке

- [STATUS.md](STATUS.md)
  - краткий финальный срез состояния проекта;
- [RULES.md](RULES.md)
  - инженерные правила и ограничения, на которых проект собирался;
- `areas/`
  - документация по предметным областям;
- `phases/`
  - история этапов разработки по крупным блокам;
- [DEPLOY_FTP.md](DEPLOY_FTP.md)
  - ручной deploy через FTP/phpMyAdmin;
- [FINAL_AUDIT_AND_DEPLOY.md](FINAL_AUDIT_AND_DEPLOY.md)
  - финальный audit/deploy checklist;
- [GITHUB_DEPLOY.md](GITHUB_DEPLOY.md)
  - автоматический FTP-deploy через GitHub Actions;
- [PROTOTYPE_FULL_AUDIT.md](PROTOTYPE_FULL_AUDIT.md)
  - сверка с HTML-прототипом.

## Предметные области

- [auth-and-roles.md](areas/auth-and-roles.md)
  - аутентификация, роли, ограничения доступа;
- [employees.md](areas/employees.md)
  - модуль сотрудников и профиль;
- [knowledge-base.md](areas/knowledge-base.md)
  - разделы, категории, статьи, дерево БЗ;
- [editor-and-media.md](areas/editor-and-media.md)
  - редактор статьи, блоки, asset-слой;
- [files-and-storage.md](areas/files-and-storage.md)
  - хранение файлов и публичных asset-данных;
- [database-content-storage.md](areas/database-content-storage.md)
  - структура хранения контента в БД;
- [search-and-ai.md](areas/search-and-ai.md)
  - поиск и отложенный AI-контур;
- [backend.md](areas/backend.md)
  - backend-структура;
- [frontend.md](areas/frontend.md)
  - frontend-структура.

Отдельные точечные документы по шестому этапу сохранены как историческая детализация:

- [phase-06-access-policy-and-authors.md](areas/phase-06-access-policy-and-authors.md)
- [phase-06-search-start.md](areas/phase-06-search-start.md)
- [phase-06-sidebar-search-preview.md](areas/phase-06-sidebar-search-preview.md)

## Этапы разработки

- [phase-01-foundation.md](phases/phase-01-foundation.md)
- [phase-02-auth-and-layouts.md](phases/phase-02-auth-and-layouts.md)
- [phase-03-employees.md](phases/phase-03-employees.md)
- [phase-04-knowledge-base-structure.md](phases/phase-04-knowledge-base-structure.md)
- [phase-05-articles-and-editor.md](phases/phase-05-articles-and-editor.md)
- [phase-06-access-search-and-hardening.md](phases/phase-06-access-search-and-hardening.md)
- [phase-07-operations.md](phases/phase-07-operations.md)
- [phase-08-ai-agent.md](phases/phase-08-ai-agent.md)

## Deploy и эксплуатация

- ручной deploy: [DEPLOY_FTP.md](DEPLOY_FTP.md)
- production checklist: [FINAL_AUDIT_AND_DEPLOY.md](FINAL_AUDIT_AND_DEPLOY.md)
- GitHub Actions deploy: [GITHUB_DEPLOY.md](GITHUB_DEPLOY.md)

Companion manual deploy-пакет находится вне этого репозитория:

- `C:\dev\ds-art-manual-deploy\ds-art-app`
- `C:\dev\ds-art-manual-deploy\public_html`

## Локальные секреты и неversioned материалы

- `docs/private/*` используется только для локальных секретов и не попадает в git;
- локальная рабочая папка с заметками исключена из репозитория и не должна попадать в git;
- production `.env`, доступы и временные служебные заметки не должны храниться в versioned документации.
