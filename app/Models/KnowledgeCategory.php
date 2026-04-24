<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'parent_id',
    'name',
    'slug',
    'icon',
    'icon_image_url',
    'cover_url',
    'sort_order',
    'is_visible_to_employees',
    'created_by',
    'updated_by',
])]
class KnowledgeCategory extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_visible_to_employees' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')
            ->orderBy('sort_order')
            ->orderBy('name');
    }

    public function articles(): HasMany
    {
        return $this->hasMany(KnowledgeArticle::class)
            ->orderBy('sort_order')
            ->orderBy('title');
    }

    public function descendants(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function scopeVisibleTo($query, ?User $user)
    {
        if (! $user || $user->isAdmin()) {
            return $query;
        }

        return $query->where('is_visible_to_employees', true);
    }
}
