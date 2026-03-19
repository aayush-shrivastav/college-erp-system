import { Menu, User, Bell, LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";

const Navbar = ({ toggleSidebar }) => {
  const { user, logout, role } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const location = useLocation();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  return (
    <>
      <header className="h-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-700 sticky top-0 z-30 transition-all duration-300">
        <div className="h-full px-6 lg:px-10 flex items-center justify-between">
          {/* Mobile Toggle & Brand (Mobile only) */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleSidebar}
              className="lg:hidden p-2.5 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-90"
            >
              <Menu size={22} />
            </button>
            <div className="hidden lg:block">
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                {location.pathname.includes('admin') ? 'Administration' : 
                 location.pathname.includes('teacher') ? 'Faculty Portal' : 'Student Portal'}
              </h2>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-3 md:space-x-5">
            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleDarkMode}
              className="p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl transition-all active:rotate-180 duration-500"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
            </button>

            {/* Notifications */}
            <button className="p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl transition-all relative group">
              <Bell size={22} className="group-hover:animate-ring" />
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
            </button>

            <div className="h-8 w-px bg-gray-100 dark:bg-gray-700 mx-2 hidden sm:block"></div>

            {/* User Profile */}
            <div className="flex items-center space-x-4 pl-2">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-black text-gray-900 dark:text-white leading-none capitalize">{user?.name || 'User'}</p>
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 mt-1.5 uppercase leading-none tracking-widest">{role}</p>
              </div>
              
              <div className="group relative">
                <button 
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all shadow-sm active:scale-95"
                  title="Logout"
                >
                  <LogOut size={22} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <ConfirmModal 
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
        title="Confirm Logout"
        message="Are you sure you want to log out of the system? Any unsaved changes may be lost."
        confirmLabel="Logout Now"
        variant="danger"
      />
    </>
  );
};

export default Navbar;
