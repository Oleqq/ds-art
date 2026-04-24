<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('knowledge_article_blocks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('knowledge_article_id')
                ->constrained('knowledge_articles')
                ->cascadeOnDelete();
            $table->string('block_uid', 80);
            $table->string('type', 32);
            $table->unsignedInteger('sort_order')->default(0);
            $table->longText('plain_text')->nullable();
            $table->longText('html')->nullable();
            $table->json('data')->nullable();
            $table->timestamps();

            $table->unique(['knowledge_article_id', 'block_uid']);
            $table->index(['knowledge_article_id', 'type']);
            $table->index(['knowledge_article_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('knowledge_article_blocks');
    }
};
