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
        Schema::create('system_demo_records', function (Blueprint $table) {
            $table->id();
            $table->string('batch_id', 64)->index();
            $table->foreignId('company_id')->nullable()->constrained('companies')->nullOnDelete();
            $table->string('table_name', 100)->index();
            $table->unsignedBigInteger('record_id')->index();
            $table->timestamps();

            $table->unique(['table_name', 'record_id']);
            $table->index(['batch_id', 'table_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_demo_records');
    }
};
