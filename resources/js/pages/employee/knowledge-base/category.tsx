import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { KnowledgeBaseArticleFormModal } from '@/features/knowledge-base/components/knowledge-base-article-form-modal';
import { KnowledgeBaseCategoryView } from '@/features/knowledge-base/components/knowledge-base-category-view';
import type {
    KnowledgeBaseArticleFormPayload,
    KnowledgeBaseBreadcrumb,
    KnowledgeBaseCategoryRecord,
} from '@/features/knowledge-base/types';

type EmployeeKnowledgeBaseCategoryProps = {
    category: KnowledgeBaseCategoryRecord;
    breadcrumbs: KnowledgeBaseBreadcrumb[];
    controls: {
        can_manage: boolean;
        can_delete: boolean;
        can_create_article: boolean;
    };
    articleFormDefaults: KnowledgeBaseArticleFormPayload | null;
};

export default function EmployeeKnowledgeBaseCategory({
    category,
    breadcrumbs,
    controls,
    articleFormDefaults,
}: EmployeeKnowledgeBaseCategoryProps) {
    const [isCreateArticleOpen, setIsCreateArticleOpen] = useState(false);

    return (
        <>
            <Head title={category.name} />

            <KnowledgeBaseCategoryView
                title="База знаний"
                subtitle="Материалы и разделы, доступные сотруднику."
                category={category}
                breadcrumbs={breadcrumbs}
                canCreateArticle={controls.can_create_article}
                onCreateArticle={() => setIsCreateArticleOpen(true)}
            />

            {controls.can_create_article && articleFormDefaults ? (
                <KnowledgeBaseArticleFormModal
                    open={isCreateArticleOpen}
                    title="Новая статья"
                    description={`Статья будет создана внутри раздела «${category.name}» и откроется сразу после сохранения.`}
                    submitLabel="Создать статью"
                    defaults={articleFormDefaults}
                    submitUrl={`/employee/knowledge-base/categories/${category.slug}/articles`}
                    onCancel={() => setIsCreateArticleOpen(false)}
                    onSuccess={() => setIsCreateArticleOpen(false)}
                />
            ) : null}
        </>
    );
}
