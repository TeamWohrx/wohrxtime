import React, { useState } from 'react';
import { DateFilterPreset, DepartmentArea, Project, TimeEntry, User } from '../../types';
import {
  exportEntriesToCSV,
  exportEntriesToExcel,
} from '../../utils/exportUtils';
import {
  formatDateSpanish,
  formatDurationHuman,
  getPresetDateRange,
  minutesToDecimalHours,
} from '../../utils/timeUtils';
import { PrintReportModal } from './PrintReportModal';
import { getAreaStyle } from '../../utils/areaStyles';
import {
  BarChart3,
  PieChart,
  FileSpreadsheet,
  FileText,
  Download,
  Search,
  Clock,
  Briefcase,
  Users,
  Activity,
  RotateCcw,
} from 'lucide-react';

interface ReportsViewProps {
  entries: TimeEntry[];
  projects: Project[];
  currentUser: User;
  allUsers: User[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  entries,
  projects,
  currentUser,
  allUsers,
}) => {
  // Preset filter - Default to 'this_week' so activities spanning late October (31/10) and early November (01/11) are visible together
  const [preset, setPreset] = useState<DateFilterPreset>('this_week');
  const [customStart, setCustomStart] = useState(() => {
    const range = getPresetDateRange('this_week');
    return range.start;
  });
  const [customEnd, setCustomEnd] = useState(() => {
    const range = getPresetDateRange('this_week');
    return range.end;
  });

  // Secondary filters
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterUserId, setFilterUserId] = useState<string>('all');
  const [tableSearch, setTableSearch] = useState('');

  // Print modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Active hover tooltip for charts
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Active date range
  const activeDateRange = React.useMemo(() => {
    if (preset === 'custom') {
      return { start: customStart, end: customEnd };
    }
    return getPresetDateRange(preset);
  }, [preset, customStart, customEnd]);

  // Filter entries
  const filteredEntries = React.useMemo(() => {
    return entries.filter((e) => {
      // Date filter
      if (preset !== 'all') {
        if (e.date < activeDateRange.start || e.date > activeDateRange.end) return false;
      }
      // Project
      if (filterProjectId !== 'all' && e.projectId !== filterProjectId) return false;
      // Area
      if (filterArea !== 'all' && e.userArea !== filterArea) return false;
      // User
      if (filterUserId !== 'all') {
        const targetUser = allUsers.find((u) => u.id === filterUserId);
        const matchesId = e.userId === filterUserId;
        const matchesName =
          targetUser &&
          e.userName &&
          e.userName.toLowerCase().trim() === targetUser.name.toLowerCase().trim();
        if (!matchesId && !matchesName) return false;
      }

      // Table search
      if (tableSearch) {
        const query = tableSearch.toLowerCase();
        const matchesDesc = e.description.toLowerCase().includes(query);
        const matchesUser = e.userName.toLowerCase().includes(query);
        const matchesProj = (e.projectName || '').toLowerCase().includes(query);
        if (!matchesDesc && !matchesUser && !matchesProj) return false;
      }

      return true;
    });
  }, [
    entries,
    preset,
    activeDateRange,
    filterProjectId,
    filterArea,
    filterUserId,
    tableSearch,
  ]);

  // Aggregate Metrics (Zero monetary metrics)
  const totalMinutes = filteredEntries.reduce((acc, e) => acc + e.durationMinutes, 0);
  const totalHours = minutesToDecimalHours(totalMinutes);

  // Unique active days
  const uniqueDates = Array.from(new Set(filteredEntries.map((e) => e.date)));
  const averageHoursPerDay = uniqueDates.length > 0 ? (totalHours / uniqueDates.length).toFixed(1) : '0';

  // Active members count
  const activeMembersCount = Array.from(new Set(filteredEntries.map((e) => e.userId))).length;

  // Group by project for donut & breakdown
  const projectStats = React.useMemo(() => {
    return projects
      .map((proj) => {
        const projEntries = filteredEntries.filter((e) => e.projectId === proj.id);
        const projMinutes = projEntries.reduce((acc, e) => acc + e.durationMinutes, 0);
        const projHours = minutesToDecimalHours(projMinutes);
        const percentage = totalHours > 0 ? Math.round((projHours / totalHours) * 100) : 0;

        return {
          project: proj,
          minutes: projMinutes,
          hours: projHours,
          percentage,
          count: projEntries.length,
        };
      })
      .filter((item) => item.hours > 0)
      .sort((a, b) => b.hours - a.hours);
  }, [projects, filteredEntries, totalHours]);

  // Group by Area
  const areaStats = React.useMemo(() => {
    const areas: DepartmentArea[] = ['Sistemas', 'Marketing', 'RRHH', 'Administrador'];
    return areas
      .map((areaName) => {
        const areaEntries = filteredEntries.filter((e) => e.userArea === areaName);
        const min = areaEntries.reduce((acc, e) => acc + e.durationMinutes, 0);
        const hrs = minutesToDecimalHours(min);
        const pct = totalHours > 0 ? Math.round((hrs / totalHours) * 100) : 0;
        return {
          area: areaName,
          minutes: min,
          hours: hrs,
          percentage: pct,
          count: areaEntries.length,
        };
      })
      .filter((a) => a.hours > 0);
  }, [filteredEntries, totalHours]);

  // Group by Day for Bar Chart
  const dailyStats = React.useMemo(() => {
    const datesMap: Record<string, { dateStr: string; hours: number; count: number }> = {};

    filteredEntries.forEach((entry) => {
      if (!datesMap[entry.date]) {
        datesMap[entry.date] = { dateStr: entry.date, hours: 0, count: 0 };
      }
      datesMap[entry.date].hours += minutesToDecimalHours(entry.durationMinutes);
      datesMap[entry.date].count += 1;
    });

    return Object.values(datesMap).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [filteredEntries]);

  // Max daily hours for bar chart scaling
  const maxDayHours = Math.max(8, ...dailyStats.map((d) => d.hours));

  // Date range label for exports and prints
  const dateRangeLabel =
    preset === 'this_week'
      ? 'Esta semana'
      : preset === 'last_week'
      ? 'Semana pasada'
      : preset === 'this_month'
      ? 'Este mes'
      : preset === 'last_month'
      ? 'Último mes'
      : preset === 'all'
      ? 'Historial Completo'
      : `${customStart} a ${customEnd}`;

  // Donut SVG parameters
  const donutRadius = 70;
  const donutStrokeWidth = 26;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let accumulatedAngle = 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      {/* Header & Export Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#141313] dark:text-[#FFFAF8]">
            Informes de Productividad y Horas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Análisis de distribución horaria por áreas, proyectos y colaboradores
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportEntriesToCSV(filteredEntries, projects)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1B1A20] border border-[#E3E8F2] dark:border-white/10 rounded-lg hover:bg-[#F8FAFD] dark:hover:bg-[#222128] transition-colors shadow-2xs cursor-pointer"
            title="Descargar archivo CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => exportEntriesToExcel(filteredEntries, projects, `Reporte Productividad ${dateRangeLabel}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1B1A20] border border-[#E3E8F2] dark:border-white/10 rounded-lg hover:bg-[#F8FAFD] dark:hover:bg-[#222128] transition-colors shadow-2xs cursor-pointer"
            title="Descargar archivo Excel .xls"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exportar Excel (.xls)</span>
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#003F9B] hover:bg-[#00327D] rounded-lg shadow-sm transition-colors cursor-pointer"
            title="Generar reporte imprimible o guardar como PDF"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generar PDF / Imprimir</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Panel */}
      <div className="bg-white dark:bg-[#1B1A20] border border-[#E3E8F2] dark:border-white/10 rounded-xl p-4 shadow-xs space-y-3">
        {/* Date presets row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-2">
              Período:
            </span>
            {(
              [
                ['this_week', 'Esta semana'],
                ['last_week', 'Semana pasada'],
                ['this_month', 'Este mes'],
                ['last_month', 'Último mes'],
                ['all', 'Todo el tiempo'],
                ['custom', 'Personalizado'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setPreset(key);
                  if (key !== 'custom' && key !== 'all') {
                    const r = getPresetDateRange(key);
                    setCustomStart(r.start);
                    setCustomEnd(r.end);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  preset === key
                    ? 'bg-[#003F9B]/10 dark:bg-[#003F9B]/30 text-[#003F9B] dark:text-blue-300 border border-[#003F9B]/30 font-semibold'
                    : 'bg-[#F8FAFD] dark:bg-[#222128] text-slate-600 dark:text-slate-400 hover:text-[#141313] dark:hover:text-[#FFFAF8] border border-transparent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 bg-[#F8FAFD] dark:bg-[#222128] px-2.5 py-1 rounded-md border border-[#E3E8F2] dark:border-white/10">
            {preset === 'all'
              ? 'Historial Completo'
              : `Fechas: ${activeDateRange.start} al ${activeDateRange.end}`}
          </div>
        </div>

        {/* Boundary clarification when selecting "Este mes" on the first days of November */}
        {preset === 'this_month' && (
          <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2 rounded-lg border border-amber-200/70 dark:border-amber-900/50 flex flex-wrap items-center justify-between gap-2">
            <span>
              Filtro actual de <strong>Noviembre</strong> ({activeDateRange.start} a {activeDateRange.end}). Si buscas tareas del <strong>31 de Octubre</strong> (fin de semana anterior), selecciona <strong>"Esta semana"</strong> o <strong>"Todo el tiempo"</strong> para ver ambos días.
            </span>
            <button
              onClick={() => {
                setPreset('this_week');
                const r = getPresetDateRange('this_week');
                setCustomStart(r.start);
                setCustomEnd(r.end);
              }}
              className="text-[#003F9B] dark:text-blue-400 hover:text-[#FF3282] hover:underline font-semibold cursor-pointer"
            >
              Ver Esta semana →
            </button>
          </div>
        )}

        {/* Custom date range inputs */}
        {preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
            <span className="text-slate-500 font-medium">Desde:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[#E3E8F2] dark:border-white/10 bg-[#F8FAFD] dark:bg-[#222128] text-[#141313] dark:text-[#FFFAF8]"
            />
            <span className="text-slate-500 font-medium">Hasta:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[#E3E8F2] dark:border-white/10 bg-[#F8FAFD] dark:bg-[#222128] text-[#141313] dark:text-[#FFFAF8]"
            />
          </div>
        )}

        {/* Secondary filters dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E3E8F2] dark:border-white/10 text-xs">
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">Filtrar por Área</label>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#E3E8F2] dark:border-white/10 bg-[#F8FAFD] dark:bg-[#222128] text-[#141313] dark:text-[#FFFAF8]"
            >
              <option value="all">Todas las áreas</option>
              <option value="Sistemas">Sistemas</option>
              <option value="Marketing">Marketing</option>
              <option value="RRHH">RRHH</option>
              <option value="Administrador">Administrador</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">Colaborador ({allUsers.length})</label>
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#E3E8F2] dark:border-white/10 bg-[#F8FAFD] dark:bg-[#222128] text-[#141313] dark:text-[#FFFAF8]"
            >
              <option value="all">Todo el equipo</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.area})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">Proyecto</label>
            <select
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#E3E8F2] dark:border-white/10 bg-[#F8FAFD] dark:bg-[#222128] text-[#141313] dark:text-[#FFFAF8]"
            >
              <option value="all">Todos los proyectos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.area})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid (Zero billing, pure time & productivity) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-[#1B1A20] border border-[#E3E8F2] dark:border-white/10 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Horas Totales</span>
            <div className="w-8 h-8 rounded-lg bg-[#003F9B]/10 dark:bg-[#003F9B]/25 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-[#003F9B] dark:text-[#60A5FA]" />
            </div>
          </div>
          <p className="text-3xl font-bold font-mono tabular-nums text-[#141313] dark:text-[#FFFAF8]">
            {formatDurationHuman(totalMinutes)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            {totalHours}h decimales en {filteredEntries.length} bloques de trabajo
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1B1A20] border border-[#E3E8F2] dark:border-white/10 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Promedio Diario</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <p className="text-3xl font-bold font-mono tabular-nums text-[#003F9B] dark:text-blue-400">
            {averageHoursPerDay}h
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Calculado en {uniqueDates.length} días con registros
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1B1A20] border border-[#E3E8F2] dark:border-white/10 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Colaboradores Activos</span>
            <div className="w-8 h-8 rounded-lg bg-[#FF3282]/10 dark:bg-[#FF3282]/20 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-[#FF3282]" />
            </div>
          </div>
          <p className="text-3xl font-bold font-mono tabular-nums text-[#141313] dark:text-[#FFFAF8]">
            {activeMembersCount} / {allUsers.length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Integrantes de Marketing, RRHH y Sistemas
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1B1A20] border border-[#E3E8F2] dark:border-white/10 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Proyectos con Avance</span>
            <div className="w-8 h-8 rounded-lg bg-[#5E47DF]/10 dark:bg-[#5E47DF]/25 flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4 text-[#5E47DF] dark:text-[#A78BFA]" />
            </div>
          </div>
          <p className="text-3xl font-bold font-mono tabular-nums text-[#141313] dark:text-[#FFFAF8]">
            {projectStats.length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            De {projects.length} iniciativas activas
          </p>
        </div>
      </div>

      {/* Area Distribution Overview Cards */}
      {areaStats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {areaStats.map((item) => {
            const areaStyle = getAreaStyle(item.area);
            return (
              <div
                key={item.area}
                className="relative overflow-hidden p-4 bg-white dark:bg-[#1B1A20] border border-[#E3E8F2] dark:border-white/10 rounded-xl shadow-xs"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 ${areaStyle.barClass}`} />
                <div className="flex items-center justify-between mb-1 pt-0.5">
                  <span className={`text-xs font-bold uppercase tracking-wide ${areaStyle.labelClass}`}>
                    {item.area}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {item.percentage}%
                  </span>
                </div>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#141313] dark:text-[#FFFAF8]">
                  {formatDurationHuman(item.minutes)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono tabular-nums">
                  {item.hours}h · {item.count} tareas registradas
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Visual Charts: Bar Chart & Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Distribution Bar Chart (2 columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1B1A20] border border-[#E3E8F2] dark:border-white/10 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-[#141313] dark:text-[#FFFAF8] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#003F9B]" />
                Evolución de Horas Trabajadas por Día
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Carga horaria total registrada en el período
              </p>
            </div>
          </div>

          {dailyStats.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center px-4">
              <div className="w-10 h-10 rounded-full bg-[#F8FAFD] dark:bg-[#222128] flex items-center justify-center mb-2">
                <BarChart3 className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                No hay registros diarios para graficar en este rango
              </p>
              {(filterArea !== 'all' || filterUserId !== 'all' || filterProjectId !== 'all' || preset !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setPreset('all');
                    setFilterArea('all');
                    setFilterUserId('all');
                    setFilterProjectId('all');
                    setTableSearch('');
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#003F9B] dark:text-blue-400 hover:text-[#FF3282] cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Ver historial completo
                </button>
              )}
            </div>
          ) : (
            <div className="h-64 flex flex-col justify-end pt-4 relative">
              {/* Subtle horizontal dashed gridlines */}
              <div className="absolute inset-x-2 top-8 bottom-8 flex flex-col justify-between pointer-events-none">
                <div className="border-b border-dashed border-[#E3E8F2] dark:border-white/10 w-full" />
                <div className="border-b border-dashed border-[#E3E8F2] dark:border-white/10 w-full" />
                <div className="border-b border-dashed border-[#E3E8F2] dark:border-white/10 w-full" />
              </div>

              <div className="flex-1 flex items-end gap-2 sm:gap-3 px-2 border-b border-[#E3E8F2] dark:border-white/10 relative z-10">
                {dailyStats.map((stat, idx) => {
                  const dayHeight = Math.max(4, (stat.hours / maxDayHours) * 100);

                  return (
                    <div
                      key={stat.dateStr}
                      className="flex-1 flex flex-col items-center group relative cursor-pointer"
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                    >
                      {/* Tooltip on hover */}
                      {hoveredBarIndex === idx && (
                        <div className="absolute -top-14 z-20 bg-[#141313] text-white text-[11px] py-1.5 px-2.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none border border-[#FF3282]/30">
                          <p className="font-semibold">{formatDateSpanish(stat.dateStr)}</p>
                          <p className="text-[#FF3282] font-mono tabular-nums font-bold">Total: {stat.hours}h</p>
                          <p className="text-slate-300 text-[10px]">{stat.count} tareas</p>
                        </div>
                      )}

                      {/* Bar */}
                      <div className="w-full max-w-[36px] flex flex-col items-center justify-end h-44">
                        <div
                          className="w-full bg-gradient-to-t from-[#003F9B] to-[#5E47DF] rounded-t-sm transition-all duration-200 group-hover:from-[#FF3282] group-hover:to-[#FF3282]"
                          style={{ height: `${dayHeight}%` }}
                        />
                      </div>

                      {/* X-axis label */}
                      <span className="text-[10px] font-mono tabular-nums text-slate-500 mt-2 truncate w-full text-center">
                        {formatDateSpanish(stat.dateStr).slice(0, 3)} {stat.dateStr.slice(8, 10)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Donut Chart: Hours by Project (1 column) */}
        <div className="bg-white dark:bg-[#1B1A20] border border-[#E3E8F2] dark:border-white/10 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-[#141313] dark:text-[#FFFAF8] flex items-center gap-2 mb-1">
              <PieChart className="w-4 h-4 text-[#5E47DF]" />
              Distribución por Proyecto
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Porcentaje de dedicación horaria en el período
            </p>

            {projectStats.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs text-center">
                <PieChart className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1.5" />
                <span>Sin datos de proyecto en este rango</span>
              </div>
            ) : (
              <div className="relative flex justify-center items-center py-2">
                <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
                  {/* Background track circle */}
                  <circle
                    cx="90"
                    cy="90"
                    r={donutRadius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={donutStrokeWidth}
                    className="text-[#EEF2F9] dark:text-white/10"
                  />
                  {/* Slices */}
                  {projectStats.map((item) => {
                    const strokeDasharray = `${(item.hours / (totalHours || 1)) * donutCircumference} ${donutCircumference}`;
                    const strokeDashoffset = -accumulatedAngle;
                    accumulatedAngle += (item.hours / (totalHours || 1)) * donutCircumference;

                    return (
                      <circle
                        key={item.project.id}
                        cx="90"
                        cy="90"
                        r={donutRadius}
                        fill="transparent"
                        stroke={item.project.color}
                        strokeWidth={donutStrokeWidth}
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-300"
                      />
                    );
                  })}
                </svg>

                {/* Donut center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold font-mono tabular-nums text-[#141313] dark:text-[#FFFAF8] text-center px-1">
                    {formatDurationHuman(totalMinutes)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium font-mono tabular-nums">
                    Total ({totalHours}h)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Project legend items */}
          <div className="space-y-2 pt-4 border-t border-[#E3E8F2] dark:border-white/10 text-xs">
            {projectStats.slice(0, 5).map((item) => (
              <div key={item.project.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.project.color }}
                  />
                  <span className="text-slate-700 dark:text-slate-300 truncate">
                    {item.project.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                  <span className="font-semibold text-[#141313] dark:text-[#FFFAF8]">
                    {formatDurationHuman(item.minutes)}
                  </span>
                  <span className="text-slate-400 text-[11px]">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Itemized Audit Log Table */}
      <div className="bg-white dark:bg-[#1B1A20] border border-[#E3E8F2] dark:border-white/10 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 bg-[#F8FAFD] dark:bg-[#222128] border-b border-[#E3E8F2] dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-[#141313] dark:text-[#FFFAF8]">
              Registro Detallado de Horas ({filteredEntries.length} entradas)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Desglose de cada bloque de tiempo registrado para el filtro seleccionado
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar tarea, colaborador o proyecto..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#1B1A20] border border-[#E3E8F2] dark:border-white/10 rounded-lg text-[#141313] dark:text-[#FFFAF8] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003F9B]/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#F8FAFD]/70 dark:bg-[#222128]/60 text-slate-500 dark:text-slate-400 border-b border-[#E3E8F2] dark:border-white/10">
                <th className="py-2.5 px-4 font-semibold">Fecha</th>
                <th className="py-2.5 px-4 font-semibold">Colaborador</th>
                <th className="py-2.5 px-4 font-semibold">Área</th>
                <th className="py-2.5 px-4 font-semibold">Proyecto</th>
                <th className="py-2.5 px-4 font-semibold">Descripción de la Tarea</th>
                <th className="py-2.5 px-4 font-semibold text-center">Horario</th>
                <th className="py-2.5 px-4 font-semibold text-right">Tiempo Dedicado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8F2]/70 dark:divide-white/5">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 dark:text-slate-400">
                    <p className="font-medium mb-2">
                      No se encontraron registros de tiempo con los filtros aplicados.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setPreset('all');
                        setFilterArea('all');
                        setFilterUserId('all');
                        setFilterProjectId('all');
                        setTableSearch('');
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#003F9B] dark:text-blue-400 hover:text-[#FF3282] cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restablecer filtros
                    </button>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const proj = projects.find((p) => p.id === entry.projectId);
                  const hours = minutesToDecimalHours(entry.durationMinutes);
                  const areaStyle = getAreaStyle(entry.userArea);

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-[#F8FAFD] dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDateSpanish(entry.date)}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-[#141313] dark:text-[#FFFAF8] whitespace-nowrap">
                        {entry.userName}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={`text-[11px] font-semibold ${areaStyle.labelClass}`}>
                          {entry.userArea}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: proj?.color || '#94a3b8' }}
                          />
                          <span className="font-semibold text-[#141313] dark:text-[#FFFAF8] truncate max-w-[160px]">
                            {proj?.name || entry.projectName || 'General'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 max-w-sm truncate">
                        {entry.description || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {entry.startTime && entry.endTime ? `${entry.startTime} - ${entry.endTime}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-[#141313] dark:text-[#FFFAF8]">
                            {formatDurationHuman(entry.durationMinutes, {
                              seconds: entry.durationSeconds,
                              showSeconds: Boolean(entry.durationSeconds && entry.durationSeconds % 60 > 0),
                            })}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                            ({hours}h)
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#F8FAFD] dark:bg-[#222128] border-t-2 border-[#E3E8F2] dark:border-white/10 font-bold">
                <td colSpan={6} className="py-3 px-4 text-right uppercase text-slate-600 dark:text-slate-400">
                  Total Tiempo Acumulado:
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-[#003F9B] dark:text-blue-400 text-sm">
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-sm">
                      {formatDurationHuman(totalMinutes)}
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      ({totalHours}h)
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Printable Report Modal */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        entries={filteredEntries}
        projects={projects}
        currentUser={currentUser}
        dateRangeLabel={dateRangeLabel}
      />
    </div>
  );
};
