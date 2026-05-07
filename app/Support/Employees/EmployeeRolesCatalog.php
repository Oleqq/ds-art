<?php

namespace App\Support\Employees;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class EmployeeRolesCatalog
{
    private const PATH = 'employee-roles.json';

    /**
     * @return array<int, string>
     */
    public static function stored(): array
    {
        if (! Storage::disk('local')->exists(self::PATH)) {
            return [];
        }

        $payload = json_decode(
            Storage::disk('local')->get(self::PATH),
            true,
        );

        if (! is_array($payload)) {
            return [];
        }

        return self::normalize(collect($payload));
    }

    public static function add(string $role): void
    {
        $roles = collect(self::stored())
            ->push($role);

        self::store($roles);
    }

    public static function remove(string $role): void
    {
        $normalizedRole = mb_strtolower(trim($role));

        $roles = collect(self::stored())->reject(
            static fn (string $storedRole) => mb_strtolower($storedRole) === $normalizedRole,
        );

        self::store($roles);
    }

    private static function store(Collection $roles): void
    {
        Storage::disk('local')->put(
            self::PATH,
            json_encode(
                self::normalize($roles),
                JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE,
            ),
        );
    }

    /**
     * @return array<int, string>
     */
    private static function normalize(Collection $roles): array
    {
        return $roles
            ->map(static fn ($role) => trim((string) $role))
            ->filter()
            ->unique(static fn (string $role) => mb_strtolower($role))
            ->sort(SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();
    }
}
