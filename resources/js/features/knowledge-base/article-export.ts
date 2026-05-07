import type { KnowledgeBaseArticleBlock } from '@/features/knowledge-base/types';

export type KnowledgeBaseArticleExportFormat = 'txt' | 'html' | 'doc' | 'md';

export type KnowledgeBaseArticleExportPayload = {
    title: string;
    summary?: string | null;
    updatedAt?: string | null;
    categoryName?: string | null;
    coverUrl?: string | null;
    articleUrl?: string | null;
    blocks: KnowledgeBaseArticleBlock[];
};

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
                return '&#39;';
        }
    });
}

function escapeMarkdown(value: string) {
    return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, '\\$1');
}

function stripHtml(value: string) {
    if (!/[<>&]/.test(value) || typeof document === 'undefined') {
        return value;
    }

    const template = document.createElement('template');
    template.innerHTML = value;

    return (template.content.textContent ?? '').replace(/\u00a0/g, ' ').trim();
}

function normalizeInlineHtml(html: string) {
    if (typeof document === 'undefined') {
        return escapeHtml(html);
    }

    const template = document.createElement('template');
    template.innerHTML = html;
    const allowedTags = new Set([
        'a',
        'b',
        'strong',
        'i',
        'em',
        'u',
        's',
        'code',
        'sub',
        'sup',
        'br',
    ]);

    const cleanNode = (node: Node): Node => {
        const ownerDocument = node.ownerDocument ?? document;

        if (node.nodeType === Node.TEXT_NODE) {
            return ownerDocument.createTextNode(node.textContent ?? '');
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return ownerDocument.createDocumentFragment();
        }

        const element = node as Element;
        const tagName = element.tagName.toLowerCase();

        if (!allowedTags.has(tagName)) {
            const fragment = ownerDocument.createDocumentFragment();
            element.childNodes.forEach((child) => {
                fragment.appendChild(cleanNode(child));
            });
            return fragment;
        }

        const next =
            tagName === 'br'
                ? ownerDocument.createElement('br')
                : ownerDocument.createElement(tagName);

        if (next instanceof HTMLAnchorElement) {
            const href = element.getAttribute('href')?.trim();
            if (href) {
                next.href = href;
                next.target = '_blank';
                next.rel = 'noreferrer';
            }
        }

        element.childNodes.forEach((child) => {
            next.appendChild(cleanNode(child));
        });

        return next;
    };

    const container = document.createElement('div');
    template.content.childNodes.forEach((child) => {
        container.appendChild(cleanNode(child));
    });

    return container.innerHTML.trim();
}

function inlineValueToHtml(value: string) {
    if (/<[a-z][\s\S]*>/i.test(value)) {
        return normalizeInlineHtml(value);
    }

    return escapeHtml(value).replace(
        /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g,
        (match) => {
            const href = match.startsWith('www.') ? `https://${match}` : match;

            return `<a href="${href}" target="_blank" rel="noreferrer">${escapeHtml(match)}</a>`;
        },
    );
}

function inlineValueToMarkdown(value: string) {
    if (typeof document === 'undefined') {
        return stripHtml(value);
    }

    const html = /<[a-z][\s\S]*>/i.test(value) ? normalizeInlineHtml(value) : value;

    if (!/[<>&]/.test(html)) {
        return html
            .replace(
                /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g,
                (match) => `[${match}](${match.startsWith('www.') ? `https://${match}` : match})`,
            )
            .trim();
    }

    const template = document.createElement('template');
    template.innerHTML = html;

    const walk = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
            return escapeMarkdown(node.textContent ?? '');
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return '';
        }

        const element = node as Element;
        const content = Array.from(element.childNodes)
            .map((child) => walk(child))
            .join('');

        switch (element.tagName.toLowerCase()) {
            case 'strong':
            case 'b':
                return content === '' ? '' : `**${content}**`;
            case 'em':
            case 'i':
                return content === '' ? '' : `*${content}*`;
            case 'u':
                return content === '' ? '' : `<u>${content}</u>`;
            case 's':
                return content === '' ? '' : `~~${content}~~`;
            case 'code':
                return content === '' ? '' : `\`${content}\``;
            case 'a': {
                const href = element.getAttribute('href')?.trim() ?? '';
                return href === '' ? content : `[${content || href}](${href})`;
            }
            case 'br':
                return '  \n';
            default:
                return content;
        }
    };

    return Array.from(template.content.childNodes)
        .map((child) => walk(child))
        .join('')
        .trim();
}

function blockToPlainText(block: KnowledgeBaseArticleBlock) {
    switch (block.type) {
        case 'p':
        case 'h2':
        case 'h3':
        case 'quote':
            return stripHtml(block.html?.trim() ? block.html : block.content);
        case 'ul':
            return block.items
                .filter((item) => stripHtml(item).trim() !== '')
                .map((item) => `• ${stripHtml(item)}`)
                .join('\n');
        case 'ol':
            return block.items
                .filter((item) => stripHtml(item).trim() !== '')
                .map((item, index) => `${index + 1}. ${stripHtml(item)}`)
                .join('\n');
        case 'code':
            return block.code.trim();
        case 'image':
            return [block.caption.trim(), block.url].filter(Boolean).join('\n');
        case 'video':
            return [block.caption.trim(), block.url].filter(Boolean).join('\n');
        case 'file':
            return [block.name.trim(), block.url, block.caption.trim()]
                .filter(Boolean)
                .join('\n');
        case 'link':
            return [block.title.trim(), block.url, block.caption.trim()]
                .filter(Boolean)
                .join('\n');
        case 'table':
            return block.rows
                .map((row) => row.map((cell) => stripHtml(cell)).join('\t'))
                .join('\n');
    }
}

function blockToMarkdown(block: KnowledgeBaseArticleBlock) {
    switch (block.type) {
        case 'p':
            return inlineValueToMarkdown(block.html?.trim() ? block.html : block.content);
        case 'h2':
            return `## ${inlineValueToMarkdown(block.html?.trim() ? block.html : block.content)}`;
        case 'h3':
            return `### ${inlineValueToMarkdown(block.html?.trim() ? block.html : block.content)}`;
        case 'quote':
            return inlineValueToMarkdown(block.html?.trim() ? block.html : block.content)
                .split('\n')
                .map((line) => `> ${line}`)
                .join('\n');
        case 'ul':
            return block.items
                .filter((item) => stripHtml(item).trim() !== '')
                .map((item) => `- ${inlineValueToMarkdown(item)}`)
                .join('\n');
        case 'ol':
            return block.items
                .filter((item) => stripHtml(item).trim() !== '')
                .map((item, index) => `${index + 1}. ${inlineValueToMarkdown(item)}`)
                .join('\n');
        case 'code': {
            const fence = block.language.trim() === '' ? '```' : `\`\`\`${block.language.trim()}`;
            return `${fence}\n${block.code}\n\`\`\``;
        }
        case 'image':
            return block.url.trim() === ''
                ? ''
                : `![${escapeMarkdown(block.caption || 'Изображение')}](${block.url})`;
        case 'video':
            return block.url.trim() === ''
                ? ''
                : `[${escapeMarkdown(block.caption || 'Видео')}](${block.url})`;
        case 'file':
            return block.url.trim() === ''
                ? ''
                : `[${escapeMarkdown(block.name || 'Файл')}](${block.url})`;
        case 'link':
            return block.url.trim() === ''
                ? ''
                : `[${escapeMarkdown(block.title || block.url)}](${block.url})`;
        case 'table': {
            const rows = block.rows.filter((row) => row.length > 0);

            if (rows.length === 0) {
                return '';
            }

            const normalizedRows = rows.map((row) =>
                row.map((cell) => inlineValueToMarkdown(cell) || ' '),
            );
            const header = normalizedRows[0];
            const separator = header.map(() => '---');
            const body = normalizedRows.slice(1);

            return [
                `| ${header.join(' | ')} |`,
                `| ${separator.join(' | ')} |`,
                ...body.map((row) => `| ${row.join(' | ')} |`),
            ].join('\n');
        }
    }
}

function blockToHtml(block: KnowledgeBaseArticleBlock) {
    switch (block.type) {
        case 'p':
            return `<p>${inlineValueToHtml(block.html?.trim() ? block.html : block.content)}</p>`;
        case 'h2':
            return `<h2>${inlineValueToHtml(block.html?.trim() ? block.html : block.content)}</h2>`;
        case 'h3':
            return `<h3>${inlineValueToHtml(block.html?.trim() ? block.html : block.content)}</h3>`;
        case 'quote':
            return `<blockquote>${inlineValueToHtml(block.html?.trim() ? block.html : block.content)}</blockquote>`;
        case 'ul':
        case 'ol': {
            const items = block.items
                .filter((item) => stripHtml(item).trim() !== '')
                .map((item) => `<li>${inlineValueToHtml(item)}</li>`)
                .join('');
            return items === '' ? '' : `<${block.type}>${items}</${block.type}>`;
        }
        case 'code':
            return `<section class="code-block"><div class="code-head">${escapeHtml(block.language.trim() || 'Код')}</div><pre><code>${escapeHtml(block.code)}</code></pre></section>`;
        case 'image':
            return block.url.trim() === ''
                ? ''
                : `<figure><img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.caption || 'Изображение')}" />${
                      block.caption.trim() !== ''
                          ? `<figcaption>${escapeHtml(block.caption)}</figcaption>`
                          : ''
                  }</figure>`;
        case 'video':
            return block.url.trim() === ''
                ? ''
                : `<figure><a href="${escapeHtml(block.url)}" target="_blank" rel="noreferrer">${escapeHtml(block.caption || block.url)}</a>${
                      block.caption.trim() !== '' ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''
                  }</figure>`;
        case 'file':
            return block.url.trim() === ''
                ? ''
                : `<p><a href="${escapeHtml(block.url)}" target="_blank" rel="noreferrer">${escapeHtml(block.name || 'Файл')}</a>${
                      block.caption.trim() !== ''
                          ? `<br /><span class="muted">${escapeHtml(block.caption)}</span>`
                          : ''
                  }</p>`;
        case 'link':
            return block.url.trim() === ''
                ? ''
                : `<p><a href="${escapeHtml(block.url)}" target="_blank" rel="noreferrer">${escapeHtml(block.title || block.url)}</a>${
                      block.caption.trim() !== ''
                          ? `<br /><span class="muted">${escapeHtml(block.caption)}</span>`
                          : ''
                  }</p>`;
        case 'table': {
            const rows = block.rows.filter((row) => row.length > 0);
            if (rows.length === 0) {
                return '';
            }

            const body = rows
                .map(
                    (row) =>
                        `<tr>${row
                            .map((cell) => `<td>${inlineValueToHtml(cell)}</td>`)
                            .join('')}</tr>`,
                )
                .join('');

            return `<div class="table-wrap"><table>${body}</table></div>`;
        }
    }
}

function buildHtmlDocument(payload: KnowledgeBaseArticleExportPayload) {
    const meta = [
        payload.updatedAt ? `Обновлено: ${escapeHtml(payload.updatedAt)}` : '',
        payload.categoryName ? `Раздел: ${escapeHtml(payload.categoryName)}` : '',
        payload.articleUrl
            ? `Ссылка: <a href="${escapeHtml(payload.articleUrl)}">${escapeHtml(payload.articleUrl)}</a>`
            : '',
    ]
        .filter(Boolean)
        .join(' · ');

    const blocksHtml = payload.blocks
        .map((block) => blockToHtml(block))
        .filter((block) => block.trim() !== '')
        .join('\n');

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(payload.title)}</title>
  <style>
    body{font-family:Segoe UI,Arial,sans-serif;margin:40px;color:#1f1f1f;line-height:1.7;background:#ffffff}
    article{max-width:860px;margin:0 auto}
    h1{font-size:34px;line-height:1.2;margin:0 0 10px}
    h2{font-size:26px;line-height:1.25;margin:32px 0 12px}
    h3{font-size:20px;line-height:1.35;margin:24px 0 10px}
    p,blockquote,ul,ol,figure,.table-wrap{margin:16px 0}
    .summary{padding:16px 18px;border:1px solid #ddd;border-radius:14px;background:#f7f7f5}
    .meta{font-size:13px;color:#6a6a68;margin-bottom:18px}
    blockquote{border-left:4px solid #cc001e;padding:8px 0 8px 16px;background:#fff5f6;border-radius:0 12px 12px 0}
    ul,ol{padding-left:24px}
    li{margin:6px 0}
    a{color:#b3001a;text-decoration:underline}
    figure img{max-width:100%;display:block;border-radius:16px}
    figcaption,.muted{font-size:13px;color:#6a6a68}
    .code-block{overflow:hidden;border-radius:16px;background:linear-gradient(160deg,#1e1e1c 0%,#161614 100%);color:#f5f4f1}
    .code-head{padding:12px 16px 0;font:600 12px/1.2 Segoe UI,Arial,sans-serif;color:#a8ada3;text-transform:uppercase;letter-spacing:.08em}
    pre{margin:0;padding:14px 16px 18px;white-space:pre-wrap;overflow:auto;font:13px/1.65 Consolas,Menlo,monospace}
    .table-wrap{overflow:auto}
    table{width:100%;border-collapse:collapse}
    td{border:1px solid #d7d7d3;padding:10px 12px;vertical-align:top}
  </style>
</head>
<body>
  <article>
    <h1>${escapeHtml(payload.title)}</h1>
    ${meta ? `<div class="meta">${meta}</div>` : ''}
    ${
        payload.coverUrl
            ? `<figure><img src="${escapeHtml(payload.coverUrl)}" alt="${escapeHtml(payload.title)}" /></figure>`
            : ''
    }
    ${payload.summary?.trim() ? `<div class="summary">${escapeHtml(payload.summary)}</div>` : ''}
    ${blocksHtml}
  </article>
</body>
</html>`;
}

function buildPlainTextDocument(payload: KnowledgeBaseArticleExportPayload) {
    const parts = [
        payload.title.trim(),
        payload.categoryName ? `Раздел: ${payload.categoryName}` : '',
        payload.updatedAt ? `Обновлено: ${payload.updatedAt}` : '',
        payload.articleUrl ? `Ссылка: ${payload.articleUrl}` : '',
        payload.summary?.trim() ?? '',
        ...payload.blocks.map((block) => blockToPlainText(block)),
    ];

    return parts.filter((part) => part.trim() !== '').join('\n\n');
}

function buildMarkdownDocument(payload: KnowledgeBaseArticleExportPayload) {
    const parts = [
        `# ${escapeMarkdown(payload.title.trim())}`,
        payload.categoryName ? `Раздел: ${escapeMarkdown(payload.categoryName)}` : '',
        payload.updatedAt ? `Обновлено: ${escapeMarkdown(payload.updatedAt)}` : '',
        payload.articleUrl ? `[Открыть статью](${payload.articleUrl})` : '',
        payload.coverUrl
            ? `![${escapeMarkdown(payload.title.trim())}](${payload.coverUrl})`
            : '',
        payload.summary?.trim() ? `> ${escapeMarkdown(payload.summary.trim())}` : '',
        ...payload.blocks.map((block) => blockToMarkdown(block)),
    ];

    return parts.filter((part) => part.trim() !== '').join('\n\n');
}

function makeFileName(title: string, format: KnowledgeBaseArticleExportFormat) {
    const base =
        title
            .toLowerCase()
            .replace(/[^a-zа-яё0-9]+/gi, '-')
            .replace(/^-+|-+$/g, '') || 'article';

    switch (format) {
        case 'txt':
            return `${base}.txt`;
        case 'html':
            return `${base}.html`;
        case 'doc':
            return `${base}.doc`;
        case 'md':
            return `${base}.md`;
    }
}

function triggerDownload(fileName: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportKnowledgeBaseArticle(
    payload: KnowledgeBaseArticleExportPayload,
    format: KnowledgeBaseArticleExportFormat,
) {
    switch (format) {
        case 'txt':
            triggerDownload(
                makeFileName(payload.title, format),
                new Blob([buildPlainTextDocument(payload)], {
                    type: 'text/plain;charset=utf-8',
                }),
            );
            return;
        case 'html':
            triggerDownload(
                makeFileName(payload.title, format),
                new Blob([buildHtmlDocument(payload)], {
                    type: 'text/html;charset=utf-8',
                }),
            );
            return;
        case 'doc':
            triggerDownload(
                makeFileName(payload.title, format),
                new Blob([buildHtmlDocument(payload)], {
                    type: 'application/msword;charset=utf-8',
                }),
            );
            return;
        case 'md':
            triggerDownload(
                makeFileName(payload.title, format),
                new Blob([buildMarkdownDocument(payload)], {
                    type: 'text/markdown;charset=utf-8',
                }),
            );
    }
}
