import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // --- Initialize user from localStorage if token exists ---
    const savedToken = localStorage.getItem("token");
    const savedRole = localStorage.getItem("role");
    
    if (savedToken && savedRole) {
      setToken(savedToken);
      setRole(savedRole);
      // In a real app, you would fetch user details here
      setUser({ role: savedRole });
    }
    setLoading(false);
  }, []);

  const login = (data) => {
    const { token, user } = data;
    localStorage.setItem("token", token);
    localStorage.setItem("role", user.role);
    setToken(token);
    setRole(user.role);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setToken(null);
    setRole(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
