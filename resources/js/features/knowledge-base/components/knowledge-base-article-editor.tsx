import {
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
import { Check, Copy, ImagePlus, Link2, Paperclip, Play } from 'lucide-react';
import { toast } from 'sonner';
import type { KnowledgeBaseArticleBlock } from '@/features/knowledge-base/types';

type UploadResult = {
    url: string;
    name?: string;
    size_label?: string;
};

type KnowledgeBaseArticleEditorProps = {
    blocks: KnowledgeBaseArticleBlock[];
    onChange: (blocks: KnowledgeBaseArticleBlock[]) => void;
    onUploadAsset: (kind: 'image' | 'file' | 'video', file: File) => Promise<UploadResult>;
    isEditing?: boolean;
};

type BlockTypeOption = {
    type: KnowledgeBaseArticleBlock['type'];
    label: string;
    hint: string;
};

type ToolbarState = {
    blockId: string;
    top: number;
    left: number;
    linkUrl: string;
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
    { type: 'p', label: 'Текст', hint: 'Обычный абзац' },
    { type: 'h2', label: 'Заголовок', hint: 'Крупный заголовок' },
    { type: 'h3', label: 'Подзаголовок', hint: 'Заголовок раздела' },
    { type: 'ul', label: 'Список', hint: 'Маркированный список' },
    { type: 'ol', label: 'Нумерованный', hint: 'Нумерованный список' },
    { type: 'quote', label: 'Цитата', hint: 'Выделенная цитата' },
    { type: 'code', label: 'Код', hint: 'Блок кода' },
    { type: 'link', label: 'Ссылка', hint: 'Кликабельная ссылка' },
    { type: 'image', label: 'Изображение', hint: 'Картинка' },
    { type: 'table', label: 'Таблица', hint: 'Редактируемая таблица' },
    { type: 'file', label: 'Файл', hint: 'Прикрепленный файл' },
    { type: 'video', label: 'Видео', hint: 'YouTube / Vimeo / файл' },
];

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
            return '▦';
        case 'file':
            return '📎';
        case 'video':
            return '▶';
    }
}

function createId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function createBlock(type: KnowledgeBaseArticleBlock['type']): KnowledgeBaseArticleBlock {
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
            return { id, type, url: '', caption: '' };
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
            };
        case 'link':
            return { id, type, url: '', title: '', caption: '' };
    }
}

function convertBlock(
    current: KnowledgeBaseArticleBlock,
    nextType: KnowledgeBaseArticleBlock['type'],
): KnowledgeBaseArticleBlock {
    const next = createBlock(nextType);

    if ('content' in current && 'content' in next) {
        return { ...next, content: current.content, html: current.html ?? current.content };
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

function normalizeRichTextHtml(html: string) {
    return html.replace(/\u00a0/g, ' ').trim();
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

function EditableRichTextBlock({
    as,
    className,
    blockId,
    value,
    html,
    placeholder,
    onChange,
    onCreateNextBlock,
    isEditable = true,
}: {
    as: keyof JSX.IntrinsicElements;
    className: string;
    blockId: string;
    value: string;
    html?: string;
    placeholder: string;
    onChange: (payload: { content: string; html: string }) => void;
    onCreateNextBlock: () => void;
    isEditable?: boolean;
}) {
    const ref = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!ref.current) {
            return;
        }

        const nextHtml = html && html.trim() !== '' ? html : value;

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
        onBlur: isEditable ? syncContent : undefined,
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
    isEditable = true,
}: {
    type: 'ul' | 'ol';
    blockId: string;
    items: string[];
    onChange: (items: string[]) => void;
    isEditable?: boolean;
}) {
    const ref = useRef<HTMLOListElement | HTMLUListElement | null>(null);

    useEffect(() => {
        if (!ref.current) {
            return;
        }

        const currentItems = Array.from(ref.current.querySelectorAll('li')).map((item) => item.textContent ?? '');
        const nextItems = items.length > 0 ? items : [''];

        if (JSON.stringify(currentItems) !== JSON.stringify(nextItems)) {
            ref.current.innerHTML = '';

            nextItems.forEach((item) => {
                const listItem = document.createElement('li');
                listItem.textContent = item;
                ref.current?.appendChild(listItem);
            });
        }
    }, [items]);

    const syncItems = () => {
        if (!ref.current) {
            return;
        }

        const nextItems = Array.from(ref.current.querySelectorAll('li')).map((item) => item.textContent ?? '');
        onChange(nextItems.length > 0 ? nextItems : ['']);
    };

    return createElement(type, {
        ref,
        contentEditable: isEditable,
        suppressContentEditableWarning: true,
        className: `kb-editor__list block-${type}`,
        'data-ph': 'Элемент списка…',
        'data-block-focus': blockId,
        onInput: isEditable ? syncItems : undefined,
        onBlur: isEditable ? syncItems : undefined,
        onKeyDown: (event: ReactKeyboardEvent<HTMLOListElement | HTMLUListElement>) => {
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

    useEffect(() => {
        if (!ref.current) {
            return;
        }

        if ((ref.current.textContent ?? '') !== value) {
            ref.current.textContent = value;
        }
    }, [value]);

    return (
        <div
            ref={ref}
            contentEditable={isEditable}
            suppressContentEditableWarning
            className="kb-editor__table-cell"
            data-table-cell={`${blockId}:${rowIndex}:${cellIndex}`}
            data-block-focus={rowIndex === 0 && cellIndex === 0 ? blockId : undefined}
            onInput={isEditable ? (event) => onChange(event.currentTarget.textContent ?? '') : undefined}
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
        <div className={`kb-editor__type-menu ${className}`.trim()} style={style} data-editor-menu-panel>
            {BLOCK_TYPE_OPTIONS.map((option) => (
                <button
                    key={option.type}
                    type="button"
                    onClick={() => onSelect(option.type)}
                    className="kb-editor__type-option"
                >
                    <span className="kb-editor__type-option-icon" aria-hidden="true">
                        {blockTypeSymbol(option.type)}
                    </span>
                    <span className="kb-editor__type-option-title">{option.label}</span>
                    <span className="kb-editor__type-option-hint">{option.hint}</span>
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
    const convertTypes = ['p', 'h2', 'h3', 'quote', 'ul', 'ol'] as Array<KnowledgeBaseArticleBlock['type']>;

    return createPortal(
        <div className="kb-editor__action-menu" style={style} data-editor-menu-panel>
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
                    <span className="kb-editor__action-label">Конвертировать в</span>
                    <span className="kb-editor__action-chevron" aria-hidden="true">
                        ›
                    </span>
                </button>

                {isConvertOpen ? (
                    <div className="kb-editor__action-submenu">
                        {BLOCK_TYPE_OPTIONS.filter(
                            (option) => option.type !== block.type && convertTypes.includes(option.type),
                        ).map((option) => (
                            <button
                                key={option.type}
                                type="button"
                                onClick={() => onConvert(option.type)}
                                className="kb-editor__action-item"
                            >
                                <span className="kb-editor__action-icon" aria-hidden="true">
                                    {blockTypeSymbol(option.type)}
                                </span>
                                <span className="kb-editor__action-label">{option.label}</span>
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

            <button type="button" onClick={onDelete} className="kb-editor__action-item is-danger">
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
    onClose,
    onApplyLink,
}: {
    state: ToolbarState;
    onClose: () => void;
    onApplyLink: (url: string | null) => void;
}) {
    const [linkValue, setLinkValue] = useState(state.linkUrl);
    const [showLinkInput, setShowLinkInput] = useState(false);

    const runCommand = (command: string) => {
        document.execCommand(command, false, undefined);
    };

    return (
        <div
            className="inline-toolbar"
            style={{
                top: `${state.top}px`,
                left: `${state.left}px`,
                transform: 'translate(-50%, -100%)',
            }}
            onMouseDown={(event) => event.preventDefault()}
        >
            <button type="button" className="itb-btn" onMouseDown={() => runCommand('bold')}>
                <b>Ж</b>
            </button>
            <button type="button" className="itb-btn" onMouseDown={() => runCommand('italic')}>
                <i>К</i>
            </button>
            <button type="button" className="itb-btn" onMouseDown={() => runCommand('underline')}>
                <u>Ч</u>
            </button>
            <button type="button" className="itb-btn" onMouseDown={() => runCommand('strikeThrough')}>
                <s>З</s>
            </button>
            <div className="itb-sep" />
            <button
                type="button"
                className={`itb-btn ${showLinkInput ? 'active' : ''}`}
                onMouseDown={() => setShowLinkInput((current) => !current)}
            >
                🔗
            </button>

            {showLinkInput ? (
                <div className="itb-link-row">
                    <input
                        value={linkValue}
                        onChange={(event) => setLinkValue(event.target.value)}
                        className="itb-link-input"
                        placeholder="https://…"
                    />
                    <button
                        type="button"
                        className="itb-btn"
                        onMouseDown={() => {
                            onApplyLink(linkValue.trim() === '' ? null : linkValue.trim());
                            setShowLinkInput(false);
                            onClose();
                        }}
                    >
                        ✓
                    </button>
                    <button
                        type="button"
                        className="itb-btn"
                        onMouseDown={() => {
                            onApplyLink(null);
                            setShowLinkInput(false);
                            onClose();
                        }}
                    >
                        ✕
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
}: KnowledgeBaseArticleEditorProps & { headingAnchors?: Record<string, string> }) {
    const [menuState, setMenuState] = useState<EditorMenuState | null>(null);
    const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
    const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);
    const [toolbarState, setToolbarState] = useState<ToolbarState | null>(null);
    const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
    const [dropIndicator, setDropIndicator] = useState<DropIndicatorState | null>(null);
    const [completedAssetBlockIds, setCompletedAssetBlockIds] = useState<Set<string>>(() => new Set());
    const [editingComplexBlockIds, setEditingComplexBlockIds] = useState<Set<string>>(() => new Set());
    const savedRangeRef = useRef<Range | null>(null);
    const pendingFocusRef = useRef<FocusRequest | null>(null);
    const dragPointerRef = useRef<{
        blockId: string;
        startX: number;
        startY: number;
        isDragging: boolean;
        targetId: string | null;
        position: 'before' | 'after';
    } | null>(null);
    const suppressNextActionClickRef = useRef(false);

    const safeBlocks = useMemo(() => (blocks.length === 0 ? [createBlock('p')] : blocks), [blocks]);

    const updateBlocks = (nextBlocks: KnowledgeBaseArticleBlock[]) => {
        onChange(nextBlocks);
    };

    const markAssetBlockComplete = (blockId: string) => {
        setCompletedAssetBlockIds((current) => new Set(current).add(blockId));
    };

    const markAssetBlockEditable = (blockId: string) => {
        setCompletedAssetBlockIds((current) => {
            const next = new Set(current);
            next.delete(blockId);
            return next;
        });
    };

    const startComplexBlockEditing = (blockId: string) => {
        setEditingComplexBlockIds((current) => new Set(current).add(blockId));
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
        block.type === 'p' || block.type === 'h2' || block.type === 'h3' || block.type === 'quote';

    const hasComplexBlockContent = (block: KnowledgeBaseArticleBlock) => {
        if (block.type === 'table') {
            return block.rows.some((row) => row.some((cell) => cell.trim() !== ''));
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

    const clampMenuPosition = (left: number, top: number, menuWidth: number, menuHeight: number) => {
        const viewportPadding = 8;

        if (left + menuWidth > window.innerWidth - viewportPadding) {
            left = window.innerWidth - menuWidth - viewportPadding;
        }

        if (top + menuHeight > window.innerHeight - viewportPadding) {
            top = Math.max(viewportPadding, window.innerHeight - menuHeight - viewportPadding);
        }

        return {
            left: Math.max(viewportPadding, left),
            top,
        };
    };

    const resolveAddMenuPosition = (rect: DOMRect, menuHeight: number) =>
        clampMenuPosition(rect.left - 10, rect.bottom + 4, 214, menuHeight);

    const resolveActionMenuPosition = (rect: DOMRect, menuHeight: number) =>
        clampMenuPosition(rect.left + 14, rect.top - 8, 182, menuHeight);

    const patchBlock = (id: string, patch: Partial<KnowledgeBaseArticleBlock>) => {
        updateBlocks(
            safeBlocks.map((block) => (block.id === id ? ({ ...block, ...patch } as KnowledgeBaseArticleBlock) : block)),
        );
    };

    const replaceBlock = (id: string, nextBlock: KnowledgeBaseArticleBlock) => {
        updateBlocks(safeBlocks.map((block) => (block.id === id ? nextBlock : block)));
    };

    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();

            if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
                window.setTimeout(() => {
                    const current = window.getSelection();
                    if (!current || current.isCollapsed || current.toString().trim() === '') {
                        setToolbarState(null);
                        savedRangeRef.current = null;
                    }
                }, 120);

                return;
            }

            const anchor = selection.anchorNode;
            const editable = (anchor?.nodeType === Node.TEXT_NODE ? anchor.parentElement : (anchor as Element | null))?.closest(
                '[data-rich-block-id]',
            ) as HTMLElement | null;

            if (!editable) {
                setToolbarState(null);
                savedRangeRef.current = null;
                return;
            }

            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            if (!rect.width && !rect.height) {
                return;
            }

            const blockId = editable.dataset.richBlockId;

            if (!blockId) {
                return;
            }

            const linkNode = (selection.anchorNode?.nodeType === Node.TEXT_NODE
                ? selection.anchorNode.parentElement
                : (selection.anchorNode as Element | null))?.closest('a');

            savedRangeRef.current = range.cloneRange();
            setToolbarState({
                blockId,
                top: window.scrollY + rect.top - 12,
                left: window.scrollX + rect.left + rect.width / 2,
                linkUrl: linkNode instanceof HTMLAnchorElement ? linkNode.href : '',
            });
        };

        document.addEventListener('selectionchange', handleSelectionChange);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
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

            if (target.closest('[data-editor-menu-trigger]') || target.closest('[data-editor-menu-panel]')) {
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
                const node = document.querySelector(`[data-block-focus="${nextFocus.blockId}"]`) as HTMLElement | null;

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

    const restoreSelection = () => {
        const selection = window.getSelection();
        if (!selection || !savedRangeRef.current) {
            return false;
        }

        selection.removeAllRanges();
        selection.addRange(savedRangeRef.current);

        return true;
    };

    const syncRichBlockFromDom = (blockId: string) => {
        const node = document.querySelector(`[data-rich-block-id="${blockId}"]`) as HTMLElement | null;

        if (!node) {
            return;
        }

        patchBlock(blockId, {
            content: node.textContent ?? '',
            html: normalizeRichTextHtml(node.innerHTML),
        });
    };

    const applyInlineLink = (url: string | null) => {
        if (!toolbarState || !restoreSelection()) {
            return;
        }

        if (!url) {
            document.execCommand('unlink', false, undefined);
        } else {
            document.execCommand('createLink', false, url);

            const selection = window.getSelection();
            const linkNode = (selection?.anchorNode?.nodeType === Node.TEXT_NODE
                ? selection?.anchorNode.parentElement
                : (selection?.anchorNode as Element | null))?.closest('a');

            if (linkNode instanceof HTMLAnchorElement) {
                linkNode.target = '_blank';
                linkNode.rel = 'noreferrer';
            }
        }

        syncRichBlockFromDom(toolbarState.blockId);
    };

    const insertBlockAfter = (afterId: string | 'root', type: KnowledgeBaseArticleBlock['type']) => {
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

    const updateTableCell = (blockId: string, rowIndex: number, cellIndex: number, value: string) => {
        const block = safeBlocks.find((current) => current.id === blockId);

        if (!block || block.type !== 'table') {
            return;
        }

        const nextRows = block.rows.map((currentRow) => [...currentRow]);
        nextRows[rowIndex][cellIndex] = value;
        patchBlock(blockId, { rows: nextRows });
    };

    const focusTableCell = (blockId: string, rowIndex: number, cellIndex: number) => {
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
        const sourceIndex = nextBlocks.findIndex((block) => block.id === sourceId);
        const targetIndex = nextBlocks.findIndex((block) => block.id === targetId);

        if (sourceIndex < 0 || targetIndex < 0) {
            return;
        }

        const [sourceBlock] = nextBlocks.splice(sourceIndex, 1);
        const baseIndex = nextBlocks.findIndex((block) => block.id === targetId);
        const insertIndex = position === 'before' ? baseIndex : baseIndex + 1;

        nextBlocks.splice(insertIndex, 0, sourceBlock);
        updateBlocks(nextBlocks);
    };

    const clearDragState = () => {
        setDraggedBlockId(null);
        setDropIndicator(null);
        dragPointerRef.current = null;
    };

    const handleBlockPointerDown = (blockId: string, event: ReactPointerEvent<HTMLButtonElement>) => {
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

            const distance = Math.hypot(moveEvent.clientX - dragState.startX, moveEvent.clientY - dragState.startY);

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
            const position = moveEvent.clientY < rect.top + rect.height / 2 ? 'before' : 'after';

            dragState.targetId = targetId;
            dragState.position = position;

            setDropIndicator((current) => {
                if (current?.targetId === targetId && current.position === position) {
                    return current;
                }

                return { targetId, position };
            });
        };

        const handlePointerUp = () => {
            const dragState = dragPointerRef.current;

            if (dragState?.isDragging && dragState.targetId) {
                moveBlockToPosition(dragState.blockId, dragState.targetId, dragState.position);
            }

            clearDragState();
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove, { passive: false });
        window.addEventListener('pointerup', handlePointerUp, { once: true });
    };

    const deleteBlock = (id: string) => {
        const nextBlocks = safeBlocks.filter((block) => block.id !== id);
        updateBlocks(nextBlocks.length === 0 ? [createBlock('p')] : nextBlocks);
        setMenuState(null);
    };

    const uploadForBlock = async (block: KnowledgeBaseArticleBlock, file: File) => {
        const kind: 'image' | 'file' | 'video' = block.type === 'image' || block.type === 'video' ? block.type : 'file';

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

    const copyCode = async (block: Extract<KnowledgeBaseArticleBlock, { type: 'code' }>) => {
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

    const toggleActionMenu = (blockId: string, event: ReactMouseEvent<HTMLButtonElement>) => {
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

    return (
        <div className={`kb-editor ${isEditing ? 'is-editing' : 'is-viewing'}`}>
            {toolbarState ? (
                <InlineToolbar
                    state={toolbarState}
                    onClose={() => setToolbarState(null)}
                    onApplyLink={applyInlineLink}
                />
            ) : null}

            {safeBlocks.map((block, index) => {
                const isUploading = uploadingBlockId === block.id;
                const isCodeCopied = copiedBlockId === block.id;
                const isComplexBlock = !isTextBlock(block);
                const isComplexEditing = isEditing && (!isComplexBlock || editingComplexBlockIds.has(block.id));
                const isAssetCompleted =
                    completedAssetBlockIds.has(block.id) || (isComplexBlock && hasComplexBlockContent(block) && !isComplexEditing);
                const lineClassName = [
                    'kb-editor__line',
                    'kb-block',
                    isComplexBlock ? 'kb-block--complex' : '',
                    isComplexEditing ? 'is-complex-editing' : '',
                    draggedBlockId === block.id ? 'is-dragging' : '',
                    dropIndicator?.targetId === block.id && dropIndicator.position === 'before'
                        ? 'is-drop-before'
                        : '',
                    dropIndicator?.targetId === block.id && dropIndicator.position === 'after'
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
                                onClick={(event) => toggleAddMenu(block.id, event)}
                                className="kb-editor__ghost-btn kb-add-inline"
                                data-editor-menu-trigger="add"
                                aria-label="Добавить блок"
                            >
                                +
                            </button>

                            <button
                                type="button"
                                onPointerDown={(event) => handleBlockPointerDown(block.id, event)}
                                onClick={(event) => {
                                    if (suppressNextActionClickRef.current) {
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

                            {menuState?.kind === 'add' && menuState.targetId === block.id ? (
                                <BlockTypeMenu
                                    className="kb-editor__menu-panel kb-editor__menu-panel--add"
                                    style={{
                                        top: `${menuState.top}px`,
                                        left: `${menuState.left}px`,
                                    }}
                                    onSelect={(type) => insertBlockAfter(block.id, type)}
                                />
                            ) : null}

                            {menuState?.kind === 'actions' && menuState.blockId === block.id ? (
                                <BlockActionMenu
                                    block={block}
                                    canMoveUp={index > 0}
                                    canMoveDown={index < safeBlocks.length - 1}
                                    onConvert={(type) => {
                                        replaceBlock(block.id, convertBlock(block, type));
                                        setMenuState(null);
                                    }}
                                    onMoveUp={() => moveBlock(block.id, -1)}
                                    onMoveDown={() => moveBlock(block.id, 1)}
                                    onDelete={() => deleteBlock(block.id)}
                                    style={{
                                        top: `${menuState.top}px`,
                                        left: `${menuState.left}px`,
                                    }}
                                />
                            ) : null}
                        </div>
                        ) : null}

                        <div className="kb-editor__line-body">
                            {isEditing && isComplexBlock && !isComplexEditing ? (
                                <button
                                    type="button"
                                    className="kb-editor__block-edit-btn"
                                    onClick={() => startComplexBlockEditing(block.id)}
                                >
                                    Редактировать
                                </button>
                            ) : null}

                            {(block.type === 'p' || block.type === 'h2' || block.type === 'h3' || block.type === 'quote') && (
                                <EditableRichTextBlock
                                    as={block.type === 'quote' ? 'blockquote' : block.type}
                                    blockId={block.id}
                                    value={block.content}
                                    html={block.html}
                                    onChange={(payload) => patchBlock(block.id, payload)}
                                    onCreateNextBlock={() => insertBlockAfter(block.id, 'p')}
                                    isEditable={isEditing}
                                    className={`kb-editor__text-block block-${block.type}`}
                                    placeholder={
                                        block.type === 'p'
                                            ? 'Начните вводить текст…'
                                            : block.type === 'h2'
                                              ? 'Заголовок'
                                              : block.type === 'h3'
                                                ? 'Подзаголовок'
                                                : 'Цитата…'
                                    }
                                />
                            )}

                            {(block.type === 'ul' || block.type === 'ol') && (
                                <EditableListBlock
                                    type={block.type}
                                    blockId={block.id}
                                    items={block.items}
                                    isEditable={isComplexEditing}
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
                                            onChange={(event) => patchBlock(block.id, { language: event.target.value })}
                                            readOnly={!isComplexEditing}
                                            className="kb-editor__code-language"
                                            data-block-focus={block.id}
                                            placeholder="// Код здесь..."
                                        />

                                        <button
                                            type="button"
                                            onClick={() => copyCode(block)}
                                            className="kb-editor__code-copy"
                                        >
                                            {isCodeCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
                                            {isCodeCopied ? 'Скопировано' : 'Копировать'}
                                        </button>
                                    </div>

                                    <textarea
                                        value={block.code}
                                        onChange={(event) => patchBlock(block.id, { code: event.target.value })}
                                        readOnly={!isComplexEditing}
                                        className="kb-editor__textarea kb-editor__textarea--code"
                                        placeholder="// Код здесь..."
                                    />
                                </div>
                            )}

                            {block.type === 'table' && (
                                <div className="kb-editor__table-shell">
                                    <div className="kb-editor__table-wrap">
                                        <table className="kb-editor__table">
                                            <tbody>
                                                {block.rows.map((row, rowIndex) => (
                                                    <tr key={`${block.id}-${rowIndex}`}>
                                                        {row.map((cell, cellIndex) => (
                                                            <td key={`${block.id}-${rowIndex}-${cellIndex}`}>
                                                                <EditableTableCell
                                                                    blockId={block.id}
                                                                    rowIndex={rowIndex}
                                                                    cellIndex={cellIndex}
                                                                    value={cell}
                                                                    isEditable={isComplexEditing}
                                                                    onChange={(value) =>
                                                                        updateTableCell(block.id, rowIndex, cellIndex, value)
                                                                    }
                                                                    onTabNext={() => {
                                                                        if (cellIndex + 1 < row.length) {
                                                                            focusTableCell(block.id, rowIndex, cellIndex + 1);
                                                                            return;
                                                                        }

                                                                        if (rowIndex + 1 < block.rows.length) {
                                                                            focusTableCell(block.id, rowIndex + 1, 0);
                                                                        }
                                                                    }}
                                                                />
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
                                                patchBlock(block.id, {
                                                    rows: [...block.rows, new Array(block.rows[0]?.length || 3).fill('')],
                                                });
                                                focusTableCell(block.id, block.rows.length, 0);
                                            }}
                                        >
                                            + Строка
                                        </button>
                                        <button
                                            type="button"
                                            className="kb-editor__table-btn"
                                            onClick={() => {
                                                patchBlock(block.id, {
                                                    rows: block.rows.map((row) => [...row, '']),
                                                });
                                                focusTableCell(block.id, 0, block.rows[0]?.length ?? 0);
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

                                                patchBlock(block.id, { rows: block.rows.slice(0, -1) });
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

                                                patchBlock(block.id, {
                                                    rows: block.rows.map((row) => row.slice(0, -1)),
                                                });
                                            }}
                                        >
                                            - Столбец
                                        </button>
                                    </div>
                                    ) : null}
                                </div>
                            )}

                            {block.type === 'image' && (
                                <div className="kb-editor__asset-block">
                                    {isAssetCompleted && block.url ? (
                                        <>
                                            <img src={block.url} alt="" className="kb-editor__image-preview" />
                                            {block.caption ? (
                                                <div className="kb-editor__asset-caption">{block.caption}</div>
                                            ) : null}
                                            <div className="kb-editor__asset-actions">
                                                <button
                                                    type="button"
                                                    className="kb-editor__inline-upload"
                                                    onClick={() => {
                                                        markAssetBlockEditable(block.id);
                                                        startComplexBlockEditing(block.id);
                                                    }}
                                                >
                                                    Редактировать
                                                </button>
                                            </div>
                                        </>
                                    ) : block.url ? (
                                        <img src={block.url} alt="" className="kb-editor__image-preview" />
                                    ) : (
                                        <label className="kb-editor__upload-placeholder">
                                            <input
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
                                                className="hidden"
                                                onChange={(event) => {
                                                    const file = event.target.files?.[0];
                                                    if (file) {
                                                        void uploadForBlock(block, file);
                                                    }
                                                }}
                                            />
                                            <ImagePlus className="size-4" />
                                            {isUploading ? 'Загрузка...' : 'Нажмите, чтобы загрузить изображение'}
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
                                                        const file = event.target.files?.[0];
                                                        if (file) {
                                                            void uploadForBlock(block, file);
                                                        }
                                                    }}
                                                />
                                                <ImagePlus className="size-4" />
                                                {block.url ? 'Заменить изображение' : 'Выбрать изображение'}
                                            </label>

                                            {block.url ? (
                                                <button
                                                    type="button"
                                                    className="kb-editor__inline-upload kb-editor__inline-upload--success"
                                                    onClick={() => finishComplexBlockEditing(block.id)}
                                                >
                                                    Готово
                                                </button>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    {!isAssetCompleted ? (
                                        <input
                                            value={block.caption}
                                            onChange={(event) => patchBlock(block.id, { caption: event.target.value })}
                                            className="kb-editor__input"
                                            data-block-focus={block.id}
                                            placeholder="Подпись к изображению"
                                        />
                                    ) : null}
                                </div>
                            )}

                            {block.type === 'file' && (
                                <div className="kb-editor__file-box">
                                    {isAssetCompleted && (block.url || block.name) ? (
                                        <>
                                            <div className="kb-editor__file-drop kb-editor__file-drop--done">
                                                <Paperclip className="size-4" />
                                                <span>{block.name || 'Прикрепленный файл'}</span>
                                                {block.size_label ? <span>{block.size_label}</span> : null}
                                            </div>
                                            <div className="kb-editor__asset-actions">
                                                <button
                                                    type="button"
                                                    className="kb-editor__inline-upload"
                                                    onClick={() => {
                                                        markAssetBlockEditable(block.id);
                                                        startComplexBlockEditing(block.id);
                                                    }}
                                                >
                                                    Редактировать
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <label className="kb-editor__file-drop">
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={(event) => {
                                                        const file = event.target.files?.[0];
                                                        if (file) {
                                                            void uploadForBlock(block, file);
                                                        }
                                                    }}
                                                />
                                                <Paperclip className="size-4" />
                                                {isUploading ? 'Загрузка...' : block.name || 'Нажмите, чтобы прикрепить файл'}
                                            </label>

                                            <div className="kb-editor__file-grid">
                                                <input
                                                    value={block.name}
                                                    onChange={(event) => patchBlock(block.id, { name: event.target.value })}
                                                    className="kb-editor__input"
                                                    data-block-focus={block.id}
                                                    placeholder="Название файла"
                                                />
                                                <input
                                                    value={block.size_label}
                                                    onChange={(event) =>
                                                        patchBlock(block.id, { size_label: event.target.value })
                                                    }
                                                    className="kb-editor__input"
                                                    placeholder="Размер, например 2.4 МБ"
                                                />
                                            </div>

                                            {(block.url || block.name) ? (
                                                <div className="kb-editor__asset-actions">
                                                    <button
                                                        type="button"
                                                        className="kb-editor__inline-upload kb-editor__inline-upload--success"
                                                        onClick={() => finishComplexBlockEditing(block.id)}
                                                    >
                                                        Готово
                                                    </button>
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
                                            <video src={block.url} className="kb-editor__video-preview" controls />
                                            <div className="kb-editor__asset-actions">
                                                <button
                                                    type="button"
                                                    className="kb-editor__inline-upload"
                                                    onClick={() => {
                                                        markAssetBlockEditable(block.id);
                                                        startComplexBlockEditing(block.id);
                                                    }}
                                                >
                                                    Редактировать
                                                </button>
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
                                                        const file = event.target.files?.[0];
                                                        if (file) {
                                                            void uploadForBlock(block, file);
                                                        }
                                                    }}
                                                />
                                                <Play className="size-4" />
                                                {isUploading ? 'Загрузка...' : 'Нажмите, чтобы вставить видео'}
                                            </label>

                                            {block.url ? (
                                                <video src={block.url} className="kb-editor__video-preview" controls />
                                            ) : null}

                                            <input
                                                value={block.url}
                                                onChange={(event) => patchBlock(block.id, { url: event.target.value })}
                                                className="kb-editor__input"
                                                data-block-focus={block.id}
                                                placeholder="https://..."
                                            />

                                            <div className="kb-editor__asset-actions">
                                                <label className="kb-editor__inline-upload">
                                                    <input
                                                        type="file"
                                                        accept=".mp4,.mov,.webm,.m4v"
                                                        className="hidden"
                                                        onChange={(event) => {
                                                            const file = event.target.files?.[0];
                                                            if (file) {
                                                                void uploadForBlock(block, file);
                                                            }
                                                        }}
                                                    />
                                                    <Play className="size-4" />
                                                    {block.url ? 'Заменить видео' : 'Выбрать видео'}
                                                </label>

                                                {block.url ? (
                                                    <button
                                                        type="button"
                                                        className="kb-editor__inline-upload kb-editor__inline-upload--success"
                                                        onClick={() => finishComplexBlockEditing(block.id)}
                                                    >
                                                        Готово
                                                    </button>
                                                ) : null}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {block.type === 'link' && (
                                <div className="kb-editor__link-row">
                                    <div className="kb-editor__link-icon">
                                        <Link2 className="size-4" />
                                    </div>
                                    <input
                                        value={block.title}
                                        onChange={(event) => patchBlock(block.id, { title: event.target.value })}
                                        readOnly={!isComplexEditing}
                                        className="kb-editor__input kb-editor__input--title"
                                        data-block-focus={block.id}
                                        placeholder="Текст ссылки..."
                                    />
                                    <input
                                        value={block.url}
                                        onChange={(event) => patchBlock(block.id, { url: event.target.value })}
                                        readOnly={!isComplexEditing}
                                        className="kb-editor__input"
                                        placeholder="https://..."
                                    />
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

                {menuState?.kind === 'add' && menuState.targetId === 'root' && (
                    <BlockTypeMenu
                        className="kb-editor__menu-panel kb-editor__menu-panel--footer"
                        style={{
                            top: `${menuState.top}px`,
                            left: `${menuState.left}px`,
                        }}
                        onSelect={(type) => insertBlockAfter('root', type)}
                    />
                )}
            </div>
            ) : null}
        </div>
    );
}
