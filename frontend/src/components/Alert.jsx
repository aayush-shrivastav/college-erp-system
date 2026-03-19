import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

const Alert = ({ type = 'info', message, onClose }) => {
  const styles = {
    info: "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:border-blue-900/30 dark:text-blue-400",
    success: "bg-green-50 border-green-100 text-green-700 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-400",
    error: "bg-red-50 border-red-100 text-red-700 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400",
    warning: "bg-yellow-50 border-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-900/30 dark:text-yellow-400",
  };

  const Icons = {
    info: Info,
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertCircle
  };

  const Icon = Icons[type];

  if (!message) return null;

  return (
    <div className={`flex items-center p-4 mb-4 text-sm border rounded-xl ${styles[type]}`}>
      <Icon className="flex-shrink-0 w-5 h-5 mr-3" />
      <div className="font-medium">{message}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-auto -mx-1.5 -my-1.5 p-1.5 inline-flex h-8 w-8 text-current opacity-70 hover:opacity-100 rounded-lg"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};

export default Alert;
