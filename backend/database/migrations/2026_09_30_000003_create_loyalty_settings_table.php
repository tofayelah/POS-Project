<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->decimal('earning_spend_per_point', 15, 4)->default(100.0000);
            $table->decimal('earning_points_awarded', 15, 4)->default(1.0000);
            $table->decimal('redemption_point_value', 15, 4)->default(1.0000);
            $table->decimal('min_redemption_points', 15, 4)->default(400.0000);
            $table->boolean('is_active')->default(true);
            $table->boolean('disallow_earn_on_discount')->default(true);
            $table->boolean('disallow_earn_on_redemption')->default(true);
            $table->boolean('disallow_discount_with_redemption')->default(true);
            $table->timestamps();

            $table->unique('company_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_settings');
    }
};
