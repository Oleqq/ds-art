import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const ICON_OPTIONS = [
    { icon: '', label: 'Без иконки', keywords: ['none', 'empty', 'без', 'убрать'] },
    { icon: '📁', label: 'Папка', keywords: ['раздел', 'категория', 'folder'] },
    { icon: '📂', label: 'Открытая папка', keywords: ['раздел', 'структура', 'folder'] },
    { icon: '📱', label: 'SMM', keywords: ['smm', 'смм', 'mobile'] },
    { icon: '🎯', label: 'Таргет', keywords: ['ads', 'таргет', 'маркетинг'] },
    { icon: '🎨', label: 'Дизайн', keywords: ['designer', 'дизайн', 'art'] },
    { icon: '✍️', label: 'Копирайтинг', keywords: ['copy', 'текст', 'контент'] },
    { icon: '📋', label: 'Проекты', keywords: ['project', 'проект', 'менеджмент'] },
    { icon: '📖', label: 'Гайд', keywords: ['книга', 'guide', 'инструкция'] },
    { icon: '📚', label: 'Библиотека', keywords: ['база', 'knowledge', 'обучение'] },
    { icon: '📄', label: 'Документ', keywords: ['документ', 'article', 'статья'] },
    { icon: '🗒️', label: 'Заметки', keywords: ['notes', 'черновик', 'draft'] },
    { icon: '📌', label: 'Важно', keywords: ['важно', 'pin', 'bookmark'] },
    { icon: '📎', label: 'Файл', keywords: ['file', 'attachment', 'вложение'] },
    { icon: '📸', label: 'Фото', keywords: ['photo', 'media', 'reels'] },
    { icon: '🎬', label: 'Видео', keywords: ['video', 'reels', 'контент'] },
    { icon: '💙', label: 'ВК', keywords: ['vk', 'community', 'соцсети'] },
    { icon: '🔵', label: 'Meta Ads', keywords: ['meta', 'ads', 'таргет'] },
    { icon: '🛠️', label: 'Инструменты', keywords: ['tools', 'service', 'инструменты'] },
    { icon: '🔍', label: 'Аналитика', keywords: ['поиск', 'seo', 'аналитика'] },
    { icon: '📈', label: 'Рост', keywords: ['growth', 'metrics', 'рост'] },
    { icon: '📊', label: 'Отчеты', keywords: ['report', 'dashboard', 'аналитика'] },
    { icon: '🧠', label: 'Знания', keywords: ['knowledge', 'обучение', 'база'] },
    { icon: '💼', label: 'Работа', keywords: ['работа', 'career', 'team'] },
    { icon: '🗂️', label: 'Архив', keywords: ['архив', 'archive', 'данные'] },
    { icon: '🧩', label: 'Процессы', keywords: ['процесс', 'workflow', 'system'] },
    { icon: '📣', label: 'Коммуникации', keywords: ['marketing', 'коммуникации', 'smm'] },
    { icon: '🚀', label: 'Запуск', keywords: ['growth', 'launch', 'старт'] },
    { icon: '⚙️', label: 'Настройки', keywords: ['settings', 'config', 'сервис'] },
    { icon: '🔒', label: 'Доступ', keywords: ['access', 'security', 'права'] },
    { icon: '🔑', label: 'Ключ', keywords: ['access', 'security', 'пароль'] },
    { icon: '👥', label: 'Команда', keywords: ['team', 'people', 'сотрудники'] },
    { icon: '🧑‍💻', label: 'Специалист', keywords: ['team', 'role', 'сотрудник'] },
    { icon: '🖼️', label: 'Медиа', keywords: ['media', 'image', 'обложка'] },
    { icon: '🧾', label: 'Регламент', keywords: ['регламент', 'policy', 'document'] },
    { icon: '✅', label: 'Чеклист', keywords: ['task', 'todo', 'checklist'] },
    { icon: '💡', label: 'Идея', keywords: ['idea', 'brainstorm', 'концепт'] },
    { icon: '📦', label: 'Ресурсы', keywords: ['assets', 'files', 'ресурсы'] },
    { icon: '🤖', label: 'Автоматизация', keywords: ['ai', 'automation', 'скрипты'] },
    { icon: '🧪', label: 'Тест', keywords: ['test', 'experiment', 'проверка'] },
    { icon: '🧭', label: 'Навигация', keywords: ['map', 'navigation', 'путь'] },
    { icon: '🧱', label: 'Структура', keywords: ['structure', 'blocks', 'система'] },
    { icon: '🧰', label: 'Набор', keywords: ['toolkit', 'tools', 'инструменты'] },
    { icon: '🪄', label: 'Магия', keywords: ['ai', 'creative', 'идея'] },
    { icon: '📝', label: 'Черновик', keywords: ['draft', 'заметки', 'notes'] },
    { icon: '🗓️', label: 'План', keywords: ['calendar', 'schedule', 'план'] },
    { icon: '⏱️', label: 'Время', keywords: ['time', 'deadline', 'срок'] },
    { icon: '💬', label: 'Диалог', keywords: ['chat', 'message', 'коммуникации'] },
    { icon: '📨', label: 'Письмо', keywords: ['email', 'message', 'почта'] },
    { icon: '🏷️', label: 'Метка', keywords: ['tag', 'label', 'тег'] },
    { icon: '⭐', label: 'Избранное', keywords: ['star', 'favorite', 'важно'] },
    { icon: '🔥', label: 'Горячее', keywords: ['hot', 'urgent', 'важно'] },
    { icon: '🌐', label: 'Сайт', keywords: ['web', 'site', 'лендинг'] },
    { icon: '🧲', label: 'Лиды', keywords: ['leads', 'clients', 'воронка'] },
    { icon: '🛒', label: 'Продажи', keywords: ['sales', 'shop', 'клиенты'] },
    { icon: '💳', label: 'Оплата', keywords: ['payment', 'finance', 'деньги'] },
    { icon: '🧑‍🎨', label: 'Креатив', keywords: ['creative', 'design', 'креатив'] },
    { icon: '🧑‍🏫', label: 'Обучение', keywords: ['education', 'training', 'курс'] },
    { icon: '🏁', label: 'Финиш', keywords: ['finish', 'ready', 'готово'] },
];

type KnowledgeBaseIconPickerProps = {
    open: boolean;
    anchorEl: HTMLElement | null;
    value?: string | null;
    onSelect: (icon: string) => void;
    onUploadRequest?: () => void;
    onClose: () => void;
};

export function KnowledgeBaseIconPicker({
    open,
    anchorEl,
    value,
    onSelect,
    onUploadRequest,
    onClose,
}: KnowledgeBaseIconPickerProps) {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const searchRef = useRef<HTMLInputElement | null>(null);
    const [query, setQuery] = useState('');
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [shouldRender, setShouldRender] = useState(open);
    const [isClosing, setIsClosing] = useState(false);

    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        if (!normalizedQuery) {
            return ICON_OPTIONS;
        }

        return ICON_OPTIONS.filter(({ icon, label, keywords }) =>
            [icon, label, ...keywords].join(' ').toLowerCase().includes(normalizedQuery),
        );
    }, [query]);

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
            setQuery('');
        }, 150);

        return () => window.clearTimeout(closeTimer);
    }, [open, shouldRender]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const focusTimer = window.setTimeout(() => {
            searchRef.current?.focus();
        }, 0);

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node | null;

            if (panelRef.current?.contains(target) || anchorEl?.contains(target)) {
                return;
            }

            onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handlePointerDown);

        return () => {
            window.clearTimeout(focusTimer);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handlePointerDown);
        };
    }, [anchorEl, onClose, open]);

    useLayoutEffect(() => {
        if (!shouldRender || !anchorEl) {
            return;
        }

        const rect = anchorEl.getBoundingClientRect();
        const width = 320;
        const viewportPadding = 12;
        const left = Math.min(rect.left, window.innerWidth - width - viewportPadding);

        setPosition({
            top: rect.bottom + 8,
            left: Math.max(viewportPadding, left),
        });
    }, [anchorEl, shouldRender]);

    if (!shouldRender || !anchorEl) {
        return null;
    }

    return createPortal(
        <div
            ref={panelRef}
            className={`kb-icon-picker__panel ${isClosing ? 'is-closing' : ''}`}
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
            }}
        >
            <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="kb-icon-picker__search"
                placeholder="Поиск иконки..."
            />

            {onUploadRequest ? (
                <button
                    type="button"
                    className="kb-icon-picker__upload"
                    onClick={() => {
                        onUploadRequest();
                        onClose();
                    }}
                >
                    Загрузить свою
                </button>
            ) : null}

            <div className="kb-icon-picker__grid">
                {filteredOptions.map(({ icon, label }) => (
                    <button
                        key={`${icon}-${label}`}
                        type="button"
                        title={label}
                        className={`kb-icon-picker__item ${value === icon ? 'is-selected' : ''}`}
                        onClick={() => {
                            onSelect(icon);
                            onClose();
                        }}
                    >
                        {icon || '∅'}
                    </button>
                ))}
            </div>
        </div>,
        document.body,
    );
}
