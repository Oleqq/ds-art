<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'knowledge_article_id',
    'knowledge_article_block_id',
    'block_uid',
    'kind',
    'url',
    'storage_path',
    'original_name',
    'mime',
    'size_label',
    'caption',
    'sort_order',
    'meta',
])]
class KnowledgeArticleAsset extends Model
{
    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(KnowledgeArticle::class, 'knowledge_article_id');
    }

    public function block(): BelongsTo
    {
        return $this->belongsTo(KnowledgeArticleBlock::class, 'knowledge_article_block_id');
    }
}
