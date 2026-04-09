<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateProjectSubmissionsTable extends Migration
{
    public function up()
    {
        Schema::create('project_submissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');
            $table->uuid('post_id');
            $table->text('content')->nullable();
            $table->string('file_url')->nullable();
            $table->string('file_name')->nullable();
            $table->timestamp('submitted_at')->useCurrent();
            $table->timestamp('updated_at')->nullable();

            $table->foreign('student_id')->references('id')->on('users');
            $table->foreign('post_id')->references('id')->on('posts')->onDelete('cascade');

            $table->unique(['student_id', 'post_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('project_submissions');
    }
}
