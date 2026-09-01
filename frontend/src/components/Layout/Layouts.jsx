// src/components/Layout/Layouts.jsx
import { useState } from 'react'
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../store/authStore'
import { authApi } from '../../api/auth.api'
import {
  LayoutDashboard, Users, UserCheck, BookOpen, Settings2, LogOut,
  ClipboardList, PenLine, BarChart2, Home, User, CalendarCheck,
  CreditCard, IndianRupee, AlertCircle, FileText, Clock, Sun, Moon,
  History, Award, GraduationCap, FolderSearch
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const ADMIN_NAV = [
  { to: '/admin/dashboard',    label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/admin/structure',    label: 'Structure',      icon: BookOpen        },
  { to: '/admin/students',     label: 'Students',       icon: Users           },
  { to: '/admin/fee-reports',  label: 'Fee Reports',    icon: IndianRupee     },
  { to: '/admin/teachers',     label: 'Teachers',       icon: UserCheck       },
  { to: '/admin/syllabus',     label: 'Syllabus',       icon: BookOpen        },
  { to: '/admin/timetable',    label: 'Timetable',      icon: Clock           },
  { to: '/admin/promotion',    label: 'Promotion',      icon: Settings2       },
  { to: '/admin/attendance',   label: 'Attendance',     icon: ClipboardList   },
  { to: '/admin/exam-results', label: 'Exam Results',   icon: BarChart2       },
  { to: '/admin/scholarships', label: 'Scholarships',   icon: Award           },
  { to: '/admin/coordinators', label: 'Coordinators',   icon: FolderSearch    },
]

const TEACHER_NAV = [
  { to: '/teacher/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/teacher/profile',       label: 'My Profile',    icon: User            },
  { to: '/teacher/mentees',       label: 'Mentees',       icon: Users           },
  { to: '/teacher/classes',       label: 'My Classes',    icon: GraduationCap   },
  { to: '/teacher/timetable',     label: 'Timetable',     icon: Clock           },
  { to: '/teacher/attendance',    label: 'Attendance',    icon: ClipboardList   },
  { to: '/teacher/marks',         label: 'Marks Entry',   icon: PenLine         },
  { to: '/teacher/coordinated',   label: 'Coordinations', icon: FolderSearch    },
  { to: '/teacher/registrations', label: 'Registrations', icon: BookOpen        },
]

const STUDENT_NAV = [
  { to: '/student/dashboard',  label: 'Dashboard',    icon: Home          },
  { to: '/student/profile',    label: 'My Profile',   icon: User          },
  { to: '/student/timetable',  label: 'Timetable',    icon: Clock         },
  { to: '/student/register',   label: 'Registration', icon: CalendarCheck },
  { to: '/student/subjects',   label: 'My Subjects',  icon: BookOpen      },
  { to: '/student/attendance', label: 'Attendance',   icon: CalendarCheck },
  { to: '/student/marks',      label: 'Marks',        icon: BarChart2     },
  { to: '/student/fee',        label: 'Fee Status',   icon: CreditCard    },
  { to: '/student/scholarships',label: 'Scholarships', icon: Award        },
]

const ACCOUNTS_NAV = [
  { to: '/accounts/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/accounts/payments',  label: 'Payments',  icon: IndianRupee     },
  { to: '/accounts/fines',     label: 'Fines',     icon: AlertCircle     },
  { to: '/accounts/ledger',    label: 'Student Ledger', icon: History     },
  { to: '/accounts/fees',      label: 'Fee Setup', icon: Settings2       },
  { to: '/accounts/reports',   label: 'Reports',   icon: FileText        },
]

export default function AdminLayout() {
  const { logout, user } = useAuth(); const navigate = useNavigate()
  async function handleLogout() { try { await authApi.logout() } catch {} logout(); navigate('/login') }
  return <SidebarLayout nav={ADMIN_NAV} panelLabel="Admin Panel" onLogout={handleLogout} user={user}/>
}

export function TeacherLayout() {
  const { logout, user } = useAuth(); const navigate = useNavigate()
  async function handleLogout() { try { await authApi.logout() } catch {} logout(); navigate('/login') }
  return <SidebarLayout nav={TEACHER_NAV} panelLabel="Teacher Panel" onLogout={handleLogout} user={user}/>
}

export function StudentLayout() {
  const { logout, user } = useAuth(); const navigate = useNavigate()
  async function handleLogout() { try { await authApi.logout() } catch {} logout(); navigate('/login') }
  return <SidebarLayout nav={STUDENT_NAV} panelLabel="Student Panel" onLogout={handleLogout} user={user}/>
}

export function AccountsLayout() {
  const { logout, user } = useAuth(); const navigate = useNavigate()
  async function handleLogout() { try { await authApi.logout() } catch {} logout(); navigate('/login') }
  return <SidebarLayout nav={ACCOUNTS_NAV} panelLabel="Accounts Panel" onLogout={handleLogout} user={user}/>
}

function SidebarLayout({ nav, panelLabel, onLogout, user }) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [navKey, setNavKey] = useState(0);

  const dashLink = user?.role === 'ADMIN' ? '/admin/dashboard' : 
                   user?.role === 'TEACHER' ? '/teacher/dashboard' : 
                   user?.role === 'STUDENT' ? '/student/dashboard' : 
                   '/accounts/dashboard';

  return (
    <div className="flex h-screen relative overflow-hidden">
      {/* Premium Glass Sidebar */}
      <aside className="w-72 glass-sidebar flex flex-col relative z-20 shrink-0">
        <div className="p-8">
          <Link to={dashLink} className="flex items-center gap-3 mb-2 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/20">
              🎓
            </div>
            <div>
              <h2 className="font-bold text-xl tracking-tight text-slate-800 dark:text-white">College ERP</h2>
              <p className="text-indigo-500 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest">{panelLabel}</p>
            </div>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              onClick={() => { if (location.pathname === to) setNavKey(k => k + 1) }}
              className={({ isActive }) =>
                isActive ? 'glass-nav-item-active' : 'glass-nav-item-inactive'
              }>
              <Icon size={19} className="shrink-0"/>
              <span className="text-[13.5px]">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-6 mt-auto space-y-3 bg-white/5 dark:bg-black/5 backdrop-blur-md">
          <div className="flex items-center gap-3 px-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-indigo-500 border border-white/20">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-slate-700 dark:text-slate-200 text-xs font-bold truncate">{user?.email}</p>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">{user?.role}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button onClick={toggleTheme}
              className="flex items-center justify-center h-11 rounded-2xl bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all border border-white/20 shadow-sm"
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
              {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
            <button onClick={onLogout}
              className="flex items-center justify-center h-11 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all border border-rose-500/10 shadow-sm"
              title="Logout">
              <LogOut size={18}/>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content with Mesh Background */}
      <main className="flex-1 overflow-auto relative z-10 custom-scrollbar">
        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto min-h-full">
          <Outlet key={location.pathname + navKey}/>
        </div>
      </main>
    </div>
  )
}


