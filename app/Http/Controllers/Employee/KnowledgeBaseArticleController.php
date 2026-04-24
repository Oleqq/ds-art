<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\KnowledgeBase\UpsertKnowledgeArticleRequest;
use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\User;
use App\Support\Audit\AuditLogger;
use App\Support\KnowledgeBase\KnowledgeAccess;
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
        KnowledgeAccess $access,
    ): Response {
        /** @var User $user */
        $user = $request->user();

        abort_unless($article->category && $access->canViewCategory($user, $article->category), 404);

        if ((int) $article->created_by !== (int) $user->id) {
            abort_unless($access->isVisibleForEmployees($article), 404);
        }

        $this->authorize('view', $article);

        return Inertia::render('employee/knowledge-base/article', $presenter->buildArticle($user, $article));
    }

    public function store(
        UpsertKnowledgeArticleRequest $request,
        KnowledgeCategory $category,
        KnowledgeBasePresenter $presenter,
        KnowledgeArticleStructureSync $structureSync,
    ): RedirectResponse {
        $this->authorize('create', KnowledgeArticle::class);
        $this->authorize('view', $category);

        $article = KnowledgeArticle::query()->create([
            ...$request->articleData(),
            'knowledge_category_id' => $category->id,
            'slug' => $this->makeUniqueSlug($request->string('title')->toString()),
            'sort_order' => $presenter->nextArticleSortOrder($category),
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $this->syncIcon($request, $article, $request->user()->id);
        $this->syncCover($request, $article, $request->user()->id);
        $structureSync->sync($article->fresh());

        return redirect()
            ->route('employee.knowledge-base.articles.show', $article)
            ->with('success', 'РЎС‚Р°С‚СЊСЏ СЃРѕР·РґР°РЅР°.');
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
                ?: route('employee.knowledge-base.articles.show', $article->fresh())
            )
            ->with('success', 'РЎС‚Р°С‚СЊСЏ РѕР±РЅРѕРІР»РµРЅР°.');
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
                ?: route('employee.knowledge-base.categories.show', $category)
            )
            ->with('success', 'РЎС‚Р°С‚СЊСЏ СѓРґР°Р»РµРЅР°.');
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

    private function formatFileSize(int $bytes): string
    {
        if ($bytes >= 1024 * 1024) {
            return number_format($bytes / 1024 / 1024, 1, '.', ' ').' РњР‘';
        }

        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 0, '.', ' ').' РљР‘';
        }

        return $bytes.' Р‘';
    }
}
