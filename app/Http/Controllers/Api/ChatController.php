<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChatController extends Controller
{
    public function conversations()
    {
        $userId = auth()->id();

        $conversations = DB::select("
            SELECT DISTINCT ON (other_user_id) *
            FROM (
                SELECT
                    CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_user_id,
                    content as last_message,
                    created_at as last_message_at,
                    sender_id
                FROM messages
                WHERE sender_id = ? OR receiver_id = ?
                ORDER BY created_at DESC
            ) sub
            ORDER BY other_user_id, last_message_at DESC
        ", [$userId, $userId, $userId]);

        $result = [];
        foreach ($conversations as $conv) {
            $otherUser = User::select('id', 'first_name', 'last_name', 'username', 'avatar_url', 'role')
                ->find($conv->other_user_id);

            if (!$otherUser) continue;

            $unreadCount = Message::where('sender_id', $conv->other_user_id)
                ->where('receiver_id', $userId)
                ->where('is_read', false)
                ->count();

            $result[] = [
                'user' => [
                    'id' => $otherUser->id,
                    'firstName' => $otherUser->first_name,
                    'lastName' => $otherUser->last_name,
                    'username' => $otherUser->username,
                    'avatarUrl' => $otherUser->avatar_url,
                    'role' => $otherUser->role,
                ],
                'lastMessage' => $conv->last_message,
                'lastMessageAt' => $conv->last_message_at,
                'unreadCount' => $unreadCount,
            ];
        }

        usort($result, function ($a, $b) {
            return strtotime($b['lastMessageAt']) - strtotime($a['lastMessageAt']);
        });

        return response()->json(['data' => $result]);
    }

    public function messages(Request $request, $otherUserId)
    {
        $userId = auth()->id();
        $limit = $request->get('limit', 50);

        $query = Message::where(function ($q) use ($userId, $otherUserId) {
            $q->where('sender_id', $userId)->where('receiver_id', $otherUserId);
        })->orWhere(function ($q) use ($userId, $otherUserId) {
            $q->where('sender_id', $otherUserId)->where('receiver_id', $userId);
        });

        if ($request->before) {
            $query->where('created_at', '<', $request->before);
        }

        $messages = $query->orderBy('created_at', 'desc')
            ->take($limit)
            ->get()
            ->map(function ($m) {
                return [
                    'id' => $m->id,
                    'content' => $m->content,
                    'fileUrl' => $m->file_url,
                    'fileName' => $m->file_name,
                    'isRead' => $m->is_read,
                    'senderId' => $m->sender_id,
                    'receiverId' => $m->receiver_id,
                    'createdAt' => $m->created_at,
                ];
            })
            ->reverse()
            ->values();

        return response()->json(['data' => $messages]);
    }

    public function sendMessage(Request $request, $receiverId)
    {
        $request->validate([
            'content' => 'required|string',
            'fileUrl' => 'string|nullable',
            'fileName' => 'string|nullable',
        ]);

        User::findOrFail($receiverId);

        $message = Message::create([
            'content' => $request->content,
            'file_url' => $request->fileUrl,
            'file_name' => $request->fileName,
            'sender_id' => auth()->id(),
            'receiver_id' => $receiverId,
        ]);

        $message->refresh();

        $sender = auth()->user();
        Notification::create([
            'type' => 'NEW_MESSAGE',
            'title' => 'Nuevo mensaje',
            'message' => $sender->first_name . ' ' . $sender->last_name . ': ' . \Illuminate\Support\Str::limit($request->content, 50),
            'link' => '/chat/' . auth()->id(),
            'user_id' => $receiverId,
        ]);

        return response()->json([
            'id' => $message->id,
            'content' => $message->content,
            'fileUrl' => $message->file_url,
            'fileName' => $message->file_name,
            'isRead' => $message->is_read,
            'senderId' => $message->sender_id,
            'receiverId' => $message->receiver_id,
            'createdAt' => $message->created_at,
        ], 201);
    }

    public function markAsRead($senderId)
    {
        $userId = auth()->id();

        Message::where('sender_id', $senderId)
            ->where('receiver_id', $userId)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'Mensajes marcados como leidos']);
    }
}
