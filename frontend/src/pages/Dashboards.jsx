import { 
  Users, 
  Wallet, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Download
} from "lucide-react";
import { useState, useEffect } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import Card from "../components/Card";
import { SkeletonCard } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <Card className="hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden relative group">
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 ${color} group-hover:scale-125 transition-transform duration-500`}></div>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">{title}</p>
        <h3 className="text-3xl font-black text-gray-900 dark:text-white mt-2 tracking-tight">{value}</h3>
        {trend && (
          <p className={`text-xs font-bold mt-3 flex items-center ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
            <TrendingUp size={14} className="mr-1" />
            {trend > 0 ? '+' : ''}{trend}%
            <span className="text-gray-400 dark:text-gray-500 ml-1 font-medium">vs last month</span>
          </p>
        )}
      </div>
      <div className={`p-4 rounded-2xl ${color} bg-opacity-10 text-opacity-100 shadow-sm`}>
        <Icon size={24} className={color.replace('bg-', 'text-')} />
      </div>
    </div>
  </Card>
);

const ActivityItem = ({ title, time, status }) => (
  <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-2xl transition-all cursor-pointer group">
    <div className="flex items-center space-x-4">
      <div className={`p-2.5 rounded-xl ${
        status === 'success' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 
        status === 'warning' ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' : 
        'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
      }`}>
        {status === 'success' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
      </div>
      <div>
        <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{title}</h4>
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mt-0.5">{time}</p>
      </div>
    </div>
    <button className="text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 transition-colors">
      <AlertCircle size={18} />
    </button>
  </div>
);

const Dashboard = ({ title }) => {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    // Simulate API fetch
    const timer = setTimeout(() => {
      setLoading(false);
      setActivities([
        { title: "Attendance marked for CSE-Sem4", time: "10 mins ago", status: "success" },
        { title: "New fee payment received: #492", time: "2 hours ago", status: "info" },
        { title: "Mid-term exam marks uploaded", time: "5 hours ago", status: "success" },
        { title: "Holiday announced: 25th March", time: "1 day ago", status: "warning" },
      ]);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="animate-in slide-in-from-left duration-500">
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{title} Portal</h1>
            <p className="text-gray-500 dark:text-gray-400 font-bold mt-2">Welcome back! Here's your daily overview.</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="secondary" icon={Download}>Reports</Button>
            <Button variant="primary" icon={Plus}>Action</Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <StatCard title="Total Students" value="1,284" icon={Users} color="bg-blue-500" trend={12} />
              <StatCard title="Active Courses" value="48" icon={Clock} color="bg-purple-500" trend={5} />
              <StatCard title="Total Revenue" value="$42,500" icon={Wallet} color="bg-green-500" trend={-2} />
              <StatCard title="Attendance" value="94.2%" icon={CheckCircle2} color="bg-yellow-500" trend={3} />
            </>
          )}
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <Card 
              title="Performance Overview" 
              headerAction={<button className="text-blue-600 dark:text-blue-400 text-sm font-black hover:underline uppercase tracking-wider">Historical Data</button>}
            >
              <div className="h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <EmptyState 
                  title="No statistics yet" 
                  description="Start recording data to see your performance analytics here." 
                />
              </div>
            </Card>
          </div>

          <div className="space-y-8">
            <Card title="Recent Activity">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center space-x-4 p-2">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-100 dark:bg-gray-700 animate-pulse rounded w-3/4" />
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 animate-pulse rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities.length > 0 ? (
                <div className="space-y-2">
                  {activities.map((activity, index) => (
                    <ActivityItem key={index} {...activity} />
                  ))}
                </div>
              ) : (
                <EmptyState title="No activity" description="There have been no recent events." />
              )}
              {!loading && (
                <button className="w-full mt-6 py-3 text-sm font-black text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all uppercase tracking-widest border-t border-gray-50 dark:border-gray-700">
                  View Full Logs
                </button>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export const TeacherDashboard = () => <Dashboard title="Teacher" />;
export const StudentDashboard = () => <Dashboard title="Student" />;
