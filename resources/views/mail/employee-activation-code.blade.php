<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Код активации DS Art</title>
</head>
<body style="margin:0;background:#f4f1eb;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#171717;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid rgba(0,0,0,0.08);">
        <tr>
            <td style="padding:28px 28px 18px;background:linear-gradient(135deg,#1f1f1f 0%,#141414 100%);color:#ffffff;">
                <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.62);">DS Art</div>
                <div style="margin-top:10px;font-size:24px;line-height:1.2;font-weight:700;">Код активации сотрудника</div>
                <div style="margin-top:8px;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.82);">
                    {{ $recipientName }}, используйте этот код для активации доступа в базу сотрудников.
                </div>
            </td>
        </tr>
        <tr>
            <td style="padding:28px;">
                <div style="display:inline-block;padding:16px 22px;border-radius:16px;background:#fff0f2;border:1px solid rgba(204,0,30,0.16);font-size:32px;letter-spacing:0.22em;font-weight:700;color:#d70021;">
                    {{ $code }}
                </div>

                <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#4b5563;">
                    Код действует {{ $ttlMinutes }} минут. Если вы не запрашивали активацию, просто проигнорируйте это письмо.
                </p>

                <p style="margin:18px 0 0;font-size:14px;line-height:1.7;color:#6b7280;">
                    После ввода кода вы сможете задать собственный пароль и войти в приложение.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
