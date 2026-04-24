import { Form, Head } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import { edit } from '@/routes/security';
import { disable, enable } from '@/routes/two-factor';

type Props = {
    canManageTwoFactor?: boolean;
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
};

export default function Security({
    canManageTwoFactor = false,
    requiresConfirmation = false,
    twoFactorEnabled = false,
}: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        clearTwoFactorAuthData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
    const prevTwoFactorEnabled = useRef(twoFactorEnabled);

    useEffect(() => {
        if (prevTwoFactorEnabled.current && !twoFactorEnabled) {
            clearTwoFactorAuthData();
        }

        prevTwoFactorEnabled.current = twoFactorEnabled;
    }, [twoFactorEnabled, clearTwoFactorAuthData]);

    return (
        <>
            <Head title="Безопасность" />

            <div className="settings-card">
                <div className="settings-card__head">
                    <div>
                        <p className="settings-card__label">Пароль</p>
                        <h2>Обновление пароля</h2>
                        <p>
                            Используйте длинный уникальный пароль, чтобы
                            защитить доступ к рабочему кабинету.
                        </p>
                    </div>
                </div>

                <Form
                    {...SecurityController.update.form()}
                    options={{ preserveScroll: true }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    onError={(validationErrors) => {
                        if (validationErrors.password) {
                            passwordInput.current?.focus();
                        }

                        if (validationErrors.current_password) {
                            currentPasswordInput.current?.focus();
                        }
                    }}
                    className="settings-form"
                >
                    {({ errors: formErrors, processing, recentlySuccessful }) => (
                        <>
                            <div className="settings-form__grid">
                                <div className="settings-form__field">
                                    <Label htmlFor="current_password">
                                        Текущий пароль
                                    </Label>
                                    <PasswordInput
                                        id="current_password"
                                        ref={currentPasswordInput}
                                        name="current_password"
                                        autoComplete="current-password"
                                        placeholder="Текущий пароль"
                                    />
                                    <InputError
                                        message={formErrors.current_password}
                                    />
                                </div>

                                <div className="settings-form__field">
                                    <Label htmlFor="password">
                                        Новый пароль
                                    </Label>
                                    <PasswordInput
                                        id="password"
                                        ref={passwordInput}
                                        name="password"
                                        autoComplete="new-password"
                                        placeholder="Новый пароль"
                                    />
                                    <InputError message={formErrors.password} />
                                </div>

                                <div className="settings-form__field">
                                    <Label htmlFor="password_confirmation">
                                        Повторите пароль
                                    </Label>
                                    <PasswordInput
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        autoComplete="new-password"
                                        placeholder="Повторите пароль"
                                    />
                                    <InputError
                                        message={
                                            formErrors.password_confirmation
                                        }
                                    />
                                </div>
                            </div>

                            <div className="settings-form__actions">
                                <Button
                                    className="settings-action-button settings-action-button--primary"
                                    disabled={processing}
                                    data-test="update-password-button"
                                >
                                    Сохранить пароль
                                </Button>
                                {recentlySuccessful ? (
                                    <span className="settings-form__saved">
                                        Пароль обновлен
                                    </span>
                                ) : null}
                            </div>
                        </>
                    )}
                </Form>
            </div>

            {canManageTwoFactor ? (
                <div className="settings-card">
                    <div className="settings-card__head">
                        <div>
                            <p className="settings-card__label">2FA</p>
                            <h2>Двухфакторная защита</h2>
                            <p>
                                Дополнительный код при входе снижает риск
                                доступа к аккаунту с чужого устройства.
                            </p>
                        </div>
                    </div>

                    {twoFactorEnabled ? (
                        <div className="settings-form">
                            <p className="settings-note">
                                Двухфакторная защита включена. При входе будет
                                запрашиваться код из приложения-аутентификатора.
                            </p>

                            <Form {...disable.form()}>
                                {({ processing }) => (
                                    <Button
                                        className="settings-action-button settings-action-button--danger"
                                        variant="destructive"
                                        type="submit"
                                        disabled={processing}
                                    >
                                        Отключить 2FA
                                    </Button>
                                )}
                            </Form>

                            <TwoFactorRecoveryCodes
                                recoveryCodesList={recoveryCodesList}
                                fetchRecoveryCodes={fetchRecoveryCodes}
                                errors={errors}
                            />
                        </div>
                    ) : (
                        <div className="settings-form">
                            <p className="settings-note">
                                После включения при входе потребуется код из
                                приложения-аутентификатора.
                            </p>

                            {hasSetupData ? (
                                <Button
                                    className="settings-action-button settings-action-button--primary"
                                    onClick={() => setShowSetupModal(true)}
                                >
                                    <ShieldCheck />
                                    Продолжить настройку
                                </Button>
                            ) : (
                                <Form
                                    {...enable.form()}
                                    onSuccess={() => setShowSetupModal(true)}
                                >
                                    {({ processing }) => (
                                        <Button
                                            className="settings-action-button settings-action-button--primary"
                                            type="submit"
                                            disabled={processing}
                                        >
                                            Включить 2FA
                                        </Button>
                                    )}
                                </Form>
                            )}
                        </div>
                    )}

                    <TwoFactorSetupModal
                        isOpen={showSetupModal}
                        onClose={() => setShowSetupModal(false)}
                        requiresConfirmation={requiresConfirmation}
                        twoFactorEnabled={twoFactorEnabled}
                        qrCodeSvg={qrCodeSvg}
                        manualSetupKey={manualSetupKey}
                        clearSetupData={clearSetupData}
                        fetchSetupData={fetchSetupData}
                        errors={errors}
                    />
                </div>
            ) : null}
        </>
    );
}

Security.layout = {
    breadcrumbs: [
        {
            title: 'Безопасность',
            href: edit(),
        },
    ],
};
