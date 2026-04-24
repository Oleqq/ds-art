import { Form } from '@inertiajs/react';
import { useRef } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <div className="settings-card settings-card--danger">
            <div className="settings-card__head">
                <div>
                    <p className="settings-card__label">Опасная зона</p>
                    <h2>Удаление аккаунта</h2>
                    <p>
                        Аккаунт и связанные данные будут удалены без
                        возможности восстановления.
                    </p>
                </div>
            </div>

            <Dialog>
                <DialogTrigger asChild>
                    <Button
                        variant="destructive"
                        className="settings-action-button settings-action-button--danger"
                        data-test="delete-user-button"
                    >
                        Удалить аккаунт
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogTitle>Удалить аккаунт?</DialogTitle>
                    <DialogDescription>
                        После удаления восстановить аккаунт будет нельзя.
                        Введите пароль, чтобы подтвердить действие.
                    </DialogDescription>

                    <Form
                        {...ProfileController.destroy.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        onError={() => passwordInput.current?.focus()}
                        resetOnSuccess
                        className="space-y-6"
                    >
                        {({ resetAndClearErrors, processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="password" className="sr-only">
                                        Пароль
                                    </Label>

                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        ref={passwordInput}
                                        placeholder="Пароль"
                                        autoComplete="current-password"
                                    />

                                    <InputError message={errors.password} />
                                </div>

                                <DialogFooter className="gap-2">
                                    <DialogClose asChild>
                                        <Button
                                            variant="secondary"
                                            className="settings-action-button settings-action-button--secondary"
                                            onClick={() => resetAndClearErrors()}
                                        >
                                            Отмена
                                        </Button>
                                    </DialogClose>

                                    <Button
                                        variant="destructive"
                                        className="settings-action-button settings-action-button--danger"
                                        disabled={processing}
                                        asChild
                                    >
                                        <button
                                            type="submit"
                                            data-test="confirm-delete-user-button"
                                        >
                                            Удалить аккаунт
                                        </button>
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
