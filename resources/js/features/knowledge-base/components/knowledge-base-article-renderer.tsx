import { useMemo, useState, type MouseEvent } from 'react';
import { Check, ChevronDown, Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { KnowledgeBaseArticleBlock } from '@/features/knowledge-base/types';

function getVideoEmbedUrl(url: string) {
    if (url.includes('youtube.com/watch')) {
        const parsed = new URL(url);
        const videoId = parsed.searchParams.get('v');

        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];

        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (url.includes('vimeo.com/')) {
        const match = url.match(/vimeo\.com\/(\d+)/);

        return match ? `https://player.vimeo.com/video/${match[1]}` : null;
    }

    return null;
}

function slugifyHeading(text: string, index: number) {
    const normalized = text
        .toLowerCase()
        .replace(/[^a-zа-я0-9]+/gi, '-')
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
        await navigator.clipboard.writeText(code);
        setCopied(true);
        toast.success('Код скопирован');
        window.setTimeout(() => setCopied(false), 1400);
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

export function KnowledgeBaseArticleRenderer({
    blocks,
    emptyText = 'Контент для этой статьи еще заполняется.',
}: {
    blocks: KnowledgeBaseArticleBlock[];
    emptyText?: string;
}) {
    const [mobileTocOpen, setMobileTocOpen] = useState(false);

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

    const jumpToHeading = (event: MouseEvent<HTMLAnchorElement>, anchor: string) => {
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
                <Tag className="kb-renderer__list">
                    {block.items
                        .filter((item) => item.trim() !== '')
                        .map((item, index) => (
                            <li key={`${block.id}-${index}`}>{item}</li>
                        ))}
                </Tag>
            );
        }

        if (block.type === 'code') {
            return <CodeBlock language={block.language} code={block.code} />;
        }

        if (block.type === 'image') {
            return (
                <figure className="kb-renderer__media">
                    <img src={block.url} alt={block.caption} className="kb-renderer__image" />
                    {block.caption.trim() !== '' ? (
                        <figcaption className="kb-renderer__caption">{block.caption}</figcaption>
                    ) : null}
                </figure>
            );
        }

        if (block.type === 'video') {
            const embedUrl = getVideoEmbedUrl(block.url);

            return (
                <figure className="kb-renderer__media">
                    {embedUrl ? (
                        <iframe
                            src={embedUrl}
                            title={block.caption || 'Видео'}
                            className="kb-renderer__video-frame"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    ) : (
                        <video src={block.url} controls className="kb-renderer__video" />
                    )}
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
            return (
                <div className="kb-renderer__table-wrap">
                    <table className="kb-renderer__table">
                        <tbody>
                            {block.rows.map((row, rowIndex) => (
                                <tr key={`${block.id}-${rowIndex}`}>
                                    {row.map((cell, cellIndex) => (
                                        <td key={`${block.id}-${rowIndex}-${cellIndex}`}>{cell}</td>
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
        <div className="kb-renderer">
            {headings.length >= 2 ? (
                <>
                    <aside className="kb-toc">
                        <div className="kb-toc__inner">
                            <div className="kb-toc__title">Оглавление</div>
                            <div className="kb-toc__list">
                                {headings.map((heading) => (
                                    <a
                                        key={heading.anchor}
                                        href={`#${heading.anchor}`}
                                        onClick={(event) => jumpToHeading(event, heading.anchor)}
                                        className={`kb-toc__item ${heading.type === 'h3' ? 'kb-toc__item--child' : ''}`}
                                    >
                                        {heading.text}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </aside>

                    <div className="kb-toc-mobile">
                        <button
                            type="button"
                            onClick={() => setMobileTocOpen((current) => !current)}
                            className={`kb-toc-mobile__toggle ${mobileTocOpen ? 'is-open' : ''}`}
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
                                            jumpToHeading(event, heading.anchor);
                                            setMobileTocOpen(false);
                                        }}
                                        className={`kb-toc-mobile__item ${heading.type === 'h3' ? 'kb-toc-mobile__item--child' : ''}`}
                                    >
                                        {heading.text}
                                    </a>
                                ))}
                            </div>
                        ) : null}
                    </div>
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
        </div>
    );
}
