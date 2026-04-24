<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('knowledge_user_permissions', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id')->unique();
            $table->boolean('is_deactivated')->default(false);
            $table->boolean('can_view')->default(true);
            $table->boolean('can_create')->default(false);
            $table->boolean('can_update')->default(false);
            $table->boolean('can_delete')->default(false);
            $table->boolean('view_all_articles')->default(true);
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->foreign('user_id', 'ku_perm_user_fk')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('updated_by', 'ku_perm_updater_fk')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('knowledge_user_category_permissions', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('knowledge_category_id');
            $table->boolean('can_view')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'knowledge_category_id'], 'ku_category_unique');
            $table->foreign('user_id', 'ku_category_user_fk')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('knowledge_category_id', 'ku_category_category_fk')->references('id')->on('knowledge_categories')->cascadeOnDelete();
        });

        Schema::create('knowledge_user_article_permissions', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('knowledge_article_id');
            $table->boolean('can_view')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'knowledge_article_id'], 'ku_article_unique');
            $table->foreign('user_id', 'ku_article_user_fk')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('knowledge_article_id', 'ku_article_article_fk')->references('id')->on('knowledge_articles')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('knowledge_user_article_permissions');
        Schema::dropIfExists('knowledge_user_category_permissions');
        Schema::dropIfExists('knowledge_user_permissions');
    }
};
