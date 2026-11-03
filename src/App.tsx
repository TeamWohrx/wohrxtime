/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  ActiveTimer,
  DepartmentArea,
  Project,
  TimeEntry,
  Timesheet,
  User,
} from './types';
import {
  INITIAL_PROJECTS,
  INITIAL_USERS,
} from './data/mockData';
import { auth, googleProvider, signInWithPopup, signOut } from './firebase';
import {
  subscribeToUsers,
  subscribeToProjects,
  subscribeToTimeEntries,
  subscribeToTimesheets,
  saveTimeEntry,
  deleteTimeEntry,
  saveProject,
  deleteProject,
  saveTimesheet,
  seedInitialDataIfEmpty,
  isDemoEntryId,
  isDemoTimesheetId,
  purgeAllDemoEntriesAndTimesheets,
  clearAllTimeRecordsFromFirestore,
} from './services/firestoreService';
import { Navbar } from './components/Navigation/Navbar';
import { TimeTrackerView } from './components/TimeTracker/TimeTrackerView';
import { TimesheetView } from './components/Timesheets/TimesheetView';
import { ReportsView } from './components/Reports/ReportsView';
import { ProjectsView } from './components/Projects/ProjectsView';
import { decimalHoursToMinutes, toISODateString } from './utils/timeUtils';

const STORAGE_KEYS = {
  USERS: 'cronosflow_users_v4',
  CURRENT_USER_ID: 'cronosflow_current_user_id_v4',
  PROJECTS: 'cronosflow_projects_v4',
  ENTRIES: 'cronosflow_entries_v4',
  TIMESHEETS: 'cronosflow_timesheets_v4',
  TIMER: 'cronosflow_active_timer_v4',
  DARK_MODE: 'cronosflow_dark_mode_v4',
};

const AREA_COLORS: Record<DepartmentArea, string> = {
  Sistemas: '#3B82F6',
  Marketing: '#F59E0B',
  RRHH: '#10B981',
  Administrador: '#8B5CF6',
};

export default function App() {
  // Navigation tab
  const [currentTab, setCurrentTab] = useState<'tracker' | 'timesheets' | 'reports' | 'projects'>(
    'tracker'
  );

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
      if (saved !== null) return JSON.parse(saved);
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DARK_MODE, JSON.stringify(isDarkMode));
    } catch {}
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Auth User from Firebase
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [isSyncActive, setIsSyncActive] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Users
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  // Current User (Defaults to Nahir Mendoza)
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      const found = users.find((u) => u.id === savedId);
      return found || users.find((u) => u.name.includes('Nahir')) || users[0] || INITIAL_USERS[0];
    } catch {
      return INITIAL_USERS.find((u) => u.name.includes('Nahir')) || INITIAL_USERS[0];
    }
  });

  // Projects
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
    } catch {
      return INITIAL_PROJECTS;
    }
  });

  // Time Entries (Clean start, filtered of demo mock data)
  const [entries, setEntries] = useState<TimeEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ENTRIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((e) => !isDemoEntryId(e.id));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Timesheets (Clean start, filtered of demo mock data)
  const [timesheets, setTimesheets] = useState<Timesheet[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TIMESHEETS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((t) => !isDemoTimesheetId(t.id));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Active Timer state
  const [timer, setTimer] = useState<ActiveTimer>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TIMER);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      isRunning: false,
      isPaused: false,
      startTime: null,
      elapsedSeconds: 0,
      projectName: 'Sistemas',
      description: '',
    };
  });

  // Always attach real-time Firestore listeners immediately on mount
  useEffect(() => {
    setIsSyncActive(true);

    // Initial check and seed basic team users & projects if cloud database is empty
    seedInitialDataIfEmpty().catch((err) => {
      console.warn('Seed initial check:', err);
    });

    // Automatically purge any lingering demo/fake entries from Firestore
    purgeAllDemoEntriesAndTimesheets().catch((err) => {
      console.warn('Demo purge check:', err);
    });

    // Listen for real-time changes across all connected computers
    const unsubUsers = subscribeToUsers((serverUsers) => {
      if (serverUsers && serverUsers.length > 0) {
        setUsers(serverUsers);
      }
    });

    const unsubProjects = subscribeToProjects((serverProjects) => {
      if (serverProjects && serverProjects.length > 0) {
        setProjects(serverProjects);
      }
    });

    const unsubEntries = subscribeToTimeEntries((serverEntries) => {
      // Ensure no demo entry leaks into active state
      setEntries(serverEntries.filter((e) => !isDemoEntryId(e.id)));
    });

    const unsubTimesheets = subscribeToTimesheets((serverTimesheets) => {
      // Ensure no demo timesheet leaks into active state
      setTimesheets(serverTimesheets.filter((t) => !isDemoTimesheetId(t.id)));
    });

    // Also observe Google Auth for optional user identification
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (user) {
        setUsers((prevUsers) => {
          const matched = prevUsers.find(
            (u) =>
              u.email.toLowerCase() === (user.email || '').toLowerCase() ||
              (user.displayName && u.name.toLowerCase() === user.displayName.toLowerCase())
          );
          if (matched) {
            setCurrentUser(matched);
          }
          return prevUsers;
        });
      }
    });

    return () => {
      unsubUsers();
      unsubProjects();
      unsubEntries();
      unsubTimesheets();
      unsubscribeAuth();
    };
  }, []);

  // Helper to ensure a project exists in state and Firestore
  const ensureProjectExists = (projectName: string, area: DepartmentArea): Project => {
    const trimmed = projectName.trim();
    const existing = projects.find(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing;

    const newProject: Project = {
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      area: area,
      color: AREA_COLORS[area] || '#6366F1',
      budgetHours: 80,
      status: 'active',
      description: `Iniciativa de ${area}`,
    };

    setProjects((prev) => [...prev, newProject]);
    saveProject(newProject).catch((err) => console.error('Error saving project to cloud:', err));
    return newProject;
  };

  // Local Storage persistence backup
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUser.id);
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
      localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
      localStorage.setItem(STORAGE_KEYS.TIMESHEETS, JSON.stringify(timesheets));
      localStorage.setItem(STORAGE_KEYS.TIMER, JSON.stringify(timer));
    } catch (e) {
      console.error('Storage write error', e);
    }
  }, [users, currentUser, projects, entries, timesheets, timer]);

  // Timer Tick Hook
  useEffect(() => {
    let interval: any = null;
    if (timer.isRunning && !timer.isPaused) {
      interval = setInterval(() => {
        setTimer((prev) => ({
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1,
        }));
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer.isRunning, timer.isPaused]);

  // Auth Handlers
  const handleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login error:', error);
      setAuthError('No se pudo completar el inicio de sesión con Google.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Timer Handlers
  const handleStartTimer = (projectName: string, description: string) => {
    const proj = ensureProjectExists(projectName, currentUser.area);

    setTimer({
      isRunning: true,
      isPaused: false,
      startTime: Date.now(),
      elapsedSeconds: 0,
      projectName: proj.name,
      projectId: proj.id,
      description,
    });
  };

  const handlePauseTimer = () => {
    setTimer((prev) => ({ ...prev, isPaused: true }));
  };

  const handleResumeTimer = () => {
    setTimer((prev) => ({ ...prev, isPaused: false }));
  };

  const handleStopTimer = () => {
    if (timer.elapsedSeconds < 5) {
      handleDiscardTimer();
      return;
    }

    const durationMinutes = Math.max(1, Math.round(timer.elapsedSeconds / 60));
    const now = new Date();
    const todayStr = toISODateString(now);

    const pad = (n: number) => String(n).padStart(2, '0');
    const endTimeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const startDate = new Date(now.getTime() - timer.elapsedSeconds * 1000);
    const startTimeStr = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;

    const proj = ensureProjectExists(timer.projectName || currentUser.area, currentUser.area);

    const newEntry: TimeEntry = {
      id: `entry-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userArea: currentUser.area,
      projectId: proj.id,
      projectName: proj.name,
      description: timer.description.trim() || 'Sesión de trabajo registrada',
      date: todayStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      durationMinutes,
      durationSeconds: timer.elapsedSeconds,
      createdAt: now.toISOString(),
    };

    setEntries((prev) => [newEntry, ...prev]);
    saveTimeEntry(newEntry).catch((err) => console.error('Cloud save entry error:', err));

    setTimer({
      isRunning: false,
      isPaused: false,
      startTime: null,
      elapsedSeconds: 0,
      projectName: currentUser.area,
      description: '',
    });
  };

  const handleDiscardTimer = () => {
    setTimer((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      startTime: null,
      elapsedSeconds: 0,
      description: '',
    }));
  };

  // Time Entry CRUD
  const handleAddManualEntry = (entryData: Omit<TimeEntry, 'id' | 'createdAt'>) => {
    const proj = ensureProjectExists(entryData.projectName, entryData.userArea);
    const newEntry: TimeEntry = {
      ...entryData,
      projectId: proj.id,
      projectName: proj.name,
      id: `entry-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setEntries((prev) => [newEntry, ...prev]);
    saveTimeEntry(newEntry).catch((err) => console.error('Cloud save entry error:', err));
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    deleteTimeEntry(id).catch((err) => console.error('Cloud delete entry error:', err));
  };

  const handleUpdateEntry = (updated: TimeEntry) => {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    saveTimeEntry(updated).catch((err) => console.error('Cloud update entry error:', err));
  };

  // Timesheet cell modification (matrix editing by projectName)
  const handleSaveCellHours = (
    userId: string,
    projectName: string,
    dateStr: string,
    hours: number
  ) => {
    const targetUser = users.find((u) => u.id === userId) || currentUser;
    const proj = ensureProjectExists(projectName, targetUser.area);
    const newMinutes = decimalHoursToMinutes(hours);

    const existingIndex = entries.findIndex(
      (e) =>
        e.userId === userId &&
        e.projectName.toLowerCase() === projectName.toLowerCase() &&
        e.date === dateStr
    );

    if (hours <= 0) {
      if (existingIndex !== -1) {
        const toDelete = entries[existingIndex];
        setEntries((prev) => prev.filter((_, idx) => idx !== existingIndex));
        deleteTimeEntry(toDelete.id).catch((err) => console.error('Cloud delete error:', err));
      }
      return;
    }

    if (existingIndex !== -1) {
      const updatedEntry: TimeEntry = {
        ...entries[existingIndex],
        durationMinutes: newMinutes,
      };
      setEntries((prev) => {
        const copy = [...prev];
        copy[existingIndex] = updatedEntry;
        return copy;
      });
      saveTimeEntry(updatedEntry).catch((err) => console.error('Cloud update error:', err));
    } else {
      const newEntry: TimeEntry = {
        id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userId: userId,
        userName: targetUser.name,
        userArea: targetUser.area,
        projectId: proj.id,
        projectName: proj.name,
        description: `Horas en ${proj.name}`,
        date: dateStr,
        durationMinutes: newMinutes,
        createdAt: new Date().toISOString(),
      };
      setEntries((prev) => [newEntry, ...prev]);
      saveTimeEntry(newEntry).catch((err) => console.error('Cloud save error:', err));
    }
  };

  // Timesheet Approval Workflow Handlers
  const handleSubmitTimesheet = (timesheetId: string) => {
    const existing = timesheets.find((t) => t.id === timesheetId);
    let targetTs: Timesheet;

    if (existing) {
      targetTs = {
        ...existing,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        feedbackNote: undefined,
      };
      setTimesheets((prev) => prev.map((t) => (t.id === timesheetId ? targetTs : t)));
    } else {
      const parts = timesheetId.split('-');
      const userId = parts[1];
      const mondayStr = parts.slice(2).join('-');
      const user = users.find((u) => u.id === userId) || currentUser;

      targetTs = {
        id: timesheetId,
        userId,
        userName: user.name,
        userArea: user.area,
        weekStartDate: mondayStr,
        weekEndDate: mondayStr,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        totalMinutes: 0,
      };
      setTimesheets((prev) => [...prev, targetTs]);
    }

    saveTimesheet(targetTs).catch((err) => console.error('Cloud submit timesheet error:', err));
  };

  const handleApproveTimesheet = (timesheetId: string, reviewerName: string) => {
    const existing = timesheets.find((t) => t.id === timesheetId);
    if (!existing) return;

    const updatedTs: Timesheet = {
      ...existing,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      reviewedBy: reviewerName,
      feedbackNote: 'Planilla revisada y aprobada por la administración.',
    };

    setTimesheets((prev) => prev.map((t) => (t.id === timesheetId ? updatedTs : t)));
    saveTimesheet(updatedTs).catch((err) => console.error('Cloud approve timesheet error:', err));
  };

  const handleRejectTimesheet = (timesheetId: string, feedbackNote: string) => {
    const existing = timesheets.find((t) => t.id === timesheetId);
    if (!existing) return;

    const updatedTs: Timesheet = {
      ...existing,
      status: 'rejected',
      reviewedBy: currentUser.name,
      feedbackNote: feedbackNote,
    };

    setTimesheets((prev) => prev.map((t) => (t.id === timesheetId ? updatedTs : t)));
    saveTimesheet(updatedTs).catch((err) => console.error('Cloud reject timesheet error:', err));
  };

  const handleRevertToDraft = (timesheetId: string) => {
    const existing = timesheets.find((t) => t.id === timesheetId);
    if (!existing) return;

    const updatedTs: Timesheet = { ...existing, status: 'draft' };
    setTimesheets((prev) => prev.map((t) => (t.id === timesheetId ? updatedTs : t)));
    saveTimesheet(updatedTs).catch((err) => console.error('Cloud revert timesheet error:', err));
  };

  // Project CRUD
  const handleAddProject = (newProjData: Omit<Project, 'id'>) => {
    const newProject: Project = {
      ...newProjData,
      id: `proj-${Date.now()}`,
    };
    setProjects((prev) => [...prev, newProject]);
    saveProject(newProject).catch((err) => console.error('Cloud save project error:', err));
  };

  const handleUpdateProject = (updated: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    saveProject(updated).catch((err) => console.error('Cloud update project error:', err));
  };

  const handleDeleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    deleteProject(id).catch((err) => console.error('Cloud delete project error:', err));
  };

  const handleResetSeedData = async () => {
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS.find((u) => u.name.includes('Nahir')) || INITIAL_USERS[0]);
    setProjects(INITIAL_PROJECTS);
    setEntries([]);
    setTimesheets([]);
    handleDiscardTimer();
    localStorage.removeItem(STORAGE_KEYS.ENTRIES);
    localStorage.removeItem(STORAGE_KEYS.TIMESHEETS);
    await seedInitialDataIfEmpty();
    await purgeAllDemoEntriesAndTimesheets();
  };

  const handleClearAllRecords = async () => {
    setEntries([]);
    setTimesheets([]);
    handleDiscardTimer();
    localStorage.removeItem(STORAGE_KEYS.ENTRIES);
    localStorage.removeItem(STORAGE_KEYS.TIMESHEETS);
    await clearAllTimeRecordsFromFirestore();
  };

  return (
    <div className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Bar Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        timer={timer}
        currentUser={currentUser}
        allUsers={users}
        onSelectUser={setCurrentUser}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        authUser={authUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isSyncActive={isSyncActive}
      />


      {/* Main Content Viewport */}
      <main className="flex-1 pb-16">
        {currentTab === 'tracker' && (
          <TimeTrackerView
            timer={timer}
            onStartTimer={handleStartTimer}
            onPauseTimer={handlePauseTimer}
            onResumeTimer={handleResumeTimer}
            onStopTimer={handleStopTimer}
            onDiscardTimer={handleDiscardTimer}
            entries={entries}
            projects={projects}
            currentUser={currentUser}
            onAddManualEntry={handleAddManualEntry}
            onDeleteEntry={handleDeleteEntry}
            onUpdateEntry={handleUpdateEntry}
          />
        )}

        {currentTab === 'timesheets' && (
          <TimesheetView
            entries={entries}
            projects={projects}
            timesheets={timesheets}
            currentUser={currentUser}
            allUsers={users}
            onSaveCellHours={handleSaveCellHours}
            onSubmitTimesheet={handleSubmitTimesheet}
            onApproveTimesheet={handleApproveTimesheet}
            onRejectTimesheet={handleRejectTimesheet}
            onRevertToDraft={handleRevertToDraft}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView
            entries={entries}
            projects={projects}
            currentUser={currentUser}
            allUsers={users}
          />
        )}

        {currentTab === 'projects' && (
          <ProjectsView
            projects={projects}
            allUsers={users}
            entries={entries}
            onAddProject={handleAddProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onResetSeedData={handleResetSeedData}
          />
        )}
      </main>
    </div>
  );
}
