import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type MouseEvent,
} from 'react';
import { Check, ChevronDown, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useViewportMaxWidth } from '@/hooks/use-mobile';
import { copyText } from '@/lib/copy-text';
import type { KnowledgeBaseArticleBlock } from '@/features/knowledge-base/types';

const DEFAULT_MEDIA_FOCUS_X = 50;
const DEFAULT_MEDIA_FOCUS_Y = 50;
const DEFAULT_MEDIA_ZOOM = 100;
const DEFAULT_MEDIA_HEIGHT = 220;
const DEFAULT_TABLE_COLUMN_WIDTH = 220;
const MIN_TABLE_COLUMN_WIDTH = 120;
const MAX_TABLE_COLUMN_WIDTH = 720;
const DEFAULT_TABLE_ROW_HEIGHT = 56;
const MIN_TABLE_ROW_HEIGHT = 42;
const MAX_TABLE_ROW_HEIGHT = 280;

type LightboxMedia =
    | {
          kind: 'image';
          url: string;
          caption: string;
      }
    | {
          kind: 'video';
          url: string;
          caption: string;
          embedUrl: string | null;
      };

function extractEmbedSource(raw: string) {
    const trimmed = raw.trim();

    if (trimmed === '') {
        return '';
    }

    if (trimmed.startsWith('<')) {
        const template = document.createElement('template');
        template.innerHTML = trimmed;
        const iframe = template.content.querySelector('iframe');
        const source = iframe?.getAttribute('src')?.trim();

        if (source) {
            return source.startsWith('//') ? `https:${source}` : source;
        }
    }

    return trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
}

function getVideoEmbedUrl(rawUrl: string) {
    const source = extractEmbedSource(rawUrl);

    if (source === '') {
        return null;
    }

    let parsed: URL;

    try {
        parsed = new URL(source);
    } catch {
        return null;
    }

    const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, '');

    if (
        hostname === 'youtube.com' ||
        hostname === 'm.youtube.com' ||
        hostname === 'youtube-nocookie.com'
    ) {
        if (path === '/watch') {
            const videoId = parsed.searchParams.get('v');
            return videoId
                ? `https://www.youtube.com/embed/${videoId}`
                : null;
        }

        const pathParts = path.split('/').filter(Boolean);
        const embedIndex = pathParts.findIndex((segment) =>
            ['embed', 'shorts', 'live'].includes(segment),
        );
        const videoId =
            embedIndex >= 0 ? pathParts[embedIndex + 1] ?? null : null;

        return videoId
            ? `https://www.youtube.com/embed/${videoId}`
            : null;
    }

    if (hostname === 'youtu.be') {
        const videoId = path.split('/').filter(Boolean)[0] ?? null;
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (hostname === 'vimeo.com' || hostname === 'player.vimeo.com') {
        const match = path.match(/(?:\/video\/)?(\d+)/);
        return match ? `https://player.vimeo.com/video/${match[1]}` : null;
    }

    return null;
}

function resolveVideoSource(rawUrl: string) {
    const url = extractEmbedSource(rawUrl);

    return {
        url,
        embedUrl: getVideoEmbedUrl(url),
    };
}

function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => {
        switch (character) {
            case '&':
                return '&amp;';
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '"':
                return '&quot;';
            default:
                return '&#039;';
        }
    });
}

function linkifyInlineText(value: string) {
    return escapeHtml(value).replace(
        /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g,
        (match) => {
            const href = match.startsWith('www.') ? `https://${match}` : match;

            return `<a href="${href}" target="_blank" rel="noreferrer">${match}</a>`;
        },
    );
}
function cleanInlineNode(node: Node): Node {
    const ownerDocument = node.ownerDocument ?? document;

    if (node.nodeType === Node.TEXT_NODE) {
        return ownerDocument.createTextNode(node.textContent ?? '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return ownerDocument.createDocumentFragment();
    }

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    if (['script', 'style', 'meta', 'link'].includes(tagName)) {
        return ownerDocument.createDocumentFragment();
    }

    if (tagName === 'br') {
        return ownerDocument.createElement('br');
    }

    const allowedTags = new Set([
        'a',
        'b',
        'strong',
        'i',
        'em',
        'u',
        's',
        'strike',
        'code',
        'sub',
        'sup',
    ]);
    const target =
        allowedTags.has(tagName) && tagName !== 'strike'
            ? ownerDocument.createElement(tagName)
            : tagName === 'strike'
              ? ownerDocument.createElement('s')
              : ownerDocument.createDocumentFragment();

    if (target instanceof HTMLAnchorElement) {
        const href = element.getAttribute('href')?.trim();

        if (href) {
            target.href = href;
            target.target = '_blank';
            target.rel = 'noreferrer';
        }
    }

    element.childNodes.forEach((child) => {
        target.appendChild(cleanInlineNode(child));
    });

    return target;
}

function sanitizeInlineHtml(html: string) {
    const template = document.createElement('template');
    template.innerHTML = html;

    const container = document.createElement('div');
    template.content.childNodes.forEach((child) => {
        container.appendChild(cleanInlineNode(child));
    });

    return container.innerHTML.trim();
}

function renderInlineCell(value: string) {
    if (/<[a-z][\s\S]*>/i.test(value)) {
        return { __html: sanitizeInlineHtml(value) };
    }

    return { __html: linkifyInlineText(value).replace(/\n/g, '<br />') };
}

function normalizeTableColumnWidths(
    widths: number[] | undefined,
    rows: string[][],
) {
    const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);

    if (columnCount <= 0) {
        return [];
    }

    return Array.from({ length: columnCount }, (_, index) => {
        const value = widths?.[index] ?? DEFAULT_TABLE_COLUMN_WIDTH;
        return Math.min(
            MAX_TABLE_COLUMN_WIDTH,
            Math.max(MIN_TABLE_COLUMN_WIDTH, Math.round(value)),
        );
    });
}

function normalizeTableRowHeights(
    heights: number[] | undefined,
    rows: string[][],
) {
    if (rows.length <= 0) {
        return [];
    }

    return Array.from({ length: rows.length }, (_, index) => {
        const value = heights?.[index] ?? DEFAULT_TABLE_ROW_HEIGHT;
        return Math.min(
            MAX_TABLE_ROW_HEIGHT,
            Math.max(MIN_TABLE_ROW_HEIGHT, Math.round(value)),
        );
    });
}

function slugifyHeading(text: string, index: number) {
    const normalized = text
        .toLowerCase()
        .replace(/[^a-zа-яё0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '');

    return normalized === '' ? `section-${index + 1}` : `${normalized}-${index + 1}`;
}

function CodeBlock({
    language,
    code,
}: {
    language: string;
    code: string;
}) {
    const [copied, setCopied] = useState(false);

    const copyCode = async () => {
        try {
            await copyText(code);
            setCopied(true);
            toast.success('Код скопирован');
            window.setTimeout(() => setCopied(false), 1400);
        } catch {
            toast.error('Не удалось скопировать код');
        }
    };

    return (
        <div className="kb-renderer__code">
            <div className="kb-renderer__code-head">
                <span className="kb-renderer__code-lang">
                    {language.trim() === '' ? 'Код' : language}
                </span>

                <button type="button" onClick={copyCode} className="kb-renderer__code-copy">
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied ? 'Скопировано' : 'Копировать'}
                </button>
            </div>

            <pre className="kb-renderer__code-pre">
                <code>{code}</code>
            </pre>
        </div>
    );
}

function renderRichText(html: string | undefined, fallback: string) {
    if (html && html.trim() !== '') {
        return { __html: html };
    }

    return { __html: fallback };
}

function hasCustomMediaPresentation(
    block: Extract<KnowledgeBaseArticleBlock, { type: 'image' | 'video' }>,
) {
    return (
        (block.height_px ?? DEFAULT_MEDIA_HEIGHT) !== DEFAULT_MEDIA_HEIGHT ||
        (block.focus_x ?? DEFAULT_MEDIA_FOCUS_X) !== DEFAULT_MEDIA_FOCUS_X ||
        (block.focus_y ?? DEFAULT_MEDIA_FOCUS_Y) !== DEFAULT_MEDIA_FOCUS_Y ||
        (block.zoom_percent ?? DEFAULT_MEDIA_ZOOM) !== DEFAULT_MEDIA_ZOOM
    );
}

function mediaWidthStyle(
    block: Extract<KnowledgeBaseArticleBlock, { type: 'image' | 'video' }>,
): CSSProperties {
    return {
        '--kb-media-width': `${block.width_percent ?? 100}%`,
        '--kb-media-height': `${block.height_px ?? DEFAULT_MEDIA_HEIGHT}px`,
    } as CSSProperties;
}

function mediaPresentationStyle(
    block: Extract<KnowledgeBaseArticleBlock, { type: 'image' | 'video' }>,
): CSSProperties {
    const focusX = block.focus_x ?? DEFAULT_MEDIA_FOCUS_X;
    const focusY = block.focus_y ?? DEFAULT_MEDIA_FOCUS_Y;
    const zoomPercent = block.zoom_percent ?? DEFAULT_MEDIA_ZOOM;

    return {
        objectPosition: `${focusX}% ${focusY}%`,
        transform: `scale(${zoomPercent / 100})`,
        transformOrigin: `${focusX}% ${focusY}%`,
    };
}

function getNearestScrollContainer(node: HTMLElement | null): HTMLElement | Window {
    let current = node?.parentElement ?? null;

    while (current) {
        const style = window.getComputedStyle(current);
        const overflowY = style.overflowY;

        if (/(auto|scroll|overlay)/.test(overflowY) && current.scrollHeight > current.clientHeight) {
            return current;
        }

        current = current.parentElement;
    }

    return window;
}

export function KnowledgeBaseArticleRenderer({
    blocks,
    emptyText = 'Контент для этой статьи еще заполняется.',
}: {
    blocks: KnowledgeBaseArticleBlock[];
    emptyText?: string;
}) {
    const isCompactTocLayout = useViewportMaxWidth(1100);
    const [mobileTocOpen, setMobileTocOpen] = useState(false);
    const [activeTocAnchor, setActiveTocAnchor] = useState('');
    const [lightboxMedia, setLightboxMedia] = useState<LightboxMedia | null>(
        null,
    );
    const rendererRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!lightboxMedia) {
            return undefined;
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setLightboxMedia(null);
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleEscape);

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleEscape);
        };
    }, [lightboxMedia]);

    const headings = useMemo(() => {
        return blocks
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
                    type: block.type,
                    anchor: slugifyHeading(text, index),
                };
            })
            .filter((item) => item !== null);
    }, [blocks]);

    const nonEmptyBlocks = blocks.filter((block) => {
        if (block.type === 'p' || block.type === 'h2' || block.type === 'h3' || block.type === 'quote') {
            return block.content.trim() !== '';
        }

        if (block.type === 'ul' || block.type === 'ol') {
            return block.items.some((item) => item.trim() !== '');
        }

        if (block.type === 'code') {
            return block.code.trim() !== '';
        }

        if (block.type === 'table') {
            return block.rows.some((row) => row.some((cell) => cell.trim() !== ''));
        }

        if (block.type === 'image' || block.type === 'video') {
            return block.url.trim() !== '';
        }

        if (block.type === 'file') {
            return block.url.trim() !== '' || block.name.trim() !== '';
        }

        if (block.type === 'link') {
            return block.url.trim() !== '' || block.title.trim() !== '';
        }

        return false;
    });

    useEffect(() => {
        if (headings.length === 0) {
            setActiveTocAnchor('');
            return;
        }

        const updateActiveTocAnchor = () => {
            const offset = 148;
            let currentAnchor = headings[0]?.anchor ?? '';

            for (const heading of headings) {
                const element = document.getElementById(heading.anchor);

                if (!element) {
                    continue;
                }

                if (element.getBoundingClientRect().top - offset <= 0) {
                    currentAnchor = heading.anchor;
                    continue;
                }

                break;
            }

            setActiveTocAnchor(currentAnchor);
        };

        const scrollContainer = getNearestScrollContainer(rendererRef.current);
        const scrollTarget = scrollContainer === window ? window : scrollContainer;

        updateActiveTocAnchor();
        scrollTarget.addEventListener('scroll', updateActiveTocAnchor, {
            passive: true,
        });
        window.addEventListener('resize', updateActiveTocAnchor);

        return () => {
            scrollTarget.removeEventListener('scroll', updateActiveTocAnchor);
            window.removeEventListener('resize', updateActiveTocAnchor);
        };
    }, [headings]);

    const jumpToHeading = (event: MouseEvent<HTMLAnchorElement>, anchor: string) => {
        event.preventDefault();

        const target = document.getElementById(anchor);

        if (!target) {
            window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${anchor}`);
            return;
        }

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const scrollContainer = getNearestScrollContainer(rendererRef.current);
        const offset = 88;

        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${anchor}`);
        setActiveTocAnchor(anchor);

        if (scrollContainer === window) {
            const top = target.getBoundingClientRect().top + window.scrollY - offset;

            window.scrollTo({
                top: Math.max(0, top),
                behavior: prefersReducedMotion ? 'auto' : 'smooth',
            });
            return;
        }

        const container = scrollContainer as HTMLElement;
        const top =
            target.getBoundingClientRect().top -
            container.getBoundingClientRect().top +
            container.scrollTop -
            offset;

        container.scrollTo({
            top: Math.max(0, top),
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
    };

    const renderBlock = (block: KnowledgeBaseArticleBlock) => {
        if (block.type === 'p') {
            return (
                <p
                    className="kb-renderer__paragraph"
                    dangerouslySetInnerHTML={renderRichText(block.html, block.content)}
                />
            );
        }

        if (block.type === 'h2' || block.type === 'h3') {
            const heading = headings.find((item) => item.id === block.id);
            const Tag = block.type;

            return (
                <Tag
                    id={heading?.anchor}
                    className={block.type === 'h2' ? 'kb-renderer__h2' : 'kb-renderer__h3'}
                    dangerouslySetInnerHTML={renderRichText(block.html, block.content)}
                />
            );
        }

        if (block.type === 'quote') {
            return (
                <blockquote
                    className="kb-renderer__quote"
                    dangerouslySetInnerHTML={renderRichText(block.html, block.content)}
                />
            );
        }

        if (block.type === 'ul' || block.type === 'ol') {
            const Tag = block.type;

            return (
                <Tag
                    className={`kb-renderer__list kb-renderer__list--${block.type}`}
                >
                    {block.items
                        .filter((item) => item.trim() !== '')
                        .map((item, index) => (
                            <li
                                key={`${block.id}-${index}`}
                                dangerouslySetInnerHTML={renderInlineCell(item)}
                            />
                        ))}
                </Tag>
            );
        }

        if (block.type === 'code') {
            return <CodeBlock language={block.language} code={block.code} />;
        }

        if (block.type === 'image') {
            return (
                <figure className="kb-renderer__media" style={mediaWidthStyle(block)}>
                    <button
                        type="button"
                        className={`kb-renderer__media-frame kb-renderer__media-frame--button ${
                            hasCustomMediaPresentation(block)
                                ? 'is-cropped'
                                : ''
                        }`}
                        onClick={() =>
                            setLightboxMedia({
                                kind: 'image',
                                url: block.url,
                                caption: block.caption,
                            })
                        }
                    >
                        <img
                            src={block.url}
                            alt={block.caption}
                            className={`kb-renderer__image ${
                                hasCustomMediaPresentation(block)
                                    ? 'kb-renderer__image--cropped'
                                    : ''
                            }`}
                            style={
                                hasCustomMediaPresentation(block)
                                    ? mediaPresentationStyle(block)
                                    : undefined
                            }
                        />
                    </button>
                    {block.caption.trim() !== '' ? (
                        <figcaption className="kb-renderer__caption">{block.caption}</figcaption>
                    ) : null}
                </figure>
            );
        }

        if (block.type === 'video') {
            const resolvedVideo = resolveVideoSource(block.url);

            return (
                <figure className="kb-renderer__media" style={mediaWidthStyle(block)}>
                    <div className="kb-renderer__video-shell">
                        {resolvedVideo.embedUrl ? (
                        <iframe
                            src={resolvedVideo.embedUrl}
                            title={block.caption || 'Видео'}
                            className="kb-renderer__video-frame"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    ) : (
                        <div
                            className={`kb-renderer__media-frame ${
                                hasCustomMediaPresentation(block)
                                    ? 'is-cropped'
                                    : ''
                            }`}
                            style={mediaWidthStyle(block)}
                        >
                            <video
                                src={resolvedVideo.url}
                                controls
                                className={`kb-renderer__video ${
                                    hasCustomMediaPresentation(block)
                                        ? 'kb-renderer__video--cropped'
                                        : ''
                                }`}
                                style={
                                    hasCustomMediaPresentation(block)
                                        ? mediaPresentationStyle(block)
                                        : undefined
                                }
                            />
                        </div>
                    )}
                        <button
                            type="button"
                            className="kb-renderer__media-expand"
                            onClick={() =>
                                setLightboxMedia({
                                    kind: 'video',
                                    url: resolvedVideo.url,
                                    caption: block.caption,
                                    embedUrl: resolvedVideo.embedUrl,
                                })
                            }
                        >
                            Открыть
                        </button>
                    </div>
                    {block.caption.trim() !== '' ? (
                        <figcaption className="kb-renderer__caption">{block.caption}</figcaption>
                    ) : null}
                </figure>
            );
        }

        if (block.type === 'file') {
            return (
                <div className="kb-renderer__file">
                    <div className="kb-renderer__file-main">
                        <div className="kb-renderer__file-name">{block.name || 'Файл'}</div>
                        {block.size_label.trim() !== '' ? (
                            <div className="kb-renderer__file-meta">{block.size_label}</div>
                        ) : null}
                        {block.caption.trim() !== '' ? (
                            <div className="kb-renderer__caption">{block.caption}</div>
                        ) : null}
                    </div>

                    <a href={block.url} target="_blank" rel="noreferrer" className="kb-renderer__file-link">
                        Скачать
                    </a>
                </div>
            );
        }

        if (block.type === 'table') {
            const tableColumnWidths = normalizeTableColumnWidths(
                block.column_widths,
                block.rows,
            );
            const tableRowHeights = normalizeTableRowHeights(
                block.row_heights,
                block.rows,
            );

            return (
                <div className="kb-renderer__table-wrap">
                    <table className="kb-renderer__table">
                        <colgroup>
                            {tableColumnWidths.map((width, columnIndex) => (
                                <col
                                    key={`${block.id}-col-${columnIndex}`}
                                    style={{ width: `${width}px` }}
                                />
                            ))}
                        </colgroup>
                        <tbody>
                            {block.rows.map((row, rowIndex) => (
                                <tr
                                    key={`${block.id}-${rowIndex}`}
                                    style={{
                                        height: `${tableRowHeights[rowIndex] ?? DEFAULT_TABLE_ROW_HEIGHT}px`,
                                    }}
                                >
                                    {row.map((cell, cellIndex) => (
                                        <td
                                            key={`${block.id}-${rowIndex}-${cellIndex}`}
                                            dangerouslySetInnerHTML={renderInlineCell(
                                                cell,
                                            )}
                                        />
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        if (block.type === 'link') {
            return (
                <div className="kb-renderer__link-card">
                    <a href={block.url} target="_blank" rel="noreferrer" className="kb-renderer__link-title">
                        {block.title.trim() === '' ? block.url : block.title}
                    </a>
                    {block.caption.trim() !== '' ? (
                        <div className="kb-renderer__caption">{block.caption}</div>
                    ) : null}
                </div>
            );
        }

        return null;
    };

    return (
        <div
            ref={rendererRef}
            className={`kb-renderer ${
                isCompactTocLayout ? 'is-compact-layout' : ''
            }`}
        >
            {headings.length >= 2 ? (
                <>
                    {isCompactTocLayout ? (
                        <div className="kb-toc-mobile">
                            <button
                                type="button"
                                onClick={() =>
                                    setMobileTocOpen((current) => !current)
                                }
                                className={`kb-toc-mobile__toggle ${
                                    mobileTocOpen ? 'is-open' : ''
                                }`}
                            >
                                Оглавление
                                <ChevronDown className="size-4" />
                            </button>

                            {mobileTocOpen ? (
                                <div className="kb-toc-mobile__list">
                                    {headings.map((heading) => (
                                        <a
                                            key={heading.anchor}
                                            href={`#${heading.anchor}`}
                                            onClick={(event) => {
                                                jumpToHeading(
                                                    event,
                                                    heading.anchor,
                                                );
                                                setMobileTocOpen(false);
                                            }}
                                            className={`kb-toc-mobile__item ${
                                                activeTocAnchor ===
                                                heading.anchor
                                                    ? 'kb-toc-mobile__item--active'
                                                    : ''
                                            } ${
                                                heading.type === 'h3'
                                                    ? 'kb-toc-mobile__item--child'
                                                    : ''
                                            }`}
                                        >
                                            {heading.text}
                                        </a>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div className="kb-toc-slot">
                            <aside className="kb-toc">
                                <div className="kb-toc__inner">
                                    <div className="kb-toc__title">
                                        Оглавление
                                    </div>
                                    <div className="kb-toc__list">
                                        {headings.map((heading) => (
                                            <a
                                                key={heading.anchor}
                                                href={`#${heading.anchor}`}
                                                onClick={(event) =>
                                                    jumpToHeading(
                                                        event,
                                                        heading.anchor,
                                                    )
                                                }
                                                className={`kb-toc__item ${
                                                    activeTocAnchor ===
                                                    heading.anchor
                                                        ? 'kb-toc__item--active'
                                                        : ''
                                                } ${
                                                    heading.type === 'h3'
                                                        ? 'kb-toc__item--child'
                                                        : ''
                                                }`}
                                            >
                                                {heading.text}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </aside>
                        </div>
                    )}
                </>
            ) : null}

            <div className="kb-renderer__content">
                {nonEmptyBlocks.length === 0 ? (
                    <p className="kb-renderer__empty">{emptyText}</p>
                ) : (
                    nonEmptyBlocks.map((block) => (
                        <div key={block.id} className="kb-renderer__block">
                            {renderBlock(block)}
                        </div>
                    ))
                )}
            </div>
            {lightboxMedia ? (
                <div
                    className="kb-renderer__lightbox"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Просмотр медиа"
                    onClick={() => setLightboxMedia(null)}
                >
                    <button
                        type="button"
                        className="kb-renderer__lightbox-close"
                        onClick={() => setLightboxMedia(null)}
                    >
                        Закрыть
                    </button>
                    <figure
                        className="kb-renderer__lightbox-figure"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {lightboxMedia.kind === 'image' ? (
                            <img
                                src={lightboxMedia.url}
                                alt={lightboxMedia.caption}
                                className="kb-renderer__lightbox-image"
                            />
                        ) : lightboxMedia.embedUrl ? (
                            <iframe
                                src={lightboxMedia.embedUrl}
                                title={lightboxMedia.caption || 'Видео'}
                                className="kb-renderer__lightbox-iframe"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        ) : (
                            <video
                                src={lightboxMedia.url}
                                controls
                                autoPlay
                                className="kb-renderer__lightbox-video"
                            />
                        )}
                        {lightboxMedia.caption.trim() !== '' ? (
                            <figcaption className="kb-renderer__lightbox-caption">
                                {lightboxMedia.caption}
                            </figcaption>
                        ) : null}
                    </figure>
                </div>
            ) : null}
        </div>
    );
}
