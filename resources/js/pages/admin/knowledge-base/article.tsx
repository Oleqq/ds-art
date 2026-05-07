import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/confirm-modal';
import {
    exportKnowledgeBaseArticle,
    type KnowledgeBaseArticleExportFormat,
} from '@/features/knowledge-base/article-export';
import { KnowledgeBaseArticleEditor } from '@/features/knowledge-base/components/knowledge-base-article-editor';
import { KnowledgeBaseArticleExportModal } from '@/features/knowledge-base/components/knowledge-base-article-export-modal';
import { KnowledgeBaseImageEditorControls } from '@/features/knowledge-base/components/knowledge-base-image-editor-controls';
import { KnowledgeBaseImageFrame } from '@/features/knowledge-base/components/knowledge-base-image-frame';
import { KnowledgeBaseIcon } from '@/features/knowledge-base/components/knowledge-base-icon';
import { KnowledgeBaseArticleMoveModal } from '@/features/knowledge-base/components/knowledge-base-article-move-modal';
import { KnowledgeBaseArticleSaveModal } from '@/features/knowledge-base/components/knowledge-base-article-save-modal';
import { KnowledgeBaseIconPicker } from '@/features/knowledge-base/components/knowledge-base-icon-picker';
import { useViewportMaxWidth } from '@/hooks/use-mobile';
import { copyText } from '@/lib/copy-text';
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
type CoverPresentation = {
    x: number;
    y: number;
    zoom: number;
    height: number;
};

const DEFAULT_COVER_POSITION_X = 50;
const DEFAULT_COVER_POSITION_Y = 50;
const DEFAULT_COVER_ZOOM = 100;
const DEFAULT_COVER_HEIGHT = 220;
const FULLSCREEN_ANIMATION_MS = 220;

function getCookie(name: string) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));

    return match ? decodeURIComponent(match[1]) : null;
}

function slugifyHeading(text: string, index: number) {
    const normalized = text
        .toLowerCase()
        .replace(/[^a-zа-яё0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '');

    return normalized === ''
        ? `section-${index + 1}`
        : `${normalized}-${index + 1}`;
}

function buildPublicationBadges(form: KnowledgeBaseArticleFormPayload) {
    return [
        ...(form.scheduled_publish_at
            ? [{ label: 'Запланировано', tone: 'scheduled' as const }]
            : []),
        ...(!form.scheduled_publish_at && !form.is_published
            ? [{ label: 'Черновик', tone: 'draft' as const }]
            : []),
        ...form.tags.map((tag) => ({ label: tag, tone: 'default' as const })),
    ];
}

function serializeBlocksToContent(blocks: KnowledgeBaseArticleBlock[]) {
    return blocks
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
        .join('\n\n');
}

function clampPercent(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function parseCoverPresentation(url: string | null | undefined) {
    if (!url) {
        return {
            x: DEFAULT_COVER_POSITION_X,
            y: DEFAULT_COVER_POSITION_Y,
            zoom: DEFAULT_COVER_ZOOM,
            height: DEFAULT_COVER_HEIGHT,
        };
    }

    const source = new URL(url, 'http://localhost');

    return {
        x: clampPercent(
            Number(source.searchParams.get('vx') ?? DEFAULT_COVER_POSITION_X),
            0,
            100,
        ),
        y: clampPercent(
            Number(source.searchParams.get('vy') ?? DEFAULT_COVER_POSITION_Y),
            0,
            100,
        ),
        zoom: clampPercent(
            Number(source.searchParams.get('vz') ?? DEFAULT_COVER_ZOOM),
            100,
            200,
        ),
        height: clampPercent(
            Number(source.searchParams.get('vh') ?? DEFAULT_COVER_HEIGHT),
            160,
            520,
        ),
    };
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
                    <Link
                        href={item.href}
                        className="kb-category__breadcrumb-link"
                    >
                        {item.icon ? <span>{item.icon} </span> : null}
                        {item.name}
                    </Link>
                    <span className="kb-category__breadcrumb-sep">/</span>
                </span>
            ))}

            <span className="kb-category__breadcrumb-current">
                {articleTitle}
            </span>
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
    const pagePath = useMemo(
        () => new URL(url, 'http://localhost').pathname,
        [url],
    );
    const articleBasePath =
        mode === 'admin'
            ? '/admin/knowledge-base/articles'
            : '/employee/knowledge-base/articles';
    const iconTriggerRef = useRef<HTMLButtonElement | null>(null);
    const iconFileRef = useRef<HTMLInputElement | null>(null);
    const coverFileRef = useRef<HTMLInputElement | null>(null);
    const coverPreviewUrlRef = useRef<string | null>(null);
    const fullscreenTimerRef = useRef<number | null>(null);
    const canUpdate = controls.can_update;
    const canUploadAssets = controls.can_upload_assets && canUpdate;
    const initialCoverPresentation = useMemo(
        () => parseCoverPresentation(article.cover_url),
        [article.cover_url],
    );

    const [blocks, setBlocks] = useState<KnowledgeBaseArticleBlock[]>(
        article.blocks,
    );
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [isSaveOpen, setIsSaveOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isMoveOpen, setIsMoveOpen] = useState(false);
    const [isArticleEditing, setIsArticleEditing] = useState(false);
    const [isFullscreenEditing, setIsFullscreenEditing] = useState(false);
    const [fullscreenStage, setFullscreenStage] = useState<
        'closed' | 'entering' | 'open' | 'closing'
    >('closed');
    const [isMobileTocOpen, setIsMobileTocOpen] = useState(false);
    const [activeTocAnchor, setActiveTocAnchor] = useState('');
    const [isCoverEditorOpen, setIsCoverEditorOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const isCompactArticleLayout = useViewportMaxWidth(1100);
    const [coverDraft, setCoverDraft] = useState<CoverPresentation>(
        initialCoverPresentation,
    );
    const [copied, setCopied] = useState(false);
    const isEditing = canUpdate && isArticleEditing;
    const stopTextInputPointerPropagation = (event: {
        stopPropagation: () => void;
    }) => {
        event.stopPropagation();
    };

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
        cover_position_x: initialCoverPresentation.x,
        cover_position_y: initialCoverPresentation.y,
        cover_zoom_percent: initialCoverPresentation.zoom,
        cover_height_px: initialCoverPresentation.height,
        clear_cover: false,
        is_published: article.is_published,
        scheduled_publish_at: article.scheduled_publish_at,
        tags: article.tags ?? [],
        access_level: article.access_level,
        return_to: pagePath,
    });

    useEffect(() => {
        setCoverDraft({
            x: form.data.cover_position_x,
            y: form.data.cover_position_y,
            zoom: form.data.cover_zoom_percent,
            height: form.data.cover_height_px,
        });
    }, [
        form.data.cover_position_x,
        form.data.cover_position_y,
        form.data.cover_zoom_percent,
        form.data.cover_height_px,
    ]);

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

        return headings;
    }, [blocks]);

    const headingAnchors = useMemo(
        () =>
            tocEntries.reduce<Record<string, string>>(
                (accumulator, heading) => {
                    accumulator[heading.id] = heading.anchor;
                    return accumulator;
                },
                {},
            ),
        [tocEntries],
    );

    useEffect(() => {
        if (tocEntries.length === 0) {
            setActiveTocAnchor('');
            return;
        }

        const updateActiveTocAnchor = () => {
            const offset = 148;
            let currentAnchor = tocEntries[0]?.anchor ?? '';

            for (const entry of tocEntries) {
                const element = document.getElementById(entry.anchor);

                if (!element) {
                    continue;
                }

                if (element.getBoundingClientRect().top - offset <= 0) {
                    currentAnchor = entry.anchor;
                    continue;
                }

                break;
            }

            setActiveTocAnchor(currentAnchor);
        };

        updateActiveTocAnchor();
        window.addEventListener('scroll', updateActiveTocAnchor, {
            passive: true,
        });
        window.addEventListener('resize', updateActiveTocAnchor);

        return () => {
            window.removeEventListener('scroll', updateActiveTocAnchor);
            window.removeEventListener('resize', updateActiveTocAnchor);
        };
    }, [tocEntries]);

    const publicationBadges = buildPublicationBadges(form.data);

    const jumpToTocEntry = (
        event: MouseEvent<HTMLAnchorElement>,
        anchor: string,
    ) => {
        event.preventDefault();

        const target = document.getElementById(anchor);

        if (!target) {
            window.history.replaceState(
                null,
                '',
                `${window.location.pathname}${window.location.search}#${anchor}`,
            );
            return;
        }

        const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        const top = target.getBoundingClientRect().top + window.scrollY - 88;

        window.history.replaceState(
            null,
            '',
            `${window.location.pathname}${window.location.search}#${anchor}`,
        );
        setActiveTocAnchor(anchor);
        window.scrollTo({
            top: Math.max(0, top),
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
    };

    const saveArticle = (
        {
            mode,
            scheduledAt,
            tags,
        }: {
            mode: SaveMode;
            scheduledAt: string | null;
            tags: string[];
        },
        options: {
            closeEditor?: boolean;
            successMessage?: string;
        } = {},
    ) => {
        if (!canUpdate) {
            return;
        }

        const closeEditor = options.closeEditor ?? true;
        const payload: KnowledgeBaseArticleFormPayload = {
            ...form.data,
            blocks: JSON.stringify(blocks),
            content: serializeBlocksToContent(blocks),
            is_published: mode !== 'draft',
            scheduled_publish_at: mode === 'scheduled' ? scheduledAt : null,
            tags,
        };

        form.setData(payload);
        form.transform(() => payload);

        form.put(`${articleBasePath}/${article.slug}`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: (page) => {
                const savedArticle = (
                    page.props as { article?: KnowledgeBaseArticleRecord }
                ).article;

                revokeCoverPreviewUrl();

                if (savedArticle) {
                    const savedCover = parseCoverPresentation(
                        savedArticle.cover_url,
                    );

                    setBlocks(savedArticle.blocks);
                    form.setData((data) => ({
                        ...data,
                        title: savedArticle.title,
                        icon: savedArticle.icon || '',
                        icon_image_url: savedArticle.icon_image_url ?? '',
                        icon_upload: null,
                        clear_icon_image: false,
                        summary: savedArticle.summary ?? '',
                        content: savedArticle.content ?? '',
                        blocks: JSON.stringify(savedArticle.blocks),
                        cover: null,
                        cover_url: savedArticle.cover_url ?? '',
                        cover_position_x: savedCover.x,
                        cover_position_y: savedCover.y,
                        cover_zoom_percent: savedCover.zoom,
                        cover_height_px: savedCover.height,
                        clear_cover: false,
                        is_published: savedArticle.is_published,
                        scheduled_publish_at: savedArticle.scheduled_publish_at,
                        tags: savedArticle.tags ?? [],
                        access_level: savedArticle.access_level,
                    }));
                } else {
                    form.setData((data) => ({
                        ...data,
                        cover: null,
                        icon_upload: null,
                        clear_cover: false,
                    }));
                }

                if (closeEditor) {
                    setIsArticleEditing(false);
                    resetFullscreenEditing();
                }

                setIsSaveOpen(false);

                if (options.successMessage) {
                    toast.success(options.successMessage);
                }
            },
            onFinish: () => {
                form.transform((data) => data);
            },
        });
    };

    const saveArticleCover = () => {
        saveArticle(
            {
                mode: getInitialSaveMode(form.data),
                scheduledAt: form.data.scheduled_publish_at,
                tags: form.data.tags,
            },
            {
                closeEditor: false,
                successMessage: 'Обложка сохранена',
            },
        );
    };

    const openSaveModal = () => {
        setIsSaveOpen(true);
    };

    const handleSaveArticle = ({
        mode,
        scheduledAt,
        tags,
    }: {
        mode: SaveMode;
        scheduledAt: string | null;
        tags: string[];
    }) => {
        saveArticle({ mode, scheduledAt, tags });
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
        try {
            await copyText(`${window.location.origin}${article.href}`);
            setCopied(true);
            toast.success('Ссылка на статью скопирована');
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error('Не удалось скопировать ссылку');
        }
    };

    const exportArticle = (format: KnowledgeBaseArticleExportFormat) => {
        exportKnowledgeBaseArticle(
            {
                title: form.data.title,
                summary: form.data.summary,
                updatedAt: article.updated_at,
                categoryName: article.category.name,
                coverUrl: form.data.cover_url || null,
                articleUrl: `${window.location.origin}${article.href}`,
                blocks,
            },
            format,
        );
        setIsExportOpen(false);
        toast.success('Экспорт подготовлен');
    };

    const clearFullscreenTimer = () => {
        if (fullscreenTimerRef.current !== null) {
            window.clearTimeout(fullscreenTimerRef.current);
            fullscreenTimerRef.current = null;
        }
    };

    const revokeCoverPreviewUrl = () => {
        if (coverPreviewUrlRef.current) {
            URL.revokeObjectURL(coverPreviewUrlRef.current);
            coverPreviewUrlRef.current = null;
        }
    };

    const syncCoverDraftWithForm = () => {
        setCoverDraft({
            x: form.data.cover_position_x,
            y: form.data.cover_position_y,
            zoom: form.data.cover_zoom_percent,
            height: form.data.cover_height_px,
        });
    };

    const resetCoverFrame = () => {
        form.setData((data) => ({
            ...data,
            cover_position_x: DEFAULT_COVER_POSITION_X,
            cover_position_y: DEFAULT_COVER_POSITION_Y,
            cover_zoom_percent: DEFAULT_COVER_ZOOM,
            cover_height_px: DEFAULT_COVER_HEIGHT,
        }));
        setCoverDraft({
            x: DEFAULT_COVER_POSITION_X,
            y: DEFAULT_COVER_POSITION_Y,
            zoom: DEFAULT_COVER_ZOOM,
            height: DEFAULT_COVER_HEIGHT,
        });
    };

    const applyCoverFrame = () => {
        form.setData((data) => ({
            ...data,
            cover_position_x: coverDraft.x,
            cover_position_y: coverDraft.y,
            cover_zoom_percent: coverDraft.zoom,
            cover_height_px: coverDraft.height,
        }));
        setIsCoverEditorOpen(false);
    };

    const closeCoverEditor = () => {
        syncCoverDraftWithForm();
        setIsCoverEditorOpen(false);
    };

    const clearCover = () => {
        revokeCoverPreviewUrl();
        setIsCoverEditorOpen(false);
        setCoverDraft({
            x: DEFAULT_COVER_POSITION_X,
            y: DEFAULT_COVER_POSITION_Y,
            zoom: DEFAULT_COVER_ZOOM,
            height: DEFAULT_COVER_HEIGHT,
        });

        form.setData((data) => ({
            ...data,
            cover: null,
            cover_url: '',
            clear_cover: true,
            cover_position_x: DEFAULT_COVER_POSITION_X,
            cover_position_y: DEFAULT_COVER_POSITION_Y,
            cover_zoom_percent: DEFAULT_COVER_ZOOM,
            cover_height_px: DEFAULT_COVER_HEIGHT,
        }));
    };

    const openCoverPicker = () => {
        coverFileRef.current?.click();
    };

    const enterFullscreenEditing = () => {
        clearFullscreenTimer();
        setIsFullscreenEditing(true);
        setFullscreenStage('entering');

        fullscreenTimerRef.current = window.setTimeout(() => {
            setFullscreenStage('open');
            fullscreenTimerRef.current = null;
        }, FULLSCREEN_ANIMATION_MS);
    };

    const exitFullscreenEditing = () => {
        clearFullscreenTimer();
        setFullscreenStage('closing');

        fullscreenTimerRef.current = window.setTimeout(() => {
            setIsFullscreenEditing(false);
            setFullscreenStage('closed');
            fullscreenTimerRef.current = null;
        }, FULLSCREEN_ANIMATION_MS);
    };

    const resetFullscreenEditing = () => {
        clearFullscreenTimer();
        setIsFullscreenEditing(false);
        setFullscreenStage('closed');
    };

    const uploadAsset = async (
        kind: 'image' | 'file' | 'video',
        file: File,
    ) => {
        if (!canUploadAssets) {
            throw new Error('Asset upload is not allowed for this user.');
        }

        const body = new FormData();
        body.append('asset', file);
        body.append('kind', kind);

        const csrfToken = getCookie('XSRF-TOKEN');

        const response = await fetch(
            `${articleBasePath}/${article.slug}/assets`,
            {
                method: 'POST',
                body,
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
                },
            },
        );

        if (!response.ok) {
            throw new Error(`Asset upload failed: ${response.status}`);
        }

        return response.json();
    };

    const isFullscreenMode =
        isFullscreenEditing && fullscreenStage !== 'closed';
    const coverFrameStyle = useMemo(
        () => ({
            height: `${form.data.cover_height_px}px`,
        }),
        [form.data.cover_height_px],
    );

    useEffect(() => {
        if (!isFullscreenMode) {
            return undefined;
        }

        document.body.classList.add('kb-article-fullscreen-active');

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                exitFullscreenEditing();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.classList.remove('kb-article-fullscreen-active');
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isFullscreenMode]);

    useEffect(() => {
        return () => {
            clearFullscreenTimer();
            revokeCoverPreviewUrl();
        };
    }, []);

    const toggleFullscreenEditing = () => {
        if (!canUpdate) {
            return;
        }

        if (isFullscreenMode) {
            exitFullscreenEditing();
            return;
        }

        enterFullscreenEditing();
    };

    return (
        <>
            <Head title={article.title} />

            <div
                className={`kb-article-page kb-article-page--editor ${isEditing ? 'is-editing' : 'is-viewing'} ${
                    isFullscreenMode ? 'is-fullscreen-editing' : ''
                } ${fullscreenStage === 'entering' ? 'is-fullscreen-entering' : ''} ${
                    fullscreenStage === 'closing' ? 'is-fullscreen-closing' : ''
                }`}
            >
                <div
                    className={`kb-article__layout kb-article__layout--editor ${
                        isCompactArticleLayout ? 'is-compact-layout' : ''
                    }`}
                >
                    <div className="kb-article__shell kb-article__shell--editor">
                        <Breadcrumbs
                            breadcrumbs={breadcrumbs}
                            articleTitle={form.data.title}
                        />

                        {form.data.cover_url ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (canUploadAssets && isEditing) {
                                        setIsCoverEditorOpen(true);
                                    }
                                }}
                                className="kb-article__cover-button"
                            >
                                <KnowledgeBaseImageFrame
                                    src={form.data.cover_url}
                                    alt=""
                                    height={form.data.cover_height_px}
                                    focusX={form.data.cover_position_x}
                                    focusY={form.data.cover_position_y}
                                    zoomPercent={form.data.cover_zoom_percent}
                                    frameClassName="kb-article__cover-frame"
                                    imageClassName="kb-article__cover"
                                    style={coverFrameStyle}
                                />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    if (canUploadAssets && isEditing) {
                                        openCoverPicker();
                                    }
                                }}
                                className="kb-article__cover-placeholder"
                            >
                                <span
                                    className="kb-ui-emoji"
                                    aria-hidden="true"
                                >
                                    📷
                                </span>
                                Добавить обложку
                            </button>
                        )}

                        <input
                            ref={coverFileRef}
                            id="article-cover-input"
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
                            className="hidden"
                            onChange={(event) => {
                                const file = event.target.files?.[0] ?? null;

                                revokeCoverPreviewUrl();

                                form.setData('cover', file);

                                if (file) {
                                    const previewUrl =
                                        URL.createObjectURL(file);
                                    coverPreviewUrlRef.current = previewUrl;

                                    form.setData('cover_url', previewUrl);
                                    form.setData('clear_cover', false);
                                    resetCoverFrame();
                                }

                                event.target.value = '';
                            }}
                        />

                        {isEditing &&
                        isCoverEditorOpen &&
                        form.data.cover_url ? (
                            <KnowledgeBaseImageEditorControls
                                title="Кадр обложки"
                                note="Положение сохраняется вместе со статьей."
                                horizontal={form.data.cover_position_x}
                                vertical={form.data.cover_position_y}
                                zoom={form.data.cover_zoom_percent}
                                height={form.data.cover_height_px}
                                onHorizontalChange={(value) =>
                                    form.setData('cover_position_x', value)
                                }
                                onVerticalChange={(value) =>
                                    form.setData('cover_position_y', value)
                                }
                                onZoomChange={(value) =>
                                    form.setData('cover_zoom_percent', value)
                                }
                                onHeightChange={(value) =>
                                    form.setData('cover_height_px', value)
                                }
                                onReset={resetCoverFrame}
                                actions={
                                    <>
                                        <button
                                            type="button"
                                            className="kb-atb-btn kb-atb-btn--primary"
                                            onClick={saveArticleCover}
                                            disabled={form.processing}
                                        >
                                            {form.processing
                                                ? 'Сохраняем...'
                                                : 'Сохранить обложку'}
                                        </button>

                                        <button
                                            type="button"
                                            className="kb-atb-btn"
                                            onClick={openCoverPicker}
                                            disabled={form.processing}
                                        >
                                            Заменить обложку
                                        </button>

                                        <button
                                            type="button"
                                            className="kb-atb-btn kb-atb-btn--danger"
                                            onClick={clearCover}
                                            disabled={form.processing}
                                        >
                                            Убрать обложку
                                        </button>
                                    </>
                                }
                            />
                        ) : null}

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
                                        imageUrl={
                                            form.data.icon_image_url || null
                                        }
                                        className="kb-article__icon-glyph"
                                        imageClassName="kb-article__icon-image"
                                    />
                                </button>

                                <div className="kb-article__heading">
                                    {isEditing ? (
                                        <input
                                            value={form.data.title}
                                            onMouseDownCapture={
                                                stopTextInputPointerPropagation
                                            }
                                            onPointerDownCapture={
                                                stopTextInputPointerPropagation
                                            }
                                            onChange={(event) =>
                                                form.setData(
                                                    'title',
                                                    event.target.value,
                                                )
                                            }
                                            className="kb-article__title-input"
                                            placeholder="Заголовок статьи"
                                        />
                                    ) : (
                                        <h1 className="kb-article__title-static">
                                            {form.data.title}
                                        </h1>
                                    )}
                                    <div className="kb-article__meta">
                                        <span>
                                            Автор:{' '}
                                            {article.author_name ?? 'не указан'}
                                        </span>
                                        <span>
                                            Создано:{' '}
                                            {article.created_at ?? 'только что'}
                                        </span>
                                        <span>
                                            {article.updated_by_name
                                                ? `Обновил: ${article.updated_by_name}`
                                                : 'Обновлено'}
                                            {': '}
                                            {article.updated_at ?? 'только что'}
                                        </span>
                                        <span>
                                            Раздел: {article.category.name}
                                        </span>
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
                                {isEditing ? (
                                    <div className="kb-article__icon-strip">
                                        <button
                                            ref={iconTriggerRef}
                                            type="button"
                                            onClick={() =>
                                                setIsIconPickerOpen(true)
                                            }
                                            className="kb-article__icon-pill"
                                        >
                                            <span
                                                className="kb-ui-emoji"
                                                aria-hidden="true"
                                            >
                                                ＋
                                            </span>
                                            <span>Добавить иконку</span>
                                        </button>
                                    </div>
                                ) : null}

                                <div className="kb-article__heading">
                                    {isEditing ? (
                                        <input
                                            value={form.data.title}
                                            onMouseDownCapture={
                                                stopTextInputPointerPropagation
                                            }
                                            onPointerDownCapture={
                                                stopTextInputPointerPropagation
                                            }
                                            onChange={(event) =>
                                                form.setData(
                                                    'title',
                                                    event.target.value,
                                                )
                                            }
                                            className="kb-article__title-input"
                                            placeholder="Заголовок статьи"
                                        />
                                    ) : (
                                        <h1 className="kb-article__title-static">
                                            {form.data.title}
                                        </h1>
                                    )}
                                    <div className="kb-article__meta">
                                        <span>
                                            Автор:{' '}
                                            {article.author_name ?? 'не указан'}
                                        </span>
                                        <span>
                                            Создано:{' '}
                                            {article.created_at ?? 'только что'}
                                        </span>
                                        <span>
                                            {article.updated_by_name
                                                ? `Обновил: ${article.updated_by_name}`
                                                : 'Обновлено'}
                                            {': '}
                                            {article.updated_at ?? 'только что'}
                                        </span>
                                        <span>
                                            Раздел: {article.category.name}
                                        </span>
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
                                        onMouseDownCapture={
                                            stopTextInputPointerPropagation
                                        }
                                        onPointerDownCapture={
                                            stopTextInputPointerPropagation
                                        }
                                        onChange={(event) =>
                                            form.setData(
                                                'summary',
                                                event.target.value,
                                            )
                                        }
                                        className="form-control w-full resize-y px-4 py-3 text-sm"
                                        placeholder="Краткое описание статьи"
                                    />
                                </div>
                            ) : form.data.summary ? (
                                <div className="kb-article__summary-text">
                                    {form.data.summary}
                                </div>
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

                                            openSaveModal();
                                        }}
                                        disabled={form.processing}
                                        className="kb-atb-btn kb-atb-btn--primary"
                                    >
                                        <span
                                            className="kb-atb-btn__emoji"
                                            aria-hidden="true"
                                        >
                                            {isEditing ? '💾' : '✎'}
                                        </span>
                                        {isEditing
                                            ? 'Сохранить'
                                            : 'Редактировать'}
                                    </button>
                                ) : null}

                                {controls.can_duplicate ? (
                                    <button
                                        type="button"
                                        onClick={duplicateArticle}
                                        className="kb-atb-btn"
                                    >
                                        <span
                                            className="kb-atb-btn__emoji"
                                            aria-hidden="true"
                                        >
                                            ⧉
                                        </span>
                                        Дублировать
                                    </button>
                                ) : null}

                                {controls.can_move ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsMoveOpen(true)}
                                        className="kb-atb-btn"
                                    >
                                        <span
                                            className="kb-atb-btn__emoji"
                                            aria-hidden="true"
                                        >
                                            📂
                                        </span>
                                        Переместить
                                    </button>
                                ) : null}

                                <button
                                    type="button"
                                    onClick={() => setIsExportOpen(true)}
                                    className="kb-atb-btn"
                                >
                                    <span
                                        className="kb-atb-btn__emoji"
                                        aria-hidden="true"
                                    >
                                        ⬇
                                    </span>
                                    Экспорт статьи
                                </button>

                                {controls.can_delete ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsDeleteOpen(true)}
                                        className="kb-atb-btn kb-atb-btn--danger"
                                    >
                                        <span
                                            className="kb-atb-btn__emoji"
                                            aria-hidden="true"
                                        >
                                            🗑
                                        </span>
                                        Удалить статью
                                    </button>
                                ) : null}
                            </div>

                            <div className="kb-article__toolbar-side">
                                {controls.can_update ? (
                                    <button
                                        type="button"
                                        onClick={toggleFullscreenEditing}
                                        className={`kb-article__icon-action ${
                                            isFullscreenMode ? 'is-active' : ''
                                        }`}
                                        aria-label={
                                            isFullscreenMode
                                                ? 'Выйти из полноэкранного редактирования'
                                                : 'Открыть на весь экран'
                                        }
                                        title={
                                            isFullscreenMode
                                                ? 'Выйти из полноэкранного редактирования'
                                                : 'Открыть на весь экран'
                                        }
                                    >
                                        {isFullscreenMode ? (
                                            <Minimize2 className="size-4" />
                                        ) : (
                                            <Maximize2 className="size-4" />
                                        )}
                                    </button>
                                ) : null}

                                <button
                                    type="button"
                                    onClick={copyLink}
                                    className="kb-article__icon-action"
                                    title="Копировать ссылку на статью"
                                >
                                    <span
                                        className="kb-atb-btn__emoji"
                                        aria-hidden="true"
                                    >
                                        🔗
                                    </span>
                                    <span className="sr-only">
                                        {copied
                                            ? 'Ссылка скопирована'
                                            : 'Копировать ссылку'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="kb-article__editor-surface">
                            {isCompactArticleLayout && tocEntries.length > 0 ? (
                                <div className="kb-toc-mobile">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsMobileTocOpen(
                                                (current) => !current,
                                            )
                                        }
                                        className={`kb-toc-mobile__toggle ${
                                            isMobileTocOpen ? 'is-open' : ''
                                        }`}
                                    >
                                        Оглавление
                                        <ChevronDown className="size-4" />
                                    </button>

                                    {isMobileTocOpen ? (
                                        <div className="kb-toc-mobile__list">
                                            {tocEntries.map((item) => (
                                                <a
                                                    key={item.id}
                                                    href={`#${item.anchor}`}
                                                    onClick={(event) => {
                                                        jumpToTocEntry(
                                                            event,
                                                            item.anchor,
                                                        );
                                                        setIsMobileTocOpen(
                                                            false,
                                                        );
                                                    }}
                                                    className={`kb-toc-mobile__item ${
                                                        activeTocAnchor ===
                                                        item.anchor
                                                            ? 'kb-toc-mobile__item--active'
                                                            : ''
                                                    } ${
                                                        item.kind === 'child'
                                                            ? 'kb-toc-mobile__item--child'
                                                            : ''
                                                    }`}
                                                >
                                                    {item.text}
                                                </a>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

                            <KnowledgeBaseArticleEditor
                                blocks={blocks}
                                onChange={setBlocks}
                                onUploadAsset={uploadAsset}
                                headingAnchors={headingAnchors}
                                isEditing={isEditing}
                            />
                        </div>
                    </div>

                    {isCompactArticleLayout ? null : (
                        <div className="kb-toc-slot">
                            <aside className="kb-toc kb-toc--editor">
                                <div className="kb-toc__inner">
                                    <div className="kb-toc__title">
                                        Оглавление
                                    </div>

                                    {tocEntries.length > 0 ? (
                                        <div className="kb-toc__list">
                                            {tocEntries.map((item) => (
                                                <a
                                                    key={item.id}
                                                    href={`#${item.anchor}`}
                                                    onClick={(event) =>
                                                        jumpToTocEntry(
                                                            event,
                                                            item.anchor,
                                                        )
                                                    }
                                                    className={`kb-toc__item ${
                                                        activeTocAnchor ===
                                                        item.anchor
                                                            ? 'kb-toc__item--active'
                                                            : ''
                                                    } ${
                                                        item.kind === 'child'
                                                            ? 'kb-toc__item--child'
                                                            : ''
                                                    }`}
                                                >
                                                    {item.text}
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="kb-toc__empty">
                                            Появится после добавления заголовков
                                            H2/H3.
                                        </div>
                                    )}
                                </div>
                            </aside>
                        </div>
                    )}
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
                onConfirm={handleSaveArticle}
            />

            <KnowledgeBaseArticleMoveModal
                open={isMoveOpen}
                categories={move_categories}
                articleTitle={form.data.title}
                processing={form.processing}
                onCancel={() => setIsMoveOpen(false)}
                onSelect={moveArticle}
            />

            <KnowledgeBaseArticleExportModal
                open={isExportOpen}
                onCancel={() => setIsExportOpen(false)}
                onExport={exportArticle}
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

type AdminKnowledgeBaseArticleProps = Omit<
    KnowledgeBaseArticlePageProps,
    'mode'
>;

export default function AdminKnowledgeBaseArticle(
    props: AdminKnowledgeBaseArticleProps,
) {
    return <KnowledgeBaseArticlePage {...props} mode="admin" />;
}
