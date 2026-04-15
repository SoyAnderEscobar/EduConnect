<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AIPracticeExample;
use App\Models\AIPracticeAttempt;
use App\Models\Post;
use App\Models\UserSubject;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AIPracticeController extends Controller
{
    private $models = [
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
    ];

    private function callGemini(string $prompt, int $maxTokens = 1024): ?string
    {
        $apiKey = env('GEMINI_API_KEY');
        $body = [
            'contents' => [
                ['role' => 'user', 'parts' => [['text' => $prompt]]],
            ],
            'generationConfig' => [
                'maxOutputTokens' => $maxTokens,
                'temperature' => 0.7,
            ],
        ];

        foreach ($this->models as $model) {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

            try {
                $response = Http::timeout(60)->post($url, $body);

                if ($response->successful()) {
                    $parts = $response->json()['candidates'][0]['content']['parts'] ?? [];
                    $text = '';
                    foreach ($parts as $part) {
                        if (isset($part['text'])) {
                            $text .= $part['text'];
                        }
                    }
                    if ($text) {
                        return $text;
                    }
                }

                \Log::warning("Gemini model {$model} failed", ['status' => $response->status()]);
            } catch (\Exception $e) {
                \Log::warning("Gemini model {$model} exception", ['message' => $e->getMessage()]);
            }
        }

        \Log::error('All Gemini models failed');
        return null;
    }

    /**
     * Generate a practice exercise using Gemini AI.
     */
    public function generate(Request $request, $postId)
    {
        $user = auth()->user();
        $post = Post::with('subject')->findOrFail($postId);

        $enrolled = UserSubject::where('user_id', $user->id)
            ->where('subject_id', $post->subject_id)
            ->exists();

        if (!$enrolled) {
            return response()->json(['message' => 'No estas inscrito en esta materia'], 403);
        }

        $prompt = "Eres un profesor universitario experto. Tu objetivo es ensenar al estudiante mostrandole "
            . "PRIMERO un ejemplo resuelto del tipo de ejercicio, y LUEGO pedirle que resuelva uno NUEVO "
            . "y DISTINTO siguiendo el mismo razonamiento (no el mismo enunciado).\n\n"
            . "Materia: {$post->subject->name}\n"
            . "Tema: {$post->title}\n"
            . "Descripcion de la actividad: {$post->description}\n";

        if ($post->program_content) {
            $prompt .= "Contenido programatico: {$post->program_content}\n";
        }

        $prompt .= "\nGenera la respuesta con EXACTAMENTE esta estructura y encabezados en negrita:\n\n"
            . "**Explicacion breve del tema**: 3-5 lineas claras que expliquen el concepto clave y el metodo "
            . "general para resolver este tipo de ejercicios. Suficiente para que el estudiante entienda, sin extenderse de mas.\n\n"
            . "**Ejemplo resuelto (modelo)**: Plantea un ejercicio similar al que luego pediras, e incluye la "
            . "solucion paso a paso mostrando el razonamiento. Debe ser autocontenido y servir como guia. "
            . "Maximo 6-8 pasos cortos.\n\n"
            . "**Ahora te toca a ti**: Indica claramente al estudiante que debe resolver un ejercicio NUEVO "
            . "aplicando el MISMO procedimiento del ejemplo, pero con datos/contexto diferentes (a su manera, "
            . "con sus palabras al explicar).\n\n"
            . "**Contexto del ejercicio**: Breve situacion o escenario (2-3 lineas), DIFERENTE al del ejemplo.\n\n"
            . "**Enunciado**: El problema a resolver, claro y especifico.\n\n"
            . "**Datos proporcionados**: Informacion necesaria para resolverlo.\n\n"
            . "**Se pide**: Lista de lo que el estudiante debe entregar, calcular o responder.\n\n"
            . "**Pistas**: 1-2 pistas que orienten sin revelar la respuesta, recordandole apoyarse en el ejemplo resuelto.\n\n"
            . "REGLAS IMPORTANTES:\n"
            . "- NO incluyas la solucion del ejercicio final (solo la del ejemplo modelo).\n"
            . "- El ejercicio final debe ser DISTINTO al ejemplo (otros datos/escenario), pero resolverse con el mismo metodo.\n"
            . "- Manten un tono didactico y motivador.\n"
            . "- Responde en espanol y usa Markdown para los encabezados en negrita.";

        try {
            $content = $this->callGemini($prompt, 1800);

            if (!$content) {
                return response()->json(['message' => 'No se pudo generar el ejercicio. Intenta de nuevo.'], 500);
            }
        } catch (\Exception $e) {
            \Log::error('Gemini practice exception', ['message' => $e->getMessage()]);
            return response()->json(['message' => 'No se pudo conectar al servicio de IA. Intenta mas tarde.'], 500);
        }

        $example = AIPracticeExample::create([
            'content' => $content,
            'post_id' => $post->id,
            'student_id' => $user->id,
            'status' => 'IN_PROGRESS',
        ]);

        $example->load('student:id,first_name,last_name,username,avatar_url');

        return response()->json($this->formatExample($example), 201);
    }

    /**
     * Student submits an attempt. Can submit multiple times.
     * AI reviews each attempt and guides the student.
     */
    public function submitAnswer(Request $request, $exampleId)
    {
        $request->validate([
            'answer' => 'required|string|min:5',
        ]);

        $example = AIPracticeExample::with(['post.subject', 'attempts'])->findOrFail($exampleId);

        if ($example->student_id !== auth()->id()) {
            return response()->json(['message' => 'Solo puedes responder tus propios ejercicios'], 403);
        }

        if (in_array($example->status, ['CORRECT', 'INCORRECT'])) {
            return response()->json(['message' => 'Este ejercicio ya fue revisado por el profesor'], 400);
        }

        $attemptNumber = $example->attempts->count() + 1;

        // Build context with previous attempts for better AI feedback
        $previousContext = '';
        foreach ($example->attempts as $prev) {
            $previousContext .= "\n--- Intento #{$prev->attempt_number} ---\n"
                . "Respuesta: {$prev->student_answer}\n"
                . "Tu feedback anterior: {$prev->ai_feedback}\n";
        }

        // AI reviews the attempt with full conversation context
        $aiFeedback = null;
        try {
            $reviewPrompt = "Eres un tutor universitario paciente y detallado. Un estudiante esta resolviendo "
                . "un ejercicio de practica y te envia su intento #{$attemptNumber}.\n\n"
                . "Materia: {$example->post->subject->name}\n"
                . "Ejercicio:\n{$example->content}\n";

            if ($previousContext) {
                $reviewPrompt .= "\n--- INTENTOS ANTERIORES ---{$previousContext}\n--- FIN INTENTOS ANTERIORES ---\n";
            }

            $reviewPrompt .= "\nRespuesta actual del estudiante (intento #{$attemptNumber}):\n{$request->answer}\n\n"
                . "Instrucciones para tu revision:\n"
                . "1. Analiza si la respuesta es correcta, parcialmente correcta o incorrecta\n"
                . "2. Explica que partes estan bien y cuales necesitan correccion\n"
                . "3. Si hay errores, da pistas y orientacion para que mejore (sin dar la respuesta directa)\n"
                . "4. Si es correcta, felicita al estudiante y explica por que esta bien\n"
                . "5. Si ha habido intentos anteriores, reconoce el progreso del estudiante\n\n"
                . "Se pedagogico, motivador y constructivo. Responde en espanol.";

            $aiFeedback = $this->callGemini($reviewPrompt, 1024);
        } catch (\Exception $e) {
            \Log::error('Gemini review exception', ['message' => $e->getMessage()]);
        }

        // Save the attempt
        $attempt = AIPracticeAttempt::create([
            'example_id' => $example->id,
            'student_answer' => $request->answer,
            'ai_feedback' => $aiFeedback ?? 'No se pudo obtener la revision de la IA en este momento.',
            'attempt_number' => $attemptNumber,
        ]);

        return response()->json([
            'message' => 'Respuesta enviada',
            'attempt' => [
                'id' => $attempt->id,
                'studentAnswer' => $attempt->student_answer,
                'aiFeedback' => $attempt->ai_feedback,
                'attemptNumber' => $attempt->attempt_number,
                'createdAt' => $attempt->created_at,
            ],
        ]);
    }

    /**
     * Student marks exercise as ready for teacher review.
     */
    public function submitForReview($exampleId)
    {
        $example = AIPracticeExample::withCount('attempts')->findOrFail($exampleId);

        if ($example->student_id !== auth()->id()) {
            return response()->json(['message' => 'Solo puedes enviar tus propios ejercicios'], 403);
        }

        if ($example->status !== 'IN_PROGRESS') {
            return response()->json(['message' => 'Este ejercicio ya fue enviado al profesor'], 400);
        }

        if ($example->attempts_count === 0) {
            return response()->json(['message' => 'Debes enviar al menos una respuesta antes de enviar al profesor'], 400);
        }

        $example->update([
            'status' => 'SUBMITTED',
            'submitted_at' => now(),
        ]);

        // Notify the teacher
        $post = $example->post;
        $user = auth()->user();
        if ($post->author_id !== $user->id) {
            Notification::create([
                'type' => 'NEW_POST',
                'title' => 'Ejercicio de practica listo para revision',
                'message' => $user->first_name . ' envio su ejercicio de practica en: ' . $post->title,
                'link' => "/posts/{$post->id}",
                'user_id' => $post->author_id,
            ]);
        }

        return response()->json(['message' => 'Ejercicio enviado al profesor para revision']);
    }

    /**
     * List all practice examples for a post.
     */
    public function index($postId)
    {
        $user = auth()->user();
        $post = Post::findOrFail($postId);

        $enrolled = UserSubject::where('user_id', $user->id)
            ->where('subject_id', $post->subject_id)
            ->exists();

        if (!$enrolled && $user->role !== 'SUPER_ADMIN') {
            return response()->json(['message' => 'No tienes acceso'], 403);
        }

        $query = AIPracticeExample::where('post_id', $postId)
            ->with([
                'student:id,first_name,last_name,username,avatar_url,cedula',
                'validator:id,first_name,last_name',
                'attempts',
            ])
            ->orderBy('created_at', 'desc');

        if ($user->role === 'STUDENT') {
            $query->where('student_id', $user->id);
        }

        $examples = $query->get()->map(function ($ex) {
            return $this->formatExample($ex);
        });

        return response()->json(['data' => $examples]);
    }

    /**
     * Teacher gives final verdict: CORRECT or INCORRECT.
     */
    public function validateExample(Request $request, $exampleId)
    {
        $request->validate([
            'status' => 'required|in:CORRECT,INCORRECT',
            'feedback' => 'string|nullable|max:2000',
        ]);

        $example = AIPracticeExample::with('post')->findOrFail($exampleId);

        if ($example->status !== 'SUBMITTED') {
            return response()->json(['message' => 'Este ejercicio aun no fue enviado para revision'], 400);
        }

        if ($example->post->author_id !== auth()->id() && auth()->user()->role !== 'SUPER_ADMIN') {
            return response()->json(['message' => 'Solo el profesor de esta actividad puede revisar'], 403);
        }

        $example->update([
            'status' => $request->status,
            'teacher_feedback' => $request->feedback,
            'validated_by' => auth()->id(),
            'validated_at' => now(),
        ]);

        $statusText = $request->status === 'CORRECT' ? 'correcta' : 'incorrecta';
        Notification::create([
            'type' => 'NEW_GRADE',
            'title' => "Practica revisada: $statusText",
            'message' => "Tu ejercicio de practica en \"{$example->post->title}\" fue marcado como $statusText.",
            'link' => "/posts/{$example->post_id}",
            'user_id' => $example->student_id,
        ]);

        return response()->json([
            'message' => "Ejercicio marcado como $statusText",
            'status' => $example->status,
            'teacherFeedback' => $example->teacher_feedback,
        ]);
    }

    private function formatExample($ex)
    {
        $data = [
            'id' => $ex->id,
            'content' => $ex->content,
            'status' => $ex->status,
            'teacherFeedback' => $ex->teacher_feedback,
            'createdAt' => $ex->created_at,
            'submittedAt' => $ex->submitted_at,
            'validatedAt' => $ex->validated_at,
            'student' => [
                'id' => $ex->student->id,
                'firstName' => $ex->student->first_name,
                'lastName' => $ex->student->last_name,
                'username' => $ex->student->username ?? null,
                'cedula' => $ex->student->cedula ?? null,
            ],
            'attempts' => $ex->relationLoaded('attempts') ? $ex->attempts->map(function ($a) {
                return [
                    'id' => $a->id,
                    'studentAnswer' => $a->student_answer,
                    'aiFeedback' => $a->ai_feedback,
                    'attemptNumber' => $a->attempt_number,
                    'createdAt' => $a->created_at,
                ];
            }) : [],
        ];

        if ($ex->validator) {
            $data['validator'] = [
                'id' => $ex->validator->id,
                'firstName' => $ex->validator->first_name,
                'lastName' => $ex->validator->last_name,
            ];
        }

        return $data;
    }
}
