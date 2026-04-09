<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Grade extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['score', 'feedback', 'student_id', 'teacher_id', 'post_id', 'subject_id'];

    protected $casts = [
        'score' => 'float',
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

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function post()
    {
        return $this->belongsTo(Post::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }
}
