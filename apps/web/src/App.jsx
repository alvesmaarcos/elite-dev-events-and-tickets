import { Link, Routes } from "react-router-dom";

function Nav() {
  return (
    <header className="nav">
      <Link to="/" className="brand">Elite Tickets</Link>
      <nav></nav>
      <div></div>
    </header>
  );
}

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Routes>
          {}
        </Routes>
      </main>
    </>
  );
}
