import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { KnowledgeBaseCategoryFormModal } from '@/features/knowledge-base/components/knowledge-base-category-form-modal';
import { KnowledgeBaseHome } from '@/features/knowledge-base/components/knowledge-base-home';
import type {
    KnowledgeBaseCategoryFormPayload,
    KnowledgeBaseHomeCategory,
} from '@/features/knowledge-base/types';

type AdminKnowledgeBaseIndexProps = {
    categories: KnowledgeBaseHomeCategory[];
    categoryFormDefaults: KnowledgeBaseCategoryFormPayload;
};

function getCookie(name: string) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));

    return match ? decodeURIComponent(match[1]) : null;
}

export default function AdminKnowledgeBaseIndex({
    categories,
    categoryFormDefaults,
}: AdminKnowledgeBaseIndexProps) {
    const { url } = usePage();
    const searchParams = useMemo(
        () => new URL(url, 'http://localhost').searchParams,
        [url],
    );
    const pageUrl = useMemo(() => new URL(url, 'http://localhost').pathname, [url]);
    const [isCreateOpen, setIsCreateOpen] = useState(searchParams.get('create') === '1');

    useEffect(() => {
        setIsCreateOpen(searchParams.get('create') === '1');
    }, [searchParams]);

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

        if (payload.cover) {
            formData.append('cover', payload.cover);
        }

        if (payload.icon_upload) {
            formData.append('icon_upload', payload.icon_upload);
        }
    };

    const buildCategoryPayload = (
        item: KnowledgeBaseHomeCategory,
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
        parent_id: item.parent_id,
        is_visible_to_employees: item.is_visible_to_employees,
        return_to: pageUrl,
        ...overrides,
    });

    const updateCategory = async (
        item: KnowledgeBaseHomeCategory,
        overrides: Partial<KnowledgeBaseCategoryFormPayload>,
    ) => {
        const formData = new FormData();
        appendCategoryPayload(formData, buildCategoryPayload(item, overrides));
        await sendFormRequest(`/admin/knowledge-base/categories/${item.slug}`, formData);
        refreshPage();
    };

    const deleteCategory = async (item: KnowledgeBaseHomeCategory) => {
        const formData = new FormData();
        formData.append('_method', 'DELETE');
        formData.append('return_to', pageUrl);
        await sendFormRequest(`/admin/knowledge-base/categories/${item.slug}`, formData);
        refreshPage();
    };

    const bulkDeleteCategories = async (items: KnowledgeBaseHomeCategory[]) => {
        for (const item of items) {
            const formData = new FormData();
            formData.append('_method', 'DELETE');
            formData.append('return_to', pageUrl);
            await sendFormRequest(`/admin/knowledge-base/categories/${item.slug}`, formData);
        }

        refreshPage();
        toast.success('Выбранные разделы удалены');
    };

    const reorderCategories = async (categoryIds: number[]) => {
        const formData = new FormData();
        formData.append('_method', 'PATCH');
        formData.append('return_to', pageUrl);

        for (const id of categoryIds) {
            formData.append('categories[]', String(id));
        }

        await sendFormRequest('/admin/knowledge-base/reorder', formData);
        refreshPage();
    };

    return (
        <>
            <Head title="База знаний" />

            <KnowledgeBaseHome
                title="База знаний"
                subtitle="Управляйте разделами, статьями и структурой базы знаний из одного экрана."
                categories={categories}
                canManage
                onCreateCategory={() => setIsCreateOpen(true)}
                onRenameCategory={(item, name) =>
                    updateCategory(item, {
                        name,
                    })
                }
                onChangeCategoryIcon={(item, icon) =>
                    updateCategory(item, {
                        icon,
                        icon_image_url: '',
                        clear_icon_image: true,
                    })
                }
                onUploadCategoryIcon={(item, file) =>
                    updateCategory(item, {
                        icon: '',
                        icon_upload: file,
                        clear_icon_image: false,
                    })
                }
                onDeleteCategory={deleteCategory}
                onBulkDeleteCategories={bulkDeleteCategories}
                onReorderCategories={reorderCategories}
            />

            <KnowledgeBaseCategoryFormModal
                open={isCreateOpen}
                title="Новый раздел"
                description="Создайте новый корневой раздел базы знаний."
                submitLabel="Создать раздел"
                defaults={categoryFormDefaults}
                submitUrl="/admin/knowledge-base/categories"
                onCancel={() => setIsCreateOpen(false)}
                onSuccess={() => setIsCreateOpen(false)}
            />
        </>
    );
}
