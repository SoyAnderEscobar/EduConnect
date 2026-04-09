<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AIPracticeAttempt extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $table = 'ai_practice_attempts';

    protected $fillable = [
        'example_id',
        'student_answer',
        'ai_feedback',
        'attempt_number',
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

    public function example()
    {
        return $this->belongsTo(AIPracticeExample::class, 'example_id');
    }
}
