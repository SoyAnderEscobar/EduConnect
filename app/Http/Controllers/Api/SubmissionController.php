<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProjectSubmission;
use App\Models\Post;
use Illuminate\Http\Request;

class SubmissionController extends Controller
{
    public function submit(Request $request, $postId)
    {
        $request->validate([
            'content' => 'string|nullable',
            'file' => 'file|max:51200|nullable',
        ]);

        $post = Post::findOrFail($postId);

        $existing = ProjectSubmission::where('student_id', auth()->id())
            ->where('post_id', $postId)
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Ya enviaste una entrega para esta publicacion'], 400);
        }

        $fileUrl = null;
        $fileName = null;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $ext = strtolower($file->getClientOriginalExtension());
            $blocked = ['exe', 'bat', 'cmd', 'sh', 'ps1'];

            if (in_array($ext, $blocked)) {
                return response()->json(['message' => 'Tipo de archivo no permitido'], 400);
            }

            $fileName = $file->getClientOriginalName();
            $fileUrl = $file->store('submissions', 'public');
        }

        $submission = ProjectSubmission::create([
            'student_id' => auth()->id(),
            'post_id' => $postId,
            'content' => $request->content,
            'file_url' => $fileUrl,
            'file_name' => $fileName,
        ]);

        return response()->json($submission, 201);
    }

    public function update(Request $request, $id)
    {
        $submission = ProjectSubmission::findOrFail($id);

        if ($submission->student_id !== auth()->id()) {
            return response()->json(['message' => 'No puedes editar esta entrega'], 403);
        }

        $request->validate([
            'content' => 'string|nullable',
            'file' => 'file|max:51200|nullable',
        ]);

        $fields = [];
        if ($request->has('content')) $fields['content'] = $request->content;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $fields['file_name'] = $file->getClientOriginalName();
            $fields['file_url'] = $file->store('submissions', 'public');
        }

        $submission->update($fields);

        return response()->json($submission);
    }

    public function postSubmissions($postId)
    {
        $submissions = ProjectSubmission::where('post_id', $postId)
            ->with('student:id,first_name,last_name,username,cedula')
            ->orderBy('submitted_at', 'desc')
            ->get()
            ->map(function ($s) {
                return [
                    'id' => $s->id,
                    'content' => $s->content,
                    'fileUrl' => $s->file_url,
                    'fileName' => $s->file_name,
                    'submittedAt' => $s->submitted_at,
                    'student' => [
                        'id' => $s->student->id,
                        'firstName' => $s->student->first_name,
                        'lastName' => $s->student->last_name,
                        'username' => $s->student->username,
                        'cedula' => $s->student->cedula,
                    ],
                ];
            });

        return response()->json(['data' => $submissions]);
    }

    public function mySubmissions()
    {
        $submissions = ProjectSubmission::where('student_id', auth()->id())
            ->with('post:id,title,type,due_date,subject_id')
            ->orderBy('submitted_at', 'desc')
            ->get();

        return response()->json(['data' => $submissions]);
    }
}
