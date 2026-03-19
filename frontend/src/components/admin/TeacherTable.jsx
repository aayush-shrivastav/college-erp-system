import { useState, useEffect } from "react";
import { Search, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import API from "../../api/axios";
import Card from "../Card";
import Button from "../Button";
import Alert from "../Alert";
import ConfirmModal from "../ConfirmModal";
import EditUserModal from "./EditUserModal";

const TeacherTable = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");
  
  // Modals
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [deletingTeacher, setDeletingTeacher] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/admin/teachers?search=${searchTerm}&page=${page}`);
      setTeachers(data.teachers || data); 
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError("Failed to fetch faculty directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [page, searchTerm]);

  const handleUpdate = async (updatedData) => {
    setActionLoading(true);
    try {
      await API.put(`/admin/teacher/${editingTeacher.id}`, updatedData);
      setEditingTeacher(null);
      fetchTeachers();
    } catch (err) {
      setError(err.response?.data?.message || "Update failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await API.delete(`/admin/teacher/${deletingTeacher.id}`);
      setDeletingTeacher(null);
      fetchTeachers();
    } catch (err) {
      setError("Delete operation failed.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert type="error" message={error} onClose={() => setError("")} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search faculty by name, email, or dept..."
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Card className="overflow-hidden p-0 border-0 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Faculty Member</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Department</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Employee ID</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="4" className="px-6 py-8">
                      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : teachers.length > 0 ? (
                teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="font-black text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{teacher.name}</div>
                      <div className="text-xs font-bold text-gray-400 mt-1">{teacher.user?.email || teacher.email}</div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-black tracking-wider border border-purple-100 dark:border-purple-900/30">
                        {teacher.department}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs font-black text-gray-500">{teacher.id.split('-')[0]}...</div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingTeacher(teacher)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => setDeletingTeacher(teacher)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-sm">
                    No faculty found reaching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination placeholder */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Page {page} of {totalPages}
            </span>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                disabled={page === 1}
                onClick={() => setPage(prev => prev - 1)}
                icon={ChevronLeft}
              />
              <Button
                variant="ghost"
                disabled={page === totalPages}
                onClick={() => setPage(prev => prev + 1)}
                icon={ChevronRight}
              />
            </div>
          </div>
        )}
      </Card>

      <EditUserModal 
        isOpen={!!editingTeacher}
        onClose={() => setEditingTeacher(null)}
        user={editingTeacher}
        onSave={handleUpdate}
        loading={actionLoading}
        type="teacher"
      />

      <ConfirmModal
        isOpen={!!deletingTeacher}
        onClose={() => setDeletingTeacher(null)}
        onConfirm={handleDelete}
        title="Delete Faculty Profile"
        message={`Are you sure you want to delete ${deletingTeacher?.name}? This will revoke their access to the attendance system.`}
        isLoading={actionLoading}
      />
    </div>
  );
};

export default TeacherTable;
