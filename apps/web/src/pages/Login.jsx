import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { session, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      await login(email, password);
    } catch {
      setErro("E-mail ou senha invalidos.");
    } finally {
      setOcupado(false);
    }
  }

  if (session) {
    return (
      <div className="page page-narrow">
        <h1>Voce esta logado</h1>
        <p className="muted">
          {session.name} — {session.role}
        </p>
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <h1>Entrar</h1>

      <form onSubmit={handleSubmit} className="form">
        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {erro && <p className="error">{erro}</p>}

        <button type="submit" disabled={ocupado}>
          {ocupado ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <div className="hint-box">
        <p><strong>Contas de teste</strong> (senha: 12345678)</p>
        <ul>
          <li>organizador@gmail.com</li>
          <li>cliente1@gmail.com</li>
          <li>portaria@gmail.com</li>
        </ul>
      </div>
    </div>
  );
}
