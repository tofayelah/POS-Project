<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('company_id')->constrained()->restrictOnDelete();
            $table->foreignId('business_unit_id')->constrained()->restrictOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('code');
            $table->text('address')->nullable();
            $table->string('warehouse_type')->default('CENTRAL'); // CENTRAL, BRANCH, STORE, RETURN, DAMAGED
            $table->string('status')->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['business_unit_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouses');
    }
};
