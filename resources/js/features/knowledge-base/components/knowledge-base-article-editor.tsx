import {
    type ClipboardEvent as ReactClipboardEvent,
    createElement,
    type CSSProperties,
    type JSX,
    type KeyboardEvent as ReactKeyboardEvent,
    type MouseEvent as ReactMouseEvent,
    type PointerEvent as ReactPointerEvent,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
    Check,
    Copy,
    ImagePlus,
    Link2,
    Paperclip,
    Play,
    Trash2,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/confirm-modal';
import { KnowledgeBaseImageEditorControls } from '@/features/knowledge-base/components/knowledge-base-image-editor-controls';
import { KnowledgeBaseImageFrame } from '@/features/knowledge-base/components/knowledge-base-image-frame';
import type { KnowledgeBaseArticleBlock } from '@/features/knowledge-base/types';

type UploadResult = {
    url: string;
    name?: string;
    size_label?: string;
};

type KnowledgeBaseArticleEditorProps = {
    blocks: KnowledgeBaseArticleBlock[];
    onChange: (blocks: KnowledgeBaseArticleBlock[]) => void;
    onUploadAsset: (
        kind: 'image' | 'file' | 'video',
        file: File,
    ) => Promise<UploadResult>;
    isEditing?: boolean;
};

type BlockTypeOption = {
    type: KnowledgeBaseArticleBlock['type'];
    label: string;
    hint: string;
};

type ToolbarState = {
    kind: 'block' | 'table-cell';
    blockId: string;
    rowIndex?: number;
    cellIndex?: number;
    top: number;
    left: number;
    linkUrl: string;
    formats: ToolbarFormats;
};

type ToolbarFormats = {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
    link: boolean;
};

type EditorMenuState =
    | {
          kind: 'add';
          targetId: string | 'root';
          top: number;
          left: number;
      }
    | {
          kind: 'actions';
          blockId: string;
          top: number;
          left: number;
      };

type DropIndicatorState = {
    targetId: string;
    position: 'before' | 'after';
};

type RichTextBlockType = Extract<
    KnowledgeBaseArticleBlock,
    { content: string }
>['type'];

type FocusRequest =
    | {
          kind: 'block';
          blockId: string;
      }
    | {
          kind: 'table-cell';
          blockId: string;
          rowIndex: number;
          cellIndex: number;
      };

const BLOCK_TYPE_OPTIONS: BlockTypeOption[] = [
    { type: 'p', label: 'Параграф', hint: 'Обычный текст' },
    { type: 'h2', label: 'Заголовок', hint: 'Крупный заголовок' },
    { type: 'h3', label: 'Подзаголовок', hint: 'Подзаголовок раздела' },
    { type: 'ul', label: 'Список', hint: 'Маркированный список' },
    { type: 'ol', label: 'Нумерация', hint: 'Нумерованный список' },
    { type: 'quote', label: 'Цитата', hint: 'Выделенная цитата' },
    { type: 'code', label: 'Код', hint: 'Блок кода' },
    { type: 'link', label: 'Ссылка', hint: 'Интерактивная ссылка' },
    { type: 'image', label: 'Изображение', hint: 'Картинка' },
    { type: 'table', label: 'Таблица', hint: 'Структурированная таблица' },
    { type: 'file', label: 'Файл', hint: 'Прикрепленный файл' },
    { type: 'video', label: 'Видео', hint: 'YouTube / Vimeo / файл' },
];

const IMAGE_WIDTH_OPTIONS = [50, 75, 100] as const;
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
const MAX_EDITOR_UNDO_STEPS = 80;

type ResolvedVideoSource = {
    url: string;
    embedUrl: string | null;
};

type StructuredPastePayload = {
    text: string;
    html: string;
};

function blockTypeSymbol(type: KnowledgeBaseArticleBlock['type']) {
    switch (type) {
        case 'p':
            return 'T';
        case 'h2':
            return 'H2';
        case 'h3':
            return 'H3';
        case 'quote':
            return '❝';
        case 'ul':
            return '•';
        case 'ol':
            return '1.';
        case 'code':
            return '<>';
        case 'link':
            return '🔗';
        case 'image':
            return '🖼';
        case 'table':
            return '⊞';
        case 'file':
            return '📎';
        case 'video':
            return '▶';
    }
}

function createId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function createBlock(
    type: KnowledgeBaseArticleBlock['type'],
): KnowledgeBaseArticleBlock {
    const id = createId();

    switch (type) {
        case 'p':
        case 'h2':
        case 'h3':
        case 'quote':
            return { id, type, content: '', html: '' };
        case 'ul':
        case 'ol':
            return { id, type, items: [''] };
        case 'code':
            return { id, type, language: '', code: '' };
        case 'image':
        case 'video':
            return {
                id,
                type,
                url: '',
                caption: '',
                width_percent: 100,
                focus_x: DEFAULT_MEDIA_FOCUS_X,
                focus_y: DEFAULT_MEDIA_FOCUS_Y,
                zoom_percent: DEFAULT_MEDIA_ZOOM,
            };
        case 'file':
            return { id, type, url: '', name: '', size_label: '', caption: '' };
        case 'table':
            return {
                id,
                type,
                rows: [
                    ['', '', ''],
                    ['', '', ''],
                    ['', '', ''],
                ],
                column_widths: [
                    DEFAULT_TABLE_COLUMN_WIDTH,
                    DEFAULT_TABLE_COLUMN_WIDTH,
                    DEFAULT_TABLE_COLUMN_WIDTH,
                ],
                row_heights: [
                    DEFAULT_TABLE_ROW_HEIGHT,
                    DEFAULT_TABLE_ROW_HEIGHT,
                    DEFAULT_TABLE_ROW_HEIGHT,
                ],
            };
        case 'link':
            return { id, type, url: '', title: '', caption: '' };
    }
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

function mediaFrameWidthStyle(
    block: Extract<KnowledgeBaseArticleBlock, { type: 'image' | 'video' }>,
) {
    return {
        width: `${block.width_percent ?? 100}%`,
    };
}

function getTableColumnCount(rows: string[][]) {
    return rows.reduce((max, row) => Math.max(max, row.length), 0);
}

function normalizeTableColumnWidths(
    widths: number[] | undefined,
    rows: string[][],
) {
    const columnCount = getTableColumnCount(rows);

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

function buildTableBlockPatch(
    rows: string[][],
    widths?: number[],
    heights?: number[],
): Pick<
    Extract<KnowledgeBaseArticleBlock, { type: 'table' }>,
    'rows' | 'column_widths' | 'row_heights'
> {
    return {
        rows,
        column_widths: normalizeTableColumnWidths(widths, rows),
        row_heights: normalizeTableRowHeights(heights, rows),
    };
}

function parseTableCellAddress(value: string | null | undefined) {
    if (!value) {
        return null;
    }

    const [blockId, rowIndex, cellIndex] = value.split(':');

    if (!blockId || rowIndex === undefined || cellIndex === undefined) {
        return null;
    }

    return {
        blockId,
        rowIndex: Number(rowIndex),
        cellIndex: Number(cellIndex),
    };
}

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

            return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
        }

        const pathParts = path.split('/').filter(Boolean);
        const embedIndex = pathParts.findIndex((segment) =>
            ['embed', 'shorts', 'live'].includes(segment),
        );
        const videoId =
            embedIndex >= 0 ? (pathParts[embedIndex + 1] ?? null) : null;

        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
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

function resolveVideoSource(rawUrl: string): ResolvedVideoSource {
    const url = extractEmbedSource(rawUrl);

    return {
        url,
        embedUrl: getVideoEmbedUrl(url),
    };
}

function convertBlock(
    current: KnowledgeBaseArticleBlock,
    nextType: KnowledgeBaseArticleBlock['type'],
): KnowledgeBaseArticleBlock {
    const next = createBlock(nextType);

    if ('content' in current && 'content' in next) {
        return {
            ...next,
            content: current.content,
            html: current.html ?? current.content,
        };
    }

    if ('items' in current && 'items' in next) {
        return { ...next, items: current.items };
    }

    if ('content' in current && 'items' in next) {
        return { ...next, items: current.content.split('\n').filter(Boolean) };
    }

    if ('items' in current && 'content' in next) {
        const content = current.items.join('\n');
        return { ...next, content, html: content };
    }

    if (current.type === 'code' && 'content' in next) {
        return { ...next, content: current.code, html: current.code };
    }

    if ('content' in current && current.content.trim() !== '') {
        if (next.type === 'code') {
            return { ...next, code: current.content };
        }

        if (next.type === 'link') {
            return { ...next, title: current.content };
        }
    }

    return next;
}

function getBlockDeleteLabel(block: KnowledgeBaseArticleBlock) {
    switch (block.type) {
        case 'h2':
            return 'заголовок H2';
        case 'h3':
            return 'заголовок H3';
        case 'p':
            return 'текстовый блок';
        case 'quote':
            return 'цитату';
        case 'ul':
            return 'маркированный список';
        case 'ol':
            return 'нумерованный список';
        case 'code':
            return 'блок кода';
        case 'table':
            return 'таблицу';
        case 'image':
            return 'изображение';
        case 'video':
            return 'видеоблок';
        case 'file':
            return 'файл';
        case 'link':
            return 'ссылку';
        default:
            return 'блок';
    }
}

function normalizeRichTextHtml(html: string) {
    return html.replace(/\u00a0/g, ' ').trim();
}

function normalizePastedText(text: string) {
    return text.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
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

function plainTextToInlineHtml(text: string) {
    return escapeHtml(text).replace(
        /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g,
        (match) => {
            const href = match.startsWith('www.') ? `https://${match}` : match;

            return `<a href="${href}" target="_blank" rel="noreferrer">${match}</a>`;
        },
    );
}

function createRichTextBlock(
    type: RichTextBlockType,
    content: string,
    html?: string,
): KnowledgeBaseArticleBlock {
    const cleanContent = content.trim();

    return {
        id: createId(),
        type,
        content: cleanContent,
        html: normalizeRichTextHtml(
            html && html.trim() !== ''
                ? html
                : plainTextToInlineHtml(cleanContent),
        ),
    };
}

function textFromElement(element: Element) {
    const clone = element.cloneNode(true) as Element;

    clone.querySelectorAll('br').forEach((breakNode) => {
        breakNode.replaceWith('\n');
    });

    return normalizePastedText(clone.textContent ?? '')
        .split('\n')
        .map((line) => line.replace(/[ \t]+/g, ' ').trim())
        .filter(Boolean)
        .join('\n')
        .trim();
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

function cleanPastedInlineHtml(html: string) {
    const template = document.createElement('template');
    template.innerHTML = html;

    const container = document.createElement('div');

    template.content.childNodes.forEach((child) => {
        container.appendChild(cleanInlineNode(child));
    });

    return normalizeRichTextHtml(container.innerHTML).replace(
        /(<br\s*\/?>)+$/i,
        '',
    );
}

function valueContainsHtml(value: string) {
    return /<[a-z][\s\S]*>/i.test(value);
}

function inlineValueToStoredString(value: string) {
    const plainText = normalizePastedText(stripHtmlTags(value)).trim();

    if (!valueContainsHtml(value)) {
        return plainText;
    }

    const cleanHtml = cleanPastedInlineHtml(value);

    return valueContainsHtml(cleanHtml) ? cleanHtml : plainText;
}

function stripHtmlTags(value: string) {
    if (typeof document === 'undefined' || !/[<>&]/.test(value)) {
        return value;
    }

    const template = document.createElement('template');
    template.innerHTML = value;

    return template.content.textContent ?? '';
}

function normalizeTableCellHtml(html: string) {
    const normalized = normalizeRichTextHtml(html).replace(
        /^(?:<br\s*\/?>|\s|&nbsp;)+$/i,
        '',
    );

    if (normalized === '<br>' || normalized === '') {
        return '';
    }

    if (!/<[a-z][\s\S]*>/i.test(normalized)) {
        return plainTextToInlineHtml(normalized);
    }

    return normalized;
}

function markdownHeadingFromLine(
    line: string,
): { type: RichTextBlockType; content: string } | null {
    const match = line.trim().match(/^(#{1,6})\s+(.+)$/);

    if (!match) {
        return null;
    }

    return {
        type: match[1].length >= 3 ? 'h3' : 'h2',
        content: match[2].trim(),
    };
}

function standaloneHeadingType(
    lines: string[],
    index: number,
): RichTextBlockType | null {
    const line = lines[index]?.trim() ?? '';

    if (
        !line ||
        line.length > 96 ||
        /[.!?…]$/.test(line) ||
        !/[A-Za-zА-Яа-яЁё]/.test(line)
    ) {
        return null;
    }

    const previousIsBlank =
        index === 0 || (lines[index - 1]?.trim() ?? '') === '';
    const nextIsBlank =
        index === lines.length - 1 || (lines[index + 1]?.trim() ?? '') === '';

    if (!previousIsBlank || !nextIsBlank) {
        return null;
    }

    return line.length <= 56 ? 'h2' : 'h3';
}

function createBlocksFromPastedText(text: string): KnowledgeBaseArticleBlock[] {
    const normalized = normalizePastedText(text);
    const lines = normalized.split('\n');
    const meaningfulLineCount = lines.filter(
        (line) => line.trim() !== '',
    ).length;

    if (meaningfulLineCount <= 1) {
        const heading = markdownHeadingFromLine(normalized);

        return heading
            ? [createRichTextBlock(heading.type, heading.content)]
            : [];
    }

    const blocks: KnowledgeBaseArticleBlock[] = [];
    let index = 0;

    while (index < lines.length) {
        const line = lines[index] ?? '';
        const trimmed = line.trim();

        if (!trimmed) {
            index += 1;
            continue;
        }

        const markdownHeading = markdownHeadingFromLine(trimmed);

        if (markdownHeading) {
            blocks.push(
                createRichTextBlock(
                    markdownHeading.type,
                    markdownHeading.content,
                ),
            );
            index += 1;
            continue;
        }

        const bulletMatch = trimmed.match(/^(?:[-*•–—])\s+(.+)$/);
        const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);

        if (bulletMatch || orderedMatch) {
            const listType = bulletMatch ? 'ul' : 'ol';
            const items: string[] = [];

            while (index < lines.length) {
                const currentLine = (lines[index] ?? '').trim();
                const currentMatch =
                    listType === 'ul'
                        ? currentLine.match(/^(?:[-*•–—])\s+(.+)$/)
                        : currentLine.match(/^\d+[.)]\s+(.+)$/);

                if (!currentMatch) {
                    break;
                }

                items.push(currentMatch[1].trim());
                index += 1;
            }

            blocks.push({ id: createId(), type: listType, items });
            continue;
        }

        const headingType = standaloneHeadingType(lines, index);

        if (headingType) {
            blocks.push(createRichTextBlock(headingType, trimmed));
            index += 1;
            continue;
        }

        blocks.push(createRichTextBlock('p', trimmed));
        index += 1;
    }

    return blocks;
}

function createBlocksFromPastedHtml(html: string): KnowledgeBaseArticleBlock[] {
    if (!html.trim() || typeof DOMParser === 'undefined') {
        return [];
    }

    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const blocks: KnowledgeBaseArticleBlock[] = [];

    const pushRichElement = (element: Element, type: RichTextBlockType) => {
        const text = textFromElement(element);

        if (!text) {
            return;
        }

        if (text.includes('\n')) {
            blocks.push(...createBlocksFromPastedText(text));
            return;
        }

        blocks.push(
            createRichTextBlock(
                type,
                text,
                cleanPastedInlineHtml(element.innerHTML),
            ),
        );
    };

    const visit = (node: ChildNode) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = normalizePastedText(node.textContent ?? '').trim();

            if (text) {
                blocks.push(...createBlocksFromPastedText(text));
            }

            return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

        const element = node as Element;
        const tagName = element.tagName.toLowerCase();

        if (['script', 'style', 'meta', 'link'].includes(tagName)) {
            return;
        }

        if (tagName === 'ul' || tagName === 'ol') {
            const items = Array.from(element.children)
                .filter((child) => child.tagName.toLowerCase() === 'li')
                .map((item) => {
                    const cleanHtml = cleanPastedInlineHtml(item.innerHTML);
                    return valueContainsHtml(cleanHtml)
                        ? cleanHtml
                        : textFromElement(item);
                })
                .filter(Boolean);

            if (items.length > 0) {
                blocks.push({
                    id: createId(),
                    type: tagName as 'ul' | 'ol',
                    items,
                });
            }

            return;
        }

        if (/^h[1-6]$/.test(tagName)) {
            pushRichElement(
                element,
                tagName === 'h1' || tagName === 'h2' ? 'h2' : 'h3',
            );
            return;
        }

        if (tagName === 'blockquote') {
            pushRichElement(element, 'quote');
            return;
        }

        if (tagName === 'pre') {
            const code = textFromElement(element);

            if (code) {
                blocks.push({
                    id: createId(),
                    type: 'code',
                    language: '',
                    code,
                });
            }

            return;
        }

        if (tagName === 'table') {
            const rows = Array.from(element.querySelectorAll('tr'))
                .map((row) =>
                    Array.from(row.querySelectorAll('th,td'))
                        .map((cell) => textFromElement(cell))
                        .filter((cell) => cell !== ''),
                )
                .filter((row) => row.length > 0);

            if (rows.length > 0) {
                blocks.push({ id: createId(), type: 'table', rows });
            }

            return;
        }

        if (tagName === 'p') {
            pushRichElement(element, 'p');
            return;
        }

        const childElements = Array.from(element.childNodes);

        if (childElements.length > 0) {
            childElements.forEach(visit);
            return;
        }

        const text = textFromElement(element);

        if (text) {
            blocks.push(...createBlocksFromPastedText(text));
        }
    };

    Array.from(parsed.body.childNodes).forEach(visit);

    return blocks;
}

function pastedBlocksAreStructured(blocks: KnowledgeBaseArticleBlock[]) {
    return blocks.length > 1 || blocks.some((block) => block.type !== 'p');
}

function pastedBlocksHaveSemanticTypes(blocks: KnowledgeBaseArticleBlock[]) {
    return blocks.some((block) => block.type !== 'p');
}

function createBlocksFromClipboardPaste(payload: {
    text: string;
    html: string;
}) {
    const htmlBlocks = createBlocksFromPastedHtml(payload.html);
    const textBlocks = createBlocksFromPastedText(payload.text);

    if (pastedBlocksAreStructured(htmlBlocks)) {
        if (
            !pastedBlocksHaveSemanticTypes(htmlBlocks) &&
            pastedBlocksHaveSemanticTypes(textBlocks)
        ) {
            return textBlocks;
        }

        return htmlBlocks;
    }

    return pastedBlocksAreStructured(textBlocks) ? textBlocks : [];
}

function isArticleBlockEmpty(block: KnowledgeBaseArticleBlock) {
    if ('content' in block) {
        return block.content.trim() === '' && (block.html ?? '').trim() === '';
    }

    if ('items' in block) {
        return block.items.every((item) => item.trim() === '');
    }

    if (block.type === 'code') {
        return block.code.trim() === '' && block.language.trim() === '';
    }

    if (block.type === 'table') {
        return block.rows.every((row) =>
            row.every((cell) => cell.trim() === ''),
        );
    }

    if (block.type === 'link') {
        return block.url.trim() === '' && block.title.trim() === '';
    }

    if (block.type === 'file') {
        return block.url.trim() === '' && block.name.trim() === '';
    }

    return block.url.trim() === '';
}

function placeCaretAtEnd(element: HTMLElement) {
    const selection = window.getSelection();

    if (!selection) {
        return;
    }

    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
}

function focusEditableElement(element: HTMLElement) {
    element.focus();

    if (element.isContentEditable) {
        placeCaretAtEnd(element);
    }
}

function normalizeLinkHref(url: string) {
    const trimmed = url.trim();

    if (trimmed === '') {
        return '';
    }

    if (
        /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ||
        trimmed.startsWith('/') ||
        trimmed.startsWith('#')
    ) {
        return trimmed;
    }

    return trimmed.startsWith('www.')
        ? `https://${trimmed}`
        : `https://${trimmed}`;
}

function queryCommandState(command: string) {
    try {
        return document.queryCommandState(command);
    } catch {
        return false;
    }
}

function closestAnchorFromNode(node: Node | null) {
    const element =
        node?.nodeType === Node.TEXT_NODE
            ? node.parentElement
            : (node as Element | null);

    const anchor = element?.closest('a');

    return anchor instanceof HTMLAnchorElement ? anchor : null;
}

function unwrapAnchorElement(anchor: HTMLAnchorElement) {
    const parent = anchor.parentNode;

    if (!parent) {
        return;
    }

    while (anchor.firstChild) {
        parent.insertBefore(anchor.firstChild, anchor);
    }

    parent.removeChild(anchor);
}

function collectIntersectingAnchors(root: ParentNode, range: Range) {
    return Array.from(root.querySelectorAll('a')).filter((anchor) => {
        if (range.intersectsNode(anchor)) {
            return true;
        }

        return (
            anchor.contains(range.startContainer) ||
            anchor.contains(range.endContainer)
        );
    });
}

function stripAnchorsFromFragment(fragment: DocumentFragment) {
    const container = document.createElement('div');
    container.appendChild(fragment);

    Array.from(container.querySelectorAll('a')).forEach((anchor) => {
        unwrapAnchorElement(anchor);
    });

    const cleanFragment = document.createDocumentFragment();

    while (container.firstChild) {
        cleanFragment.appendChild(container.firstChild);
    }

    return cleanFragment;
}

function resolveToolbarFormats(
    root: HTMLElement,
    range: Range,
): ToolbarFormats {
    const intersectingAnchors = collectIntersectingAnchors(root, range);
    const hasLink =
        intersectingAnchors.length > 0 ||
        closestAnchorFromNode(range.startContainer) !== null ||
        closestAnchorFromNode(range.endContainer) !== null;

    return {
        bold: queryCommandState('bold'),
        italic: queryCommandState('italic'),
        underline: queryCommandState('underline'),
        strike: queryCommandState('strikeThrough'),
        link: hasLink,
    };
}

function handleEditableAnchorNavigation(
    event: ReactMouseEvent<HTMLElement>,
    isEditable: boolean,
) {
    if (!isEditable || (!event.ctrlKey && !event.metaKey)) {
        return;
    }

    const target = event.target as HTMLElement | null;
    const anchor = target?.closest('a');

    if (!(anchor instanceof HTMLAnchorElement) || !anchor.href) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    window.open(anchor.href, '_blank', 'noopener,noreferrer');
}

function isTextInputTarget(target: EventTarget | null) {
    return (
        target instanceof HTMLElement &&
        Boolean(
            target.closest('input, textarea, select, [contenteditable="true"]'),
        )
    );
}

function stopTextInputPointerPropagation(event: {
    target: EventTarget | null;
    stopPropagation: () => void;
}) {
    if (isTextInputTarget(event.target)) {
        event.stopPropagation();
    }
}

function cloneBlocks(
    blocks: KnowledgeBaseArticleBlock[],
): KnowledgeBaseArticleBlock[] {
    return JSON.parse(JSON.stringify(blocks)) as KnowledgeBaseArticleBlock[];
}

function areBlocksEqual(
    currentBlocks: KnowledgeBaseArticleBlock[],
    nextBlocks: KnowledgeBaseArticleBlock[],
) {
    return JSON.stringify(currentBlocks) === JSON.stringify(nextBlocks);
}

function EditableRichTextBlock({
    as,
    className,
    blockId,
    value,
    html,
    placeholder,
    onChange,
    onEmptyBlur,
    onCreateNextBlock,
    onStructuredPaste,
    isEditable = true,
}: {
    as: keyof JSX.IntrinsicElements;
    className: string;
    blockId: string;
    value: string;
    html?: string;
    placeholder: string;
    onChange: (payload: { content: string; html: string }) => void;
    onEmptyBlur?: () => void;
    onCreateNextBlock: () => void;
    onStructuredPaste?: (
        payload: StructuredPastePayload,
        event: ReactClipboardEvent<HTMLElement>,
    ) => boolean;
    isEditable?: boolean;
}) {
    const ref = useRef<HTMLElement | null>(null);
    const isComposingRef = useRef(false);

    useEffect(() => {
        if (!ref.current) {
            return;
        }

        const nextHtml = html && html.trim() !== '' ? html : value;
        const currentHtml = normalizeRichTextHtml(ref.current.innerHTML);
        const normalizedNextHtml = normalizeRichTextHtml(nextHtml);
        const isFocused = document.activeElement === ref.current;

        if (
            isComposingRef.current ||
            (isFocused && currentHtml === normalizedNextHtml)
        ) {
            return;
        }

        if (ref.current.innerHTML !== nextHtml) {
            ref.current.innerHTML = nextHtml;
        }
    }, [html, value]);

    const syncContent = () => {
        if (!ref.current) {
            return;
        }

        onChange({
            content: ref.current.textContent ?? '',
            html: normalizeRichTextHtml(ref.current.innerHTML),
        });
    };

    return createElement(as, {
        ref,
        contentEditable: isEditable,
        suppressContentEditableWarning: true,
        className,
        'data-ph': placeholder,
        'data-rich-block-id': blockId,
        'data-block-focus': blockId,
        onInput: isEditable ? syncContent : undefined,
        onBlur: isEditable
            ? () => {
                  syncContent();

                  if ((ref.current?.textContent ?? '').trim() === '') {
                      onEmptyBlur?.();
                  }
              }
            : undefined,
        onPaste:
            isEditable && onStructuredPaste
                ? (event: ReactClipboardEvent<HTMLElement>) => {
                      const payload = {
                          text: event.clipboardData.getData('text/plain'),
                          html: event.clipboardData.getData('text/html'),
                      };

                      if (onStructuredPaste(payload, event)) {
                          event.preventDefault();
                      }
                  }
                : undefined,
        onCompositionStart: isEditable
            ? () => {
                  isComposingRef.current = true;
              }
            : undefined,
        onCompositionEnd: isEditable
            ? () => {
                  isComposingRef.current = false;
                  syncContent();
              }
            : undefined,
        onMouseDown: (event: ReactMouseEvent<HTMLElement>) =>
            handleEditableAnchorNavigation(event, isEditable),
        onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
            if (!isEditable) {
                return;
            }

            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                syncContent();
                onCreateNextBlock();
            }
        },
    });
}

function EditableListBlock({
    type,
    blockId,
    items,
    onChange,
    onStructuredPaste,
    isEditable = true,
}: {
    type: 'ul' | 'ol';
    blockId: string;
    items: string[];
    onChange: (items: string[]) => void;
    onStructuredPaste?: (
        payload: StructuredPastePayload,
        event: ReactClipboardEvent<HTMLOListElement | HTMLUListElement>,
    ) => boolean;
    isEditable?: boolean;
}) {
    const ref = useRef<HTMLOListElement | HTMLUListElement | null>(null);

    useEffect(() => {
        if (!ref.current) {
            return;
        }

        const currentItems = Array.from(ref.current.querySelectorAll('li')).map(
            (item) => inlineValueToStoredString(item.innerHTML),
        );
        const nextItems = items.length > 0 ? items : [''];

        if (JSON.stringify(currentItems) !== JSON.stringify(nextItems)) {
            ref.current.innerHTML = '';

            nextItems.forEach((item) => {
                const listItem = document.createElement('li');
                if (valueContainsHtml(item)) {
                    listItem.innerHTML = cleanPastedInlineHtml(item);
                } else {
                    listItem.textContent = item;
                }
                ref.current?.appendChild(listItem);
            });
        }
    }, [items]);

    const syncItems = () => {
        if (!ref.current) {
            return;
        }

        const nextItems = Array.from(ref.current.querySelectorAll('li')).map(
            (item) => inlineValueToStoredString(item.innerHTML),
        );
        onChange(nextItems.length > 0 ? nextItems : ['']);
    };

    return createElement(type, {
        ref,
        contentEditable: isEditable,
        suppressContentEditableWarning: true,
        className: `kb-editor__list kb-editor__list--${type} block-${type}`,
        'data-ph': 'Введите элемент',
        'data-block-focus': blockId,
        onInput: isEditable ? syncItems : undefined,
        onBlur: isEditable ? syncItems : undefined,
        onMouseDown: (
            event: ReactMouseEvent<HTMLOListElement | HTMLUListElement>,
        ) => handleEditableAnchorNavigation(event, isEditable),
        onPaste:
            isEditable && onStructuredPaste
                ? (
                      event: ReactClipboardEvent<
                          HTMLOListElement | HTMLUListElement
                      >,
                  ) => {
                      const payload = {
                          text: event.clipboardData.getData('text/plain'),
                          html: event.clipboardData.getData('text/html'),
                      };

                      if (onStructuredPaste(payload, event)) {
                          event.preventDefault();
                      }
                  }
                : undefined,
        onKeyDown: (
            event: ReactKeyboardEvent<HTMLOListElement | HTMLUListElement>,
        ) => {
            if (!isEditable) {
                return;
            }

            if (event.key !== 'Enter') {
                return;
            }

            event.preventDefault();

            const selection = window.getSelection();
            const currentNode =
                selection?.anchorNode?.nodeType === Node.TEXT_NODE
                    ? selection.anchorNode.parentElement
                    : (selection?.anchorNode as Element | null);

            const currentItem = currentNode?.closest('li');

            if (!currentItem || !ref.current) {
                return;
            }

            const listItem = document.createElement('li');
            currentItem.insertAdjacentElement('afterend', listItem);
            syncItems();
            focusEditableElement(listItem);
        },
    });
}

function EditableTableCell({
    blockId,
    rowIndex,
    cellIndex,
    value,
    onChange,
    onTabNext,
    isEditable = true,
}: {
    blockId: string;
    rowIndex: number;
    cellIndex: number;
    value: string;
    onChange: (value: string) => void;
    onTabNext: () => void;
    isEditable?: boolean;
}) {
    const ref = useRef<HTMLDivElement | null>(null);
    const isComposingRef = useRef(false);

    useEffect(() => {
        if (!ref.current) {
            return;
        }

        const currentValue = normalizeTableCellHtml(
            ref.current.innerHTML ?? '',
        );
        const normalizedNextValue = normalizeTableCellHtml(value);
        const isFocused = document.activeElement === ref.current;

        if (
            isComposingRef.current ||
            (isFocused && currentValue === normalizedNextValue)
        ) {
            return;
        }

        if ((ref.current.innerHTML ?? '') !== value) {
            ref.current.innerHTML = value;
        }
    }, [value]);

    return (
        <div
            ref={ref}
            contentEditable={isEditable}
            suppressContentEditableWarning
            className="kb-editor__table-cell"
            data-table-cell={`${blockId}:${rowIndex}:${cellIndex}`}
            data-block-focus={
                rowIndex === 0 && cellIndex === 0 ? blockId : undefined
            }
            onInput={
                isEditable
                    ? (event) =>
                          onChange(
                              normalizeTableCellHtml(
                                  event.currentTarget.innerHTML,
                              ),
                          )
                    : undefined
            }
            onBlur={
                isEditable
                    ? (event) =>
                          onChange(
                              normalizeTableCellHtml(
                                  event.currentTarget.innerHTML,
                              ),
                          )
                    : undefined
            }
            onCompositionStart={
                isEditable
                    ? () => {
                          isComposingRef.current = true;
                      }
                    : undefined
            }
            onCompositionEnd={
                isEditable
                    ? (event) => {
                          isComposingRef.current = false;
                          onChange(
                              normalizeTableCellHtml(
                                  event.currentTarget.innerHTML,
                              ),
                          );
                      }
                    : undefined
            }
            onMouseDown={(event) =>
                handleEditableAnchorNavigation(event, isEditable)
            }
            onKeyDown={(event) => {
                if (!isEditable) {
                    return;
                }

                if (event.key !== 'Tab') {
                    return;
                }

                event.preventDefault();
                onTabNext();
            }}
        />
    );
}

function TableBlockEditor({
    block,
    isComplexEditing,
    onChangeCell,
    onFocusCell,
    onResizeColumn,
    onResizeRow,
    onPatchTable,
    onDeleteBlock,
}: {
    block: Extract<KnowledgeBaseArticleBlock, { type: 'table' }>;
    isComplexEditing: boolean;
    onChangeCell: (rowIndex: number, cellIndex: number, value: string) => void;
    onFocusCell: (rowIndex: number, cellIndex: number) => void;
    onResizeColumn: (columnIndex: number, nextWidth: number) => void;
    onResizeRow: (rowIndex: number, nextHeight: number) => void;
    onPatchTable: (
        rows: string[][],
        widths?: number[],
        heights?: number[],
    ) => void;
    onDeleteBlock: () => void;
}) {
    const tableColumnWidths = normalizeTableColumnWidths(
        block.column_widths,
        block.rows,
    );
    const tableRowHeights = normalizeTableRowHeights(
        block.row_heights,
        block.rows,
    );
    const tableWidth = tableColumnWidths.reduce(
        (total, width) => total + width,
        0,
    );

    return (
        <div className="kb-editor__table-shell">
            <div className="kb-editor__table-wrap">
                <table
                    className="kb-editor__table"
                    style={{ width: `${tableWidth}px` }}
                >
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
                                        style={{
                                            height: `${tableRowHeights[rowIndex] ?? DEFAULT_TABLE_ROW_HEIGHT}px`,
                                            width: `${tableColumnWidths[cellIndex] ?? DEFAULT_TABLE_COLUMN_WIDTH}px`,
                                        }}
                                    >
                                        <EditableTableCell
                                            blockId={block.id}
                                            rowIndex={rowIndex}
                                            cellIndex={cellIndex}
                                            value={cell}
                                            isEditable={isComplexEditing}
                                            onChange={(value) =>
                                                onChangeCell(
                                                    rowIndex,
                                                    cellIndex,
                                                    value,
                                                )
                                            }
                                            onTabNext={() => {
                                                if (
                                                    cellIndex + 1 <
                                                    row.length
                                                ) {
                                                    onFocusCell(
                                                        rowIndex,
                                                        cellIndex + 1,
                                                    );
                                                    return;
                                                }

                                                if (
                                                    rowIndex + 1 <
                                                    block.rows.length
                                                ) {
                                                    onFocusCell(
                                                        rowIndex + 1,
                                                        0,
                                                    );
                                                }
                                            }}
                                        />

                                        {isComplexEditing &&
                                        cellIndex < row.length - 1 ? (
                                            <button
                                                type="button"
                                                className="kb-editor__table-resize-handle"
                                                aria-label={`Изменить ширину столбца ${cellIndex + 1}`}
                                                onPointerDown={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();

                                                    const startX =
                                                        event.clientX;
                                                    const startWidth =
                                                        tableColumnWidths[
                                                            cellIndex
                                                        ] ??
                                                        DEFAULT_TABLE_COLUMN_WIDTH;

                                                    const handlePointerMove = (
                                                        moveEvent: PointerEvent,
                                                    ) => {
                                                        onResizeColumn(
                                                            cellIndex,
                                                            startWidth +
                                                                (moveEvent.clientX -
                                                                    startX),
                                                        );
                                                    };

                                                    const handlePointerUp =
                                                        () => {
                                                            window.removeEventListener(
                                                                'pointermove',
                                                                handlePointerMove,
                                                            );
                                                            window.removeEventListener(
                                                                'pointerup',
                                                                handlePointerUp,
                                                            );
                                                        };

                                                    window.addEventListener(
                                                        'pointermove',
                                                        handlePointerMove,
                                                    );
                                                    window.addEventListener(
                                                        'pointerup',
                                                        handlePointerUp,
                                                    );
                                                }}
                                            >
                                                <span />
                                            </button>
                                        ) : null}

                                        {isComplexEditing &&
                                        cellIndex === 0 &&
                                        rowIndex < block.rows.length - 1 ? (
                                            <button
                                                type="button"
                                                className="kb-editor__table-resize-handle kb-editor__table-resize-handle--row"
                                                aria-label={`Изменить высоту строки ${rowIndex + 1}`}
                                                onPointerDown={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();

                                                    const startY =
                                                        event.clientY;
                                                    const startHeight =
                                                        tableRowHeights[
                                                            rowIndex
                                                        ] ??
                                                        DEFAULT_TABLE_ROW_HEIGHT;

                                                    const handlePointerMove = (
                                                        moveEvent: PointerEvent,
                                                    ) => {
                                                        onResizeRow(
                                                            rowIndex,
                                                            startHeight +
                                                                (moveEvent.clientY -
                                                                    startY),
                                                        );
                                                    };

                                                    const handlePointerUp =
                                                        () => {
                                                            window.removeEventListener(
                                                                'pointermove',
                                                                handlePointerMove,
                                                            );
                                                            window.removeEventListener(
                                                                'pointerup',
                                                                handlePointerUp,
                                                            );
                                                        };

                                                    window.addEventListener(
                                                        'pointermove',
                                                        handlePointerMove,
                                                    );
                                                    window.addEventListener(
                                                        'pointerup',
                                                        handlePointerUp,
                                                    );
                                                }}
                                            >
                                                <span />
                                            </button>
                                        ) : null}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isComplexEditing ? (
                <div className="kb-editor__table-actions">
                    <button
                        type="button"
                        className="kb-editor__table-btn"
                        onClick={() => {
                            const nextRows = [
                                ...block.rows,
                                new Array(block.rows[0]?.length || 3).fill(''),
                            ];
                            onPatchTable(nextRows, tableColumnWidths, [
                                ...tableRowHeights,
                                DEFAULT_TABLE_ROW_HEIGHT,
                            ]);
                            onFocusCell(block.rows.length, 0);
                        }}
                    >
                        + Строка
                    </button>
                    <button
                        type="button"
                        className="kb-editor__table-btn"
                        onClick={() => {
                            const nextRows = block.rows.map((row) => [
                                ...row,
                                '',
                            ]);
                            onPatchTable(
                                nextRows,
                                [
                                    ...tableColumnWidths,
                                    DEFAULT_TABLE_COLUMN_WIDTH,
                                ],
                                tableRowHeights,
                            );
                            onFocusCell(0, block.rows[0]?.length ?? 0);
                        }}
                    >
                        + Столбец
                    </button>
                    <button
                        type="button"
                        className="kb-editor__table-btn kb-editor__table-btn--danger"
                        onClick={() => {
                            if (block.rows.length <= 1) {
                                return;
                            }

                            onPatchTable(
                                block.rows.slice(0, -1),
                                tableColumnWidths,
                                tableRowHeights.slice(0, -1),
                            );
                        }}
                    >
                        - Строку
                    </button>
                    <button
                        type="button"
                        className="kb-editor__table-btn kb-editor__table-btn--danger"
                        onClick={() => {
                            if ((block.rows[0]?.length ?? 0) <= 1) {
                                return;
                            }

                            onPatchTable(
                                block.rows.map((row) => row.slice(0, -1)),
                                tableColumnWidths.slice(0, -1),
                                tableRowHeights,
                            );
                        }}
                    >
                        - Столбец
                    </button>
                    <button
                        type="button"
                        className="kb-editor__table-btn kb-editor__table-btn--danger"
                        onClick={onDeleteBlock}
                    >
                        <Trash2 className="size-4" />
                        Удалить блок
                    </button>
                </div>
            ) : null}
        </div>
    );
}

function BlockTypeMenu({
    onSelect,
    className = '',
    style,
}: {
    onSelect: (type: KnowledgeBaseArticleBlock['type']) => void;
    className?: string;
    style?: CSSProperties;
}) {
    return createPortal(
        <div
            className={`kb-editor__type-menu ${className}`.trim()}
            style={style}
            data-editor-menu-panel
        >
            {BLOCK_TYPE_OPTIONS.map((option) => (
                <button
                    key={option.type}
                    type="button"
                    onClick={() => onSelect(option.type)}
                    className="kb-editor__type-option"
                >
                    <span
                        className="kb-editor__type-option-icon"
                        aria-hidden="true"
                    >
                        {blockTypeSymbol(option.type)}
                    </span>
                    <span className="kb-editor__type-option-title">
                        {option.label}
                    </span>
                    <span className="kb-editor__type-option-hint">
                        {option.hint}
                    </span>
                </button>
            ))}
        </div>,
        document.body,
    );
}

function BlockActionMenu({
    block,
    canMoveUp,
    canMoveDown,
    onConvert,
    onMoveUp,
    onMoveDown,
    onDelete,
    style,
}: {
    block: KnowledgeBaseArticleBlock;
    canMoveUp: boolean;
    canMoveDown: boolean;
    onConvert: (type: KnowledgeBaseArticleBlock['type']) => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDelete: () => void;
    style?: CSSProperties;
}) {
    const [isConvertOpen, setIsConvertOpen] = useState(false);
    const convertTypes = ['p', 'h2', 'h3', 'quote', 'ul', 'ol'] as Array<
        KnowledgeBaseArticleBlock['type']
    >;

    return createPortal(
        <div
            className="kb-editor__action-menu"
            style={style}
            data-editor-menu-panel
        >
            <div
                className={`kb-editor__action-submenu-wrap ${isConvertOpen ? 'is-open' : ''}`}
                onMouseEnter={() => setIsConvertOpen(true)}
                onMouseLeave={() => setIsConvertOpen(false)}
            >
                <button
                    type="button"
                    className="kb-editor__action-item kb-editor__action-item--submenu"
                    onClick={() => setIsConvertOpen((current) => !current)}
                >
                    <span className="kb-editor__action-icon" aria-hidden="true">
                        ⇄
                    </span>
                    <span className="kb-editor__action-label">
                        Конвертировать в
                    </span>
                    <span
                        className="kb-editor__action-chevron"
                        aria-hidden="true"
                    >
                        ›
                    </span>
                </button>

                {isConvertOpen ? (
                    <div className="kb-editor__action-submenu">
                        {BLOCK_TYPE_OPTIONS.filter(
                            (option) =>
                                option.type !== block.type &&
                                convertTypes.includes(option.type),
                        ).map((option) => (
                            <button
                                key={option.type}
                                type="button"
                                onClick={() => onConvert(option.type)}
                                className="kb-editor__action-item"
                            >
                                <span
                                    className="kb-editor__action-icon"
                                    aria-hidden="true"
                                >
                                    {blockTypeSymbol(option.type)}
                                </span>
                                <span className="kb-editor__action-label">
                                    {option.label}
                                </span>
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>

            <div className="kb-editor__action-divider" />

            <button
                type="button"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className="kb-editor__action-item"
            >
                <span className="kb-editor__action-icon" aria-hidden="true">
                    ↑
                </span>
                Переместить вверх
            </button>
            <button
                type="button"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                className="kb-editor__action-item"
            >
                <span className="kb-editor__action-icon" aria-hidden="true">
                    ↓
                </span>
                Переместить вниз
            </button>

            <div className="kb-editor__action-divider" />

            <button
                type="button"
                onClick={onDelete}
                className="kb-editor__action-item is-danger"
            >
                <span className="kb-editor__action-icon" aria-hidden="true">
                    ✕
                </span>
                Удалить блок
            </button>
        </div>,
        document.body,
    );
}

function InlineToolbar({
    state,
    onRunCommand,
    onApplyLink,
}: {
    state: ToolbarState;
    onRunCommand: (command: string) => void;
    onApplyLink: (url: string | null) => void;
}) {
    const [linkValue, setLinkValue] = useState(state.linkUrl);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const linkInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        setLinkValue(state.linkUrl);
    }, [state.linkUrl]);

    useEffect(() => {
        if (!showLinkInput) {
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            linkInputRef.current?.focus();
            linkInputRef.current?.select();
        });

        return () => window.cancelAnimationFrame(frame);
    }, [showLinkInput]);

    return (
        <div
            className={`inline-toolbar ${showLinkInput ? 'is-link-editing' : ''}`}
            style={{
                top: `${state.top}px`,
                left: `${state.left}px`,
                transform: 'translate(-50%, -100%)',
            }}
            onMouseDown={(event) => {
                const target = event.target as HTMLElement | null;

                if (!target?.closest('.itb-link-input')) {
                    event.preventDefault();
                }
            }}
        >
            <div className="itb-actions">
                <button
                    type="button"
                    className={`itb-btn ${state.formats.bold ? 'is-format-active' : ''}`}
                    onMouseDown={() => onRunCommand('bold')}
                    aria-pressed={state.formats.bold}
                >
                    <b>B</b>
                </button>
                <button
                    type="button"
                    className={`itb-btn ${state.formats.italic ? 'is-format-active' : ''}`}
                    onMouseDown={() => onRunCommand('italic')}
                    aria-pressed={state.formats.italic}
                >
                    <i>I</i>
                </button>
                <button
                    type="button"
                    className={`itb-btn ${state.formats.underline ? 'is-format-active' : ''}`}
                    onMouseDown={() => onRunCommand('underline')}
                    aria-pressed={state.formats.underline}
                >
                    <u>U</u>
                </button>
                <button
                    type="button"
                    className={`itb-btn ${state.formats.strike ? 'is-format-active' : ''}`}
                    onMouseDown={() => onRunCommand('strikeThrough')}
                    aria-pressed={state.formats.strike}
                >
                    <s>S</s>
                </button>
                <div className="itb-sep" />
                <button
                    type="button"
                    className={`itb-btn ${showLinkInput || state.formats.link ? 'active is-format-active' : ''}`}
                    onMouseDown={() => setShowLinkInput((current) => !current)}
                    aria-pressed={showLinkInput || state.formats.link}
                    aria-label="\u0412\u0441\u0442\u0430\u0432\u0438\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443"
                    title="\u0412\u0441\u0442\u0430\u0432\u0438\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443"
                >
                    <Link2 className="size-3.5" />
                </button>
            </div>

            {showLinkInput ? (
                <div className="itb-link-row">
                    <input
                        ref={linkInputRef}
                        value={linkValue}
                        onChange={(event) => setLinkValue(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                onApplyLink(
                                    linkValue.trim() === ''
                                        ? null
                                        : linkValue.trim(),
                                );
                                setShowLinkInput(false);
                            }

                            if (event.key === 'Escape') {
                                event.preventDefault();
                                setShowLinkInput(false);
                            }
                        }}
                        className="itb-link-input"
                        placeholder="https://..."
                    />
                    <button
                        type="button"
                        className="itb-btn"
                        onMouseDown={(event) => {
                            event.preventDefault();
                            onApplyLink(
                                linkValue.trim() === ''
                                    ? null
                                    : linkValue.trim(),
                            );
                            setShowLinkInput(false);
                        }}
                        aria-label="\u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443"
                        title="\u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443"
                    >
                        <Check className="size-3.5" />
                    </button>
                    <button
                        type="button"
                        className="itb-btn"
                        onMouseDown={(event) => {
                            event.preventDefault();
                            onApplyLink(null);
                            setShowLinkInput(false);
                        }}
                        aria-label="\u0423\u0431\u0440\u0430\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443"
                        title="\u0423\u0431\u0440\u0430\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443"
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
            ) : null}
        </div>
    );
}

export function KnowledgeBaseArticleEditor({
    blocks,
    onChange,
    onUploadAsset,
    headingAnchors = {},
    isEditing = false,
}: KnowledgeBaseArticleEditorProps & {
    headingAnchors?: Record<string, string>;
}) {
    const [menuState, setMenuState] = useState<EditorMenuState | null>(null);
    const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(
        null,
    );
    const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);
    const [toolbarState, setToolbarState] = useState<ToolbarState | null>(null);
    const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
    const [dropIndicator, setDropIndicator] =
        useState<DropIndicatorState | null>(null);
    const [deleteTarget, setDeleteTarget] =
        useState<KnowledgeBaseArticleBlock | null>(null);
    const [completedAssetBlockIds, setCompletedAssetBlockIds] = useState<
        Set<string>
    >(() => new Set());
    const [editingComplexBlockIds, setEditingComplexBlockIds] = useState<
        Set<string>
    >(() => new Set());
    const savedRangeRef = useRef<Range | null>(null);
    const pendingFocusRef = useRef<FocusRequest | null>(null);
    const safeBlocksRef = useRef<KnowledgeBaseArticleBlock[]>(blocks);
    const undoStackRef = useRef<KnowledgeBaseArticleBlock[][]>([]);
    const dragPointerRef = useRef<{
        blockId: string;
        startX: number;
        startY: number;
        isDragging: boolean;
        targetId: string | null;
        position: 'before' | 'after';
    } | null>(null);
    const suppressNextActionClickRef = useRef(false);

    const safeBlocks = useMemo(
        () => (blocks.length === 0 ? [createBlock('p')] : blocks),
        [blocks],
    );

    const getToolbarTargetNode = (state: ToolbarState) => {
        if (state.kind === 'table-cell') {
            return document.querySelector(
                `[data-table-cell="${state.blockId}:${state.rowIndex}:${state.cellIndex}"]`,
            ) as HTMLElement | null;
        }

        return document.querySelector(
            `[data-rich-block-id="${state.blockId}"]`,
        ) as HTMLElement | null;
    };

    const pushUndoSnapshot = (previousBlocks: KnowledgeBaseArticleBlock[]) => {
        const snapshot = cloneBlocks(previousBlocks);
        const lastSnapshot =
            undoStackRef.current[undoStackRef.current.length - 1];

        if (lastSnapshot && areBlocksEqual(lastSnapshot, snapshot)) {
            return;
        }

        undoStackRef.current = [...undoStackRef.current, snapshot].slice(
            -MAX_EDITOR_UNDO_STEPS,
        );
    };

    const updateBlocks = (
        nextBlocks: KnowledgeBaseArticleBlock[],
        options: { skipHistory?: boolean } = {},
    ) => {
        const currentBlocks =
            safeBlocksRef.current.length === 0
                ? safeBlocks
                : safeBlocksRef.current;

        if (areBlocksEqual(currentBlocks, nextBlocks)) {
            return;
        }

        if (!options.skipHistory) {
            pushUndoSnapshot(currentBlocks);
        }

        const nextSnapshot = cloneBlocks(nextBlocks);
        safeBlocksRef.current = nextSnapshot;
        onChange(nextSnapshot);
    };

    const markAssetBlockComplete = (blockId: string) => {
        setCompletedAssetBlockIds((current) => new Set(current).add(blockId));
    };

    const markAssetBlockEditable = (blockId: string) => {
        if (!isEditing) {
            return;
        }

        setCompletedAssetBlockIds((current) => {
            const next = new Set(current);
            next.delete(blockId);
            return next;
        });
    };

    const startComplexBlockEditing = (blockId: string) => {
        if (!isEditing) {
            return;
        }

        setEditingComplexBlockIds((current) => new Set(current).add(blockId));
    };

    const activateComplexBlockEditing = (
        block: KnowledgeBaseArticleBlock,
        options?: {
            focusTableCell?: boolean;
        },
    ) => {
        if (!isEditing) {
            return;
        }

        if (
            block.type === 'image' ||
            block.type === 'file' ||
            block.type === 'video'
        ) {
            markAssetBlockEditable(block.id);
        }

        startComplexBlockEditing(block.id);

        pendingFocusRef.current =
            block.type === 'table' && options?.focusTableCell !== false
                ? {
                      kind: 'table-cell',
                      blockId: block.id,
                      rowIndex: 0,
                      cellIndex: 0,
                  }
                : {
                      kind: 'block',
                      blockId: block.id,
                  };
    };

    const finishComplexBlockEditing = (blockId: string) => {
        setEditingComplexBlockIds((current) => {
            const next = new Set(current);
            next.delete(blockId);
            return next;
        });
        markAssetBlockComplete(blockId);
    };

    const isTextBlock = (block: KnowledgeBaseArticleBlock) =>
        block.type === 'p' ||
        block.type === 'h2' ||
        block.type === 'h3' ||
        block.type === 'quote';

    const hasComplexBlockContent = (block: KnowledgeBaseArticleBlock) => {
        if (block.type === 'table') {
            return block.rows.some((row) =>
                row.some((cell) => cell.trim() !== ''),
            );
        }

        if (block.type === 'ul' || block.type === 'ol') {
            return block.items.some((item) => item.trim() !== '');
        }

        if (block.type === 'code') {
            return block.code.trim() !== '' || block.language.trim() !== '';
        }

        if (block.type === 'link') {
            return block.url.trim() !== '' || block.title.trim() !== '';
        }

        if (block.type === 'file') {
            return block.url.trim() !== '' || block.name.trim() !== '';
        }

        if (block.type === 'image' || block.type === 'video') {
            return block.url.trim() !== '';
        }

        return false;
    };

    const clampMenuPosition = (
        left: number,
        top: number,
        menuWidth: number,
        menuHeight: number,
    ) => {
        const viewportPadding = 8;
        const viewportTopInset =
            window.innerWidth <= 768 ? 72 : viewportPadding;

        if (left + menuWidth > window.innerWidth - viewportPadding) {
            left = window.innerWidth - menuWidth - viewportPadding;
        }

        if (top + menuHeight > window.innerHeight - viewportPadding) {
            top = Math.max(
                viewportTopInset,
                window.innerHeight - menuHeight - viewportPadding,
            );
        }

        return {
            left: Math.max(viewportPadding, left),
            top: Math.max(viewportTopInset, top),
        };
    };

    const resolveAddMenuPosition = (rect: DOMRect, menuHeight: number) =>
        clampMenuPosition(rect.left - 10, rect.bottom + 4, 214, menuHeight);

    const resolveActionMenuPosition = (rect: DOMRect, menuHeight: number) =>
        clampMenuPosition(rect.left + 14, rect.top - 8, 182, menuHeight);

    const patchBlock = (
        id: string,
        patch: Partial<KnowledgeBaseArticleBlock>,
    ) => {
        updateBlocks(
            safeBlocks.map((block) =>
                block.id === id
                    ? ({ ...block, ...patch } as KnowledgeBaseArticleBlock)
                    : block,
            ),
        );
    };

    const removeBlockIfAllowed = (id: string) => {
        const nextBlocks = safeBlocks.filter((block) => block.id !== id);
        updateBlocks(nextBlocks.length > 0 ? nextBlocks : [createBlock('p')]);
    };

    const removeEmptyTextBlock = (id: string) => {
        const targetBlock = safeBlocks.find((block) => block.id === id);

        if (
            !targetBlock ||
            !isTextBlock(targetBlock) ||
            safeBlocks.length <= 1
        ) {
            return;
        }

        removeBlockIfAllowed(id);
    };

    useEffect(() => {
        safeBlocksRef.current = safeBlocks;
    }, [safeBlocks]);

    useEffect(() => {
        if (isEditing) {
            return;
        }

        undoStackRef.current = [];
        setMenuState(null);
        setToolbarState(null);
        setDeleteTarget(null);
    }, [isEditing]);

    const replaceBlock = (id: string, nextBlock: KnowledgeBaseArticleBlock) => {
        updateBlocks(
            safeBlocks.map((block) => (block.id === id ? nextBlock : block)),
        );
    };

    useEffect(() => {
        const clearInlineToolbar = () => {
            setToolbarState(null);
            savedRangeRef.current = null;
        };

        const getToolbarStateFromSelection = () => {
            const selection = window.getSelection();

            if (
                !selection ||
                selection.isCollapsed ||
                selection.toString().trim() === '' ||
                selection.rangeCount === 0
            ) {
                return null;
            }

            const anchor = selection.anchorNode;
            const currentElement = (
                anchor?.nodeType === Node.TEXT_NODE
                    ? anchor.parentElement
                    : (anchor as Element | null)
            ) as Element | null;
            const richBlock = currentElement?.closest(
                '[data-rich-block-id]',
            ) as HTMLElement | null;
            const tableCell = currentElement?.closest(
                '[data-table-cell]',
            ) as HTMLElement | null;
            const tableCellAddress = parseTableCellAddress(
                tableCell?.dataset.tableCell,
            );
            const editable = richBlock ?? tableCell;

            if (!editable || (!richBlock && !tableCellAddress)) {
                return null;
            }

            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            if (!rect.width && !rect.height) {
                return null;
            }

            const toolbarTopInset = window.innerWidth <= 768 ? 76 : 44;
            const toolbarBottomInset = 12;
            const linkNode = (
                selection.anchorNode?.nodeType === Node.TEXT_NODE
                    ? selection.anchorNode.parentElement
                    : (selection.anchorNode as Element | null)
            )?.closest('a');

            savedRangeRef.current = range.cloneRange();

            return {
                kind: richBlock ? ('block' as const) : ('table-cell' as const),
                blockId:
                    richBlock?.dataset.richBlockId ??
                    tableCellAddress?.blockId ??
                    '',
                rowIndex: tableCellAddress?.rowIndex,
                cellIndex: tableCellAddress?.cellIndex,
                top: Math.min(
                    window.innerHeight - toolbarBottomInset,
                    Math.max(toolbarTopInset, rect.top - 12),
                ),
                left: Math.min(
                    window.innerWidth - 12,
                    Math.max(12, rect.left + rect.width / 2),
                ),
                linkUrl:
                    linkNode instanceof HTMLAnchorElement ? linkNode.href : '',
                formats: resolveToolbarFormats(editable, range),
            };
        };

        const syncToolbarWithSelection = () => {
            const nextToolbarState = getToolbarStateFromSelection();

            if (!nextToolbarState) {
                clearInlineToolbar();
                return false;
            }

            setToolbarState(nextToolbarState);
            return true;
        };

        const handleSelectionChange = () => {
            if (!syncToolbarWithSelection()) {
                window.setTimeout(() => {
                    const current = window.getSelection();
                    const activeElement =
                        document.activeElement as HTMLElement | null;
                    const isToolbarActive = Boolean(
                        activeElement?.closest('.inline-toolbar') ||
                        document.querySelector(
                            '.inline-toolbar.is-link-editing',
                        ),
                    );

                    if (isToolbarActive) {
                        return;
                    }

                    if (
                        !current ||
                        current.isCollapsed ||
                        current.toString().trim() === ''
                    ) {
                        clearInlineToolbar();
                        return;
                    }

                    syncToolbarWithSelection();
                }, 120);
            }
        };

        const handleScroll = (event: Event) => {
            const target = event.target;

            if (
                target instanceof Element &&
                target.closest('.inline-toolbar')
            ) {
                return;
            }

            syncToolbarWithSelection();
        };

        const handleWheelOrTouchMove = (event: Event) => {
            const target = event.target;

            if (
                target instanceof Element &&
                target.closest('.inline-toolbar')
            ) {
                return;
            }

            syncToolbarWithSelection();
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        window.addEventListener('scroll', handleScroll, true);
        document.addEventListener('wheel', handleWheelOrTouchMove, {
            passive: true,
            capture: true,
        });
        document.addEventListener('touchmove', handleWheelOrTouchMove, {
            passive: true,
            capture: true,
        });

        return () => {
            document.removeEventListener(
                'selectionchange',
                handleSelectionChange,
            );
            window.removeEventListener('scroll', handleScroll, true);
            document.removeEventListener('wheel', handleWheelOrTouchMove, true);
            document.removeEventListener(
                'touchmove',
                handleWheelOrTouchMove,
                true,
            );
        };
    }, []);

    useEffect(() => {
        if (!menuState) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as HTMLElement | null;

            if (!target) {
                return;
            }

            if (
                target.closest('[data-editor-menu-trigger]') ||
                target.closest('[data-editor-menu-panel]')
            ) {
                return;
            }

            setMenuState(null);
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMenuState(null);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [menuState]);

    useEffect(() => {
        if (!pendingFocusRef.current) {
            return;
        }

        const nextFocus = pendingFocusRef.current;
        pendingFocusRef.current = null;

        window.requestAnimationFrame(() => {
            if (nextFocus.kind === 'block') {
                const node = document.querySelector(
                    `[data-block-focus="${nextFocus.blockId}"]`,
                ) as HTMLElement | null;

                if (node) {
                    focusEditableElement(node);
                }

                return;
            }

            const node = document.querySelector(
                `[data-table-cell="${nextFocus.blockId}:${nextFocus.rowIndex}:${nextFocus.cellIndex}"]`,
            ) as HTMLElement | null;

            if (node) {
                focusEditableElement(node);
            }
        });
    }, [safeBlocks]);

    const restoreSelection = (state?: ToolbarState | null) => {
        const selection = window.getSelection();
        if (!selection || !savedRangeRef.current) {
            return false;
        }

        if (state) {
            getToolbarTargetNode(state)?.focus();
        }

        selection.removeAllRanges();
        selection.addRange(savedRangeRef.current.cloneRange());

        return true;
    };

    const syncRichBlockFromDom = (blockId: string) => {
        const node = document.querySelector(
            `[data-rich-block-id="${blockId}"]`,
        ) as HTMLElement | null;

        if (!node) {
            return;
        }

        patchBlock(blockId, {
            content: node.textContent ?? '',
            html: normalizeRichTextHtml(node.innerHTML),
        });
    };

    const syncTableCellFromDom = (
        blockId: string,
        rowIndex: number,
        cellIndex: number,
    ) => {
        const node = document.querySelector(
            `[data-table-cell="${blockId}:${rowIndex}:${cellIndex}"]`,
        ) as HTMLElement | null;

        if (!node) {
            return;
        }

        const currentBlock = safeBlocks.find((block) => block.id === blockId);

        if (
            !currentBlock ||
            currentBlock.type !== 'table' ||
            !currentBlock.rows[rowIndex]
        ) {
            return;
        }

        const rows = currentBlock.rows.map((row) => [...row]);
        rows[rowIndex][cellIndex] = normalizeTableCellHtml(node.innerHTML);

        patchBlock(
            blockId,
            buildTableBlockPatch(
                rows,
                currentBlock.column_widths,
                currentBlock.row_heights,
            ) as Partial<KnowledgeBaseArticleBlock>,
        );
    };

    const syncToolbarTargetFromDom = (state: ToolbarState) => {
        if (state.kind === 'table-cell') {
            syncTableCellFromDom(
                state.blockId,
                state.rowIndex ?? 0,
                state.cellIndex ?? 0,
            );
            return;
        }

        syncRichBlockFromDom(state.blockId);
    };

    const refreshToolbarState = (state: ToolbarState) => {
        const selection = window.getSelection();
        const editable = getToolbarTargetNode(state);
        const range =
            selection && selection.rangeCount > 0
                ? selection.getRangeAt(0)
                : null;

        if (!selection || !editable || !range) {
            return;
        }

        const rect = range.getBoundingClientRect();
        const linkNode = (
            selection.anchorNode?.nodeType === Node.TEXT_NODE
                ? selection.anchorNode.parentElement
                : (selection.anchorNode as Element | null)
        )?.closest('a');

        setToolbarState({
            ...state,
            top: Math.max(window.innerWidth <= 768 ? 76 : 44, rect.top - 12),
            left: Math.min(
                window.innerWidth - 12,
                Math.max(12, rect.left + rect.width / 2),
            ),
            linkUrl: linkNode instanceof HTMLAnchorElement ? linkNode.href : '',
            formats: resolveToolbarFormats(editable, range),
        });
    };

    const applyInlineFormat = (command: string) => {
        if (!toolbarState || !restoreSelection(toolbarState)) {
            return;
        }

        document.execCommand(command, false, undefined);
        syncToolbarTargetFromDom(toolbarState);
        refreshToolbarState(toolbarState);
    };

    const applyInlineLink = (url: string | null) => {
        if (!toolbarState || !restoreSelection(toolbarState)) {
            return;
        }

        const editable = getToolbarTargetNode(toolbarState);
        const selection = window.getSelection();
        const range =
            selection && selection.rangeCount > 0
                ? selection.getRangeAt(0)
                : null;

        if (!editable || !selection || !range) {
            return;
        }

        const startAnchor = closestAnchorFromNode(range.startContainer);
        const endAnchor = closestAnchorFromNode(range.endContainer);

        if (!url) {
            const anchorsToRemove =
                startAnchor && startAnchor === endAnchor
                    ? [startAnchor]
                    : collectIntersectingAnchors(editable, range);

            anchorsToRemove.forEach((anchor) => {
                unwrapAnchorElement(anchor);
            });

            editable.normalize();
            syncToolbarTargetFromDom(toolbarState);
            savedRangeRef.current = null;
            return;
        }

        const normalizedHref = normalizeLinkHref(url);

        if (normalizedHref === '') {
            return;
        }

        if (startAnchor && startAnchor === endAnchor) {
            startAnchor.href = normalizedHref;
            startAnchor.target = '_blank';
            startAnchor.rel = 'noreferrer';
            syncToolbarTargetFromDom(toolbarState);
            savedRangeRef.current = null;
            return;
        }

        const fragment = stripAnchorsFromFragment(range.extractContents());

        if ((fragment.textContent ?? '').trim() === '') {
            savedRangeRef.current = null;
            syncToolbarTargetFromDom(toolbarState);
            return;
        }

        const link = document.createElement('a');
        link.href = normalizedHref;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.appendChild(fragment);
        range.insertNode(link);

        const linkedRange = document.createRange();
        linkedRange.selectNodeContents(link);
        selection.removeAllRanges();
        selection.addRange(linkedRange);
        savedRangeRef.current = linkedRange.cloneRange();
        editable.normalize();
        syncToolbarTargetFromDom(toolbarState);
        refreshToolbarState(toolbarState);
    };

    const insertBlockAfter = (
        afterId: string | 'root',
        type: KnowledgeBaseArticleBlock['type'],
    ) => {
        const next = createBlock(type);
        pendingFocusRef.current = { kind: 'block', blockId: next.id };

        if (!isTextBlock(next)) {
            startComplexBlockEditing(next.id);
        }

        if (afterId === 'root') {
            updateBlocks([...safeBlocks, next]);
            setMenuState(null);
            return;
        }

        const index = safeBlocks.findIndex((block) => block.id === afterId);
        const nextBlocks = [...safeBlocks];
        nextBlocks.splice(index + 1, 0, next);
        updateBlocks(nextBlocks);
        setMenuState(null);
    };

    const updateTableCell = (
        blockId: string,
        rowIndex: number,
        cellIndex: number,
        value: string,
    ) => {
        const block = safeBlocks.find((current) => current.id === blockId);

        if (!block || block.type !== 'table') {
            return;
        }

        const nextRows = block.rows.map((currentRow) => [...currentRow]);
        nextRows[rowIndex][cellIndex] = value;
        patchBlock(
            blockId,
            buildTableBlockPatch(
                nextRows,
                block.column_widths,
                block.row_heights,
            ) as Partial<KnowledgeBaseArticleBlock>,
        );
    };

    const resizeTableColumn = (
        blockId: string,
        columnIndex: number,
        nextWidth: number,
    ) => {
        const block = safeBlocks.find((current) => current.id === blockId);

        if (!block || block.type !== 'table') {
            return;
        }

        const widths = normalizeTableColumnWidths(
            block.column_widths,
            block.rows,
        );
        widths[columnIndex] = Math.min(
            MAX_TABLE_COLUMN_WIDTH,
            Math.max(MIN_TABLE_COLUMN_WIDTH, Math.round(nextWidth)),
        );

        patchBlock(
            blockId,
            buildTableBlockPatch(
                block.rows,
                widths,
                block.row_heights,
            ) as Partial<KnowledgeBaseArticleBlock>,
        );
    };

    const resizeTableRow = (
        blockId: string,
        rowIndex: number,
        nextHeight: number,
    ) => {
        const block = safeBlocks.find((current) => current.id === blockId);

        if (!block || block.type !== 'table') {
            return;
        }

        const heights = normalizeTableRowHeights(block.row_heights, block.rows);
        heights[rowIndex] = Math.min(
            MAX_TABLE_ROW_HEIGHT,
            Math.max(MIN_TABLE_ROW_HEIGHT, Math.round(nextHeight)),
        );

        patchBlock(
            blockId,
            buildTableBlockPatch(
                block.rows,
                block.column_widths,
                heights,
            ) as Partial<KnowledgeBaseArticleBlock>,
        );
    };

    const focusTableCell = (
        blockId: string,
        rowIndex: number,
        cellIndex: number,
    ) => {
        pendingFocusRef.current = {
            kind: 'table-cell',
            blockId,
            rowIndex,
            cellIndex,
        };
    };

    const moveBlock = (id: string, direction: -1 | 1) => {
        const index = safeBlocks.findIndex((block) => block.id === id);
        const targetIndex = index + direction;

        if (index < 0 || targetIndex < 0 || targetIndex >= safeBlocks.length) {
            return;
        }

        const nextBlocks = [...safeBlocks];
        const [current] = nextBlocks.splice(index, 1);
        nextBlocks.splice(targetIndex, 0, current);
        updateBlocks(nextBlocks);
        setMenuState(null);
    };

    const moveBlockToPosition = (
        sourceId: string,
        targetId: string,
        position: 'before' | 'after',
    ) => {
        if (sourceId === targetId) {
            return;
        }

        const nextBlocks = [...safeBlocks];
        const sourceIndex = nextBlocks.findIndex(
            (block) => block.id === sourceId,
        );
        const targetIndex = nextBlocks.findIndex(
            (block) => block.id === targetId,
        );

        if (sourceIndex < 0 || targetIndex < 0) {
            return;
        }

        const [sourceBlock] = nextBlocks.splice(sourceIndex, 1);
        const baseIndex = nextBlocks.findIndex(
            (block) => block.id === targetId,
        );
        const insertIndex = position === 'before' ? baseIndex : baseIndex + 1;

        nextBlocks.splice(insertIndex, 0, sourceBlock);
        updateBlocks(nextBlocks);
    };

    const clearDragState = () => {
        setDraggedBlockId(null);
        setDropIndicator(null);
        dragPointerRef.current = null;
    };

    const handleBlockPointerDown = (
        blockId: string,
        event: ReactPointerEvent<HTMLButtonElement>,
    ) => {
        if (event.button !== 0) {
            return;
        }

        dragPointerRef.current = {
            blockId,
            startX: event.clientX,
            startY: event.clientY,
            isDragging: false,
            targetId: null,
            position: 'after',
        };

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const dragState = dragPointerRef.current;

            if (!dragState) {
                return;
            }

            const distance = Math.hypot(
                moveEvent.clientX - dragState.startX,
                moveEvent.clientY - dragState.startY,
            );

            if (!dragState.isDragging && distance < 6) {
                return;
            }

            moveEvent.preventDefault();

            if (!dragState.isDragging) {
                dragState.isDragging = true;
                suppressNextActionClickRef.current = true;
                setDraggedBlockId(blockId);
                setMenuState(null);
                setToolbarState(null);
            }

            const target = document
                .elementFromPoint(moveEvent.clientX, moveEvent.clientY)
                ?.closest('[data-kb-editor-block-id]') as HTMLElement | null;

            if (!target) {
                setDropIndicator(null);
                dragState.targetId = null;
                return;
            }

            const targetId = target.dataset.kbEditorBlockId;

            if (!targetId || targetId === blockId) {
                setDropIndicator(null);
                dragState.targetId = null;
                return;
            }

            const rect = target.getBoundingClientRect();
            const position =
                moveEvent.clientY < rect.top + rect.height / 2
                    ? 'before'
                    : 'after';

            dragState.targetId = targetId;
            dragState.position = position;

            setDropIndicator((current) => {
                if (
                    current?.targetId === targetId &&
                    current.position === position
                ) {
                    return current;
                }

                return { targetId, position };
            });
        };

        const handlePointerUp = () => {
            const dragState = dragPointerRef.current;

            if (dragState?.isDragging && dragState.targetId) {
                moveBlockToPosition(
                    dragState.blockId,
                    dragState.targetId,
                    dragState.position,
                );
            }

            clearDragState();
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove, {
            passive: false,
        });
        window.addEventListener('pointerup', handlePointerUp, { once: true });
    };

    const deleteBlock = (id: string) => {
        const nextBlocks = safeBlocks.filter((block) => block.id !== id);
        updateBlocks(nextBlocks.length === 0 ? [createBlock('p')] : nextBlocks);
        setMenuState(null);
    };

    const requestDeleteBlock = (block: KnowledgeBaseArticleBlock) => {
        setDeleteTarget(block);
        setMenuState(null);
        setToolbarState(null);
    };

    const confirmDeleteBlock = () => {
        if (!deleteTarget) {
            return;
        }

        deleteBlock(deleteTarget.id);
        setDeleteTarget(null);
    };

    const pasteStructuredBlocks = (
        blockId: string,
        payload: StructuredPastePayload,
        event?:
            | ReactClipboardEvent<HTMLElement>
            | ReactClipboardEvent<HTMLOListElement | HTMLUListElement>,
    ) => {
        const clipboardItem = Array.from(event?.clipboardData.items ?? []).find(
            (item) => item.type.startsWith('image/'),
        );
        const clipboardImage =
            clipboardItem?.getAsFile() ??
            event?.clipboardData.files?.[0] ??
            null;

        if (clipboardImage) {
            void pasteClipboardImage(blockId, clipboardImage);
            return true;
        }

        const pastedBlocks = createBlocksFromClipboardPaste(payload);

        if (pastedBlocks.length === 0) {
            return false;
        }

        const index = safeBlocks.findIndex((block) => block.id === blockId);

        if (index < 0) {
            return false;
        }

        const nextBlocks = [...safeBlocks];

        if (isArticleBlockEmpty(safeBlocks[index])) {
            nextBlocks.splice(index, 1, ...pastedBlocks);
        } else {
            nextBlocks.splice(index + 1, 0, ...pastedBlocks);
        }

        pendingFocusRef.current = {
            kind: 'block',
            blockId: pastedBlocks[pastedBlocks.length - 1].id,
        };

        updateBlocks(nextBlocks);
        setToolbarState(null);
        setMenuState(null);
        toast.success(`Вставлено блоков: ${pastedBlocks.length}`);

        return true;
    };

    const pasteClipboardImage = async (blockId: string, file: File) => {
        const imageBlock: KnowledgeBaseArticleBlock = {
            id: createId(),
            type: 'image',
            url: '',
            caption: '',
            width_percent: 100,
            focus_x: DEFAULT_MEDIA_FOCUS_X,
            focus_y: DEFAULT_MEDIA_FOCUS_Y,
            zoom_percent: DEFAULT_MEDIA_ZOOM,
        };
        const currentBlocks = safeBlocksRef.current;
        const index = currentBlocks.findIndex((block) => block.id === blockId);

        if (index < 0) {
            return;
        }

        const nextBlocks = [...currentBlocks];

        if (isArticleBlockEmpty(currentBlocks[index])) {
            nextBlocks.splice(index, 1, imageBlock);
        } else {
            nextBlocks.splice(index + 1, 0, imageBlock);
        }

        updateBlocks(nextBlocks);
        startComplexBlockEditing(imageBlock.id);
        setToolbarState(null);
        setMenuState(null);

        try {
            setUploadingBlockId(imageBlock.id);
            const result = await onUploadAsset('image', file);
            const uploadedBlocks = safeBlocksRef.current.map((block) =>
                block.id === imageBlock.id
                    ? { ...block, url: result.url }
                    : block,
            );

            updateBlocks(uploadedBlocks);
            toast.success('Изображение вставлено');
        } catch (error) {
            const fallbackBlocks = safeBlocksRef.current.filter(
                (block) => block.id !== imageBlock.id,
            );
            const resolvedBlocks =
                fallbackBlocks.length === 0
                    ? [createBlock('p')]
                    : fallbackBlocks;

            updateBlocks(resolvedBlocks);
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Не удалось загрузить изображение из буфера обмена.',
            );
        } finally {
            setUploadingBlockId((current) =>
                current === imageBlock.id ? null : current,
            );
        }
    };

    const uploadForBlock = async (
        block: KnowledgeBaseArticleBlock,
        file: File,
    ) => {
        const kind: 'image' | 'file' | 'video' =
            block.type === 'image' || block.type === 'video'
                ? block.type
                : 'file';

        try {
            setUploadingBlockId(block.id);
            const result = await onUploadAsset(kind, file);

            if (block.type === 'image' || block.type === 'video') {
                patchBlock(block.id, { url: result.url });
            }

            if (block.type === 'file') {
                patchBlock(block.id, {
                    url: result.url,
                    name: result.name ?? file.name,
                    size_label: result.size_label ?? '',
                });
            }

            toast.success('Файл загружен');
        } catch {
            toast.error('Не удалось загрузить файл');
        } finally {
            setUploadingBlockId(null);
        }
    };

    const renderDeleteBlockButton = (
        block: KnowledgeBaseArticleBlock,
        options?: {
            compact?: boolean;
            className?: string;
        },
    ) => (
        <button
            type="button"
            className={[
                options?.compact
                    ? 'kb-editor__link-remove'
                    : 'kb-editor__inline-upload kb-editor__inline-upload--danger',
                options?.className ?? '',
            ]
                .filter(Boolean)
                .join(' ')}
            onClick={() => requestDeleteBlock(block)}
            aria-label="Удалить блок"
            title="Удалить блок"
        >
            <Trash2 className="size-4" />
            {options?.compact ? (
                <span className="sr-only">Удалить блок</span>
            ) : (
                'Удалить блок'
            )}
        </button>
    );

    const copyCode = async (
        block: Extract<KnowledgeBaseArticleBlock, { type: 'code' }>,
    ) => {
        await navigator.clipboard.writeText(block.code);
        setCopiedBlockId(block.id);
        toast.success('Код скопирован');
        window.setTimeout(() => setCopiedBlockId(null), 1200);
    };

    const toggleAddMenu = (
        targetId: string | 'root',
        event: ReactMouseEvent<HTMLButtonElement>,
        menuHeight = 332,
    ) => {
        event.stopPropagation();

        if (menuState?.kind === 'add' && menuState.targetId === targetId) {
            setMenuState(null);
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const position = resolveAddMenuPosition(rect, menuHeight);

        setMenuState({
            kind: 'add',
            targetId,
            ...position,
        });
    };

    const toggleActionMenu = (
        blockId: string,
        event: ReactMouseEvent<HTMLButtonElement>,
    ) => {
        event.stopPropagation();

        if (menuState?.kind === 'actions' && menuState.blockId === blockId) {
            setMenuState(null);
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const position = resolveActionMenuPosition(rect, 228);

        setMenuState({
            kind: 'actions',
            blockId,
            ...position,
        });
    };

    const undoLastChange = () => {
        const previousBlocks = undoStackRef.current.pop();

        if (!previousBlocks) {
            return false;
        }

        updateBlocks(previousBlocks, { skipHistory: true });
        setMenuState(null);
        setToolbarState(null);
        setDeleteTarget(null);

        return true;
    };

    const handleEditorKeyDownCapture = (
        event: ReactKeyboardEvent<HTMLDivElement>,
    ) => {
        const isUndoShortcut =
            (event.ctrlKey || event.metaKey) &&
            !event.shiftKey &&
            (event.key.toLowerCase() === 'z' || event.code === 'KeyZ');

        if (
            !isEditing ||
            !isUndoShortcut ||
            undoStackRef.current.length === 0
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        undoLastChange();
    };

    return (
        <div
            className={`kb-editor ${isEditing ? 'is-editing' : 'is-viewing'}`}
            onKeyDownCapture={handleEditorKeyDownCapture}
        >
            {toolbarState ? (
                <InlineToolbar
                    state={toolbarState}
                    onRunCommand={applyInlineFormat}
                    onApplyLink={applyInlineLink}
                />
            ) : null}

            {safeBlocks.map((block, index) => {
                const isUploading = uploadingBlockId === block.id;
                const isCodeCopied = copiedBlockId === block.id;
                const isComplexBlock = !isTextBlock(block);
                const isComplexEditing =
                    isEditing &&
                    (!isComplexBlock || editingComplexBlockIds.has(block.id));
                const isAssetCompleted =
                    completedAssetBlockIds.has(block.id) ||
                    (isComplexBlock &&
                        hasComplexBlockContent(block) &&
                        !isComplexEditing);
                const lineClassName = [
                    'kb-editor__line',
                    'kb-block',
                    `kb-block--${block.type}`,
                    isComplexBlock ? 'kb-block--complex' : '',
                    isComplexEditing ? 'is-complex-editing' : '',
                    draggedBlockId === block.id ? 'is-dragging' : '',
                    dropIndicator?.targetId === block.id &&
                    dropIndicator.position === 'before'
                        ? 'is-drop-before'
                        : '',
                    dropIndicator?.targetId === block.id &&
                    dropIndicator.position === 'after'
                        ? 'is-drop-after'
                        : '',
                ]
                    .filter(Boolean)
                    .join(' ');

                return (
                    <div
                        key={block.id}
                        className={lineClassName}
                        id={headingAnchors[block.id]}
                        data-kb-editor-block-id={block.id}
                    >
                        {isEditing ? (
                            <div className="kb-editor__line-controls kb-block-btns">
                                <button
                                    type="button"
                                    onClick={(event) =>
                                        toggleAddMenu(block.id, event)
                                    }
                                    className="kb-editor__ghost-btn kb-add-inline"
                                    data-editor-menu-trigger="add"
                                    aria-label="Добавить блок"
                                >
                                    +
                                </button>

                                <button
                                    type="button"
                                    onPointerDown={(event) =>
                                        handleBlockPointerDown(block.id, event)
                                    }
                                    onClick={(event) => {
                                        if (
                                            suppressNextActionClickRef.current
                                        ) {
                                            suppressNextActionClickRef.current = false;
                                            event.preventDefault();
                                            event.stopPropagation();
                                            return;
                                        }

                                        toggleActionMenu(block.id, event);
                                    }}
                                    className="kb-editor__ghost-btn kb-drag-handle"
                                    data-editor-menu-trigger="actions"
                                    aria-label="Меню блока"
                                >
                                    ⠿
                                </button>

                                {menuState?.kind === 'add' &&
                                menuState.targetId === block.id ? (
                                    <BlockTypeMenu
                                        className="kb-editor__menu-panel kb-editor__menu-panel--add"
                                        style={{
                                            top: `${menuState.top}px`,
                                            left: `${menuState.left}px`,
                                        }}
                                        onSelect={(type) =>
                                            insertBlockAfter(block.id, type)
                                        }
                                    />
                                ) : null}

                                {menuState?.kind === 'actions' &&
                                menuState.blockId === block.id ? (
                                    <BlockActionMenu
                                        block={block}
                                        canMoveUp={index > 0}
                                        canMoveDown={
                                            index < safeBlocks.length - 1
                                        }
                                        onConvert={(type) => {
                                            replaceBlock(
                                                block.id,
                                                convertBlock(block, type),
                                            );
                                            setMenuState(null);
                                        }}
                                        onMoveUp={() => moveBlock(block.id, -1)}
                                        onMoveDown={() =>
                                            moveBlock(block.id, 1)
                                        }
                                        onDelete={() =>
                                            requestDeleteBlock(block)
                                        }
                                        style={{
                                            top: `${menuState.top}px`,
                                            left: `${menuState.left}px`,
                                        }}
                                    />
                                ) : null}
                            </div>
                        ) : null}

                        <div
                            className="kb-editor__line-body"
                            onMouseDownCapture={stopTextInputPointerPropagation}
                            onPointerDownCapture={
                                stopTextInputPointerPropagation
                            }
                            onClick={(event) => {
                                const target =
                                    event.target as HTMLElement | null;

                                if (
                                    target?.closest(
                                        'button, a, input, textarea, label, [contenteditable="true"]',
                                    )
                                ) {
                                    return;
                                }

                                if (
                                    isEditing &&
                                    isComplexBlock &&
                                    !isComplexEditing
                                ) {
                                    activateComplexBlockEditing(block);
                                }
                            }}
                        >
                            {isEditing &&
                            isComplexBlock &&
                            !isComplexEditing &&
                            block.type !== 'image' &&
                            block.type !== 'file' &&
                            block.type !== 'video' ? (
                                <button
                                    type="button"
                                    className="kb-editor__block-edit-btn"
                                    onClick={() =>
                                        activateComplexBlockEditing(block)
                                    }
                                >
                                    Редактировать
                                </button>
                            ) : null}

                            {(block.type === 'p' ||
                                block.type === 'h2' ||
                                block.type === 'h3' ||
                                block.type === 'quote') && (
                                <EditableRichTextBlock
                                    as={
                                        block.type === 'quote'
                                            ? 'blockquote'
                                            : block.type
                                    }
                                    blockId={block.id}
                                    value={block.content}
                                    html={block.html}
                                    onChange={(payload) =>
                                        patchBlock(block.id, payload)
                                    }
                                    onEmptyBlur={() =>
                                        removeEmptyTextBlock(block.id)
                                    }
                                    onCreateNextBlock={() =>
                                        insertBlockAfter(block.id, 'p')
                                    }
                                    onStructuredPaste={(payload, event) =>
                                        pasteStructuredBlocks(
                                            block.id,
                                            payload,
                                            event,
                                        )
                                    }
                                    isEditable={isEditing}
                                    className={`kb-editor__text-block block-${block.type}`}
                                    placeholder={
                                        block.type === 'p'
                                            ? 'Введите обычный текст'
                                            : block.type === 'h2'
                                              ? 'Заголовок'
                                              : block.type === 'h3'
                                                ? 'Подзаголовок'
                                                : 'Цитата'
                                    }
                                />
                            )}

                            {(block.type === 'ul' || block.type === 'ol') && (
                                <EditableListBlock
                                    type={block.type}
                                    blockId={block.id}
                                    items={block.items}
                                    isEditable={isComplexEditing}
                                    onStructuredPaste={(payload, event) =>
                                        pasteStructuredBlocks(
                                            block.id,
                                            payload,
                                            event,
                                        )
                                    }
                                    onChange={(items) =>
                                        patchBlock(block.id, {
                                            items,
                                        })
                                    }
                                />
                            )}

                            {block.type === 'code' && (
                                <div className="kb-editor__code-block">
                                    <div className="kb-editor__code-toolbar">
                                        <input
                                            value={block.language}
                                            onChange={(event) =>
                                                patchBlock(block.id, {
                                                    language:
                                                        event.target.value,
                                                })
                                            }
                                            readOnly={!isComplexEditing}
                                            className="kb-editor__code-language"
                                            data-block-focus={block.id}
                                            placeholder="Язык или пометка"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => copyCode(block)}
                                            className="kb-editor__code-copy"
                                        >
                                            {isCodeCopied ? (
                                                <Check className="size-4" />
                                            ) : (
                                                <Copy className="size-4" />
                                            )}
                                            {isCodeCopied
                                                ? 'Скопировано'
                                                : 'Копировать'}
                                        </button>
                                        {isEditing ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    requestDeleteBlock(block)
                                                }
                                                className="kb-editor__code-copy kb-editor__code-copy--danger"
                                            >
                                                <Trash2 className="size-4" />
                                                Удалить
                                            </button>
                                        ) : null}
                                    </div>

                                    <textarea
                                        value={block.code}
                                        onChange={(event) =>
                                            patchBlock(block.id, {
                                                code: event.target.value,
                                            })
                                        }
                                        readOnly={!isComplexEditing}
                                        className="kb-editor__textarea kb-editor__textarea--code"
                                        placeholder="// Код здесь..."
                                    />
                                </div>
                            )}

                            {block.type === 'table' && (
                                <TableBlockEditor
                                    block={block}
                                    isComplexEditing={isComplexEditing}
                                    onChangeCell={(
                                        rowIndex,
                                        cellIndex,
                                        value,
                                    ) =>
                                        updateTableCell(
                                            block.id,
                                            rowIndex,
                                            cellIndex,
                                            value,
                                        )
                                    }
                                    onFocusCell={(rowIndex, cellIndex) =>
                                        focusTableCell(
                                            block.id,
                                            rowIndex,
                                            cellIndex,
                                        )
                                    }
                                    onResizeColumn={(columnIndex, nextWidth) =>
                                        resizeTableColumn(
                                            block.id,
                                            columnIndex,
                                            nextWidth,
                                        )
                                    }
                                    onResizeRow={(rowIndex, nextHeight) =>
                                        resizeTableRow(
                                            block.id,
                                            rowIndex,
                                            nextHeight,
                                        )
                                    }
                                    onPatchTable={(rows, widths, heights) =>
                                        patchBlock(
                                            block.id,
                                            buildTableBlockPatch(
                                                rows,
                                                widths,
                                                heights,
                                            ) as Partial<KnowledgeBaseArticleBlock>,
                                        )
                                    }
                                    onDeleteBlock={() =>
                                        requestDeleteBlock(block)
                                    }
                                />
                            )}

                            {block.type === 'image' && (
                                <div className="kb-editor__asset-block">
                                    {isAssetCompleted && block.url ? (
                                        <>
                                            {hasCustomMediaPresentation(
                                                block,
                                            ) ? (
                                                <button
                                                    type="button"
                                                    className="kb-editor__image-trigger"
                                                    onClick={() => {
                                                        markAssetBlockEditable(
                                                            block.id,
                                                        );
                                                        startComplexBlockEditing(
                                                            block.id,
                                                        );
                                                    }}
                                                >
                                                    <KnowledgeBaseImageFrame
                                                        src={block.url}
                                                        alt=""
                                                        height={
                                                            block.height_px ??
                                                            DEFAULT_MEDIA_HEIGHT
                                                        }
                                                        widthPercent={
                                                            block.width_percent ??
                                                            100
                                                        }
                                                        focusX={
                                                            block.focus_x ??
                                                            DEFAULT_MEDIA_FOCUS_X
                                                        }
                                                        focusY={
                                                            block.focus_y ??
                                                            DEFAULT_MEDIA_FOCUS_Y
                                                        }
                                                        zoomPercent={
                                                            block.zoom_percent ??
                                                            DEFAULT_MEDIA_ZOOM
                                                        }
                                                        frameClassName="kb-editor__image-frame"
                                                        imageClassName="kb-editor__image-preview kb-editor__image-preview--cropped"
                                                    />
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="kb-editor__image-trigger"
                                                    onClick={() => {
                                                        markAssetBlockEditable(
                                                            block.id,
                                                        );
                                                        startComplexBlockEditing(
                                                            block.id,
                                                        );
                                                    }}
                                                >
                                                    <img
                                                        src={block.url}
                                                        alt=""
                                                        className="kb-editor__image-preview"
                                                        style={mediaFrameWidthStyle(
                                                            block,
                                                        )}
                                                    />
                                                </button>
                                            )}
                                            {block.caption ? (
                                                <div className="kb-editor__asset-caption">
                                                    {block.caption}
                                                </div>
                                            ) : null}
                                            <div className="kb-editor__asset-actions">
                                                <button
                                                    type="button"
                                                    className="kb-editor__inline-upload"
                                                    onClick={() => {
                                                        markAssetBlockEditable(
                                                            block.id,
                                                        );
                                                        startComplexBlockEditing(
                                                            block.id,
                                                        );
                                                    }}
                                                >
                                                    Редактировать
                                                </button>
                                                {renderDeleteBlockButton(block)}
                                            </div>
                                        </>
                                    ) : block.url ? (
                                        hasCustomMediaPresentation(block) ? (
                                            <KnowledgeBaseImageFrame
                                                src={block.url}
                                                alt=""
                                                height={
                                                    block.height_px ??
                                                    DEFAULT_MEDIA_HEIGHT
                                                }
                                                widthPercent={
                                                    block.width_percent ?? 100
                                                }
                                                focusX={
                                                    block.focus_x ??
                                                    DEFAULT_MEDIA_FOCUS_X
                                                }
                                                focusY={
                                                    block.focus_y ??
                                                    DEFAULT_MEDIA_FOCUS_Y
                                                }
                                                zoomPercent={
                                                    block.zoom_percent ??
                                                    DEFAULT_MEDIA_ZOOM
                                                }
                                                frameClassName="kb-editor__image-frame"
                                                imageClassName="kb-editor__image-preview kb-editor__image-preview--cropped"
                                            />
                                        ) : (
                                            <img
                                                src={block.url}
                                                alt=""
                                                className="kb-editor__image-preview"
                                                style={mediaFrameWidthStyle(
                                                    block,
                                                )}
                                            />
                                        )
                                    ) : (
                                        <label className="kb-editor__upload-placeholder">
                                            <input
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
                                                className="hidden"
                                                onChange={(event) => {
                                                    const file =
                                                        event.target.files?.[0];
                                                    if (file) {
                                                        void uploadForBlock(
                                                            block,
                                                            file,
                                                        );
                                                    }
                                                }}
                                            />
                                            <ImagePlus className="size-4" />
                                            {isUploading
                                                ? 'Загрузка...'
                                                : 'Выберите, перетащите или вставьте изображение'}
                                        </label>
                                    )}

                                    {!isAssetCompleted ? (
                                        <div className="kb-editor__asset-actions">
                                            <label className="kb-editor__inline-upload">
                                                <input
                                                    type="file"
                                                    accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
                                                    className="hidden"
                                                    onChange={(event) => {
                                                        const file =
                                                            event.target
                                                                .files?.[0];
                                                        if (file) {
                                                            void uploadForBlock(
                                                                block,
                                                                file,
                                                            );
                                                        }
                                                    }}
                                                />
                                                <ImagePlus className="size-4" />
                                                {block.url
                                                    ? 'Заменить изображение'
                                                    : 'Выбрать изображение'}
                                            </label>

                                            {block.url ? (
                                                <button
                                                    type="button"
                                                    className="kb-editor__inline-upload kb-editor__inline-upload--success"
                                                    onClick={() =>
                                                        finishComplexBlockEditing(
                                                            block.id,
                                                        )
                                                    }
                                                >
                                                    Готово
                                                </button>
                                            ) : null}
                                            {renderDeleteBlockButton(block)}
                                        </div>
                                    ) : null}

                                    {!isAssetCompleted && block.url ? (
                                        <KnowledgeBaseImageEditorControls
                                            title="Кадр изображения"
                                            note="Настройка применяется только к этому блоку."
                                            horizontal={
                                                block.focus_x ??
                                                DEFAULT_MEDIA_FOCUS_X
                                            }
                                            vertical={
                                                block.focus_y ??
                                                DEFAULT_MEDIA_FOCUS_Y
                                            }
                                            zoom={
                                                block.zoom_percent ??
                                                DEFAULT_MEDIA_ZOOM
                                            }
                                            height={
                                                block.height_px ??
                                                DEFAULT_MEDIA_HEIGHT
                                            }
                                            onHorizontalChange={(value) =>
                                                patchBlock(block.id, {
                                                    focus_x: value,
                                                })
                                            }
                                            onVerticalChange={(value) =>
                                                patchBlock(block.id, {
                                                    focus_y: value,
                                                })
                                            }
                                            onZoomChange={(value) =>
                                                patchBlock(block.id, {
                                                    zoom_percent: value,
                                                })
                                            }
                                            onHeightChange={(value) =>
                                                patchBlock(block.id, {
                                                    height_px: value,
                                                })
                                            }
                                            onReset={() =>
                                                patchBlock(block.id, {
                                                    focus_x:
                                                        DEFAULT_MEDIA_FOCUS_X,
                                                    focus_y:
                                                        DEFAULT_MEDIA_FOCUS_Y,
                                                    zoom_percent:
                                                        DEFAULT_MEDIA_ZOOM,
                                                    height_px: undefined,
                                                })
                                            }
                                        />
                                    ) : null}

                                    {!isAssetCompleted ? (
                                        <input
                                            value={block.caption}
                                            onChange={(event) =>
                                                patchBlock(block.id, {
                                                    caption: event.target.value,
                                                })
                                            }
                                            className="kb-editor__input"
                                            data-block-focus={block.id}
                                            placeholder="Подпись к изображению"
                                        />
                                    ) : null}
                                </div>
                            )}

                            {block.type === 'file' && (
                                <div className="kb-editor__file-box">
                                    {isAssetCompleted &&
                                    (block.url || block.name) ? (
                                        <>
                                            {block.url ? (
                                                <a
                                                    href={block.url}
                                                    download={
                                                        block.name || undefined
                                                    }
                                                    className="kb-editor__file-drop kb-editor__file-drop--done kb-editor__file-drop--interactive"
                                                    data-kb-ignore-edit-activation
                                                >
                                                    <Paperclip className="size-4" />
                                                    <span>
                                                        {block.name ||
                                                            'Прикрепленный файл'}
                                                    </span>
                                                    {block.size_label ? (
                                                        <span>
                                                            {block.size_label}
                                                        </span>
                                                    ) : null}
                                                </a>
                                            ) : (
                                                <div className="kb-editor__file-drop kb-editor__file-drop--done">
                                                    <Paperclip className="size-4" />
                                                    <span>
                                                        {block.name ||
                                                            'Прикрепленный файл'}
                                                    </span>
                                                    {block.size_label ? (
                                                        <span>
                                                            {block.size_label}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            )}
                                            <div className="kb-editor__asset-actions">
                                                <button
                                                    type="button"
                                                    className="kb-editor__inline-upload"
                                                    onClick={() => {
                                                        markAssetBlockEditable(
                                                            block.id,
                                                        );
                                                        startComplexBlockEditing(
                                                            block.id,
                                                        );
                                                    }}
                                                >
                                                    Редактировать
                                                </button>
                                                {renderDeleteBlockButton(block)}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <label className="kb-editor__file-drop">
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={(event) => {
                                                        const file =
                                                            event.target
                                                                .files?.[0];
                                                        if (file) {
                                                            void uploadForBlock(
                                                                block,
                                                                file,
                                                            );
                                                        }
                                                    }}
                                                />
                                                <Paperclip className="size-4" />
                                                {isUploading
                                                    ? 'Загрузка...'
                                                    : block.name ||
                                                      'Выберите, перетащите или вставьте файл'}
                                            </label>

                                            <div className="kb-editor__file-grid">
                                                <input
                                                    value={block.name}
                                                    onChange={(event) =>
                                                        patchBlock(block.id, {
                                                            name: event.target
                                                                .value,
                                                        })
                                                    }
                                                    className="kb-editor__input"
                                                    data-block-focus={block.id}
                                                    placeholder="Название файла"
                                                />
                                                <input
                                                    value={block.size_label}
                                                    onChange={(event) =>
                                                        patchBlock(block.id, {
                                                            size_label:
                                                                event.target
                                                                    .value,
                                                        })
                                                    }
                                                    className="kb-editor__input"
                                                    placeholder="Размер, например 2.4 МБ"
                                                />
                                            </div>

                                            {block.url || block.name ? (
                                                <div className="kb-editor__asset-actions">
                                                    <button
                                                        type="button"
                                                        className="kb-editor__inline-upload kb-editor__inline-upload--success"
                                                        onClick={() =>
                                                            finishComplexBlockEditing(
                                                                block.id,
                                                            )
                                                        }
                                                    >
                                                        Готово
                                                    </button>
                                                    {renderDeleteBlockButton(
                                                        block,
                                                    )}
                                                </div>
                                            ) : null}
                                        </>
                                    )}
                                </div>
                            )}

                            {block.type === 'video' && (
                                <div className="kb-editor__asset-block">
                                    {isAssetCompleted && block.url ? (
                                        <>
                                            {(() => {
                                                const resolvedVideo =
                                                    resolveVideoSource(
                                                        block.url,
                                                    );

                                                return resolvedVideo.embedUrl ? (
                                                    <iframe
                                                        src={
                                                            resolvedVideo.embedUrl
                                                        }
                                                        title={
                                                            block.caption ||
                                                            'Видео'
                                                        }
                                                        className="kb-editor__video-embed"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    />
                                                ) : (
                                                    <video
                                                        src={resolvedVideo.url}
                                                        className="kb-editor__video-preview"
                                                        controls
                                                    />
                                                );
                                            })()}
                                            <div className="kb-editor__asset-actions">
                                                <button
                                                    type="button"
                                                    className="kb-editor__inline-upload"
                                                    onClick={() => {
                                                        markAssetBlockEditable(
                                                            block.id,
                                                        );
                                                        startComplexBlockEditing(
                                                            block.id,
                                                        );
                                                    }}
                                                >
                                                    Редактировать
                                                </button>
                                                {renderDeleteBlockButton(block)}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <label className="kb-editor__upload-placeholder kb-editor__upload-placeholder--video">
                                                <input
                                                    type="file"
                                                    accept=".mp4,.mov,.webm,.m4v"
                                                    className="hidden"
                                                    onChange={(event) => {
                                                        const file =
                                                            event.target
                                                                .files?.[0];
                                                        if (file) {
                                                            void uploadForBlock(
                                                                block,
                                                                file,
                                                            );
                                                        }
                                                    }}
                                                />
                                                <Play className="size-4" />
                                                {isUploading
                                                    ? 'Загрузка...'
                                                    : 'Выберите, перетащите или вставьте видео'}
                                            </label>

                                            {block.url
                                                ? (() => {
                                                      const resolvedVideo =
                                                          resolveVideoSource(
                                                              block.url,
                                                          );

                                                      return resolvedVideo.embedUrl ? (
                                                          <iframe
                                                              src={
                                                                  resolvedVideo.embedUrl
                                                              }
                                                              title={
                                                                  block.caption ||
                                                                  'Видео'
                                                              }
                                                              className="kb-editor__video-embed"
                                                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                              allowFullScreen
                                                          />
                                                      ) : (
                                                          <video
                                                              src={
                                                                  resolvedVideo.url
                                                              }
                                                              className="kb-editor__video-preview"
                                                              controls
                                                          />
                                                      );
                                                  })()
                                                : null}

                                            <input
                                                value={block.url}
                                                onChange={(event) =>
                                                    patchBlock(block.id, {
                                                        url: event.target.value,
                                                    })
                                                }
                                                className="kb-editor__input"
                                                data-block-focus={block.id}
                                                placeholder="https://... или <iframe ...>"
                                            />

                                            <div className="kb-editor__asset-actions">
                                                <label className="kb-editor__inline-upload">
                                                    <input
                                                        type="file"
                                                        accept=".mp4,.mov,.webm,.m4v"
                                                        className="hidden"
                                                        onChange={(event) => {
                                                            const file =
                                                                event.target
                                                                    .files?.[0];
                                                            if (file) {
                                                                void uploadForBlock(
                                                                    block,
                                                                    file,
                                                                );
                                                            }
                                                        }}
                                                    />
                                                    <Play className="size-4" />
                                                    {block.url
                                                        ? 'Заменить видео'
                                                        : 'Выбрать видео'}
                                                </label>

                                                {block.url ? (
                                                    <button
                                                        type="button"
                                                        className="kb-editor__inline-upload kb-editor__inline-upload--success"
                                                        onClick={() =>
                                                            finishComplexBlockEditing(
                                                                block.id,
                                                            )
                                                        }
                                                    >
                                                        Готово
                                                    </button>
                                                ) : null}
                                                {renderDeleteBlockButton(block)}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {block.type === 'link' && (
                                <div className="kb-editor__link-row">
                                    {isComplexEditing ? (
                                        <>
                                            <div className="kb-editor__link-icon">
                                                <Link2 className="size-4" />
                                            </div>
                                            <div className="kb-editor__link-content">
                                                <div className="kb-editor__link-fields">
                                                    <input
                                                        value={block.title}
                                                        onChange={(event) =>
                                                            patchBlock(
                                                                block.id,
                                                                {
                                                                    title: event
                                                                        .target
                                                                        .value,
                                                                },
                                                            )
                                                        }
                                                        readOnly={
                                                            !isComplexEditing
                                                        }
                                                        className="kb-editor__input kb-editor__input--title"
                                                        data-block-focus={
                                                            block.id
                                                        }
                                                        placeholder="Текст ссылки"
                                                    />
                                                    <input
                                                        value={block.url}
                                                        onChange={(event) =>
                                                            patchBlock(
                                                                block.id,
                                                                {
                                                                    url: event
                                                                        .target
                                                                        .value,
                                                                },
                                                            )
                                                        }
                                                        readOnly={
                                                            !isComplexEditing
                                                        }
                                                        className="kb-editor__input"
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                                {isEditing ? (
                                                    <div className="kb-editor__link-actions">
                                                        {renderDeleteBlockButton(
                                                            block,
                                                            {
                                                                compact: true,
                                                            },
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </>
                                    ) : block.url.trim() !== '' ? (
                                        <a
                                            href={normalizeLinkHref(block.url)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="kb-editor__link-card"
                                            data-kb-ignore-edit-activation
                                        >
                                            <span className="kb-editor__link-icon">
                                                <Link2 className="size-4" />
                                            </span>
                                            <span className="kb-editor__link-content">
                                                <span className="kb-editor__link-title">
                                                    {block.title.trim() ||
                                                        'Открыть ссылку'}
                                                </span>
                                                <span className="kb-editor__link-url">
                                                    {block.url.trim() ||
                                                        'https://...'}
                                                </span>
                                            </span>
                                        </a>
                                    ) : (
                                        <div
                                            className="kb-editor__link-card"
                                            data-kb-ignore-edit-activation
                                        >
                                            <span className="kb-editor__link-icon">
                                                <Link2 className="size-4" />
                                            </span>
                                            <span className="kb-editor__link-content">
                                                <span className="kb-editor__link-title">
                                                    {block.title.trim() ||
                                                        'Ссылка без адреса'}
                                                </span>
                                                <span className="kb-editor__link-url">
                                                    Укажите адрес ссылки
                                                </span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {isEditing ? (
                <div className="kb-editor__footer">
                    <button
                        type="button"
                        onClick={(event) => toggleAddMenu('root', event)}
                        className="kb-editor__footer-btn"
                        data-editor-menu-trigger="add"
                    >
                        ＋ Добавить блок
                    </button>

                    {menuState?.kind === 'add' &&
                        menuState.targetId === 'root' && (
                            <BlockTypeMenu
                                className="kb-editor__menu-panel kb-editor__menu-panel--footer"
                                style={{
                                    top: `${menuState.top}px`,
                                    left: `${menuState.left}px`,
                                }}
                                onSelect={(type) =>
                                    insertBlockAfter('root', type)
                                }
                            />
                        )}
                </div>
            ) : null}

            <ConfirmModal
                open={deleteTarget !== null}
                title="Удалить блок"
                description={
                    deleteTarget
                        ? `Будет удален ${getBlockDeleteLabel(deleteTarget)} без возможности восстановления.`
                        : ''
                }
                confirmLabel="Удалить блок"
                danger
                onConfirm={confirmDeleteBlock}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
