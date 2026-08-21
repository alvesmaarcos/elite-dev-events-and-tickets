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

    // Devolvido para que a tela de login saiba PARA ONDE mandar a pessoa:
    // o "inicio" de um organizador nao e o mesmo de um cliente. O estado do
    // contexto ainda nao esta atualizado nesse instante, entao quem chamou
    // precisa receber o usuario de volta.
    return dados.user;
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
