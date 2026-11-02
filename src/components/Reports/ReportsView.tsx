import React, { useState } from 'react';
import { DateFilterPreset, DepartmentArea, Project, TimeEntry, User } from '../../types';
import {
  exportEntriesToCSV,
  exportEntriesToExcel,
} from '../../utils/exportUtils';
import {
  formatDateSpanish,
  getPresetDateRange,
  minutesToDecimalHours,
} from '../../utils/timeUtils';
import { PrintReportModal } from './PrintReportModal';
import {
  BarChart3,
  PieChart,
  FileSpreadsheet,
  FileText,
  Download,
  Filter,
  Calendar,
  Search,
  Clock,
  Briefcase,
  Users,
  Activity,
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
      if (filterUserId !== 'all' && e.userId !== filterUserId) return false;

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
            title="Descargar archivo CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => exportEntriesToExcel(filteredEntries, projects, `Reporte Productividad ${dateRangeLabel}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
            title="Descargar archivo Excel .xls"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exportar Excel (.xls)</span>
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            title="Generar reporte imprimible o guardar como PDF"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generar PDF / Imprimir</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
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
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-200/60 dark:border-slate-800">
            {preset === 'all'
              ? 'Historial Completo'
              : `Fechas: ${activeDateRange.start} al ${activeDateRange.end}`}
          </div>
        </div>

        {/* Boundary clarification when selecting "Este mes" on the first days of November */}
        {preset === 'this_month' && (
          <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2 rounded-lg border border-amber-200/70 dark:border-amber-900/50 flex flex-wrap items-center justify-between gap-2">
            <span>
              ℹ️ Filtro actual de <strong>Noviembre</strong> ({activeDateRange.start} a {activeDateRange.end}). Si buscas tareas del <strong>31 de Octubre</strong> (fin de semana anterior), selecciona <strong>"Esta semana"</strong> o <strong>"Todo el tiempo"</strong> para ver ambos días.
            </span>
            <button
              onClick={() => {
                setPreset('this_week');
                const r = getPresetDateRange('this_week');
                setCustomStart(r.start);
                setCustomEnd(r.end);
              }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
            >
              Ver Esta semana (26 Oct - 1 Nov) →
            </button>
          </div>
        )}

        {/* Custom date range inputs */}
        {preset === 'custom' && (
          <div className="flex items-center gap-3 pt-2 text-xs">
            <span className="text-slate-500 font-medium">Desde:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <span className="text-slate-500 font-medium">Hasta:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        )}

        {/* Secondary filters dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <label className="block text-slate-500 mb-1 font-medium">Filtrar por Área</label>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="all">Todas las áreas</option>
              <option value="Sistemas">Sistemas</option>
              <option value="Marketing">Marketing</option>
              <option value="RRHH">RRHH</option>
              <option value="Administrador">Administrador</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-medium">Colaborador ({allUsers.length})</label>
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
            <label className="block text-slate-500 mb-1 font-medium">Proyecto</label>
            <select
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Horas Totales</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {totalHours}h
          </p>
          <p className="text-xs text-slate-500 mt-1">
            En {filteredEntries.length} bloques de trabajo registrados
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Promedio Diario</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {averageHoursPerDay}h
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Calculado en {uniqueDates.length} días con registros
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Colaboradores Activos</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {activeMembersCount} / {allUsers.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Integrantes de Marketing, RRHH y Sistemas
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Proyectos con Avance</span>
            <Briefcase className="w-4 h-4 text-violet-500" />
          </div>
          <p className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {projectStats.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            De {projects.length} iniciativas activas
          </p>
        </div>
      </div>

      {/* Area Distribution Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {areaStats.map((item) => (
          <div
            key={item.area}
            className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                {item.area}
              </span>
              <span className="text-xs font-mono text-slate-500">
                {item.percentage}%
              </span>
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {item.hours}h
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {item.count} tareas registradas
            </p>
          </div>
        ))}
      </div>

      {/* Visual Charts: Bar Chart & Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Distribution Bar Chart (2 columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Evolución de Horas Trabajadas por Día
              </h3>
              <p className="text-xs text-slate-500">
                Carga horaria total registrada en el período
              </p>
            </div>
          </div>

          {dailyStats.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-slate-400 text-xs">
              No hay registros diarios para graficar en este rango
            </div>
          ) : (
            <div className="h-64 flex flex-col justify-end pt-4">
              <div className="flex-1 flex items-end gap-2 sm:gap-3 px-2 border-b border-slate-200 dark:border-slate-800">
                {dailyStats.map((stat, idx) => {
                  const dayHeight = (stat.hours / maxDayHours) * 100;

                  return (
                    <div
                      key={stat.dateStr}
                      className="flex-1 flex flex-col items-center group relative cursor-pointer"
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                    >
                      {/* Tooltip on hover */}
                      {hoveredBarIndex === idx && (
                        <div className="absolute -top-14 z-20 bg-slate-900 text-white text-[11px] py-1.5 px-2.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                          <p className="font-semibold">{formatDateSpanish(stat.dateStr)}</p>
                          <p className="text-indigo-300 font-mono font-bold">Total: {stat.hours}h</p>
                          <p className="text-slate-300 text-[10px]">{stat.count} tareas</p>
                        </div>
                      )}

                      {/* Bar */}
                      <div className="w-full max-w-[36px] flex flex-col items-center justify-end h-44">
                        <div
                          className="w-full bg-indigo-600 rounded-t-xs transition-all duration-200 group-hover:bg-indigo-500"
                          style={{ height: `${dayHeight}%` }}
                        />
                      </div>

                      {/* X-axis label */}
                      <span className="text-[10px] font-mono text-slate-500 mt-2 truncate w-full text-center">
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-1">
              <PieChart className="w-4 h-4 text-violet-600" />
              Distribución por Proyecto
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Porcentaje de dedicación horaria en el período
            </p>

            {projectStats.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
                Sin datos de proyecto
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
                    className="text-slate-100 dark:text-slate-800"
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
                  <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                    {totalHours}h
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Total</span>
                </div>
              </div>
            )}
          </div>

          {/* Project legend items */}
          <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
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
                <div className="flex items-center gap-2 font-mono shrink-0">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {item.hours}h
                  </span>
                  <span className="text-slate-400 text-[11px]">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Itemized Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Registro Detallado de Horas ({filteredEntries.length} entradas)
            </h3>
            <p className="text-xs text-slate-500">
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
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-4 font-semibold">Fecha</th>
                <th className="py-2.5 px-4 font-semibold">Colaborador</th>
                <th className="py-2.5 px-4 font-semibold">Área</th>
                <th className="py-2.5 px-4 font-semibold">Proyecto</th>
                <th className="py-2.5 px-4 font-semibold">Descripción de la Tarea</th>
                <th className="py-2.5 px-4 font-semibold text-center">Horario</th>
                <th className="py-2.5 px-4 font-semibold text-right">Horas Dedicadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No se encontraron registros de tiempo con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const proj = projects.find((p) => p.id === entry.projectId);
                  const hours = minutesToDecimalHours(entry.durationMinutes);

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDateSpanish(entry.date)}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {entry.userName}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {entry.userArea}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: proj?.color || '#94a3b8' }}
                          />
                          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
                            {proj?.name || entry.projectName || 'General'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 max-w-sm truncate">
                        {entry.description || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-slate-500 whitespace-nowrap">
                        {entry.startTime && entry.endTime ? `${entry.startTime} - ${entry.endTime}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {hours}h
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-200 dark:border-slate-800 font-bold">
                <td colSpan={6} className="py-3 px-4 text-right uppercase text-slate-600 dark:text-slate-400">
                  Total Horas Filtradas:
                </td>
                <td className="py-3 px-4 text-right font-mono text-indigo-600 dark:text-indigo-400 text-sm">
                  {totalHours}h
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
