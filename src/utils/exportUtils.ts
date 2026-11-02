import { Project, TimeEntry } from '../types';
import { minutesToDecimalHours } from './timeUtils';

export function exportEntriesToCSV(
  entries: TimeEntry[],
  projects: Project[],
  filename = 'wohrxtime_control_tiempos.csv'
) {
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  // CSV Headers (Sin facturación, enfocado en productividad)
  const headers = [
    'ID',
    'Fecha',
    'Colaborador',
    'Área',
    'Proyecto',
    'Descripción de Tarea',
    'Hora Inicio',
    'Hora Fin',
    'Horas Dedicadas',
    'Minutos Totales',
  ];

  const escapeCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = entries.map((entry) => {
    const proj = projectMap.get(entry.projectId);
    const hours = minutesToDecimalHours(entry.durationMinutes);

    return [
      escapeCell(entry.id),
      escapeCell(entry.date),
      escapeCell(entry.userName),
      escapeCell(entry.userArea),
      escapeCell(proj ? proj.name : entry.projectName || 'Sin proyecto'),
      escapeCell(entry.description || '-'),
      escapeCell(entry.startTime || '-'),
      escapeCell(entry.endTime || '-'),
      escapeCell(hours),
      escapeCell(entry.durationMinutes),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportEntriesToExcel(
  entries: TimeEntry[],
  projects: Project[],
  reportTitle = 'Planilla de Control Horario y Productividad'
) {
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  let totalMin = 0;

  const rowsHtml = entries
    .map((entry) => {
      const proj = projectMap.get(entry.projectId);
      const hours = minutesToDecimalHours(entry.durationMinutes);
      totalMin += entry.durationMinutes;

      return `
      <tr>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${entry.date}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db; font-weight: bold;">${entry.userName}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db; text-align: center;">${entry.userArea}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${proj ? proj.name : entry.projectName || 'General'}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db;">${entry.description || '-'}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db; text-align: center;">${entry.startTime || '-'}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db; text-align: center;">${entry.endTime || '-'}</td>
        <td style="padding: 6px; border: 1px solid #d1d5db; text-align: right; font-weight: bold;">${hours.toFixed(2)} h</td>
      </tr>`;
    })
    .join('');

  const totalHours = minutesToDecimalHours(totalMin);

  const excelTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
      <title>${reportTitle}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #1e293b; color: #ffffff; padding: 10px; font-weight: bold; border: 1px solid #0f172a; }
        .summary-header { background-color: #f1f5f9; font-weight: bold; }
        .total-row { background-color: #e2e8f0; font-weight: bold; }
      </style>
    </head>
    <body>
      <h2>${reportTitle}</h2>
      <p>Generado el: ${new Date().toLocaleString('es-ES')}</p>
      <table style="margin-bottom: 20px;">
        <tr class="summary-header">
          <td style="padding: 8px; border: 1px solid #cbd5e1;">Total Horas Trabajadas:</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; color: #4338ca;">${totalHours.toFixed(2)} h</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">Total Registros:</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">${entries.length}</td>
        </tr>
      </table>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Colaborador</th>
            <th>Área</th>
            <th>Proyecto</th>
            <th>Descripción de Tarea</th>
            <th>Inicio</th>
            <th>Fin</th>
            <th>Horas Dedicadas</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr class="total-row">
            <td colspan="7" style="padding: 10px; text-align: right; border: 1px solid #94a3b8;">TOTAL HORAS ACUMULADAS:</td>
            <td style="padding: 10px; text-align: right; border: 1px solid #94a3b8; color: #4338ca;">${totalHours.toFixed(2)} h</td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `wohrxtime_productividad_${new Date().toISOString().slice(0, 10)}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
