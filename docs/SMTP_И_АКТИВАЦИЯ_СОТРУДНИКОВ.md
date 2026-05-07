# SMTP и активация сотрудников

Этот документ описывает финальную схему employee-onboarding и mail-настройки.

## Что уже работает

- при создании сотрудника больше не используется временный пароль;
- сотрудник открывает `/register`, получает email-код и сам задает пароль;
- после успешного ввода кода профиль активируется сразу;
- письма активации отправляются через обычную mail-конфигурацию Laravel.

## Как теперь настраивать `.env`

Рекомендуемый путь: заполнить только `SMTP_*`. Если эти переменные непустые, приложение берет их с приоритетом над `MAIL_*`.

```env
SMTP_MAILER=smtp
SMTP_SCHEME=tls
SMTP_ENCRYPTION=tls
SMTP_HOST=
SMTP_PORT=
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_ADDRESS=
SMTP_FROM_NAME="DS Art"
SMTP_EHLO_DOMAIN=
```

`MAIL_*` по-прежнему поддерживаются как fallback, если хостинг или локальная среда используют стандартные имена Laravel-переменных.

## Что это дает

- можно оставить старые `MAIL_*` как fallback;
- достаточно дописать рабочие `SMTP_*` в `.env`;
- отправка кодов активации и mail-поток начинают работать без дополнительной настройки кода.

## Где это используется в проекте

- экран активации: `resources/js/pages/auth/register.tsx`
- контроллер активации: `app/Http/Controllers/Auth/EmployeeActivationController.php`
- письмо с кодом: `app/Mail/EmployeeActivationCodeMail.php`
- mail-template: `resources/views/mail/employee-activation-code.blade.php`
- mail-конфиг: `config/mail.php`

## Как проверить после настройки

1. Создать нового сотрудника с рабочей почтой.
2. Открыть `/register`.
3. Запросить код на эту почту.
4. Ввести код и задать пароль.
5. Проверить, что сотрудник авторизуется и попадает в свой кабинет.

## Если письмо не уходит

Проверить в первую очередь:

- корректность `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`;
- разрешенный `SMTP_FROM_ADDRESS` у почтового провайдера;
- шифрование `SMTP_SCHEME` / `SMTP_ENCRYPTION`;
- реальный доступ сервера к SMTP-хосту.
