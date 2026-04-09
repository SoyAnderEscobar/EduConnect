<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use App\Models\Post;
use App\Models\UserSubject;
use App\Models\Notification;
use Illuminate\Http\Request;

class GradeController extends Controller
{
    public function myGrades($subjectId)
    {
        $studentId = auth()->id();

        $posts = Post::where('subject_id', $subjectId)
            ->where('type', 'PROJECT')
            ->whereNotNull('weight_percent')
            ->orderBy('created_at', 'asc')
            ->get();

        $grades = Grade::where('subject_id', $subjectId)
            ->where('student_id', $studentId)
            ->get()
            ->keyBy('post_id');

        $gradeList = [];
        $totalWeightGraded = 0;
        $weightedSum = 0;

        foreach ($posts as $post) {
            $grade = $grades->get($post->id);
            $score = $grade ? $grade->score : null;
            $weight = $post->weight_percent;
            $weighted = $score !== null ? ($score / 20) * $weight : null;

            if ($score !== null) {
                $totalWeightGraded += $weight;
                $weightedSum += $weighted;
            }

            $gradeList[] = [
                'postId' => $post->id,
                'postTitle' => $post->title,
                'weight' => $weight,
                'score' => $score,
                'weighted' => $weighted,
                'feedback' => $grade ? $grade->feedback : null,
                'gradeId' => $grade ? $grade->id : null,
            ];
        }

        $projectedFinal = $totalWeightGraded > 0
            ? ($weightedSum / $totalWeightGraded) * 20
            : null;

        return response()->json([
            'grades' => $gradeList,
            'summary' => [
                'totalWeightGraded' => $totalWeightGraded,
                'accumulatedScore' => $weightedSum,
                'projectedFinal' => $projectedFinal ? round($projectedFinal, 2) : null,
            ],
        ]);
    }

    public function summary()
    {
        $studentId = auth()->id();

        $subjects = UserSubject::where('user_id', $studentId)
            ->with('subject')
            ->get();

        $summaries = [];

        foreach ($subjects as $us) {
            $grades = Grade::where('subject_id', $us->subject_id)
                ->where('student_id', $studentId)
                ->with('post')
                ->get();

            $totalWeight = 0;
            $weightedSum = 0;

            foreach ($grades as $grade) {
                if ($grade->post && $grade->post->weight_percent) {
                    $weight = $grade->post->weight_percent;
                    $totalWeight += $weight;
                    $weightedSum += ($grade->score / 20) * $weight;
                }
            }

            $summaries[] = [
                'subjectId' => $us->subject_id,
                'subjectName' => $us->subject->name,
                'subjectCode' => $us->subject->code,
                'gradesCount' => $grades->count(),
                'totalWeightGraded' => $totalWeight,
                'accumulatedScore' => $weightedSum,
                'projectedFinal' => $totalWeight > 0 ? round(($weightedSum / $totalWeight) * 20, 2) : null,
            ];
        }

        return response()->json(['data' => $summaries]);
    }

    public function assignGrade(Request $request, $postId)
    {
        $request->validate([
            'studentId' => 'required|uuid|exists:users,id',
            'score' => 'required|numeric|min:0|max:20',
            'feedback' => 'string|nullable',
        ]);

        $post = Post::findOrFail($postId);
        $teacherId = auth()->id();

        if ($post->author_id !== $teacherId) {
            return response()->json(['message' => 'Solo el autor del post puede calificar'], 403);
        }

        $existing = Grade::where('student_id', $request->studentId)
            ->where('post_id', $postId)
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Ya existe una calificacion para este estudiante'], 400);
        }

        $grade = Grade::create([
            'score' => $request->score,
            'feedback' => $request->feedback,
            'student_id' => $request->studentId,
            'teacher_id' => $teacherId,
            'post_id' => $postId,
            'subject_id' => $post->subject_id,
        ]);

        Notification::create([
            'type' => 'NEW_GRADE',
            'title' => 'Nueva calificacion',
            'message' => 'Has recibido ' . $request->score . '/20 en: ' . $post->title,
            'link' => '/grades',
            'user_id' => $request->studentId,
        ]);

        return response()->json($grade, 201);
    }

    public function updateGrade(Request $request, $id)
    {
        $grade = Grade::findOrFail($id);

        if ($grade->teacher_id !== auth()->id()) {
            return response()->json(['message' => 'No puedes editar esta calificacion'], 403);
        }

        $request->validate([
            'score' => 'numeric|min:0|max:20',
            'feedback' => 'string|nullable',
        ]);

        $fields = [];
        if ($request->has('score')) $fields['score'] = $request->score;
        if ($request->has('feedback')) $fields['feedback'] = $request->feedback;

        $grade->update($fields);

        return response()->json($grade);
    }

    public function postGrades($postId)
    {
        $post = Post::findOrFail($postId);

        $grades = Grade::where('post_id', $postId)
            ->with('student:id,first_name,last_name,username,cedula')
            ->get()
            ->map(function ($grade) {
                return [
                    'id' => $grade->id,
                    'score' => $grade->score,
                    'feedback' => $grade->feedback,
                    'createdAt' => $grade->created_at,
                    'student' => [
                        'id' => $grade->student->id,
                        'firstName' => $grade->student->first_name,
                        'lastName' => $grade->student->last_name,
                        'username' => $grade->student->username,
                        'cedula' => $grade->student->cedula,
                    ],
                ];
            });

        return response()->json(['data' => $grades]);
    }

    public function subjectGradeReport($subjectId)
    {
        $students = UserSubject::where('subject_id', $subjectId)
            ->whereHas('user', function ($q) {
                $q->where('role', 'STUDENT');
            })
            ->with('user:id,first_name,last_name,username,cedula')
            ->get();

        $posts = Post::where('subject_id', $subjectId)
            ->where('type', 'PROJECT')
            ->whereNotNull('weight_percent')
            ->orderBy('created_at', 'asc')
            ->get();

        $allGrades = Grade::where('subject_id', $subjectId)->get();

        $report = [];

        foreach ($students as $us) {
            $studentGrades = $allGrades->where('student_id', $us->user_id);
            $totalWeight = 0;
            $weightedSum = 0;
            $postGrades = [];

            foreach ($posts as $post) {
                $grade = $studentGrades->where('post_id', $post->id)->first();
                $postGrades[] = [
                    'postId' => $post->id,
                    'score' => $grade ? $grade->score : null,
                ];

                if ($grade && $post->weight_percent) {
                    $totalWeight += $post->weight_percent;
                    $weightedSum += ($grade->score / 20) * $post->weight_percent;
                }
            }

            $report[] = [
                'student' => [
                    'id' => $us->user->id,
                    'firstName' => $us->user->first_name,
                    'lastName' => $us->user->last_name,
                    'username' => $us->user->username,
                    'cedula' => $us->user->cedula,
                ],
                'grades' => $postGrades,
                'projectedFinal' => $totalWeight > 0 ? round(($weightedSum / $totalWeight) * 20, 2) : null,
            ];
        }

        return response()->json([
            'posts' => $posts->map(function ($p) {
                return ['id' => $p->id, 'title' => $p->title, 'weight' => $p->weight_percent];
            }),
            'students' => $report,
        ]);
    }
}
