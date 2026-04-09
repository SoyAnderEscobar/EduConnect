<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\SubjectController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\GradeController;
use App\Http\Controllers\Api\SubmissionController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\AIController;
use App\Http\Controllers\Api\AIPracticeController;

// Health check
Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'timestamp' => now()]);
});

// ==================== AUTH (Public) ====================
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/admin-login', [AuthController::class, 'adminLogin']);
    Route::post('/refresh', [AuthController::class, 'refresh']);

    Route::middleware('jwt.auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/change-password', [AuthController::class, 'changePassword']);
    });
});

// ==================== PROTECTED ROUTES ====================
Route::middleware('jwt.auth')->group(function () {

    // ==================== ADMIN ====================
    Route::prefix('admin')->middleware('role:SUPER_ADMIN')->group(function () {
        Route::get('/users', [AdminController::class, 'listUsers']);
        Route::post('/users', [AdminController::class, 'createUser']);
        Route::put('/users/{id}', [AdminController::class, 'updateUser']);
        Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);

        Route::get('/subjects', [AdminController::class, 'listSubjects']);
        Route::post('/subjects', [AdminController::class, 'createSubject']);
        Route::put('/subjects/{id}', [AdminController::class, 'updateSubject']);
        Route::delete('/subjects/{id}', [AdminController::class, 'deleteSubject']);

        Route::post('/enroll', [AdminController::class, 'enroll']);
        Route::delete('/enroll', [AdminController::class, 'unenroll']);

        Route::get('/stats', [AdminController::class, 'stats']);
    });

    // ==================== SUBJECTS ====================
    Route::get('/subjects', [SubjectController::class, 'mySubjects']);
    Route::get('/subjects/{id}', [SubjectController::class, 'show']);
    Route::get('/subjects/{id}/members', [SubjectController::class, 'members']);

    // ==================== POSTS ====================
    Route::get('/subjects/{id}/posts', [PostController::class, 'index']);
    Route::post('/subjects/{id}/posts', [PostController::class, 'store'])->middleware('role:TEACHER,SUPER_ADMIN');
    Route::get('/posts/{id}', [PostController::class, 'show']);
    Route::put('/posts/{id}', [PostController::class, 'update'])->middleware('role:TEACHER,SUPER_ADMIN');
    Route::delete('/posts/{id}', [PostController::class, 'destroy'])->middleware('role:TEACHER,SUPER_ADMIN');
    Route::post('/posts/{id}/pin', [PostController::class, 'togglePin'])->middleware('role:TEACHER,SUPER_ADMIN');

    // ==================== COMMENTS & REACTIONS ====================
    Route::get('/posts/{id}/comments', [CommentController::class, 'index']);
    Route::post('/posts/{id}/comments', [CommentController::class, 'store']);
    Route::put('/comments/{id}', [CommentController::class, 'update']);
    Route::delete('/comments/{id}', [CommentController::class, 'destroy']);

    Route::post('/posts/{id}/react', [CommentController::class, 'reactToPost']);
    Route::post('/comments/{id}/react', [CommentController::class, 'reactToComment']);

    // ==================== GRADES ====================
    Route::get('/subjects/{id}/grades', [GradeController::class, 'myGrades']);
    Route::get('/grades/summary', [GradeController::class, 'summary']);
    Route::post('/posts/{id}/grades', [GradeController::class, 'assignGrade'])->middleware('role:TEACHER,SUPER_ADMIN');
    Route::put('/grades/{id}', [GradeController::class, 'updateGrade'])->middleware('role:TEACHER,SUPER_ADMIN');
    Route::get('/posts/{id}/grades', [GradeController::class, 'postGrades'])->middleware('role:TEACHER,SUPER_ADMIN');
    Route::get('/subjects/{id}/grade-report', [GradeController::class, 'subjectGradeReport'])->middleware('role:TEACHER,SUPER_ADMIN');

    // ==================== SUBMISSIONS ====================
    Route::post('/posts/{id}/submit', [SubmissionController::class, 'submit']);
    Route::put('/submissions/{id}', [SubmissionController::class, 'update']);
    Route::get('/posts/{id}/submissions', [SubmissionController::class, 'postSubmissions'])->middleware('role:TEACHER,SUPER_ADMIN');
    Route::get('/submissions/mine', [SubmissionController::class, 'mySubmissions']);

    // ==================== CHAT ====================
    Route::get('/chat/conversations', [ChatController::class, 'conversations']);
    Route::get('/chat/{userId}/messages', [ChatController::class, 'messages']);
    Route::post('/chat/{userId}/messages', [ChatController::class, 'sendMessage']);
    Route::put('/chat/{userId}/read', [ChatController::class, 'markAsRead']);

    // ==================== AI PRACTICE EXAMPLES ====================
    Route::post('/posts/{id}/practice-examples/generate', [AIPracticeController::class, 'generate']);
    Route::get('/posts/{id}/practice-examples', [AIPracticeController::class, 'index']);
    Route::post('/practice-examples/{id}/attempt', [AIPracticeController::class, 'submitAnswer']);
    Route::put('/practice-examples/{id}/submit', [AIPracticeController::class, 'submitForReview']);
    Route::put('/practice-examples/{id}/validate', [AIPracticeController::class, 'validateExample'])->middleware('role:TEACHER,SUPER_ADMIN');

    // ==================== AI CHATBOT ====================
    Route::get('/ai/conversations', [AIController::class, 'conversations']);
    Route::get('/ai/conversations/{id}/messages', [AIController::class, 'messages']);
    Route::post('/ai/chat', [AIController::class, 'send']);
    Route::post('/ai/chat/{conversationId}', [AIController::class, 'send']);
    Route::delete('/ai/conversations/{id}', [AIController::class, 'deleteConversation']);

    // ==================== NOTIFICATIONS ====================
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
});
