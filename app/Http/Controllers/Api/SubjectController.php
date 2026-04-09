<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserSubject;
use App\Models\Subject;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    public function mySubjects()
    {
        $userId = auth()->id();

        $subjects = UserSubject::where('user_id', $userId)
            ->with(['subject' => function ($q) {
                $q->withCount(['posts', 'users']);
            }])
            ->get()
            ->map(function ($us) {
                $s = $us->subject;
                return [
                    'id' => $s->id,
                    'name' => $s->name,
                    'code' => $s->code,
                    'description' => $s->description,
                    'semester' => $s->semester,
                    'section' => $s->section,
                    'isActive' => $s->is_active,
                    'postsCount' => $s->posts_count,
                    'usersCount' => $s->users_count,
                    'enrolledAt' => $us->enrolled_at,
                ];
            });

        return response()->json(['data' => $subjects]);
    }

    public function show($id)
    {
        $userId = auth()->id();

        $enrolled = UserSubject::where('user_id', $userId)->where('subject_id', $id)->exists();
        if (!$enrolled && auth()->user()->role !== 'SUPER_ADMIN') {
            return response()->json(['message' => 'No estas inscrito en esta materia'], 403);
        }

        $subject = Subject::withCount(['posts', 'users'])->findOrFail($id);

        return response()->json([
            'id' => $subject->id,
            'name' => $subject->name,
            'code' => $subject->code,
            'description' => $subject->description,
            'semester' => $subject->semester,
            'section' => $subject->section,
            'isActive' => $subject->is_active,
            'postsCount' => $subject->posts_count,
            'usersCount' => $subject->users_count,
        ]);
    }

    public function members($id)
    {
        $userId = auth()->id();

        $enrolled = UserSubject::where('user_id', $userId)->where('subject_id', $id)->exists();
        if (!$enrolled && auth()->user()->role !== 'SUPER_ADMIN') {
            return response()->json(['message' => 'No estas inscrito en esta materia'], 403);
        }

        $members = UserSubject::where('subject_id', $id)
            ->with('user')
            ->get()
            ->map(function ($us) {
                $u = $us->user;
                return [
                    'id' => $u->id,
                    'firstName' => $u->first_name,
                    'lastName' => $u->last_name,
                    'username' => $u->username,
                    'role' => $u->role,
                    'avatarUrl' => $u->avatar_url,
                    'enrolledAt' => $us->enrolled_at,
                ];
            });

        return response()->json(['data' => $members]);
    }
}
