import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import type { UsuarioSesion } from "./Login";
import Resumen from "./Resumen";

interface Producto {
  id: string;
  nombre: string;
  stock_sistema: number; // calculado desde movimientos
}

interface ConteoItem extends Producto {
  conteo: number; // lo que el usuario cuenta físicamente
}

interface Props {
  usuario: UsuarioSesion;
  onLogout: () => void;
  onHome: () => void;
}

export default function TomaInventario({ usuario, onLogout, onHome }: Props) {
  const [productos, setProductos] = useState<ConteoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [indice, setIndice] = useState(0);
  const [terminado, setTerminado] = useState(false);
  const [toast, setToast] = useState("");
  const progressLoaded = useRef(false);

  const STORAGE_KEY = `inv_toma_prog_${usuario.id}`;

  // Guarda avance en localStorage cada vez que cambia productos o indice
  useEffect(() => {
    if (!progressLoaded.current || productos.length === 0) return;
    const conteos: Record<string, number> = {};
    for (const p of productos) conteos[p.id] = p.conteo;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ conteos, indice }));
  }, [productos, indice]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearProgress = () => localStorage.removeItem(STORAGE_KEY);

  // Cargar productos tipo bebida + calcular stock desde movimientos
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

        // Calcular entradas - salidas por producto
        // Tipos que reducen stock: salida, venta, consumo, ajuste_negativo (legacy)
        const TIPOS_SALIDA = new Set([
          "salida",
          "venta",
          "consumo",
          "ajuste_negativo",
        ]);
        const movMap: Record<string, number> = {};
        for (const m of movs || []) {
          if (!m.producto_id) continue;
          const q = Number(m.cantidad) || 0;
          const esSalida = TIPOS_SALIDA.has(m.tipo);
          movMap[m.producto_id] =
            (movMap[m.producto_id] || 0) + (esSalida ? -q : q);
        }

        const items: ConteoItem[] = (prods || []).map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          stock_sistema: movMap[p.id] ?? 0,
          conteo: 0,
        }));

        // Restaurar avance guardado si existe
        try {
          const saved = localStorage.getItem(`inv_toma_prog_${usuario.id}`);
          if (saved) {
            const { conteos, indice: savedIndice } = JSON.parse(saved) as {
              conteos: Record<string, number>;
              indice: number;
            };
            for (const item of items) {
              if (conteos[item.id] !== undefined) item.conteo = conteos[item.id];
            }
            setIndice(Math.min(savedIndice, items.length - 1));
          }
        } catch {
          // ignorar errores de localStorage
        }

        progressLoaded.current = true;
        setProductos(items);
      } catch (err: any) {
        setErrorMsg(err?.message || "Error cargando productos.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  const productoActual = productos[indice];

  const actualizarConteo = (valor: number) => {
    setProductos((prev) =>
      prev.map((p, i) => (i === indice ? { ...p, conteo: valor } : p)),
    );
  };

  const incrementar = () => actualizarConteo((productoActual?.conteo ?? 0) + 1);

  const decrementar = () =>
    actualizarConteo(Math.max(0, (productoActual?.conteo ?? 0) - 1));

  const siguiente = () => {
    if (indice < productos.length - 1) {
      setIndice((i) => i + 1);
    } else {
      clearProgress(); // conteo completo → ya no necesitamos el borrador
      setTerminado(true);
    }
  };

  const anterior = () => {
    if (indice > 0) setIndice((i) => i - 1);
  };

  const diferencia =
    productoActual !== undefined
      ? productoActual.conteo - productoActual.stock_sistema
      : 0;

  const chipClass =
    diferencia === 0
      ? "diferencia-chip diferencia-ok"
      : diferencia < 0
        ? "diferencia-chip diferencia-falta"
        : "diferencia-chip diferencia-sobre";

  const chipLabel =
    diferencia === 0
      ? "✓ Exacto"
      : diferencia < 0
        ? `${diferencia} Faltante`
        : `+${diferencia} Sobrante`;

  if (terminado) {
    return (
      <Resumen
        productos={productos}
        usuario={usuario}
        onReiniciar={() => {
          clearProgress();
          setTerminado(false);
          setIndice(0);
          setProductos((prev) => prev.map((p) => ({ ...p, conteo: 0 })));
        }}
        onLogout={onLogout}
        onHome={onHome}
        onVolver={() => {
          setTerminado(false);
          setIndice(productos.length - 1);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="screen">
        <div className="loader-screen">
          <div className="spinner" />
          <p>Cargando inventario…</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="screen">
        <div className="loader-screen">
          <p className="error-msg">{errorMsg}</p>
          <button className="btn btn-secondary" onClick={onLogout}>
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className="screen">
        <div className="loader-screen">
          <p>No hay productos de tipo bebida.</p>
          <button className="btn btn-secondary" onClick={onLogout}>
            Salir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      {/* Header */}
      <div className="header">
        <button className="icon-btn" onClick={onHome} title="Volver al inicio">
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div className="header-title">🥤 Toma de inventario</div>
          <div className="header-sub">{usuario.nombre}</div>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,.2)",
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: "0.85rem",
            fontWeight: 700,
          }}
        >
          {indice + 1} / {productos.length}
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${((indice + 1) / productos.length) * 100}%` }}
        />
      </div>

      {/* Contenido del producto */}
      <div className="producto-screen">
        <span className="producto-badge">Bebida {indice + 1}</span>

        <h2 className="producto-nombre">{productoActual.nombre}</h2>

        {/* Stock del sistema */}
        <div className="sistema-row">
          <span className="sistema-label">Stock en sistema</span>
          <span className="sistema-valor">
            {productoActual.stock_sistema.toFixed(0)} uds.
          </span>
        </div>

        {/* Contador físico */}
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--gray-500)",
              textTransform: "uppercase",
              letterSpacing: ".05em",
              marginBottom: 8,
            }}
          >
            Conteo físico
          </p>
          <div className="contador-area">
            <button
              className="cnt-btn cnt-btn-minus"
              onClick={decrementar}
              disabled={productoActual.conteo <= 0}
            >
              −
            </button>
            <span className="cnt-value">{productoActual.conteo}</span>
            <button className="cnt-btn cnt-btn-plus" onClick={incrementar}>
              +
            </button>
          </div>
        </div>

        {/* Input manual */}
        <div>
          <p className="input-manual-label">
            O escribe la cantidad directamente
          </p>
          <div className="input-manual-row" style={{ marginTop: 6 }}>
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min="0"
              value={productoActual.conteo === 0 ? "" : productoActual.conteo}
              placeholder="0"
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                actualizarConteo(isNaN(v) || v < 0 ? 0 : v);
              }}
            />
          </div>
        </div>

        {/* Chip diferencia */}
        <span className={chipClass}>{chipLabel}</span>
      </div>

      {/* Navegación */}
      <div className="nav-strip">
        <button
          className="btn btn-secondary"
          onClick={anterior}
          disabled={indice === 0}
        >
          ‹ Anterior
        </button>
        <button className="btn btn-primary" onClick={siguiente}>
          {indice === productos.length - 1 ? "Ver resumen ✓" : "Siguiente ›"}
        </button>
      </div>

      {/* Botón "Saltar" */}
      <div
        style={{
          textAlign: "center",
          padding: "8px 0 12px",
          background: "#fff",
        }}
      >
        <button
          style={{
            background: "none",
            border: "none",
            color: "var(--gray-500)",
            fontSize: "0.85rem",
            cursor: "pointer",
            textDecoration: "underline",
          }}
          onClick={() => {
            showToast(`${productoActual.nombre} marcado como no contado`);
            siguiente();
          }}
        >
          Saltar (no contar este producto)
        </button>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
