import { Head } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { login } from '@/routes';

export default function Register() {
    return (
        <>
            <Head title="Registration disabled" />

            <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                    Public registration is disabled for this project. Accounts are created by an administrator.
                </div>

                <div className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <TextLink href={login()} tabIndex={1}>
                        Log in
                    </TextLink>
                </div>
            </div>
        </>
    );
}

Register.layout = {
    title: 'Registration disabled',
    description: 'Accounts are issued by an administrator',
};
