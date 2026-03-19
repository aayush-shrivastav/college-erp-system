import { useState } from "react";
import { UserPlus, Mail, Hash, Book, Calendar, Layers } from "lucide-react";
import API from "../../api/axios";
import Card from "../Card";
import Input from "../Input";
import Button from "../Button";
import Alert from "../Alert";

const CreateStudentForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    rollNo: "",
    branch: "",
    batchYear: "",
    currentSem: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const validate = () => {
    if (!formData.name || !formData.email || !formData.rollNo || !formData.branch || !formData.batchYear || !formData.currentSem) {
      setMessage({ type: "error", text: "All fields are required" });
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setMessage({ type: "error", text: "Invalid email format" });
      return false;
    }
    if (isNaN(formData.batchYear) || formData.batchYear.length !== 4) {
      setMessage({ type: "error", text: "Batch Year must be a 4-digit number" });
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
      await API.post("/admin/create-student", {
        ...formData,
        batchYear: parseInt(formData.batchYear),
        currentSem: parseInt(formData.currentSem)
      });
      setMessage({ type: "success", text: "Student created successfully!" });
      setFormData({ name: "", email: "", rollNo: "", branch: "", batchYear: "", currentSem: "" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to create student" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Enroll New Student" className="h-full">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Alert 
          type={message.type} 
          message={message.text} 
          onClose={() => setMessage({ type: "", text: "" })} 
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            placeholder="John Doe"
            icon={UserPlus}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="john@example.com"
            icon={Mail}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Roll Number"
            placeholder="21CSE001"
            icon={Hash}
            value={formData.rollNo}
            onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
          />
          <Input
            label="Branch"
            placeholder="Computer Science"
            icon={Book}
            value={formData.branch}
            onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
          />
          <Input
            label="Batch Year"
            placeholder="2021"
            icon={Calendar}
            value={formData.batchYear}
            onChange={(e) => setFormData({ ...formData, batchYear: e.target.value })}
          />
          <Input
            label="Current Semester"
            type="number"
            placeholder="4"
            icon={Layers}
            value={formData.currentSem}
            onChange={(e) => setFormData({ ...formData, currentSem: e.target.value })}
          />
        </div>

        <Button
          type="submit"
          className="w-full mt-2 py-3 shadow-lg shadow-blue-100 dark:shadow-none"
          loading={loading}
        >
          Create Student Account
        </Button>
      </form>
    </Card>
  );
};

export default CreateStudentForm;
