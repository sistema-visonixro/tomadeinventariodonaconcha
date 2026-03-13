import { useState } from "react";
import { supabase } from "./supabaseClient";
import type { UsuarioSesion } from "./Login";

interface ConteoItem {
  id: string;
  nombre: string;
  stock_sistema: number;
  conteo: number;
}

interface Props {
  productos: ConteoItem[];
  usuario: UsuarioSesion;
  onReiniciar: () => void;
  onLogout: () => void;
  onVolver: () => void;
}

type Filtro = "todos" | "faltantes" | "sobrantes" | "exactos";

export default function Resumen({
  productos,
  usuario,
  onReiniciar,
  onLogout,
  onVolver,
}: Props) {
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  const faltantes = productos.filter(
    (p) => p.conteo - p.stock_sistema < 0
  );
  const sobrantes = productos.filter(
    (p) => p.conteo - p.stock_sistema > 0
  );
  const exactos = productos.filter(
    (p) => p.conteo - p.stock_sistema === 0
  );

  const productosFiltrados = (() => {
    switch (filtro) {
      case "faltantes": return faltantes;
      case "sobrantes": return sobrantes;
      case "exactos":   return exactos;
      default:          return productos;
    }
  })();

  const guardarEnDB = async () => {
    setGuardando(true);
    try {
      const fecha = new Date().toISOString();
      // Insertamos un movimiento de "toma_fisica" con la diferencia como ajuste
      const filas = productos
        .filter((p) => p.conteo - p.stock_sistema !== 0)
        .map((p) => {
          const diff = p.conteo - p.stock_sistema;
          return {
            item_tipo: "producto",
            producto_id: p.id,
            tipo: diff > 0 ? "ajuste_positivo" : "ajuste_negativo",
            cantidad: Math.abs(diff),
            referencia_tipo: "toma_fisica",
            nota: `Toma física por ${usuario.nombre} — sistema: ${p.stock_sistema}, conteo: ${p.conteo}`,
            cajero: usuario.nombre,
            created_at: fecha,
          };
        });

      if (filas.length > 0) {
        const { error } = await supabase
          .from("movimientos_inventario")
          .insert(filas);
        if (error) throw error;
      }

      setGuardado(true);
      showToast("✅ Ajustes guardados correctamente");
    } catch (err: any) {
      showToast(`❌ Error: ${err?.message || "No se pudo guardar"}`);
    } finally {
      setGuardando(false);
    }
  };

  const diffClass = (d: number) =>
    d === 0
      ? "rt-num rt-diff-ok"
      : d < 0
        ? "rt-num rt-diff-falta"
        : "rt-num rt-diff-sobre";

  const rowClass = (d: number) =>
    d === 0 ? "rt-row" : d < 0 ? "rt-row rt-row-falta" : "rt-row rt-row-sobre";

  return (
    <div className="screen">
      {/* Header */}
      <div className="header">
        <button className="icon-btn" onClick={onVolver} title="Volver">
          ←
        </button>
        <div className="header-title">Resumen de toma</div>
      </div>

      {/* Contenido scroll */}
      <div className="resumen-screen">
        {/* Tarjetas de resumen */}
        <div className="resumen-stats">
          <div className="stat-card">
            <div className={`stat-value stat-falta`}>{faltantes.length}</div>
            <div className="stat-label">Faltantes</div>
          </div>
          <div className="stat-card">
            <div className={`stat-value stat-sobre`}>{sobrantes.length}</div>
            <div className="stat-label">Sobrantes</div>
          </div>
          <div className="stat-card">
            <div className={`stat-value stat-ok`}>{exactos.length}</div>
            <div className="stat-label">Exactos</div>
          </div>
        </div>

        {/* Filtro rápido */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {(
            [
              { key: "todos",     label: `Todos (${productos.length})` },
              { key: "faltantes", label: `⬇ Falta (${faltantes.length})` },
              { key: "sobrantes", label: `⬆ Sobra (${sobrantes.length})` },
              { key: "exactos",   label: `✓ Ok (${exactos.length})` },
            ] as { key: Filtro; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              className={`btn ${filtro === key ? "btn-primary" : "btn-secondary"}`}
              style={{ whiteSpace: "nowrap", padding: "8px 14px", fontSize: "0.8rem" }}
              onClick={() => setFiltro(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="resumen-table">
          <div className="rt-head">
            <span>Producto</span>
            <span style={{ textAlign: "right" }}>Sist.</span>
            <span style={{ textAlign: "right" }}>Conteo</span>
            <span style={{ textAlign: "right" }}>Dif.</span>
          </div>
          {productosFiltrados.map((p) => {
            const d = p.conteo - p.stock_sistema;
            return (
              <div key={p.id} className={rowClass(d)}>
                <span className="rt-nombre">{p.nombre}</span>
                <span className="rt-num">{p.stock_sistema.toFixed(0)}</span>
                <span className="rt-num">{p.conteo}</span>
                <span className={diffClass(d)}>
                  {d === 0 ? "–" : d > 0 ? `+${d}` : d}
                </span>
              </div>
            );
          })}
        </div>

        {/* Nota aclaratoria */}
        {!guardado && (
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--gray-500)",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            Guardar aplicará los ajustes como movimientos de inventario para
            cuadrar el stock del sistema con lo contado.
          </p>
        )}
      </div>

      {/* Botones de acción */}
      <div className="save-row">
        {!guardado ? (
          <>
            <button
              className="btn btn-success"
              onClick={guardarEnDB}
              disabled={guardando}
            >
              {guardando ? "Guardando…" : "💾 Guardar ajustes en sistema"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={onReiniciar}
              disabled={guardando}
            >
              🔄 Reiniciar conteo
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                background: "#dcfce7",
                color: "var(--green)",
                borderRadius: 12,
                padding: "14px",
                textAlign: "center",
                fontWeight: 700,
              }}
            >
              ✅ Ajustes guardados correctamente
            </div>
            <button className="btn btn-secondary" onClick={onLogout}>
              Cerrar sesión
            </button>
            <button className="btn btn-primary" onClick={onReiniciar}>
              Nueva toma
            </button>
          </>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
