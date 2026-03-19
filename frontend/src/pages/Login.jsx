import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import API from "../api/axios";

// Components
import Button from "../components/Button";
import Input from "../components/Input";
import Card from "../components/Card";
import Alert from "../components/Alert";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    
    // Email Validation
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password Validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      const { data } = await API.post("/auth/login", { email, password });
      login(data);
      
      const role = data.user.role;
      if (role === "ADMIN") navigate("/admin");
      else if (role === "TEACHER") navigate("/teacher");
      else navigate("/student");

    } catch (err) {
      setApiError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`
      min-h-screen flex items-center justify-center p-4 transition-colors duration-500
      ${isDarkMode 
        ? 'bg-gray-900 bg-[radial-gradient(#374151_1px,transparent_1px)]' 
        : 'bg-gray-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)]'
      }
      [background-size:16px_16px]
    `}>
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl shadow-xl shadow-blue-200 dark:shadow-none mb-6 group">
            <LogIn className="text-white group-hover:scale-110 transition-transform" size={40} />
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Welcome Back</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Please enter your details to sign in</p>
        </div>

        <Card className="shadow-2xl border-0 ring-1 ring-gray-100 dark:ring-gray-800">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Alert 
              type="error" 
              message={apiError} 
              onClose={() => setApiError("")} 
            />

            <div className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="admin@college.com"
                icon={Mail}
                value={email}
                error={errors.email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: null }));
                }}
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={Lock}
                value={password}
                error={errors.password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors(prev => ({ ...prev, password: null }));
                }}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-gray-600 dark:text-gray-400 cursor-pointer group">
                <input type="checkbox" className="rounded-lg border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 mr-2 h-5 w-5 transition-all" />
                <span className="font-bold group-hover:text-blue-600 transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-blue-600 dark:text-blue-400 font-black hover:underline tracking-tight">Forgot password?</a>
            </div>

            <Button
              type="submit"
              className="w-full py-4 text-base font-black uppercase tracking-widest shadow-xl shadow-blue-100 dark:shadow-none"
              loading={loading}
            >
              Sign In to ERP
            </Button>
          </form>
        </Card>

        <p className="text-center mt-10 text-sm text-gray-500 dark:text-gray-400 font-medium">
          Don't have an account? <span className="text-blue-600 dark:text-blue-400 font-black cursor-pointer hover:underline">Contact Admin</span>
        </p>
      </div>
    </div>
  );
};

export default Login;
