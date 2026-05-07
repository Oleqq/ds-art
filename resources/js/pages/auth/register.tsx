import { Head, useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';

type RegisterProps = {
    status?: string;
    defaultEmail?: string;
};

export default function Register({
    status,
    defaultEmail = '',
}: RegisterProps) {
    const codeForm = useForm({
        email: defaultEmail,
    });
    const activationForm = useForm({
        email: defaultEmail,
        code: '',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        codeForm.setData('email', defaultEmail);
        activationForm.setData((current) => ({
            ...current,
            email: defaultEmail,
        }));
    }, [defaultEmail]);

    return (
        <>
            <Head title="Активация сотрудника" />

            <div className="space-y-6">
                {status ? (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                        {status}
                    </div>
                ) : null}

                <section className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <div className="space-y-1">
                        <h2 className="text-sm font-semibold text-foreground">
                            1. Получить код на почту
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Код отправляется только сотрудникам, которых уже
                            добавили в команду.
                        </p>
                    </div>

                    <div className="mt-4 grid gap-2">
                        <Label htmlFor="activation-email">Рабочая почта</Label>
                        <Input
                            id="activation-email"
                            type="email"
                            value={codeForm.data.email}
                            onChange={(event) => {
                                codeForm.setData('email', event.target.value);
                                activationForm.setData('email', event.target.value);
                            }}
                            autoComplete="email"
                            placeholder="name@company.ru"
                        />
                        <InputError message={codeForm.errors.email} />
                    </div>

                    <Button
                        type="button"
                        className="mt-4 w-full"
                        disabled={codeForm.processing}
                        onClick={() =>
                            codeForm.post('/register/send-code', {
                                preserveScroll: true,
                            })
                        }
                    >
                        {codeForm.processing && <Spinner />}
                        Отправить код
                    </Button>

                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        Если письмо не приходит, проверьте папку «Спам» и
                        попросите администратора настроить SMTP для проекта.
                    </p>
                </section>

                <section className="rounded-2xl border border-border/70 bg-background/95 p-4">
                    <div className="space-y-1">
                        <h2 className="text-sm font-semibold text-foreground">
                            2. Активировать профиль и задать пароль
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            После подтверждения вы сразу войдёте в приложение.
                        </p>
                    </div>

                    <div className="mt-4 grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="code">Код из письма</Label>
                            <Input
                                id="code"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={activationForm.data.code}
                                onChange={(event) =>
                                    activationForm.setData(
                                        'code',
                                        event.target.value.replace(/\D/g, ''),
                                    )
                                }
                                placeholder="6 цифр"
                            />
                            <InputError message={activationForm.errors.code} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">Новый пароль</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                autoComplete="new-password"
                                value={activationForm.data.password}
                                onChange={(event) =>
                                    activationForm.setData(
                                        'password',
                                        event.target.value,
                                    )
                                }
                                placeholder="Минимум 8 символов"
                            />
                            <InputError
                                message={activationForm.errors.password}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">
                                Повторите пароль
                            </Label>
                            <PasswordInput
                                id="password_confirmation"
                                name="password_confirmation"
                                autoComplete="new-password"
                                value={activationForm.data.password_confirmation}
                                onChange={(event) =>
                                    activationForm.setData(
                                        'password_confirmation',
                                        event.target.value,
                                    )
                                }
                                placeholder="Повторите пароль"
                            />
                        </div>
                    </div>

                    <Button
                        type="button"
                        className="mt-4 w-full"
                        disabled={activationForm.processing}
                        onClick={() =>
                            activationForm.post('/register', {
                                preserveScroll: true,
                            })
                        }
                    >
                        {activationForm.processing && <Spinner />}
                        Активировать профиль
                    </Button>
                </section>

                <div className="text-center text-sm text-muted-foreground">
                    Уже есть доступ?{' '}
                    <TextLink href={login()} tabIndex={1}>
                        Войти
                    </TextLink>
                </div>
            </div>
        </>
    );
}

Register.layout = {
    title: 'Активация сотрудника',
    description:
        'Получите код на рабочую почту, задайте пароль и завершите активацию доступа.',
};
