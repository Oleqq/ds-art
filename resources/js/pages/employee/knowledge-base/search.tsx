import { Head } from '@inertiajs/react';
import { KnowledgeBaseSearchResultsView } from '@/features/knowledge-base/components/knowledge-base-search-results';
import type { KnowledgeBaseSearchResults } from '@/features/knowledge-base/types';

type EmployeeKnowledgeBaseSearchProps = {
    query: string;
    results: KnowledgeBaseSearchResults;
};

export default function EmployeeKnowledgeBaseSearch({
    query,
    results,
}: EmployeeKnowledgeBaseSearchProps) {
    return (
        <>
            <Head title="Поиск по базе знаний" />

            <KnowledgeBaseSearchResultsView query={query} results={results} mode="employee" />
        </>
    );
}
