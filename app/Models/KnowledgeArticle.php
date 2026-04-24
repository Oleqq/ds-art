<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'knowledge_category_id',
    'title',
    'slug',
    'icon',
    'icon_image_url',
    'summary',
    'content',
    'cover_url',
    'blocks',
    'sort_order',
    'is_published',
    'scheduled_publish_at',
    'tags',
    'access_level',
    'created_by',
    'updated_by',
])]
class KnowledgeArticle extends Model
{
    use HasFactory;

    public const ACCESS_INHERIT = 'inherit';

    public const ACCESS_EMPLOYEES = 'employees';

    public const ACCESS_ADMINS = 'admins';

    public const ACCESS_AUTHOR = 'author';

    public const ACCESS_LEVELS = [
        self::ACCESS_INHERIT,
        self::ACCESS_EMPLOYEES,
        self::ACCESS_ADMINS,
        self::ACCESS_AUTHOR,
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'scheduled_publish_at' => 'datetime',
            'tags' => 'array',
            'blocks' => 'array',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(KnowledgeCategory::class, 'knowledge_category_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function structureBlocks(): HasMany
    {
        return $this->hasMany(KnowledgeArticleBlock::class, 'knowledge_article_id')
            ->orderBy('sort_order');
    }

    public function assets(): HasMany
    {
        return $this->hasMany(KnowledgeArticleAsset::class, 'knowledge_article_id')
            ->orderBy('sort_order');
    }
}
