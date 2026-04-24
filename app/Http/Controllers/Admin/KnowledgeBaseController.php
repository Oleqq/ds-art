<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\KnowledgeBase\UpsertKnowledgeCategoryRequest;
use App\Models\KnowledgeCategory;
use App\Models\User;
use App\Support\Audit\AuditLogger;
use App\Support\KnowledgeBase\KnowledgeBasePresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class KnowledgeBaseController extends Controller
{
    public function index(Request $request, KnowledgeBasePresenter $presenter): Response
    {
        /** @var User $user */
        $user = $request->user();
        $this->authorize('viewAny', KnowledgeCategory::class);

        return Inertia::render('admin/knowledge-base/index', [
            ...$presenter->buildHome($user),
            'categoryFormDefaults' => [
                ...$presenter->categoryFormDefaults(),
                'return_to' => route('admin.knowledge-base.index'),
            ],
        ]);
    }

    public function show(Request $request, KnowledgeCategory $category, KnowledgeBasePresenter $presenter): Response
    {
        /** @var User $user */
        $user = $request->user();
        $this->authorize('view', $category);

        return Inertia::render('admin/knowledge-base/category', [
            ...$presenter->buildCategory($user, $category),
            'categoryFormDefaults' => [
                ...$presenter->categoryFormDefaults($category),
                'return_to' => route('admin.knowledge-base.categories.show', $category),
            ],
            'categoryFormPayload' => [
                ...$presenter->categoryFormPayload($category),
                'return_to' => route('admin.knowledge-base.categories.show', $category),
            ],
            'articleFormDefaults' => [
                ...$presenter->articleFormDefaults($category),
                'return_to' => route('admin.knowledge-base.categories.show', $category),
            ],
        ]);
    }

    public function store(
        UpsertKnowledgeCategoryRequest $request,
        KnowledgeBasePresenter $presenter,
    ): RedirectResponse {
        $this->authorize('create', KnowledgeCategory::class);

        $parent = $request->filled('parent_id')
            ? KnowledgeCategory::query()->findOrFail($request->integer('parent_id'))
            : null;

        $category = KnowledgeCategory::query()->create([
            ...$request->categoryData(),
            'slug' => $this->makeUniqueSlug($request->string('name')->toString()),
            'sort_order' => $presenter->nextSortOrder($parent),
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $this->syncAssets($request, $category, $request->user()->id);

        return redirect()
            ->to($request->returnTo() ?: route('admin.knowledge-base.index'))
            ->with('success', 'Раздел создан.');
    }

    public function update(
        UpsertKnowledgeCategoryRequest $request,
        KnowledgeCategory $category,
    ): RedirectResponse {
        $this->authorize('update', $category);

        $category->update([
            ...$request->categoryData(),
            'slug' => $category->name === $request->string('name')->toString()
                ? $category->slug
                : $this->makeUniqueSlug($request->string('name')->toString(), $category),
            'updated_by' => $request->user()->id,
        ]);

        $this->syncAssets($request, $category, $request->user()->id);

        return redirect()
            ->to(
                $request->returnTo()
                ?: route('admin.knowledge-base.categories.show', $category)
            )
            ->with('success', 'Раздел обновлен.');
    }

    public function destroy(
        Request $request,
        KnowledgeCategory $category,
        AuditLogger $auditLogger,
    ): RedirectResponse {
        $this->authorize('delete', $category);

        if ($category->children()->exists() || $category->articles()->exists()) {
            throw ValidationException::withMessages([
                'category' => 'Нельзя удалить раздел, пока внутри есть подразделы или статьи.',
            ]);
        }

        $parent = $category->parent;
        $before = $category->only([
            'id',
            'parent_id',
            'name',
            'slug',
            'is_visible_to_employees',
        ]);

        $this->deleteStoredFile($category->cover_url);
        $this->deleteStoredFile($category->icon_image_url);

        $category->delete();

        $auditLogger->record(
            request: $request,
            action: 'knowledge_category.deleted',
            before: $before,
        );

        $returnTo = (string) $request->input('return_to', '');
        if (! str_starts_with($returnTo, '/')) {
            $returnTo = $parent
                ? route('admin.knowledge-base.categories.show', $parent)
                : route('admin.knowledge-base.index');
        }

        return redirect()
            ->to($returnTo)
            ->with('success', 'Раздел удален.');
    }

    public function reorderRoot(Request $request): RedirectResponse
    {
        $this->authorize('viewAny', KnowledgeCategory::class);

        return $this->applyReorder($request, null);
    }

    public function reorder(Request $request, KnowledgeCategory $category): RedirectResponse
    {
        $this->authorize('update', $category);

        return $this->applyReorder($request, $category);
    }

    public function move(
        Request $request,
        KnowledgeCategory $category,
        AuditLogger $auditLogger,
    ): RedirectResponse {
        $this->authorize('update', $category);

        $payload = $request->validate([
            'parent_id' => ['nullable', 'integer', 'exists:knowledge_categories,id'],
            'return_to' => ['nullable', 'string', 'max:2048'],
        ]);

        $targetParentId = $request->filled('parent_id')
            ? (int) $payload['parent_id']
            : null;

        if ($targetParentId === $category->id || $this->isDescendantOf($targetParentId, $category)) {
            throw ValidationException::withMessages([
                'parent_id' => 'Раздел нельзя переместить внутрь самого себя или своего подраздела.',
            ]);
        }

        $before = $category->only(['parent_id', 'sort_order']);

        $category->update([
            'parent_id' => $targetParentId,
            'sort_order' => $this->nextCategorySortOrder($targetParentId),
            'updated_by' => $request->user()->id,
        ]);

        $auditLogger->record(
            request: $request,
            action: 'knowledge_category.moved',
            subject: $category,
            before: $before,
            after: $category->fresh()->only(['parent_id', 'sort_order']),
        );

        return redirect()
            ->to($this->safeReturnTo($request, route('admin.knowledge-base.categories.show', $category->fresh())))
            ->with('success', 'Раздел перемещен.');
    }

    private function applyReorder(Request $request, ?KnowledgeCategory $parent): RedirectResponse
    {
        $payload = $request->validate([
            'categories' => ['nullable', 'array'],
            'categories.*' => ['integer', 'exists:knowledge_categories,id'],
            'articles' => ['nullable', 'array'],
            'articles.*' => ['integer', 'exists:knowledge_articles,id'],
            'return_to' => ['nullable', 'string', 'max:2048'],
        ]);

        $parentId = $parent?->id;
        $categoryIds = collect($payload['categories'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();
        $articleIds = collect($payload['articles'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        if ($categoryIds->isNotEmpty()) {
            $validCategoryIds = KnowledgeCategory::query()
                ->when(
                    $parentId,
                    fn ($query) => $query->where('parent_id', $parentId),
                    fn ($query) => $query->whereNull('parent_id'),
                )
                ->whereIn('id', $categoryIds)
                ->pluck('id')
                ->all();

            foreach ($categoryIds as $index => $id) {
                if (! in_array($id, $validCategoryIds, true)) {
                    continue;
                }

                KnowledgeCategory::query()
                    ->whereKey($id)
                    ->update([
                        'sort_order' => $index + 1,
                        'updated_by' => $request->user()->id,
                    ]);
            }
        }

        if ($parent && $articleIds->isNotEmpty()) {
            $validArticleIds = $parent->articles()
                ->whereIn('id', $articleIds)
                ->pluck('id')
                ->all();

            foreach ($articleIds as $index => $id) {
                if (! in_array($id, $validArticleIds, true)) {
                    continue;
                }

                $parent->articles()
                    ->whereKey($id)
                    ->update([
                        'sort_order' => $index + 1,
                        'updated_by' => $request->user()->id,
                    ]);
            }
        }

        $fallback = $parent
            ? route('admin.knowledge-base.categories.show', $parent)
            : route('admin.knowledge-base.index');

        return redirect()
            ->to($this->safeReturnTo($request, $fallback))
            ->with('success', 'Порядок обновлен.');
    }

    private function syncAssets(
        UpsertKnowledgeCategoryRequest $request,
        KnowledgeCategory $category,
        int $userId,
    ): void {
        $updates = [];

        if ($request->hasFile('cover')) {
            $path = $request->file('cover')->store(
                "knowledge-base/categories/{$category->id}/cover",
                'public',
            );

            $this->deleteStoredFile($category->cover_url);
            $updates['cover_url'] = Storage::url($path);
        } elseif ($request->boolean('clear_cover')) {
            $this->deleteStoredFile($category->cover_url);
            $updates['cover_url'] = null;
        }

        if ($request->hasFile('icon_upload')) {
            $path = $request->file('icon_upload')->store(
                "knowledge-base/categories/{$category->id}/icon",
                'public',
            );

            $this->deleteStoredFile($category->icon_image_url);
            $updates['icon_image_url'] = Storage::url($path);
        } elseif ($request->boolean('clear_icon_image')) {
            $this->deleteStoredFile($category->icon_image_url);
            $updates['icon_image_url'] = null;
        }

        if ($updates !== []) {
            $updates['updated_by'] = $userId;
            $category->update($updates);
        }
    }

    private function deleteStoredFile(?string $url): void
    {
        if (! $url || ! str_starts_with($url, '/storage/')) {
            return;
        }

        $path = ltrim(str_replace('/storage/', '', $url), '/');
        Storage::disk('public')->delete($path);
    }

    private function makeUniqueSlug(string $name, ?KnowledgeCategory $ignore = null): string
    {
        $base = Str::slug($name) ?: 'section';
        $slug = $base;
        $index = 2;

        while (
            KnowledgeCategory::query()
                ->when($ignore, fn ($query) => $query->whereKeyNot($ignore->getKey()))
                ->where('slug', $slug)
                ->exists()
        ) {
            $slug = sprintf('%s-%d', $base, $index);
            $index++;
        }

        return $slug;
    }

    private function isDescendantOf(?int $targetParentId, KnowledgeCategory $category): bool
    {
        if (! $targetParentId) {
            return false;
        }

        $cursor = KnowledgeCategory::query()->find($targetParentId);

        while ($cursor) {
            if ($cursor->is($category)) {
                return true;
            }

            $cursor = $cursor->parent;
        }

        return false;
    }

    private function nextCategorySortOrder(?int $parentId): int
    {
        return KnowledgeCategory::query()
            ->when(
                $parentId,
                fn ($query) => $query->where('parent_id', $parentId),
                fn ($query) => $query->whereNull('parent_id'),
            )
            ->max('sort_order') + 1;
    }

    private function safeReturnTo(Request $request, string $fallback): string
    {
        $returnTo = (string) $request->input('return_to', '');

        if (str_starts_with($returnTo, '/')) {
            return $returnTo;
        }

        $appUrl = rtrim((string) config('app.url'), '/');

        if ($appUrl !== '' && str_starts_with($returnTo, $appUrl.'/')) {
            return $returnTo;
        }

        return $fallback;
    }
}
