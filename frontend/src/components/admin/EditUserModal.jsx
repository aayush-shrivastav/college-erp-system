import { useState } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import Card from "../Card";
import Input from "../Input";
import Button from "../Button";
import Alert from "../Alert";

const EditUserModal = ({ isOpen, onClose, user, onSave, loading, type }) => {
  const [formData, setFormData] = useState(user || {});
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    // Basic presence check
    const required = type === 'student' ? ['name', 'branch', 'batchYear', 'currentSem'] : ['name', 'department'];
    for (const field of required) {
      if (!formData[field]) {
        setError(`${field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')} is required`);
        return;
      }
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-2xl animate-in zoom-in-95 duration-300">
        <Card 
          title={`Edit ${type === 'student' ? 'Student' : 'Teacher'}`}
          headerAction={
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <X size={20} />
            </button>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <Alert type="error" message={error} onClose={() => setError("")} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Input
                label="Email (View Only)"
                value={formData.email || ""}
                disabled
                className="opacity-60"
              />
              {type === 'student' ? (
                <>
                  <Input
                    label="Branch"
                    value={formData.branch || ""}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  />
                  <Input
                    label="Roll No"
                    value={formData.rollNo || ""}
                    onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                  />
                  <Input
                    label="Batch Year"
                    value={formData.batchYear || ""}
                    onChange={(e) => setFormData({ ...formData, batchYear: e.target.value })}
                  />
                  <Input
                    label="Current Sem"
                    type="number"
                    value={formData.currentSem || ""}
                    onChange={(e) => setFormData({ ...formData, currentSem: e.target.value })}
                  />
                </>
              ) : (
                <Input
                  label="Department"
                  value={formData.department || ""}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
              <Button type="submit" loading={loading} icon={Save}>Save Changes</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default EditUserModal;
