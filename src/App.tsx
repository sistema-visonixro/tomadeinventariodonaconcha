import { useState } from "react";
import Login, { type UsuarioSesion } from "./Login";
import Home from "./Home";
import TomaInventario from "./TomaInventario";
import Historial from "./Historial";

type Pantalla = "home" | "tomar" | "historial";

export default function App() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(() => {
    try {
      const s = sessionStorage.getItem("inv_usuario");
      return s ? (JSON.parse(s) as UsuarioSesion) : null;
    } catch {
      return null;
    }
  });
  const [pantalla, setPantalla] = useState<Pantalla>("home");

  const handleLogin = (user: UsuarioSesion) => {
    sessionStorage.setItem("inv_usuario", JSON.stringify(user));
    setUsuario(user);
    setPantalla("home");
  };

  const handleLogout = () => {
    sessionStorage.removeItem("inv_usuario");
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
        onHome={() => setPantalla("home")}
      />
    );
  }

  if (pantalla === "historial") {
    return <Historial usuario={usuario} onVolver={() => setPantalla("home")} />;
  }

  return (
    <Home
      usuario={usuario}
      onTomar={() => setPantalla("tomar")}
      onHistorial={() => setPantalla("historial")}
      onLogout={handleLogout}
    />
  );
}
