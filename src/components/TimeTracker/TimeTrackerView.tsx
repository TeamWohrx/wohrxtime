import React, { useState } from 'react';
import { ActiveTimer, DepartmentArea, Project, TimeEntry, User } from '../../types';
import {
  formatDateSpanish,
  formatMinutesToHours,
  formatSecondsToDigital,
  minutesToDecimalHours,
  toISODateString,
} from '../../utils/timeUtils';
import {
  Play,
  Pause,
  Square,
  Plus,
  Clock,
  Trash2,
  Edit2,
  Search,
  Filter,
  Briefcase,
  Sparkles,
} from 'lucide-react';

interface TimeTrackerViewProps {
  timer: ActiveTimer;
  onStartTimer: (projectName: string, description: string) => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onStopTimer: () => void;
  onDiscardTimer: () => void;
  entries: TimeEntry[];
  projects: Project[];
  currentUser: User;
  onAddManualEntry: (entry: Omit<TimeEntry, 'id' | 'createdAt'>) => void;
  onDeleteEntry: (id: string) => void;
  onUpdateEntry: (entry: TimeEntry) => void;
}

const COMMON_AREAS: DepartmentArea[] = ['Sistemas', 'Marketing', 'RRHH', 'Administrador'];

export const TimeTrackerView: React.FC<TimeTrackerViewProps> = ({
  timer,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onStopTimer,
  onDiscardTimer,
  entries,
  projects,
  currentUser,
  onAddManualEntry,
  onDeleteEntry,
  onUpdateEntry,
}) => {
  const [activeMode, setActiveMode] = useState<'timer' | 'manual'>('timer');

  // Timer local inputs (Project is freely editable text like the task)
  const [description, setDescription] = useState(timer.description || '');
  const [projectNameInput, setProjectNameInput] = useState<string>(
    timer.projectName || currentUser.area
  );

  // Manual entry local inputs
  const [manualDate, setManualDate] = useState(toISODateString(new Date()));
  const [manualStartTime, setManualStartTime] = useState('09:00');
  const [manualEndTime, setManualEndTime] = useState('13:00');
  const [manualDurationHours, setManualDurationHours] = useState('4');
  const [manualUseTimeRange, setManualUseTimeRange] = useState(true);
  const [manualDescription, setManualDescription] = useState('');
  const [manualProjectInput, setManualProjectInput] = useState<string>(currentUser.area);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('all');

  // Edit entry modal state
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  // Available unique project names for autocomplete datalist
  const allProjectNames = Array.from(
    new Set([
      ...COMMON_AREAS,
      ...projects.map((p) => p.name),
      ...entries.map((e) => e.projectName),
    ])
  ).filter(Boolean);

  // Sync inputs with running timer if any
  React.useEffect(() => {
    if (timer.isRunning) {
      setDescription(timer.description);
      setProjectNameInput(timer.projectName);
    }
  }, [timer.isRunning, timer.description, timer.projectName]);

  const handleStart = () => {
    const finalProject = projectNameInput.trim() || currentUser.area;
    onStartTimer(
      finalProject,
      description.trim() || 'Actividad asignada'
    );
  };

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    const finalProject = manualProjectInput.trim() || currentUser.area;

    let durationMinutes = 0;
    if (manualUseTimeRange && manualStartTime && manualEndTime) {
      const [sh, sm] = manualStartTime.split(':').map(Number);
      const [eh, em] = manualEndTime.split(':').map(Number);
      const startTotal = sh * 60 + sm;
      const endTotal = eh * 60 + em;
      durationMinutes = endTotal >= startTotal ? endTotal - startTotal : 24 * 60 - startTotal + endTotal;
    } else {
      const hoursNum = parseFloat(manualDurationHours) || 0;
      durationMinutes = Math.round(hoursNum * 60);
    }

    if (durationMinutes <= 0) {
      durationMinutes = 60; // 1h fallback
    }

    const matchedProject = projects.find(
      (p) => p.name.toLowerCase() === finalProject.toLowerCase()
    );

    onAddManualEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userArea: currentUser.area,
      projectId: matchedProject?.id || `proj-${Date.now()}`,
      projectName: finalProject,
      description: manualDescription.trim() || 'Registro de actividad',
      date: manualDate,
      startTime: manualUseTimeRange ? manualStartTime : undefined,
      endTime: manualUseTimeRange ? manualEndTime : undefined,
      durationMinutes,
    });

    // Reset manual form
    setManualDescription('');
  };

  // Calculate today's metrics
  const todayStr = toISODateString(new Date());
  const todayEntries = entries.filter((e) => e.date === todayStr);
  const todayMinutes = todayEntries.reduce((acc, e) => acc + e.durationMinutes, 0);
  const todayHours = minutesToDecimalHours(todayMinutes);
  const dailyGoalHours = 8;
  const dailyProgress = Math.min(100, Math.round((todayHours / dailyGoalHours) * 100));

  // Filtered entries list
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.userArea.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject =
      filterProject === 'all' ||
      entry.projectName.toLowerCase() === filterProject.toLowerCase();
    return matchesSearch && matchesProject;
  });

  // Group entries by date descending
  const groupedEntries = filteredEntries.reduce<Record<string, TimeEntry[]>>((acc, entry) => {
    if (!acc[entry.date]) {
      acc[entry.date] = [];
    }
    acc[entry.date].push(entry);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));
  const projectMap = new Map(projects.map((p) => [p.name.toLowerCase(), p]));

  const handleContinueEntry = (entry: TimeEntry) => {
    setDescription(entry.description);
    setProjectNameInput(entry.projectName);
    onStartTimer(entry.projectName, entry.description);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      {/* Top Banner / Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Control de Tiempo
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Escribe libremente tu proyecto o selecciona tu área de trabajo (Marketing, Sistemas, RRHH...)
          </p>
        </div>

        {/* Mode switcher tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setActiveMode('timer')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              activeMode === 'timer'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Temporizador en Vivo
          </button>
          <button
            onClick={() => setActiveMode('manual')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              activeMode === 'manual'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Entrada Manual
          </button>
        </div>
      </div>

      {/* Main Tracker Card */}
      {activeMode === 'timer' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-xs transition-colors space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
            {/* Task Description */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                ¿En qué tarea estás trabajando ahora?
              </label>
              <input
                type="text"
                placeholder="Ej. Rediseño del banner de campaña, revisión de servidores, screening de candidatos..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={timer.isRunning}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Project / Area input (Freeform text, datalist, and area buttons) */}
            <div className="w-full lg:w-80">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Proyecto o Área
                </label>
                <span className="text-[10px] text-slate-400">Escribe o elige un área</span>
              </div>
              <input
                type="text"
                list="projects-datalist"
                placeholder={`Ej. ${currentUser.area}, o cualquier proyecto...`}
                value={projectNameInput}
                onChange={(e) => setProjectNameInput(e.target.value)}
                disabled={timer.isRunning}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <datalist id="projects-datalist">
                {allProjectNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            {/* Timer Display */}
            <div className="flex items-center justify-between lg:justify-end gap-5 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
              <div className="text-center lg:text-right">
                <span className="block text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 tracking-tight">
                  {formatSecondsToDigital(timer.elapsedSeconds)}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {timer.isRunning
                    ? timer.isPaused
                      ? 'Pausado'
                      : 'En curso'
                    : 'Listo para iniciar'}
                </span>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2">
                {!timer.isRunning ? (
                  <button
                    onClick={handleStart}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Iniciar</span>
                  </button>
                ) : (
                  <>
                    {timer.isPaused ? (
                      <button
                        onClick={onResumeTimer}
                        className="p-2.5 rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        title="Reanudar temporizador"
                      >
                        <Play className="w-5 h-5 fill-current" />
                      </button>
                    ) : (
                      <button
                        onClick={onPauseTimer}
                        className="p-2.5 rounded-lg text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 transition-colors cursor-pointer"
                        title="Pausar temporizador"
                      >
                        <Pause className="w-5 h-5 fill-current" />
                      </button>
                    )}

                    <button
                      onClick={onStopTimer}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                      title="Guardar registro en la planilla"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>Guardar</span>
                    </button>

                    <button
                      onClick={onDiscardTimer}
                      className="p-2.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Descartar tiempo sin guardar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Selection Chips (Areas and Common Projects) */}
          {!timer.isRunning && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[11px] font-medium mr-1">
                Elegir área directa:
              </span>
              {COMMON_AREAS.map((areaName) => (
                <button
                  key={areaName}
                  type="button"
                  onClick={() => setProjectNameInput(areaName)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                    projectNameInput === areaName
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  {areaName}
                </button>
              ))}

              <span className="text-slate-300 dark:text-slate-700 mx-1">|</span>

              <span className="text-slate-400 text-[11px] font-medium mr-1">
                Recientes / Otros:
              </span>
              {projects
                .filter((p) => !COMMON_AREAS.includes(p.name as any))
                .slice(0, 3)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProjectNameInput(p.name)}
                    className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                  >
                    {p.name}
                  </button>
                ))}
            </div>
          )}
        </div>
      ) : (
        /* Manual Entry Form */
        <form
          onSubmit={handleSaveManual}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-xs space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Fecha de Trabajo
              </label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Proyecto o Área
                </label>
                <div className="flex items-center gap-1">
                  {COMMON_AREAS.slice(0, 3).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setManualProjectInput(a)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                list="projects-datalist-manual"
                placeholder={`Ej. ${currentUser.area}, o escribe una iniciativa...`}
                value={manualProjectInput}
                onChange={(e) => setManualProjectInput(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <datalist id="projects-datalist-manual">
                {allProjectNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {manualUseTimeRange ? 'Rango Horario' : 'Duración en Horas'}
                </label>
                <button
                  type="button"
                  onClick={() => setManualUseTimeRange(!manualUseTimeRange)}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {manualUseTimeRange ? 'Usar duración directa' : 'Usar inicio/fin'}
                </button>
              </div>

              {manualUseTimeRange ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={manualStartTime}
                    onChange={(e) => setManualStartTime(e.target.value)}
                    required
                    className="w-1/2 px-2.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                  <span className="text-slate-400 text-xs">a</span>
                  <input
                    type="time"
                    value={manualEndTime}
                    onChange={(e) => setManualEndTime(e.target.value)}
                    required
                    className="w-1/2 px-2.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
              ) : (
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  placeholder="Ej. 4"
                  value={manualDurationHours}
                  onChange={(e) => setManualDurationHours(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
                />
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Descripción detallada de la tarea realizada..."
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Guardar Registro</span>
            </button>
          </div>
        </form>
      )}

      {/* Today's Productivity Highlights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Horas Registradas Hoy
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {formatMinutesToHours(todayMinutes)}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({todayHours}h)
            </span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Jornada Laboral Diaria (Meta 8h)
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
              {dailyProgress}%
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {todayHours}h de 8h
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all"
              style={{ width: `${dailyProgress}%` }}
            />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Bloques de Actividad Hoy
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {todayEntries.length}
            </span>
            <span className="text-xs text-slate-500">
              {todayEntries.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por tarea, colaborador o proyecto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">Todos los proyectos / áreas</option>
            {allProjectNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Entries List grouped by date */}
      <div className="space-y-6">
        {sortedDates.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8">
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No hay registros de tiempo que coincidan
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Inicia el temporizador escribiendo tu tarea o guarda una entrada manual.
            </p>
          </div>
        ) : (
          sortedDates.map((dateStr) => {
            const dayEntries = groupedEntries[dateStr];
            const dayTotalMin = dayEntries.reduce((acc, e) => acc + e.durationMinutes, 0);
            const isToday = dateStr === todayStr;

            return (
              <div
                key={dateStr}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden"
              >
                {/* Date Header */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 capitalize">
                      {isToday ? 'Hoy · ' : ''}
                      {formatDateSpanish(dateStr)}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {dayEntries.length} {dayEntries.length === 1 ? 'registro' : 'registros'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-500">Total jornada:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {formatMinutesToHours(dayTotalMin)}
                    </span>
                  </div>
                </div>

                {/* Day entries table / list */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dayEntries.map((entry) => {
                    const matchedProj = projectMap.get(entry.projectName.toLowerCase());
                    const projColor = matchedProj?.color || '#6366F1';

                    return (
                      <div
                        key={entry.id}
                        className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Project & Task Description */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs mb-1">
                            <span className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-200 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: projColor }}
                              />
                              {entry.projectName}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {entry.userArea}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {entry.userName}
                            </span>
                          </div>

                          <p className="text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                            {entry.description}
                          </p>
                        </div>

                        {/* Time range & Duration */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                          {entry.startTime && entry.endTime && (
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 hidden md:inline-block">
                              {entry.startTime} - {entry.endTime}
                            </span>
                          )}

                          {/* Duration */}
                          <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 w-16 text-right">
                            {formatMinutesToHours(entry.durationMinutes)}
                          </span>

                          {/* Action icons */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleContinueEntry(entry)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Continuar esta tarea en el temporizador"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <button
                              onClick={() => setEditingEntry(entry)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Editar entrada"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteEntry(entry.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title="Eliminar entrada"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Editar Registro de Tiempo
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Descripción de la Tarea</label>
              <input
                type="text"
                value={editingEntry.description}
                onChange={(e) =>
                  setEditingEntry({ ...editingEntry, description: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Proyecto o Área</label>
              <input
                type="text"
                list="projects-datalist-edit"
                value={editingEntry.projectName}
                onChange={(e) =>
                  setEditingEntry({
                    ...editingEntry,
                    projectName: e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
              <datalist id="projects-datalist-edit">
                {allProjectNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha</label>
                <input
                  type="date"
                  value={editingEntry.date}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, date: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Duración (minutos)</label>
                <input
                  type="number"
                  step="5"
                  min="5"
                  value={editingEntry.durationMinutes}
                  onChange={(e) =>
                    setEditingEntry({
                      ...editingEntry,
                      durationMinutes: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateEntry(editingEntry);
                  setEditingEntry(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
