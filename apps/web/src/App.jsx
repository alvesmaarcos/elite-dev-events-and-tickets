import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { EventsList } from "./pages/EventsList";
import { EventDetail } from "./pages/EventDetail";
import { OrganizerDashboard } from "./pages/OrganizerDashboard";

function Nav() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  function sair() {
    logout();
    navigate("/");
  }

  return (
    <header className="nav">
      <Link to="/" className="brand">Elite Tickets</Link>

      <nav>
        <Link to="/">Eventos</Link>
        {session?.role === "ORGANIZER" && <Link to="/organizador">Painel</Link>}
      </nav>

      <div>
        {session ? (
          <span className="user-chip">
            {session.name} <em>({session.role})</em>
            <button className="link" onClick={sair}>Sair</button>
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
          <Route path="/" element={<EventsList />} />
          <Route path="/eventos/:id" element={<EventDetail />} />
          <Route path="/organizador" element={<OrganizerDashboard />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
