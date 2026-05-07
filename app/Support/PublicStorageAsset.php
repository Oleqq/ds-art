<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

class PublicStorageAsset
{
    private const LEGACY_PREFIX = '/storage/';

    private const PUBLIC_PREFIX = '/media/';

    public static function delete(?string $url): void
    {
        $path = self::pathFromUrl($url);

        if (! $path) {
            return;
        }

        Storage::disk('public')->delete($path);
    }

    public static function pathFromUrl(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        $path = parse_url($url, PHP_URL_PATH);

        if (! is_string($path)) {
            return null;
        }

        foreach ([self::PUBLIC_PREFIX, self::LEGACY_PREFIX] as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return ltrim(substr($path, strlen($prefix)), '/');
            }
        }

        return null;
    }

    public static function appendQuery(string $url, array $query): string
    {
        $path = self::pathOnly($url);
        $normalized = array_filter(
            $query,
            static fn ($value) => $value !== null && $value !== '',
        );

        if ($normalized === []) {
            return $path;
        }

        return $path.'?'.http_build_query($normalized);
    }

    public static function appendQueryParameters(string $url, array $query): string
    {
        return self::appendQuery($url, $query);
    }

    public static function pathOnly(string $url): string
    {
        $path = parse_url($url, PHP_URL_PATH);

        return is_string($path) && $path !== '' ? $path : $url;
    }

    public static function normalize(?string $url): ?string
    {
        if (! $url) {
            return $url;
        }

        $path = self::pathFromUrl($url);

        if (! $path) {
            return $url;
        }

        return self::appendQuery(
            route('public.storage', ['path' => $path], false),
            self::queryFromUrl($url),
        );
    }

    public static function url(string $path, array $query = []): string
    {
        return self::appendQuery(
            route('public.storage', ['path' => $path], false),
            $query,
        );
    }

    /**
     * @return array<string, scalar|array|null>
     */
    private static function queryFromUrl(string $url): array
    {
        $query = parse_url($url, PHP_URL_QUERY);

        if (! is_string($query) || $query === '') {
            return [];
        }

        parse_str($query, $parsed);

        return is_array($parsed) ? $parsed : [];
    }
}
