<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\EmployeeActivationCodeMail;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class EmployeeActivationController extends Controller
{
    private const CODE_TTL_MINUTES = 20;

    public function create(Request $request): Response
    {
        return Inertia::render('auth/register', [
            'status' => $request->session()->get('status'),
            'defaultEmail' => old('email', $request->string('email')->toString()),
        ]);
    }

    public function sendCode(Request $request): RedirectResponse
    {
        $payload = $request->validate([
            'email' => ['required', 'string', 'email', 'max:120'],
        ]);

        $user = $this->resolveEmployeeUser($payload['email']);

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => 'Сотрудник с такой почтой не найден. Проверьте адрес или создайте сотрудника в команде.',
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => 'Этот сотрудник деактивирован. Для активации обратитесь к руководителю.',
            ]);
        }

        if ($user->activated_at && $user->email_verified_at) {
            throw ValidationException::withMessages([
                'email' => 'Профиль уже активирован. Используйте экран входа или восстановление пароля.',
            ]);
        }

        $code = (string) random_int(100000, 999999);

        $user->forceFill([
            'activation_code' => Hash::make($code),
            'activation_code_expires_at' => now()->addMinutes(self::CODE_TTL_MINUTES),
            'activation_code_sent_at' => now(),
        ])->save();

        try {
            Mail::to($user->email)->send(
                new EmployeeActivationCodeMail(
                    recipientName: $user->name,
                    code: $code,
                    ttlMinutes: self::CODE_TTL_MINUTES,
                ),
            );
        } catch (Throwable $exception) {
            report($exception);

            throw ValidationException::withMessages([
                'email' => 'Не удалось отправить код. Проверьте настройки SMTP и повторите попытку.',
            ]);
        }

        return back()
            ->with('status', 'Код активации отправлен на указанную почту.')
            ->withInput(['email' => $user->email]);
    }

    public function store(Request $request): RedirectResponse
    {
        $payload = $request->validate([
            'email' => ['required', 'string', 'email', 'max:120'],
            'code' => ['required', 'digits:6'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->mixedCase()->numbers()],
        ], [
            'code.digits' => 'Код должен состоять из 6 цифр.',
        ]);

        $user = $this->resolveEmployeeUser($payload['email']);

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => 'Сотрудник с такой почтой не найден.',
            ]);
        }

        if (! $user->activation_code || ! $user->activation_code_expires_at) {
            throw ValidationException::withMessages([
                'code' => 'Сначала запросите код активации на эту почту.',
            ]);
        }

        if ($user->activation_code_expires_at->isPast()) {
            throw ValidationException::withMessages([
                'code' => 'Код активации истек. Запросите новый код.',
            ]);
        }

        if (! Hash::check((string) $payload['code'], $user->activation_code)) {
            throw ValidationException::withMessages([
                'code' => 'Неверный код активации.',
            ]);
        }

        $user->forceFill([
            'password' => $payload['password'],
            'email_verified_at' => now(),
            'activated_at' => now(),
            'activation_code' => null,
            'activation_code_expires_at' => null,
            'activation_code_sent_at' => null,
        ])->save();

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return redirect()
            ->route('dashboard')
            ->with('success', 'Профиль активирован. Добро пожаловать в DS Art.');
    }

    private function resolveEmployeeUser(string $email): ?User
    {
        return User::query()
            ->where('role', User::ROLE_EMPLOYEE)
            ->whereRaw('lower(email) = ?', [mb_strtolower(trim($email))])
            ->first();
    }
}
