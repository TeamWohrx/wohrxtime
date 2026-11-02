import React from 'react';
import { ActiveTimer, DepartmentArea, User } from '../../types';
import { formatSecondsToDigital } from '../../utils/timeUtils';
import { Clock, Moon, Sun, ChevronDown, Check, Shield, Cloud, CloudOff, LogIn, LogOut } from 'lucide-react';

interface NavbarProps {
  currentTab: 'tracker' | 'timesheets' | 'reports' | 'projects';
  onSelectTab: (tab: 'tracker' | 'timesheets' | 'reports' | 'projects') => void;
  timer: ActiveTimer;
  currentUser: User;
  allUsers: User[];
  onSelectUser: (user: User) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  authUser: { email?: string | null; displayName?: string | null } | null;
  onLogin: () => void;
  onLogout: () => void;
  isSyncActive: boolean;
}

const AREA_BADGES: Record<DepartmentArea, { bg: string; text: string }> = {
  Marketing: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400' },
  RRHH: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400' },
  Sistemas: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400' },
  Administrador: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-400' },
};

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  timer,
  currentUser,
  allUsers,
  onSelectUser,
  isDarkMode,
  onToggleDarkMode,
  authUser,
  onLogin,
  onLogout,
  isSyncActive,
}) => {
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Group users by area for organized switching
  const areas: DepartmentArea[] = ['Sistemas', 'Marketing', 'RRHH', 'Administrador'];

  return (
    <header className="no-print h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30 px-4 sm:px-8">
      <div className="h-full max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Brand mark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('tracker')}
            className="flex items-center gap-2 text-left group cursor-pointer focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-xs group-hover:bg-indigo-700 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
              Wohrxtime
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links (single line, whitespace-nowrap) */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onSelectTab('tracker')}
            className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              currentTab === 'tracker'
                ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            Temporizador
          </button>
          <button
            onClick={() => onSelectTab('timesheets')}
            className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              currentTab === 'timesheets'
                ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            Planillas Semanales
          </button>
          <button
            onClick={() => onSelectTab('reports')}
            className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              currentTab === 'reports'
                ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            Informes y Productividad
          </button>
          <button
            onClick={() => onSelectTab('projects')}
            className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              currentTab === 'projects'
                ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            Proyectos & Áreas
          </button>
        </nav>

        {/* Zone 3: Actions (Live timer indicator, Role/User dropdown, Dark toggle) */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Active Timer mini indicator */}
          {timer.isRunning && (
            <button
              onClick={() => onSelectTab('tracker')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-medium hover:bg-emerald-100 transition-colors cursor-pointer"
              title="Temporizador en marcha - Clic para ver"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{formatSecondsToDigital(timer.elapsedSeconds)}</span>
            </button>
          )}

          {/* Cloud Sync & Auth Button */}
          {authUser ? (
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-1.5 rounded-lg text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="hidden lg:inline font-medium text-emerald-700 dark:text-emerald-300">
                Sincronizado
              </span>
              <button
                onClick={onLogout}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1 cursor-pointer p-0.5 rounded"
                title={`Cerrar sesión (${authUser.email || ''})`}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
              title="Iniciar sesión para sincronizar entre todos los ordenadores"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Conectar Equipo</span>
            </button>
          )}

          {/* Dark / Light Mode Switch */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Alternar tema claro y oscuro"
            title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User & Area Switcher */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
              aria-label="Perfil y área activa"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                  {currentUser.name}
                </p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span
                    className={`inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                      AREA_BADGES[currentUser.area].bg
                    } ${AREA_BADGES[currentUser.area].text}`}
                  >
                    {currentUser.area}
                  </span>
                  {currentUser.role === 'admin' && (
                    <Shield className="w-3 h-3 text-purple-600 dark:text-purple-400 inline" />
                  )}
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                {currentUser.name
                  .split(' ')
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 text-xs max-h-[80vh] overflow-y-auto">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    Cambiar Perfil ({allUsers.length} integrantes)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Selecciona para ver el temporizador o planilla de cada colaborador
                  </p>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {areas.map((areaName) => {
                    const areaMembers = allUsers.filter((u) => u.area === areaName);
                    if (areaMembers.length === 0) return null;

                    return (
                      <div key={areaName} className="py-1">
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {areaName}
                        </div>
                        {areaMembers.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              onSelectUser(u);
                              setShowUserMenu(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer text-left"
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                                {u.name
                                  .split(' ')
                                  .filter(Boolean)
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div className="truncate">
                                <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                  {u.name}
                                </p>
                              </div>
                            </div>
                            {u.id === currentUser.id && (
                              <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav tabs bar */}
      <div className="md:hidden flex items-center justify-around py-1 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
        <button
          onClick={() => onSelectTab('tracker')}
          className={`py-1.5 px-2 font-medium ${
            currentTab === 'tracker' ? 'text-indigo-600 font-bold' : 'text-slate-600'
          }`}
        >
          Timer
        </button>
        <button
          onClick={() => onSelectTab('timesheets')}
          className={`py-1.5 px-2 font-medium ${
            currentTab === 'timesheets' ? 'text-indigo-600 font-bold' : 'text-slate-600'
          }`}
        >
          Planillas
        </button>
        <button
          onClick={() => onSelectTab('reports')}
          className={`py-1.5 px-2 font-medium ${
            currentTab === 'reports' ? 'text-indigo-600 font-bold' : 'text-slate-600'
          }`}
        >
          Informes
        </button>
        <button
          onClick={() => onSelectTab('projects')}
          className={`py-1.5 px-2 font-medium ${
            currentTab === 'projects' ? 'text-indigo-600 font-bold' : 'text-slate-600'
          }`}
        >
          Proyectos
        </button>
      </div>
    </header>
  );
};
