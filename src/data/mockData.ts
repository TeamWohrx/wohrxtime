import { DepartmentArea, Project, TimeEntry, Timesheet, User } from '../types';
import { getMondayOfWeek, toISODateString } from '../utils/timeUtils';

export const INITIAL_USERS: User[] = [
  // Marketing
  {
    id: 'user-alvaro',
    name: 'Alvaro Vargas',
    email: 'alvaro.vargas@empresa.com',
    role: 'member',
    area: 'Marketing',
  },
  {
    id: 'user-martin',
    name: 'Martin Wunkhaus',
    email: 'martin.wunkhaus@empresa.com',
    role: 'member',
    area: 'Marketing',
  },
  {
    id: 'user-aylen',
    name: 'Aylen Figueroa',
    email: 'aylen.figueroa@empresa.com',
    role: 'member',
    area: 'Marketing',
  },
  {
    id: 'user-camila',
    name: 'Camila Correa',
    email: 'camila.correa@empresa.com',
    role: 'member',
    area: 'Marketing',
  },

  // RRHH
  {
    id: 'user-zoe',
    name: 'Zoe Padilla',
    email: 'zoe.padilla@empresa.com',
    role: 'member',
    area: 'RRHH',
  },
  {
    id: 'user-malena',
    name: 'Malena Duarte',
    email: 'malena.duarte@empresa.com',
    role: 'member',
    area: 'RRHH',
  },
  {
    id: 'user-valentin',
    name: 'Valentin Fleitas',
    email: 'valentin.fleitas@empresa.com',
    role: 'member',
    area: 'RRHH',
  },

  // Sistemas
  {
    id: 'user-eduardo',
    name: 'Eduardo Donaire',
    email: 'eduardo.donaire@empresa.com',
    role: 'member',
    area: 'Sistemas',
  },
  {
    id: 'user-nahir',
    name: 'Nahir Mendoza',
    email: 'nahir.mendoza@empresa.com',
    role: 'member',
    area: 'Sistemas',
  },

  // Administrador
  {
    id: 'user-mario',
    name: 'Mario Tabares',
    email: 'mario.tabares@empresa.com',
    role: 'admin',
    area: 'Administrador',
  },
];

// Default projects: The 4 Areas are primary projects themselves, plus common custom initiatives
export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-sistemas',
    name: 'Sistemas',
    area: 'Sistemas',
    color: '#3B82F6', // Blue
    budgetHours: 160,
    status: 'active',
    description: 'Tareas generales e iniciativas del área de Sistemas.',
  },
  {
    id: 'proj-marketing',
    name: 'Marketing',
    area: 'Marketing',
    color: '#F59E0B', // Amber
    budgetHours: 160,
    status: 'active',
    description: 'Campañas, contenido, pauta y gestión del área de Marketing.',
  },
  {
    id: 'proj-rrhh',
    name: 'RRHH',
    area: 'RRHH',
    color: '#10B981', // Emerald
    budgetHours: 160,
    status: 'active',
    description: 'Gestión de personal, clima, selección y capacitaciones en RRHH.',
  },
  {
    id: 'proj-administracion',
    name: 'Administración',
    area: 'Administrador',
    color: '#8B5CF6', // Purple
    budgetHours: 120,
    status: 'active',
    description: 'Planificación, auditorías, control de gestión y aprobaciones.',
  },
  {
    id: 'proj-dev-software',
    name: 'Desarrollo Software & Plataforma',
    area: 'Sistemas',
    color: '#06B6D4', // Cyan
    budgetHours: 80,
    status: 'active',
    description: 'Mantenimiento del código, nuevas features e integraciones.',
  },
  {
    id: 'proj-campanas',
    name: 'Campañas & Pauta Digital',
    area: 'Marketing',
    color: '#EC4899', // Pink
    budgetHours: 80,
    status: 'active',
    description: 'Estrategias de performance, anuncios y métricas.',
  },
  {
    id: 'proj-seleccion',
    name: 'Selección de Personal & Onboarding',
    area: 'RRHH',
    color: '#14B8A6', // Teal
    budgetHours: 60,
    status: 'active',
    description: 'Procesos de reclutamiento e inducción de nuevos ingresos.',
  },
];

export function generateSeedTimeEntries(): TimeEntry[] {
  const today = new Date();
  const currentMon = getMondayOfWeek(today);

  const getOffsetDate = (dayOffset: number): string => {
    const d = new Date(currentMon);
    d.setDate(currentMon.getDate() + dayOffset);
    return toISODateString(d);
  };

  return [
    // Nahir Mendoza (Sistemas)
    {
      id: 'entry-nahir-1',
      userId: 'user-nahir',
      userName: 'Nahir Mendoza',
      userArea: 'Sistemas',
      projectId: 'proj-sistemas',
      projectName: 'Sistemas',
      description: 'Implementación de control de sesiones y optimización de componentes en React',
      date: getOffsetDate(0), // Lunes
      startTime: '09:00',
      endTime: '13:00',
      durationMinutes: 240, // 4h
      createdAt: '2026-10-26T13:00:00Z',
    },
    {
      id: 'entry-nahir-2',
      userId: 'user-nahir',
      userName: 'Nahir Mendoza',
      userArea: 'Sistemas',
      projectId: 'proj-dev-software',
      projectName: 'Desarrollo Software & Plataforma',
      description: 'Revisión de políticas de seguridad en base de datos y tests automatizados',
      date: getOffsetDate(0), // Lunes
      startTime: '14:00',
      endTime: '18:00',
      durationMinutes: 240, // 4h
      createdAt: '2026-10-26T18:00:00Z',
    },
    {
      id: 'entry-nahir-3',
      userId: 'user-nahir',
      userName: 'Nahir Mendoza',
      userArea: 'Sistemas',
      projectId: 'proj-sistemas',
      projectName: 'Sistemas',
      description: 'Integración de módulo de exportación de reportes y pruebas de interfaz',
      date: getOffsetDate(1), // Martes
      startTime: '09:00',
      endTime: '17:00',
      durationMinutes: 480, // 8h
      createdAt: '2026-10-27T17:00:00Z',
    },
    {
      id: 'entry-nahir-4',
      userId: 'user-nahir',
      userName: 'Nahir Mendoza',
      userArea: 'Sistemas',
      projectId: 'proj-dev-software',
      projectName: 'Desarrollo Software & Plataforma',
      description: 'Refactorización del almacenamiento local y validación de formularios',
      date: getOffsetDate(2), // Miércoles
      startTime: '09:00',
      endTime: '16:30',
      durationMinutes: 450, // 7.5h
      createdAt: '2026-10-28T16:30:00Z',
    },

    // Eduardo Donaire (Sistemas)
    {
      id: 'entry-eduardo-1',
      userId: 'user-eduardo',
      userName: 'Eduardo Donaire',
      userArea: 'Sistemas',
      projectId: 'proj-sistemas',
      projectName: 'Sistemas',
      description: 'Monitoreo de latencia en servidores y balanceador de carga',
      date: getOffsetDate(0),
      startTime: '08:30',
      endTime: '16:30',
      durationMinutes: 480,
      createdAt: '2026-10-26T16:30:00Z',
    },

    // Alvaro Vargas (Marketing)
    {
      id: 'entry-alvaro-1',
      userId: 'user-alvaro',
      userName: 'Alvaro Vargas',
      userArea: 'Marketing',
      projectId: 'proj-marketing',
      projectName: 'Marketing',
      description: 'Optimización de palabras clave y presupuesto en Google Ads',
      date: getOffsetDate(0),
      startTime: '09:00',
      endTime: '17:00',
      durationMinutes: 480,
      createdAt: '2026-10-26T17:00:00Z',
    },
    {
      id: 'entry-alvaro-2',
      userId: 'user-alvaro',
      userName: 'Alvaro Vargas',
      userArea: 'Marketing',
      projectId: 'proj-campanas',
      projectName: 'Campañas & Pauta Digital',
      description: 'Reporte de conversiones y ROI de pauta semanal',
      date: getOffsetDate(1),
      startTime: '09:00',
      endTime: '17:00',
      durationMinutes: 480,
      createdAt: '2026-10-27T17:00:00Z',
    },

    // Martin Wunkhaus (Marketing)
    {
      id: 'entry-martin-1',
      userId: 'user-martin',
      userName: 'Martin Wunkhaus',
      userArea: 'Marketing',
      projectId: 'proj-marketing',
      projectName: 'Marketing',
      description: 'Diseño de carruseles informativos para LinkedIn e Instagram',
      date: getOffsetDate(0),
      startTime: '10:00',
      endTime: '18:00',
      durationMinutes: 480,
      createdAt: '2026-10-26T18:00:00Z',
    },

    // Zoe Padilla (RRHH) - Actividades del 31/10 y 01/11
    {
      id: 'entry-zoe-31-10',
      userId: 'user-zoe',
      userName: 'Zoe Padilla',
      userArea: 'RRHH',
      projectId: 'proj-rrhh',
      projectName: 'RRHH',
      description: 'Entrevistas a candidatos y evaluación técnica de talentos',
      date: getOffsetDate(5), // 2026-10-31 (Sábado)
      startTime: '09:00',
      endTime: '13:00',
      durationMinutes: 240, // 4 horas
      createdAt: '2026-10-31T13:00:00Z',
    },
    {
      id: 'entry-zoe-01-11',
      userId: 'user-zoe',
      userName: 'Zoe Padilla',
      userArea: 'RRHH',
      projectId: 'proj-rrhh',
      projectName: 'RRHH',
      description: 'Actualización de legajos, base de talentos y reporte de equipo',
      date: getOffsetDate(6), // 2026-11-01 (Domingo)
      startTime: '10:00',
      endTime: '14:00',
      durationMinutes: 240, // 4 horas
      createdAt: '2026-11-01T14:00:00Z',
    },


    // Malena Duarte (RRHH)
    {
      id: 'entry-malena-1',
      userId: 'user-malena',
      userName: 'Malena Duarte',
      userArea: 'RRHH',
      projectId: 'proj-rrhh',
      projectName: 'RRHH',
      description: 'Encuesta trimestral de satisfacción y bienestar del equipo',
      date: getOffsetDate(1),
      startTime: '09:30',
      endTime: '17:30',
      durationMinutes: 480,
      createdAt: '2026-10-27T17:30:00Z',
    },

    // Mario Tabares (Administrador)
    {
      id: 'entry-mario-1',
      userId: 'user-mario',
      userName: 'Mario Tabares',
      userArea: 'Administrador',
      projectId: 'proj-administracion',
      projectName: 'Administración',
      description: 'Revisión y validación de planillas horarias de los equipos',
      date: getOffsetDate(0),
      startTime: '08:30',
      endTime: '16:30',
      durationMinutes: 480,
      createdAt: '2026-10-26T16:30:00Z',
    },
  ];
}

export function generateSeedTimesheets(): Timesheet[] {
  const today = new Date();
  const currentMon = getMondayOfWeek(today);
  const currentSun = new Date(currentMon);
  currentSun.setDate(currentMon.getDate() + 6);

  const prevMon = new Date(currentMon);
  prevMon.setDate(currentMon.getDate() - 7);
  const prevSun = new Date(prevMon);
  prevSun.setDate(prevMon.getDate() + 6);

  return [
    {
      id: `ts-user-nahir-${toISODateString(currentMon)}`,
      userId: 'user-nahir',
      userName: 'Nahir Mendoza',
      userArea: 'Sistemas',
      weekStartDate: toISODateString(currentMon),
      weekEndDate: toISODateString(currentSun),
      status: 'draft',
      totalMinutes: 1650, // 27.5h
    },
    {
      id: `ts-user-alvaro-${toISODateString(currentMon)}`,
      userId: 'user-alvaro',
      userName: 'Alvaro Vargas',
      userArea: 'Marketing',
      weekStartDate: toISODateString(currentMon),
      weekEndDate: toISODateString(currentSun),
      status: 'submitted',
      submittedAt: `${toISODateString(currentMon)}T18:00:00Z`,
      totalMinutes: 960, // 16h
    },
    {
      id: `ts-user-zoe-${toISODateString(currentMon)}`,
      userId: 'user-zoe',
      userName: 'Zoe Padilla',
      userArea: 'RRHH',
      weekStartDate: toISODateString(currentMon),
      weekEndDate: toISODateString(currentSun),
      status: 'submitted',
      submittedAt: `${toISODateString(currentSun)}T14:30:00Z`,
      totalMinutes: 480, // 8h (4h sábado 31/10 + 4h domingo 01/11)
    },
    {
      id: `ts-user-zoe-${toISODateString(prevMon)}`,
      userId: 'user-zoe',
      userName: 'Zoe Padilla',
      userArea: 'RRHH',
      weekStartDate: toISODateString(prevMon),
      weekEndDate: toISODateString(prevSun),
      status: 'approved',
      submittedAt: `${toISODateString(prevSun)}T18:00:00Z`,
      approvedAt: `${toISODateString(currentMon)}T09:00:00Z`,
      reviewedBy: 'Mario Tabares (Administrador)',
      feedbackNote: 'Jornadas semanales cumplidas conforme a las metas del área de RRHH.',
      totalMinutes: 2400, // 40h
    },
  ];
}
