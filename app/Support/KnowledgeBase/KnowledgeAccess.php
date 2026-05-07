<?php

namespace App\Support\KnowledgeBase;

use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\KnowledgeUserPermission;
use App\Models\User;

class KnowledgeAccess
{
    /** @var array<int, KnowledgeUserPermission|null> */
    private array $permissionsByUser = [];

    /** @var array<int, array<int>> */
    private array $categoryIdsByUser = [];

    /** @var array<int, array<int>> */
    private array $articleIdsByUser = [];

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

        if ($permission->view_all_articles) {
            return true;
        }

        return in_array($category->id, $this->categoryPermissionIds($user), true);
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

        if ((int) $article->created_by === (int) $user->id) {
            return $this->canViewCategory($user, $article->category);
        }

        if (! $this->isVisibleForEmployees($article)) {
            return false;
        }

        if (! $permission) {
            return $this->canViewCategory($user, $article->category)
                && ! $this->hasRestrictedAccessLevel($article);
        }

        if ($permission->view_all_articles) {
            return ! $this->hasRestrictedAccessLevel($article);
        }

        if (in_array($article->id, $this->articlePermissionIds($user), true)) {
            return true;
        }

        return $this->canViewCategory($user, $article->category)
            && ! $this->hasRestrictedAccessLevel($article);
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
        if (! array_key_exists($user->id, $this->permissionsByUser)) {
            $this->permissionsByUser[$user->id] = $user->relationLoaded('knowledgePermission')
                ? $user->knowledgePermission
                : $user->knowledgePermission()->first();
        }

        return $this->permissionsByUser[$user->id];
    }

    /**
     * @return array<int>
     */
    private function categoryPermissionIds(User $user): array
    {
        if (! array_key_exists($user->id, $this->categoryIdsByUser)) {
            $this->categoryIdsByUser[$user->id] = $user->knowledgeCategoryPermissions()
                ->where('can_view', true)
                ->pluck('knowledge_category_id')
                ->map(fn ($id) => (int) $id)
                ->all();
        }

        return $this->categoryIdsByUser[$user->id];
    }

    /**
     * @return array<int>
     */
    private function articlePermissionIds(User $user): array
    {
        if (! array_key_exists($user->id, $this->articleIdsByUser)) {
            $this->articleIdsByUser[$user->id] = $user->knowledgeArticlePermissions()
                ->where('can_view', true)
                ->pluck('knowledge_article_id')
                ->map(fn ($id) => (int) $id)
                ->all();
        }

        return $this->articleIdsByUser[$user->id];
    }

    private function hasRestrictedAccessLevel(KnowledgeArticle $article): bool
    {
        return in_array($article->access_level, [
            KnowledgeArticle::ACCESS_ADMINS,
            KnowledgeArticle::ACCESS_AUTHOR,
        ], true);
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
