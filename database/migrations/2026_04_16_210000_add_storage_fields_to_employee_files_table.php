<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_files', function (Blueprint $table) {
            $table->string('path')->nullable()->after('original_name');
        });
    }

    public function down(): void
    {
        Schema::table('employee_files', function (Blueprint $table) {
            $table->dropColumn('path');
        });
    }
};
