import { useState } from "react";
import { Unlock, Search, ShieldCheck } from "lucide-react";
import API from "../../api/axios";
import Card from "../Card";
import Input from "../Input";
import Button from "../Button";
import Alert from "../Alert";

const UnlockProfileForm = () => {
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId) {
      setMessage({ type: "error", text: "Student ID is required" });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      await API.put(`/admin/unlock-student-profile/${studentId}`);
      setMessage({ type: "success", text: "Student profile unlocked successfully!" });
      setStudentId("");
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to unlock profile" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Security Management" className="h-full">
      <div className="flex items-center space-x-3 mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl border border-yellow-100 dark:border-yellow-900/20">
        <ShieldCheck className="text-yellow-600 dark:text-yellow-500" size={20} />
        <p className="text-xs font-bold text-yellow-700 dark:text-yellow-500 leading-tight">
          Unlocking a student profile allows them to edit restricted fields. Use with caution.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Alert 
          type={message.type} 
          message={message.text} 
          onClose={() => setMessage({ type: "", text: "" })} 
        />

        <Input
          label="Student ID / Roll No"
          placeholder="Enter ID to Unlock"
          icon={Search}
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />

        <Button
          type="submit"
          variant="secondary"
          className="w-full mt-4 py-3 shadow-lg shadow-gray-100 dark:shadow-none font-bold"
          loading={loading}
          icon={Unlock}
        >
          Unlock Student Profile
        </Button>
      </form>
    </Card>
  );
};

export default UnlockProfileForm;
