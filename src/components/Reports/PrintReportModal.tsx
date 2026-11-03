import React from 'react';
import { Project, TimeEntry, User } from '../../types';
import { formatDateSpanish, formatDurationHuman, minutesToDecimalHours } from '../../utils/timeUtils';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: TimeEntry[];
  projects: Project[];
  currentUser: User;
  dateRangeLabel: string;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  entries,
  projects,
  currentUser,
  dateRangeLabel,
}) => {
  if (!isOpen) return null;

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  // Totals
  const totalMinutes = entries.reduce((acc, e) => acc + e.durationMinutes, 0);
  const totalHours = minutesToDecimalHours(totalMinutes);

  // Group by project
  const projectBreakdown = projects
    .map((proj) => {
      const projEntries = entries.filter((e) => e.projectId === proj.id);
      const projMin = projEntries.reduce((acc, e) => acc + e.durationMinutes, 0);
      const projHours = minutesToDecimalHours(projMin);
      return {
        project: proj,
        entriesCount: projEntries.length,
        minutes: projMin,
        hours: projHours,
      };
    })
    .filter((item) => item.hours > 0);

  // Group by Area
  const areaBreakdown = ['Sistemas', 'Marketing', 'RRHH', 'Administrador'].map((areaName) => {
    const areaEntries = entries.filter((e) => e.userArea === areaName);
    const min = areaEntries.reduce((acc, e) => acc + e.durationMinutes, 0);
    return {
      area: areaName,
      minutes: min,
      hours: minutesToDecimalHours(min),
      count: areaEntries.length,
    };
  }).filter((a) => a.hours > 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        {/* Modal Controls Bar (hidden during printing) */}
        <div className="no-print flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Vista Previa de Informe de Horas y Productividad
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir o Guardar como PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="p-8 sm:p-12 text-slate-900 print:text-black print:p-0">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                  W
                </div>
                <span className="text-2xl font-bold tracking-tight text-slate-950">Wohrxtime</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Reporte de Horas Trabajadas y Control de Gestión Interna
              </p>
              <p className="text-xs text-slate-500">Documento ID: WX-HORAS-{Date.now().toString().slice(-6)}</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 text-xs font-semibold rounded-md uppercase tracking-wider mb-2">
                Planilla Validada
              </span>
              <p className="text-sm font-semibold text-slate-900">Período: {dateRangeLabel}</p>
              <p className="text-xs text-slate-500">
                Fecha de Emisión: {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* User / Responsible Info */}
          <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 border border-slate-200 rounded-lg mb-8">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Generado por
              </span>
              <p className="text-base font-bold text-slate-900">{currentUser.name}</p>
              <p className="text-xs text-indigo-600 font-semibold mt-0.5">Área: {currentUser.area}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Estado del Control
              </span>
              <div className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Registros de Tiempo Auditados
              </div>
              <p className="text-xs text-slate-500 mt-1">Supervisión: Mario Tabares (Administrador)</p>
            </div>
          </div>

          {/* KPI Summary Boxes (Zero billing, pure hours) */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 border border-slate-200 rounded-lg bg-white">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Total Tiempo Dedicado</p>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{formatDurationHuman(totalMinutes)}</p>
              <p className="text-[11px] text-slate-500 font-mono">({totalHours}h decimales)</p>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg bg-white">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Bloques de Trabajo</p>
              <p className="text-2xl font-bold font-mono text-indigo-600 mt-1">{entries.length}</p>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg bg-white">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Proyectos con Actividad</p>
              <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                {projectBreakdown.length}
              </p>
            </div>
          </div>

          {/* Area Summary Breakdown */}
          <div className="mb-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3 border-b border-slate-200 pb-2">
              Horas Acumuladas por Área
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {areaBreakdown.map((item) => (
                <div key={item.area} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase font-semibold">{item.area}</p>
                  <p className="text-lg font-bold font-mono text-slate-900 mt-1">{formatDurationHuman(item.minutes)}</p>
                  <p className="text-[11px] text-slate-400">{item.hours}h · {item.count} tareas</p>
                </div>
              ))}
            </div>
          </div>

          {/* Project Summary Breakdown */}
          <div className="mb-8">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3 border-b border-slate-200 pb-2">
              Horas por Proyecto
            </h4>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                  <th className="py-2 px-3 font-semibold">Proyecto</th>
                  <th className="py-2 px-3 font-semibold">Área</th>
                  <th className="py-2 px-3 font-semibold text-center">Registros</th>
                  <th className="py-2 px-3 font-semibold text-right">Tiempo Dedicado</th>
                  <th className="py-2 px-3 font-semibold text-right">% del Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectBreakdown.map((item) => (
                  <tr key={item.project.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-medium text-slate-900 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.project.color }}
                      />
                      {item.project.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{item.project.area}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{item.entriesCount}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium">
                      {formatDurationHuman(item.minutes)} <span className="text-slate-400 font-normal text-[11px]">({item.hours}h)</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {totalHours > 0 ? Math.round((item.hours / totalHours) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Itemized Entries Log */}
          <div className="mb-10">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3 border-b border-slate-200 pb-2">
              Registro Detallado de Actividades
            </h4>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                  <th className="py-2 px-3 font-semibold">Fecha</th>
                  <th className="py-2 px-3 font-semibold">Colaborador</th>
                  <th className="py-2 px-3 font-semibold">Área</th>
                  <th className="py-2 px-3 font-semibold">Proyecto</th>
                  <th className="py-2 px-3 font-semibold">Descripción del Trabajo</th>
                  <th className="py-2 px-3 font-semibold text-right">Tiempo Dedicado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => {
                  const proj = projectMap.get(entry.projectId);
                  const hours = minutesToDecimalHours(entry.durationMinutes);
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50 print-break-inside-avoid">
                      <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {formatDateSpanish(entry.date)}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800 whitespace-nowrap">
                        {entry.userName}
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {entry.userArea}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800 whitespace-nowrap">
                        {proj ? proj.name : entry.projectName || 'General'}
                      </td>
                      <td className="py-2 px-3 text-slate-700 max-w-xs">{entry.description || '-'}</td>
                      <td className="py-2 px-3 text-right font-mono font-medium">
                        <div>
                          {formatDurationHuman(entry.durationMinutes, {
                            seconds: entry.durationSeconds,
                            showSeconds: Boolean(entry.durationSeconds && entry.durationSeconds % 60 > 0),
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">({hours}h)</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 font-bold bg-slate-50">
                  <td colSpan={5} className="py-3 px-3 text-right uppercase">
                    Total Tiempo Acumulado:
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-indigo-700">
                    <div>{formatDurationHuman(totalMinutes)}</div>
                    <div className="text-xs text-slate-500 font-normal">({totalHours}h)</div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signatures & Approvals Section */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-12 print-break-inside-avoid">
            <div>
              <div className="h-14 border-b border-dashed border-slate-300 flex items-end pb-1">
                <span className="text-xs font-mono text-slate-400 italic">
                  Firma del Responsable / Colaborador
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800 mt-2">{currentUser.name}</p>
              <p className="text-[11px] text-slate-500">Fecha: {new Date().toLocaleDateString('es-ES')}</p>
            </div>
            <div>
              <div className="h-14 border-b border-dashed border-slate-300 flex items-end pb-1">
                <span className="text-xs font-mono text-slate-400 italic">
                  Mario Tabares - Administrador General
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800 mt-2">Firma de Conformidad & Aprobación</p>
              <p className="text-[11px] text-slate-500">Planilla auditada y registrada en el sistema</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
