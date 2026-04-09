<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePostsTable extends Migration
{
    public function up()
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->text('description');
            $table->text('program_content')->nullable();
            $table->timestamp('due_date')->nullable();
            $table->float('weight_percent')->nullable();
            $table->enum('type', ['PROJECT', 'ANNOUNCEMENT', 'DISCUSSION', 'RESOURCE'])->default('PROJECT');
            $table->boolean('is_pinned')->default(false);
            $table->uuid('author_id');
            $table->uuid('subject_id');
            $table->timestamps();

            $table->foreign('author_id')->references('id')->on('users');
            $table->foreign('subject_id')->references('id')->on('subjects');

            $table->index(['subject_id', 'created_at']);
            $table->index('author_id');
            $table->index('due_date');
        });
    }

    public function down()
    {
        Schema::dropIfExists('posts');
    }
}
