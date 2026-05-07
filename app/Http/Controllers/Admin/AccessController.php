<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\KnowledgeUserArticlePermission;
use App\Models\KnowledgeUserCategoryPermission;
use App\Models\KnowledgeUserPermission;
use App\Models\User;
use App\Support\Audit\AuditLogger;
use App\Support\Employees\EmployeeActivationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AccessController extends Controller
{
    public function index(Request $request): Response
    {
        $employees = User::query()
            ->with('employee')
            ->where('role', User::ROLE_EMPLOYEE)
            ->whereNotNull('employee_id')
            ->whereHas('employee')
            ->orderByRaw("case when exists (select 1 from employees where employees.id = users.employee_id and employees.status = 'active') then 0 else 1 end")
            ->orderBy('name')
            ->get();

        $selectedUser = $employees->firstWhere('id', (int) $request->integer('user'))
            ?? $employees->first();

        $categories = KnowledgeCategory::query()
            ->with([
                'articles' => fn ($query) => $query
                    ->orderBy('sort_order')
                    ->orderBy('title'),
            ])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $permission = $selectedUser
            ? $this->userPermission($selectedUser)
            : null;
        $hasExplicitPermission = $selectedUser
            ? $selectedUser->knowledgePermission()->exists()
            : false;
        $selectedCategoryIds = $selectedUser
            ? $selectedUser->knowledgeCategoryPermissions()
                ->where('can_view', true)
                ->pluck('knowledge_category_id')
                ->map(fn ($id) => (int) $id)
                ->all()
            : [];
        $selectedArticleIds = $selectedUser
            ? $selectedUser->knowledgeArticlePermissions()
                ->where('can_view', true)
                ->pluck('knowledge_article_id')
                ->map(fn ($id) => (int) $id)
                ->all()
            : [];

        $activationService = app(EmployeeActivationService::class);

        return Inertia::render('admin/access/index', [
            'employees' => $employees->map(function (User $user) use ($activationService): array {
                $employee = $user->employee;
                $isActive = $employee
                    ? $employee->status === Employee::STATUS_ACTIVE
                    : (bool) $user->is_active;

                return [
                    'id' => $user->id,
                    'employee_id' => $employee?->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'position' => $employee?->position ?? 'Сотрудник',
                    'avatar' => $employee?->photo_url,
                    'is_active' => $isActive,
                    'can_toggle_status' => ! (
                        $isActive
                        && $employee
                        && ! $activationService->canDeactivateEmployee($employee)
                    ),
                ];
            })->values(),
            'selectedUserId' => $selectedUser?->id,
            'permission' => $permission ? [
                'is_deactivated' => (bool) $permission->is_deactivated,
                'can_view' => (bool) $permission->can_view,
                'can_create' => (bool) $permission->can_create,
                'can_update' => (bool) $permission->can_update,
                'can_delete' => (bool) $permission->can_delete,
                'view_all_articles' => (bool) $permission->view_all_articles,
            ] : null,
            'categories' => $categories->map(fn (KnowledgeCategory $category) => [
                'id' => $category->id,
                'parent_id' => $category->parent_id,
                'name' => $category->name,
                'slug' => $category->slug,
                'icon' => $category->icon,
                'icon_image_url' => $category->icon_image_url,
                'default_visible' => (bool) $category->is_visible_to_employees,
                'can_view' => $this->categoryCanView(
                    $category,
                    $permission,
                    $hasExplicitPermission,
                    $selectedCategoryIds,
                ),
                'articles_count' => $category->articles->count(),
                'articles' => $category->articles->map(fn (KnowledgeArticle $article) => [
                    'id' => $article->id,
                    'title' => $article->title,
                    'slug' => $article->slug,
                    'is_published' => (bool) $article->is_published,
                    'can_view' => $this->articleCanView(
                        $article,
                        $category,
                        $permission,
                        $hasExplicitPermission,
                        $selectedCategoryIds,
                        $selectedArticleIds,
                    ),
                    'updated_at' => $article->updated_at?->format('d.m.Y H:i'),
                ])->values(),
            ])->values(),
        ]);
    }

    public function updateUser(
        Request $request,
        User $user,
        AuditLogger $auditLogger,
        EmployeeActivationService $activationService,
    ): RedirectResponse {
        abort_unless($user->isEmployee(), 404);

        $payload = $request->validate([
            'is_deactivated' => ['required', 'boolean'],
            'can_view' => ['required', 'boolean'],
            'can_create' => ['required', 'boolean'],
            'can_update' => ['required', 'boolean'],
            'can_delete' => ['required', 'boolean'],
            'view_all_articles' => ['required', 'boolean'],
            'category_ids' => ['array'],
            'category_ids.*' => ['integer', 'exists:knowledge_categories,id'],
            'article_ids' => ['array'],
            'article_ids.*' => ['integer', 'exists:knowledge_articles,id'],
        ]);

        $requestedCategoryIds = collect($payload['category_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
        $requestedArticleIds = collect($payload['article_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $selectedCategoryIds = $payload['view_all_articles']
            ? KnowledgeCategory::query()->pluck('id')->all()
            : $requestedCategoryIds;
        $selectedArticleIds = $payload['view_all_articles']
            ? KnowledgeArticle::query()->pluck('id')->all()
            : $requestedArticleIds;

        $before = [
            'permission' => $user->knowledgePermission?->toArray(),
            'user_is_active' => (bool) $user->is_active,
            'employee_status' => $user->employee?->status,
            'category_ids' => $user->knowledgeCategoryPermissions()
                ->where('can_view', true)
                ->pluck('knowledge_category_id')
                ->all(),
            'article_ids' => $user->knowledgeArticlePermissions()
                ->where('can_view', true)
                ->pluck('knowledge_article_id')
                ->all(),
        ];

        if ($payload['is_deactivated'] && ! $activationService->canDeactivateUser($user)) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Аккаунты руководства нельзя деактивировать.',
            ]);

            return back();
        }

        DB::transaction(function () use ($request, $payload, $user, $activationService, $selectedCategoryIds, $selectedArticleIds): void {
            KnowledgeUserPermission::query()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'is_deactivated' => $payload['is_deactivated'],
                    'can_view' => $payload['can_view'],
                    'can_create' => $payload['can_create'],
                    'can_update' => $payload['can_update'],
                    'can_delete' => $payload['can_delete'],
                    'view_all_articles' => $payload['view_all_articles'],
                    'updated_by' => $request->user()->id,
                ],
            );

            $activationService->syncUserStatus($user, ! $payload['is_deactivated']);
            $this->syncCategoryPermissions($user, $selectedCategoryIds);
            $this->syncArticlePermissions($user, $selectedArticleIds);
        });

        $user->refresh()->loadMissing('employee', 'knowledgePermission');

        $auditLogger->record(
            request: $request,
            action: 'knowledge_access.user_updated',
            subject: $user,
            before: $before,
            after: [
                'permission' => $user->knowledgePermission?->toArray(),
                'user_is_active' => (bool) $user->is_active,
                'employee_status' => $user->employee?->status,
                'category_ids' => $selectedCategoryIds,
                'article_ids' => $selectedArticleIds,
            ],
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Изменения прав доступа сохранены.',
        ]);

        return back()->with('success', 'Права сотрудника обновлены.');
    }

    public function updateCategory(
        Request $request,
        KnowledgeCategory $category,
        AuditLogger $auditLogger,
    ): RedirectResponse {
        $this->authorize('update', $category);

        $payload = $request->validate([
            'is_visible_to_employees' => ['required', 'boolean'],
        ]);

        $before = $category->only(['is_visible_to_employees']);

        $category->update([
            'is_visible_to_employees' => $payload['is_visible_to_employees'],
            'updated_by' => $request->user()->id,
        ]);

        $auditLogger->record(
            request: $request,
            action: 'knowledge_category.access_updated',
            subject: $category,
            before: $before,
            after: $category->fresh()->only(['is_visible_to_employees']),
        );

        return back()->with('success', 'Доступ к разделу обновлен.');
    }

    public function updateArticle(
        Request $request,
        KnowledgeArticle $article,
        AuditLogger $auditLogger,
    ): RedirectResponse {
        $this->authorize('update', $article);

        $payload = $request->validate([
            'is_published' => ['required', 'boolean'],
            'access_level' => ['required', 'string', Rule::in(KnowledgeArticle::ACCESS_LEVELS)],
        ]);

        $before = $article->only(['is_published', 'access_level']);

        $article->update([
            'is_published' => $payload['is_published'],
            'access_level' => $payload['access_level'],
            'updated_by' => $request->user()->id,
        ]);

        $auditLogger->record(
            request: $request,
            action: 'knowledge_article.access_updated',
            subject: $article,
            before: $before,
            after: $article->fresh()->only(['is_published', 'access_level']),
        );

        return back()->with('success', 'Доступ к статье обновлен.');
    }

    private function userPermission(User $user): KnowledgeUserPermission
    {
        return $user->knowledgePermission
            ?? new KnowledgeUserPermission([
                'user_id' => $user->id,
                'is_deactivated' => false,
                'can_view' => true,
                'can_create' => false,
                'can_update' => false,
                'can_delete' => false,
                'view_all_articles' => true,
            ]);
    }

    private function categoryCanView(
        KnowledgeCategory $category,
        ?KnowledgeUserPermission $permission,
        bool $hasExplicitPermission,
        array $selectedCategoryIds,
    ): bool {
        if ((bool) ($permission?->view_all_articles ?? false)) {
            return true;
        }

        if ($hasExplicitPermission) {
            return in_array($category->id, $selectedCategoryIds, true);
        }

        return (bool) $category->is_visible_to_employees;
    }

    private function articleCanView(
        KnowledgeArticle $article,
        KnowledgeCategory $category,
        ?KnowledgeUserPermission $permission,
        bool $hasExplicitPermission,
        array $selectedCategoryIds,
        array $selectedArticleIds,
    ): bool {
        if ((bool) ($permission?->view_all_articles ?? false)) {
            return (bool) $article->is_published;
        }

        if ($hasExplicitPermission) {
            return (bool) $article->is_published
                && (
                    in_array($category->id, $selectedCategoryIds, true)
                    || in_array($article->id, $selectedArticleIds, true)
                );
        }

        return (bool) $article->is_published
            && (bool) $category->is_visible_to_employees;
    }

    /**
     * @param  array<int>  $selectedIds
     */
    private function syncCategoryPermissions(User $user, array $selectedIds): void
    {
        KnowledgeUserCategoryPermission::query()
            ->where('user_id', $user->id)
            ->delete();

        $rows = collect($selectedIds)
            ->unique()
            ->map(fn (int $categoryId) => [
                'user_id' => $user->id,
                'knowledge_category_id' => $categoryId,
                'can_view' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ])
            ->values()
            ->all();

        if ($rows !== []) {
            KnowledgeUserCategoryPermission::query()->insert($rows);
        }
    }

    /**
     * @param  array<int>  $selectedIds
     */
    private function syncArticlePermissions(User $user, array $selectedIds): void
    {
        KnowledgeUserArticlePermission::query()
            ->where('user_id', $user->id)
            ->delete();

        $rows = collect($selectedIds)
            ->unique()
            ->map(fn (int $articleId) => [
                'user_id' => $user->id,
                'knowledge_article_id' => $articleId,
                'can_view' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ])
            ->values()
            ->all();

        if ($rows !== []) {
            KnowledgeUserArticlePermission::query()->insert($rows);
        }
    }
}
