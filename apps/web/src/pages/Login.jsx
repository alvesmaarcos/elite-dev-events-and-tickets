import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ErroDeRede } from "../api/client";

// Cada papel tem um "inicio" diferente. Mandar todo mundo para a pagina
// inicial obrigaria a portaria e o organizador a navegar ate o proprio
// lugar de trabalho toda vez que entram.
function destinoDoPapel(role) {
  if (role === "ORGANIZER") return "/organizador";
  if (role === "GATE") return "/portaria";
  return "/filmes";
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();   
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      const usuario = await login(email, password);
      navigate(destinoDoPapel(usuario.role));
    } catch (e) {
      // Antes, QUALQUER falha virava "e-mail ou senha invalidos" -- inclusive
      // servidor fora do ar. A pessoa ficava conferindo a senha certa de novo
      // e de novo enquanto o problema estava do outro lado.
      if (e instanceof ErroDeRede) {
        setErro(
          "Servidor fora de alcance. Ele pode estar hibernando: tente de novo em alguns segundos."
        );
      } else if (e.status === 401) {
        setErro("E-mail ou senha invalidos.");
      } else {
        setErro("Nao foi possivel entrar agora. " + e.message);
      }
    } finally {
      setOcupado(false);
    }
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
