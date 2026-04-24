import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/confirm-modal';
import { PlannedFeatureTooltip } from '@/components/planned-feature-tooltip';
import { KnowledgeBaseArticleEditor } from '@/features/knowledge-base/components/knowledge-base-article-editor';
import { KnowledgeBaseIcon } from '@/features/knowledge-base/components/knowledge-base-icon';
import { KnowledgeBaseArticleMoveModal } from '@/features/knowledge-base/components/knowledge-base-article-move-modal';
import { KnowledgeBaseArticleSaveModal } from '@/features/knowledge-base/components/knowledge-base-article-save-modal';
import { KnowledgeBaseIconPicker } from '@/features/knowledge-base/components/knowledge-base-icon-picker';
import type {
    KnowledgeBaseArticleBlock,
    KnowledgeBaseArticleFormPayload,
    KnowledgeBaseArticleMoveCategory,
    KnowledgeBaseArticleRecord,
    KnowledgeBaseBreadcrumb,
} from '@/features/knowledge-base/types';

type KnowledgeBaseArticlePageProps = {
    article: KnowledgeBaseArticleRecord;
    breadcrumbs: KnowledgeBaseBreadcrumb[];
    move_categories: KnowledgeBaseArticleMoveCategory[];
    controls: {
        can_update: boolean;
        can_delete: boolean;
        can_duplicate: boolean;
        can_move: boolean;
        can_upload_assets: boolean;
    };
    mode?: 'admin' | 'employee';
};

type SaveMode = 'publish' | 'draft' | 'scheduled';

function getCookie(name: string) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));

    return match ? decodeURIComponent(match[1]) : null;
}

function slugifyHeading(text: string, index: number) {
    const normalized = text
        .toLowerCase()
        .replace(/[^a-zа-яё0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '');

    return normalized === '' ? `section-${index + 1}` : `${normalized}-${index + 1}`;
}

function takeFirstWords(text: string, limit = 4) {
    const words = text
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean);

    if (words.length === 0) {
        return '';
    }

    return words.length > limit ? `${words.slice(0, limit).join(' ')}…` : words.join(' ');
}

function getFallbackTocLabel(block: KnowledgeBaseArticleBlock) {
    if (block.type === 'p' || block.type === 'quote' || block.type === 'h2' || block.type === 'h3') {
        return takeFirstWords(block.content);
    }

    if (block.type === 'ul' || block.type === 'ol') {
        return takeFirstWords(block.items.find((item) => item.trim() !== '') ?? '');
    }

    if (block.type === 'file') {
        return block.name.trim() || takeFirstWords(block.caption);
    }

    if (block.type === 'video') {
        return block.caption.trim() || 'Видео';
    }

    if (block.type === 'image') {
        return block.caption.trim() || 'Изображение';
    }

    if (block.type === 'link') {
        return block.title.trim() || takeFirstWords(block.url.replace(/^https?:\/\//, ''));
    }

    if (block.type === 'table') {
        return 'Таблица';
    }

    if (block.type === 'code') {
        return block.language.trim() || 'Код';
    }

    return '';
}

function buildPublicationBadges(form: KnowledgeBaseArticleFormPayload) {
    return [
        ...(form.scheduled_publish_at ? [{ label: 'Запланировано', tone: 'scheduled' as const }] : []),
        ...(!form.scheduled_publish_at && !form.is_published ? [{ label: 'Черновик', tone: 'draft' as const }] : []),
        ...form.tags.map((tag) => ({ label: tag, tone: 'default' as const })),
    ];
}

function getInitialSaveMode(form: KnowledgeBaseArticleFormPayload): SaveMode {
    if (form.scheduled_publish_at) {
        return 'scheduled';
    }

    if (!form.is_published) {
        return 'draft';
    }

    return 'publish';
}

function Breadcrumbs({
    breadcrumbs,
    articleTitle,
}: {
    breadcrumbs: KnowledgeBaseBreadcrumb[];
    articleTitle: string;
}) {
    return (
        <div className="kb-category__breadcrumb">
            {breadcrumbs.map((item) => (
                <span key={item.id} className="contents">
                    <Link href={item.href} className="kb-category__breadcrumb-link">
                        {item.icon ? <span>{item.icon} </span> : null}
                        {item.name}
                    </Link>
                    <span className="kb-category__breadcrumb-sep">/</span>
                </span>
            ))}

            <span className="kb-category__breadcrumb-current">{articleTitle}</span>
        </div>
    );
}

export function KnowledgeBaseArticlePage({
    article,
    breadcrumbs,
    move_categories,
    controls,
    mode = 'admin',
}: KnowledgeBaseArticlePageProps) {
    const { url } = usePage();
    const pagePath = useMemo(() => new URL(url, 'http://localhost').pathname, [url]);
    const articleBasePath = mode === 'admin' ? '/admin/knowledge-base/articles' : '/employee/knowledge-base/articles';
    const iconTriggerRef = useRef<HTMLButtonElement | null>(null);
    const iconFileRef = useRef<HTMLInputElement | null>(null);
    const canUpdate = controls.can_update;
    const canUploadAssets = controls.can_upload_assets && canUpdate;

    const [blocks, setBlocks] = useState<KnowledgeBaseArticleBlock[]>(article.blocks);
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [isSaveOpen, setIsSaveOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isMoveOpen, setIsMoveOpen] = useState(false);
    const [isArticleEditing, setIsArticleEditing] = useState(false);
    const [copied, setCopied] = useState(false);

    const form = useForm<KnowledgeBaseArticleFormPayload>({
        knowledge_category_id: article.category.id,
        title: article.title,
        icon: article.icon || '',
        icon_image_url: article.icon_image_url ?? '',
        icon_upload: null,
        clear_icon_image: false,
        summary: article.summary ?? '',
        content: article.content ?? '',
        blocks: JSON.stringify(article.blocks),
        cover: null,
        cover_url: article.cover_url ?? '',
        clear_cover: false,
        is_published: article.is_published,
        scheduled_publish_at: article.scheduled_publish_at,
        tags: article.tags ?? [],
        access_level: article.access_level,
        return_to: pagePath,
    });

    useEffect(() => {
        form.setData('blocks', JSON.stringify(blocks));
        form.setData(
            'content',
            blocks
                .map((block) => {
                    if ('content' in block) {
                        return block.content;
                    }

                    if ('items' in block) {
                        return block.items.join('\n');
                    }

                    if ('code' in block) {
                        return block.code;
                    }

                    return '';
                })
                .filter((part) => part.trim() !== '')
                .join('\n\n'),
        );
    }, [blocks]);

    const tocEntries = useMemo(() => {
        const headings = blocks
            .map((block, index) => {
                if (block.type !== 'h2' && block.type !== 'h3') {
                    return null;
                }

                const text = block.content.trim();

                if (text === '') {
                    return null;
                }

                return {
                    id: block.id,
                    text,
                    kind: block.type === 'h3' ? 'child' : 'primary',
                    anchor: slugifyHeading(text, index),
                };
            })
            .filter((item) => item !== null);

        if (headings.length > 0) {
            return headings;
        }

        return blocks
            .map((block, index) => {
                const text = getFallbackTocLabel(block);

                if (text === '') {
                    return null;
                }

                return {
                    id: block.id,
                    text,
                    kind: 'primary' as const,
                    anchor: slugifyHeading(`${block.id}-${text}`, index),
                };
            })
            .filter((item) => item !== null)
            .slice(0, 5);
    }, [blocks]);

    const headingAnchors = useMemo(
        () =>
            tocEntries.reduce<Record<string, string>>((accumulator, heading) => {
                accumulator[heading.id] = heading.anchor;
                return accumulator;
            }, {}),
        [tocEntries],
    );

    const publicationBadges = buildPublicationBadges(form.data);

    const jumpToTocEntry = (event: MouseEvent<HTMLAnchorElement>, anchor: string) => {
        event.preventDefault();

        const target = document.getElementById(anchor);

        if (!target) {
            window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${anchor}`);
            return;
        }

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const top = target.getBoundingClientRect().top + window.scrollY - 88;

        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${anchor}`);
        window.scrollTo({
            top: Math.max(0, top),
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
    };

    const saveArticle = ({
        mode,
        scheduledAt,
        tags,
    }: {
        mode: SaveMode;
        scheduledAt: string | null;
        tags: string[];
    }) => {
        if (!canUpdate) {
            return;
        }

        const payload: KnowledgeBaseArticleFormPayload = {
            ...form.data,
            is_published: mode !== 'draft',
            scheduled_publish_at: mode === 'scheduled' ? scheduledAt : null,
            tags,
        };

        form.setData(payload);
        form.transform(() => payload);

        form.put(`${articleBasePath}/${article.slug}`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.setData('cover', null);
                form.setData('icon_upload', null);
                form.setData('clear_cover', false);
                setIsArticleEditing(false);
                setIsSaveOpen(false);
            },
            onFinish: () => {
                form.transform((data) => data);
            },
        });
    };

    const duplicateArticle = () => {
        if (!controls.can_duplicate) {
            return;
        }

        router.post(
            `${articleBasePath}/${article.slug}/duplicate`,
            {},
            {
                preserveScroll: true,
            },
        );
    };

    const moveArticle = (categoryId: number) => {
        if (!controls.can_move) {
            return;
        }

        router.patch(
            `${articleBasePath}/${article.slug}/move`,
            { knowledge_category_id: categoryId },
            {
                preserveScroll: true,
                onSuccess: () => setIsMoveOpen(false),
            },
        );
    };

    const deleteArticle = () => {
        if (!controls.can_delete) {
            return;
        }

        router.delete(`${articleBasePath}/${article.slug}`, {
            data: { return_to: article.category.href },
            preserveScroll: true,
            onFinish: () => setIsDeleteOpen(false),
        });
    };

    const copyLink = async () => {
        await navigator.clipboard.writeText(`${window.location.origin}${article.href}`);
        setCopied(true);
        toast.success('Ссылка на статью скопирована');
        window.setTimeout(() => setCopied(false), 1500);
    };

    const uploadAsset = async (kind: 'image' | 'file' | 'video', file: File) => {
        if (!canUploadAssets) {
            throw new Error('Asset upload is not allowed for this user.');
        }

        const body = new FormData();
        body.append('asset', file);
        body.append('kind', kind);

        const csrfToken = getCookie('XSRF-TOKEN');

        const response = await fetch(`${articleBasePath}/${article.slug}/assets`, {
            method: 'POST',
            body,
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
            },
        });

        if (!response.ok) {
            throw new Error(`Asset upload failed: ${response.status}`);
        }

        return response.json();
    };

    const isEditing = canUpdate && isArticleEditing;

    return (
        <>
            <Head title={article.title} />

            <div className={`kb-article-page kb-article-page--editor ${isEditing ? 'is-editing' : 'is-viewing'}`}>
                <div className="kb-article__layout kb-article__layout--editor">
                    <div className="kb-article__shell kb-article__shell--editor">
                        <Breadcrumbs breadcrumbs={breadcrumbs} articleTitle={form.data.title} />

                        {form.data.cover_url ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (canUploadAssets && isEditing) {
                                        document.getElementById('article-cover-input')?.click();
                                    }
                                }}
                                className="kb-article__cover-button"
                            >
                                <img src={form.data.cover_url} alt="" className="kb-article__cover" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    if (canUploadAssets && isEditing) {
                                        document.getElementById('article-cover-input')?.click();
                                    }
                                }}
                                className="kb-article__cover-placeholder"
                            >
                                <span className="kb-ui-emoji" aria-hidden="true">
                                    📷
                                </span>
                                Добавить обложку
                            </button>
                        )}

                        <input
                            id="article-cover-input"
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
                            className="hidden"
                            onChange={(event) => {
                                const file = event.target.files?.[0] ?? null;
                                form.setData('cover', file);

                                if (file) {
                                    form.setData('cover_url', URL.createObjectURL(file));
                                    form.setData('clear_cover', false);
                                }
                            }}
                        />

                        <input
                            ref={iconFileRef}
                            id="article-icon-input"
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
                            className="hidden"
                            onChange={(event) => {
                                const file = event.target.files?.[0] ?? null;

                                if (!file) {
                                    return;
                                }

                                form.setData((data) => ({
                                    ...data,
                                    icon_upload: file,
                                    icon: '',
                                    icon_image_url: URL.createObjectURL(file),
                                    clear_icon_image: false,
                                }));

                                event.target.value = '';
                            }}
                        />

                        {form.data.icon || form.data.icon_image_url ? (
                            <div className="kb-article__headline">
                                <button
                                    ref={iconTriggerRef}
                                    type="button"
                                    onClick={() => {
                                        if (canUpdate && isEditing) {
                                            setIsIconPickerOpen(true);
                                        }
                                    }}
                                    className="kb-article__icon-glyph kb-article__icon-glyph--headline"
                                    title="Нажмите, чтобы сменить иконку"
                                >
                                    <KnowledgeBaseIcon
                                        icon={form.data.icon}
                                        imageUrl={form.data.icon_image_url || null}
                                        className="kb-article__icon-glyph"
                                        imageClassName="kb-article__icon-image"
                                    />
                                </button>

                                <div className="kb-article__heading">
                                    <input
                                        value={form.data.title}
                                        onChange={(event) => form.setData('title', event.target.value)}
                                        readOnly={!isEditing}
                                        className="kb-article__title-input"
                                        placeholder="Заголовок статьи"
                                    />
                                    <div className="kb-article__meta">
                                        <span>Обновлено: {article.updated_at ?? 'только что'}</span>
                                        <span>Раздел: {article.category.name}</span>
                                    </div>
                                    {publicationBadges.length > 0 ? (
                                        <div className="kb-article__badges">
                                            {publicationBadges.map((badge) => (
                                                <span
                                                    key={badge.label}
                                                    className={`kb-card__status ${badge.tone !== 'default' ? `kb-card__status--${badge.tone}` : ''}`}
                                                >
                                                    {badge.label}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="kb-article__icon-strip">
                                    <button
                                        ref={iconTriggerRef}
                                        type="button"
                                        onClick={() => {
                                            if (canUpdate && isEditing) {
                                                setIsIconPickerOpen(true);
                                            }
                                        }}
                                        className="kb-article__icon-pill"
                                    >
                                        <span className="kb-ui-emoji" aria-hidden="true">
                                            ＋
                                        </span>
                                        <span>Добавить иконку</span>
                                    </button>
                                </div>

                                <div className="kb-article__heading">
                                    <input
                                        value={form.data.title}
                                        onChange={(event) => form.setData('title', event.target.value)}
                                        readOnly={!isEditing}
                                        className="kb-article__title-input"
                                        placeholder="Заголовок статьи"
                                    />
                                    <div className="kb-article__meta">
                                        <span>Обновлено: {article.updated_at ?? 'только что'}</span>
                                        <span>Раздел: {article.category.name}</span>
                                    </div>
                                    {publicationBadges.length > 0 ? (
                                        <div className="kb-article__badges">
                                            {publicationBadges.map((badge) => (
                                                <span
                                                    key={badge.label}
                                                    className={`kb-card__status ${badge.tone !== 'default' ? `kb-card__status--${badge.tone}` : ''}`}
                                                >
                                                    {badge.label}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </>
                        )}

                        <div className="kb-article__fields">
                            {isEditing ? (
                                <div className="kb-article__summary-field">
                                    <textarea
                                        value={form.data.summary}
                                        onChange={(event) => form.setData('summary', event.target.value)}
                                        className="form-control w-full resize-y px-4 py-3 text-sm"
                                        placeholder="Краткое описание статьи"
                                    />
                                </div>
                            ) : form.data.summary ? (
                                <div className="kb-article__summary-text">{form.data.summary}</div>
                            ) : null}
                        </div>

                        <div className="kb-article__toolbar kb-article__toolbar--editor">
                            <div className="kb-article__toolbar-main">
                                {controls.can_update ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!isEditing) {
                                                setIsArticleEditing(true);
                                                return;
                                            }

                                            setIsSaveOpen(true);
                                        }}
                                        disabled={form.processing}
                                        className="kb-atb-btn kb-atb-btn--primary"
                                    >
                                        <span className="kb-atb-btn__emoji" aria-hidden="true">
                                            {isEditing ? '💾' : '✎'}
                                        </span>
                                        {isEditing ? 'Сохранить' : 'Редактировать'}
                                    </button>
                                ) : null}

                                {controls.can_duplicate ? (
                                    <button type="button" onClick={duplicateArticle} className="kb-atb-btn">
                                        <span className="kb-atb-btn__emoji" aria-hidden="true">
                                            ⧉
                                        </span>
                                        Дублировать
                                    </button>
                                ) : null}

                                {controls.can_move ? (
                                    <button type="button" onClick={() => setIsMoveOpen(true)} className="kb-atb-btn">
                                        <span className="kb-atb-btn__emoji" aria-hidden="true">
                                            📂
                                        </span>
                                        Переместить
                                    </button>
                                ) : null}

                                {controls.can_delete ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsDeleteOpen(true)}
                                        className="kb-atb-btn kb-atb-btn--danger"
                                    >
                                        <span className="kb-atb-btn__emoji" aria-hidden="true">
                                            🗑
                                        </span>
                                        Удалить статью
                                    </button>
                                ) : null}
                            </div>

                            <div className="kb-article__toolbar-side">
                                <button type="button" onClick={copyLink} className="kb-article__icon-action">
                                    <span className="kb-atb-btn__emoji" aria-hidden="true">
                                        🔗
                                    </span>
                                    <span className="sr-only">{copied ? 'Ссылка скопирована' : 'Копировать ссылку'}</span>
                                </button>

                                <PlannedFeatureTooltip
                                    feature={{
                                        status: 'Информация',
                                        phase: 'Доступ к статье',
                                        note: 'Статья наследует доступ от раздела. Отдельные права здесь не настраиваются.',
                                    }}
                                    side="top"
                                >
                                    <button type="button" disabled className="kb-article__icon-action opacity-60">
                                        <span className="kb-atb-btn__emoji" aria-hidden="true">
                                            🔒
                                        </span>
                                        <span className="sr-only">Доступ</span>
                                    </button>
                                </PlannedFeatureTooltip>
                            </div>
                        </div>

                        <div className="kb-article__editor-surface">
                            <KnowledgeBaseArticleEditor
                                blocks={blocks}
                                onChange={setBlocks}
                                onUploadAsset={uploadAsset}
                                headingAnchors={headingAnchors}
                                isEditing={isEditing}
                            />
                        </div>
                    </div>

                    <aside className="kb-toc kb-toc--editor">
                        <div className="kb-toc__inner">
                            <div className="kb-toc__title">Оглавление</div>

                            {tocEntries.length > 0 ? (
                                <div className="kb-toc__list">
                                    {tocEntries.map((item) => (
                                        <a
                                            key={item.id}
                                            href={`#${item.anchor}`}
                                            onClick={(event) => jumpToTocEntry(event, item.anchor)}
                                            className={`kb-toc__item ${item.kind === 'child' ? 'kb-toc__item--child' : ''}`}
                                        >
                                            {item.text}
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <div className="kb-toc__empty">
                                    Появится после добавления заголовков или контентных блоков.
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </div>

            <KnowledgeBaseIconPicker
                open={isIconPickerOpen}
                anchorEl={iconTriggerRef.current}
                value={form.data.icon || ''}
                onSelect={(icon) =>
                    form.setData((data) => ({
                        ...data,
                        icon,
                        icon_image_url: '',
                        icon_upload: null,
                        clear_icon_image: true,
                    }))
                }
                onUploadRequest={() => iconFileRef.current?.click()}
                onClose={() => setIsIconPickerOpen(false)}
            />

            <KnowledgeBaseArticleSaveModal
                open={isSaveOpen}
                processing={form.processing}
                initialMode={getInitialSaveMode(form.data)}
                initialScheduledAt={form.data.scheduled_publish_at}
                initialTags={form.data.tags}
                onCancel={() => setIsSaveOpen(false)}
                onConfirm={saveArticle}
            />

            <KnowledgeBaseArticleMoveModal
                open={isMoveOpen}
                categories={move_categories}
                articleTitle={form.data.title}
                processing={form.processing}
                onCancel={() => setIsMoveOpen(false)}
                onSelect={moveArticle}
            />

            <ConfirmModal
                open={isDeleteOpen}
                title="Удалить статью"
                description={`Статья «${article.title}» будет удалена без возможности восстановления.`}
                confirmLabel="Удалить статью"
                danger
                processing={form.processing}
                onConfirm={deleteArticle}
                onCancel={() => setIsDeleteOpen(false)}
            />
        </>
    );
}

type AdminKnowledgeBaseArticleProps = Omit<KnowledgeBaseArticlePageProps, 'mode'>;

export default function AdminKnowledgeBaseArticle(props: AdminKnowledgeBaseArticleProps) {
    return <KnowledgeBaseArticlePage {...props} mode="admin" />;
}
