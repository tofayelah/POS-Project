<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->string('name');
            $table->string('code')->nullable();
            $table->text('description')->nullable();
            $table->string('status', 20)->default('ACTIVE'); // ACTIVE, INACTIVE
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'name']);
            if (config('database.default') !== 'sqlite') {
                $table->unique(['company_id', 'code']); // SQLite doesn't handle nullable unique elegantly sometimes, but let's try
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_groups');
    }
};
