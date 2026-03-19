import { useState } from "react";
import Login, { type UsuarioSesion } from "./Login";
import Home from "./Home";
import TomaInventario from "./TomaInventario";
import Historial from "./Historial";

type Pantalla = "home" | "tomar" | "historial";

export default function App() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(() => {
    try {
      const s = localStorage.getItem("inv_usuario");
      return s ? (JSON.parse(s) as UsuarioSesion) : null;
    } catch {
      return null;
    }
  });
  const [pantalla, setPantalla] = useState<Pantalla>(() => {
    try {
      const p = localStorage.getItem("inv_pantalla");
      return (p as Pantalla) || "home";
    } catch {
      return "home";
    }
  });

  const setPantallaGuardada = (p: Pantalla) => {
    localStorage.setItem("inv_pantalla", p);
    setPantalla(p);
  };

  const handleLogin = (user: UsuarioSesion) => {
    localStorage.setItem("inv_usuario", JSON.stringify(user));
    setUsuario(user);
    setPantallaGuardada("home");
  };

  const handleLogout = () => {
    localStorage.removeItem("inv_usuario");
    localStorage.removeItem("inv_pantalla");
    setUsuario(null);
  };

  if (!usuario) {
    return <Login onLogin={handleLogin} />;
  }

  if (pantalla === "tomar") {
    return (
      <TomaInventario
        usuario={usuario}
        onLogout={handleLogout}
        onHome={() => setPantallaGuardada("home")}
      />
    );
  }

  if (pantalla === "historial") {
    return <Historial usuario={usuario} onVolver={() => setPantallaGuardada("home")} />;
  }

  return (
    <Home
      usuario={usuario}
      onTomar={() => setPantallaGuardada("tomar")}
      onHistorial={() => setPantallaGuardada("historial")}
      onLogout={handleLogout}
    />
  );
}
