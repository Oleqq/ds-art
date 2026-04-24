import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import { edit as editAppearance } from '@/routes/appearance';

export default function Appearance() {
    return (
        <>
            <Head title="Внешний вид" />

            <div className="settings-card">
                <div className="settings-card__head">
                    <div>
                        <p className="settings-card__label">Тема</p>
                        <h2>Внешний вид приложения</h2>
                        <p>
                            Переключение светлой и темной темы для рабочего
                            кабинета.
                        </p>
                    </div>
                </div>

                <AppearanceTabs />
            </div>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Внешний вид',
            href: editAppearance(),
        },
    ],
};
