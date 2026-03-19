import { useState } from "react";
import type { UsuarioSesion } from "./Login";
import MovimientoModal from "./MovimientoModal";

interface Props {
  usuario: UsuarioSesion;
  onTomar: () => void;
  onHistorial: () => void;
  onLogout: () => void;
}

export default function Home({
  usuario,
  onTomar,
  onHistorial,
  onLogout,
}: Props) {
  const [mostrarMovimiento, setMostrarMovimiento] = useState(false);

  return (
    <div className="screen">
      {/* Header */}
      <div className="header">
        <div style={{ flex: 1 }}>
          <div className="header-title">📦 Inventario</div>
          <div className="header-sub">Bienvenido, {usuario.nombre}</div>
        </div>
        <button
          className="icon-btn"
          onClick={onLogout}
          title="Cerrar sesión"
          style={{ fontSize: "0.75rem", width: "auto", padding: "0 12px" }}
        >
          Salir
        </button>
      </div>

      {/* Contenido */}
      <div className="home-content">
        <p className="home-subtitle">¿Qué deseas hacer?</p>

        <button className="home-btn home-btn-primary" onClick={onTomar}>
          <span className="home-btn-icon">📋</span>
          <div className="home-btn-text">
            <span className="home-btn-title">Tomar inventario</span>
            <span className="home-btn-desc">
              Iniciar un conteo físico nuevo
            </span>
          </div>
          <span className="home-btn-arrow">›</span>
        </button>

        <button
          className="home-btn home-btn-mov"
          onClick={() => setMostrarMovimiento(true)}
        >
          <span className="home-btn-icon">🔄</span>
          <div className="home-btn-text">
            <span className="home-btn-title">Registrar movimiento</span>
            <span className="home-btn-desc">
              Entrada o salida de producto
            </span>
          </div>
          <span className="home-btn-arrow">›</span>
        </button>

        <button className="home-btn home-btn-secondary" onClick={onHistorial}>
          <span className="home-btn-icon">🗂️</span>
          <div className="home-btn-text">
            <span className="home-btn-title">Historial de tomas</span>
            <span className="home-btn-desc">
              Consultar y reimprimir tomas anteriores
            </span>
          </div>
          <span className="home-btn-arrow">›</span>
        </button>
      </div>

      {/* Modal de movimiento */}
      {mostrarMovimiento && (
        <MovimientoModal
          usuario={usuario}
          onClose={() => setMostrarMovimiento(false)}
        />
      )}
    </div>
  );
}

