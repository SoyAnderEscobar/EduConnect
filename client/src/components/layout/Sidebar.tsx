import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  LayoutDashboard, BookOpen, MessageCircle, ClipboardList, LogOut, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  subjects: any[];
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ subjects, isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const mainLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/chat', icon: MessageCircle, label: 'Chat' },
    { to: '/grades', icon: ClipboardList, label: 'Notas' },
  ];

  if (user?.role === 'SUPER_ADMIN') {
    mainLinks.push({ to: '/admin', icon: Shield, label: 'Administracion' });
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 flex flex-col transition-all duration-300',
        'lg:translate-x-0 lg:static lg:z-auto',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800 dark:text-white">EduConnect</span>
          </Link>
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {mainLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                location.pathname === link.to
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
              )}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          ))}

          {subjects.length > 0 && (
            <>
              <div className="pt-4 pb-2 px-3">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Materias</p>
              </div>
              {subjects.map((subject: any) => (
                <Link
                  key={subject.id}
                  to={`/subjects/${subject.id}`}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    location.pathname === `/subjects/${subject.id}`
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
                  )}
                >
                  <div className="w-3 h-3 rounded-full bg-primary-400" />
                  <span className="truncate">{subject.name}</span>
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-primary-700 dark:text-primary-400">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {user?.role === 'TEACHER' ? 'Profesor' : user?.role === 'SUPER_ADMIN' ? 'Admin' : 'Estudiante'}
              </p>
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors" title="Cerrar sesion">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
