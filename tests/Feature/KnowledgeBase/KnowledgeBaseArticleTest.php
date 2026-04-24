<?php

namespace Tests\Feature\KnowledgeBase;

use App\Models\KnowledgeArticle;
use App\Models\KnowledgeArticleAsset;
use App\Models\KnowledgeArticleBlock;
use App\Models\KnowledgeCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class KnowledgeBaseArticleTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_article_from_category_and_open_it(): void
    {
        $category = KnowledgeCategory::query()->create([
            'name' => 'Таргетолог',
            'slug' => 'targetolog',
            'icon' => '🎯',
            'sort_order' => 0,
            'is_visible_to_employees' => true,
        ]);

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $response = $this->actingAs($admin)
            ->post(route('admin.knowledge-base.articles.store', $category), [
                'knowledge_category_id' => $category->id,
                'title' => 'Структура рекламного кабинета',
                'icon' => '📄',
                'summary' => 'Базовая статья по структуре кабинета.',
                'content' => 'Первый абзац статьи.',
                'is_published' => true,
                'return_to' => route('admin.knowledge-base.categories.show', $category),
            ]);

        $article = KnowledgeArticle::query()
            ->where('title', 'Структура рекламного кабинета')
            ->firstOrFail();

        $response->assertRedirect(route('admin.knowledge-base.articles.show', $article));
        $this->assertDatabaseHas('knowledge_article_blocks', [
            'knowledge_article_id' => $article->id,
            'type' => 'p',
            'plain_text' => 'Первый абзац статьи.',
        ]);

        $this->actingAs($admin)
            ->get(route('admin.knowledge-base.articles.show', $article))
            ->assertOk()
            ->assertSee('"component":"admin\/knowledge-base\/article"', false)
            ->assertSee(json_encode('Структура рекламного кабинета'), false);
    }

    public function test_admin_can_update_article_and_upload_cover_without_hard_redirect_logic(): void
    {
        Storage::fake('public');

        $category = KnowledgeCategory::query()->create([
            'name' => 'Дизайнер',
            'slug' => 'designer',
            'icon' => '🎨',
            'sort_order' => 0,
            'is_visible_to_employees' => true,
        ]);

        $article = KnowledgeArticle::query()->create([
            'knowledge_category_id' => $category->id,
            'title' => 'Работа в Figma',
            'slug' => 'figma-work',
            'icon' => '📄',
            'summary' => 'Черновик',
            'content' => null,
            'is_published' => false,
        ]);

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->put(route('admin.knowledge-base.articles.update', $article), [
                'knowledge_category_id' => $category->id,
                'title' => 'Работа в Figma: базовые принципы',
                'icon' => '🧩',
                'summary' => 'Обновленное описание',
                'content' => 'Полный контент статьи.',
                'cover' => UploadedFile::fake()->image('cover.jpg', 1200, 320),
                'is_published' => true,
                'tags' => ['figma', 'design-system', 'ui-kit'],
                'return_to' => route('admin.knowledge-base.articles.show', $article),
            ])
            ->assertRedirect(route('admin.knowledge-base.articles.show', $article->fresh()));

        $article->refresh();

        $this->assertSame('Работа в Figma: базовые принципы', $article->title);
        $this->assertSame('🧩', $article->icon);
        $this->assertSame('Обновленное описание', $article->summary);
        $this->assertSame('Полный контент статьи.', $article->content);
        $this->assertTrue($article->is_published);
        $this->assertSame(['figma', 'design-system', 'ui-kit'], $article->tags);
        $this->assertNotNull($article->cover_url);
    }

    public function test_employee_can_open_only_published_article_from_visible_category(): void
    {
        $category = KnowledgeCategory::query()->create([
            'name' => 'Копирайтер',
            'slug' => 'copywriter',
            'icon' => '✍️',
            'sort_order' => 0,
            'is_visible_to_employees' => true,
        ]);

        $publishedArticle = KnowledgeArticle::query()->create([
            'knowledge_category_id' => $category->id,
            'title' => 'Tone of voice агентства',
            'slug' => 'tone-of-voice',
            'icon' => '📄',
            'summary' => 'Публичная статья',
            'content' => 'Контент доступен сотруднику.',
            'is_published' => true,
        ]);

        $draftArticle = KnowledgeArticle::query()->create([
            'knowledge_category_id' => $category->id,
            'title' => 'Черновик редактора',
            'slug' => 'draft-editor',
            'icon' => '📄',
            'summary' => null,
            'content' => 'Контент черновика.',
            'is_published' => false,
        ]);

        $employee = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
        ]);

        $this->actingAs($employee)
            ->get(route('employee.knowledge-base.articles.show', $publishedArticle))
            ->assertOk()
            ->assertSee('"component":"employee\/knowledge-base\/article"', false)
            ->assertSee(json_encode('Tone of voice агентства'), false);

        $this->actingAs($employee)
            ->get(route('employee.knowledge-base.articles.show', $draftArticle))
            ->assertNotFound();
    }

    public function test_admin_can_duplicate_article(): void
    {
        $category = KnowledgeCategory::query()->create([
            'name' => 'SMM',
            'slug' => 'smm',
            'icon' => '📱',
            'sort_order' => 0,
            'is_visible_to_employees' => true,
        ]);

        $article = KnowledgeArticle::query()->create([
            'knowledge_category_id' => $category->id,
            'title' => 'Content plan',
            'slug' => 'content-plan',
            'icon' => '📄',
            'summary' => 'Original article',
            'content' => 'Original content',
            'blocks' => [
                ['id' => 'b1', 'type' => 'p', 'content' => 'Original content'],
            ],
            'is_published' => true,
        ]);

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->post(route('admin.knowledge-base.articles.duplicate', $article))
            ->assertRedirect();

        $copy = KnowledgeArticle::query()
            ->where('title', 'Content plan (копия)')
            ->first();

        $this->assertNotNull($copy);
        $this->assertFalse($copy->is_published);
        $this->assertSame($category->id, $copy->knowledge_category_id);
        $this->assertSame('Original content', $copy->content);
        $this->assertSame('p', $copy->blocks[0]['type']);
        $this->assertDatabaseHas('knowledge_article_blocks', [
            'knowledge_article_id' => $copy->id,
            'block_uid' => 'b1',
            'plain_text' => 'Original content',
        ]);
    }

    public function test_admin_update_syncs_article_blocks_and_assets_for_sql_access(): void
    {
        $category = KnowledgeCategory::query()->create([
            'name' => 'База',
            'slug' => 'base',
            'icon' => '📁',
            'sort_order' => 0,
            'is_visible_to_employees' => true,
        ]);

        $article = KnowledgeArticle::query()->create([
            'knowledge_category_id' => $category->id,
            'title' => 'Структура хранения',
            'slug' => 'storage-structure',
            'icon' => null,
            'summary' => null,
            'content' => '',
            'blocks' => [],
            'is_published' => true,
        ]);

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $blocks = [
            ['id' => 'b-title', 'type' => 'h2', 'content' => 'Главный раздел'],
            ['id' => 'b-text', 'type' => 'p', 'content' => 'Текст для поиска и AI.'],
            [
                'id' => 'b-image',
                'type' => 'image',
                'url' => '/storage/knowledge-base/articles/1/assets/image/diagram.png',
                'caption' => 'Схема процесса',
            ],
            [
                'id' => 'b-file',
                'type' => 'file',
                'url' => '/storage/knowledge-base/articles/1/assets/file/reglament.pdf',
                'name' => 'Регламент.pdf',
                'size_label' => '240 КБ',
                'caption' => 'Файл регламента',
            ],
        ];

        $this->actingAs($admin)
            ->put(route('admin.knowledge-base.articles.update', $article), [
                'knowledge_category_id' => $category->id,
                'title' => 'Структура хранения',
                'icon' => '',
                'summary' => '',
                'content' => '',
                'blocks' => json_encode($blocks, JSON_UNESCAPED_UNICODE),
                'is_published' => true,
                'return_to' => route('admin.knowledge-base.articles.show', $article),
            ])
            ->assertRedirect(route('admin.knowledge-base.articles.show', $article));

        $this->assertSame(4, KnowledgeArticleBlock::query()->where('knowledge_article_id', $article->id)->count());
        $this->assertSame(2, KnowledgeArticleAsset::query()->where('knowledge_article_id', $article->id)->count());

        $this->assertDatabaseHas('knowledge_article_blocks', [
            'knowledge_article_id' => $article->id,
            'block_uid' => 'b-text',
            'type' => 'p',
            'plain_text' => 'Текст для поиска и AI.',
        ]);

        $this->assertDatabaseHas('knowledge_article_assets', [
            'knowledge_article_id' => $article->id,
            'block_uid' => 'b-image',
            'kind' => 'image',
            'storage_path' => 'knowledge-base/articles/1/assets/image/diagram.png',
            'caption' => 'Схема процесса',
        ]);

        $this->assertDatabaseHas('knowledge_article_assets', [
            'knowledge_article_id' => $article->id,
            'block_uid' => 'b-file',
            'kind' => 'file',
            'original_name' => 'Регламент.pdf',
            'size_label' => '240 КБ',
        ]);
    }

    public function test_admin_can_move_article_to_other_category(): void
    {
        $source = KnowledgeCategory::query()->create([
            'name' => 'Source',
            'slug' => 'source',
            'icon' => '📁',
            'sort_order' => 0,
            'is_visible_to_employees' => true,
        ]);

        $target = KnowledgeCategory::query()->create([
            'name' => 'Target',
            'slug' => 'target',
            'icon' => '📁',
            'sort_order' => 1,
            'is_visible_to_employees' => true,
        ]);

        $article = KnowledgeArticle::query()->create([
            'knowledge_category_id' => $source->id,
            'title' => 'Move me',
            'slug' => 'move-me',
            'icon' => '📄',
            'summary' => null,
            'content' => 'Draft',
            'blocks' => [
                ['id' => 'b1', 'type' => 'p', 'content' => 'Draft'],
            ],
            'is_published' => false,
        ]);

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.knowledge-base.articles.move', $article), [
                'knowledge_category_id' => $target->id,
            ])
            ->assertRedirect(route('admin.knowledge-base.articles.show', $article->fresh()));

        $article->refresh();

        $this->assertSame($target->id, $article->knowledge_category_id);
    }

    public function test_admin_can_upload_article_asset(): void
    {
        Storage::fake('public');

        $category = KnowledgeCategory::query()->create([
            'name' => 'Media',
            'slug' => 'media',
            'icon' => '📁',
            'sort_order' => 0,
            'is_visible_to_employees' => true,
        ]);

        $article = KnowledgeArticle::query()->create([
            'knowledge_category_id' => $category->id,
            'title' => 'Assets',
            'slug' => 'assets',
            'icon' => '📄',
            'summary' => null,
            'content' => '',
            'blocks' => [
                ['id' => 'b1', 'type' => 'p', 'content' => ''],
            ],
            'is_published' => false,
        ]);

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->post(route('admin.knowledge-base.articles.assets.store', $article), [
                'kind' => 'image',
                'asset' => UploadedFile::fake()->image('diagram.png', 1200, 800),
            ])
            ->assertOk()
            ->assertJsonStructure(['url', 'name', 'size_label', 'mime']);
    }
}
