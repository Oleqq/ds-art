<?php

namespace App\Support\KnowledgeBase;

class KnowledgeArticleBlocks
{
    public static function fromStored(?array $blocks, ?string $fallbackText = null): array
    {
        if (is_array($blocks) && $blocks !== []) {
            return array_values(array_map([self::class, 'normalizeBlock'], $blocks));
        }

        $text = trim((string) $fallbackText);

        if ($text === '') {
            return [self::makeBlock('p')];
        }

        $paragraphs = preg_split('/\n{2,}/', $text) ?: [];

        return array_values(array_map(
            fn ($paragraph) => self::makeBlock('p', ['content' => trim((string) $paragraph)]),
            array_filter($paragraphs, fn ($paragraph) => trim((string) $paragraph) !== ''),
        ));
    }

    public static function decode(?string $json, ?string $fallbackText = null): array
    {
        $decoded = json_decode((string) $json, true);

        if (! is_array($decoded)) {
            return self::fromStored(null, $fallbackText);
        }

        return self::fromStored($decoded, $fallbackText);
    }

    public static function plainText(array $blocks): string
    {
        $parts = [];

        foreach ($blocks as $block) {
            $normalized = self::normalizeBlock($block);

            if (in_array($normalized['type'], ['p', 'h2', 'h3', 'quote'], true)) {
                $parts[] = trim((string) ($normalized['content'] ?? ''));

                continue;
            }

            if (in_array($normalized['type'], ['ul', 'ol'], true)) {
                $parts[] = implode("\n", array_map('trim', $normalized['items'] ?? []));

                continue;
            }

            if ($normalized['type'] === 'code') {
                $parts[] = trim((string) ($normalized['code'] ?? ''));

                continue;
            }

            if ($normalized['type'] === 'table') {
                foreach ($normalized['rows'] ?? [] as $row) {
                    $parts[] = implode(' ', array_map('trim', $row));
                }

                continue;
            }

            if (in_array($normalized['type'], ['image', 'video', 'file', 'link'], true)) {
                $parts[] = trim((string) ($normalized['caption'] ?? $normalized['name'] ?? ''));
            }
        }

        return trim(implode("\n\n", array_filter($parts, fn ($part) => $part !== '')));
    }

    public static function makeBlock(string $type, array $overrides = []): array
    {
        return self::normalizeBlock([
            'id' => $overrides['id'] ?? ('b'.str()->uuid()),
            'type' => $type,
            ...$overrides,
        ]);
    }

    private static function normalizeBlock(array $block): array
    {
        $type = (string) ($block['type'] ?? 'p');
        $id = (string) ($block['id'] ?? ('b'.str()->uuid()));

        return match ($type) {
            'h2', 'h3', 'p', 'quote' => [
                'id' => $id,
                'type' => $type,
                'content' => (string) ($block['content'] ?? ''),
                'html' => isset($block['html']) ? (string) $block['html'] : null,
            ],
            'ul', 'ol' => [
                'id' => $id,
                'type' => $type,
                'items' => array_values(array_map(
                    fn ($item) => (string) $item,
                    is_array($block['items'] ?? null)
                        ? $block['items']
                        : (preg_split('/\n+/', (string) ($block['content'] ?? '')) ?: []),
                )),
            ],
            'code' => [
                'id' => $id,
                'type' => $type,
                'language' => (string) ($block['language'] ?? ''),
                'code' => (string) ($block['code'] ?? $block['content'] ?? ''),
            ],
            'image' => [
                'id' => $id,
                'type' => $type,
                'url' => (string) ($block['url'] ?? ''),
                'caption' => (string) ($block['caption'] ?? ''),
            ],
            'video' => [
                'id' => $id,
                'type' => $type,
                'url' => (string) ($block['url'] ?? ''),
                'caption' => (string) ($block['caption'] ?? ''),
            ],
            'file' => [
                'id' => $id,
                'type' => $type,
                'url' => (string) ($block['url'] ?? ''),
                'name' => (string) ($block['name'] ?? ''),
                'size_label' => (string) ($block['size_label'] ?? ''),
                'caption' => (string) ($block['caption'] ?? ''),
            ],
            'table' => [
                'id' => $id,
                'type' => $type,
                'rows' => self::normalizeRows($block['rows'] ?? null),
            ],
            'link' => [
                'id' => $id,
                'type' => $type,
                'url' => (string) ($block['url'] ?? ''),
                'title' => (string) ($block['title'] ?? ''),
                'caption' => (string) ($block['caption'] ?? ''),
            ],
            default => [
                'id' => $id,
                'type' => 'p',
                'content' => (string) ($block['content'] ?? ''),
                'html' => isset($block['html']) ? (string) $block['html'] : null,
            ],
        };
    }

    private static function normalizeRows(mixed $rows): array
    {
        if (! is_array($rows) || $rows === []) {
            return [
                ['Колонка 1', 'Колонка 2', 'Колонка 3'],
                ['', '', ''],
            ];
        }

        return array_values(array_map(
            fn ($row) => array_values(array_map(fn ($cell) => (string) $cell, is_array($row) ? $row : [])),
            $rows,
        ));
    }
}
