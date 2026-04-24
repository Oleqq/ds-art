<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\User;
use App\Support\KnowledgeBase\KnowledgeBasePresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KnowledgeBaseController extends Controller
{
    public function index(Request $request, KnowledgeBasePresenter $presenter): Response
    {
        /** @var User $user */
        $user = $request->user();
        $this->authorize('viewAny', KnowledgeCategory::class);

        return Inertia::render('employee/knowledge-base/index', $presenter->buildHome($user));
    }

    public function show(Request $request, KnowledgeCategory $category, KnowledgeBasePresenter $presenter): Response
    {
        /** @var User $user */
        $user = $request->user();
        $this->authorize('view', $category);

        return Inertia::render('employee/knowledge-base/category', [
            ...$presenter->buildCategory($user, $category),
            'articleFormDefaults' => $user->can('create', KnowledgeArticle::class)
                ? [
                    ...$presenter->articleFormDefaults($category),
                    'return_to' => route('employee.knowledge-base.categories.show', $category),
                ]
                : null,
        ]);
    }
}
