import { Link, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";

function Nav() {
  const { session, logout } = useAuth();

  return (
    <header className="nav">
      <Link to="/" className="brand">Elite Tickets</Link>

      <nav></nav>

      <div>
        {session ? (
          <span className="user-chip">
            {session.name} <em>({session.role})</em>
            <button className="link" onClick={logout}>Sair</button>
          </span>
        ) : (
          <Link to="/login">Entrar</Link>
        )}
      </div>
    </header>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Nav />
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
