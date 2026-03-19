import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useAuth } from "../context/AuthContext";

const DashboardLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { role } = useAuth();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors duration-300">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar} 
        role={role} 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-72 min-h-screen transition-all duration-300 dark:text-gray-100">
        <Navbar toggleSidebar={toggleSidebar} />
        
        <main className="flex-1 p-4 lg:p-8 animate-in fade-in duration-500">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        <footer className="p-4 text-center text-sm text-gray-400 border-t border-gray-100 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">
          &copy; {new Date().getFullYear()} EDU-ERP System. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
