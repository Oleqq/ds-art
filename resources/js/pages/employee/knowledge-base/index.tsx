import { Head } from '@inertiajs/react';
import { KnowledgeBaseHome } from '@/features/knowledge-base/components/knowledge-base-home';
import type { KnowledgeBaseHomeCategory } from '@/features/knowledge-base/types';

type EmployeeKnowledgeBaseIndexProps = {
    categories: KnowledgeBaseHomeCategory[];
};

export default function EmployeeKnowledgeBaseIndex({
    categories,
}: EmployeeKnowledgeBaseIndexProps) {
    return (
        <>
            <Head title="База знаний" />

            <KnowledgeBaseHome
                title="База знаний"
                subtitle="Рабочие материалы и инструкции по разделам."
                categories={categories}
            />
        </>
    );
}
