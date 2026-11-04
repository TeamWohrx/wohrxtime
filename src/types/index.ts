export type DepartmentArea = 'Marketing' | 'RRHH' | 'Sistemas' | 'Administrador';

export type UserRole = 'member' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  area: DepartmentArea;
  title?: string;
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
  area: DepartmentArea;
  color: string;
  budgetHours: number; // Horas estimadas / objetivo (opcional)
  status: 'active' | 'archived';
  description?: string;
}

export interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  userArea: DepartmentArea;
  projectId: string;
  projectName: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  durationMinutes: number; // en minutos
  durationSeconds?: number; // segundos exactos si proviene del temporizador en vivo
  timesheetId?: string;
  createdAt: string;
}

export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface Timesheet {
  id: string;
  userId: string;
  userName: string;
  userArea: DepartmentArea;
  weekStartDate: string; // YYYY-MM-DD (Monday)
  weekEndDate: string; // YYYY-MM-DD (Sunday)
  status: TimesheetStatus;
  submittedAt?: string;
  approvedAt?: string;
  reviewedBy?: string;
  feedbackNote?: string;
  totalMinutes: number;
}

export interface ActiveTimer {
  isRunning: boolean;
  isPaused: boolean;
  startTime: number | null; // Date.now() timestamp
  accumulatedSeconds?: number; // Segundos acumulados antes de pausar/reanudar
  elapsedSeconds: number;
  projectName: string;
  projectId?: string;
  description: string;
}

export type DateFilterPreset = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom' | 'all';
