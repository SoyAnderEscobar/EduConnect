import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { ClipboardList, TrendingUp, Users } from 'lucide-react';
import api from '@/services/api';

function StudentGradesView() {
  const [summary, setSummary] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [grades, setGrades] = useState<any>(null);

  useEffect(() => {
    api.get('/grades/summary').then(({ data }) => setSummary(data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    api.get(`/subjects/${selectedSubject}/grades`).then(({ data }) => setGrades(data)).catch(() => {});
  }, [selectedSubject]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {summary.map((s: any) => (
          <button
            key={s.subjectId}
            onClick={() => setSelectedSubject(s.subjectId)}
            className={`card text-left hover:shadow-md transition-all ${
              selectedSubject === s.subjectId ? 'ring-2 ring-primary-500' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 dark:text-white">{s.subjectName}</h3>
              <span className="text-xs font-mono text-gray-400">{s.subjectCode}</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{s.projectedFinal || '--'}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Promedio proyectado</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.totalWeightGraded}% evaluado</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.gradesCount} notas</p>
              </div>
            </div>
            <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${s.projectedFinal >= 10 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, (s.projectedFinal / 20) * 100)}%` }}
              />
            </div>
          </button>
        ))}
      </div>

      {summary.length === 0 && (
        <div className="card text-center py-12">
          <ClipboardList className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No tienes notas registradas</p>
        </div>
      )}

      {grades && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Detalle de notas</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-3 font-medium">Proyecto</th>
                  <th className="pb-3 font-medium text-center">Nota</th>
                  <th className="pb-3 font-medium text-center">Peso</th>
                  <th className="pb-3 font-medium text-center">Ponderado</th>
                  <th className="pb-3 font-medium">Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {grades.grades.map((g: any) => (
                  <tr key={g.id}>
                    <td className="py-3 text-sm font-medium text-gray-800 dark:text-gray-200">{g.postTitle}</td>
                    <td className="py-3 text-center">
                      <span className={`font-bold ${g.score >= 10 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{g.score}</span>
                      <span className="text-gray-400">/20</span>
                    </td>
                    <td className="py-3 text-center text-sm text-gray-500 dark:text-gray-400">{g.weight}%</td>
                    <td className="py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">{g.weighted}</td>
                    <td className="py-3 text-sm text-gray-500 dark:text-gray-400">{g.feedback || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-gray-600">
                  <td className="py-3 font-semibold text-gray-800 dark:text-white">Total</td>
                  <td></td>
                  <td className="py-3 text-center font-medium text-gray-600 dark:text-gray-300">{grades.summary.totalWeightGraded}%</td>
                  <td className="py-3 text-center font-bold text-primary-600 dark:text-primary-400">{grades.summary.accumulatedScore}</td>
                  <td></td>
                </tr>
                <tr>
                  <td className="py-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" /> Promedio proyectado
                  </td>
                  <td colSpan={3} className="py-2 text-center font-bold text-lg text-primary-600 dark:text-primary-400">
                    {grades.summary.projectedFinal}/20
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TeacherGradesView() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    api.get('/subjects').then(({ data }) => setSubjects(data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    api.get(`/subjects/${selectedSubject}/grade-report`).then(({ data }) => setReport({ posts: data.posts || [], report: data.students || [] })).catch(() => {});
  }, [selectedSubject]);

  return (
    <div className="space-y-6">
      {/* Subject selector */}
      <div className="flex flex-wrap gap-3">
        {subjects.map((s: any) => (
          <button
            key={s.id}
            onClick={() => setSelectedSubject(s.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedSubject === s.id
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-primary-300'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {!selectedSubject && (
        <div className="card text-center py-12">
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Selecciona una materia para ver las notas</p>
        </div>
      )}

      {report && (
        <div className="card overflow-x-auto">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Reporte de Notas
          </h2>
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="pb-3 font-medium sticky left-0 bg-white dark:bg-gray-800">Estudiante</th>
                {report.posts.map((p: any) => (
                  <th key={p.id} className="pb-3 font-medium text-center px-2">
                    <div className="max-w-[120px] truncate" title={p.title}>{p.title}</div>
                    <div className="text-xs text-gray-400 font-normal">{p.weight || 0}%</div>
                  </th>
                ))}
                <th className="pb-3 font-medium text-center">Promedio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {report.report.map((row: any) => {
                const graded = row.grades.filter((g: any) => g.score !== null);
                const avg = graded.length > 0
                  ? graded.reduce((sum: number, g: any) => sum + g.score, 0) / graded.length
                  : null;

                return (
                  <tr key={row.student.id}>
                    <td className="py-3 text-sm font-medium text-gray-800 dark:text-gray-200 sticky left-0 bg-white dark:bg-gray-800">
                      {row.student.firstName} {row.student.lastName}
                      <span className="text-xs text-gray-400 block">{row.student.cedula}</span>
                    </td>
                    {row.grades.map((g: any) => (
                      <td key={g.postId} className="py-3 text-center">
                        {g.score !== null ? (
                          <span className={`font-bold ${g.score >= 10 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {g.score}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">--</span>
                        )}
                      </td>
                    ))}
                    <td className="py-3 text-center">
                      {avg !== null ? (
                        <span className={`font-bold text-lg ${avg >= 10 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {avg.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {report.report.length === 0 && (
            <p className="text-center text-gray-400 dark:text-gray-500 py-8">No hay estudiantes inscritos</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function GradesPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        {user?.role === 'TEACHER' ? 'Notas de Estudiantes' : 'Mis Notas'}
      </h1>

      {user?.role === 'TEACHER' ? <TeacherGradesView /> : <StudentGradesView />}
    </div>
  );
}
