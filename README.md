# Mecanografía · Test de velocidad

Práctica IPO 2026/27 — Grupo Dinamarca

## Descripción

Aplicación web para medir la velocidad mecanográfica. El sistema muestra palabras aleatorias de un almacén y el usuario debe teclearlas correctamente mientras un temporizador contabiliza los segundos transcurridos y un contador registra los aciertos.

## Funcionalidad

- **Iniciar / Detener**: el botón arranca la prueba (resetea contador y temporizador) o la para mostrando el resumen final con palabras correctas, segundos y palabras por minuto.
- **Palabra de muestra**: al iniciar y tras cada acierto se muestra una palabra aleatoria del almacén, nunca la misma dos veces seguidas.
- **Validación**: la palabra se acepta en cuanto coincide al escribirla. Espacio e Intro también validan (y muestran el error si no coincide). Esc detiene la prueba.
- **Temporizador**: muestra los segundos transcurridos desde el inicio mediante `setInterval` / `clearInterval`.
- **Contador de correctas**: se incrementa con cada acierto y se pone a cero en cada nuevo inicio.

## Arquitectura

La aplicación sigue el patrón **MVC**:

| Fichero | Rol |
|---|---|
| `js/Almacen.js` | Carga y valida el array de palabras desde `data/palabras.json` con `fetch` |
| `js/Modelo.js` | Estado privado (`#palabraActual`, `#contador`, `#segundos`, `#activo`) y lógica de negocio |
| `js/Vista.js` | Referencias al DOM; actualiza la interfaz sin lógica de negocio |
| `js/Controlador.js` | Conecta Modelo y Vista; gestiona eventos y el intervalo del temporizador |

`index.html` carga `Controlador.js` como `<script type="module">`. Los módulos se importan entre sí con `import`.

## Diseño

### Cromático
Estrategia **complementaria**: azul (`--tono: 210`) frente a naranja (`--tono-secundario: calc(var(--tono) + 180)`). Todos los colores se definen como tokens HSL en `:root` y se redefinen para modo oscuro con `prefers-color-scheme: dark`.

### Tipográfico
Dos fuentes contrastadas cargadas desde Google Fonts:
- **Lora** (serif) — títulos, palabra de muestra y cifras de los marcadores.
- **Inter** (sans-serif) — cuerpo, etiquetas y ayuda.

Seis escalones tipográficos fluidos con `clamp()`.

### Espacial
Contenedor centrado con `min(100%, 40rem)`. Espacios y tamaños fluidos con `clamp()`. Principios Gestalt: **semejanza** (los dos marcadores comparten la misma tarjeta) y **proximidad** (etiqueta, campo, botón y ayuda agrupados con `gap` uniforme).

## Estructura de ficheros

```
ipo2627_dinamarca_mecanografia/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── Almacen.js
│   ├── Modelo.js
│   ├── Vista.js
│   └── Controlador.js
└── data/
    └── palabras.json
```

## Cómo ejecutar

El módulo `Almacen.js` usa `fetch`, que no funciona con el protocolo `file://`. Hay que servir el proyecto desde un servidor local:

```bash
python3 -m http.server 8080
# Abre http://localhost:8080
```

## Solución

La aplicación carga las palabras con `Almacen.cargar()` (top-level `await` en `Controlador.js`). Si la carga falla, se muestra un mensaje de error en la interfaz y el botón queda deshabilitado.

El `Modelo` encapsula todo el estado con campos `#privados` y expone únicamente getters de solo lectura. El `Controlador` es el único que llama a los métodos mutadores del modelo. La `Vista` nunca conoce el estado: recibe los valores ya calculados y los vuelca al DOM.
