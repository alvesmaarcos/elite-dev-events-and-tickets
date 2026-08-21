import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const salvo = localStorage.getItem("elite.session");
    if (salvo) {
      const dados = JSON.parse(salvo);
      setSession(dados.user);
      setToken(dados.token);
    }
  }, []);

  async function login(email, password) {
    const dados = await api.login(email, password);
    setSession(dados.user);
    setToken(dados.token);
    localStorage.setItem("elite.session", JSON.stringify(dados));
  }

  function logout() {
    setSession(null);
    setToken(null);
    localStorage.removeItem("elite.session");
  }

  return (
    <AuthContext.Provider value={{ session, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
