<?php

namespace App\Support\KnowledgeBase;

use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\KnowledgeUserPermission;
use App\Models\User;

class KnowledgeAccess
{
    public function canViewCategory(User $user, KnowledgeCategory $category): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        $permission = $this->permission($user);

        if ($permission?->is_deactivated || $permission?->can_view === false) {
            return false;
        }

        if (! $permission) {
            return (bool) $category->is_visible_to_employees;
        }

        return $user->knowledgeCategoryPermissions()
            ->where('knowledge_category_id', $category->id)
            ->where('can_view', true)
            ->exists();
    }

    public function canViewArticle(User $user, KnowledgeArticle $article): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if (! $article->category) {
            return false;
        }

        $permission = $this->permission($user);

        if ($permission?->is_deactivated || $permission?->can_view === false) {
            return false;
        }

        if (! $this->canViewCategory($user, $article->category)) {
            return false;
        }

        if ((int) $article->created_by === (int) $user->id) {
            return true;
        }

        if (! $this->isVisibleForEmployees($article)) {
            return false;
        }

        if (! $permission) {
            return $article->access_level !== KnowledgeArticle::ACCESS_ADMINS
                && $article->access_level !== KnowledgeArticle::ACCESS_AUTHOR;
        }

        if ($permission->view_all_articles) {
            return true;
        }

        return $user->knowledgeArticlePermissions()
            ->where('knowledge_article_id', $article->id)
            ->where('can_view', true)
            ->exists();
    }

    public function canCreateArticle(User $user): bool
    {
        return $user->isAdmin() || (bool) $this->permission($user)?->can_create;
    }

    public function canUpdateArticle(User $user, KnowledgeArticle $article): bool
    {
        return $user->isAdmin()
            || ((bool) $this->permission($user)?->can_update && $this->canViewArticle($user, $article));
    }

    public function canDeleteArticle(User $user, KnowledgeArticle $article): bool
    {
        return $user->isAdmin()
            || ((bool) $this->permission($user)?->can_delete && $this->canViewArticle($user, $article));
    }

    private function permission(User $user): ?KnowledgeUserPermission
    {
        return $user->knowledgePermission;
    }

    public function isVisibleForEmployees(KnowledgeArticle $article): bool
    {
        if (! $article->is_published) {
            return false;
        }

        if ($article->scheduled_publish_at && $article->scheduled_publish_at->isFuture()) {
            return false;
        }

        return true;
    }
}
