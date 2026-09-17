<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('storage_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->string('code', 50);
            $table->string('name', 150);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->unique(['warehouse_id', 'code']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('storage_locations');
    }
};
