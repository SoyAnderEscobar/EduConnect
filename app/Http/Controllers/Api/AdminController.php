<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Subject;
use App\Models\UserSubject;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller
{
    public function listUsers(Request $request)
    {
        $query = User::query();

        if ($request->role) {
            $query->where('role', $request->role);
        }

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'ilike', "%{$search}%")
                  ->orWhere('last_name', 'ilike', "%{$search}%")
                  ->orWhere('username', 'ilike', "%{$search}%")
                  ->orWhere('cedula', 'ilike', "%{$search}%");
            });
        }

        $page = $request->get('page', 1);
        $limit = min($request->get('limit', 20), 50);

        $total = $query->count();
        $users = $query->with('enrolledSubjects')
            ->orderBy('created_at', 'desc')
            ->skip(($page - 1) * $limit)
            ->take($limit)
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'cedula' => $user->cedula,
                    'username' => $user->username,
                    'firstName' => $user->first_name,
                    'lastName' => $user->last_name,
                    'role' => $user->role,
                    'avatarUrl' => $user->avatar_url,
                    'isActive' => $user->is_active,
                    'createdAt' => $user->created_at,
                    'subjects' => $user->enrolledSubjects->map(function ($s) {
                        return ['id' => $s->id, 'name' => $s->name, 'code' => $s->code];
                    }),
                ];
            });

        return response()->json([
            'data' => $users,
            'pagination' => [
                'page' => (int)$page,
                'limit' => $limit,
                'total' => $total,
                'totalPages' => ceil($total / $limit),
            ],
        ]);
    }

    public function createUser(Request $request)
    {
        $request->validate([
            'firstName' => 'required|string',
            'lastName' => 'required|string',
            'cedula' => 'required|string|unique:users,cedula',
            'username' => 'required|string|unique:users,username',
            'password' => 'required|string|min:6',
            'role' => 'required|in:SUPER_ADMIN,TEACHER,STUDENT',
            'subjectIds' => 'array',
            'subjectIds.*' => 'uuid',
        ]);

        $user = User::create([
            'first_name' => $request->firstName,
            'last_name' => $request->lastName,
            'cedula' => $request->cedula,
            'username' => $request->username,
            'password' => Hash::make($request->password),
            'role' => $request->role,
        ]);

        if ($request->subjectIds) {
            foreach ($request->subjectIds as $subjectId) {
                UserSubject::create([
                    'user_id' => $user->id,
                    'subject_id' => $subjectId,
                ]);
            }
        }

        $user->load('enrolledSubjects');

        return response()->json([
            'message' => 'Usuario creado exitosamente',
            'user' => $user,
        ], 201);
    }

    public function updateUser(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'firstName' => 'string',
            'lastName' => 'string',
            'cedula' => 'string|unique:users,cedula,' . $id,
            'username' => 'string|unique:users,username,' . $id,
            'password' => 'string|min:6',
            'role' => 'in:SUPER_ADMIN,TEACHER,STUDENT',
            'isActive' => 'boolean',
            'subjectIds' => 'array',
            'subjectIds.*' => 'uuid',
        ]);

        $fields = [];
        if ($request->has('firstName')) $fields['first_name'] = $request->firstName;
        if ($request->has('lastName')) $fields['last_name'] = $request->lastName;
        if ($request->has('cedula')) $fields['cedula'] = $request->cedula;
        if ($request->has('username')) $fields['username'] = $request->username;
        if ($request->has('role')) $fields['role'] = $request->role;
        if ($request->has('isActive')) $fields['is_active'] = $request->isActive;
        if ($request->has('password')) $fields['password'] = Hash::make($request->password);

        $user->update($fields);

        if ($request->has('subjectIds')) {
            UserSubject::where('user_id', $id)->delete();
            foreach ($request->subjectIds as $subjectId) {
                UserSubject::create([
                    'user_id' => $id,
                    'subject_id' => $subjectId,
                ]);
            }
        }

        $user->load('enrolledSubjects');

        return response()->json([
            'message' => 'Usuario actualizado exitosamente',
            'user' => $user,
        ]);
    }

    public function deleteUser($id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_active' => false]);

        return response()->json(['message' => 'Usuario desactivado exitosamente']);
    }

    public function listSubjects()
    {
        $subjects = Subject::withCount(['posts', 'users'])->get()->map(function ($s) {
            return [
                'id' => $s->id,
                'name' => $s->name,
                'code' => $s->code,
                'description' => $s->description,
                'semester' => $s->semester,
                'section' => $s->section,
                'isActive' => $s->is_active,
                'createdAt' => $s->created_at,
                'postsCount' => $s->posts_count,
                'usersCount' => $s->users_count,
            ];
        });

        return response()->json(['data' => $subjects]);
    }

    public function createSubject(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'code' => 'required|string|unique:subjects,code',
            'description' => 'string|nullable',
            'semester' => 'string|nullable',
            'section' => 'string|nullable',
        ]);

        $subject = Subject::create($request->only(['name', 'code', 'description', 'semester', 'section']));

        return response()->json([
            'message' => 'Materia creada exitosamente',
            'subject' => $subject,
        ], 201);
    }

    public function updateSubject(Request $request, $id)
    {
        $subject = Subject::findOrFail($id);

        $request->validate([
            'name' => 'string',
            'code' => 'string|unique:subjects,code,' . $id,
            'description' => 'string|nullable',
            'semester' => 'string|nullable',
            'section' => 'string|nullable',
            'isActive' => 'boolean',
        ]);

        $fields = $request->only(['name', 'code', 'description', 'semester', 'section']);
        if ($request->has('isActive')) $fields['is_active'] = $request->isActive;

        $subject->update($fields);

        return response()->json([
            'message' => 'Materia actualizada exitosamente',
            'subject' => $subject,
        ]);
    }

    public function deleteSubject($id)
    {
        $subject = Subject::findOrFail($id);
        $subject->update(['is_active' => false]);

        return response()->json(['message' => 'Materia desactivada exitosamente']);
    }

    public function enroll(Request $request)
    {
        $request->validate([
            'userId' => 'required|uuid|exists:users,id',
            'subjectId' => 'required|uuid|exists:subjects,id',
        ]);

        $exists = UserSubject::where('user_id', $request->userId)
            ->where('subject_id', $request->subjectId)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'El usuario ya esta inscrito en esta materia'], 400);
        }

        UserSubject::create([
            'user_id' => $request->userId,
            'subject_id' => $request->subjectId,
        ]);

        return response()->json(['message' => 'Usuario inscrito exitosamente'], 201);
    }

    public function unenroll(Request $request)
    {
        $request->validate([
            'userId' => 'required|uuid|exists:users,id',
            'subjectId' => 'required|uuid|exists:subjects,id',
        ]);

        $deleted = UserSubject::where('user_id', $request->userId)
            ->where('subject_id', $request->subjectId)
            ->delete();

        if (!$deleted) {
            return response()->json(['message' => 'Inscripcion no encontrada'], 404);
        }

        return response()->json(['message' => 'Usuario desinscrito exitosamente']);
    }

    public function stats()
    {
        return response()->json([
            'students' => User::where('role', 'STUDENT')->count(),
            'teachers' => User::where('role', 'TEACHER')->count(),
            'subjects' => Subject::where('is_active', true)->count(),
            'posts' => Post::count(),
        ]);
    }
}
