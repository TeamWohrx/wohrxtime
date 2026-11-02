import React, { useState } from 'react';
import { DepartmentArea, Project, TimeEntry, Timesheet, TimesheetStatus, User } from '../../types';
import {
  formatDateSpanish,
  formatMinutesToHours,
  formatWeekRange,
  getMondayOfWeek,
  getWeekDays,
  minutesToDecimalHours,
  toISODateString,
} from '../../utils/timeUtils';
import {
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  MessageSquare,
  ShieldAlert,
  Users,
  FolderKanban,
  Eye,
  Check,
} from 'lucide-react';

interface TimesheetViewProps {
  entries: TimeEntry[];
  projects: Project[];
  timesheets: Timesheet[];
  currentUser: User;
  allUsers: User[];
  onSaveCellHours: (
    userId: string,
    projectName: string,
    dateStr: string,
    hours: number
  ) => void;
  onSubmitTimesheet: (timesheetId: string) => void;
  onApproveTimesheet: (timesheetId: string, reviewerName: string) => void;
  onRejectTimesheet: (timesheetId: string, feedbackNote: string) => void;
  onRevertToDraft: (timesheetId: string) => void;
}

const COMMON_AREAS: DepartmentArea[] = ['Sistemas', 'Marketing', 'RRHH', 'Administrador'];

export const TimesheetView: React.FC<TimesheetViewProps> = ({
  entries,
  projects,
  timesheets,
  currentUser,
  allUsers,
  onSaveCellHours,
  onSubmitTimesheet,
  onApproveTimesheet,
  onRejectTimesheet,
  onRevertToDraft,
}) => {
  // Mode: 'by_person' (Team Matrix with Daily Total per Person) vs 'by_project' (Individual Detailed Project Matrix)
  const [viewMode, setViewMode] = useState<'by_person' | 'by_project'>('by_person');

  // Active week reference (Monday)
  const [selectedMonday, setSelectedMonday] = useState<Date>(() =>
    getMondayOfWeek(new Date())
  );

  // Active member when in by_project mode
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);

  // Filter area for 'by_person' view
  const [filterTeamArea, setFilterTeamArea] = useState<string>('all');

  // Modal for rejection note
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState('');

  // Add project/area row state in by_project view
  const [showAddProjectRow, setShowAddProjectRow] = useState(false);
  const [newRowProjectInput, setNewRowProjectInput] = useState('');

  // Day detail modal (when clicking on a daily total in by_person view)
  const [inspectedDay, setInspectedDay] = useState<{
    user: User;
    dateStr: string;
    dayLabel: string;
    totalHours: number;
    entries: TimeEntry[];
  } | null>(null);

  const viewingUser = allUsers.find((u) => u.id === selectedUserId) || currentUser;
  const isAdmin = currentUser.role === 'admin';

  // Week days
  const weekDays = getWeekDays(selectedMonday);
  const mondayStr = toISODateString(selectedMonday);
  const sundayStr = weekDays[6].dateStr;

  // Filter entries for this entire week across all users
  const allWeekEntries = entries.filter((e) => {
    return e.date >= mondayStr && e.date <= sundayStr;
  });

  // Navigation handlers
  const handlePrevWeek = () => {
    const prev = new Date(selectedMonday);
    prev.setDate(prev.getDate() - 7);
    setSelectedMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(selectedMonday);
    next.setDate(next.getDate() + 7);
    setSelectedMonday(next);
  };

  const handleThisWeek = () => {
    setSelectedMonday(getMondayOfWeek(new Date()));
  };

  // --- DATA COMPUTATION FOR "BY PERSON" MATRIX ---
  // Filtered users for the team table
  const displayedUsers = allUsers.filter((u) => {
    if (filterTeamArea !== 'all' && u.area !== filterTeamArea) return false;
    return true;
  });

  // Calculate daily totals for each person
  // userDayMatrix: [userId_dateStr] -> hours
  const userDayTotals: Record<string, number> = {};
  const userWeekTotals: Record<string, number> = {};

  allUsers.forEach((u) => {
    userWeekTotals[u.id] = 0;
    weekDays.forEach((day) => {
      const userDayEntries = allWeekEntries.filter(
        (e) => e.userId === u.id && e.date === day.dateStr
      );
      const min = userDayEntries.reduce((acc, e) => acc + e.durationMinutes, 0);
      const hrs = minutesToDecimalHours(min);
      userDayTotals[`${u.id}_${day.dateStr}`] = hrs;
      userWeekTotals[u.id] += hrs;
    });
  });

  // Team daily totals (sum of all displayed members per day)
  const teamDailyTotals: Record<string, number> = {};
  weekDays.forEach((day) => {
    let daySum = 0;
    displayedUsers.forEach((u) => {
      daySum += userDayTotals[`${u.id}_${day.dateStr}`] || 0;
    });
    teamDailyTotals[day.dateStr] = Number(daySum.toFixed(1));
  });

  const teamTotalWeekHours = displayedUsers.reduce(
    (acc, u) => acc + (userWeekTotals[u.id] || 0),
    0
  );

  // --- DATA COMPUTATION FOR "BY PROJECT" INDIVIDUAL MATRIX ---
  const individualWeekEntries = allWeekEntries.filter((e) => e.userId === selectedUserId);

  const activeProjectNames = Array.from(
    new Set(individualWeekEntries.map((e) => e.projectName))
  );
  const [extraProjectNames, setExtraProjectNames] = useState<string[]>([]);

  const combinedProjectNames = Array.from(
    new Set([
      ...activeProjectNames,
      ...extraProjectNames,
      ...(activeProjectNames.length === 0 ? [viewingUser.area] : []),
    ])
  );

  const projectDayMatrix: Record<string, number> = {};
  individualWeekEntries.forEach((entry) => {
    const key = `${entry.projectName}_${entry.date}`;
    const hours = minutesToDecimalHours(entry.durationMinutes);
    projectDayMatrix[key] = (projectDayMatrix[key] || 0) + hours;
  });

  const individualDailyTotals: Record<string, number> = {};
  weekDays.forEach((day) => {
    const dayMin = individualWeekEntries
      .filter((e) => e.date === day.dateStr)
      .reduce((acc, e) => acc + e.durationMinutes, 0);
    individualDailyTotals[day.dateStr] = minutesToDecimalHours(dayMin);
  });

  const individualTotalWeekHours = Number(
    (userWeekTotals[selectedUserId] || 0).toFixed(1)
  );

  // Timesheet status for the individual selected user
  const timesheetId = `ts-${selectedUserId}-${mondayStr}`;
  const existingTimesheet = timesheets.find(
    (t) => t.userId === selectedUserId && t.weekStartDate === mondayStr
  );
  const timesheetStatus: TimesheetStatus = existingTimesheet ? existingTimesheet.status : 'draft';

  const isLocked = timesheetStatus === 'submitted' || timesheetStatus === 'approved';
  const canEditIndividual = !isLocked || isAdmin;

  const handleCellBlur = (projName: string, dateStr: string, rawVal: string) => {
    const hours = parseFloat(rawVal) || 0;
    if (hours < 0) return;
    onSaveCellHours(selectedUserId, projName, dateStr, hours);
  };

  const handleAddProjectRow = () => {
    const nameToAdd = newRowProjectInput.trim();
    if (!nameToAdd) return;
    if (!combinedProjectNames.includes(nameToAdd)) {
      setExtraProjectNames([...extraProjectNames, nameToAdd]);
    }
    setNewRowProjectInput('');
    setShowAddProjectRow(false);
  };

  const handleOpenDayDetail = (user: User, dateStr: string, dayLabel: string) => {
    const dayEntries = allWeekEntries.filter(
      (e) => e.userId === user.id && e.date === dateStr
    );
    const min = dayEntries.reduce((acc, e) => acc + e.durationMinutes, 0);
    setInspectedDay({
      user,
      dateStr,
      dayLabel,
      totalHours: minutesToDecimalHours(min),
      entries: dayEntries,
    });
  };

  // Switch to individual project breakdown for a user
  const handleDrilldownUser = (user: User) => {
    setSelectedUserId(user.id);
    setViewMode('by_project');
  };

  const targetHours = 40;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      {/* Top Header: Title & View Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Planillas de Horarios Semanales
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Mide el total diario y semanal por colaborador, o consulta el desglose por proyectos
          </p>
        </div>

        {/* Segmented Control: Por Persona vs Por Proyecto */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg self-start md:self-auto">
          <button
            onClick={() => setViewMode('by_person')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              viewMode === 'by_person'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Por Colaborador (Total Diario)</span>
          </button>

          <button
            onClick={() => setViewMode('by_project')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              viewMode === 'by_project'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Detalle por Proyectos</span>
          </button>
        </div>
      </div>

      {/* Week Navigator Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleThisWeek}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Esta semana
          </button>

          <button
            onClick={handleNextWeek}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Semana siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="ml-2">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
              {formatWeekRange(selectedMonday)}
            </span>
          </div>
        </div>

        {/* Secondary filters depending on view mode */}
        {viewMode === 'by_person' ? (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500">Filtrar por Área:</label>
            <select
              value={filterTeamArea}
              onChange={(e) => setFilterTeamArea(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            >
              <option value="all">Todas las áreas ({allUsers.length} personas)</option>
              <option value="Sistemas">Sistemas</option>
              <option value="Marketing">Marketing</option>
              <option value="RRHH">RRHH</option>
              <option value="Administrador">Administrador</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-500">Colaborador:</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.area})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: PLANILLA POR PERSONA (TOTAL DIARIO DE CADA COLABORADOR)         */}
      {/* ========================================================================= */}
      {viewMode === 'by_person' && (
        <div className="space-y-4">
          {/* Summary Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                Planilla General de Horas Diarias
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">
                Mostrando {displayedUsers.length} colaboradores
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-500">Total general de la semana:</span>
              <span className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {teamTotalWeekHours.toFixed(1)}h
              </span>
            </div>
          </div>

          {/* Team Daily Matrix Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    <th className="py-3 px-4 font-semibold w-56">Colaborador / Área</th>
                    {weekDays.map((day) => (
                      <th
                        key={day.dateStr}
                        className={`py-3 px-2 font-semibold text-center w-20 ${
                          day.isToday ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : ''
                        }`}
                      >
                        <div>{day.dayNameShort}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{day.dayNumber}</div>
                      </th>
                    ))}
                    <th className="py-3 px-4 font-semibold text-right w-24 bg-slate-100/50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100">
                      Total Semanal
                    </th>
                    <th className="py-3 px-3 text-center w-20">Detalle</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedUsers.map((user) => {
                    const userTotalWeek = userWeekTotals[user.id] || 0;
                    const weekProgress = Math.min(100, Math.round((userTotalWeek / targetHours) * 100));

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Person Name & Area */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {user.name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="truncate">
                              <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">
                                {user.name}
                              </span>
                              <span className="inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {user.area}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Daily Total per Person (Lun to Dom) */}
                        {weekDays.map((day) => {
                          const dayHours = userDayTotals[`${user.id}_${day.dateStr}`] || 0;
                          const isNormalShift = dayHours >= 8;
                          const isPartial = dayHours > 0 && dayHours < 8;

                          return (
                            <td
                              key={day.dateStr}
                              className={`p-1.5 text-center ${
                                day.isToday ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenDayDetail(
                                    user,
                                    day.dateStr,
                                    `${day.dayNameShort} ${day.dayNumber}`
                                  )
                                }
                                className={`w-full py-1.5 px-1 text-center font-mono text-xs font-semibold rounded transition-colors cursor-pointer ${
                                  dayHours === 0
                                    ? 'text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    : isNormalShift
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100'
                                }`}
                                title={`Ver tareas de ${user.name} el ${day.dayNameShort}: ${dayHours}h`}
                              >
                                {dayHours > 0 ? `${dayHours.toFixed(1)}h` : '-'}
                              </button>
                            </td>
                          );
                        })}

                        {/* Person Weekly Total */}
                        <td className="py-3 px-4 text-right bg-slate-50/30 dark:bg-slate-800/30">
                          <span
                            className={`font-mono font-bold text-xs ${
                              userTotalWeek >= 40
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : userTotalWeek > 0
                                ? 'text-slate-900 dark:text-slate-100'
                                : 'text-slate-400'
                            }`}
                          >
                            {userTotalWeek.toFixed(1)}h
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {weekProgress}% de 40h
                          </span>
                        </td>

                        {/* Action: Drilldown to individual project view */}
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleDrilldownUser(user)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={`Ver detalle por proyectos de ${user.name}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Footer with Total Diario del Equipo */}
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-200 dark:border-slate-800 font-bold">
                    <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                      Total Diario del Equipo:
                    </td>
                    {weekDays.map((day) => (
                      <td
                        key={day.dateStr}
                        className="py-3 px-2 text-center font-mono text-slate-900 dark:text-slate-100"
                      >
                        {(teamDailyTotals[day.dateStr] || 0).toFixed(1)}h
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right font-mono text-sm text-indigo-600 dark:text-indigo-400 bg-slate-100/60 dark:bg-slate-800/90">
                      {teamTotalWeekHours.toFixed(1)}h
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="p-3 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
              <span>
                💡 Haz clic en cualquier celda de horas para inspeccionar el detalle diario de tareas de cada colaborador.
              </span>
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Jornada completa (≥ 8h)
                </span>
                <span className="flex items-center gap-1 text-indigo-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  Jornada parcial
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: DETALLE INDIVIDUAL POR PROYECTOS / ÁREAS                          */}
      {/* ========================================================================= */}
      {viewMode === 'by_project' && (
        <div className="space-y-6">
          {/* Status & Approval Bar for Selected Member */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Planilla de {viewingUser.name}:</span>
              {timesheetStatus === 'approved' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Aprobada
                </span>
              )}
              {timesheetStatus === 'submitted' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <Clock className="w-3.5 h-3.5" />
                  Pendiente de Aprobación
                </span>
              )}
              {timesheetStatus === 'rejected' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  <XCircle className="w-3.5 h-3.5" />
                  Requiere Ajustes
                </span>
              )}
              {timesheetStatus === 'draft' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Borrador
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {timesheetStatus === 'draft' && (
                <button
                  onClick={() => onSubmitTimesheet(timesheetId)}
                  disabled={individualTotalWeekHours === 0}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white shadow-xs transition-colors cursor-pointer ${
                    individualTotalWeekHours === 0
                      ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar para Aprobación</span>
                </button>
              )}

              {isAdmin && timesheetStatus === 'submitted' && (
                <>
                  <button
                    onClick={() => onApproveTimesheet(timesheetId, currentUser.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Aprobar Planilla</span>
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Rechazar</span>
                  </button>
                </>
              )}

              {isAdmin && timesheetStatus === 'approved' && (
                <button
                  onClick={() => onRevertToDraft(timesheetId)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Revertir a Borrador
                </button>
              )}

              <button
                onClick={() => setViewMode('by_person')}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                Volver a Vista General
              </button>
            </div>
          </div>

          {/* Review Feedback Alert */}
          {existingTimesheet?.feedbackNote && (
            <div
              className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                timesheetStatus === 'approved'
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">
                  Observaciones de {existingTimesheet.reviewedBy || 'Administración'}:
                </span>
                <p>{existingTimesheet.feedbackNote}</p>
              </div>
            </div>
          )}

          {/* Weekly Progress Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Horas Semanales de {viewingUser.name}: {individualTotalWeekHours}h de 40h objetivo
              </span>
              <span className="font-mono text-slate-500">
                {Math.min(100, Math.round((individualTotalWeekHours / 40) * 100))}% cumplido
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.round((individualTotalWeekHours / 40) * 100))}%`,
                }}
              />
            </div>
          </div>

          {/* Matrix by Projects for Selected User */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    <th className="py-3 px-4 font-semibold w-64">Proyecto o Área</th>
                    {weekDays.map((day) => (
                      <th
                        key={day.dateStr}
                        className={`py-3 px-2 font-semibold text-center w-24 ${
                          day.isToday ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : ''
                        }`}
                      >
                        <div>{day.dayNameShort}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{day.dayNumber}</div>
                      </th>
                    ))}
                    <th className="py-3 px-4 font-semibold text-right w-28 bg-slate-100/50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {combinedProjectNames.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        <p className="font-medium">No hay filas agregadas para esta semana.</p>
                      </td>
                    </tr>
                  ) : (
                    combinedProjectNames.map((projName) => {
                      let rowTotalHours = 0;
                      const isArea = COMMON_AREAS.includes(projName as any);

                      return (
                        <tr
                          key={projName}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  isArea ? 'bg-indigo-600' : 'bg-emerald-500'
                                }`}
                              />
                              <div className="truncate">
                                <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">
                                  {projName}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {isArea ? 'Área institucional' : 'Proyecto'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {weekDays.map((day) => {
                            const key = `${projName}_${day.dateStr}`;
                            const currentVal = projectDayMatrix[key] || 0;
                            rowTotalHours += currentVal;

                            return (
                              <td
                                key={day.dateStr}
                                className={`p-1.5 text-center ${
                                  day.isToday ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                                }`}
                              >
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="24"
                                  defaultValue={currentVal > 0 ? currentVal : ''}
                                  key={`${key}-${currentVal}`}
                                  onBlur={(e) =>
                                    handleCellBlur(projName, day.dateStr, e.target.value)
                                  }
                                  disabled={!canEditIndividual}
                                  placeholder="0"
                                  className={`w-full py-1.5 text-center font-mono text-xs rounded border transition-colors ${
                                    currentVal > 0
                                      ? 'bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 font-bold text-slate-900 dark:text-slate-100'
                                      : 'bg-transparent border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-slate-400'
                                  } focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:outline-none`}
                                />
                              </td>
                            );
                          })}

                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-50/30 dark:bg-slate-800/30">
                            {rowTotalHours.toFixed(1)}h
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-200 dark:border-slate-800 font-bold">
                    <td className="py-3 px-4 text-slate-900 dark:text-slate-100">Total Diario:</td>
                    {weekDays.map((day) => (
                      <td
                        key={day.dateStr}
                        className="py-3 px-2 text-center font-mono text-slate-900 dark:text-slate-100"
                      >
                        {(individualDailyTotals[day.dateStr] || 0).toFixed(1)}h
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right font-mono text-sm text-indigo-600 dark:text-indigo-400 bg-slate-100/60 dark:bg-slate-800/90">
                      {individualTotalWeekHours.toFixed(1)}h
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {canEditIndividual && (
              <div className="p-3 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                {showAddProjectRow ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nombre del proyecto o área..."
                      value={newRowProjectInput}
                      onChange={(e) => setNewRowProjectInput(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg min-w-[240px]"
                    />
                    {COMMON_AREAS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setNewRowProjectInput(a)}
                        className="px-2 py-1 text-[11px] rounded bg-slate-200/70 dark:bg-slate-700 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer"
                      >
                        {a}
                      </button>
                    ))}
                    <button
                      onClick={handleAddProjectRow}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                    >
                      Agregar fila
                    </button>
                    <button
                      onClick={() => setShowAddProjectRow(false)}
                      className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddProjectRow(true)}
                    className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Agregar proyecto o área a esta planilla</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Day Details Inspection Modal */}
      {inspectedDay && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>{inspectedDay.user.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded font-normal bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {inspectedDay.user.area}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total del día ({formatDateSpanish(inspectedDay.dateStr)}):{' '}
                  <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {inspectedDay.totalHours}h
                  </span>
                </p>
              </div>

              <button
                onClick={() => setInspectedDay(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            {/* List of Tasks Done that Day */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {inspectedDay.entries.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No hay tareas registradas en este día.
                </p>
              ) : (
                inspectedDay.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                      <span>{entry.projectName}</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        {formatMinutesToHours(entry.durationMinutes)}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">{entry.description}</p>
                    {entry.startTime && entry.endTime && (
                      <p className="text-[11px] font-mono text-slate-400">
                        {entry.startTime} - {entry.endTime}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  const target = inspectedDay.user;
                  setInspectedDay(null);
                  handleDrilldownUser(target);
                }}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                Abrir planilla completa de {inspectedDay.user.name} →
              </button>

              <button
                type="button"
                onClick={() => setInspectedDay(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Solicitar Corrección de Horas
            </h3>
            <p className="text-xs text-slate-500">
              Indica al colaborador qué observaciones deben corregirse antes de aprobar la planilla.
            </p>

            <textarea
              rows={3}
              placeholder="Ej. Revisar horas imputadas el miércoles..."
              value={rejectFeedback}
              onChange={(e) => setRejectFeedback(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onRejectTimesheet(timesheetId, rejectFeedback.trim() || 'Ajustes solicitados por administración.');
                  setShowRejectModal(false);
                  setRejectFeedback('');
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Confirmar y Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
