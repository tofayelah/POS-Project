<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->string('source_document_type', 150)->nullable();
            $table->unsignedBigInteger('source_document_id')->nullable();
            $table->string('posting_type', 50)->nullable();
            
            $table->unique(['company_id', 'source_document_type', 'source_document_id', 'posting_type'], 'uq_journal_source');
        });
    }
    public function down(): void {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropUnique('uq_journal_source');
            $table->dropColumn(['source_document_type', 'source_document_id', 'posting_type']);
        });
    }
};
