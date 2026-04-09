<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateReactionsTable extends Migration
{
    public function up()
    {
        Schema::create('reactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('type', ['LIKE', 'USEFUL', 'QUESTION', 'SOLVED']);
            $table->uuid('user_id');
            $table->uuid('post_id')->nullable();
            $table->uuid('comment_id')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users');
            $table->foreign('post_id')->references('id')->on('posts')->onDelete('cascade');
            $table->foreign('comment_id')->references('id')->on('comments')->onDelete('cascade');

            $table->unique(['user_id', 'post_id', 'type']);
            $table->unique(['user_id', 'comment_id', 'type']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('reactions');
    }
}
