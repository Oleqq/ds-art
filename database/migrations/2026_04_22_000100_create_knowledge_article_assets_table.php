<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('knowledge_article_assets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('knowledge_article_id')
                ->constrained('knowledge_articles')
                ->cascadeOnDelete();
            $table->foreignId('knowledge_article_block_id')
                ->nullable()
                ->constrained('knowledge_article_blocks')
                ->cascadeOnDelete();
            $table->string('block_uid', 80);
            $table->string('kind', 32);
            $table->string('url', 2048)->nullable();
            $table->string('storage_path', 2048)->nullable();
            $table->string('original_name')->nullable();
            $table->string('mime', 120)->nullable();
            $table->string('size_label', 40)->nullable();
            $table->string('caption')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique(['knowledge_article_id', 'block_uid']);
            $table->index(['knowledge_article_id', 'kind']);
            $table->index(['knowledge_article_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('knowledge_article_assets');
    }
};
