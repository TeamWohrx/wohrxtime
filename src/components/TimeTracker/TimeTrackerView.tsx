import React, { useState } from 'react';
import { ActiveTimer, DepartmentArea, Project, TimeEntry, User } from '../../types';
import {
  formatDateSpanish,
  formatDurationHuman,
  formatMinutesToHours,
  formatSecondsToDigital,
  getMondayOfWeek,
  getWeekDays,
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
  Users,
  CheckCircle2,
  Target,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
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
  allUsers?: User[];
  onSelectUser?: (user: User) => void;
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
  allUsers,
  onSelectUser,
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
  const [manualUserId, setManualUserId] = useState<string>(currentUser.id);
  const [manualDate, setManualDate] = useState(toISODateString(new Date()));
  const [manualStartTime, setManualStartTime] = useState('09:00');
  const [manualEndTime, setManualEndTime] = useState('13:00');
  const [manualDurationHours, setManualDurationHours] = useState('4');
  const [manualUseTimeRange, setManualUseTimeRange] = useState(true);
  const [manualDescription, setManualDescription] = useState('');
  const [manualProjectInput, setManualProjectInput] = useState<string>(currentUser.area);

  // Sync manualUserId when currentUser changes
  React.useEffect(() => {
    setManualUserId(currentUser.id);
  }, [currentUser.id]);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('all');
  const [filterUser, setFilterUser] = useState('all');

  // Team profiles panel toggle, area filter, date selection & view mode
  const todayStr = toISODateString(new Date());
  const yesterdayStr = (() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return toISODateString(y);
  })();
  const [showTeamProfilesPanel, setShowTeamProfilesPanel] = useState(true);
  const [panelAreaFilter, setPanelAreaFilter] = useState('all');
  const [panelSelectedDate, setPanelSelectedDate] = useState<string>(todayStr);
  const [panelViewMode, setPanelViewMode] = useState<'day' | 'week'>('day');

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

  // List of all active users in the system
  const effectiveUsers = allUsers && allUsers.length > 0 ? allUsers : [currentUser];

  // Robust matcher: matches an entry by user ID, or by full name, or by first name
  const isUserEntry = (entry: TimeEntry, user: User): boolean => {
    if (entry.userId && user.id && entry.userId === user.id) return true;
    const entryName = (entry.userName || '').toLowerCase().trim();
    const targetName = (user.name || '').toLowerCase().trim();
    if (entryName && targetName) {
      if (entryName === targetName) return true;
      if (entryName.includes(targetName) || targetName.includes(entryName)) return true;
    }
    return false;
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

    const chosenUser = effectiveUsers.find((u) => u.id === manualUserId) || currentUser;

    onAddManualEntry({
      userId: chosenUser.id,
      userName: chosenUser.name,
      userArea: chosenUser.area,
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

  // Metrics calculation for Today (Current active user)
  const todayEntriesAll = entries.filter((e) => e.date === todayStr);
  const myTodayEntries = todayEntriesAll.filter((e) => isUserEntry(e, currentUser));
  const myTodayMinutes = myTodayEntries.reduce((acc, e) => acc + (e.durationMinutes || 0), 0);
  const myTodayHours = minutesToDecimalHours(myTodayMinutes);
  const dailyGoalHours = 2; // Meta de 2 horas x día (10h semanales)
  const myDailyProgress = Math.min(100, Math.round((myTodayHours / dailyGoalHours) * 100));
  const isMyGoalMet = myTodayHours >= dailyGoalHours;

  // Panel compliance calculation based on selected date & view mode (Day: 2h, Week: 10h)
  const panelMonday = getMondayOfWeek(panelSelectedDate);
  const panelWeekDays = getWeekDays(panelMonday);
  const panelMondayStr = toISODateString(panelMonday);
  const panelSundayStr = panelWeekDays[6].dateStr;
  const targetGoalHours = panelViewMode === 'day' ? 2 : 10;

  const filteredPanelEntries = entries.filter((e) => {
    if (panelViewMode === 'day') {
      return e.date === panelSelectedDate;
    }
    return e.date >= panelMondayStr && e.date <= panelSundayStr;
  });

  // Team profiles stats calculation
  const teamUsersTodayStats = effectiveUsers.map((u) => {
    const userEntries = filteredPanelEntries.filter((e) => isUserEntry(e, u));
    const userMinutes = userEntries.reduce((acc, e) => acc + (e.durationMinutes || 0), 0);
    const userHours = minutesToDecimalHours(userMinutes);
    const userProgress = Math.min(100, Math.round((userHours / targetGoalHours) * 100));
    const isGoalMet = userHours >= targetGoalHours;

    // Check if user currently has an unsaved running timer
    const isLiveActiveUser =
      timer.isRunning &&
      isUserEntry(
        { userId: currentUser.id, userName: currentUser.name } as TimeEntry,
        u
      );
    const runningLiveSeconds = isLiveActiveUser ? timer.elapsedSeconds : 0;

    return {
      user: u,
      entriesCount: userEntries.length,
      minutes: userMinutes,
      hours: userHours,
      progress: userProgress,
      isGoalMet,
      hasRunningTimer: isLiveActiveUser && runningLiveSeconds > 0,
      runningLiveSeconds,
    };
  });

  // Totales generales del equipo para la vista seleccionada
  const teamTotalTodayMinutes = filteredPanelEntries.reduce((acc, e) => acc + (e.durationMinutes || 0), 0);
  const teamTotalTodayHours = minutesToDecimalHours(teamTotalTodayMinutes);
  const usersCompletedGoalCount = teamUsersTodayStats.filter((s) => s.isGoalMet).length;

  // Perfiles filtrados para el panel de colaboradores
  const displayedProfiles = teamUsersTodayStats.filter((item) => {
    if (panelAreaFilter !== 'all' && item.user.area !== panelAreaFilter) return false;
    return true;
  });

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
    const matchesUser =
      filterUser === 'all' ||
      (filterUser === 'my_entries' && isUserEntry(entry, currentUser)) ||
      (effectiveUsers.find((u) => u.id === filterUser)
        ? isUserEntry(entry, effectiveUsers.find((u) => u.id === filterUser)!)
        : entry.userId === filterUser);
    return matchesSearch && matchesProject && matchesUser;
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
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#003F9B]/20 focus:border-[#003F9B]"
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
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#003F9B]/20 focus:border-[#003F9B]"
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
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-[#003F9B] hover:bg-[#00327D] shadow-md shadow-[#003F9B]/25 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Iniciar</span>
                  </button>
                ) : (
                  <>
                    {timer.isPaused ? (
                      <button
                        onClick={onResumeTimer}
                        className="p-2.5 rounded-lg text-white bg-[#003F9B] hover:bg-[#00327D] shadow-sm transition-colors cursor-pointer"
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
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-[#FF3282] hover:bg-[#E62870] shadow-md shadow-[#FF3282]/25 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
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
                      ? 'bg-[#003F9B]/10 dark:bg-[#003F9B]/30 border-[#003F9B]/50 text-[#003F9B] dark:text-blue-300 font-semibold'
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Colaborador / Perfil */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Colaborador / Perfil
              </label>
              <select
                value={manualUserId}
                onChange={(e) => {
                  const uid = e.target.value;
                  setManualUserId(uid);
                  const found = effectiveUsers.find((u) => u.id === uid);
                  if (found) {
                    setManualProjectInput(found.area);
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#003F9B]/20 focus:border-[#003F9B]"
              >
                {effectiveUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.area}) {u.id === currentUser.id ? '· (Tú)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha de Trabajo */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Fecha de Trabajo
              </label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#003F9B]/20 focus:border-[#003F9B]"
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
                      className="text-[10px] text-[#003F9B] dark:text-blue-400 hover:text-[#FF3282] hover:underline cursor-pointer"
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
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#003F9B]/20 focus:border-[#003F9B]"
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
                  className="text-[11px] text-[#003F9B] dark:text-blue-400 hover:text-[#FF3282] hover:underline cursor-pointer"
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
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#003F9B]/20 focus:border-[#003F9B]"
              />
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white bg-[#003F9B] hover:bg-[#00327D] shadow-md shadow-[#003F9B]/20 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Guardar Registro</span>
            </button>
          </div>
        </form>
      )}

      {/* Today's Productivity Highlights Bar (Separated for Current User Profile + Team Overview) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: My Hours Today */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold">Horas de Hoy ({currentUser.name})</span>
            <Clock className="w-4 h-4 text-[#003F9B] dark:text-[#60A5FA]" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-[#003F9B] dark:text-[#60A5FA]">
              {formatMinutesToHours(myTodayMinutes)}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({myTodayHours}h)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Total del equipo hoy: <strong className="font-mono text-[#5E47DF] dark:text-[#A78BFA]">{formatMinutesToHours(teamTotalTodayMinutes)}</strong> ({teamTotalTodayHours}h)
          </p>
        </div>

        {/* Card 2: My Daily Goal (2h) */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold">Mi Jornada Diaria (Meta 2h)</span>
            <Target className="w-4 h-4 text-[#FF3282]" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-2xl font-bold font-mono ${isMyGoalMet ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#FF3282] dark:text-[#FF66A3]'}`}>
              {myDailyProgress}%
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {myTodayHours}h de 2h {isMyGoalMet && '✓'}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isMyGoalMet
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-[#003F9B] via-[#5E47DF] to-[#FF3282]'
              }`}
              style={{ width: `${myDailyProgress}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            {isMyGoalMet
              ? 'Has completado tu meta diaria de 2 horas'
              : `Te faltan ${formatDurationHuman(Math.max(0, 120 - myTodayMinutes))} para cumplir la meta`}
          </p>
        </div>

        {/* Card 3: Team Goal Compliance */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold">Cumplimiento del Equipo Hoy</span>
            <Users className="w-4 h-4 text-[#5E47DF] dark:text-[#A78BFA]" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-[#5E47DF] dark:text-[#A78BFA]">
              {usersCompletedGoalCount} / {effectiveUsers.length}
            </span>
            <span className="text-xs text-slate-500">
              {usersCompletedGoalCount === 1 ? 'cumplió la meta' : 'cumplieron la meta'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowTeamProfilesPanel(!showTeamProfilesPanel)}
            className="w-full mt-2.5 py-1 px-2.5 text-xs font-medium rounded-lg bg-[#003F9B]/10 dark:bg-[#003F9B]/30 text-[#003F9B] dark:text-[#93C5FD] hover:bg-[#003F9B]/15 dark:hover:bg-[#003F9B]/40 flex items-center justify-between transition-colors cursor-pointer"
          >
            <span>{showTeamProfilesPanel ? 'Ocultar panel por perfil' : 'Ver panel por perfil (Meta 2h)'}</span>
            {showTeamProfilesPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PANEL DE CUMPLIMIENTO POR PERFIL (DÍA META 2H / SEMANA META 10H)          */}
      {/* ========================================================================= */}
      {showTeamProfilesPanel && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#003F9B] dark:text-[#60A5FA]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Panel de Cumplimiento por Perfil ({panelViewMode === 'day' ? 'Meta: 2h diarias' : 'Meta: 10h semanales'})
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {panelViewMode === 'day' ? (
                  <>
                    Fecha: <strong className="text-slate-700 dark:text-slate-300 capitalize">{formatDateSpanish(panelSelectedDate)}</strong>
                    {panelSelectedDate === todayStr ? ' (Hoy)' : panelSelectedDate === yesterdayStr ? ' (Ayer)' : ''} · Meta individual: 2 horas por día
                  </>
                ) : (
                  <>
                    Semana del <strong className="text-slate-700 dark:text-slate-300">{formatDateSpanish(panelMondayStr)}</strong> al <strong className="text-slate-700 dark:text-slate-300">{formatDateSpanish(panelSundayStr)}</strong> · Meta individual: 10 horas semanales
                  </>
                )}
              </p>
            </div>

            {/* Panel Controls: Mode Switch, Date Picker & Area Filter */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Day / Week Switcher */}
              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setPanelViewMode('day')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    panelViewMode === 'day'
                      ? 'bg-white dark:bg-slate-900 text-[#003F9B] dark:text-[#60A5FA] shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Día (2h)
                </button>
                <button
                  type="button"
                  onClick={() => setPanelViewMode('week')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    panelViewMode === 'week'
                      ? 'bg-white dark:bg-slate-900 text-[#003F9B] dark:text-[#60A5FA] shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Semana (10h)
                </button>
              </div>

              {/* Quick Date Buttons (when in day mode) */}
              {panelViewMode === 'day' && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPanelSelectedDate(todayStr)}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer border ${
                      panelSelectedDate === todayStr
                        ? 'bg-[#003F9B]/10 dark:bg-[#003F9B]/30 border-[#003F9B]/40 text-[#003F9B] dark:text-[#93C5FD] font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelSelectedDate(yesterdayStr)}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer border ${
                      panelSelectedDate === yesterdayStr
                        ? 'bg-[#003F9B]/10 dark:bg-[#003F9B]/30 border-[#003F9B]/40 text-[#003F9B] dark:text-[#93C5FD] font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    Ayer
                  </button>

                  <div className="relative flex items-center">
                    <input
                      type="date"
                      value={panelSelectedDate}
                      onChange={(e) => e.target.value && setPanelSelectedDate(e.target.value)}
                      title="Seleccionar otra fecha para revisar cumplimiento"
                      className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#003F9B]"
                    />
                  </div>
                </div>
              )}

              {/* Filter by area */}
              <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                {(['all', 'Marketing', 'RRHH', 'Sistemas', 'Administrador'] as const).map((area) => (
                  <button
                    key={area}
                    onClick={() => setPanelAreaFilter(area)}
                    className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                      panelAreaFilter === area
                        ? 'bg-[#003F9B] text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {area === 'all' ? 'Todos' : area}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grid of Profile Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {displayedProfiles.map((stat) => {
              const isCurrentUser = stat.user.id === currentUser.id;

              return (
                <div
                  key={stat.user.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCurrentUser
                      ? 'bg-[#003F9B]/5 dark:bg-[#003F9B]/20 border-[#003F9B]/40 dark:border-[#5E47DF]/50 ring-1 ring-[#003F9B]/20'
                      : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-[#5E47DF]/40'
                  }`}
                >
                  {/* Profile Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-[#003F9B] dark:text-[#93C5FD] flex items-center justify-center shrink-0">
                        {stat.user.name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block truncate">
                          {stat.user.name}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {stat.user.area} {isCurrentUser && '· (Tu perfil)'}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {stat.isGoalMet ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        {targetGoalHours}h cumplidas
                      </span>
                    ) : stat.hours > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-[#5E47DF]/10 dark:bg-[#5E47DF]/25 text-[#5E47DF] dark:text-[#C4B5FD] border border-[#5E47DF]/30 shrink-0">
                        <Clock className="w-3 h-3" />
                        {stat.progress}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-normal rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                        0h de {targetGoalHours}h
                      </span>
                    )}
                  </div>

                  {/* Hours & Progress */}
                  <div className="space-y-1.5 my-2.5">
                    <div className="flex items-baseline justify-between text-xs font-mono">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatDurationHuman(stat.minutes)}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {stat.hours}h de {targetGoalHours}h
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200/80 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          stat.isGoalMet
                            ? 'bg-emerald-500'
                            : stat.hours > 0
                            ? 'bg-gradient-to-r from-[#003F9B] via-[#5E47DF] to-[#FF3282]'
                            : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                        style={{ width: `${Math.min(100, stat.progress)}%` }}
                      />
                    </div>

                    {/* Notice if live timer is currently running for this user */}
                    {stat.hasRunningTimer && (
                      <div className="mt-1.5 px-2 py-1 rounded bg-[#FF3282]/10 dark:bg-[#FF3282]/20 border border-[#FF3282]/30 text-[10px] text-[#FF3282] dark:text-[#FF85B3] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF3282] shrink-0" />
                        <span>
                          +{formatDurationHuman(Math.floor(stat.runningLiveSeconds / 60), {
                            seconds: stat.runningLiveSeconds,
                            showSeconds: true,
                          })}{' '}
                          en temporizador (presiona Guardar para sumar)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer / Quick Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                    <span className="text-slate-500 text-[10px]">
                      {stat.entriesCount} {stat.entriesCount === 1 ? 'registro' : 'registros'}
                    </span>

                    <div className="flex items-center gap-2">
                      {onSelectUser && !isCurrentUser && (
                        <button
                          type="button"
                          onClick={() => onSelectUser(stat.user)}
                          className="text-[#003F9B] dark:text-[#60A5FA] hover:text-[#FF3282] hover:underline font-semibold cursor-pointer"
                          title={`Cambiar a usar el perfil de ${stat.user.name}`}
                        >
                          Usar perfil
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setFilterUser(stat.user.id)}
                        className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:underline cursor-pointer"
                        title={`Filtrar lista de tareas para ver solo a ${stat.user.name}`}
                      >
                        Ver tareas
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por tarea, colaborador o proyecto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#003F9B]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter by User */}
          <div className="flex items-center gap-1.5">
            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#003F9B]"
            >
              <option value="all">Todos los colaboradores ({effectiveUsers.length})</option>
              <option value="my_entries">Solo mis tareas ({currentUser.name})</option>
              <optgroup label="Filtrar por integrante">
                {effectiveUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.area})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Filter by Project */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#003F9B]"
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
                          <div className="text-right shrink-0">
                            <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 block">
                              {formatDurationHuman(entry.durationMinutes, {
                                seconds: entry.durationSeconds,
                                showSeconds: Boolean(entry.durationSeconds && entry.durationSeconds % 60 > 0),
                              })}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block">
                              ({(entry.durationMinutes / 60).toFixed(2)}h)
                            </span>
                          </div>

                          {/* Action icons */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleContinueEntry(entry)}
                              className="p-1.5 text-slate-400 hover:text-[#003F9B] dark:hover:text-[#60A5FA] rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
              <label className="block text-xs font-semibold text-slate-500 mb-1">Colaborador / Perfil</label>
              <select
                value={editingEntry.userId}
                onChange={(e) => {
                  const u = effectiveUsers.find((user) => user.id === e.target.value);
                  if (u) {
                    setEditingEntry({
                      ...editingEntry,
                      userId: u.id,
                      userName: u.name,
                      userArea: u.area,
                    });
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {effectiveUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.area})
                  </option>
                ))}
              </select>
            </div>

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
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Duración ({formatDurationHuman(editingEntry.durationMinutes)})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={editingEntry.durationMinutes}
                    onChange={(e) =>
                      setEditingEntry({
                        ...editingEntry,
                        durationMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono pr-16"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 pointer-events-none">
                    minutos
                  </span>
                </div>
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
                className="px-4 py-2 text-xs font-semibold text-white bg-[#003F9B] hover:bg-[#00327D] rounded-lg cursor-pointer shadow-sm transition-colors"
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
