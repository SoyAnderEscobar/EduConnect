<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Subject;
use App\Models\UserSubject;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        // Super Admin
        $admin = User::create([
            'cedula' => '00000000',
            'username' => 'admin',
            'password' => Hash::make('admin123'),
            'first_name' => 'Admin',
            'last_name' => 'Sistema',
            'role' => 'SUPER_ADMIN',
        ]);

        // Teacher
        $teacher = User::create([
            'cedula' => '11111111',
            'username' => 'V11111111',
            'password' => Hash::make('profesor123'),
            'first_name' => 'Carlos',
            'last_name' => 'Garcia',
            'role' => 'TEACHER',
        ]);

        // Students
        $student1 = User::create([
            'cedula' => '22222222',
            'username' => 'V22222222',
            'password' => Hash::make('alumno123'),
            'first_name' => 'Maria',
            'last_name' => 'Lopez',
            'role' => 'STUDENT',
        ]);

        $student2 = User::create([
            'cedula' => '33333333',
            'username' => 'V33333333',
            'password' => Hash::make('alumno123'),
            'first_name' => 'Juan',
            'last_name' => 'Perez',
            'role' => 'STUDENT',
        ]);

        // Subjects
        $prg = Subject::create([
            'name' => 'Programacion I',
            'code' => 'PRG-101',
            'description' => 'Fundamentos de programacion y logica computacional',
            'semester' => '2026-1',
            'section' => 'A',
        ]);

        $bdd = Subject::create([
            'name' => 'Base de Datos II',
            'code' => 'BDD-201',
            'description' => 'Diseño avanzado de bases de datos relacionales',
            'semester' => '2026-1',
            'section' => 'A',
        ]);

        $red = Subject::create([
            'name' => 'Redes de Computadoras',
            'code' => 'RED-301',
            'description' => 'Fundamentos de redes y protocolos de comunicacion',
            'semester' => '2026-1',
            'section' => 'A',
        ]);

        // Enroll all non-admin users in PRG-101
        foreach ([$teacher, $student1, $student2] as $user) {
            UserSubject::create([
                'user_id' => $user->id,
                'subject_id' => $prg->id,
            ]);
        }

        echo "Seed completado:\n";
        echo "- Admin: admin / admin123\n";
        echo "- Profesor: V11111111 / profesor123\n";
        echo "- Alumno 1: V22222222 / alumno123\n";
        echo "- Alumno 2: V33333333 / alumno123\n";
        echo "- Materias: PRG-101, BDD-201, RED-301\n";
    }
}
