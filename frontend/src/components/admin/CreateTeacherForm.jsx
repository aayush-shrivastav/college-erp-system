import { useState } from "react";
import { UserPlus, Mail, Briefcase, GraduationCap } from "lucide-react";
import API from "../../api/axios";
import Card from "../Card";
import Input from "../Input";
import Button from "../Button";
import Alert from "../Alert";

const CreateTeacherForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employeeId: "",
    department: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const validate = () => {
    if (!formData.name || !formData.email || !formData.employeeId || !formData.department) {
      setMessage({ type: "error", text: "All fields are required" });
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setMessage({ type: "error", text: "Invalid email format" });
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
      await API.post("/admin/create-teacher", formData);
      setMessage({ type: "success", text: "Teacher created successfully!" });
      setFormData({ name: "", email: "", employeeId: "", department: "" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to create teacher" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Onboard New Faculty" className="h-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Alert 
          type={message.type} 
          message={message.text} 
          onClose={() => setMessage({ type: "", text: "" })} 
        />

        <div className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Dr. Smith"
            icon={UserPlus}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="smith@college.com"
            icon={Mail}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Employee ID"
            placeholder="TCH-2024-001"
            icon={Briefcase}
            value={formData.employeeId}
            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
          />
          <Input
            label="Department"
            placeholder="Information Technology"
            icon={GraduationCap}
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          />
        </div>

        <Button
          type="submit"
          className="w-full mt-4 py-3 shadow-lg shadow-blue-100 dark:shadow-none font-bold"
          loading={loading}
        >
          Create Teacher Account
        </Button>
      </form>
    </Card>
  );
};

export default CreateTeacherForm;
