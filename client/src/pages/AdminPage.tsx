import { useState, useEffect } from 'react';
import { Users, BookOpen, Plus, X, UserPlus } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [tab, setTab] = useState<'users' | 'subjects' | 'enroll'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({
    firstName: '', lastName: '', cedula: '', username: '', password: '', role: 'STUDENT', subjectIds: [] as string[],
  });
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', description: '', semester: '' });
  const [search, setSearch] = useState('');
  // Enrollment
  const [enrollUserId, setEnrollUserId] = useState('');
  const [enrollSubjectId, setEnrollSubjectId] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    api.get('/admin/users').then(({ data }) => setUsers(data.data)).catch(() => {});
    api.get('/admin/subjects').then(({ data }) => setSubjects(data.data || [])).catch(() => {});
    api.get('/admin/stats').then(({ data }) => setStats(data)).catch(() => {});
  };

  const resetUserForm = () => {
    setUserForm({ firstName: '', lastName: '', cedula: '', username: '', password: '', role: 'STUDENT', subjectIds: [] });
    setEditingUser(null);
  };

  const openEditUser = (u: any) => {
    setEditingUser(u);
    setUserForm({
      firstName: u.firstName,
      lastName: u.lastName,
      cedula: u.cedula,
      username: u.username,
      password: '',
      role: u.role,
      subjectIds: u.subjects?.map((s: any) => s.id) || [],
    });
    setShowUserForm(true);
  };

  const handleCreateOrUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const payload: any = { ...userForm };
        if (!payload.password) delete payload.password;
        payload.username = payload.username || payload.cedula;
        await api.put(`/admin/users/${editingUser.id}`, payload);
        toast.success('Usuario actualizado');
      } else {
        await api.post('/admin/users', { ...userForm, username: userForm.username || userForm.cedula });
        toast.success('Usuario creado');
      }
      setShowUserForm(false);
      resetUserForm();
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/subjects', subjectForm);
      toast.success('Materia creada');
      setShowSubjectForm(false);
      setSubjectForm({ name: '', code: '', description: '', semester: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const handleToggleUser = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/admin/users/${id}`, { isActive: !isActive });
      toast.success(isActive ? 'Usuario desactivado' : 'Usuario activado');
      loadData();
    } catch { toast.error('Error'); }
  };

  const handleEnroll = async () => {
    if (!enrollUserId || !enrollSubjectId) { toast.error('Selecciona usuario y materia'); return; }
    try {
      await api.post('/admin/enroll', { userId: enrollUserId, subjectId: enrollSubjectId });
      toast.success('Usuario inscrito en la materia');
      loadData();
      setEnrollUserId('');
      setEnrollSubjectId('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al inscribir');
    }
  };

  const handleUnenroll = async (userId: string, subjectId: string) => {
    try {
      await api.delete('/admin/enroll', { data: { userId, subjectId } });
      toast.success('Desinscrito');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const toggleSubjectForUser = (subjectId: string) => {
    setUserForm((prev) => ({
      ...prev,
      subjectIds: prev.subjectIds.includes(subjectId)
        ? prev.subjectIds.filter((id) => id !== subjectId)
        : [...prev.subjectIds, subjectId],
    }));
  };

  const filteredUsers = users.filter((u) =>
    !search || `${u.firstName} ${u.lastName} ${u.cedula} ${u.username}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Panel de Administracion</h1>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Estudiantes', value: stats.students },
            { label: 'Profesores', value: stats.teachers },
            { label: 'Materias', value: stats.subjects },
            { label: 'Posts', value: stats.posts },
          ].map((s) => (
            <div key={s.label} className="card">
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-0">
        {[
          { key: 'users', label: 'Usuarios', icon: Users },
          { key: 'subjects', label: 'Materias', icon: BookOpen },
          { key: 'enroll', label: 'Inscripciones', icon: UserPlus },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-primary-600 text-primary-700 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <input className="input max-w-xs" placeholder="Buscar usuario..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button onClick={() => { resetUserForm(); setShowUserForm(true); }} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Crear Usuario
            </button>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-3 font-medium">Nombre</th>
                  <th className="pb-3 font-medium">Cedula</th>
                  <th className="pb-3 font-medium">Usuario</th>
                  <th className="pb-3 font-medium">Rol</th>
                  <th className="pb-3 font-medium">Materias</th>
                  <th className="pb-3 font-medium">Estado</th>
                  <th className="pb-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {filteredUsers.map((u: any) => (
                  <tr key={u.id}>
                    <td className="py-3 text-sm font-medium text-gray-800 dark:text-gray-200">{u.firstName} {u.lastName}</td>
                    <td className="py-3 text-sm text-gray-500 dark:text-gray-400">{u.cedula}</td>
                    <td className="py-3 text-sm text-gray-500 dark:text-gray-400">{u.username}</td>
                    <td className="py-3">
                      <span className={`badge ${u.role === 'TEACHER' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : u.role === 'SUPER_ADMIN' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                        {u.role === 'TEACHER' ? 'Profesor' : u.role === 'SUPER_ADMIN' ? 'Admin' : 'Estudiante'}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-500 dark:text-gray-400">
                      {u.subjects?.map((s: any) => s.code).join(', ') || '-'}
                    </td>
                    <td className="py-3">
                      <span className={`badge ${u.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 flex gap-2">
                      {u.role !== 'SUPER_ADMIN' && (
                        <>
                          <button onClick={() => openEditUser(u)} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                            Editar
                          </button>
                          <button onClick={() => handleToggleUser(u.id, u.isActive)} className="text-sm text-gray-500 dark:text-gray-400 hover:underline">
                            {u.isActive ? 'Desactivar' : 'Activar'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subjects Tab */}
      {tab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowSubjectForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Crear Materia
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((s: any) => (
              <div key={s.id} className="card">
                <h3 className="font-semibold text-gray-800 dark:text-white">{s.name}</h3>
                <p className="text-sm text-gray-400 font-mono">{s.code}</p>
                {s.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{s.description}</p>}
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-400 dark:text-gray-500">
                  <span>{s.usersCount || 0} inscritos</span>
                  <span>{s.postsCount || 0} posts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enrollments Tab */}
      {tab === 'enroll' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Inscribir usuario en materia</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <select className="input flex-1" value={enrollUserId} onChange={(e) => setEnrollUserId(e.target.value)}>
                <option value="">Seleccionar usuario...</option>
                {users.filter((u) => u.role !== 'SUPER_ADMIN').map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.role === 'TEACHER' ? 'Prof.' : 'Est.'}) - {u.cedula}
                  </option>
                ))}
              </select>
              <select className="input flex-1" value={enrollSubjectId} onChange={(e) => setEnrollSubjectId(e.target.value)}>
                <option value="">Seleccionar materia...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
              <button onClick={handleEnroll} className="btn-primary whitespace-nowrap">
                <UserPlus className="w-4 h-4 inline mr-1" /> Inscribir
              </button>
            </div>
          </div>

          {/* Current enrollments by subject */}
          <div className="space-y-4">
            {subjects.map((s: any) => {
              const enrolled = users.filter((u) =>
                u.subjects?.some((us: any) => us.id === s.id)
              );
              if (enrolled.length === 0) return null;
              return (
                <div key={s.id} className="card">
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-3">
                    {s.name} <span className="text-sm font-normal text-gray-400">({s.code})</span>
                  </h4>
                  <div className="space-y-2">
                    {enrolled.map((u) => (
                      <div key={u.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className={`badge ${u.role === 'TEACHER' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                            {u.role === 'TEACHER' ? 'Prof.' : 'Est.'}
                          </span>
                          <span className="text-sm text-gray-800 dark:text-gray-200">{u.firstName} {u.lastName}</span>
                        </div>
                        <button
                          onClick={() => handleUnenroll(u.id, s.id)}
                          className="text-xs text-red-500 hover:text-red-600 dark:text-red-400"
                        >
                          Desinscribir
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                {editingUser ? 'Editar Usuario' : 'Crear Usuario'}
              </h3>
              <button onClick={() => { setShowUserForm(false); resetUserForm(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOrUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                  <input className="input" value={userForm.firstName} onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Apellido</label>
                  <input className="input" value={userForm.lastName} onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cedula</label>
                <input className="input" value={userForm.cedula} onChange={(e) => setUserForm({ ...userForm, cedula: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuario (vacio = cedula)</label>
                <input className="input" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} placeholder={userForm.cedula || 'Automatico'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contrasena {editingUser && '(vacio = no cambiar)'}
                </label>
                <input type="password" className="input" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required={!editingUser} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                <select className="input" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} disabled={!!editingUser}>
                  <option value="STUDENT">Estudiante</option>
                  <option value="TEACHER">Profesor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Materias</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border dark:border-gray-600 rounded-lg p-3">
                  {subjects.map((s: any) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userForm.subjectIds.includes(s.id)}
                        onChange={() => toggleSubjectForUser(s.id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{s.name} ({s.code})</span>
                    </label>
                  ))}
                  {subjects.length === 0 && <p className="text-sm text-gray-400">No hay materias creadas</p>}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
                <button type="button" onClick={() => { setShowUserForm(false); resetUserForm(); }} className="btn-secondary flex-1">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Form Modal */}
      {showSubjectForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Crear Materia</h3>
              <button onClick={() => setShowSubjectForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                <input className="input" value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Codigo</label>
                <input className="input" placeholder="Ej: PRG-101" value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripcion</label>
                <textarea className="input" value={subjectForm.description} onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semestre</label>
                <input className="input" placeholder="Ej: 2026-1" value={subjectForm.semester} onChange={(e) => setSubjectForm({ ...subjectForm, semester: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">Crear Materia</button>
                <button type="button" onClick={() => setShowSubjectForm(false)} className="btn-secondary flex-1">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
