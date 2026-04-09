<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateUserSubjectsTable extends Migration
{
    public function up()
    {
        Schema::create('user_subjects', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->uuid('subject_id');
            $table->timestamp('enrolled_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('subject_id')->references('id')->on('subjects')->onDelete('cascade');

            $table->unique(['user_id', 'subject_id']);
            $table->index('subject_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('user_subjects');
    }
}
