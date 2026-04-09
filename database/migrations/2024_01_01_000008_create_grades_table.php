<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateGradesTable extends Migration
{
    public function up()
    {
        Schema::create('grades', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->float('score');
            $table->text('feedback')->nullable();
            $table->uuid('student_id');
            $table->uuid('teacher_id');
            $table->uuid('post_id');
            $table->uuid('subject_id');
            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('users');
            $table->foreign('teacher_id')->references('id')->on('users');
            $table->foreign('post_id')->references('id')->on('posts');
            $table->foreign('subject_id')->references('id')->on('subjects');

            $table->unique(['student_id', 'post_id']);
            $table->index(['subject_id', 'student_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('grades');
    }
}
