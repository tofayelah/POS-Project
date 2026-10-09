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
        Schema::create('system_backups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->nullable()->constrained('companies')->nullOnDelete();
            $table->string('filename')->unique();
            $table->string('storage_path');
            $table->string('database_driver', 32)->default('pgsql');
            $table->string('database_name', 128);
            $table->unsignedBigInteger('file_size')->default(0);
            $table->string('checksum', 64)->nullable();
            $table->string('status', 32)->default('PENDING'); // PENDING, RUNNING, COMPLETED, FAILED
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_backups');
    }
};
