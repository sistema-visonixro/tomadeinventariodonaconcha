# Inventario Móvil — Toma de Inventario

Aplicación independiente optimizada para móvil para realizar tomas físicas de inventario de bebidas.

## Uso

Solo accesible para usuarios con `rol = "inventario"` en la tabla `usuarios` de Supabase.

## Configuración

1. Copia `.env` y rellena las variables:

```env
VITE_SUPABASE_URL=https://qxrdbsgktnyhigduhzcw.supabase.co
VITE_SUPABASE_KEY=<tu_anon_key_de_supabase>
```

Puedes encontrar el **anon key** en Supabase → Project Settings → API → `anon` `public`.

## Instalar y correr

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Flujo de la app

1. **Login** — ingresa con código + clave. Solo rol `inventario` puede entrar.
2. **Conteo** — recorre cada bebida una por una:
   - Muestra el stock según sistema (entradas − salidas de `movimientos_inventario`)
   - Botones `−` y `+` para sumar/restar unidades
   - Campo de entrada manual
   - Indicador inmediato de faltante/sobrante/exacto
3. **Resumen** — tabla completa con:
   - Faltantes (rojos)
   - Sobrantes (amarillos)
   - Exactos (verdes)
   - Filtros rápidos
4. **Guardar** — opcional. Inserta ajustes positivos/negativos en `movimientos_inventario` para cuadrar el sistema.
