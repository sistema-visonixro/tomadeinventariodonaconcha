import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import type { UsuarioSesion } from "./Login";

interface DatoProducto {
  producto_id: string;
  nombre: string;
  stock_sistema: number;
  conteo: number;
  diferencia: number;
}

interface TomaHistorico {
  id: string;
  fecha: string;
  usuario_nombre: string;
  total_productos: number;
  total_ajustes: number;
  datos: DatoProducto[];
}

interface Props {
  usuario: UsuarioSesion;
  onVolver: () => void;
}

export default function Historial({ onVolver }: Props) {
  const [tomas, setTomas] = useState<TomaHistorico[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [fechaHasta, setFechaHasta] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [tomaDetalle, setTomaDetalle] = useState<TomaHistorico | null>(null);

  const buscar = async () => {
    setLoading(true);
    setError("");
    try {
      const desde = new Date(fechaDesde + "T00:00:00").toISOString();
      const hasta = new Date(fechaHasta + "T23:59:59").toISOString();
      const { data, error: err } = await supabase
        .from("historico_tomas_inventario")
        .select("*")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("fecha", { ascending: false });
      if (err) throw err;
      setTomas(data || []);
    } catch (e: any) {
      setError(e?.message || "Error al buscar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImprimir = () => window.print();

  /* ── Pantalla de detalle ── */
  if (tomaDetalle) {
    const datos = tomaDetalle.datos ?? [];
    const faltantes = datos.filter((d) => d.diferencia < 0);
    const sobrantes = datos.filter((d) => d.diferencia > 0);
    const exactos = datos.filter((d) => d.diferencia === 0);

    return (
      <>
        {/* Reporte solo para impresión */}
        <div className="print-report">
          <div className="print-header">
            <h1>📦 Toma de Inventario</h1>
            <p>
              <strong>Fecha:</strong>{" "}
              {new Date(tomaDetalle.fecha).toLocaleString("es-MX")}
            </p>
            <p>
              <strong>Usuario:</strong> {tomaDetalle.usuario_nombre}
            </p>
            <p>
              <strong>ID:</strong> {tomaDetalle.id}
            </p>
          </div>
          <table className="print-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Sistema</th>
                <th>Conteo</th>
                <th>Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((p) => (
                <tr
                  key={p.producto_id}
                  className={
                    p.diferencia < 0
                      ? "print-falta"
                      : p.diferencia > 0
                        ? "print-sobre"
                        : ""
                  }
                >
                  <td>{p.nombre}</td>
                  <td>{p.stock_sistema}</td>
                  <td>{p.conteo}</td>
                  <td>
                    {p.diferencia === 0
                      ? "–"
                      : p.diferencia > 0
                        ? `+${p.diferencia}`
                        : p.diferencia}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ paddingTop: 12, fontWeight: 600 }}>
                  Total: {tomaDetalle.total_productos} | Ajustes:{" "}
                  {tomaDetalle.total_ajustes} | Exactos: {exactos.length}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pantalla de detalle */}
        <div className="screen">
          <div className="header">
            <button
              className="icon-btn"
              onClick={() => setTomaDetalle(null)}
              title="Volver"
            >
              ←
            </button>
            <div style={{ flex: 1 }}>
              <div className="header-title">Detalle de toma</div>
              <div className="header-sub">
                {new Date(tomaDetalle.fecha).toLocaleString("es-MX")}
              </div>
            </div>
            <button
              className="icon-btn"
              onClick={handleImprimir}
              title="Imprimir"
              style={{ fontSize: "1.1rem" }}
            >
              🖨️
            </button>
          </div>

          <div className="resumen-screen">
            {/* Tarjetas */}
            <div className="resumen-stats">
              <div className="stat-card">
                <div className="stat-value stat-falta">{faltantes.length}</div>
                <div className="stat-label">Faltantes</div>
              </div>
              <div className="stat-card">
                <div className="stat-value stat-sobre">{sobrantes.length}</div>
                <div className="stat-label">Sobrantes</div>
              </div>
              <div className="stat-card">
                <div className="stat-value stat-ok">{exactos.length}</div>
                <div className="stat-label">Exactos</div>
              </div>
            </div>

            {/* Info + tabla en su propio scroll */}
            <div className="resumen-table-scroll">
              <div
                style={{
                  background: "var(--gray-100)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: "0.85rem",
                  color: "var(--gray-700)",
                  lineHeight: 1.8,
                  marginBottom: 10,
                }}
              >
                <strong>Usuario:</strong> {tomaDetalle.usuario_nombre}
                <br />
                <strong>Productos contados:</strong>{" "}
                {tomaDetalle.total_productos}
                <br />
                <strong>Ajustes aplicados:</strong> {tomaDetalle.total_ajustes}
              </div>

              {/* Tabla (solo lectura) */}
              <div className="resumen-table">
                <div className="rt-head">
                  <span>Producto</span>
                  <span style={{ textAlign: "right" }}>Sist.</span>
                  <span style={{ textAlign: "right" }}>Conteo</span>
                  <span style={{ textAlign: "right" }}>Dif.</span>
                </div>
                {datos.map((p) => {
                  const d = p.diferencia;
                  const rowCls =
                    d === 0
                      ? "rt-row"
                      : d < 0
                        ? "rt-row rt-row-falta"
                        : "rt-row rt-row-sobre";
                  const diffCls =
                    d === 0
                      ? "rt-num rt-diff-ok"
                      : d < 0
                        ? "rt-num rt-diff-falta"
                        : "rt-num rt-diff-sobre";
                  return (
                    <div key={p.producto_id} className={rowCls}>
                      <span className="rt-nombre">{p.nombre}</span>
                      <span className="rt-num">{p.stock_sistema}</span>
                      <span className="rt-num">{p.conteo}</span>
                      <span className={diffCls}>
                        {d === 0 ? "–" : d > 0 ? `+${d}` : d}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* fin resumen-screen */}

          <div className="save-row">
            <button className="btn btn-primary" onClick={handleImprimir}>
              🖨️ Imprimir reporte
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setTomaDetalle(null)}
            >
              ← Volver al historial
            </button>
          </div>
        </div>
      </>
    );
  }

  /* ── Pantalla principal del historial ── */
  return (
    <div className="screen">
      <div className="header">
        <button className="icon-btn" onClick={onVolver} title="Volver">
          ←
        </button>
        <div className="header-title">Historial de tomas</div>
      </div>

      <div className="resumen-screen">
        {/* Filtro por fecha */}
        <div className="hist-filtro">
          <div className="field" style={{ flex: 1 }}>
            <label>Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={buscar}
            disabled={loading}
            style={{ alignSelf: "flex-end", whiteSpace: "nowrap" }}
          >
            {loading ? "…" : "🔍 Buscar"}
          </button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {!loading && tomas.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "var(--gray-500)",
              padding: "48px 0",
              fontSize: "0.95rem",
            }}
          >
            📭 No hay tomas en ese período.
          </div>
        )}

        {tomas.map((t) => (
          <button
            key={t.id}
            className="hist-item"
            onClick={() => setTomaDetalle(t)}
          >
            <div style={{ flex: 1, textAlign: "left" }}>
              <div className="hist-fecha">
                {new Date(t.fecha).toLocaleString("es-MX")}
              </div>
              <div className="hist-user">👤 {t.usuario_nombre}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div className="hist-badge">{t.total_productos} productos</div>
              <div className="hist-ajustes">{t.total_ajustes} ajustes</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
