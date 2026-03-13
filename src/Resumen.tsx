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
  onHome: () => void;
}

type Filtro = "todos" | "faltantes" | "sobrantes" | "exactos";

export default function Resumen({
  productos,
  usuario,
  onReiniciar,
  onLogout,
  onVolver,
  onHome,
}: Props) {
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [toast, setToast] = useState("");

  // Modal confirmación (solo para ajuste en sistema)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [claveInput, setClaveInput] = useState("");
  const [errClave, setErrClave] = useState("");
  const [verificando, setVerificando] = useState(false);

  // Datos del guardado para el reporte
  const [tomaId, setTomaId] = useState<string | null>(null);
  const [fechaToma, setFechaToma] = useState<string>("");
  const [modoGuardado, setModoGuardado] = useState<"historial" | "sistema">(
    "historial",
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  const faltantes = productos.filter((p) => p.conteo - p.stock_sistema < 0);
  const sobrantes = productos.filter((p) => p.conteo - p.stock_sistema > 0);
  const exactos = productos.filter((p) => p.conteo - p.stock_sistema === 0);

  const productosFiltrados = (() => {
    switch (filtro) {
      case "faltantes":
        return faltantes;
      case "sobrantes":
        return sobrantes;
      case "exactos":
        return exactos;
      default:
        return productos;
    }
  })();

  /* ── Guardar: conAjuste=true aplica movimientos, false solo registra en historial ── */
  const guardarEnDB = async (conAjuste: boolean) => {
    setGuardando(true);
    try {
      const fecha = new Date().toISOString();

      const filas = productos
        .filter((p) => p.conteo - p.stock_sistema !== 0)
        .map((p) => {
          const diff = p.conteo - p.stock_sistema;
          return {
            item_tipo: "producto",
            producto_id: p.id,
            tipo: diff > 0 ? "entrada" : "salida",
            cantidad: Math.abs(diff),
            referencia_tipo: "toma_fisica",
            nota: `Toma física por ${usuario.nombre} — sistema: ${p.stock_sistema}, conteo: ${p.conteo}`,
            cajero: usuario.nombre,
            created_at: fecha,
          };
        });

      // Solo aplica ajustes al stock si el usuario lo solicitó
      if (conAjuste && filas.length > 0) {
        const { error } = await supabase
          .from("movimientos_inventario")
          .insert(filas);
        if (error) throw error;
      }

      // Siempre guarda en historial
      const datosHistorico = productos.map((p) => ({
        producto_id: p.id,
        nombre: p.nombre,
        stock_sistema: p.stock_sistema,
        conteo: p.conteo,
        diferencia: p.conteo - p.stock_sistema,
      }));

      const { data: histData, error: histErr } = await supabase
        .from("historico_tomas_inventario")
        .insert({
          fecha,
          usuario_id: usuario.id,
          usuario_nombre: usuario.nombre,
          datos: datosHistorico,
          total_productos: productos.length,
          total_ajustes: conAjuste ? filas.length : 0,
        })
        .select("id")
        .single();

      if (histErr) throw histErr;

      setTomaId(histData?.id ?? null);
      setFechaToma(fecha);
      setModoGuardado(conAjuste ? "sistema" : "historial");
      setGuardado(true);

      // Imprimir automáticamente después de guardar
      setTimeout(() => window.print(), 400);
    } catch (err: any) {
      showToast(`❌ Error: ${err?.message || "No se pudo guardar"}`);
    } finally {
      setGuardando(false);
    }
  };

  /* ── Registrar en historial (sin clave, sin ajuste de stock) ── */
  const handleRegistrarHistorial = () => {
    guardarEnDB(false);
  };

  /* ── Abrir modal para ajuste en sistema (requiere clave) ── */
  const handleAbrirModalAjuste = () => {
    setClaveInput("");
    setErrClave("");
    setModalAbierto(true);
  };

  /* ── Verificar clave y aplicar ajuste ── */
  const handleConfirmar = async () => {
    if (!claveInput.trim()) {
      setErrClave("Ingresa tu clave para confirmar.");
      return;
    }
    setVerificando(true);
    setErrClave("");
    try {
      const { data, error: err } = await supabase
        .from("usuarios")
        .select("id")
        .eq("id", usuario.id)
        .eq("clave", claveInput.trim())
        .single();

      if (err || !data) {
        setErrClave("Clave incorrecta. Inténtalo de nuevo.");
        return;
      }

      setModalAbierto(false);
      await guardarEnDB(true);
    } catch {
      setErrClave("Error de conexión.");
    } finally {
      setVerificando(false);
    }
  };

  const handleImprimir = () => window.print();

  const diffClass = (d: number) =>
    d === 0
      ? "rt-num rt-diff-ok"
      : d < 0
        ? "rt-num rt-diff-falta"
        : "rt-num rt-diff-sobre";

  const rowClass = (d: number) =>
    d === 0 ? "rt-row" : d < 0 ? "rt-row rt-row-falta" : "rt-row rt-row-sobre";

  return (
    <>
      {/* ── Modal de confirmación ── */}
      {modalAbierto && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ fontSize: "2.8rem", textAlign: "center" }}>⚠️</div>
            <h2 className="modal-title">Confirmar ajuste</h2>
            <p className="modal-desc">
              Se aplicarán{" "}
              <strong>
                {
                  productos.filter((p) => p.conteo - p.stock_sistema !== 0)
                    .length
                }{" "}
                ajuste(s)
              </strong>{" "}
              al inventario del sistema. Esta acción modificará el stock real de
              los productos y quedará registrada en el historial.
            </p>
            <p
              className="modal-desc"
              style={{ color: "var(--red)", fontWeight: 600 }}
            >
              Esta acción modificará el stock en el sistema. ¿Los datos contados
              son correctos?
            </p>
            <div className="field" style={{ marginTop: 8 }}>
              <label>Confirma con tu clave de acceso</label>
              <input
                type="password"
                placeholder="••••••"
                value={claveInput}
                onChange={(e) => setClaveInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConfirmar()}
                autoFocus
              />
            </div>
            {errClave && (
              <div className="error-msg" style={{ marginTop: 4 }}>
                {errClave}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setModalAbierto(false)}
                disabled={verificando}
              >
                Cancelar
              </button>
              <button
                className="btn btn-success"
                style={{ flex: 1 }}
                onClick={handleConfirmar}
                disabled={verificando || !claveInput}
              >
                {verificando ? "Verificando…" : "✅ Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reporte de impresión (oculto en pantalla) ── */}
      <div className="print-report">
        <div className="print-header">
          <h1>📦 Toma de Inventario</h1>
          <p>
            <strong>Fecha:</strong>{" "}
            {fechaToma
              ? new Date(fechaToma).toLocaleString("es-MX")
              : new Date().toLocaleString("es-MX")}
          </p>
          <p>
            <strong>Usuario:</strong> {usuario.nombre}
          </p>
          {tomaId && (
            <p>
              <strong>ID de toma:</strong> {tomaId}
            </p>
          )}
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
            {productos.map((p) => {
              const d = p.conteo - p.stock_sistema;
              return (
                <tr
                  key={p.id}
                  className={d < 0 ? "print-falta" : d > 0 ? "print-sobre" : ""}
                >
                  <td>{p.nombre}</td>
                  <td>{p.stock_sistema.toFixed(0)}</td>
                  <td>{p.conteo}</td>
                  <td>{d === 0 ? "–" : d > 0 ? `+${d}` : d}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{ paddingTop: 12, fontWeight: 600 }}>
                Total: {productos.length} | Faltantes: {faltantes.length} |
                Sobrantes: {sobrantes.length} | Exactos: {exactos.length}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Pantalla principal ── */}
      <div className="screen">
        {/* Header */}
        <div className="header">
          <button className="icon-btn" onClick={onVolver} title="Volver">
            ←
          </button>
          <div className="header-title" style={{ flex: 1 }}>
            Resumen de toma
          </div>
          {guardado && (
            <button
              className="icon-btn"
              onClick={handleImprimir}
              title="Imprimir reporte"
              style={{ fontSize: "1.15rem" }}
            >
              🖨️
            </button>
          )}
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
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 4,
            }}
          >
            {(
              [
                { key: "todos", label: `Todos (${productos.length})` },
                { key: "faltantes", label: `⬇ Falta (${faltantes.length})` },
                { key: "sobrantes", label: `⬆ Sobra (${sobrantes.length})` },
                { key: "exactos", label: `✓ Ok (${exactos.length})` },
              ] as { key: Filtro; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                className={`btn ${filtro === key ? "btn-primary" : "btn-secondary"}`}
                style={{
                  whiteSpace: "nowrap",
                  padding: "8px 14px",
                  fontSize: "0.8rem",
                }}
                onClick={() => setFiltro(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tabla + nota en su propio scroll */}
          <div className="resumen-table-scroll">
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
                  marginTop: 10,
                }}
              >
                Guardar aplicará los ajustes como movimientos de inventario para
                cuadrar el stock del sistema con lo contado.
              </p>
            )}
          </div>
        </div>
        {/* fin resumen-screen */}

        {/* Botones de acción */}
        <div className="save-row">
          {!guardado ? (
            <>
              <button
                className="btn btn-primary"
                onClick={handleRegistrarHistorial}
                disabled={guardando}
              >
                {guardando
                  ? "Guardando…"
                  : "📋 Registrar en historial e imprimir"}
              </button>
              <button
                className="btn btn-success"
                onClick={handleAbrirModalAjuste}
                disabled={guardando}
              >
                {guardando ? "Guardando…" : "⚖️ Ajustar en sistema e imprimir"}
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
                  background:
                    modoGuardado === "sistema" ? "#dcfce7" : "#dbeafe",
                  color:
                    modoGuardado === "sistema" ? "var(--green)" : "var(--blue)",
                  borderRadius: 12,
                  padding: "14px",
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                }}
              >
                {modoGuardado === "sistema"
                  ? "✅ Ajuste aplicado al sistema y registrado"
                  : "📋 Toma registrada en historial"}
              </div>
              <button className="btn btn-primary" onClick={handleImprimir}>
                🖨️ Reimprimir reporte
              </button>
              <button className="btn btn-secondary" onClick={onHome}>
                🏠 Volver al inicio
              </button>
              <button className="btn btn-secondary" onClick={onLogout}>
                Cerrar sesión
              </button>
            </>
          )}
        </div>

        {toast && <div className="toast">{toast}</div>}
      </div>
    </>
  );
}
