<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_practice_examples', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->text('content');
            $table->uuid('post_id');
            $table->uuid('student_id');
            $table->enum('status', ['IN_PROGRESS', 'SUBMITTED', 'CORRECT', 'INCORRECT'])->default('IN_PROGRESS');
            $table->text('teacher_feedback')->nullable();
            $table->uuid('validated_by')->nullable();
            $table->timestamp('validated_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->foreign('post_id')->references('id')->on('posts')->onDelete('cascade');
            $table->foreign('student_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('validated_by')->references('id')->on('users')->onDelete('set null');
        });

        Schema::create('ai_practice_attempts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('example_id');
            $table->text('student_answer');
            $table->text('ai_feedback')->nullable();
            $table->integer('attempt_number')->default(1);
            $table->timestamps();

            $table->foreign('example_id')->references('id')->on('ai_practice_examples')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_practice_attempts');
        Schema::dropIfExists('ai_practice_examples');
    }
};
