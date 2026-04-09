<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleGuard
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = auth()->user();

        if (!$user) {
            return response()->json(['message' => 'No autenticado'], 401);
        }

        if (!in_array($user->role, $roles)) {
            return response()->json(['message' => 'No tienes permisos para esta accion'], 403);
        }

        return $next($request);
    }
}
