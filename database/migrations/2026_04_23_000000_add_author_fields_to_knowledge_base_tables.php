<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('knowledge_categories', function (Blueprint $table): void {
            $table->foreignId('created_by')
                ->nullable()
                ->after('is_visible_to_employees')
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignId('updated_by')
                ->nullable()
                ->after('created_by')
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::table('knowledge_articles', function (Blueprint $table): void {
            $table->foreignId('created_by')
                ->nullable()
                ->after('is_published')
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignId('updated_by')
                ->nullable()
                ->after('created_by')
                ->constrained('users')
                ->nullOnDelete();
        });

        $authorId = DB::table('users')
            ->where('role', 'admin')
            ->orderBy('id')
            ->value('id');

        if ($authorId) {
            DB::table('knowledge_categories')
                ->whereNull('created_by')
                ->update([
                    'created_by' => $authorId,
                    'updated_by' => $authorId,
                ]);

            DB::table('knowledge_articles')
                ->whereNull('created_by')
                ->update([
                    'created_by' => $authorId,
                    'updated_by' => $authorId,
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('knowledge_articles', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('updated_by');
            $table->dropConstrainedForeignId('created_by');
        });

        Schema::table('knowledge_categories', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('updated_by');
            $table->dropConstrainedForeignId('created_by');
        });
    }
};
