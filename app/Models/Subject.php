<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Subject extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'name', 'code', 'description', 'semester', 'section', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'created_at' => 'datetime',
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

    public function users()
    {
        return $this->hasMany(UserSubject::class);
    }

    public function enrolledUsers()
    {
        return $this->belongsToMany(User::class, 'user_subjects')->withPivot('enrolled_at');
    }

    public function posts()
    {
        return $this->hasMany(Post::class);
    }

    public function grades()
    {
        return $this->hasMany(Grade::class);
    }
}
