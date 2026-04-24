<?php

namespace App\Policies;

use App\Models\KnowledgeCategory;
use App\Models\User;
use App\Support\KnowledgeBase\KnowledgeAccess;

class KnowledgeCategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $user->isEmployee();
    }

    public function view(User $user, KnowledgeCategory $category): bool
    {
        return app(KnowledgeAccess::class)->canViewCategory($user, $category);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, KnowledgeCategory $category): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, KnowledgeCategory $category): bool
    {
        return $user->isAdmin()
            && ! $category->children()->exists()
            && ! $category->articles()->exists();
    }
}
