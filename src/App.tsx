import { useState } from "react";
import Login, { type UsuarioSesion } from "./Login";
import TomaInventario from "./TomaInventario";

export default function App() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(() => {
    try {
      const s = sessionStorage.getItem("inv_usuario");
      return s ? (JSON.parse(s) as UsuarioSesion) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (user: UsuarioSesion) => {
    sessionStorage.setItem("inv_usuario", JSON.stringify(user));
    setUsuario(user);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("inv_usuario");
    setUsuario(null);
  };

  if (!usuario) {
    return <Login onLogin={handleLogin} />;
  }

  return <TomaInventario usuario={usuario} onLogout={handleLogout} />;
}
