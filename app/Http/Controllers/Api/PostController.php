<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\UserSubject;
use App\Models\Notification;
use Illuminate\Http\Request;

class PostController extends Controller
{
    public function index(Request $request, $subjectId)
    {
        $userId = auth()->id();

        $enrolled = UserSubject::where('user_id', $userId)->where('subject_id', $subjectId)->exists();
        if (!$enrolled && auth()->user()->role !== 'SUPER_ADMIN') {
            return response()->json(['message' => 'No estas inscrito en esta materia'], 403);
        }

        $query = Post::where('subject_id', $subjectId)
            ->with(['author:id,first_name,last_name,username,avatar_url'])
            ->withCount(['comments', 'reactions', 'submissions']);

        if ($request->type) {
            $query->where('type', $request->type);
        }

        $query->orderBy('is_pinned', 'desc')->orderBy('created_at', 'desc');

        $page = $request->get('page', 1);
        $limit = min($request->get('limit', 20), 50);
        $total = $query->count();

        $posts = $query->skip(($page - 1) * $limit)->take($limit)->get()->map(function ($post) use ($userId) {
            $userReactions = $post->reactions()->where('user_id', $userId)->pluck('type')->toArray();

            return [
                'id' => $post->id,
                'title' => $post->title,
                'description' => $post->description,
                'programContent' => $post->program_content,
                'dueDate' => $post->due_date,
                'weightPercent' => $post->weight_percent,
                'type' => $post->type,
                'isPinned' => $post->is_pinned,
                'createdAt' => $post->created_at,
                'updatedAt' => $post->updated_at,
                'author' => [
                    'id' => $post->author->id,
                    'firstName' => $post->author->first_name,
                    'lastName' => $post->author->last_name,
                    'username' => $post->author->username,
                    'avatarUrl' => $post->author->avatar_url,
                ],
                'commentsCount' => $post->comments_count,
                'reactionsCount' => $post->reactions_count,
                'submissionsCount' => $post->submissions_count,
                'userReactions' => $userReactions,
            ];
        });

        return response()->json([
            'data' => $posts,
            'pagination' => [
                'page' => (int)$page,
                'limit' => $limit,
                'total' => $total,
                'totalPages' => ceil($total / $limit),
            ],
        ]);
    }

    public function show($id)
    {
        $userId = auth()->id();

        $post = Post::with([
            'author:id,first_name,last_name,username,avatar_url',
            'subject:id,name,code',
        ])->withCount(['comments', 'reactions', 'submissions'])->findOrFail($id);

        $enrolled = UserSubject::where('user_id', $userId)->where('subject_id', $post->subject_id)->exists();
        if (!$enrolled && auth()->user()->role !== 'SUPER_ADMIN') {
            return response()->json(['message' => 'No tienes acceso a esta publicacion'], 403);
        }

        $userReactions = $post->reactions()->where('user_id', $userId)->pluck('type')->toArray();

        return response()->json([
            'id' => $post->id,
            'title' => $post->title,
            'description' => $post->description,
            'programContent' => $post->program_content,
            'dueDate' => $post->due_date,
            'weightPercent' => $post->weight_percent,
            'type' => $post->type,
            'isPinned' => $post->is_pinned,
            'createdAt' => $post->created_at,
            'updatedAt' => $post->updated_at,
            'author' => [
                'id' => $post->author->id,
                'firstName' => $post->author->first_name,
                'lastName' => $post->author->last_name,
                'username' => $post->author->username,
                'avatarUrl' => $post->author->avatar_url,
            ],
            'subject' => [
                'id' => $post->subject->id,
                'name' => $post->subject->name,
                'code' => $post->subject->code,
            ],
            'commentsCount' => $post->comments_count,
            'reactionsCount' => $post->reactions_count,
            'submissionsCount' => $post->submissions_count,
            'userReactions' => $userReactions,
        ]);
    }

    public function store(Request $request, $subjectId)
    {
        $request->validate([
            'title' => 'required|string|min:3',
            'description' => 'required|string|min:10',
            'programContent' => 'string|nullable',
            'dueDate' => 'date|nullable|after_or_equal:today',
            'weightPercent' => 'numeric|min:0|max:100|nullable',
            'type' => 'in:PROJECT,ANNOUNCEMENT,DISCUSSION,RESOURCE',
        ]);

        $post = Post::create([
            'title' => $request->title,
            'description' => $request->description,
            'program_content' => $request->programContent,
            'due_date' => $request->dueDate,
            'weight_percent' => $request->weightPercent,
            'type' => $request->get('type', 'PROJECT'),
            'author_id' => auth()->id(),
            'subject_id' => $subjectId,
        ]);

        // Notify subject members
        $members = UserSubject::where('subject_id', $subjectId)
            ->where('user_id', '!=', auth()->id())
            ->pluck('user_id');

        foreach ($members as $memberId) {
            Notification::create([
                'type' => 'NEW_POST',
                'title' => 'Nueva publicacion',
                'message' => auth()->user()->first_name . ' publico: ' . $post->title,
                'link' => "/posts/{$post->id}",
                'user_id' => $memberId,
            ]);
        }

        $post->load('author:id,first_name,last_name,username,avatar_url');

        return response()->json($post, 201);
    }

    public function update(Request $request, $id)
    {
        $post = Post::findOrFail($id);

        if ($post->author_id !== auth()->id()) {
            return response()->json(['message' => 'No puedes editar esta publicacion'], 403);
        }

        $request->validate([
            'title' => 'string|min:3',
            'description' => 'string|min:10',
            'programContent' => 'string|nullable',
            'dueDate' => 'date|nullable',
            'weightPercent' => 'numeric|min:0|max:100|nullable',
            'type' => 'in:PROJECT,ANNOUNCEMENT,DISCUSSION,RESOURCE',
        ]);

        $fields = [];
        if ($request->has('title')) $fields['title'] = $request->title;
        if ($request->has('description')) $fields['description'] = $request->description;
        if ($request->has('programContent')) $fields['program_content'] = $request->programContent;
        if ($request->has('dueDate')) $fields['due_date'] = $request->dueDate;
        if ($request->has('weightPercent')) $fields['weight_percent'] = $request->weightPercent;
        if ($request->has('type')) $fields['type'] = $request->type;

        $post->update($fields);

        return response()->json($post);
    }

    public function destroy($id)
    {
        $post = Post::findOrFail($id);

        if ($post->author_id !== auth()->id()) {
            return response()->json(['message' => 'No puedes eliminar esta publicacion'], 403);
        }

        $post->delete();

        return response()->json(['message' => 'Publicacion eliminada exitosamente']);
    }

    public function togglePin($id)
    {
        $post = Post::findOrFail($id);

        if ($post->author_id !== auth()->id()) {
            return response()->json(['message' => 'No puedes fijar esta publicacion'], 403);
        }

        $post->update(['is_pinned' => !$post->is_pinned]);

        return response()->json([
            'message' => $post->is_pinned ? 'Publicacion fijada' : 'Publicacion desfijada',
            'isPinned' => $post->is_pinned,
        ]);
    }
}
