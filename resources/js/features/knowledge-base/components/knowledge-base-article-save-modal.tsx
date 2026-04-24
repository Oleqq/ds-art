import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { CalendarClock, CheckCircle2, Clock3, Tag, X } from 'lucide-react';

type SaveMode = 'publish' | 'draft' | 'scheduled';

function formatActionLabel(mode: SaveMode) {
    if (mode === 'draft') {
        return 'Оставить черновиком';
    }

    if (mode === 'scheduled') {
        return 'Запланировать публикацию';
    }

    return 'Опубликовать сейчас';
}

export function KnowledgeBaseArticleSaveModal({
    open,
    processing = false,
    initialMode,
    initialScheduledAt,
    initialTags,
    onCancel,
    onConfirm,
}: {
    open: boolean;
    processing?: boolean;
    initialMode: SaveMode;
    initialScheduledAt: string | null;
    initialTags: string[];
    onCancel: () => void;
    onConfirm: (payload: { mode: SaveMode; scheduledAt: string | null; tags: string[] }) => void;
}) {
    const [mode, setMode] = useState<SaveMode>(initialMode);
    const [scheduledAt, setScheduledAt] = useState(initialScheduledAt ?? '');
    const [tags, setTags] = useState<string[]>(initialTags);
    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
        if (!open) {
            return;
        }

        setMode(initialMode);
        setScheduledAt(initialScheduledAt ?? '');
        setTags(initialTags);
        setTagInput('');
    }, [initialMode, initialScheduledAt, initialTags, open]);

    const canSubmit = useMemo(() => {
        if (mode !== 'scheduled') {
            return true;
        }

        return scheduledAt.trim() !== '';
    }, [mode, scheduledAt]);

    const appendTag = () => {
        const normalized = tagInput.trim();

        if (!normalized || tags.includes(normalized) || tags.length >= 6) {
            setTagInput('');
            return;
        }

        setTags((current) => [...current, normalized]);
        setTagInput('');
    };

    const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();
        appendTag();
    };

    if (!open) {
        return null;
    }

    return (
        <div className="modal-shell" role="dialog" aria-modal="true">
            <button type="button" aria-label="Закрыть окно сохранения" className="modal-shell__backdrop" onClick={onCancel} />

            <div className="modal-shell__card kb-save-modal">
                <div className="modal-shell__head">
                    <div>
                        <div className="modal-shell__title">Сохранение статьи</div>
                        <p className="modal-shell__description">
                            Выберите, как сохранить материал, и добавьте теги для отображения и поиска.
                        </p>
                    </div>

                    <button type="button" className="modal-shell__close" onClick={onCancel}>
                        <X className="size-4" />
                    </button>
                </div>

                <div className="kb-save-modal__body">
                    <div className="kb-save-modal__modes">
                        <button
                            type="button"
                            className={`kb-save-modal__mode ${mode === 'publish' ? 'is-active' : ''}`}
                            onClick={() => setMode('publish')}
                        >
                            <span className="kb-save-modal__mode-icon">
                                <CheckCircle2 className="size-4" />
                            </span>
                            <span>
                                <strong>Опубликовать сейчас</strong>
                                <small>Статья будет видна по правам доступа сразу после сохранения.</small>
                            </span>
                        </button>

                        <button
                            type="button"
                            className={`kb-save-modal__mode ${mode === 'draft' ? 'is-active' : ''}`}
                            onClick={() => setMode('draft')}
                        >
                            <span className="kb-save-modal__mode-icon">
                                <Clock3 className="size-4" />
                            </span>
                            <span>
                                <strong>Оставить черновиком</strong>
                                <small>Черновик увидит автор и администратор.</small>
                            </span>
                        </button>

                        <button
                            type="button"
                            className={`kb-save-modal__mode ${mode === 'scheduled' ? 'is-active' : ''}`}
                            onClick={() => setMode('scheduled')}
                        >
                            <span className="kb-save-modal__mode-icon">
                                <CalendarClock className="size-4" />
                            </span>
                            <span>
                                <strong>Опубликовать позже</strong>
                                <small>Статья станет доступной по расписанию.</small>
                            </span>
                        </button>
                    </div>

                    {mode === 'scheduled' ? (
                        <div className="form-field">
                            <label htmlFor="article-scheduled-at">Дата и время публикации</label>
                            <input
                                id="article-scheduled-at"
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={(event) => setScheduledAt(event.target.value)}
                            />
                        </div>
                    ) : null}

                    <div className="form-field">
                        <label htmlFor="article-tag-input">Теги статьи</label>
                        <div className="kb-save-modal__tag-input">
                            <span className="kb-save-modal__tag-icon">
                                <Tag className="size-4" />
                            </span>
                            <input
                                id="article-tag-input"
                                type="text"
                                value={tagInput}
                                onChange={(event) => setTagInput(event.target.value)}
                                onKeyDown={handleTagKeyDown}
                                placeholder="Например: клиенты, отчеты, PM"
                            />
                            <button type="button" className="kb-atb-btn" onClick={appendTag}>
                                Добавить
                            </button>
                        </div>

                        {tags.length > 0 ? (
                            <div className="kb-save-modal__tags">
                                {tags.map((tag) => (
                                    <span key={tag} className="kb-card__status">
                                        {tag}
                                        <button
                                            type="button"
                                            className="kb-save-modal__tag-remove"
                                            onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="kb-save-modal__hint">До 6 тегов. Они будут показаны в статье и списках.</div>
                        )}
                    </div>
                </div>

                <div className="modal-shell__footer">
                    <button type="button" onClick={onCancel} disabled={processing} className="modal-shell__cancel">
                        Отмена
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            onConfirm({
                                mode,
                                scheduledAt: mode === 'scheduled' ? scheduledAt || null : null,
                                tags,
                            })
                        }
                        disabled={processing || !canSubmit}
                        className="modal-shell__save"
                    >
                        {formatActionLabel(mode)}
                    </button>
                </div>
            </div>
        </div>
    );
}
