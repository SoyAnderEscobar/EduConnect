<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function createStudent(array $overrides = []): User
    {
        return User::create(array_merge([
            'cedula' => '99999999',
            'username' => 'V99999999',
            'password' => Hash::make('test1234'),
            'first_name' => 'Test',
            'last_name' => 'Student',
            'role' => 'STUDENT',
        ], $overrides));
    }

    private function createTeacher(array $overrides = []): User
    {
        return User::create(array_merge([
            'cedula' => '88888888',
            'username' => 'V88888888',
            'password' => Hash::make('test1234'),
            'first_name' => 'Test',
            'last_name' => 'Teacher',
            'role' => 'TEACHER',
        ], $overrides));
    }

    private function createAdmin(array $overrides = []): User
    {
        return User::create(array_merge([
            'cedula' => '00000000',
            'username' => 'admin',
            'password' => Hash::make('admin123'),
            'first_name' => 'Admin',
            'last_name' => 'Sistema',
            'role' => 'SUPER_ADMIN',
        ], $overrides));
    }

    // ==================== LOGIN TESTS ====================

    public function test_student_can_login_with_correct_credentials()
    {
        $this->createStudent();

        $response = $this->postJson('/api/auth/login', [
            'username' => 'V99999999',
            'password' => 'test1234',
            'role' => 'STUDENT',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['token', 'refreshToken', 'user'])
            ->assertJsonPath('user.role', 'STUDENT')
            ->assertJsonPath('user.username', 'V99999999');
    }

    public function test_teacher_can_login_with_correct_credentials()
    {
        $this->createTeacher();

        $response = $this->postJson('/api/auth/login', [
            'username' => 'V88888888',
            'password' => 'test1234',
            'role' => 'TEACHER',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['token', 'refreshToken', 'user'])
            ->assertJsonPath('user.role', 'TEACHER');
    }

    public function test_login_fails_with_wrong_password()
    {
        $this->createStudent();

        $response = $this->postJson('/api/auth/login', [
            'username' => 'V99999999',
            'password' => 'wrongpassword',
            'role' => 'STUDENT',
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('message', 'Credenciales incorrectas');
    }

    public function test_login_fails_with_nonexistent_user()
    {
        $response = $this->postJson('/api/auth/login', [
            'username' => 'noexiste',
            'password' => 'test1234',
            'role' => 'STUDENT',
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('message', 'Credenciales incorrectas');
    }

    public function test_login_fails_with_wrong_role()
    {
        $this->createStudent();

        $response = $this->postJson('/api/auth/login', [
            'username' => 'V99999999',
            'password' => 'test1234',
            'role' => 'TEACHER',
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('message', 'Rol incorrecto para este usuario');
    }

    public function test_login_fails_for_inactive_user()
    {
        $this->createStudent(['is_active' => false]);

        $response = $this->postJson('/api/auth/login', [
            'username' => 'V99999999',
            'password' => 'test1234',
            'role' => 'STUDENT',
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'Usuario desactivado');
    }

    public function test_login_validates_required_fields()
    {
        $response = $this->postJson('/api/auth/login', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['username', 'password', 'role']);
    }

    public function test_login_validates_role_values()
    {
        $response = $this->postJson('/api/auth/login', [
            'username' => 'test',
            'password' => 'test',
            'role' => 'INVALID_ROLE',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }

    // ==================== ADMIN LOGIN TESTS ====================

    public function test_admin_can_login()
    {
        $this->createAdmin();

        $response = $this->postJson('/api/auth/admin-login', [
            'username' => 'admin',
            'password' => 'admin123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['token', 'refreshToken', 'user'])
            ->assertJsonPath('user.role', 'SUPER_ADMIN');
    }

    public function test_admin_login_fails_for_non_admin()
    {
        $this->createStudent();

        $response = $this->postJson('/api/auth/admin-login', [
            'username' => 'V99999999',
            'password' => 'test1234',
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'No tienes permisos de administrador');
    }

    public function test_admin_login_fails_with_wrong_password()
    {
        $this->createAdmin();

        $response = $this->postJson('/api/auth/admin-login', [
            'username' => 'admin',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('message', 'Credenciales incorrectas');
    }

    // ==================== AUTH ME TESTS ====================

    public function test_authenticated_user_can_get_profile()
    {
        $user = $this->createStudent();
        $token = \Tymon\JWTAuth\Facades\JWTAuth::fromUser($user);

        $response = $this->getJson('/api/auth/me', [
            'Authorization' => "Bearer $token",
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('user.username', 'V99999999')
            ->assertJsonPath('user.firstName', 'Test')
            ->assertJsonPath('user.lastName', 'Student');
    }

    public function test_unauthenticated_user_cannot_get_profile()
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(401);
    }

    // ==================== TOKEN REFRESH TESTS ====================

    public function test_can_refresh_token()
    {
        $user = $this->createStudent();
        $refreshToken = \Tymon\JWTAuth\Facades\JWTAuth::claims(['refresh' => true])->fromUser($user);

        $response = $this->postJson('/api/auth/refresh', [
            'refreshToken' => $refreshToken,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['token', 'refreshToken']);
    }

    public function test_cannot_refresh_with_regular_token()
    {
        $user = $this->createStudent();
        $token = \Tymon\JWTAuth\Facades\JWTAuth::fromUser($user);

        $response = $this->postJson('/api/auth/refresh', [
            'refreshToken' => $token,
        ]);

        $response->assertStatus(401);
    }

    public function test_cannot_refresh_with_invalid_token()
    {
        $response = $this->postJson('/api/auth/refresh', [
            'refreshToken' => 'invalid-token',
        ]);

        $response->assertStatus(401);
    }

    // ==================== CHANGE PASSWORD TESTS ====================

    public function test_user_can_change_password()
    {
        $user = $this->createStudent();
        $token = \Tymon\JWTAuth\Facades\JWTAuth::fromUser($user);

        $response = $this->putJson('/api/auth/change-password', [
            'currentPassword' => 'test1234',
            'newPassword' => 'newpass123',
        ], [
            'Authorization' => "Bearer $token",
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Contrasena actualizada exitosamente');

        // Verify new password works
        $loginResponse = $this->postJson('/api/auth/login', [
            'username' => 'V99999999',
            'password' => 'newpass123',
            'role' => 'STUDENT',
        ]);

        $loginResponse->assertStatus(200);
    }

    public function test_change_password_fails_with_wrong_current_password()
    {
        $user = $this->createStudent();
        $token = \Tymon\JWTAuth\Facades\JWTAuth::fromUser($user);

        $response = $this->putJson('/api/auth/change-password', [
            'currentPassword' => 'wrongpassword',
            'newPassword' => 'newpass123',
        ], [
            'Authorization' => "Bearer $token",
        ]);

        $response->assertStatus(400)
            ->assertJsonPath('message', 'Contrasena actual incorrecta');
    }

    // ==================== SEEDER VALIDATION ====================

    public function test_seeder_creates_users_correctly()
    {
        $this->seed();

        // Verify users exist
        $this->assertDatabaseHas('users', ['username' => 'admin', 'role' => 'SUPER_ADMIN']);
        $this->assertDatabaseHas('users', ['username' => 'V11111111', 'role' => 'TEACHER']);
        $this->assertDatabaseHas('users', ['username' => 'V22222222', 'role' => 'STUDENT']);
        $this->assertDatabaseHas('users', ['username' => 'V33333333', 'role' => 'STUDENT']);

        // Verify seeded users can login
        $response = $this->postJson('/api/auth/login', [
            'username' => 'V22222222',
            'password' => 'alumno123',
            'role' => 'STUDENT',
        ]);

        $response->assertStatus(200);
    }

    public function test_seeder_teacher_can_login()
    {
        $this->seed();

        $response = $this->postJson('/api/auth/login', [
            'username' => 'V11111111',
            'password' => 'profesor123',
            'role' => 'TEACHER',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('user.role', 'TEACHER');
    }

    public function test_seeder_admin_can_login()
    {
        $this->seed();

        $response = $this->postJson('/api/auth/admin-login', [
            'username' => 'admin',
            'password' => 'admin123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('user.role', 'SUPER_ADMIN');
    }
}
