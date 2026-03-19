import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import type { UsuarioSesion } from "./Login";

interface Producto {
  id: string;
  nombre: string;
  stock_sistema: number;
}

interface Props {
  usuario: UsuarioSesion;
  onClose: () => void;
}

type TipoMov = "entrada" | "salida";

export default function MovimientoModal({ usuario, onClose }: Props) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProds, setLoadingProds] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [tipo, setTipo] = useState<TipoMov>("entrada");
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState<number | "">("");
  const [nota, setNota] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState("");

  // Cargar productos de tipo bebida con stock calculado
  useEffect(() => {
    (async () => {
      try {
        const [{ data: prods, error: e1 }, { data: movs, error: e2 }] =
          await Promise.all([
            supabase
              .from("productos")
              .select("id, nombre")
              .eq("tipo", "bebida")
              .order("nombre"),
            supabase
              .from("movimientos_inventario")
              .select("producto_id, tipo, cantidad")
              .eq("item_tipo", "producto"),
          ]);
        if (e1) throw e1;
        if (e2) throw e2;

        const TIPOS_SALIDA = new Set(["salida", "venta", "consumo", "ajuste_negativo"]);
        const movMap: Record<string, number> = {};
        for (const m of movs || []) {
          if (!m.producto_id) continue;
          const q = Number(m.cantidad) || 0;
          movMap[m.producto_id] =
            (movMap[m.producto_id] || 0) + (TIPOS_SALIDA.has(m.tipo) ? -q : q);
        }

        setProductos(
          (prods || []).map((p: any) => ({
            id: p.id,
            nombre: p.nombre,
            stock_sistema: movMap[p.id] ?? 0,
          })),
        );
      } catch (err: any) {
        setError(err?.message || "Error cargando productos.");
      } finally {
        setLoadingProds(false);
      }
    })();
  }, []);

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );

  const productoSeleccionado = productos.find((p) => p.id === productoId);

  const handleGuardar = async () => {
    if (!productoId) { setError("Selecciona un producto."); return; }
    if (!cantidad || Number(cantidad) <= 0) { setError("Ingresa una cantidad válida."); return; }

    setError("");
    setGuardando(true);
    try {
      const { error: err } = await supabase.from("movimientos_inventario").insert({
        item_tipo: "producto",
        producto_id: productoId,
        tipo,
        cantidad: Number(cantidad),
        referencia_tipo: "ajuste_manual",
        nota: nota.trim() || `${tipo === "entrada" ? "Entrada" : "Salida"} manual por ${usuario.nombre}`,
        cajero: usuario.nombre,
        created_at: new Date().toISOString(),
      });
      if (err) throw err;
      setExito(true);
    } catch (err: any) {
      setError(err?.message || "Error al guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const handleNuevo = () => {
    setProductoId("");
    setCantidad("");
    setNota("");
    setBusqueda("");
    setExito(false);
    setError("");
  };

  // ── Pantalla de éxito ──────────────────────────────────────────────────────
  if (exito) {
    return (
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-card" style={{ gap: 20, textAlign: "center" }}>
          <div style={{ fontSize: "3.5rem" }}>
            {tipo === "entrada" ? "📥" : "📤"}
          </div>
          <h2 className="modal-title" style={{ color: tipo === "entrada" ? "var(--green)" : "var(--red)" }}>
            {tipo === "entrada" ? "Entrada registrada" : "Salida registrada"}
          </h2>
          <div
            style={{
              background: tipo === "entrada" ? "#dcfce7" : "#fee2e2",
              borderRadius: 12,
              padding: "14px 18px",
              fontSize: "0.95rem",
              fontWeight: 600,
              color: tipo === "entrada" ? "var(--green)" : "var(--red)",
            }}
          >
            {productoSeleccionado?.nombre}
            <div style={{ fontSize: "1.6rem", fontWeight: 900, marginTop: 4 }}>
              {tipo === "entrada" ? "+" : "−"}{cantidad} uds.
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleNuevo}>
            Registrar otro movimiento
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  // ── Formulario principal ────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card mov-modal-card">
        {/* Título */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            className="icon-btn"
            onClick={onClose}
            style={{ background: "var(--gray-100)", color: "var(--gray-700)", flexShrink: 0 }}
          >
            ✕
          </button>
          <h2 className="modal-title" style={{ flex: 1, textAlign: "left", fontSize: "1.15rem" }}>
            Registrar movimiento
          </h2>
        </div>

        {/* Selector de tipo — Entrada / Salida */}
        <div className="mov-tipo-row">
          <button
            className={`mov-tipo-btn${tipo === "entrada" ? " mov-tipo-active-entrada" : ""}`}
            onClick={() => setTipo("entrada")}
          >
            <span style={{ fontSize: "1.6rem" }}>📥</span>
            <span className="mov-tipo-label">Entrada</span>
            <span className="mov-tipo-desc">Stock aumenta</span>
          </button>
          <button
            className={`mov-tipo-btn${tipo === "salida" ? " mov-tipo-active-salida" : ""}`}
            onClick={() => setTipo("salida")}
          >
            <span style={{ fontSize: "1.6rem" }}>📤</span>
            <span className="mov-tipo-label">Salida</span>
            <span className="mov-tipo-desc">Stock reduce</span>
          </button>
        </div>

        {/* Búsqueda de producto */}
        <div className="field">
          <label>Producto</label>
          <input
            type="text"
            placeholder="Buscar bebida…"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setProductoId(""); }}
          />
        </div>

        {/* Lista de productos */}
        {loadingProds ? (
          <div style={{ textAlign: "center", color: "var(--gray-500)", fontSize: "0.9rem" }}>
            Cargando productos…
          </div>
        ) : (
          <div className="mov-prod-list">
            {productosFiltrados.length === 0 ? (
              <div style={{ padding: "12px 0", textAlign: "center", color: "var(--gray-500)", fontSize: "0.85rem" }}>
                Sin resultados
              </div>
            ) : (
              productosFiltrados.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  className={`mov-prod-item${productoId === p.id ? " mov-prod-selected" : ""}`}
                  onClick={() => { setProductoId(p.id); setBusqueda(p.nombre); }}
                >
                  <span className="mov-prod-nombre">{p.nombre}</span>
                  <span className="mov-prod-stock">
                    Stock: {p.stock_sistema.toFixed(0)} uds.
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {/* Cantidad */}
        <div className="field">
          <label>Cantidad</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              className="cnt-btn cnt-btn-minus"
              style={{ width: 50, height: 50, fontSize: "1.6rem", flexShrink: 0 }}
              onClick={() => setCantidad((v) => Math.max(1, (Number(v) || 1) - 1))}
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              placeholder="0"
              value={cantidad}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setCantidad(isNaN(v) || v < 0 ? "" : v);
              }}
              style={{
                flex: 1,
                border: "2px solid var(--gray-200)",
                borderRadius: 10,
                padding: "12px",
                fontSize: "1.4rem",
                fontWeight: 700,
                textAlign: "center",
                outline: "none",
              }}
            />
            <button
              className="cnt-btn cnt-btn-plus"
              style={{ width: 50, height: 50, fontSize: "1.6rem", flexShrink: 0 }}
              onClick={() => setCantidad((v) => (Number(v) || 0) + 1)}
            >
              +
            </button>
          </div>
        </div>

        {/* Nota opcional */}
        <div className="field">
          <label>Motivo / Nota <span style={{ fontWeight: 400, color: "var(--gray-500)", textTransform: "none" }}>(opcional)</span></label>
          <input
            type="text"
            placeholder="Ej. Recepción de proveedor, merma, etc."
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
        </div>

        {/* Resumen rápido */}
        {productoId && Number(cantidad) > 0 && (
          <div
            style={{
              background: tipo === "entrada" ? "#dcfce7" : "#fee2e2",
              borderRadius: 12,
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.9rem",
              fontWeight: 600,
              color: tipo === "entrada" ? "var(--green)" : "var(--red)",
            }}
          >
            <span>{productoSeleccionado?.nombre}</span>
            <span style={{ fontSize: "1.1rem" }}>
              {tipo === "entrada" ? "+" : "−"}{cantidad} uds.
            </span>
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}

        <button
          className={`btn ${tipo === "entrada" ? "btn-success" : "btn-danger"}`}
          onClick={handleGuardar}
          disabled={guardando || !productoId || !cantidad}
        >
          {guardando
            ? "Guardando…"
            : tipo === "entrada"
            ? "📥 Registrar entrada"
            : "📤 Registrar salida"}
        </button>
      </div>
    </div>
  );
}
