<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->foreignId('business_unit_id')->nullable()->constrained('business_units')->onDelete('set null');
            $table->foreignId('customer_group_id')->nullable()->constrained('customer_groups')->onDelete('set null');
            $table->string('customer_code');
            $table->string('name');
            $table->string('mobile')->nullable();
            $table->string('alternate_mobile')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('country')->nullable();
            $table->decimal('credit_limit', 15, 4)->nullable();
            $table->string('payment_terms')->nullable(); // Cash, 7 Days, 15 Days, 30 Days
            $table->decimal('opening_balance', 15, 4)->default(0);
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('ACTIVE'); // ACTIVE, INACTIVE
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'customer_code']);
            $table->index('mobile');
            $table->index('email');
            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
