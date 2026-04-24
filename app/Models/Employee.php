<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'name',
    'email',
    'phone',
    'position',
    'joined_on',
    'status',
    'salary',
    'photo_url',
    'manager_notes',
    'schedule',
])]
class Employee extends Model
{
    use HasFactory;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_INACTIVE = 'inactive';

    public const POSITIONS = [
        'SMM-менеджер',
        'Дизайнер',
        'Копирайтер',
        'Проект-менеджер',
        'Таргетолог',
        'Руководитель',
    ];

    public const DEFAULT_SCHEDULE = [
        'days' => [0, 1, 2, 3, 4],
        'start' => '10:00',
        'end' => '19:00',
    ];

    protected function casts(): array
    {
        return [
            'joined_on' => 'date',
            'schedule' => 'array',
        ];
    }

    public function user(): HasOne
    {
        return $this->hasOne(User::class);
    }

    public function files(): HasMany
    {
        return $this->hasMany(EmployeeFile::class)
            ->orderByDesc('uploaded_at')
            ->orderByDesc('id');
    }

    protected function isActive(): Attribute
    {
        return Attribute::make(
            get: fn (): bool => $this->status === self::STATUS_ACTIVE,
        );
    }

    public static function defaultSchedule(): array
    {
        return self::DEFAULT_SCHEDULE;
    }

    public static function positions(): array
    {
        return self::POSITIONS;
    }

    public static function availablePositions(): array
    {
        return collect(self::POSITIONS)
            ->merge(
                self::query()
                    ->whereNotNull('position')
                    ->pluck('position')
                    ->all(),
            )
            ->map(fn ($position) => trim((string) $position))
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();
    }
}
