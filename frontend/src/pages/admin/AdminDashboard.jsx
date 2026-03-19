import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  ShieldAlert,
  LayoutDashboard,
  Zap,
  Database
} from "lucide-react";
import { useState } from "react";
import DashboardLayout from "../../layout/DashboardLayout";
import CreateStudentForm from "../../components/admin/CreateStudentForm";
import CreateTeacherForm from "../../components/admin/CreateTeacherForm";
import AssignSubjectForm from "../../components/admin/AssignSubjectForm";
import UnlockProfileForm from "../../components/admin/UnlockProfileForm";
import StudentTable from "../../components/admin/StudentTable";
import TeacherTable from "../../components/admin/TeacherTable";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("quick"); // 'quick' or 'manage'
  const [manageSubTab, setManageSubTab] = useState("students"); // 'students' or 'teachers'

  return (
    <DashboardLayout>
      <div className="space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="animate-in slide-in-from-left duration-500">
            <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400 mb-2">
              <LayoutDashboard size={20} />
              <span className="text-xs font-black uppercase tracking-[0.2em]">Management Suite</span>
            </div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Admin Control Center</h1>
            <p className="text-gray-500 dark:text-gray-400 font-bold mt-2">Manage institutional data and academic configurations.</p>
          </div>

          {/* Tab Switcher */}
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit self-start md:self-center">
            <button
              onClick={() => setActiveTab("quick")}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                activeTab === "quick" 
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm" 
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <Zap size={18} />
              <span>Quick Actions</span>
            </button>
            <button
              onClick={() => setActiveTab("manage")}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                activeTab === "manage" 
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm" 
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <Database size={18} />
              <span>Manage Data</span>
            </button>
          </div>
        </div>

        {activeTab === "quick" ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 px-2 text-blue-600 uppercase tracking-widest text-[11px] font-black">
                <Users size={14} />
                <span>Student Management</span>
              </div>
              <CreateStudentForm />
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2 px-2 text-purple-600 uppercase tracking-widest text-[11px] font-black">
                <GraduationCap size={14} />
                <span>Faculty Onboarding</span>
              </div>
              <CreateTeacherForm />
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2 px-2 text-green-600 uppercase tracking-widest text-[11px] font-black">
                <BookOpen size={14} />
                <span>Academic Setup</span>
              </div>
              <AssignSubjectForm />
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2 px-2 text-yellow-600 uppercase tracking-widest text-[11px] font-black">
                <ShieldAlert size={14} />
                <span>Security & Access</span>
              </div>
              <UnlockProfileForm />
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sub-Tabs for Management */}
            <div className="flex space-x-4 border-b border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setManageSubTab("students")}
                className={`pb-4 px-2 text-sm font-black transition-all border-b-2 ${
                  manageSubTab === "students"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                Students Registry
              </button>
              <button
                onClick={() => setManageSubTab("teachers")}
                className={`pb-4 px-2 text-sm font-black transition-all border-b-2 ${
                  manageSubTab === "teachers"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                Faculty Directory
              </button>
            </div>

            {manageSubTab === "students" ? <StudentTable /> : <TeacherTable />}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
