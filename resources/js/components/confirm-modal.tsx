import { LoaderCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ConfirmModal({
    open,
    title,
    description,
    confirmLabel = 'Подтвердить',
    cancelLabel = 'Отмена',
    danger = false,
    processing = false,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    processing?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const [shouldRender, setShouldRender] = useState(open);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (open) {
            setShouldRender(true);
            setIsClosing(false);
            return;
        }

        if (!shouldRender) {
            return;
        }

        setIsClosing(true);
        const closeTimer = window.setTimeout(() => {
            setShouldRender(false);
            setIsClosing(false);
        }, 150);

        return () => window.clearTimeout(closeTimer);
    }, [open, shouldRender]);

    if (!shouldRender) {
        return null;
    }

    return (
        <div className={isClosing ? 'modal-shell is-closing' : 'modal-shell'}>
            <button
                type="button"
                aria-label="Закрыть окно подтверждения"
                onClick={onCancel}
                className="modal-shell__backdrop"
            />

            <div className="modal-shell__card modal-shell__card--confirm">
                <div className="modal-shell__head">
                    <div>
                        <div className="modal-shell__title">{title}</div>
                        <p className="modal-shell__description">{description}</p>
                    </div>

                    <button type="button" onClick={onCancel} className="modal-shell__close">
                        <X className="size-4" />
                    </button>
                </div>

                <div className="modal-shell__footer">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={processing}
                        className="modal-shell__cancel"
                    >
                        {cancelLabel}
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={processing}
                        className={danger ? 'modal-shell__save modal-shell__save--danger' : 'modal-shell__save'}
                    >
                        {processing ? (
                            <>
                                <LoaderCircle className="size-4 animate-spin" />
                                Выполняем...
                            </>
                        ) : (
                            confirmLabel
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
