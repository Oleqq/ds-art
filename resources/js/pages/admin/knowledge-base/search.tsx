import { Head } from '@inertiajs/react';
import { KnowledgeBaseSearchResultsView } from '@/features/knowledge-base/components/knowledge-base-search-results';
import type { KnowledgeBaseSearchResults } from '@/features/knowledge-base/types';

type AdminKnowledgeBaseSearchProps = {
    query: string;
    results: KnowledgeBaseSearchResults;
};

export default function AdminKnowledgeBaseSearch({
    query,
    results,
}: AdminKnowledgeBaseSearchProps) {
    return (
        <>
            <Head title="Поиск по базе знаний" />

            <KnowledgeBaseSearchResultsView query={query} results={results} mode="admin" />
        </>
    );
}
