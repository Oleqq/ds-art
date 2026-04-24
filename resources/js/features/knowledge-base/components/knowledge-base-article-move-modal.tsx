import { ChevronRight, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { KnowledgeBaseIcon } from '@/features/knowledge-base/components/knowledge-base-icon';
import type { KnowledgeBaseArticleMoveCategory } from '@/features/knowledge-base/types';

type MoveGroup = {
    id: number;
    name: string;
    icon: string | null;
    icon_image_url: string | null;
    items: KnowledgeBaseArticleMoveCategory[];
};

export function KnowledgeBaseArticleMoveModal({
    open,
    categories,
    articleTitle,
    title,
    description,
    currentLabel = 'Текущий раздел',
    actionLabel = 'Переместить',
    processing,
    onCancel,
    onSelect,
}: {
    open: boolean;
    categories: KnowledgeBaseArticleMoveCategory[];
    articleTitle: string;
    title?: string;
    description?: string;
    currentLabel?: string;
    actionLabel?: string;
    processing: boolean;
    onCancel: () => void;
    onSelect: (categoryId: number) => void;
}) {
    const [query, setQuery] = useState('');
    const [shouldRender, setShouldRender] = useState(open);
    const [isClosing, setIsClosing] = useState(false);
    const [collapsedGroupIds, setCollapsedGroupIds] = useState<number[]>([]);

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
            setCollapsedGroupIds([]);
        }, 150);

        return () => window.clearTimeout(closeTimer);
    }, [open, shouldRender]);

    const groups = useMemo<MoveGroup[]>(() => {
        const normalized = query.trim().toLowerCase();
        const filtered = categories.filter((category) => {
            if (normalized === '') {
                return true;
            }

            return [category.name, category.group_name ?? '']
                .join(' ')
                .toLowerCase()
                .includes(normalized);
        });

        return filtered.reduce<MoveGroup[]>((accumulator, category) => {
            const groupId = category.group_id ?? category.id;
            const existingGroup = accumulator.find((group) => group.id === groupId);

            if (existingGroup) {
                existingGroup.items.push(category);
                return accumulator;
            }

            accumulator.push({
                id: groupId,
                name: category.group_name ?? category.name,
                icon: category.group_icon ?? category.icon ?? null,
                icon_image_url: category.group_icon_image_url ?? category.icon_image_url ?? null,
                items: [category],
            });

            return accumulator;
        }, []);
    }, [categories, query]);

    const toggleGroup = (groupId: number) => {
        setCollapsedGroupIds((current) =>
            current.includes(groupId)
                ? current.filter((currentId) => currentId !== groupId)
                : [...current, groupId],
        );
    };

    if (!shouldRender) {
        return null;
    }

    return (
        <div className={isClosing ? 'modal-shell is-closing' : 'modal-shell'} role="dialog" aria-modal="true">
            <button
                type="button"
                onClick={onCancel}
                className="modal-shell__backdrop"
                aria-label="Закрыть окно перемещения"
            />

            <div className="modal-shell__card modal-shell__card--confirm kb-move-modal-card">
                <div className="modal-shell__head">
                    <div>
                        <div className="modal-shell__title">{title ?? 'Переместить статью'}</div>
                        <p className="modal-shell__description">
                            {description ?? `Выберите раздел, в который нужно переместить статью «${articleTitle}».`}
                        </p>
                    </div>

                    <button type="button" onClick={onCancel} className="modal-shell__close">
                        <X className="size-4" />
                    </button>
                </div>

                <div className="kb-move-modal">
                    <div className="kb-move-modal__search-wrap">
                        <Search className="kb-move-modal__search-icon size-4" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            className="kb-move-modal__search"
                            placeholder="Поиск раздела..."
                        />
                    </div>

                    <div className="kb-move-modal__list">
                        {groups.length > 0 ? (
                            groups.map((group) => (
                                <div key={group.id} className="kb-move-modal__group">
                                    <button
                                        type="button"
                                        className="kb-move-modal__group-label"
                                        onClick={() => toggleGroup(group.id)}
                                        aria-expanded={!collapsedGroupIds.includes(group.id)}
                                    >
                                        <ChevronRight
                                            className={`kb-move-modal__group-chevron ${
                                                collapsedGroupIds.includes(group.id) ? '' : 'is-open'
                                            }`}
                                        />
                                        <KnowledgeBaseIcon
                                            icon={group.icon}
                                            imageUrl={group.icon_image_url ?? null}
                                            className="kb-move-modal__group-icon"
                                            imageClassName="kb-move-modal__group-icon-image"
                                        />
                                        <span>{group.name}</span>
                                    </button>

                                    <div
                                        className={`kb-move-modal__group-items ${
                                            collapsedGroupIds.includes(group.id) && query.trim() === ''
                                                ? 'is-collapsed'
                                                : ''
                                        }`}
                                    >
                                        {group.items.map((category) => (
                                            <button
                                                key={category.id}
                                                type="button"
                                                disabled={category.is_current || processing}
                                                onClick={() => onSelect(category.id)}
                                                className={`kb-move-modal__item ${category.is_current ? 'is-current' : ''}`}
                                            >
                                                <span className="kb-move-modal__item-main">
                                                    <KnowledgeBaseIcon
                                                        icon={category.icon}
                                                        imageUrl={category.icon_image_url ?? null}
                                                        className="kb-move-modal__item-icon"
                                                        imageClassName="kb-move-modal__item-icon-image"
                                                    />
                                                    <span
                                                        className="kb-move-modal__item-name"
                                                        style={{
                                                            paddingLeft: `${Math.max((category.depth ?? 0) - 1, 0) * 14}px`,
                                                        }}
                                                    >
                                                        {category.name}
                                                    </span>
                                                </span>

                                                {category.is_current ? (
                                                    <span className="kb-move-modal__item-state">{currentLabel}</span>
                                                ) : (
                                                    <span className="kb-move-modal__item-action">{actionLabel}</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="kb-move-modal__empty">Ничего не найдено</div>
                        )}
                    </div>
                </div>

                <div className="modal-shell__footer">
                    <button type="button" onClick={onCancel} className="modal-shell__cancel" disabled={processing}>
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
}
