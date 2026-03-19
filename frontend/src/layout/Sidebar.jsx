import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Wallet, 
  GraduationCap, 
  Settings,
  X 
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user } = useAuth();
  const location = useLocation();
  const role = user?.role;

  const adminLinks = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { name: 'Students', icon: GraduationCap, path: '/admin-students' },
    { name: 'Teachers', icon: Users, path: '/admin-teachers' },
    { name: 'Accounts', icon: Wallet, path: '/admin-accounts' },
  ];

  const teacherLinks = [
    { name: 'Overview', icon: LayoutDashboard, path: '/teacher' },
    { name: 'Attendance', icon: Users, path: '/teacher-attendance' },
    { name: 'Marks', icon: BookOpen, path: '/teacher-marks' },
  ];

  const studentLinks = [
    { name: 'My Profile', icon: LayoutDashboard, path: '/student' },
    { name: 'Fees', icon: Wallet, path: '/student-fee' },
    { name: 'My Marks', icon: BookOpen, path: '/student-marks' },
  ];

  const links = role === 'ADMIN' ? adminLinks : role === 'TEACHER' ? teacherLinks : studentLinks;

  const NavLink = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`
          flex items-center space-x-4 px-4 py-3 rounded-2xl font-bold transition-all duration-300 group
          ${isActive 
            ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 dark:shadow-none translate-x-1' 
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400'
          }
        `}
      >
        <Icon size={22} className={isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400'} />
        <span className="tracking-tight">{label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 transition-opacity animate-in fade-in"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700
        transition-all duration-500 transform lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-none">
                <GraduationCap className="text-white" size={24} />
              </div>
              <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">EDU-ERP</span>
            </div>
            <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Nav Section */}
          <nav className="flex-1 overflow-y-auto p-6 space-y-2">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 ml-4">Main Menu</p>
            {links.map((link) => (
              <NavLink key={link.path} to={link.path} icon={link.icon} label={link.name} />
            ))}
          </nav>

          {/* User Profile Section */}
          <div className="p-6 border-t border-gray-50 dark:border-gray-700">
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-4 flex items-center space-x-3 border border-transparent dark:border-gray-800">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center text-blue-600 font-black shadow-sm border border-gray-100 dark:border-gray-700">
                {user?.name?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-gray-900 dark:text-white truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">{user?.role || 'Guest'}</p>
              </div>
            </div>
            
            <button className="mt-6 w-full flex items-center space-x-3 px-4 py-3 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-bold transition-all group">
              <Settings size={20} className="group-hover:rotate-45 transition-transform duration-500" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
