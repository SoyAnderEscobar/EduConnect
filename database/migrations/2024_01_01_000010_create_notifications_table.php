<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateNotificationsTable extends Migration
{
    public function up()
    {
        Schema::create('notifications_custom', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('type', ['NEW_POST', 'NEW_COMMENT', 'NEW_GRADE', 'NEW_MESSAGE', 'DEADLINE_REMINDER', 'ANNOUNCEMENT']);
            $table->string('title');
            $table->text('message');
            $table->string('link')->nullable();
            $table->boolean('is_read')->default(false);
            $table->uuid('user_id');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

            $table->index(['user_id', 'is_read', 'created_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('notifications_custom');
    }
}
