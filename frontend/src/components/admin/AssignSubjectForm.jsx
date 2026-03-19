import { useState } from "react";
import { BookOpen, UserCheck, ScreenShare } from "lucide-react";
import API from "../../api/axios";
import Card from "../Card";
import Input from "../Input";
import Button from "../Button";
import Alert from "../Alert";

const AssignSubjectForm = () => {
  const [formData, setFormData] = useState({
    teacherId: "",
    subjectId: "",
    classId: "" // Added based on ERP documentation patterns
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const validate = () => {
    if (!formData.teacherId || !formData.subjectId || !formData.classId) {
      setMessage({ type: "error", text: "All IDs are required" });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      await API.post("/admin/assign-subject", formData);
      setMessage({ type: "success", text: "Subject assigned successfully!" });
      setFormData({ teacherId: "", subjectId: "", classId: "" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to assign subject" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Assign Academic Subject" className="h-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Alert 
          type={message.type} 
          message={message.text} 
          onClose={() => setMessage({ type: "", text: "" })} 
        />

        <div className="space-y-4">
          <Input
            label="Teacher ID"
            placeholder="Search or Enter ID"
            icon={UserCheck}
            value={formData.teacherId}
            onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
          />
          <Input
            label="Subject Code / ID"
            placeholder="CS-401"
            icon={BookOpen}
            value={formData.subjectId}
            onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
          />
          <Input
            label="Class / Section ID"
            placeholder="CSE-B-2021"
            icon={ScreenShare}
            value={formData.classId}
            onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
          />
        </div>

        <Button
          type="submit"
          className="w-full mt-4 py-3 shadow-lg shadow-blue-100 dark:shadow-none"
          loading={loading}
        >
          Confirm Assignment
        </Button>
      </form>
    </Card>
  );
};

export default AssignSubjectForm;
