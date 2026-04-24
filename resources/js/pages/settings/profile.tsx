import { Form, Head, Link, usePage } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserInfo } from '@/components/user-info';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const roleLabel =
        auth.user.role === 'admin' ? 'Руководитель' : 'Сотрудник';

    return (
        <>
            <Head title="Профиль" />

            <div className="settings-card settings-card--profile">
                <div className="settings-card__head">
                    <div>
                        <p className="settings-card__label">Профиль</p>
                        <h2>Личные данные</h2>
                        <p>
                            Эти данные используются в кабинете, истории
                            изменений и карточке пользователя.
                        </p>
                    </div>

                    <div className="settings-profile-preview">
                        <UserInfo
                            user={auth.user}
                            subtitle={roleLabel}
                            showEmail
                        />
                    </div>
                </div>

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="settings-form"
                >
                    {({ processing, errors, recentlySuccessful }) => (
                        <>
                            <div className="settings-form__grid">
                                <div className="settings-form__field">
                                    <Label htmlFor="name">Имя и фамилия</Label>
                                    <Input
                                        id="name"
                                        defaultValue={auth.user.name}
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder="Например, Михаил Иванов"
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="settings-form__field">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        defaultValue={auth.user.email}
                                        name="email"
                                        required
                                        autoComplete="username"
                                        placeholder="name@agency.ru"
                                    />
                                    <InputError message={errors.email} />
                                </div>
                            </div>

                            {mustVerifyEmail &&
                                auth.user.email_verified_at === null && (
                                    <div className="settings-note">
                                        Email пока не подтвержден.{' '}
                                        <Link href={send()} as="button">
                                            Отправить письмо повторно
                                        </Link>
                                        {status ===
                                            'verification-link-sent' ? (
                                            <span>
                                                Письмо подтверждения отправлено.
                                            </span>
                                        ) : null}
                                    </div>
                                )}

                            <div className="settings-form__actions">
                                <Button
                                    className="settings-action-button settings-action-button--primary"
                                    disabled={processing}
                                    data-test="update-profile-button"
                                >
                                    Сохранить профиль
                                </Button>

                                {recentlySuccessful ? (
                                    <span className="settings-form__saved">
                                        Сохранено
                                    </span>
                                ) : null}
                            </div>
                        </>
                    )}
                </Form>
            </div>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Профиль',
            href: edit(),
        },
    ],
};
