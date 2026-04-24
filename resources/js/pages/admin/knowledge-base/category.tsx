import { Head, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/confirm-modal';
import { KnowledgeBaseArticleFormModal } from '@/features/knowledge-base/components/knowledge-base-article-form-modal';
import { KnowledgeBaseCategoryFormModal } from '@/features/knowledge-base/components/knowledge-base-category-form-modal';
import { KnowledgeBaseCategoryView } from '@/features/knowledge-base/components/knowledge-base-category-view';
import type {
    KnowledgeBaseArticleCard,
    KnowledgeBaseArticleFormPayload,
    KnowledgeBaseArticleMoveCategory,
    KnowledgeBaseBreadcrumb,
    KnowledgeBaseCategoryCard,
    KnowledgeBaseCategoryFormPayload,
    KnowledgeBaseCategoryRecord,
} from '@/features/knowledge-base/types';

type AdminKnowledgeBaseCategoryProps = {
    category: KnowledgeBaseCategoryRecord;
    breadcrumbs: KnowledgeBaseBreadcrumb[];
    controls: {
        can_manage: boolean;
        can_delete: boolean;
        can_create_article: boolean;
    };
    move_categories: KnowledgeBaseArticleMoveCategory[];
    categoryFormDefaults: KnowledgeBaseCategoryFormPayload;
    categoryFormPayload: KnowledgeBaseCategoryFormPayload;
    articleFormDefaults: KnowledgeBaseArticleFormPayload;
};

function getCookie(name: string) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));

    return match ? decodeURIComponent(match[1]) : null;
}

export default function AdminKnowledgeBaseCategory({
    category,
    breadcrumbs,
    controls,
    move_categories,
    categoryFormDefaults,
    categoryFormPayload,
    articleFormDefaults,
}: AdminKnowledgeBaseCategoryProps) {
    const { url } = usePage();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreateArticleOpen, setIsCreateArticleOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const pageUrl = useMemo(() => new URL(url, 'http://localhost').pathname, [url]);
    const returnAfterDelete =
        breadcrumbs.length > 1
            ? breadcrumbs[breadcrumbs.length - 2]?.href
            : '/admin/knowledge-base';

    const refreshPage = () => {
        router.get(
            pageUrl,
            {},
            {
                replace: true,
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const sendFormRequest = async (targetUrl: string, body: FormData) => {
        const csrfToken = getCookie('XSRF-TOKEN');
        const response = await fetch(targetUrl, {
            method: 'POST',
            body,
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
            },
        });

        if (!response.ok) {
            throw new Error(`Knowledge base request failed: ${response.status}`);
        }
    };

    const buildCategoryPayload = (
        item: KnowledgeBaseCategoryCard,
        overrides: Partial<KnowledgeBaseCategoryFormPayload> = {},
    ): KnowledgeBaseCategoryFormPayload => ({
        name: item.name,
        icon: item.icon ?? '',
        icon_image_url: item.icon_image_url ?? '',
        icon_upload: null,
        clear_icon_image: false,
        cover_url: item.cover_url ?? '',
        cover: null,
        clear_cover: false,
        parent_id: item.parent_id ?? categoryFormPayload.parent_id ?? null,
        is_visible_to_employees: item.is_visible_to_employees ?? true,
        return_to: pageUrl,
        ...overrides,
    });

    const appendCategoryPayload = (
        formData: FormData,
        payload: KnowledgeBaseCategoryFormPayload,
    ) => {
        formData.append('_method', 'PUT');
        formData.append('name', payload.name);
        formData.append('icon', payload.icon ?? '');
        formData.append('icon_image_url', payload.icon_image_url ?? '');
        formData.append('clear_icon_image', payload.clear_icon_image ? '1' : '0');
        formData.append('cover_url', payload.cover_url ?? '');
        formData.append('clear_cover', payload.clear_cover ? '1' : '0');
        formData.append('is_visible_to_employees', payload.is_visible_to_employees ? '1' : '0');
        formData.append('return_to', payload.return_to);

        if (payload.parent_id) {
            formData.append('parent_id', String(payload.parent_id));
        }

        if (payload.cover) {
            formData.append('cover', payload.cover);
        }

        if (payload.icon_upload) {
            formData.append('icon_upload', payload.icon_upload);
        }
    };

    const updateCategory = async (
        overrides: Partial<KnowledgeBaseCategoryFormPayload>,
        options?: { keepReturnTo?: boolean },
    ) => {
        const formData = new FormData();
        appendCategoryPayload(formData, {
            ...categoryFormPayload,
            ...overrides,
            return_to: options?.keepReturnTo === false ? '' : pageUrl,
        });
        await sendFormRequest(`/admin/knowledge-base/categories/${category.slug}`, formData);
        refreshPage();
    };

    const quickUpdateSubcategory = async (
        item: KnowledgeBaseCategoryCard,
        overrides: Partial<KnowledgeBaseCategoryFormPayload>,
    ) => {
        const formData = new FormData();
        appendCategoryPayload(formData, buildCategoryPayload(item, overrides));
        await sendFormRequest(`/admin/knowledge-base/categories/${item.slug}`, formData);
        refreshPage();
    };

    const deleteSubcategoryTile = async (item: KnowledgeBaseCategoryCard) => {
        const formData = new FormData();
        formData.append('_method', 'DELETE');
        formData.append('return_to', pageUrl);
        await sendFormRequest(`/admin/knowledge-base/categories/${item.slug}`, formData);
        refreshPage();
    };

    const deleteArticleTile = async (item: KnowledgeBaseArticleCard) => {
        const formData = new FormData();
        formData.append('_method', 'DELETE');
        formData.append('return_to', pageUrl);
        await sendFormRequest(`/admin/knowledge-base/articles/${item.slug}`, formData);
        refreshPage();
    };

    const duplicateArticleTile = async (item: KnowledgeBaseArticleCard) => {
        await sendFormRequest(`/admin/knowledge-base/articles/${item.slug}/duplicate`, new FormData());
        refreshPage();
        toast.success('Статья продублирована');
    };

    const updateArticleCard = async (
        item: KnowledgeBaseArticleCard,
        payload: { title: string; summary: string },
    ) => {
        const body = new FormData();
        body.append('_method', 'PATCH');
        body.append('title', payload.title);
        body.append('summary', payload.summary);
        body.append('return_to', pageUrl);
        await sendFormRequest(`/admin/knowledge-base/articles/${item.slug}/card`, body);
        refreshPage();
    };

    const bulkDeleteTiles = async ({
        categories,
        articles,
    }: {
        categories: KnowledgeBaseCategoryCard[];
        articles: KnowledgeBaseArticleCard[];
    }) => {
        for (const subcategory of categories) {
            const body = new FormData();
            body.append('_method', 'DELETE');
            body.append('return_to', pageUrl);
            await sendFormRequest(`/admin/knowledge-base/categories/${subcategory.slug}`, body);
        }

        for (const article of articles) {
            const body = new FormData();
            body.append('_method', 'DELETE');
            body.append('return_to', pageUrl);
            await sendFormRequest(`/admin/knowledge-base/articles/${article.slug}`, body);
        }

        refreshPage();
        toast.success('Выбранные материалы удалены');
    };

    const reorderItems = async ({
        categories,
        articles,
    }: {
        categories: number[];
        articles: number[];
    }) => {
        const body = new FormData();
        body.append('_method', 'PATCH');
        body.append('return_to', pageUrl);

        for (const id of categories) {
            body.append('categories[]', String(id));
        }

        for (const id of articles) {
            body.append('articles[]', String(id));
        }

        await sendFormRequest(`/admin/knowledge-base/categories/${category.slug}/reorder`, body);
        refreshPage();
    };

    const moveItems = async (
        {
            categories,
            articles,
        }: {
            categories: KnowledgeBaseCategoryCard[];
            articles: KnowledgeBaseArticleCard[];
        },
        targetCategoryId: number,
    ) => {
        for (const subcategory of categories) {
            if (subcategory.id === targetCategoryId) {
                continue;
            }

            const body = new FormData();
            body.append('_method', 'PATCH');
            body.append('parent_id', String(targetCategoryId));
            body.append('return_to', pageUrl);
            await sendFormRequest(`/admin/knowledge-base/categories/${subcategory.slug}/move`, body);
        }

        for (const article of articles) {
            const body = new FormData();
            body.append('_method', 'PATCH');
            body.append('knowledge_category_id', String(targetCategoryId));
            body.append('return_to', pageUrl);
            await sendFormRequest(`/admin/knowledge-base/articles/${article.slug}/move`, body);
        }

        refreshPage();
        toast.success('Выбранные материалы перемещены');
    };

    const handleQuickIconChange = async (icon: string) => {
        await updateCategory(
            {
                icon,
                icon_image_url: '',
                clear_icon_image: true,
            },
            { keepReturnTo: true },
        );
    };

    const confirmDelete = () => {
        setIsDeleting(true);

        router.delete(`/admin/knowledge-base/categories/${category.slug}`, {
            data: {
                return_to: returnAfterDelete,
            },
            preserveScroll: true,
            onFinish: () => {
                setIsDeleting(false);
                setIsDeleteOpen(false);
            },
        });
    };

    return (
        <>
            <Head title={category.name} />

            <KnowledgeBaseCategoryView
                title="База знаний"
                subtitle="Управляйте материалами раздела, его структурой и быстрыми действиями."
                category={category}
                breadcrumbs={breadcrumbs}
                moveCategories={move_categories}
                canManage={controls.can_manage}
                canDelete={controls.can_delete}
                canCreateArticle={controls.can_create_article}
                onAddSubcategory={() => setIsCreateOpen(true)}
                onCreateArticle={() => setIsCreateArticleOpen(true)}
                onRenameCategory={(name) =>
                    updateCategory(
                        {
                            name,
                        },
                        { keepReturnTo: false },
                    )
                }
                onUploadCategoryIcon={(file) =>
                    updateCategory(
                        {
                            icon: '',
                            icon_upload: file,
                            clear_icon_image: false,
                        },
                        { keepReturnTo: true },
                    )
                }
                onUploadCover={(file) =>
                    updateCategory(
                        {
                            cover: file,
                            clear_cover: false,
                        },
                        { keepReturnTo: true },
                    )
                }
                onChangeIcon={handleQuickIconChange}
                onDeleteCategory={() => setIsDeleteOpen(true)}
                onRenameSubcategory={(item, name) =>
                    quickUpdateSubcategory(item, {
                        name,
                    })
                }
                onChangeSubcategoryIcon={(item, icon) =>
                    quickUpdateSubcategory(item, {
                        icon,
                        icon_image_url: '',
                        clear_icon_image: true,
                    })
                }
                onUploadSubcategoryIcon={(item, file) =>
                    quickUpdateSubcategory(item, {
                        icon: '',
                        icon_upload: file,
                        clear_icon_image: false,
                    })
                }
                onDeleteSubcategory={deleteSubcategoryTile}
                onUpdateArticleCard={updateArticleCard}
                onDeleteArticle={deleteArticleTile}
                onDuplicateArticle={duplicateArticleTile}
                onBulkDelete={bulkDeleteTiles}
                onMoveItems={moveItems}
                onReorderItems={reorderItems}
            />

            <KnowledgeBaseCategoryFormModal
                open={isCreateOpen}
                title="Новый подраздел"
                description={`Новый подраздел появится внутри раздела «${category.name}».`}
                submitLabel="Создать подраздел"
                defaults={{
                    ...categoryFormDefaults,
                    return_to: pageUrl,
                }}
                submitUrl="/admin/knowledge-base/categories"
                onCancel={() => setIsCreateOpen(false)}
                onSuccess={() => setIsCreateOpen(false)}
            />

            <KnowledgeBaseArticleFormModal
                open={isCreateArticleOpen}
                title="Новая статья"
                description={`Статья будет создана внутри раздела «${category.name}» и откроется сразу после сохранения.`}
                submitLabel="Создать статью"
                defaults={{
                    ...articleFormDefaults,
                    return_to: pageUrl,
                }}
                submitUrl={`/admin/knowledge-base/categories/${category.slug}/articles`}
                onCancel={() => setIsCreateArticleOpen(false)}
                onSuccess={() => setIsCreateArticleOpen(false)}
            />

            <ConfirmModal
                open={isDeleteOpen}
                title="Удалить раздел"
                description={`Раздел «${category.name}» будет удален. Если внутри есть материалы, сначала перенеси их в другой раздел.`}
                confirmLabel="Удалить раздел"
                danger
                processing={isDeleting}
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteOpen(false)}
            />
        </>
    );
}
