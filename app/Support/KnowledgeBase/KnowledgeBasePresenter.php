<?php

namespace App\Support\KnowledgeBase;

use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\User;
use Illuminate\Support\Collection;

class KnowledgeBasePresenter
{
    public function __construct(
        private readonly KnowledgeAccess $access,
    ) {}

    public function sharedSidebar(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        $categories = KnowledgeCategory::query()
            ->withCount('articles')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get([
                'id',
                'parent_id',
                'name',
                'slug',
                'icon',
                'icon_image_url',
                'cover_url',
                'is_visible_to_employees',
            ])
            ->filter(fn (KnowledgeCategory $category) => $this->access->canViewCategory($user, $category))
            ->values();

        return [
            'home_href' => $this->homeHref($user),
            'nodes' => $this->buildSidebarNodes($categories, $user),
        ];
    }

    public function buildHome(User $user): array
    {
        $roots = KnowledgeCategory::query()
            ->whereNull('parent_id')
            ->with([
                'children' => fn ($query) => $query
                    ->with(['children', 'articles'])
                    ->orderBy('sort_order')
                    ->orderBy('name'),
                'articles' => fn ($query) => $query
                    ->orderBy('sort_order')
                    ->orderBy('title'),
            ])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->filter(fn (KnowledgeCategory $category) => $this->access->canViewCategory($user, $category))
            ->values();

        return [
            'mode' => $user->isAdmin() ? 'admin' : 'employee',
            'categories' => $roots->map(
                fn (KnowledgeCategory $category) => $this->mapHomeCategory($category, $user),
            )->values(),
        ];
    }

    public function buildCategory(User $user, KnowledgeCategory $category): array
    {
        abort_unless($this->canViewCategory($user, $category), 404);

        $category->load([
            'parent',
            'children' => fn ($query) => $query
                ->with(['children', 'articles'])
                ->orderBy('sort_order')
                ->orderBy('name'),
            'articles' => fn ($query) => $query
                ->with('category')
                ->orderBy('sort_order')
                ->orderBy('title'),
        ]);

        $visibleChildren = $category->children
            ->filter(fn (KnowledgeCategory $child) => $this->access->canViewCategory($user, $child))
            ->values();
        $visibleArticles = $category->articles
            ->filter(fn (KnowledgeArticle $article) => $this->access->canViewArticle($user, $article))
            ->values();

        return [
            'mode' => $user->isAdmin() ? 'admin' : 'employee',
            'category' => [
                'id' => $category->id,
                'parent_id' => $category->parent_id,
                'name' => $category->name,
                'slug' => $category->slug,
                'icon' => $category->icon,
                'icon_image_url' => $category->icon_image_url,
                'cover_url' => $category->cover_url,
                'is_visible_to_employees' => (bool) $category->is_visible_to_employees,
                'materials_count' => $visibleChildren->count() + $visibleArticles->count(),
                'subcategories' => $visibleChildren->map(
                    fn (KnowledgeCategory $child) => $this->mapCategoryCard($child, $user),
                )->values(),
                'articles' => $visibleArticles->map(
                    fn (KnowledgeArticle $article) => $this->mapArticleCard($article, $user),
                )->values(),
            ],
            'breadcrumbs' => $this->mapCategoryBreadcrumbs($category, $user),
            'controls' => [
                'can_manage' => $user->can('update', $category),
                'can_delete' => $user->can('delete', $category),
                'can_create_article' => $user->can('create', KnowledgeArticle::class),
            ],
            'move_categories' => $user->isAdmin()
                ? $this->moveCategoryOptions($user, $category)
                : [],
        ];
    }

    public function buildArticle(User $user, KnowledgeArticle $article): array
    {
        $article->loadMissing('category.parent');

        abort_unless($this->canViewArticle($user, $article), 404);

        return [
            'mode' => $user->isAdmin() ? 'admin' : 'employee',
            'article' => [
                'id' => $article->id,
                'title' => $article->title,
                'slug' => $article->slug,
                'icon' => $article->icon,
                'icon_image_url' => $article->icon_image_url,
                'summary' => $article->summary,
                'content' => $article->content,
                'blocks' => KnowledgeArticleBlocks::fromStored($article->blocks, $article->content),
                'cover_url' => $article->cover_url,
                'is_published' => (bool) $article->is_published,
                'scheduled_publish_at' => $article->scheduled_publish_at?->format('Y-m-d\TH:i'),
                'tags' => array_values($article->tags ?? []),
                'access_level' => $article->access_level ?: KnowledgeArticle::ACCESS_INHERIT,
                'updated_at' => $article->updated_at?->format('d.m.Y H:i'),
                'href' => $this->articleHref($user, $article),
                'category' => [
                    'id' => $article->category->id,
                    'name' => $article->category->name,
                    'slug' => $article->category->slug,
                    'href' => $this->categoryHref($user, $article->category),
                ],
            ],
            'breadcrumbs' => $this->mapCategoryBreadcrumbs($article->category, $user),
            'move_categories' => $user->can('move', $article)
                ? $this->moveCategoryOptions($user, $article->category)
                : [],
            'controls' => [
                'can_update' => $user->can('update', $article),
                'can_delete' => $user->can('delete', $article),
                'can_duplicate' => $user->can('duplicate', $article),
                'can_move' => $user->can('move', $article),
                'can_upload_assets' => $user->can('uploadAsset', $article),
            ],
        ];
    }

    public function categoryFormDefaults(?KnowledgeCategory $parent = null): array
    {
        return [
            'name' => '',
            'icon' => $parent?->icon ?? '',
            'icon_image_url' => '',
            'icon_upload' => null,
            'clear_icon_image' => false,
            'cover_url' => '',
            'cover' => null,
            'clear_cover' => false,
            'parent_id' => $parent?->id,
            'is_visible_to_employees' => true,
            'return_to' => '',
        ];
    }

    public function categoryFormPayload(KnowledgeCategory $category): array
    {
        return [
            'name' => $category->name,
            'icon' => $category->icon ?? '',
            'icon_image_url' => $category->icon_image_url ?: '',
            'icon_upload' => null,
            'clear_icon_image' => false,
            'cover_url' => $category->cover_url ?: '',
            'cover' => null,
            'clear_cover' => false,
            'parent_id' => $category->parent_id,
            'is_visible_to_employees' => $category->is_visible_to_employees,
            'return_to' => '',
        ];
    }

    public function articleFormDefaults(KnowledgeCategory $category): array
    {
        return [
            'knowledge_category_id' => $category->id,
            'title' => '',
            'icon' => '',
            'icon_image_url' => '',
            'icon_upload' => null,
            'clear_icon_image' => false,
            'summary' => '',
            'content' => '',
            'blocks' => json_encode([KnowledgeArticleBlocks::makeBlock('p')], JSON_UNESCAPED_UNICODE),
            'cover' => null,
            'cover_url' => '',
            'clear_cover' => false,
            'is_published' => false,
            'scheduled_publish_at' => null,
            'tags' => [],
            'access_level' => KnowledgeArticle::ACCESS_INHERIT,
            'return_to' => '',
        ];
    }

    public function articleFormPayload(KnowledgeArticle $article): array
    {
        return [
            'knowledge_category_id' => $article->knowledge_category_id,
            'title' => $article->title,
            'icon' => $article->icon ?? '',
            'icon_image_url' => $article->icon_image_url ?: '',
            'icon_upload' => null,
            'clear_icon_image' => false,
            'summary' => $article->summary ?: '',
            'content' => $article->content ?: '',
            'blocks' => json_encode(
                KnowledgeArticleBlocks::fromStored($article->blocks, $article->content),
                JSON_UNESCAPED_UNICODE,
            ),
            'cover' => null,
            'cover_url' => $article->cover_url ?: '',
            'clear_cover' => false,
            'is_published' => $article->is_published,
            'scheduled_publish_at' => $article->scheduled_publish_at?->format('Y-m-d\TH:i'),
            'tags' => array_values($article->tags ?? []),
            'access_level' => $article->access_level ?: KnowledgeArticle::ACCESS_INHERIT,
            'return_to' => '',
        ];
    }

    public function canViewCategory(User $user, KnowledgeCategory $category): bool
    {
        return $this->access->canViewCategory($user, $category);
    }

    public function canViewArticle(User $user, KnowledgeArticle $article): bool
    {
        return $this->access->canViewArticle($user, $article);
    }

    public function nextSortOrder(?KnowledgeCategory $parent): int
    {
        return KnowledgeCategory::query()
            ->where('parent_id', $parent?->id)
            ->max('sort_order') + 1;
    }

    public function nextArticleSortOrder(KnowledgeCategory $category): int
    {
        return KnowledgeArticle::query()
            ->where('knowledge_category_id', $category->id)
            ->max('sort_order') + 1;
    }

    private function buildSidebarNodes(Collection $categories, User $user): array
    {
        $grouped = $categories->groupBy('parent_id');

        $buildNode = function (KnowledgeCategory $category) use (&$buildNode, $grouped, $user): array {
            return [
                'id' => $category->id,
                'parent_id' => $category->parent_id,
                'name' => $category->name,
                'slug' => $category->slug,
                'icon' => $category->icon,
                'icon_image_url' => $category->icon_image_url,
                'cover_url' => $category->cover_url,
                'is_visible_to_employees' => (bool) $category->is_visible_to_employees,
                'can_delete' => $user->can('delete', $category),
                'href' => $this->categoryHref($user, $category),
                'children' => $grouped->get($category->id, collect())
                    ->map(fn (KnowledgeCategory $child) => $buildNode($child))
                    ->values()
                    ->all(),
            ];
        };

        return $grouped->get(null, collect())
            ->map(fn (KnowledgeCategory $category) => $buildNode($category))
            ->values()
            ->all();
    }

    private function mapHomeCategory(KnowledgeCategory $category, User $user): array
    {
        $visibleChildren = $category->children
            ->filter(fn (KnowledgeCategory $child) => $this->access->canViewCategory($user, $child))
            ->values();
        $visibleArticles = $category->articles
            ->filter(fn (KnowledgeArticle $article) => $this->access->canViewArticle($user, $article))
            ->values();

        return [
            'id' => $category->id,
            'parent_id' => $category->parent_id,
            'name' => $category->name,
            'slug' => $category->slug,
            'icon' => $category->icon,
            'icon_image_url' => $category->icon_image_url,
            'cover_url' => $category->cover_url,
            'is_visible_to_employees' => (bool) $category->is_visible_to_employees,
            'can_delete' => $user->can('delete', $category),
            'href' => $this->categoryHref($user, $category),
            'subcategories_count' => $visibleChildren->count(),
            'articles_count' => $visibleArticles->count(),
            'preview_subcategories' => $visibleChildren
                ->take(3)
                ->map(fn (KnowledgeCategory $child) => [
                    'id' => $child->id,
                    'name' => $child->name,
                    'icon' => $child->icon,
                    'icon_image_url' => $child->icon_image_url,
                ])
                ->values(),
        ];
    }

    private function mapCategoryCard(KnowledgeCategory $category, User $user): array
    {
        $visibleChildrenCount = $category->children
            ->filter(fn (KnowledgeCategory $child) => $this->access->canViewCategory($user, $child))
            ->count();
        $visibleArticlesCount = $category->articles
            ->filter(fn (KnowledgeArticle $article) => $this->access->canViewArticle($user, $article))
            ->count();

        return [
            'id' => $category->id,
            'parent_id' => $category->parent_id,
            'name' => $category->name,
            'slug' => $category->slug,
            'icon' => $category->icon,
            'icon_image_url' => $category->icon_image_url,
            'cover_url' => $category->cover_url,
            'is_visible_to_employees' => (bool) $category->is_visible_to_employees,
            'can_delete' => $user->can('delete', $category),
            'href' => $this->categoryHref($user, $category),
            'materials_count' => $visibleChildrenCount + $visibleArticlesCount,
        ];
    }

    private function mapArticleCard(KnowledgeArticle $article, User $user): array
    {
        return [
            'id' => $article->id,
            'title' => $article->title,
            'slug' => $article->slug,
            'icon' => $article->icon,
            'icon_image_url' => $article->icon_image_url,
            'summary' => $article->summary,
            'href' => $this->articleHref($user, $article),
            'is_published' => (bool) $article->is_published,
            'scheduled_publish_at' => $article->scheduled_publish_at?->format('Y-m-d\TH:i'),
            'tags' => array_values($article->tags ?? []),
            'can_update' => $user->can('update', $article),
            'can_delete' => $user->can('delete', $article),
            'can_duplicate' => $user->can('duplicate', $article),
        ];
    }

    private function moveCategoryOptions(User $user, KnowledgeCategory $currentCategory): array
    {
        $categories = KnowledgeCategory::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->filter(fn (KnowledgeCategory $category) => $this->access->canViewCategory($user, $category))
            ->values();

        $childrenByParent = $categories
            ->groupBy(fn (KnowledgeCategory $category) => $category->parent_id);

        $buildOptions = function ($parentId = null, ?KnowledgeCategory $root = null, int $depth = 0) use (
            &$buildOptions,
            $childrenByParent,
            $currentCategory,
            $user,
        ) {
            return $childrenByParent
                ->get($parentId, collect())
                ->flatMap(function (KnowledgeCategory $category) use (
                    &$buildOptions,
                    $currentCategory,
                    $depth,
                    $root,
                    $user,
                ) {
                    $group = $root ?? $category;

                    return [
                        [
                            'id' => $category->id,
                            'name' => $category->name,
                            'slug' => $category->slug,
                            'href' => $this->categoryHref($user, $category),
                            'is_current' => $category->is($currentCategory),
                            'icon' => $category->icon,
                            'icon_image_url' => $category->icon_image_url,
                            'group_id' => $group->id,
                            'group_name' => $group->name,
                            'group_icon' => $group->icon,
                            'group_icon_image_url' => $group->icon_image_url,
                            'depth' => $depth,
                        ],
                        ...$buildOptions($category->id, $group, $depth + 1),
                    ];
                })
                ->values()
                ->all();
        };

        return $buildOptions();
    }

    private function mapCategoryBreadcrumbs(KnowledgeCategory $category, User $user): array
    {
        $trail = [];
        $cursor = $category;

        while ($cursor) {
            array_unshift($trail, [
                'id' => $cursor->id,
                'name' => $cursor->name,
                'icon' => $cursor->icon,
                'icon_image_url' => $cursor->icon_image_url,
                'href' => $this->categoryHref($user, $cursor),
            ]);

            $cursor = $cursor->parent;
        }

        return $trail;
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
