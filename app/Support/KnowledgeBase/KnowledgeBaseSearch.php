<?php

namespace App\Support\KnowledgeBase;

use App\Models\KnowledgeArticle;
use App\Models\KnowledgeArticleAsset;
use App\Models\KnowledgeArticleBlock;
use App\Models\KnowledgeCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class KnowledgeBaseSearch
{
    public function __construct(
        private readonly KnowledgeAccess $access,
    ) {}

    public function search(User $user, string $query, int $limit = 12): array
    {
        $term = trim($query);

        if ($term === '') {
            return [
                'categories' => [],
                'articles' => [],
                'total' => 0,
            ];
        }

        $like = $this->like($term);
        $categories = $this->searchCategories($user, $like, $limit);
        $articles = $this->searchArticles($user, $term, $like, $limit);

        return [
            'categories' => $categories,
            'articles' => $articles,
            'total' => count($categories) + count($articles),
        ];
    }

    private function searchCategories(User $user, string $like, int $limit): array
    {
        return KnowledgeCategory::query()
            ->withCount([
                'children as subcategories_count',
                'articles as articles_count',
            ])
            ->where(function (Builder $query) use ($like): void {
                $query
                    ->where('name', 'like', $like)
                    ->orWhere('slug', 'like', $like);
            })
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->filter(fn (KnowledgeCategory $category) => $this->access->canViewCategory($user, $category))
            ->take($limit)
            ->map(fn (KnowledgeCategory $category) => [
                'id' => $category->id,
                'type' => 'category',
                'title' => $category->name,
                'icon' => $category->icon,
                'icon_image_url' => $category->icon_image_url,
                'href' => $this->categoryHref($user, $category),
                'meta' => $this->materialsLabel(
                    (int) $category->subcategories_count + (int) $category->articles_count,
                ),
                'excerpt' => 'Раздел базы знаний',
            ])
            ->values()
            ->all();
    }

    private function searchArticles(User $user, string $term, string $like, int $limit): array
    {
        return KnowledgeArticle::query()
            ->with([
                'category:id,name,slug,is_visible_to_employees',
                'structureBlocks',
                'assets',
            ])
            ->when(! $user->isAdmin(), fn (Builder $query) => $query->where(function (Builder $inner) use ($user): void {
                $inner
                    ->where('is_published', true)
                    ->orWhere('created_by', $user->id);
            }))
            ->where(function (Builder $query) use ($like): void {
                $query
                    ->where('title', 'like', $like)
                    ->orWhere('summary', 'like', $like)
                    ->orWhere('content', 'like', $like)
                    ->orWhereHas('structureBlocks', function (Builder $blocks) use ($like): void {
                        $blocks
                            ->where('plain_text', 'like', $like)
                            ->orWhere('html', 'like', $like);
                    })
                    ->orWhereHas('assets', function (Builder $assets) use ($like): void {
                        $assets
                            ->where('original_name', 'like', $like)
                            ->orWhere('caption', 'like', $like)
                            ->orWhere('url', 'like', $like);
                    });
            })
            ->orderByDesc('updated_at')
            ->get()
            ->filter(fn (KnowledgeArticle $article) => $this->access->canViewArticle($user, $article))
            ->take($limit)
            ->map(fn (KnowledgeArticle $article) => [
                'id' => $article->id,
                'type' => 'article',
                'title' => $article->title,
                'icon' => $article->icon,
                'icon_image_url' => $article->icon_image_url,
                'href' => $this->articleHref($user, $article),
                'meta' => $article->category?->name ?? 'Без раздела',
                'excerpt' => $this->articleExcerpt($article, $term),
                'is_published' => (bool) $article->is_published,
                'scheduled_publish_at' => $article->scheduled_publish_at?->format('Y-m-d\TH:i'),
            ])
            ->values()
            ->all();
    }

    private function articleExcerpt(KnowledgeArticle $article, string $term): string
    {
        foreach ([$article->summary, $article->content, $article->title] as $text) {
            if ($this->contains((string) $text, $term)) {
                return $this->excerpt((string) $text, $term);
            }
        }

        $block = $article->structureBlocks
            ->first(fn (KnowledgeArticleBlock $block) => $this->contains((string) $block->plain_text, $term));

        if ($block) {
            return $this->excerpt((string) $block->plain_text, $term);
        }

        $asset = $article->assets
            ->first(fn (KnowledgeArticleAsset $asset) => $this->contains(
                trim((string) ($asset->original_name.' '.$asset->caption.' '.$asset->url)),
                $term,
            ));

        if ($asset) {
            return trim((string) ($asset->caption ?: $asset->original_name ?: $asset->url));
        }

        return $article->summary ?: 'Совпадение найдено внутри статьи.';
    }

    private function like(string $term): string
    {
        return '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term).'%';
    }

    private function contains(string $text, string $term): bool
    {
        return $text !== '' && mb_stripos($text, $term) !== false;
    }

    private function excerpt(string $text, string $term, int $length = 150): string
    {
        $text = trim(preg_replace('/\s+/u', ' ', strip_tags($text)) ?? '');

        if ($text === '') {
            return '';
        }

        $position = mb_stripos($text, $term);

        if ($position === false) {
            return mb_strlen($text) > $length ? mb_substr($text, 0, $length).'...' : $text;
        }

        $start = max(0, $position - 45);
        $excerpt = mb_substr($text, $start, $length);

        return ($start > 0 ? '...' : '').$excerpt.(mb_strlen($text) > $start + $length ? '...' : '');
    }

    private function materialsLabel(int $count): string
    {
        return match (true) {
            $count === 1 => '1 материал',
            $count > 1 && $count < 5 => "{$count} материала",
            default => "{$count} материалов",
        };
    }

    private function homeHref(User $user): string
    {
        return $user->isAdmin() ? '/admin/knowledge-base' : '/employee/knowledge-base';
    }

    private function categoryHref(User $user, KnowledgeCategory $category): string
    {
        return sprintf('%s/categories/%s', $this->homeHref($user), $category->slug);
    }

    private function articleHref(User $user, KnowledgeArticle $article): string
    {
        return sprintf('%s/articles/%s', $this->homeHref($user), $article->slug);
    }
}
