<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'knowledge_article_id',
    'block_uid',
    'type',
    'sort_order',
    'plain_text',
    'html',
    'data',
])]
class KnowledgeArticleBlock extends Model
{
    protected function casts(): array
    {
        return [
            'data' => 'array',
        ];
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(KnowledgeArticle::class, 'knowledge_article_id');
    }

    public function asset(): HasOne
    {
        return $this->hasOne(KnowledgeArticleAsset::class, 'knowledge_article_block_id');
    }
}
