<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\Post;
use App\Models\Reaction;
use App\Models\Notification;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function index($postId)
    {
        $comments = Comment::where('post_id', $postId)
            ->whereNull('parent_id')
            ->with([
                'author:id,first_name,last_name,username,avatar_url,role',
                'replies' => function ($q) {
                    $q->with([
                        'author:id,first_name,last_name,username,avatar_url,role',
                        'replies' => function ($q2) {
                            $q2->with('author:id,first_name,last_name,username,avatar_url,role')
                               ->withCount('reactions')
                               ->orderBy('created_at', 'asc');
                        },
                    ])->withCount('reactions')->orderBy('created_at', 'asc');
                },
            ])
            ->withCount('reactions')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($comment) {
                return $this->formatComment($comment);
            });

        return response()->json(['data' => $comments]);
    }

    public function store(Request $request, $postId)
    {
        $request->validate([
            'content' => 'required|string|min:1',
            'parentId' => 'uuid|nullable|exists:comments,id',
        ]);

        $post = Post::findOrFail($postId);

        $comment = Comment::create([
            'content' => $request->content,
            'author_id' => auth()->id(),
            'post_id' => $postId,
            'parent_id' => $request->parentId,
        ]);

        // Notify post author
        if ($post->author_id !== auth()->id()) {
            Notification::create([
                'type' => 'NEW_COMMENT',
                'title' => 'Nuevo comentario',
                'message' => auth()->user()->first_name . ' comento en: ' . $post->title,
                'link' => "/posts/{$postId}",
                'user_id' => $post->author_id,
            ]);
        }

        $comment->load('author:id,first_name,last_name,username,avatar_url,role');

        return response()->json($this->formatComment($comment), 201);
    }

    public function update(Request $request, $id)
    {
        $comment = Comment::findOrFail($id);

        if ($comment->author_id !== auth()->id()) {
            return response()->json(['message' => 'No puedes editar este comentario'], 403);
        }

        $request->validate(['content' => 'required|string|min:1']);

        $comment->update(['content' => $request->content]);

        return response()->json($this->formatComment($comment));
    }

    public function destroy($id)
    {
        $comment = Comment::findOrFail($id);
        $user = auth()->user();

        if ($comment->author_id !== $user->id && $user->role !== 'TEACHER' && $user->role !== 'SUPER_ADMIN') {
            return response()->json(['message' => 'No puedes eliminar este comentario'], 403);
        }

        $comment->delete();

        return response()->json(['message' => 'Comentario eliminado exitosamente']);
    }

    public function reactToPost(Request $request, $postId)
    {
        $request->validate([
            'type' => 'required|in:LIKE,USEFUL,QUESTION,SOLVED',
        ]);

        Post::findOrFail($postId);

        $existing = Reaction::where('user_id', auth()->id())
            ->where('post_id', $postId)
            ->where('type', $request->type)
            ->first();

        if ($existing) {
            $existing->delete();
            return response()->json(['message' => 'Reaccion eliminada', 'action' => 'removed']);
        }

        Reaction::create([
            'type' => $request->type,
            'user_id' => auth()->id(),
            'post_id' => $postId,
        ]);

        return response()->json(['message' => 'Reaccion agregada', 'action' => 'added'], 201);
    }

    public function reactToComment(Request $request, $commentId)
    {
        $request->validate([
            'type' => 'required|in:LIKE,USEFUL,QUESTION,SOLVED',
        ]);

        Comment::findOrFail($commentId);

        $existing = Reaction::where('user_id', auth()->id())
            ->where('comment_id', $commentId)
            ->where('type', $request->type)
            ->first();

        if ($existing) {
            $existing->delete();
            return response()->json(['message' => 'Reaccion eliminada', 'action' => 'removed']);
        }

        Reaction::create([
            'type' => $request->type,
            'user_id' => auth()->id(),
            'comment_id' => $commentId,
        ]);

        return response()->json(['message' => 'Reaccion agregada', 'action' => 'added'], 201);
    }

    private function formatComment($comment)
    {
        $data = [
            'id' => $comment->id,
            'content' => $comment->content,
            'createdAt' => $comment->created_at,
            'updatedAt' => $comment->updated_at,
            'author' => [
                'id' => $comment->author->id,
                'firstName' => $comment->author->first_name,
                'lastName' => $comment->author->last_name,
                'username' => $comment->author->username,
                'avatarUrl' => $comment->author->avatar_url,
                'role' => $comment->author->role,
            ],
            'reactionsCount' => $comment->reactions_count ?? 0,
            'replies' => [],
        ];

        if ($comment->relationLoaded('replies')) {
            $data['replies'] = $comment->replies->map(function ($reply) {
                return $this->formatComment($reply);
            });
        }

        return $data;
    }
}
