<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Post extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'title', 'description', 'program_content', 'due_date',
        'weight_percent', 'type', 'is_pinned', 'author_id', 'subject_id',
    ];

    protected $casts = [
        'due_date' => 'datetime',
        'weight_percent' => 'float',
        'is_pinned' => 'boolean',
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

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function reactions()
    {
        return $this->hasMany(Reaction::class);
    }

    public function submissions()
    {
        return $this->hasMany(ProjectSubmission::class);
    }

    public function grades()
    {
        return $this->hasMany(Grade::class);
    }
}
