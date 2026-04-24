import { KnowledgeBaseArticlePage } from '@/pages/admin/knowledge-base/article';
import type {
    KnowledgeBaseArticleMoveCategory,
    KnowledgeBaseArticleRecord,
    KnowledgeBaseBreadcrumb,
} from '@/features/knowledge-base/types';

type EmployeeKnowledgeBaseArticleProps = {
    article: KnowledgeBaseArticleRecord;
    breadcrumbs: KnowledgeBaseBreadcrumb[];
    move_categories: KnowledgeBaseArticleMoveCategory[];
    controls: {
        can_update: boolean;
        can_delete: boolean;
        can_duplicate: boolean;
        can_move: boolean;
        can_upload_assets: boolean;
    };
};

export default function EmployeeKnowledgeBaseArticle(props: EmployeeKnowledgeBaseArticleProps) {
    return <KnowledgeBaseArticlePage {...props} mode="employee" />;
}
