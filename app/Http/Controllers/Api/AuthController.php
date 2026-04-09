<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
            'role' => 'required|in:STUDENT,TEACHER',
        ]);

        $user = User::where('username', $request->username)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Credenciales incorrectas'], 401);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'Usuario desactivado'], 403);
        }

        if ($user->role !== $request->role) {
            return response()->json(['message' => 'Rol incorrecto para este usuario'], 401);
        }

        $token = JWTAuth::fromUser($user);
        $refreshToken = JWTAuth::claims(['refresh' => true])->fromUser($user);

        return response()->json([
            'token' => $token,
            'refreshToken' => $refreshToken,
            'user' => $this->formatUser($user),
        ]);
    }

    public function adminLogin(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('username', $request->username)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Credenciales incorrectas'], 401);
        }

        if ($user->role !== 'SUPER_ADMIN') {
            return response()->json(['message' => 'No tienes permisos de administrador'], 403);
        }

        $token = JWTAuth::fromUser($user);
        $refreshToken = JWTAuth::claims(['refresh' => true])->fromUser($user);

        return response()->json([
            'token' => $token,
            'refreshToken' => $refreshToken,
            'user' => $this->formatUser($user),
        ]);
    }

    public function refresh(Request $request)
    {
        $request->validate(['refreshToken' => 'required|string']);

        try {
            JWTAuth::setToken($request->refreshToken);
            $payload = JWTAuth::getPayload();

            if (!$payload->get('refresh')) {
                return response()->json(['message' => 'Token de refresco invalido'], 401);
            }

            $user = JWTAuth::authenticate();
            $token = JWTAuth::fromUser($user);
            $refreshToken = JWTAuth::claims(['refresh' => true])->fromUser($user);

            return response()->json([
                'token' => $token,
                'refreshToken' => $refreshToken,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Token de refresco invalido o expirado'], 401);
        }
    }

    public function me()
    {
        $user = auth()->user();
        $user->load('enrolledSubjects');

        return response()->json([
            'user' => $this->formatUser($user),
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'currentPassword' => 'required|string',
            'newPassword' => 'required|string|min:6',
        ]);

        $user = auth()->user();

        if (!Hash::check($request->currentPassword, $user->password)) {
            return response()->json(['message' => 'Contrasena actual incorrecta'], 400);
        }

        $user->password = Hash::make($request->newPassword);
        $user->save();

        return response()->json(['message' => 'Contrasena actualizada exitosamente']);
    }

    private function formatUser($user)
    {
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
            'subjects' => $user->enrolledSubjects ? $user->enrolledSubjects->map(function ($s) {
                return [
                    'id' => $s->id,
                    'name' => $s->name,
                    'code' => $s->code,
                ];
            }) : [],
        ];
    }
}
