import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { Landing } from "./pages/Landing";
import { EventsList } from "./pages/EventsList";
import { EventDetail } from "./pages/EventDetail";
import { OrganizerDashboard } from "./pages/OrganizerDashboard";
import { MyTickets } from "./pages/MyTickets";
import { Gate } from "./pages/Gate";
import { Store } from "./pages/Store";
import { SharedTicket } from "./pages/SharedTicket";

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
        {/* A portaria nao compra ingresso: a vitrine so tiraria espaco do
            unico link que ela usa. */}
        {!["GATE", "STORE"].includes(session?.role) && (
          <Link to="/filmes">Em cartaz</Link>
        )}
        {session?.role === "CLIENT" && (
          <Link to="/meus-ingressos">Meus ingressos</Link>
        )}
        {session?.role === "ORGANIZER" && <Link to="/organizador">Painel</Link>}
        {session?.role === "GATE" && <Link to="/portaria">Portaria</Link>}
        {session?.role === "STORE" && <Link to="/loja">Loja</Link>}
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
          <Route path="/" element={<Landing />} />
          <Route path="/filmes" element={<EventsList />} />
          <Route path="/filmes/:id" element={<EventDetail />} />
          {/* O endereco antigo continua valendo: quem tiver o link salvo de
              uma sessao nao pode cair num 404 por causa da renomeacao. */}
          <Route path="/eventos/:id" element={<EventDetail />} />
          <Route path="/organizador" element={<OrganizerDashboard />} />
          <Route path="/meus-ingressos" element={<MyTickets />} />
          <Route path="/portaria" element={<Gate />} />
          <Route path="/loja" element={<Store />} />
          <Route path="/ingresso/:code" element={<SharedTicket />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
