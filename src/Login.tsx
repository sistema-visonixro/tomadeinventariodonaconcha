import { useState } from "react";
import { supabase } from "./supabaseClient";

interface LoginProps {
  onLogin: (user: UsuarioSesion) => void;
}

export interface UsuarioSesion {
  id: string;
  nombre: string;
  rol: string;
}

export default function Login({ onLogin }: LoginProps) {
  const [codigo, setCodigo] = useState("");
  const [clave, setClave] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("usuarios")
        .select("id, nombre, rol")
        .eq("codigo", codigo.trim())
        .eq("clave", clave.trim())
        .single();

      if (err || !data) {
        setError("Código o clave incorrectos.");
        return;
      }

      if (data.rol !== "inventario") {
        setError("Acceso denegado. Solo usuarios con rol inventario.");
        return;
      }

      onLogin({ id: data.id, nombre: data.nombre, rol: data.rol });
    } catch {
      setError("Error de conexión. Verifica tu red.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen login-bg">
      <form className="login-card" onSubmit={handleSubmit} autoComplete="off">
        <div style={{ textAlign: "center", fontSize: "3rem" }}>📦</div>
        <h1 className="login-title">Toma de Inventario</h1>
        <p className="login-subtitle">Solo personal de inventario</p>

        <div className="field">
          <label>Código</label>
          <input
            type="text"
            inputMode="text"
            placeholder="Tu código de usuario"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            autoFocus
          />
        </div>

        <div className="field">
          <label>Clave</label>
          <input
            type="password"
            placeholder="••••••"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !codigo || !clave}
        >
          {loading ? "Verificando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
