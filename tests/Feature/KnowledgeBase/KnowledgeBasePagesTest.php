<?php

namespace Tests\Feature\KnowledgeBase;

use App\Models\KnowledgeArticle;
use App\Models\KnowledgeArticleBlock;
use App\Models\KnowledgeCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class KnowledgeBasePagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_open_knowledge_base_home_and_category_pages(): void
    {
        $category = KnowledgeCategory::query()->create([
            'name' => 'SMM-менеджер',
            'slug' => 'smm-manager',
            'icon' => '📱',
            'sort_order' => 0,
            'is_visible_to_employees' => true,
        ]);

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.knowledge-base.index'))
            ->assertOk()
            ->assertSee('"component":"admin\/knowledge-base\/index"', false)
            ->assertSee(json_encode('SMM-менеджер'), false);

        $this->actingAs($admin)
            ->get(route('admin.knowledge-base.categories.show', $category))
            ->assertOk()
            ->assertSee('"component":"admin\/knowledge-base\/category"', false)
            ->assertSee(json_encode('SMM-менеджер'), false);
    }

    public function test_employee_can_open_visible_knowledge_base_pages(): void
    {
        $category = KnowledgeCategory::query()->create([
            'name' => 'Дизайнер',
            'slug' => 'designer',
            'icon' => '🎨',
            'sort_order' => 0,
            'is_visible_to_employees' => true,
        ]);

        $employee = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
        ]);

        $this->actingAs($employee)
            ->get(route('employee.knowledge-base.index'))
            ->assertOk()
            ->assertSee('"component":"employee\/knowledge-base\/index"', false)
            ->assertSee(json_encode('Дизайнер'), false);

        $this->actingAs($employee)
            ->get(route('employee.knowledge-base.categories.show', $category))
            ->assertOk()
            ->assertSee('"component":"employee\/knowledge-base\/category"', false)
            ->assertSee(json_encode('Дизайнер'), false);
    }

    public function test_admin_can_create_update_and_delete_empty_category_with_uploaded_assets(): void
    {
        Storage::fake('public');

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->post(route('admin.knowledge-base.categories.store'), [
                'name' => 'Новый раздел',
                'icon' => '📁',
                'icon_upload' => UploadedFile::fake()->image('icon.png', 64, 64),
                'cover' => UploadedFile::fake()->image('cover.jpg', 1200, 300),
                'parent_id' => null,
                'is_visible_to_employees' => true,
                'return_to' => route('admin.knowledge-base.index'),
            ])
            ->assertRedirect(route('admin.knowledge-base.index'));

        $category = KnowledgeCategory::query()->where('name', 'Новый раздел')->firstOrFail();

        $this->assertNotNull($category->icon_image_url);
        $this->assertNotNull($category->cover_url);

        $this->actingAs($admin)
            ->put(route('admin.knowledge-base.categories.update', $category), [
                'name' => 'Обновленный раздел',
                'icon' => '📘',
                'clear_icon_image' => true,
                'cover' => UploadedFile::fake()->image('cover-new.jpg', 1200, 300),
                'parent_id' => null,
                'is_visible_to_employees' => false,
                'return_to' => route('admin.knowledge-base.categories.show', $category),
            ])
            ->assertRedirect(route('admin.knowledge-base.categories.show', $category->fresh()));

        $category->refresh();

        $this->assertSame('Обновленный раздел', $category->name);
        $this->assertSame('📘', $category->icon);
        $this->assertNull($category->icon_image_url);
        $this->assertNotNull($category->cover_url);
        $this->assertFalse($category->is_visible_to_employees);

        $this->actingAs($admin)
            ->delete(route('admin.knowledge-base.categories.destroy', $category), [
                'return_to' => route('admin.knowledge-base.index'),
            ])
            ->assertRedirect(route('admin.knowledge-base.index'));

        $this->assertDatabaseMissing('knowledge_categories', [
            'id' => $category->id,
        ]);
    }

    public function test_admin_can_reorder_and_move_knowledge_base_items(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $source = KnowledgeCategory::query()->create([
            'name' => 'Source',
            'slug' => 'source',
            'sort_order' => 1,
            'is_visible_to_employees' => true,
        ]);
        $target = KnowledgeCategory::query()->create([
            'name' => 'Target',
            'slug' => 'target',
            'sort_order' => 2,
            'is_visible_to_employees' => true,
        ]);
        $firstChild = KnowledgeCategory::query()->create([
            'parent_id' => $source->id,
            'name' => 'First child',
            'slug' => 'first-child',
            'sort_order' => 1,
            'is_visible_to_employees' => true,
        ]);
        $secondChild = KnowledgeCategory::query()->create([
            'parent_id' => $source->id,
            'name' => 'Second child',
            'slug' => 'second-child',
            'sort_order' => 2,
            'is_visible_to_employees' => true,
        ]);
        $firstArticle = KnowledgeArticle::query()->create([
            'knowledge_category_id' => $source->id,
            'title' => 'First article',
            'slug' => 'first-article',
            'sort_order' => 1,
            'is_published' => true,
        ]);
        $secondArticle = KnowledgeArticle::query()->create([
            'knowledge_category_id' => $source->id,
            'title' => 'Second article',
            'slug' => 'second-article',
            'sort_order' => 2,
            'is_published' => true,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.knowledge-base.reorder'), [
                'categories' => [$target->id, $source->id],
                'return_to' => route('admin.knowledge-base.index'),
            ])
            ->assertRedirect(route('admin.knowledge-base.index'));

        $this->assertSame(1, $target->fresh()->sort_order);
        $this->assertSame(2, $source->fresh()->sort_order);

        $this->actingAs($admin)
            ->patch(route('admin.knowledge-base.categories.reorder', $source), [
                'categories' => [$secondChild->id, $firstChild->id],
                'articles' => [$secondArticle->id, $firstArticle->id],
                'return_to' => route('admin.knowledge-base.categories.show', $source),
            ])
            ->assertRedirect(route('admin.knowledge-base.categories.show', $source));

        $this->assertSame(1, $secondChild->fresh()->sort_order);
        $this->assertSame(2, $firstChild->fresh()->sort_order);
        $this->assertSame(1, $secondArticle->fresh()->sort_order);
        $this->assertSame(2, $firstArticle->fresh()->sort_order);

        $this->actingAs($admin)
            ->patch(route('admin.knowledge-base.categories.move', $secondChild), [
                'parent_id' => $target->id,
                'return_to' => route('admin.knowledge-base.categories.show', $source),
            ])
            ->assertRedirect(route('admin.knowledge-base.categories.show', $source));

        $this->assertSame($target->id, $secondChild->fresh()->parent_id);

        $this->actingAs($admin)
            ->patch(route('admin.knowledge-base.articles.move', $secondArticle), [
                'knowledge_category_id' => $target->id,
                'return_to' => route('admin.knowledge-base.categories.show', $source),
            ])
            ->assertRedirect(route('admin.knowledge-base.categories.show', $source));

        $this->assertSame($target->id, $secondArticle->fresh()->knowledge_category_id);
    }

    public function test_admin_searches_articles_categories_and_normalized_blocks(): void
    {
        $category = KnowledgeCategory::query()->create([
            'name' => 'Search Ops',
            'slug' => 'search-ops',
            'icon' => '',
            'sort_order' => 0,
            'is_visible_to_employees' => false,
        ]);

        $article = KnowledgeArticle::query()->create([
            'knowledge_category_id' => $category->id,
            'title' => 'Internal draft',
            'slug' => 'internal-draft',
            'icon' => '',
            'summary' => null,
            'content' => '',
            'blocks' => [],
            'is_published' => false,
        ]);

        KnowledgeArticleBlock::query()->create([
            'knowledge_article_id' => $article->id,
            'block_uid' => 'block-search',
            'type' => 'p',
            'sort_order' => 1,
            'plain_text' => 'needle phrase inside normalized block',
            'data' => ['content' => 'needle phrase inside normalized block'],
        ]);

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.knowledge-base.search', ['q' => 'needle']))
            ->assertOk()
            ->assertSee('"component":"admin\/knowledge-base\/search"', false)
            ->assertSee('Internal draft')
            ->assertSee('needle phrase inside normalized block');
    }

    public function test_employee_search_respects_published_articles_and_visible_categories(): void
    {
        $visibleCategory = KnowledgeCategory::query()->create([
            'name' => 'Visible',
            'slug' => 'visible',
            'icon' => '',
            'sort_order' => 0,
            'is_visible_to_employees' => true,
        ]);

        $hiddenCategory = KnowledgeCategory::query()->create([
            'name' => 'Hidden',
            'slug' => 'hidden',
            'icon' => '',
            'sort_order' => 1,
            'is_visible_to_employees' => false,
        ]);

        KnowledgeArticle::query()->create([
            'knowledge_category_id' => $visibleCategory->id,
            'title' => 'Public needle article',
            'slug' => 'public-needle-article',
            'icon' => '',
            'summary' => 'needle public',
            'content' => '',
            'blocks' => [],
            'is_published' => true,
        ]);

        KnowledgeArticle::query()->create([
            'knowledge_category_id' => $visibleCategory->id,
            'title' => 'Draft needle article',
            'slug' => 'draft-needle-article',
            'icon' => '',
            'summary' => 'needle draft',
            'content' => '',
            'blocks' => [],
            'is_published' => false,
        ]);

        KnowledgeArticle::query()->create([
            'knowledge_category_id' => $hiddenCategory->id,
            'title' => 'Hidden needle article',
            'slug' => 'hidden-needle-article',
            'icon' => '',
            'summary' => 'needle hidden',
            'content' => '',
            'blocks' => [],
            'is_published' => true,
        ]);

        $employee = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
        ]);

        $this->actingAs($employee)
            ->get(route('employee.knowledge-base.search', ['q' => 'needle']))
            ->assertOk()
            ->assertSee('"component":"employee\/knowledge-base\/search"', false)
            ->assertSee('Public needle article')
            ->assertDontSee('Draft needle article')
            ->assertDontSee('Hidden needle article');
    }

    public function test_employee_cannot_open_or_search_admin_only_article(): void
    {
        $category = KnowledgeCategory::query()->create([
            'name' => 'Access category',
            'slug' => 'access-category',
            'icon' => '',
            'sort_order' => 0,
            'is_visible_to_employees' => true,
        ]);

        $article = KnowledgeArticle::query()->create([
            'knowledge_category_id' => $category->id,
            'title' => 'Admin only needle article',
            'slug' => 'admin-only-needle-article',
            'icon' => '',
            'summary' => 'needle secret',
            'content' => '',
            'blocks' => [],
            'is_published' => true,
            'access_level' => KnowledgeArticle::ACCESS_ADMINS,
        ]);

        $employee = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
        ]);

        $this->actingAs($employee)
            ->get(route('employee.knowledge-base.articles.show', $article))
            ->assertForbidden();

        $this->actingAs($employee)
            ->get(route('employee.knowledge-base.search', ['q' => 'needle']))
            ->assertOk()
            ->assertDontSee('Admin only needle article');
    }

    public function test_admin_can_update_access_screen_rules(): void
    {
        $category = KnowledgeCategory::query()->create([
            'name' => 'Access rules',
            'slug' => 'access-rules',
            'icon' => '',
            'sort_order' => 0,
            'is_visible_to_employees' => true,
        ]);

        $article = KnowledgeArticle::query()->create([
            'knowledge_category_id' => $category->id,
            'title' => 'Access controlled article',
            'slug' => 'access-controlled-article',
            'icon' => '',
            'summary' => null,
            'content' => '',
            'blocks' => [],
            'is_published' => true,
            'access_level' => KnowledgeArticle::ACCESS_INHERIT,
        ]);

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.access.index'))
            ->assertOk()
            ->assertSee('"component":"admin\/access\/index"', false)
            ->assertSee('Access controlled article');

        $this->actingAs($admin)
            ->patch(route('admin.access.categories.update', $category), [
                'is_visible_to_employees' => false,
            ])
            ->assertRedirect();

        $this->actingAs($admin)
            ->patch(route('admin.access.articles.update', $article), [
                'is_published' => false,
                'access_level' => KnowledgeArticle::ACCESS_ADMINS,
            ])
            ->assertRedirect();

        $this->assertFalse($category->fresh()->is_visible_to_employees);
        $this->assertFalse($article->fresh()->is_published);
        $this->assertSame(
            KnowledgeArticle::ACCESS_ADMINS,
            $article->fresh()->access_level,
        );
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'knowledge_category.access_updated',
            'subject_type' => KnowledgeCategory::class,
            'subject_id' => $category->id,
            'user_id' => $admin->id,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'knowledge_article.access_updated',
            'subject_type' => KnowledgeArticle::class,
            'subject_id' => $article->id,
            'user_id' => $admin->id,
        ]);
    }

    public function test_access_screen_reflects_explicitly_disabled_category_and_article(): void
    {
        $category = KnowledgeCategory::query()->create([
            'name' => 'Visible access category',
            'slug' => 'visible-access-category',
            'icon' => '',
            'sort_order' => 0,
            'is_visible_to_employees' => true,
        ]);

        $article = KnowledgeArticle::query()->create([
            'knowledge_category_id' => $category->id,
            'title' => 'Published access article',
            'slug' => 'published-access-article',
            'icon' => '',
            'summary' => 'Access screen regression',
            'content' => '',
            'blocks' => [],
            'is_published' => true,
        ]);

        $employee = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
        ]);

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.access.users.update', $employee), [
                'is_deactivated' => false,
                'can_view' => true,
                'can_create' => false,
                'can_update' => false,
                'can_delete' => false,
                'view_all_articles' => false,
                'category_ids' => [],
                'article_ids' => [],
            ])
            ->assertRedirect();

        $this->actingAs($admin)
            ->get(route('admin.access.index', ['user' => $employee->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/access/index')
                ->where('selectedUserId', $employee->id)
                ->has('categories', 1, fn (Assert $categoryProps) => $categoryProps
                    ->where('id', $category->id)
                    ->where('name', 'Visible access category')
                    ->where('can_view', false)
                    ->has('articles', 1, fn (Assert $articleProps) => $articleProps
                        ->where('id', $article->id)
                        ->where('title', 'Published access article')
                        ->where('can_view', false)
                        ->etc()
                    )
                    ->etc()
                ),
            );

        $this->actingAs($employee)
            ->get(route('employee.knowledge-base.index'))
            ->assertOk()
            ->assertDontSee('Visible access category');

        $this->actingAs($employee)
            ->get(route('employee.knowledge-base.search', ['q' => 'Published access']))
            ->assertOk()
            ->assertDontSee('Published access article');
    }

    public function test_employee_permissions_enable_article_create_update_asset_upload_and_delete(): void
    {
        Storage::fake('public');

        $category = KnowledgeCategory::query()->create([
            'name' => 'Employee editable category',
            'slug' => 'employee-editable-category',
            'icon' => '',
            'sort_order' => 0,
            'is_visible_to_employees' => true,
        ]);

        $article = KnowledgeArticle::query()->create([
            'knowledge_category_id' => $category->id,
            'title' => 'Employee editable article',
            'slug' => 'employee-editable-article',
            'icon' => '',
            'summary' => 'Original summary',
            'content' => '',
            'blocks' => [],
            'is_published' => true,
        ]);

        $employee = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
        ]);

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.access.users.update', $employee), [
                'is_deactivated' => false,
                'can_view' => true,
                'can_create' => true,
                'can_update' => true,
                'can_delete' => true,
                'view_all_articles' => false,
                'category_ids' => [$category->id],
                'article_ids' => [$article->id],
            ])
            ->assertRedirect();

        $this->actingAs($employee)
            ->get(route('employee.knowledge-base.categories.show', $category))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('employee/knowledge-base/category')
                ->where('controls.can_create_article', true)
                ->etc()
            );

        $this->actingAs($employee)
            ->get(route('employee.knowledge-base.articles.show', $article))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('employee/knowledge-base/article')
                ->where('controls.can_update', true)
                ->where('controls.can_delete', true)
                ->where('controls.can_upload_assets', true)
                ->etc()
            );

        $this->actingAs($employee)
            ->post(route('employee.knowledge-base.articles.store', $category), [
                'knowledge_category_id' => $category->id,
                'title' => 'Employee created article',
                'icon' => '',
                'summary' => 'Created by employee',
                'content' => 'Created by employee',
                'blocks' => json_encode([
                    [
                        'id' => 'block-created',
                        'type' => 'p',
                        'content' => 'Created by employee',
                        'html' => 'Created by employee',
                    ],
                ], JSON_UNESCAPED_UNICODE),
                'is_published' => true,
                'access_level' => KnowledgeArticle::ACCESS_INHERIT,
                'return_to' => route('employee.knowledge-base.categories.show', $category),
            ])
            ->assertRedirect();

        $createdArticle = KnowledgeArticle::query()->where('title', 'Employee created article')->firstOrFail();

        $this->assertSame($employee->id, $createdArticle->created_by);

        $this->actingAs($employee)
            ->get(route('employee.knowledge-base.articles.show', $createdArticle))
            ->assertOk();

        $this->actingAs($employee)
            ->put(route('employee.knowledge-base.articles.update', $article), [
                'knowledge_category_id' => $category->id,
                'title' => 'Employee updated article',
                'icon' => '',
                'summary' => 'Updated by employee',
                'content' => 'Updated by employee',
                'blocks' => json_encode([
                    [
                        'id' => 'block-updated',
                        'type' => 'p',
                        'content' => 'Updated by employee',
                        'html' => 'Updated by employee',
                    ],
                ], JSON_UNESCAPED_UNICODE),
                'is_published' => true,
                'access_level' => KnowledgeArticle::ACCESS_INHERIT,
                'return_to' => route('employee.knowledge-base.articles.show', $article),
            ])
            ->assertRedirect(route('employee.knowledge-base.articles.show', $article->fresh()));

        $this->assertSame('Employee updated article', $article->fresh()->title);

        $article = $article->fresh();

        $this->actingAs($employee)
            ->post(route('employee.knowledge-base.articles.assets.store', $article), [
                'kind' => 'image',
                'asset' => UploadedFile::fake()->image('employee-article.png', 320, 240),
            ])
            ->assertOk()
            ->assertJsonPath('name', 'employee-article.png');

        $this->actingAs($employee)
            ->delete(route('employee.knowledge-base.articles.destroy', $createdArticle), [
                'return_to' => route('employee.knowledge-base.categories.show', $category),
            ])
            ->assertRedirect(route('employee.knowledge-base.categories.show', $category));

        $this->assertDatabaseMissing('knowledge_articles', [
            'id' => $createdArticle->id,
        ]);
    }

    public function test_employee_author_can_open_and_search_own_draft_article(): void
    {
        $category = KnowledgeCategory::query()->create([
            'name' => 'Draft category',
            'slug' => 'draft-category',
            'icon' => '',
            'sort_order' => 0,
            'is_visible_to_employees' => true,
        ]);

        $employee = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
        ]);

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.access.users.update', $employee), [
                'is_deactivated' => false,
                'can_view' => true,
                'can_create' => true,
                'can_update' => true,
                'can_delete' => true,
                'view_all_articles' => false,
                'category_ids' => [$category->id],
                'article_ids' => [],
            ])
            ->assertRedirect();

        $this->actingAs($employee)
            ->post(route('employee.knowledge-base.articles.store', $category), [
                'knowledge_category_id' => $category->id,
                'title' => 'My private draft',
                'icon' => '',
                'summary' => 'private draft summary',
                'content' => 'private draft content',
                'blocks' => json_encode([
                    [
                        'id' => 'block-private-draft',
                        'type' => 'p',
                        'content' => 'private draft content',
                        'html' => 'private draft content',
                    ],
                ], JSON_UNESCAPED_UNICODE),
                'is_published' => false,
                'access_level' => KnowledgeArticle::ACCESS_INHERIT,
                'return_to' => route('employee.knowledge-base.categories.show', $category),
            ])
            ->assertRedirect();

        $draft = KnowledgeArticle::query()->where('title', 'My private draft')->firstOrFail();

        $this->actingAs($employee)
            ->get(route('employee.knowledge-base.articles.show', $draft))
            ->assertOk()
            ->assertSee('My private draft');

        $this->actingAs($employee)
            ->get(route('employee.knowledge-base.search', ['q' => 'private draft']))
            ->assertOk()
            ->assertSee('My private draft');
    }

    public function test_admin_search_preview_returns_categories_and_articles_json(): void
    {
        $category = KnowledgeCategory::query()->create([
            'name' => 'Basics SMM',
            'slug' => 'basics-smm',
            'icon' => '',
            'sort_order' => 0,
            'is_visible_to_employees' => true,
        ]);

        KnowledgeArticle::query()->create([
            'knowledge_category_id' => $category->id,
            'title' => 'Basics content plan',
            'slug' => 'basics-content-plan',
            'icon' => '',
            'summary' => 'Базовый материал для команды.',
            'content' => '',
            'blocks' => [],
            'is_published' => true,
        ]);

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->getJson(route('admin.knowledge-base.search.preview', ['q' => 'basics']))
            ->assertOk()
            ->assertJsonPath('query', 'basics')
            ->assertJsonPath('results.total', 2)
            ->assertJsonFragment([
                'title' => 'Basics SMM',
                'type' => 'category',
            ])
            ->assertJsonFragment([
                'title' => 'Basics content plan',
                'type' => 'article',
            ]);
    }
}
