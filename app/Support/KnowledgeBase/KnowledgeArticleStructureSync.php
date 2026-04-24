<?php

namespace App\Support\KnowledgeBase;

use App\Models\KnowledgeArticle;
use App\Models\KnowledgeArticleAsset;
use App\Models\KnowledgeArticleBlock;
use Illuminate\Support\Str;

class KnowledgeArticleStructureSync
{
    public function sync(KnowledgeArticle $article): void
    {
        $blocks = KnowledgeArticleBlocks::fromStored($article->blocks, $article->content);
        $seenBlockUids = [];
        $seenAssetUids = [];

        foreach ($blocks as $index => $block) {
            $blockUid = $this->blockUid($block);
            $seenBlockUids[] = $blockUid;

            $blockRecord = KnowledgeArticleBlock::query()->updateOrCreate(
                [
                    'knowledge_article_id' => $article->id,
                    'block_uid' => $blockUid,
                ],
                [
                    'type' => (string) ($block['type'] ?? 'p'),
                    'sort_order' => $index,
                    'plain_text' => $this->plainTextForBlock($block),
                    'html' => $this->htmlForBlock($block),
                    'data' => $this->dataForBlock($block),
                ],
            );

            if ($this->isAssetBlock($block)) {
                $seenAssetUids[] = $blockUid;
                $this->syncAssetBlock($article, $blockRecord, $block, $index);
            }
        }

        KnowledgeArticleBlock::query()
            ->where('knowledge_article_id', $article->id)
            ->whereNotIn('block_uid', $seenBlockUids)
            ->delete();

        KnowledgeArticleAsset::query()
            ->where('knowledge_article_id', $article->id)
            ->when(
                $seenAssetUids !== [],
                fn ($query) => $query->whereNotIn('block_uid', $seenAssetUids),
                fn ($query) => $query,
            )
            ->delete();
    }

    private function syncAssetBlock(
        KnowledgeArticle $article,
        KnowledgeArticleBlock $blockRecord,
        array $block,
        int $sortOrder,
    ): void {
        $url = trim((string) ($block['url'] ?? ''));

        KnowledgeArticleAsset::query()->updateOrCreate(
            [
                'knowledge_article_id' => $article->id,
                'block_uid' => $blockRecord->block_uid,
            ],
            [
                'knowledge_article_block_id' => $blockRecord->id,
                'kind' => (string) ($block['type'] ?? 'file'),
                'url' => $url !== '' ? $url : null,
                'storage_path' => $this->storagePathFromUrl($url),
                'original_name' => $this->assetName($block),
                'mime' => isset($block['mime']) ? (string) $block['mime'] : null,
                'size_label' => isset($block['size_label']) ? (string) $block['size_label'] : null,
                'caption' => $this->assetCaption($block),
                'sort_order' => $sortOrder,
                'meta' => $this->dataForBlock($block),
            ],
        );
    }

    private function blockUid(array $block): string
    {
        $uid = trim((string) ($block['id'] ?? ''));

        return $uid !== '' ? $uid : 'b'.Str::uuid();
    }

    private function plainTextForBlock(array $block): ?string
    {
        $type = (string) ($block['type'] ?? 'p');

        $text = match ($type) {
            'p', 'h2', 'h3', 'quote' => (string) ($block['content'] ?? ''),
            'ul', 'ol' => implode("\n", array_map('strval', $block['items'] ?? [])),
            'code' => (string) ($block['code'] ?? ''),
            'table' => $this->tablePlainText($block['rows'] ?? []),
            'link' => trim((string) ($block['title'] ?? '').' '.(string) ($block['url'] ?? '')),
            'image', 'video' => trim((string) ($block['caption'] ?? '').' '.(string) ($block['url'] ?? '')),
            'file' => trim((string) ($block['name'] ?? '').' '.(string) ($block['caption'] ?? '').' '.(string) ($block['url'] ?? '')),
            default => '',
        };

        $text = trim($text);

        return $text !== '' ? $text : null;
    }

    private function htmlForBlock(array $block): ?string
    {
        $html = isset($block['html']) ? trim((string) $block['html']) : '';

        return $html !== '' ? $html : null;
    }

    private function dataForBlock(array $block): array
    {
        $data = $block;
        unset($data['id']);

        return $data;
    }

    private function tablePlainText(mixed $rows): string
    {
        if (! is_array($rows)) {
            return '';
        }

        return trim(implode("\n", array_map(
            fn ($row) => is_array($row)
                ? implode(' ', array_map(fn ($cell) => trim((string) $cell), $row))
                : '',
            $rows,
        )));
    }

    private function isAssetBlock(array $block): bool
    {
        return in_array((string) ($block['type'] ?? ''), ['image', 'video', 'file'], true);
    }

    private function storagePathFromUrl(string $url): ?string
    {
        if (! str_starts_with($url, '/storage/')) {
            return null;
        }

        return ltrim(Str::after($url, '/storage/'), '/');
    }

    private function assetName(array $block): ?string
    {
        $name = trim((string) ($block['name'] ?? ''));

        return $name !== '' ? $name : null;
    }

    private function assetCaption(array $block): ?string
    {
        $caption = trim((string) ($block['caption'] ?? ''));

        return $caption !== '' ? $caption : null;
    }
}
