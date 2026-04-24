<?php

namespace App\Policies;

use App\Models\KnowledgeArticle;
use App\Models\User;
use App\Support\KnowledgeBase\KnowledgeAccess;

class KnowledgeArticlePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $user->isEmployee();
    }

    public function view(User $user, KnowledgeArticle $article): bool
    {
        return app(KnowledgeAccess::class)->canViewArticle($user, $article);
    }

    public function create(User $user): bool
    {
        return app(KnowledgeAccess::class)->canCreateArticle($user);
    }

    public function update(User $user, KnowledgeArticle $article): bool
    {
        return app(KnowledgeAccess::class)->canUpdateArticle($user, $article);
    }

    public function delete(User $user, KnowledgeArticle $article): bool
    {
        return app(KnowledgeAccess::class)->canDeleteArticle($user, $article);
    }

    public function duplicate(User $user, KnowledgeArticle $article): bool
    {
        return $user->isAdmin();
    }

    public function move(User $user, KnowledgeArticle $article): bool
    {
        return $user->isAdmin();
    }

    public function uploadAsset(User $user, KnowledgeArticle $article): bool
    {
        return app(KnowledgeAccess::class)->canUpdateArticle($user, $article);
    }
}
