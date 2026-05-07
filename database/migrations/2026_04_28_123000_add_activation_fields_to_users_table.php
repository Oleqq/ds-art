<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'activation_code')) {
                $table->string('activation_code')->nullable()->after('password');
            }

            if (! Schema::hasColumn('users', 'activation_code_expires_at')) {
                $table->timestamp('activation_code_expires_at')->nullable()->after('activation_code');
            }

            if (! Schema::hasColumn('users', 'activation_code_sent_at')) {
                $table->timestamp('activation_code_sent_at')->nullable()->after('activation_code_expires_at');
            }

            if (! Schema::hasColumn('users', 'activated_at')) {
                $table->timestamp('activated_at')->nullable()->after('activation_code_sent_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $columns = collect([
            'activation_code',
            'activation_code_expires_at',
            'activation_code_sent_at',
            'activated_at',
        ])->filter(fn (string $column) => Schema::hasColumn('users', $column))
            ->values()
            ->all();

        if ($columns === []) {
            return;
        }

        Schema::table('users', function (Blueprint $table) use ($columns) {
            $table->dropColumn($columns);
        });
    }
};
