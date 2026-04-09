import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Plus, Calendar, Percent, MessageCircle, ThumbsUp, Pin } from 'lucide-react';
import { timeAgo, formatDate } from '@/lib/utils';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function SubjectPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [subject, setSubject] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', programContent: '', dueDate: '', weightPercent: '', type: 'PROJECT',
  });

  useEffect(() => {
    if (!id) return;
    api.get(`/subjects/${id}`).then(({ data }) => setSubject(data)).catch(() => {});
    api.get(`/subjects/${id}/posts`).then(({ data }) => setPosts(data.data || [])).catch(() => {});
  }, [id]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        title: form.title,
        description: form.description,
        type: form.type,
      };
      if (form.programContent) payload.programContent = form.programContent;
      if (form.dueDate) payload.dueDate = new Date(form.dueDate).toISOString();
      if (form.weightPercent) payload.weightPercent = parseFloat(form.weightPercent);

      const { data } = await api.post(`/subjects/${id}/posts`, payload);
      setPosts([data, ...posts]);
      setShowForm(false);
      setForm({ title: '', description: '', programContent: '', dueDate: '', weightPercent: '', type: 'PROJECT' });
      toast.success('Post creado');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear post');
    }
  };

  if (!subject) return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Cargando...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{subject.name}</h1>
          <p className="text-gray-500 dark:text-gray-400">{subject.code} {subject.description ? `- ${subject.description}` : ''}</p>
        </div>
        {user?.role === 'TEACHER' && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuevo Post
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Crear nuevo post</h3>
          <form onSubmit={handleCreatePost} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titulo</label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="PROJECT">Proyecto</option>
                  <option value="ANNOUNCEMENT">Anuncio</option>
                  <option value="DISCUSSION">Discusion</option>
                  <option value="RESOURCE">Recurso</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripcion</label>
              <textarea className="input min-h-[100px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contenido programatico</label>
              <textarea className="input" value={form.programContent} onChange={(e) => setForm({ ...form, programContent: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de entrega</label>
                <input type="datetime-local" className="input" min={new Date().toISOString().slice(0, 16)} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ponderacion (%)</label>
                <input type="number" className="input" min="0" max="100" value={form.weightPercent} onChange={(e) => setForm({ ...form, weightPercent: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Publicar</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Posts list */}
      <div className="space-y-3">
        {posts.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No hay publicaciones en esta materia</p>
          </div>
        ) : (
          posts.map((post) => (
            <Link key={post.id} to={`/posts/${post.id}`} className="card block hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                {post.isPinned && <Pin className="w-4 h-4 text-primary-500 mt-1 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${
                      post.type === 'PROJECT' ? 'bg-blue-100 text-blue-700' :
                      post.type === 'ANNOUNCEMENT' ? 'bg-yellow-100 text-yellow-700' :
                      post.type === 'DISCUSSION' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {post.type === 'PROJECT' ? 'Proyecto' : post.type === 'ANNOUNCEMENT' ? 'Anuncio' : post.type === 'DISCUSSION' ? 'Discusion' : 'Recurso'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {post.author.firstName} {post.author.lastName} - {timeAgo(post.createdAt)}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{post.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{post.description}</p>

                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                    {post.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" /> {formatDate(post.dueDate)}
                      </span>
                    )}
                    {post.weightPercent && (
                      <span className="flex items-center gap-1">
                        <Percent className="w-4 h-4" /> {post.weightPercent}%
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" /> {post.commentsCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" /> {post.reactionsCount}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
