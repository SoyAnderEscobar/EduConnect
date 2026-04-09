import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { BookOpen, Users, FileText, Clock } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import api from '@/services/api';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    api.get('/subjects').then(({ data }) => setSubjects(data.data || [])).catch(() => {});
    api.get('/notifications?limit=5').then(({ data }) => setNotifications(data.data || [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Bienvenido, {user?.firstName}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {user?.role === 'TEACHER' ? 'Panel del profesor' : user?.role === 'SUPER_ADMIN' ? 'Panel de administracion' : 'Tu espacio de aprendizaje'}
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Mis Materias</h2>
        {subjects.length === 0 ? (
          <div className="card text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No tienes materias asignadas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject: any) => (
              <Link key={subject.id} to={`/subjects/${subject.id}`} className="card hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center group-hover:bg-primary-200 dark:group-hover:bg-primary-800 transition-colors">
                    <BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{subject.code}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mt-3">{subject.name}</h3>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {subject.usersCount || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {subject.postsCount || 0} posts
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Actividad Reciente</h2>
        {notifications.length === 0 ? (
          <div className="card text-center py-8">
            <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">Sin actividad reciente</p>
          </div>
        ) : (
          <div className="card divide-y divide-gray-100 dark:divide-gray-700">
            {notifications.map((notif: any) => (
              <div key={notif.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${notif.isRead ? 'bg-gray-300 dark:bg-gray-600' : 'bg-primary-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{notif.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{notif.message}</p>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{timeAgo(notif.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
