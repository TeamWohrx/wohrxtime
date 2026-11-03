/**
 * Real-time Firestore synchronization service for CronosFlow
 */
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Project, TimeEntry, Timesheet, User } from '../types';
import {
  INITIAL_PROJECTS,
  INITIAL_USERS,
  generateSeedTimeEntries,
  generateSeedTimesheets,
} from '../data/mockData';

const COLLECTIONS = {
  USERS: 'users',
  PROJECTS: 'projects',
  TIME_ENTRIES: 'timeEntries',
  TIMESHEETS: 'timesheets',
} as const;

/**
 * Remove undefined properties so Firestore setDoc does not throw
 */
function cleanForFirestore<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned as T;
}

/**
 * Subscribe to all users in real-time
 */
export function subscribeToUsers(onUpdate: (users: User[]) => void): () => void {
  const colRef = collection(db, COLLECTIONS.USERS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: User[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as User);
      });
      if (items.length > 0) {
        onUpdate(items);
      }
    },
    (error) => {
      console.warn('Real-time users subscription warning:', error);
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.USERS);
    }
  );
}

/**
 * Subscribe to all projects in real-time
 */
export function subscribeToProjects(onUpdate: (projects: Project[]) => void): () => void {
  const colRef = collection(db, COLLECTIONS.PROJECTS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Project[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Project);
      });
      if (items.length > 0) {
        onUpdate(items);
      }
    },
    (error) => {
      console.warn('Real-time projects subscription warning:', error);
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.PROJECTS);
    }
  );
}

/**
 * Subscribe to all time entries in real-time
 */
export function subscribeToTimeEntries(onUpdate: (entries: TimeEntry[]) => void): () => void {
  const colRef = collection(db, COLLECTIONS.TIME_ENTRIES);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: TimeEntry[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as TimeEntry);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Real-time time entries subscription warning:', error);
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.TIME_ENTRIES);
    }
  );
}

/**
 * Subscribe to all timesheets in real-time
 */
export function subscribeToTimesheets(onUpdate: (timesheets: Timesheet[]) => void): () => void {
  const colRef = collection(db, COLLECTIONS.TIMESHEETS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Timesheet[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Timesheet);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Real-time timesheets subscription warning:', error);
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.TIMESHEETS);
    }
  );
}

/**
 * Save or update a single time entry
 */
export async function saveTimeEntry(entry: TimeEntry): Promise<void> {
  const path = `${COLLECTIONS.TIME_ENTRIES}/${entry.id}`;
  try {
    const docRef = doc(db, COLLECTIONS.TIME_ENTRIES, entry.id);
    await setDoc(docRef, cleanForFirestore(entry));
  } catch (error) {
    console.error('Error saving time entry:', error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a time entry
 */
export async function deleteTimeEntry(id: string): Promise<void> {
  const path = `${COLLECTIONS.TIME_ENTRIES}/${id}`;
  try {
    const docRef = doc(db, COLLECTIONS.TIME_ENTRIES, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting time entry:', error);
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save or update a project
 */
export async function saveProject(project: Project): Promise<void> {
  const path = `${COLLECTIONS.PROJECTS}/${project.id}`;
  try {
    const docRef = doc(db, COLLECTIONS.PROJECTS, project.id);
    await setDoc(docRef, cleanForFirestore(project));
  } catch (error) {
    console.error('Error saving project:', error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a project
 */
export async function deleteProject(id: string): Promise<void> {
  const path = `${COLLECTIONS.PROJECTS}/${id}`;
  try {
    const docRef = doc(db, COLLECTIONS.PROJECTS, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting project:', error);
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save or update a timesheet
 */
export async function saveTimesheet(timesheet: Timesheet): Promise<void> {
  const path = `${COLLECTIONS.TIMESHEETS}/${timesheet.id}`;
  try {
    const docRef = doc(db, COLLECTIONS.TIMESHEETS, timesheet.id);
    await setDoc(docRef, cleanForFirestore(timesheet));
  } catch (error) {
    console.error('Error saving timesheet:', error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save or update a user profile
 */
export async function saveUser(user: User): Promise<void> {
  const path = `${COLLECTIONS.USERS}/${user.id}`;
  try {
    const docRef = doc(db, COLLECTIONS.USERS, user.id);
    await setDoc(docRef, cleanForFirestore(user));
  } catch (error) {
    console.error('Error saving user:', error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Seed initial database records if collections are empty in Firestore
 */
export async function seedInitialDataIfEmpty(): Promise<void> {
  try {
    const usersCol = collection(db, COLLECTIONS.USERS);
    const existingUsers = await getDocs(usersCol);

    if (existingUsers.empty) {
      console.log('Seeding initial users into Firestore...');
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, COLLECTIONS.USERS, u.id), cleanForFirestore(u));
      }
    }

    const projectsCol = collection(db, COLLECTIONS.PROJECTS);
    const existingProjects = await getDocs(projectsCol);

    if (existingProjects.empty) {
      console.log('Seeding initial projects into Firestore...');
      for (const p of INITIAL_PROJECTS) {
        await setDoc(doc(db, COLLECTIONS.PROJECTS, p.id), cleanForFirestore(p));
      }
    }

    const entriesCol = collection(db, COLLECTIONS.TIME_ENTRIES);
    const existingEntries = await getDocs(entriesCol);

    if (existingEntries.empty) {
      console.log('Seeding initial time entries into Firestore...');
      const seedEntries = generateSeedTimeEntries();
      for (const e of seedEntries) {
        await setDoc(doc(db, COLLECTIONS.TIME_ENTRIES, e.id), cleanForFirestore(e));
      }
    }

    const timesheetsCol = collection(db, COLLECTIONS.TIMESHEETS);
    const existingTimesheets = await getDocs(timesheetsCol);

    if (existingTimesheets.empty) {
      console.log('Seeding initial timesheets into Firestore...');
      const seedTimesheets = generateSeedTimesheets();
      for (const t of seedTimesheets) {
        await setDoc(doc(db, COLLECTIONS.TIMESHEETS, t.id), cleanForFirestore(t));
      }
    }
  } catch (error) {
    console.warn('Initial seeding note (cloud data already exists or concurrent init):', error);
  }
}
