<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AIConversation;
use App\Models\AIMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AIController extends Controller
{
    private $systemPrompt = 'Eres EduBot, un asistente educativo universitario amigable y conciso. Ayudas a estudiantes con dudas academicas, explicas temas de forma clara, das tips de estudio y motivas al aprendizaje. Responde siempre en español. Se breve y directo, usa listas cuando sea util. No inventes informacion, si no sabes algo, dilo honestamente.';

    public function conversations()
    {
        $conversations = AIConversation::where('user_id', auth()->id())
            ->orderBy('created_at', 'desc')
            ->take(20)
            ->get()
            ->map(function ($c) {
                return [
                    'id' => $c->id,
                    'title' => $c->title,
                    'createdAt' => $c->created_at,
                ];
            });

        return response()->json(['data' => $conversations]);
    }

    public function messages($conversationId)
    {
        $conversation = AIConversation::where('id', $conversationId)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $messages = AIMessage::where('conversation_id', $conversationId)
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($m) {
                return [
                    'id' => $m->id,
                    'role' => $m->role,
                    'content' => $m->content,
                    'createdAt' => $m->created_at,
                ];
            });

        return response()->json(['data' => $messages]);
    }

    public function send(Request $request, $conversationId = null)
    {
        $request->validate([
            'message' => 'required|string|max:2000',
        ]);

        $userId = auth()->id();

        // Create or retrieve conversation
        if ($conversationId) {
            $conversation = AIConversation::where('id', $conversationId)
                ->where('user_id', $userId)
                ->firstOrFail();
        } else {
            $conversation = AIConversation::create([
                'user_id' => $userId,
                'title' => \Illuminate\Support\Str::limit($request->message, 60),
            ]);
        }

        // Save user message
        AIMessage::create([
            'role' => 'user',
            'content' => $request->message,
            'conversation_id' => $conversation->id,
        ]);

        // Build message history for context
        $history = AIMessage::where('conversation_id', $conversation->id)
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($m) {
                return [
                    'role' => $m->role === 'assistant' ? 'model' : 'user',
                    'parts' => [['text' => $m->content]],
                ];
            })
            ->values()
            ->toArray();

        // Call Gemini API with fallback models
        $apiKey = env('GEMINI_API_KEY');
        $models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-latest'];
        $body = [
            'system_instruction' => [
                'parts' => [['text' => $this->systemPrompt]],
            ],
            'contents' => $history,
            'generationConfig' => [
                'maxOutputTokens' => 1024,
                'temperature' => 0.7,
            ],
        ];

        $reply = null;
        foreach ($models as $model) {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";
            try {
                $response = Http::timeout(60)->post($url, $body);

                if ($response->successful()) {
                    $parts = $response->json()['candidates'][0]['content']['parts'] ?? [];
                    foreach ($parts as $part) {
                        if (isset($part['text'])) {
                            $reply = $part['text'];
                        }
                    }
                    if ($reply) break;
                }

                \Log::warning("Gemini model {$model} failed", ['status' => $response->status()]);
            } catch (\Exception $e) {
                \Log::warning("Gemini model {$model} exception", ['message' => $e->getMessage()]);
            }
        }

        if (!$reply) {
            $reply = 'Lo siento, no pude generar una respuesta en este momento. Intenta de nuevo.';
        }

        // Save assistant response
        $aiMessage = AIMessage::create([
            'role' => 'assistant',
            'content' => $reply,
            'conversation_id' => $conversation->id,
        ]);

        return response()->json([
            'conversationId' => $conversation->id,
            'message' => [
                'id' => $aiMessage->id,
                'role' => 'assistant',
                'content' => $reply,
                'createdAt' => $aiMessage->created_at,
            ],
        ]);
    }

    public function deleteConversation($id)
    {
        $conversation = AIConversation::where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $conversation->delete();

        return response()->json(['message' => 'Conversacion eliminada']);
    }
}
