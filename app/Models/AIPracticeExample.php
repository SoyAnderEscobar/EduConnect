<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AIPracticeExample extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $table = 'ai_practice_examples';

    protected $fillable = [
        'content',
        'post_id',
        'student_id',
        'status',
        'teacher_feedback',
        'validated_by',
        'validated_at',
        'submitted_at',
    ];

    protected $casts = [
        'validated_at' => 'datetime',
        'submitted_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (!$model->id) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function post()
    {
        return $this->belongsTo(Post::class);
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function validator()
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    public function attempts()
    {
        return $this->hasMany(AIPracticeAttempt::class, 'example_id')->orderBy('attempt_number', 'asc');
    }
}
