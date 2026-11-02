import React, { useState } from 'react';
import { DepartmentArea, Project, TimeEntry, User } from '../../types';
import { minutesToDecimalHours } from '../../utils/timeUtils';
import {
  FolderKanban,
  Users,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Check,
  AlertTriangle,
  RotateCcw,
  Shield,
} from 'lucide-react';

interface ProjectsViewProps {
  projects: Project[];
  allUsers: User[];
  entries: TimeEntry[];
  onAddProject: (project: Omit<Project, 'id'>) => void;
  onUpdateProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onResetSeedData: () => void;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#10B981', // Emerald
  '#14B8A6', // Teal
];

const AREAS: DepartmentArea[] = ['Marketing', 'RRHH', 'Sistemas', 'Administrador'];

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  allUsers,
  entries,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onResetSeedData,
}) => {
  const [activeTab, setActiveTab] = useState<'projects' | 'team'>('projects');

  // New Project Form Modal
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectArea, setProjectArea] = useState<DepartmentArea>('Sistemas');
  const [projectColor, setProjectColor] = useState(PRESET_COLORS[0]);
  const [projectBudget, setProjectBudget] = useState('80');
  const [projectDesc, setProjectDesc] = useState('');

  // Open modal for creating project
  const handleOpenNewProject = () => {
    setEditingProject(null);
    setProjectName('');
    setProjectArea('Sistemas');
    setProjectColor(PRESET_COLORS[0]);
    setProjectBudget('80');
    setProjectDesc('');
    setShowProjectModal(true);
  };

  // Open modal for editing project
  const handleOpenEditProject = (proj: Project) => {
    setEditingProject(proj);
    setProjectName(proj.name);
    setProjectArea(proj.area);
    setProjectColor(proj.color);
    setProjectBudget(String(proj.budgetHours));
    setProjectDesc(proj.description || '');
    setShowProjectModal(true);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingProject) {
      onUpdateProject({
        ...editingProject,
        name: projectName.trim(),
        area: projectArea,
        color: projectColor,
        budgetHours: parseFloat(projectBudget) || 0,
        description: projectDesc.trim(),
      });
    } else {
      onAddProject({
        name: projectName.trim(),
        area: projectArea,
        color: projectColor,
        budgetHours: parseFloat(projectBudget) || 0,
        status: 'active',
        description: projectDesc.trim(),
      });
    }
    setShowProjectModal(false);
  };

  // Compute metrics per project
  const projectMetrics = projects.map((p) => {
    const projEntries = entries.filter((e) => e.projectId === p.id);
    const totalMinutes = projEntries.reduce((acc, e) => acc + e.durationMinutes, 0);
    const totalHours = minutesToDecimalHours(totalMinutes);
    const budgetPercent = p.budgetHours > 0 ? Math.round((totalHours / p.budgetHours) * 100) : 0;
    const isOverBudget = totalHours > p.budgetHours && p.budgetHours > 0;

    return {
      project: p,
      totalHours,
      budgetPercent,
      isOverBudget,
      entriesCount: projEntries.length,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Proyectos & Equipo por Áreas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Organiza las iniciativas de Marketing, RRHH, Sistemas y consulta las horas acumuladas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'projects' && (
            <button
              onClick={handleOpenNewProject}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Proyecto</span>
            </button>
          )}

          {/* Reset sample seed button */}
          <button
            onClick={() => {
              if (confirm('¿Deseas restablecer los proyectos y registros de los 10 colaboradores?')) {
                onResetSeedData();
              }
            }}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Restablecer datos originales"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/60 dark:bg-slate-800 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === 'projects'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FolderKanban className="w-3.5 h-3.5" />
          <span>Iniciativas & Proyectos ({projects.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === 'team'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Equipo ({allUsers.length} integrantes)</span>
        </button>
      </div>

      {/* Projects List View */}
      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projectMetrics.map(({ project, totalHours, budgetPercent, isOverBudget, entriesCount }) => (
            <div
              key={project.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {project.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditProject(project)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded-md transition-colors cursor-pointer"
                      title="Editar proyecto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteProject(project.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                      title="Eliminar proyecto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Área: {project.area}
                  </span>
                  <span>·</span>
                  <span>{entriesCount} registros</span>
                </div>

                {project.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {project.description}
                  </p>
                )}
              </div>

              {/* Progress Bar of Target Hours */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">
                    Horas: {totalHours}h / {project.budgetHours}h objetivo
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      isOverBudget ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {budgetPercent}%
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isOverBudget
                        ? 'bg-rose-500'
                        : budgetPercent > 80
                        ? 'bg-amber-500'
                        : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(100, budgetPercent)}%` }}
                  />
                </div>

                {isOverBudget && (
                  <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3" />
                    Superó el objetivo por {(totalHours - project.budgetHours).toFixed(1)} horas
                  </p>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Estado:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">
                  {project.status === 'active' ? 'Activo' : 'Archivado'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team Members List View (The 10 requested profiles grouped by area) */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          {AREAS.map((areaName) => {
            const members = allUsers.filter((u) => u.area === areaName);
            if (members.length === 0) return null;

            return (
              <div
                key={areaName}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden"
              >
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      Área: {areaName}
                    </h3>
                    <span className="text-xs text-slate-500">
                      ({members.length} {members.length === 1 ? 'colaborador' : 'colaboradores'})
                    </span>
                  </div>
                  {areaName === 'Administrador' && (
                    <span className="text-xs text-purple-600 font-medium flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" />
                      Aprobador de Planillas
                    </span>
                  )}
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {members.map((u) => {
                    const userEntries = entries.filter((e) => e.userId === u.id);
                    const userMin = userEntries.reduce((acc, e) => acc + e.durationMinutes, 0);
                    const userHours = minutesToDecimalHours(userMin);

                    return (
                      <div
                        key={u.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                            {u.name
                              .split(' ')
                              .filter(Boolean)
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {u.name}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono">{u.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 self-start sm:self-auto text-xs">
                          <div>
                            <span className="text-slate-500 block">Horas Acumuladas:</span>
                            <span className="font-bold font-mono text-slate-900 dark:text-slate-100 text-sm">
                              {userHours}h
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Registros:</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              {userEntries.length} tareas
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProject}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre del Proyecto</label>
              <input
                type="text"
                placeholder="Ej. Automatización de Procesos Internos"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Área Responsable</label>
              <select
                value={projectArea}
                onChange={(e) => setProjectArea(e.target.value as DepartmentArea)}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Horas Estimadas / Objetivo</label>
              <input
                type="number"
                step="5"
                min="0"
                value={projectBudget}
                onChange={(e) => setProjectBudget(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            {/* Color picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Color Identificador</label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setProjectColor(c)}
                    className="w-6 h-6 rounded-full cursor-pointer flex items-center justify-center transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                  >
                    {projectColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Descripción / Objetivos</label>
              <textarea
                rows={2}
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                placeholder="Breve resumen del alcance o entregables..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowProjectModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                Guardar Proyecto
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
