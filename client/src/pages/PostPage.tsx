import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ArrowLeft, Calendar, Percent, ThumbsUp, Lightbulb, HelpCircle, CheckCircle, Send, ClipboardList, Upload, FileText, Download, Clock, Sparkles, ShieldCheck, ShieldX, Loader2 } from 'lucide-react';
import { timeAgo, formatDate } from '@/lib/utils';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function PostPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  // Grading state (teacher only)
  const [showGrading, setShowGrading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [existingGrades, setExistingGrades] = useState<any[]>([]);
  const [gradeInputs, setGradeInputs] = useState<Record<string, { score: string; feedback: string }>>({});
  // Submission state (student)
  const [mySubmission, setMySubmission] = useState<any>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Submissions list (teacher)
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [showSubmissions, setShowSubmissions] = useState(false);
  // AI Practice Examples
  const [practiceExamples, setPracticeExamples] = useState<any[]>([]);
  const [generatingExample, setGeneratingExample] = useState(false);
  const [showPractice, setShowPractice] = useState(false);
  const [answerInputs, setAnswerInputs] = useState<Record<string, string>>({});
  const [submittingAnswer, setSubmittingAnswer] = useState<string | null>(null);
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    api.get(`/posts/${id}`).then(({ data }) => setPost(data)).catch(() => {});
    api.get(`/posts/${id}/comments`).then(({ data }) => setComments(data.data || [])).catch(() => {});
  }, [id]);

  // Load grading data and submissions for teachers
  useEffect(() => {
    if (!post || user?.role !== 'TEACHER') return;
    api.get(`/subjects/${post.subject.id}/members`).then(({ data }) => {
      setStudents((data.data || []).filter((m: any) => m.role === 'STUDENT'));
    }).catch(() => {});
    api.get(`/posts/${id}/grades`).then(({ data }) => {
      setExistingGrades(data.data || []);
    }).catch(() => {});
    if (post.type === 'PROJECT') {
      api.get(`/posts/${id}/submissions`).then(({ data }) => {
        setSubmissions(data.data || []);
      }).catch(() => {});
    }
  }, [post, user?.role, id]);

  // Load student's own submission
  useEffect(() => {
    if (!post || user?.role !== 'STUDENT' || post.type !== 'PROJECT') return;
    api.get('/submissions/mine').then(({ data }) => {
      const mine = (data.data || []).find((s: any) => s.post_id === id || s.postId === id);
      if (mine) setMySubmission(mine);
    }).catch(() => {});
  }, [post, user?.role, id]);

  // Load practice examples
  useEffect(() => {
    if (!post) return;
    api.get(`/posts/${id}/practice-examples`).then(({ data }) => {
      setPracticeExamples(data.data || []);
    }).catch(() => {});
  }, [post, id]);

  const handleGenerateExample = async () => {
    setGeneratingExample(true);
    try {
      const { data } = await api.post(`/posts/${id}/practice-examples/generate`);
      setPracticeExamples((prev) => [data, ...prev]);
      toast.success('Ejercicio generado. Resuelvelo y envia tus intentos.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al generar ejercicio');
    } finally {
      setGeneratingExample(false);
    }
  };

  const handleSubmitAttempt = async (exampleId: string) => {
    const answer = answerInputs[exampleId];
    if (!answer?.trim()) {
      toast.error('Escribe tu respuesta antes de enviar');
      return;
    }
    setSubmittingAnswer(exampleId);
    try {
      await api.post(`/practice-examples/${exampleId}/attempt`, { answer });
      toast.success('Intento enviado. Revisa el feedback de la IA.');
      const { data } = await api.get(`/posts/${id}/practice-examples`);
      setPracticeExamples(data.data || []);
      setAnswerInputs((prev) => ({ ...prev, [exampleId]: '' }));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al enviar intento');
    } finally {
      setSubmittingAnswer(null);
    }
  };

  const handleSubmitForReview = async (exampleId: string) => {
    try {
      await api.put(`/practice-examples/${exampleId}/submit`);
      toast.success('Ejercicio enviado al profesor para revision');
      const { data } = await api.get(`/posts/${id}/practice-examples`);
      setPracticeExamples(data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al enviar');
    }
  };

  const handleValidateExample = async (exampleId: string, status: string) => {
    const feedback = feedbackInputs[exampleId] || '';
    try {
      await api.put(`/practice-examples/${exampleId}/validate`, { status, feedback: feedback || undefined });
      toast.success(status === 'CORRECT' ? 'Marcada como correcta' : 'Marcada como incorrecta');
      const { data } = await api.get(`/posts/${id}/practice-examples`);
      setPracticeExamples(data.data || []);
      setFeedbackInputs((prev) => { const copy = { ...prev }; delete copy[exampleId]; return copy; });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al revisar');
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const { data } = await api.post(`/posts/${id}/comments`, { content: newComment });
      setComments([...comments, { ...data, replies: [], reactions: [], _count: { reactions: 0 } }]);
      setNewComment('');
      toast.success('Comentario publicado');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return;
    try {
      await api.post(`/posts/${id}/comments`, { content: replyContent, parentId });
      const { data: updated } = await api.get(`/posts/${id}/comments`);
      setComments(updated.data || []);
      setReplyTo(null);
      setReplyContent('');
      toast.success('Respuesta publicada');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const handleReact = async (type: string) => {
    try {
      await api.post(`/posts/${id}/react`, { type });
      const { data } = await api.get(`/posts/${id}`);
      setPost(data);
    } catch {}
  };

  const handleAssignGrade = async (studentId: string) => {
    const input = gradeInputs[studentId];
    if (!input?.score) {
      toast.error('Ingresa una nota');
      return;
    }
    const score = parseFloat(input.score);
    if (isNaN(score) || score < 0 || score > 20) {
      toast.error('La nota debe ser entre 0 y 20');
      return;
    }
    try {
      await api.post(`/posts/${id}/grades`, {
        studentId,
        score,
        feedback: input.feedback || undefined,
      });
      toast.success('Nota asignada');
      // Refresh grades
      const { data } = await api.get(`/posts/${id}/grades`);
      setExistingGrades(data.data || []);
      setGradeInputs((prev) => ({ ...prev, [studentId]: { score: '', feedback: '' } }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al asignar nota');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionFile && !submissionContent.trim()) {
      toast.error('Adjunta un archivo o escribe un contenido');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (submissionContent.trim()) formData.append('content', submissionContent);
      if (submissionFile) formData.append('file', submissionFile);

      if (mySubmission) {
        const { data } = await api.put(`/submissions/${mySubmission.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMySubmission(data);
        toast.success('Entrega actualizada');
      } else {
        const { data } = await api.post(`/posts/${id}/submit`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMySubmission(data);
        toast.success('Proyecto entregado exitosamente');
      }
      setSubmissionFile(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al entregar');
    } finally {
      setSubmitting(false);
    }
  };

  if (!post) return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Cargando...</div>;

  const reactionIcons: Record<string, any> = {
    LIKE: ThumbsUp, USEFUL: Lightbulb, QUESTION: HelpCircle, SOLVED: CheckCircle,
  };

  const renderComment = (comment: any, depth = 0) => (
    <div key={comment.id} className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-100 dark:border-gray-700 pl-4' : ''}`}>
      <div className="py-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary-700 dark:text-primary-400">
              {comment.author.firstName.charAt(0)}{comment.author.lastName.charAt(0)}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {comment.author.firstName} {comment.author.lastName}
          </span>
          <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px]">
            {comment.author.role === 'TEACHER' ? 'Profesor' : 'Estudiante'}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{comment.content}</p>
        <button
          onClick={() => { setReplyTo(comment.id); setReplyContent(''); }}
          className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 mt-1 font-medium"
        >
          Responder
        </button>

        {replyTo === comment.id && (
          <div className="mt-2 flex gap-2">
            <input
              className="input text-sm flex-1"
              placeholder="Tu respuesta..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReply(comment.id)}
            />
            <button onClick={() => handleReply(comment.id)} className="btn-primary text-sm px-3">
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      {comment.replies?.map((reply: any) => renderComment(reply, depth + 1))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link to={`/subjects/${post.subject.id}`} className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> {post.subject.name}
      </Link>

      {/* Post */}
      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          <span className={`badge ${
            post.type === 'PROJECT' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
            post.type === 'ANNOUNCEMENT' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
            'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
          }`}>
            {post.type === 'PROJECT' ? 'Proyecto' : post.type === 'ANNOUNCEMENT' ? 'Anuncio' : 'Discusion'}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {post.author.firstName} {post.author.lastName} - {timeAgo(post.createdAt)}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{post.title}</h1>
        <div className="mt-4 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{post.description}</div>

        {post.programContent && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Contenido Programatico</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{post.programContent}</p>
          </div>
        )}

        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
          {post.dueDate && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Calendar className="w-4 h-4" /> Entrega: {formatDate(post.dueDate)}
            </span>
          )}
          {post.weightPercent && (
            <span className="flex items-center gap-1">
              <Percent className="w-4 h-4" /> {post.weightPercent}%
            </span>
          )}
        </div>

        {/* Reactions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          {['LIKE', 'USEFUL', 'QUESTION', 'SOLVED'].map((type) => {
            const Icon = reactionIcons[type];
            const hasReacted = post.userReactions?.includes(type);
            return (
              <button
                key={type}
                onClick={() => handleReact(type)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  hasReacted
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {type === 'LIKE' ? 'Me gusta' : type === 'USEFUL' ? 'Util' : type === 'QUESTION' ? 'Pregunta' : 'Resuelto'}
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Practice Examples - Student Section */}
      {user?.role === 'STUDENT' && post.type === 'PROJECT' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Ejercicios de Practica con IA
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            La IA genera un ejercicio basado en esta actividad. Puedes enviar varios intentos y la IA te dara feedback en cada uno. Cuando estes conforme, envia tu ejercicio al profesor para la revision final.
          </p>
          <button
            onClick={handleGenerateExample}
            disabled={generatingExample}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors font-medium"
          >
            {generatingExample ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generando ejercicio...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generar ejercicio de practica</>
            )}
          </button>

          {practiceExamples.length > 0 && (
            <div className="mt-6 space-y-6">
              {practiceExamples.map((ex) => (
                <div key={ex.id} className={`p-4 rounded-lg border ${
                  ex.status === 'CORRECT' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : ex.status === 'INCORRECT' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : ex.status === 'SUBMITTED' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                }`}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`badge text-xs ${
                      ex.status === 'CORRECT' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : ex.status === 'INCORRECT' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : ex.status === 'SUBMITTED' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                    }`}>
                      {ex.status === 'CORRECT' ? 'Correcta' : ex.status === 'INCORRECT' ? 'Incorrecta' : ex.status === 'SUBMITTED' ? 'Enviada al profesor' : 'En progreso'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {ex.attempts?.length || 0} intento{(ex.attempts?.length || 0) !== 1 ? 's' : ''} - {timeAgo(ex.createdAt)}
                    </span>
                  </div>

                  {/* Exercise */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">Ejercicio:</p>
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ex.content}</div>
                  </div>

                  {/* Attempts conversation */}
                  {ex.attempts?.length > 0 && (
                    <div className="mb-4 space-y-3">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Historial de intentos:</p>
                      {ex.attempts.map((att: any) => (
                        <div key={att.id} className="space-y-2">
                          {/* Student attempt */}
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                              Tu respuesta (intento #{att.attemptNumber}):
                            </p>
                            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{att.studentAnswer}</div>
                          </div>
                          {/* AI feedback */}
                          {att.aiFeedback && (
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 ml-4">
                              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Feedback de la IA:
                              </p>
                              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{att.aiFeedback}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* New attempt input - while IN_PROGRESS */}
                  {ex.status === 'IN_PROGRESS' && (
                    <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700 space-y-3">
                      <textarea
                        className="input w-full"
                        rows={4}
                        placeholder={ex.attempts?.length > 0 ? 'Escribe un nuevo intento con las correcciones...' : 'Escribe tu respuesta al ejercicio...'}
                        value={answerInputs[ex.id] || ''}
                        onChange={(e) => setAnswerInputs((prev) => ({ ...prev, [ex.id]: e.target.value }))}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSubmitAttempt(ex.id)}
                          disabled={submittingAnswer === ex.id}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm transition-colors"
                        >
                          {submittingAnswer === ex.id ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                          ) : (
                            <><Send className="w-4 h-4" /> Enviar intento</>
                          )}
                        </button>
                        {ex.attempts?.length > 0 && (
                          <button
                            onClick={() => handleSubmitForReview(ex.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Enviar al profesor para revision
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Teacher feedback */}
                  {ex.teacherFeedback && (
                    <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Feedback del profesor:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ex.teacherFeedback}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Practice Examples - Teacher Review Section */}
      {user?.role === 'TEACHER' && post.type === 'PROJECT' && (
        <div className="card">
          <button
            onClick={() => setShowPractice(!showPractice)}
            className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white w-full"
          >
            <Sparkles className="w-5 h-5 text-purple-600" />
            Ejercicios de Practica (IA)
            <span className="text-sm font-normal text-gray-400 ml-auto">
              {practiceExamples.filter((e) => e.status === 'SUBMITTED').length} por revisar / {practiceExamples.length} total
            </span>
          </button>

          {showPractice && (
            <div className="mt-4 space-y-4">
              {practiceExamples.map((ex) => (
                <div key={ex.id} className={`p-4 rounded-lg border ${
                  ex.status === 'CORRECT' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : ex.status === 'INCORRECT' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : ex.status === 'SUBMITTED' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                }`}>
                  {/* Student info */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-purple-700 dark:text-purple-400">
                          {ex.student.firstName.charAt(0)}{ex.student.lastName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {ex.student.firstName} {ex.student.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{ex.student.cedula}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge text-xs ${
                        ex.status === 'CORRECT' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : ex.status === 'INCORRECT' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : ex.status === 'SUBMITTED' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {ex.status === 'CORRECT' ? 'Correcta' : ex.status === 'INCORRECT' ? 'Incorrecta' : ex.status === 'SUBMITTED' ? 'Por revisar' : 'En progreso'}
                      </span>
                      <span className="text-xs text-gray-400">{ex.attempts?.length || 0} intentos</span>
                    </div>
                  </div>

                  {/* Exercise */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">Ejercicio generado por IA:</p>
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">{ex.content}</div>
                  </div>

                  {/* All attempts with AI feedback */}
                  {ex.attempts?.length > 0 ? (
                    <div className="mb-3 space-y-3">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Intentos del estudiante:</p>
                      {ex.attempts.map((att: any) => (
                        <div key={att.id} className="space-y-2">
                          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                              Intento #{att.attemptNumber} - {timeAgo(att.createdAt)}
                            </p>
                            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{att.studentAnswer}</div>
                          </div>
                          {att.aiFeedback && (
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 ml-4">
                              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Feedback IA:
                              </p>
                              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{att.aiFeedback}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic mb-3">El estudiante aun no ha enviado intentos</p>
                  )}

                  {/* Existing teacher feedback */}
                  {ex.teacherFeedback && (
                    <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Tu feedback:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ex.teacherFeedback}</p>
                    </div>
                  )}

                  {/* Review controls */}
                  {ex.status === 'SUBMITTED' && (
                    <div className="pt-3 border-t border-yellow-200 dark:border-yellow-700 space-y-2">
                      <textarea
                        placeholder="Feedback para el estudiante (opcional)"
                        className="input w-full text-sm"
                        rows={2}
                        value={feedbackInputs[ex.id] || ''}
                        onChange={(e) => setFeedbackInputs((prev) => ({ ...prev, [ex.id]: e.target.value }))}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleValidateExample(ex.id, 'CORRECT')}
                          className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4" /> Correcta
                        </button>
                        <button
                          onClick={() => handleValidateExample(ex.id, 'INCORRECT')}
                          className="flex items-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                        >
                          <ShieldX className="w-4 h-4" /> Incorrecta
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {practiceExamples.length === 0 && (
                <p className="text-center text-gray-400 dark:text-gray-500 py-4">
                  Ningun estudiante ha generado ejercicios de practica aun
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Student Submission Section */}
      {user?.role === 'STUDENT' && post.type === 'PROJECT' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5 text-primary-600" />
            Entregar Proyecto
          </h2>

          {mySubmission ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-green-700 dark:text-green-400">Proyecto entregado</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(mySubmission.submitted_at || mySubmission.submittedAt)}
                  </span>
                </div>
                {mySubmission.content && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{mySubmission.content}</p>
                )}
                {(mySubmission.file_name || mySubmission.fileName) && (
                  <div className="flex items-center gap-2 mt-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{mySubmission.file_name || mySubmission.fileName}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Actualizar entrega:</p>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <textarea
                    className="input w-full"
                    rows={3}
                    placeholder="Comentario o descripcion (opcional)"
                    value={submissionContent}
                    onChange={(e) => setSubmissionContent(e.target.value)}
                  />
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">
                      <Upload className="w-4 h-4" />
                      {submissionFile ? submissionFile.name : 'Cambiar archivo'}
                      <input type="file" className="hidden" onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)} />
                    </label>
                    <button type="submit" disabled={submitting} className="btn-primary text-sm px-4 py-2">
                      {submitting ? 'Actualizando...' : 'Actualizar entrega'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {post.dueDate && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                  new Date(post.dueDate) < new Date()
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                }`}>
                  <Calendar className="w-4 h-4" />
                  {new Date(post.dueDate) < new Date()
                    ? `Fecha limite vencida: ${formatDate(post.dueDate)}`
                    : `Fecha limite: ${formatDate(post.dueDate)}`
                  }
                </div>
              )}
              <textarea
                className="input w-full"
                rows={3}
                placeholder="Descripcion o comentario sobre tu entrega (opcional)"
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
              />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">
                  <Upload className="w-4 h-4" />
                  {submissionFile ? submissionFile.name : 'Seleccionar archivo'}
                  <input type="file" className="hidden" onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)} />
                </label>
                <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2 px-5 py-2.5">
                  <Send className="w-4 h-4" />
                  {submitting ? 'Enviando...' : 'Entregar proyecto'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Teacher Submissions Section */}
      {user?.role === 'TEACHER' && post.type === 'PROJECT' && (
        <div className="card">
          <button
            onClick={() => setShowSubmissions(!showSubmissions)}
            className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white w-full"
          >
            <FileText className="w-5 h-5 text-primary-600" />
            Entregas de Estudiantes
            <span className="text-sm font-normal text-gray-400 ml-auto">
              {submissions.length}/{students.length} entregados
            </span>
          </button>

          {showSubmissions && (
            <div className="mt-4 space-y-3">
              {submissions.map((sub) => (
                <div key={sub.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-primary-700 dark:text-primary-400">
                          {sub.student.firstName.charAt(0)}{sub.student.lastName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {sub.student.firstName} {sub.student.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{sub.student.cedula}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(sub.submittedAt)}
                    </span>
                  </div>
                  {sub.content && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{sub.content}</p>
                  )}
                  {sub.fileUrl && (
                    <a
                      href={`/storage/${sub.fileUrl}`}
                      download={sub.fileName}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-lg text-sm hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      {sub.fileName || 'Descargar archivo'}
                    </a>
                  )}
                </div>
              ))}

              {submissions.length === 0 && (
                <p className="text-center text-gray-400 dark:text-gray-500 py-4">Ningun estudiante ha entregado aun</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grading Section (Teacher Only) */}
      {user?.role === 'TEACHER' && post.type === 'PROJECT' && (
        <div className="card">
          <button
            onClick={() => setShowGrading(!showGrading)}
            className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white w-full"
          >
            <ClipboardList className="w-5 h-5 text-primary-600" />
            Calificar Estudiantes
            <span className="text-sm font-normal text-gray-400 ml-auto">
              {existingGrades.length}/{students.length} calificados
            </span>
          </button>

          {showGrading && (
            <div className="mt-4 space-y-3">
              {students.map((student) => {
                const existingGrade = existingGrades.find((g: any) => g.student.id === student.id);
                const input = gradeInputs[student.id] || { score: '', feedback: '' };

                return (
                  <div key={student.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary-700 dark:text-primary-400">
                        {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {student.firstName} {student.lastName}
                      </p>
                    </div>

                    {existingGrade ? (
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${existingGrade.score >= 10 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {existingGrade.score}/20
                        </span>
                        {existingGrade.feedback && (
                          <span className="text-xs text-gray-400 max-w-[150px] truncate" title={existingGrade.feedback}>
                            {existingGrade.feedback}
                          </span>
                        )}
                        <span className="badge bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Calificado</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          placeholder="Nota"
                          className="input w-20 text-center text-sm"
                          value={input.score}
                          onChange={(e) => setGradeInputs((prev) => ({
                            ...prev,
                            [student.id]: { ...input, score: e.target.value },
                          }))}
                        />
                        <input
                          placeholder="Feedback (opcional)"
                          className="input w-40 text-sm"
                          value={input.feedback}
                          onChange={(e) => setGradeInputs((prev) => ({
                            ...prev,
                            [student.id]: { ...input, feedback: e.target.value },
                          }))}
                        />
                        <button
                          onClick={() => handleAssignGrade(student.id)}
                          className="btn-primary text-sm px-3 py-2"
                        >
                          Asignar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {students.length === 0 && (
                <p className="text-center text-gray-400 dark:text-gray-500 py-4">No hay estudiantes inscritos</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Comments */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Discusion ({post.commentsCount} comentarios)
        </h2>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {comments.map((comment) => renderComment(comment))}
        </div>

        {comments.length === 0 && (
          <p className="text-center text-gray-400 dark:text-gray-500 py-4">Se el primero en comentar</p>
        )}

        <form onSubmit={handleComment} className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-2">
          <input
            className="input flex-1"
            placeholder="Escribe un comentario..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button type="submit" className="btn-primary flex items-center gap-1">
            <Send className="w-4 h-4" /> Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
