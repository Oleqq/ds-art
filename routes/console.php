<?php

use App\Models\KnowledgeArticle;
use App\Support\KnowledgeBase\KnowledgeArticleStructureSync;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('knowledge-base:sync-article-structure', function (KnowledgeArticleStructureSync $structureSync): int {
    $count = 0;

    KnowledgeArticle::query()
        ->orderBy('id')
        ->each(function (KnowledgeArticle $article) use ($structureSync, &$count): void {
            $structureSync->sync($article);
            $count++;
        });

    $this->info("Синхронизировано статей: {$count}");

    return self::SUCCESS;
})->purpose('Синхронизировать SQL-слой блоков и ассетов статей базы знаний');
