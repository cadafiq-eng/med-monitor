# Resurtidos — adaptación de med-monitor

App de resurtidos de recetas por especialidad, instalable y sin servidor,
adaptada desde `cadafiq-eng/med-monitor` para publicarse como sitio estático
en GitHub Pages.

## Qué cambió respecto a med-monitor

- **Sin cuenta ni servidor.** Se eliminaron la pantalla de inicio de sesión
  y todas las llamadas al servidor. No hay `fetch` a ningún servicio: los
  datos viven solo en el `localStorage` del dispositivo, bajo la clave
  `resurtidos_v1`.
- **Pestañas nuevas:** Resurtidos (por especialidad, con fecha estimada y
  estado Pendiente / Ya lo pedí / Surtido / Terminado), Consumo (la lógica
  de stock de med-monitor: días restantes, Tomar / Reabastecer, historial),
  Recetas, Citas y Más.
- **Recetas:** cada receta puede llevar un enlace opcional a Dropbox
  («Ver receta») y la ruta del archivo. No se suben fotos ni archivos de
  recetas al repositorio: Dropbox sigue siendo la única copia.
- **Citas:** revaloraciones y controles con estado pendiente / realizada.
- **Más (Varios):** presión arterial (igual que en med-monitor: promedios,
  gráfica y categorías), respaldo (exportar / importar JSON, exportar
  presión a CSV), avisos en el dispositivo (prueba con la API de
  notificaciones; no garantizados con la app cerrada), modo oscuro y
  borrado total de datos.
- **Rutas relativas** (`manifest.json`, `icon-*.png`, `./`) para que la app
  funcione bajo la subruta de GitHub Pages (`/med-monitor/`).

## Datos: cómo se cargan

La app se publica **vacía, sin datos del usuario** (el repositorio es
público). En el primer uso, en Más → Respaldo → Importar datos (JSON),
se carga el archivo con la forma de `datos-resurtidos.json`:

```json
{ "version": 1, "specialties": [...], "medications": [...],
  "appointments": [...], "alerts": [...], "recipes": [...], "pressure": [...] }
```

La importación reemplaza los datos locales tras confirmar, y normaliza
números, fechas e identificadores. También se acepta un JSON que sea solo
una lista de medicamentos. Exportar descarga el mismo formato.

## Qué se deja intacto en el repositorio

- `api/` y `vercel.json` no se tocan: el backend de med-monitor sigue
  existiendo, pero esta app no lo usa.
- El frontend original de med-monitor se conserva en la rama
  `med-monitor-original` del repositorio.
- **Los datos y los enlaces a recetas nunca van en el repositorio**:
  ni medicamentos, ni fechas, ni enlaces de Dropbox. Todo queda en el
  dispositivo de Antonio; un enlace de Dropbox lo puede abrir cualquiera
  que lo tenga.

## Archivos de esta adaptación

- `index.html` — la app completa en un solo archivo.
- `manifest.json` — manifiesto PWA («Resurtidos»).
- `public/icon-180.png`, `public/icon-192.png`, `public/icon-512.png` — iconos reutilizados
  de med-monitor (ya existen en el repo bajo `public/`; el conector de GitHub no
  sube archivos binarios, así que la app y el manifiesto apuntan a esa carpeta).
