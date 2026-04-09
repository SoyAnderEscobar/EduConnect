<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateAiMessagesTable extends Migration
{
    public function up()
    {
        Schema::create('ai_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('role');
            $table->text('content');
            $table->uuid('conversation_id');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('conversation_id')->references('id')->on('ai_conversations')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('ai_messages');
    }
}
