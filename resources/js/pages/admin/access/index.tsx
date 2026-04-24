import { Head, router } from '@inertiajs/react';
import {
    Eye,
    FileText,
    Pencil,
    Plus,
    Save,
    Trash2,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { KnowledgeBaseIcon } from '@/features/knowledge-base/components/knowledge-base-icon';
import AdminLayout from '@/layouts/admin-layout';

type AccessEmployee = {
    id: number;
    name: string;
    email: string;
    position: string;
    avatar: string | null;
    is_active: boolean;
};

type AccessPermission = {
    is_deactivated: boolean;
    can_view: boolean;
    can_create: boolean;
    can_update: boolean;
    can_delete: boolean;
    view_all_articles: boolean;
};

type AccessArticle = {
    id: number;
    title: string;
    slug: string;
    is_published: boolean;
    can_view: boolean;
    updated_at: string | null;
};

type AccessCategory = {
    id: number;
    parent_id: number | null;
    name: string;
    slug: string;
    icon: string | null;
    icon_image_url: string | null;
    default_visible: boolean;
    can_view: boolean;
    articles_count: number;
    articles: AccessArticle[];
};

type AccessIndexProps = {
    employees: AccessEmployee[];
    selectedUserId: number | null;
    permission: AccessPermission | null;
    categories: AccessCategory[];
};

type ToggleRowProps = {
    icon: ReactNode;
    title: string;
    hint: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
};

type AccessSwitchProps = {
    checked: boolean;
    disabled?: boolean;
    label: string;
    onChange: (checked: boolean) => void;
};

const fallbackPermission: AccessPermission = {
    is_deactivated: false,
    can_view: true,
    can_create: false,
    can_update: false,
    can_delete: false,
    view_all_articles: true,
};

const avatarColors = [
    '#D8ECFF',
    '#E8D6F7',
    '#FFE0BC',
    '#FFD0D8',
    '#BFE6E1',
    '#E7E0FF',
];

function initials(name: string): string {
    return name
        .split(' ')
        .map((part) => part.trim()[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function avatarColor(id: number): string {
    return avatarColors[id % avatarColors.length];
}

function AccessSwitch({
    checked,
    disabled = false,
    label,
    onChange,
}: AccessSwitchProps) {
    return (
        <label className={`access-toggle ${disabled ? 'is-disabled' : ''}`}>
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                aria-label={label}
                onChange={(event) => onChange(event.target.checked)}
            />
            <span className="access-slider" />
        </label>
    );
}

function ToggleRow({
    icon,
    title,
    hint,
    checked,
    disabled = false,
    onChange,
}: ToggleRowProps) {
    return (
        <div className={`access-perm-row ${disabled ? 'is-disabled' : ''}`}>
            <span className="access-perm-icon">{icon}</span>
            <span className="access-perm-body">
                <span className="access-perm-label">{title}</span>
                <span className="access-perm-hint">{hint}</span>
            </span>
            <AccessSwitch
                checked={checked}
                disabled={disabled}
                label={title}
                onChange={onChange}
            />
        </div>
    );
}

export default function AccessIndex({
    employees,
    selectedUserId,
    permission,
    categories,
}: AccessIndexProps) {
    const selectedEmployee =
        employees.find((employee) => employee.id === selectedUserId) ??
        employees[0] ??
        null;

    const [draftPermission, setDraftPermission] = useState<AccessPermission>(
        permission ?? fallbackPermission,
    );
    const [categoryIds, setCategoryIds] = useState<Set<number>>(
        () =>
            new Set(
                categories
                    .filter((category) => category.can_view)
                    .map((category) => category.id),
            ),
    );
    const [articleIds, setArticleIds] = useState<Set<number>>(
        () =>
            new Set(
                categories.flatMap((category) =>
                    category.articles
                        .filter((article) => article.can_view)
                        .map((article) => article.id),
                ),
            ),
    );
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setDraftPermission(permission ?? fallbackPermission);
        setCategoryIds(
            new Set(
                categories
                    .filter((category) => category.can_view)
                    .map((category) => category.id),
            ),
        );
        setArticleIds(
            new Set(
                categories.flatMap((category) =>
                    category.articles
                        .filter((article) => article.can_view)
                        .map((article) => article.id),
                ),
            ),
        );
    }, [permission, categories, selectedUserId]);

    const groupedCategories = useMemo(() => {
        const roots = categories.filter((category) => category.parent_id === null);
        const childrenByParent = new Map<number, AccessCategory[]>();

        categories
            .filter((category) => category.parent_id !== null)
            .forEach((category) => {
                const parentId = category.parent_id as number;
                const children = childrenByParent.get(parentId) ?? [];
                children.push(category);
                childrenByParent.set(parentId, children);
            });

        return roots.map((root) => ({
            root,
            children: childrenByParent.get(root.id) ?? [],
        }));
    }, [categories]);

    const selectEmployee = (employee: AccessEmployee) => {
        router.get(
            '/admin/access',
            { user: employee.id },
            {
                preserveScroll: true,
                preserveState: false,
            },
        );
    };

    const toggleCategory = (categoryId: number, checked: boolean) => {
        setCategoryIds((current) => {
            const next = new Set(current);

            if (checked) {
                next.add(categoryId);
            } else {
                next.delete(categoryId);
            }

            return next;
        });
    };

    const toggleArticle = (articleId: number, checked: boolean) => {
        setArticleIds((current) => {
            const next = new Set(current);

            if (checked) {
                next.add(articleId);
            } else {
                next.delete(articleId);
            }

            return next;
        });
    };

    const save = () => {
        if (!selectedEmployee) {
            return;
        }

        setIsSaving(true);

        router.patch(
            `/admin/access/users/${selectedEmployee.id}`,
            {
                ...draftPermission,
                category_ids: Array.from(categoryIds),
                article_ids: Array.from(articleIds),
            },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setIsSaving(false),
            },
        );
    };

    return (
        <>
            <Head title="Права доступа" />

            <section className="access-page access-page--employee-matrix">
                <header className="access-page__header access-page__header--plain">
                    <div>
                        <h1>Права доступа</h1>
                        <p>Настройка доступа к базе знаний для каждого сотрудника</p>
                    </div>
                </header>

                <div className="access-hint">
                    <span aria-hidden="true">🔒</span>
                    Сотрудники видят только разделы, к которым у них есть доступ. Они могут создавать статьи в доступных разделах и удалять только свои.
                </div>

                <div className="access-matrix">
                    <aside className="access-employees">
                        <div className="access-employees__title">Сотрудники</div>

                        <div className="access-employees__list">
                            {employees.map((employee) => (
                                <button
                                    key={employee.id}
                                    type="button"
                                    className={`access-emp-card ${
                                        selectedEmployee?.id === employee.id
                                            ? 'selected'
                                            : ''
                                    }`}
                                    onClick={() => selectEmployee(employee)}
                                >
                                    {employee.avatar ? (
                                        <img
                                            src={employee.avatar}
                                            alt=""
                                            className="access-emp-avatar"
                                        />
                                    ) : (
                                        <span
                                            className="access-emp-avatar"
                                            style={{
                                                backgroundColor: avatarColor(employee.id),
                                            }}
                                        >
                                            {initials(employee.name)}
                                        </span>
                                    )}
                                    <span className="access-emp-info">
                                        <span className="aei-name">{employee.name}</span>
                                        <span className="aei-role">{employee.position}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </aside>

                    <main className="access-panel">
                        {selectedEmployee ? (
                            <>
                                <div className="access-panel-head">
                                    <div>
                                        <div className="access-panel-name">
                                            {selectedEmployee.name}
                                        </div>
                                        <div className="access-panel-role">
                                            {selectedEmployee.position}
                                        </div>
                                    </div>

                                    <div className="access-panel-actions">
                                        <button
                                            type="button"
                                            className={`access-deactivate-btn ${
                                                draftPermission.is_deactivated
                                                    ? 'is-active'
                                                    : ''
                                            }`}
                                            onClick={() =>
                                                setDraftPermission((current) => ({
                                                    ...current,
                                                    is_deactivated:
                                                        !current.is_deactivated,
                                                }))
                                            }
                                        >
                                            {draftPermission.is_deactivated
                                                ? 'Активировать'
                                                : 'Деактивировать'}
                                        </button>
                                        <button
                                            type="button"
                                            className="access-save-btn"
                                            onClick={save}
                                            disabled={isSaving}
                                        >
                                            <Save className="size-3.5" />
                                            {isSaving ? 'Сохраняем...' : 'Сохранить'}
                                        </button>
                                    </div>
                                </div>

                                <section className="access-block">
                                    <div className="access-block-title">Права действий</div>
                                    <div className="access-block-desc">
                                        Что сотрудник может делать в базе знаний
                                    </div>

                                    <div className="access-perms-list">
                                        <ToggleRow
                                            icon={<Eye className="size-4" />}
                                            title="Просматривать"
                                            hint="Видит базу знаний и статьи в разрешенных разделах"
                                            checked={draftPermission.can_view}
                                            onChange={(checked) =>
                                                setDraftPermission((current) => ({
                                                    ...current,
                                                    can_view: checked,
                                                }))
                                            }
                                        />
                                        <ToggleRow
                                            icon={<Plus className="size-4" />}
                                            title="Добавлять"
                                            hint="Может создавать новые статьи в доступных разделах"
                                            checked={draftPermission.can_create}
                                            onChange={(checked) =>
                                                setDraftPermission((current) => ({
                                                    ...current,
                                                    can_create: checked,
                                                }))
                                            }
                                        />
                                        <ToggleRow
                                            icon={<Pencil className="size-4" />}
                                            title="Редактировать"
                                            hint="Может редактировать статьи, но не удалять их"
                                            checked={draftPermission.can_update}
                                            onChange={(checked) =>
                                                setDraftPermission((current) => ({
                                                    ...current,
                                                    can_update: checked,
                                                }))
                                            }
                                        />
                                        <ToggleRow
                                            icon={<Trash2 className="size-4" />}
                                            title="Удалять"
                                            hint="Может удалять статьи в рамках своей зоны доступа"
                                            checked={draftPermission.can_delete}
                                            onChange={(checked) =>
                                                setDraftPermission((current) => ({
                                                    ...current,
                                                    can_delete: checked,
                                                }))
                                            }
                                        />
                                        <ToggleRow
                                            icon={<FileText className="size-4" />}
                                            title="Просмотр всех статей"
                                            hint="Если выключить, ниже можно выбрать конкретные статьи"
                                            checked={draftPermission.view_all_articles}
                                            onChange={(checked) =>
                                                setDraftPermission((current) => ({
                                                    ...current,
                                                    view_all_articles: checked,
                                                }))
                                            }
                                        />
                                    </div>
                                </section>

                                <section className="access-block">
                                    <div className="access-block-title">Доступ к разделам</div>
                                    <div className="access-block-desc">
                                        Какие разделы видит сотрудник
                                    </div>

                                    <div className="access-tree">
                                        {groupedCategories.map(({ root, children }) => (
                                            <div
                                                key={root.id}
                                                className="access-root-cat"
                                            >
                                                <div className="access-root-head">
                                                    <KnowledgeBaseIcon
                                                        icon={root.icon ?? ''}
                                                        imageUrl={root.icon_image_url}
                                                        className="access-root-emoji"
                                                        imageClassName="access-root-image"
                                                    />
                                                    <span className="access-root-name">
                                                        {root.name}
                                                    </span>
                                                    <span className="access-badge-count">
                                                        {root.articles_count} ст.
                                                    </span>
                                                    <AccessSwitch
                                                        checked={categoryIds.has(root.id)}
                                                        label={`Р”РѕСЃС‚СѓРї Рє СЂР°Р·РґРµР»Сѓ ${root.name}`}
                                                        onChange={(checked) =>
                                                            toggleCategory(root.id, checked)
                                                        }
                                                    />
                                                </div>

                                                <div className="access-subcats">
                                                    {children.map((category) => (
                                                        <div
                                                            key={category.id}
                                                            className="access-row"
                                                        >
                                                            <KnowledgeBaseIcon
                                                                icon={category.icon ?? ''}
                                                                imageUrl={
                                                                    category.icon_image_url
                                                                }
                                                                className="access-row-emoji"
                                                                imageClassName="access-row-image"
                                                            />
                                                            <span className="access-row-name">
                                                                {category.name}
                                                            </span>
                                                            <span className="access-badge-count">
                                                                {category.articles_count} ст.
                                                            </span>
                                                            <AccessSwitch
                                                                checked={categoryIds.has(
                                                                    category.id,
                                                                )}
                                                                label={`Р”РѕСЃС‚СѓРї Рє СЂР°Р·РґРµР»Сѓ ${category.name}`}
                                                                onChange={(checked) =>
                                                                    toggleCategory(
                                                                        category.id,
                                                                        checked,
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {!draftPermission.view_all_articles ? (
                                    <section className="access-block">
                                        <div className="access-block-title">
                                            Доступ к отдельным статьям
                                        </div>
                                        <div className="access-block-desc">
                                            Этот список работает только когда выключен просмотр всех статей
                                        </div>

                                        <div className="access-articles-list">
                                            {categories.flatMap((category) =>
                                                category.articles.map((article) => (
                                                    <div
                                                        key={article.id}
                                                        className="access-row access-row--article"
                                                    >
                                                        <FileText className="size-4" />
                                                        <span className="access-row-name">
                                                            {article.title}
                                                        </span>
                                                        <span className="access-badge-count">
                                                            {category.name}
                                                        </span>
                                                        <AccessSwitch
                                                            checked={articleIds.has(article.id)}
                                                            label={`Р”РѕСЃС‚СѓРї Рє СЃС‚Р°С‚СЊРµ ${article.title}`}
                                                            onChange={(checked) =>
                                                                toggleArticle(
                                                                    article.id,
                                                                    checked,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                )),
                                            )}
                                        </div>
                                    </section>
                                ) : null}
                            </>
                        ) : (
                            <div className="access-empty-state">
                                Сначала добавьте сотрудника, потом настройте права.
                            </div>
                        )}
                    </main>
                </div>
            </section>
        </>
    );
}

AccessIndex.layout = (page: ReactNode) => <AdminLayout>{page}</AdminLayout>;
