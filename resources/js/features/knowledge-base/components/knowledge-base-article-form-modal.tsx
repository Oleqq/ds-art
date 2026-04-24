import { useForm } from '@inertiajs/react';
import { ImagePlus, SmilePlus, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { KnowledgeBaseIcon } from '@/features/knowledge-base/components/knowledge-base-icon';
import { KnowledgeBaseIconPicker } from '@/features/knowledge-base/components/knowledge-base-icon-picker';
import type { KnowledgeBaseArticleFormPayload } from '@/features/knowledge-base/types';

function revokeObjectUrl(url: string | null) {
    if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}

export function KnowledgeBaseArticleFormModal({
    open,
    title,
    description,
    submitLabel,
    defaults,
    submitUrl,
    onCancel,
    onSuccess,
}: {
    open: boolean;
    title: string;
    description: string;
    submitLabel: string;
    defaults: KnowledgeBaseArticleFormPayload;
    submitUrl: string;
    onCancel: () => void;
    onSuccess?: () => void;
}) {
    const iconTriggerRef = useRef<HTMLButtonElement | null>(null);
    const iconFileRef = useRef<HTMLInputElement | null>(null);
    const coverFileRef = useRef<HTMLInputElement | null>(null);
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [coverPreview, setCoverPreview] = useState<string | null>(defaults.cover_url || null);
    const [iconPreview, setIconPreview] = useState<string | null>(defaults.icon_image_url || null);

    const form = useForm<KnowledgeBaseArticleFormPayload>({
        ...defaults,
        cover: null,
        icon_upload: null,
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        revokeObjectUrl(coverPreview);
        revokeObjectUrl(iconPreview);

        form.reset();
        form.setData({
            ...defaults,
            cover: null,
            icon_upload: null,
            icon_image_url: defaults.icon_image_url,
            cover_url: defaults.cover_url,
            clear_icon_image: false,
            clear_cover: false,
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

    const submit = () => {
        form.post(submitUrl, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                revokeObjectUrl(coverPreview);
                revokeObjectUrl(iconPreview);
                setCoverPreview(defaults.cover_url || null);
                setIconPreview(defaults.icon_image_url || null);
                form.reset();
                onSuccess?.();
            },
        });
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
        }));

        event.target.value = '';
    };

    if (!open) {
        return null;
    }

    return (
        <div className="modal-shell" role="dialog" aria-modal="true">
            <div className="modal-shell__backdrop" onClick={onCancel} />

            <div className="modal-shell__card kb-form-modal">
                <div className="modal-shell__head">
                    <div>
                        <div className="modal-shell__title">{title}</div>
                        <p className="modal-shell__description">{description}</p>
                    </div>

                    <button type="button" className="modal-shell__close" onClick={onCancel}>
                        <X className="size-4" />
                    </button>
                </div>

                <div className="kb-form-modal__body">
                    <div className="form-field">
                        <label htmlFor="article-title">Название</label>
                        <input
                            id="article-title"
                            value={form.data.title}
                            onChange={(event) => form.setData('title', event.target.value)}
                            placeholder="Название статьи"
                        />
                        {form.errors.title ? <div className="form-field__error">{form.errors.title}</div> : null}
                    </div>

                    <div className="kb-form-modal__assets">
                        <div className="kb-form-modal__icon-box">
                            <label className="text-[12px] font-medium text-[#6b6b67]">Иконка</label>

                            <div className="kb-form-modal__icon-preview">
                                {form.data.icon || iconPreview ? (
                                    <KnowledgeBaseIcon
                                        icon={form.data.icon}
                                        imageUrl={iconPreview}
                                        className="kb-form-modal__icon-emoji"
                                        imageClassName="kb-form-modal__icon-image"
                                    />
                                ) : (
                                    <span className="kb-form-modal__icon-empty">Без иконки</span>
                                )}
                            </div>

                            <div className="kb-form-modal__asset-actions">
                                <button
                                    ref={iconTriggerRef}
                                    type="button"
                                    className="kb-atb-btn"
                                    onClick={() => setIsIconPickerOpen(true)}
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

                            <input
                                ref={iconFileRef}
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
                                className="hidden"
                                onChange={handleIconUpload}
                            />

                            {form.errors.icon_upload ? (
                                <div className="form-field__error">{form.errors.icon_upload}</div>
                            ) : null}
                        </div>

                        <div className="form-field">
                            <label htmlFor="article-summary">Краткое описание</label>
                            <textarea
                                id="article-summary"
                                value={form.data.summary}
                                onChange={(event) => form.setData('summary', event.target.value)}
                                placeholder="Краткое описание статьи"
                            />
                            {form.errors.summary ? (
                                <div className="form-field__error">{form.errors.summary}</div>
                            ) : null}
                        </div>
                    </div>

                    <button
                        type="button"
                        className="kb-form-modal__cover-field"
                        onClick={() => coverFileRef.current?.click()}
                    >
                        {coverPreview ? (
                            <img src={coverPreview} alt="" className="kb-form-modal__cover-image" />
                        ) : (
                            <span className="kb-form-modal__cover-placeholder">
                                <ImagePlus className="size-4" />
                                Добавить обложку статьи
                            </span>
                        )}
                    </button>

                    <input
                        ref={coverFileRef}
                        id="article-cover-input"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
                        className="hidden"
                        onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;

                            revokeObjectUrl(coverPreview);
                            form.setData('cover', file);

                            if (file) {
                                const previewUrl = URL.createObjectURL(file);
                                setCoverPreview(previewUrl);
                                form.setData('cover_url', previewUrl);
                                form.setData('clear_cover', false);
                            } else {
                                setCoverPreview(defaults.cover_url || null);
                                form.setData('cover_url', defaults.cover_url);
                            }

                            event.target.value = '';
                        }}
                    />
                </div>

                <div className="modal-shell__footer">
                    <button
                        type="button"
                        onClick={onCancel}
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
                        {submitLabel}
                    </button>
                </div>
            </div>

            <KnowledgeBaseIconPicker
                open={isIconPickerOpen}
                anchorEl={iconTriggerRef.current}
                value={form.data.icon || ''}
                onSelect={handleIconSelect}
                onClose={() => setIsIconPickerOpen(false)}
            />
        </div>
    );
}
