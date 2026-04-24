import { router, useForm } from '@inertiajs/react';
import { ImagePlus, LoaderCircle, SmilePlus, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { KnowledgeBaseIcon } from '@/features/knowledge-base/components/knowledge-base-icon';
import { KnowledgeBaseIconPicker } from '@/features/knowledge-base/components/knowledge-base-icon-picker';
import type { KnowledgeBaseCategoryFormPayload } from '@/features/knowledge-base/types';

function revokeObjectUrl(url: string | null) {
    if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}

export function KnowledgeBaseCategoryFormModal({
    open,
    title,
    description,
    submitLabel,
    defaults,
    submitUrl,
    method = 'post',
    onCancel,
    onSuccess,
}: {
    open: boolean;
    title: string;
    description: string;
    submitLabel: string;
    defaults: KnowledgeBaseCategoryFormPayload;
    submitUrl: string;
    method?: 'post' | 'put';
    onCancel: () => void;
    onSuccess?: () => void;
}) {
    const form = useForm<KnowledgeBaseCategoryFormPayload>(defaults);
    const iconTriggerRef = useRef<HTMLButtonElement | null>(null);
    const iconFileRef = useRef<HTMLInputElement | null>(null);
    const coverFileRef = useRef<HTMLInputElement | null>(null);
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [coverPreview, setCoverPreview] = useState<string | null>(defaults.cover_url || null);
    const [iconPreview, setIconPreview] = useState<string | null>(defaults.icon_image_url || null);

    useEffect(() => {
        if (!open) {
            setIsIconPickerOpen(false);
            return;
        }

        form.setData({
            ...defaults,
            is_visible_to_employees: true,
        });
        form.clearErrors();
        setCoverPreview(defaults.cover_url || null);
        setIconPreview(defaults.icon_image_url || null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaults, open]);

    useEffect(() => {
        return () => {
            revokeObjectUrl(coverPreview);
            revokeObjectUrl(iconPreview);
        };
    }, [coverPreview, iconPreview]);

    if (!open) {
        return null;
    }

    const closeModal = () => {
        revokeObjectUrl(coverPreview);
        revokeObjectUrl(iconPreview);
        onCancel();
    };

    const handleIconSelect = (icon: string) => {
        revokeObjectUrl(iconPreview);
        setIconPreview(null);

        form.setData((data) => ({
            ...data,
            icon,
            icon_upload: null,
            icon_image_url: '',
            clear_icon_image: true,
            is_visible_to_employees: true,
        }));
    };

    const handleIconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;

        if (!file) {
            return;
        }

        revokeObjectUrl(iconPreview);
        const previewUrl = URL.createObjectURL(file);
        setIconPreview(previewUrl);

        form.setData((data) => ({
            ...data,
            icon_upload: file,
            clear_icon_image: false,
            is_visible_to_employees: true,
        }));

        event.target.value = '';
    };

    const handleCoverUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;

        if (!file) {
            return;
        }

        revokeObjectUrl(coverPreview);
        const previewUrl = URL.createObjectURL(file);
        setCoverPreview(previewUrl);

        form.setData((data) => ({
            ...data,
            cover: file,
            clear_cover: false,
            is_visible_to_employees: true,
        }));

        event.target.value = '';
    };

    const submit = () => {
        const action = method === 'put' ? form.put : form.post;

        action(submitUrl, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                onSuccess?.();
                router.reload();
            },
        });
    };

    return (
        <div className="modal-shell">
            <button
                type="button"
                aria-label="Закрыть окно"
                onClick={closeModal}
                className="modal-shell__backdrop"
            />

            <div className="modal-shell__card kb-form-modal">
                <div className="modal-shell__head">
                    <div>
                        <div className="modal-shell__title">{title}</div>
                        <p className="modal-shell__description">{description}</p>
                    </div>

                    <button type="button" onClick={closeModal} className="modal-shell__close">
                        <X className="size-4" />
                    </button>
                </div>

                <div className="kb-form-modal__body">
                    <div className="form-field form-field--full">
                        <label htmlFor="kb-category-name">Название</label>
                        <input
                            id="kb-category-name"
                            type="text"
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            placeholder="Название раздела"
                        />
                        {form.errors.name ? <p className="form-field__error">{form.errors.name}</p> : null}
                    </div>

                    <div className="kb-form-modal__assets">
                        <div className="form-field">
                            <label>Иконка</label>

                            <div className="kb-form-modal__icon-box">
                                <div className="kb-form-modal__icon-preview">
                                    <KnowledgeBaseIcon
                                        icon={form.data.icon}
                                        imageUrl={iconPreview}
                                        className="kb-form-modal__icon-emoji"
                                        imageClassName="kb-form-modal__icon-image"
                                    />
                                </div>

                                <div className="kb-form-modal__asset-actions">
                                    <button
                                        ref={iconTriggerRef}
                                        type="button"
                                        onClick={() => setIsIconPickerOpen(true)}
                                        className="kb-atb-btn"
                                    >
                                        <SmilePlus className="size-4" />
                                        Выбрать иконку
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => iconFileRef.current?.click()}
                                        className="kb-atb-btn"
                                    >
                                        <Upload className="size-4" />
                                        Загрузить свою
                                    </button>
                                </div>

                                <p className="kb-form-modal__hint">
                                    Можно выбрать иконку из библиотеки или загрузить свою картинку.
                                </p>

                                <input
                                    ref={iconFileRef}
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
                                    className="hidden"
                                    onChange={handleIconUpload}
                                />

                                {form.errors.icon_upload ? (
                                    <p className="form-field__error">{form.errors.icon_upload}</p>
                                ) : null}
                            </div>
                        </div>

                        <div className="form-field">
                            <label>Обложка</label>

                            <button
                                type="button"
                                onClick={() => coverFileRef.current?.click()}
                                className="kb-form-modal__cover-field"
                            >
                                {coverPreview ? (
                                    <img src={coverPreview} alt="" className="kb-form-modal__cover-image" />
                                ) : (
                                    <span className="kb-form-modal__cover-placeholder">
                                        <ImagePlus className="size-4" />
                                        Добавить обложку раздела
                                    </span>
                                )}
                            </button>

                            <p className="kb-form-modal__hint">
                                Обложка загружается файлом, как в прототипе. URL-поле здесь не используется.
                            </p>

                            <input
                                ref={coverFileRef}
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
                                className="hidden"
                                onChange={handleCoverUpload}
                            />

                            {form.errors.cover ? <p className="form-field__error">{form.errors.cover}</p> : null}
                        </div>
                    </div>
                </div>

                <div className="modal-shell__footer">
                    <button
                        type="button"
                        onClick={closeModal}
                        disabled={form.processing}
                        className="modal-shell__cancel"
                    >
                        Отмена
                    </button>

                    <button
                        type="button"
                        onClick={submit}
                        disabled={form.processing}
                        className="modal-shell__save"
                    >
                        {form.processing ? (
                            <>
                                <LoaderCircle className="size-4 animate-spin" />
                                Сохраняем...
                            </>
                        ) : (
                            submitLabel
                        )}
                    </button>
                </div>
            </div>

            <KnowledgeBaseIconPicker
                open={isIconPickerOpen}
                anchorEl={iconTriggerRef.current}
                value={form.data.icon}
                onSelect={handleIconSelect}
                onClose={() => setIsIconPickerOpen(false)}
            />
        </div>
    );
}
