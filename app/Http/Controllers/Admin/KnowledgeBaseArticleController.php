<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\KnowledgeBase\UpsertKnowledgeArticleRequest;
use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\User;
use App\Support\Audit\AuditLogger;
use App\Support\KnowledgeBase\KnowledgeArticleStructureSync;
use App\Support\KnowledgeBase\KnowledgeBasePresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class KnowledgeBaseArticleController extends Controller
{
    public function show(
        Request $request,
        KnowledgeArticle $article,
        KnowledgeBasePresenter $presenter,
    ): Response {
        /** @var User $user */
        $user = $request->user();
        $this->authorize('view', $article);

        return Inertia::render('admin/knowledge-base/article', $presenter->buildArticle($user, $article));
    }

    public function store(
        UpsertKnowledgeArticleRequest $request,
        KnowledgeBasePresenter $presenter,
        KnowledgeArticleStructureSync $structureSync,
    ): RedirectResponse {
        $this->authorize('create', KnowledgeArticle::class);

        $category = KnowledgeCategory::query()->findOrFail($request->integer('knowledge_category_id'));

        $article = KnowledgeArticle::query()->create([
            ...$request->articleData(),
            'slug' => $this->makeUniqueSlug($request->string('title')->toString()),
            'sort_order' => $presenter->nextArticleSortOrder($category),
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $this->syncIcon($request, $article, $request->user()->id);
        $this->syncCover($request, $article, $request->user()->id);
        $structureSync->sync($article->fresh());

        return redirect()
            ->route('admin.knowledge-base.articles.show', $article)
            ->with('success', 'Статья создана.');
    }

    public function update(
        UpsertKnowledgeArticleRequest $request,
        KnowledgeArticle $article,
        KnowledgeArticleStructureSync $structureSync,
    ): RedirectResponse {
        $this->authorize('update', $article);

        $article->update([
            ...$request->articleData(),
            'slug' => $article->title === $request->string('title')->toString()
                ? $article->slug
                : $this->makeUniqueSlug($request->string('title')->toString(), $article),
            'updated_by' => $request->user()->id,
        ]);

        $this->syncIcon($request, $article, $request->user()->id);
        $this->syncCover($request, $article, $request->user()->id);
        $structureSync->sync($article->fresh());

        return redirect()
            ->to(
                $request->returnTo()
                ?: route('admin.knowledge-base.articles.show', $article->fresh())
            )
            ->with('success', 'Статья обновлена.');
    }

    public function updateCard(Request $request, KnowledgeArticle $article): RedirectResponse
    {
        $this->authorize('update', $article);

        $payload = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'summary' => ['nullable', 'string', 'max:255'],
            'return_to' => ['nullable', 'string', 'max:2048'],
        ]);

        $title = trim($payload['title']);
        $summary = trim((string) ($payload['summary'] ?? ''));

        $article->update([
            'title' => $title,
            'slug' => $article->title === $title
                ? $article->slug
                : $this->makeUniqueSlug($title, $article),
            'summary' => $summary !== '' ? $summary : null,
            'updated_by' => $request->user()->id,
        ]);

        $returnTo = (string) ($payload['return_to'] ?? '');

        return redirect()
            ->to(str_starts_with($returnTo, '/') ? $returnTo : route('admin.knowledge-base.articles.show', $article->fresh()))
            ->with('success', 'Статья обновлена.');
    }

    public function duplicate(
        Request $request,
        KnowledgeArticle $article,
        KnowledgeArticleStructureSync $structureSync,
        AuditLogger $auditLogger,
    ): RedirectResponse {
        $this->authorize('duplicate', $article);

        $copy = $article->replicate([
            'slug',
            'created_at',
            'updated_at',
        ]);

        $copy->title = $this->duplicateTitle($article->title);
        $copy->slug = $this->makeUniqueSlug($copy->title);
        $copy->is_published = false;
        $copy->sort_order = KnowledgeArticle::query()
            ->where('knowledge_category_id', $article->knowledge_category_id)
            ->max('sort_order') + 1;
        $copy->created_by = $request->user()->id;
        $copy->updated_by = $request->user()->id;
        $copy->save();
        $structureSync->sync($copy);

        $auditLogger->record(
            request: $request,
            action: 'knowledge_article.duplicated',
            subject: $article,
            meta: [
                'copy_id' => $copy->id,
                'copy_title' => $copy->title,
            ],
        );

        return redirect()
            ->route('admin.knowledge-base.articles.show', $copy)
            ->with('success', 'Статья продублирована.');
    }

    public function move(
        Request $request,
        KnowledgeArticle $article,
        AuditLogger $auditLogger,
    ): RedirectResponse {
        $this->authorize('move', $article);

        $payload = $request->validate([
            'knowledge_category_id' => ['required', 'integer', Rule::exists('knowledge_categories', 'id')],
            'return_to' => ['nullable', 'string', 'max:2048'],
        ]);

        $targetCategory = KnowledgeCategory::query()->findOrFail($payload['knowledge_category_id']);
        $before = $article->only(['knowledge_category_id', 'sort_order']);

        $article->update([
            'knowledge_category_id' => $targetCategory->id,
            'sort_order' => KnowledgeArticle::query()
                ->where('knowledge_category_id', $targetCategory->id)
                ->max('sort_order') + 1,
            'updated_by' => $request->user()->id,
        ]);

        $auditLogger->record(
            request: $request,
            action: 'knowledge_article.moved',
            subject: $article,
            before: $before,
            after: $article->fresh()->only(['knowledge_category_id', 'sort_order']),
        );

        $returnTo = (string) $request->input('return_to', '');
        $appUrl = rtrim((string) config('app.url'), '/');
        $safeReturnTo = str_starts_with($returnTo, '/')
            || ($appUrl !== '' && str_starts_with($returnTo, $appUrl.'/'));

        return redirect()
            ->to($safeReturnTo ? $returnTo : route('admin.knowledge-base.articles.show', $article->fresh()))
            ->with('success', 'Статья перемещена.');
    }

    public function uploadAsset(Request $request, KnowledgeArticle $article): JsonResponse
    {
        $this->authorize('uploadAsset', $article);

        $payload = $request->validate([
            'asset' => ['required', 'file', 'max:51200'],
            'kind' => ['required', 'string', Rule::in(['image', 'file', 'video'])],
        ]);

        $kind = $payload['kind'];
        $file = $request->file('asset');
        $path = $file->store("knowledge-base/articles/{$article->id}/assets/{$kind}", 'public');

        return response()->json([
            'url' => Storage::url($path),
            'name' => $file->getClientOriginalName(),
            'size_label' => $this->formatFileSize($file->getSize()),
            'mime' => $file->getMimeType(),
        ]);
    }

    public function destroy(
        Request $request,
        KnowledgeArticle $article,
        AuditLogger $auditLogger,
    ): RedirectResponse {
        $this->authorize('delete', $article);

        $category = $article->category;
        $before = $article->only([
            'id',
            'knowledge_category_id',
            'title',
            'slug',
            'is_published',
            'access_level',
        ]);

        $this->deleteStoredFile($article->icon_image_url);
        $this->deleteStoredFile($article->cover_url);
        $article->delete();

        $auditLogger->record(
            request: $request,
            action: 'knowledge_article.deleted',
            before: $before,
        );

        return redirect()
            ->to(
                (string) $request->input('return_to', '')
                ?: route('admin.knowledge-base.categories.show', $category)
            )
            ->with('success', 'Статья удалена.');
    }

    private function syncCover(
        UpsertKnowledgeArticleRequest $request,
        KnowledgeArticle $article,
        int $userId,
    ): void {
        if ($request->hasFile('cover')) {
            $path = $request->file('cover')->store(
                "knowledge-base/articles/{$article->id}/cover",
                'public',
            );

            $this->deleteStoredFile($article->cover_url);

            $article->update([
                'cover_url' => Storage::url($path),
                'updated_by' => $userId,
            ]);

            return;
        }

        if ($request->boolean('clear_cover')) {
            $this->deleteStoredFile($article->cover_url);

            $article->update([
                'cover_url' => null,
                'updated_by' => $userId,
            ]);
        }
    }

    private function syncIcon(
        UpsertKnowledgeArticleRequest $request,
        KnowledgeArticle $article,
        int $userId,
    ): void {
        if ($request->hasFile('icon_upload')) {
            $path = $request->file('icon_upload')->store(
                "knowledge-base/articles/{$article->id}/icon",
                'public',
            );

            $this->deleteStoredFile($article->icon_image_url);

            $article->update([
                'icon_image_url' => Storage::url($path),
                'updated_by' => $userId,
            ]);

            return;
        }

        if ($request->boolean('clear_icon_image')) {
            $this->deleteStoredFile($article->icon_image_url);

            $article->update([
                'icon_image_url' => null,
                'updated_by' => $userId,
            ]);
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

    private function makeUniqueSlug(string $title, ?KnowledgeArticle $ignore = null): string
    {
        $base = Str::slug($title) ?: 'article';
        $slug = $base;
        $index = 2;

        while (
            KnowledgeArticle::query()
                ->when($ignore, fn ($query) => $query->whereKeyNot($ignore->getKey()))
                ->where('slug', $slug)
                ->exists()
        ) {
            $slug = sprintf('%s-%d', $base, $index);
            $index++;
        }

        return $slug;
    }

    private function duplicateTitle(string $title): string
    {
        return str_ends_with($title, ' (копия)')
            ? $title
            : $title.' (копия)';
    }

    private function formatFileSize(int $bytes): string
    {
        if ($bytes >= 1024 * 1024) {
            return number_format($bytes / 1024 / 1024, 1, '.', ' ').' МБ';
        }

        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 0, '.', ' ').' КБ';
        }

        return $bytes.' Б';
    }
}
