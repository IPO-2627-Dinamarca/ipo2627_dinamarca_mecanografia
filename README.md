# Mecanografía · Test de velocidad

Práctica de IPO 2026/27, grupo Dinamarca.

Aplicación web para medir la velocidad al teclado. Se pulsa Iniciar, aparece una palabra elegida al azar y hay que escribirla; en cuanto se completa sin errores sale otra y el contador sube. Un temporizador muestra los segundos desde el comienzo y, al detener, un panel resume la prueba.

## Cómo ejecutarla

Las palabras se cargan con `fetch` y los scripts son módulos ES, así que la página tiene que servirse por HTTP:

```bash
python3 -m http.server 8080
# http://localhost:8080
```

Abierta con `file://`, el navegador bloquea el módulo y la página se queda en su estado inicial, que es un aviso explicando cómo servirla.

## Funcionamiento

- Iniciar y Detener: el mismo botón arranca y para la prueba. También se empieza con Intro desde cualquier parte de la página y se detiene con Esc.
- Palabra de muestra: se sortea entre las del almacén y nunca repite la anterior.
- Validación letra a letra: cada letra se colorea según vaya bien, mal o falte por escribir, y un subrayado marca la siguiente. La palabra se acepta sola al completarla. Espacio o Intro la comprueban antes de tiempo y, si está incompleta o tiene errores, lo indican; con el campo vacío no hacen nada.
- Contador de correctas: sube con cada acierto y vuelve a cero en cada nuevo comienzo.
- Temporizador: arranca al pulsar Iniciar con `setInterval` y se para con `clearInterval`. Muestra los segundos transcurridos y, pasados cinco segundos, las palabras por minuto en vivo.
- Resultado: al detener, el panel ocupa el sitio de la palabra y de los marcadores con las palabras por minuto, las correctas, el tiempo con una décima, la precisión y la mejor marca. La marca se guarda en `localStorage` y solo cuentan las pruebas de cinco segundos o más; si se supera, se avisa.

Se exigen las tildes, pero no las mayúsculas: las palabras del almacén están en minúscula y un bloqueo de mayúsculas olvidado no debería contar como fallo. El campo no admite pegar ni arrastrar texto.

## Estructura

```
ipo2627_dinamarca_mecanografia/
├── index.html
├── favicon.svg
├── css/
│   ├── tokens.css        orden de capas y variables (color, tipografía, espacio)
│   ├── base.css          reinicio, elementos sueltos y utilidades
│   ├── layout.css        disposición de las cajas y consulta de contenedor
│   └── componentes.css   aspecto de marcadores, escenario, campo, botón y resultado
├── js/
│   ├── main.js           punto de entrada
│   ├── model/
│   │   ├── almacen.js    carga de palabras y mejor marca
│   │   └── modelo.js     estado y reglas de la prueba
│   ├── view/
│   │   └── vista.js      lectura y escritura del DOM
│   └── controller/
│       └── controlador.js
└── data/
    └── palabras.json
```

El HTML enlaza las cuatro hojas con `<link>` y un único `<script type="module">` hacia `main.js`; el resto de ficheros se importan entre sí con `import`. Las hojas usan `@layer`. El orden (`tokens, base, layout, componentes, utilidades`) se declara una vez en `tokens.css` y cada fichero rellena su capa: `layout` decide cómo se colocan las cajas (`display`, rejillas, `gap`) y `componentes` cómo se ven. Así la cascada depende de las capas y no hace falta subir la especificidad.

## Arquitectura

Sigue el patrón MVC.

- `model/almacen.js` descarga `palabras.json`, descarta entradas repetidas o con espacios y normaliza a NFC. Sus errores llevan un mensaje pensado para el usuario según la causa: fallo de red, respuesta HTTP o JSON mal formado. También lee y guarda la mejor marca dentro de `try/catch`, porque `localStorage` puede no estar disponible, y descarta valores fuera de rango.
- `model/modelo.js` guarda el estado en campos privados: palabra actual, texto escrito, correctas, pulsaciones, fallos, instante de inicio y de fin. Expone getters de solo lectura (`hayError`, `precision`, `palabrasPorMinuto`…), el método `progreso()` y las operaciones `comenzar`, `escribir`, `confirmar` y `detener`. No toca el DOM.
- `view/vista.js` localiza los nodos por atributos `data-vista`, escribe en ellos los valores que recibe y avisa al controlador de lo que hace el usuario mediante `alPulsarBoton`, `alEscribir` y `alPulsarAtajo`. No conoce el modelo.
- `controller/controlador.js` es el único que habla con los dos y el dueño del intervalo.
- `main.js` crea las piezas tras cargar las palabras con `await` en el nivel superior del módulo; si algo falla, la vista muestra el mensaje.

### El temporizador

El enunciado pide `setInterval`, pero contar ticks acumula deriva y en una pestaña en segundo plano el navegador los espacia. Por eso el modelo guarda `performance.now()` al comenzar y al detener y calcula el tiempo como diferencia. El intervalo, cada 200 ms, solo repinta los marcadores, y la vista únicamente toca el DOM si la cifra ha cambiado. El resultado final usa el tiempo real, con décimas, y las palabras por minuto salen exactas.

### Coordinación con el DOM y el CSSOM

El estado se comunica sobre todo con atributos, y el CSS decide cómo se ve:

- `data-estado` en `.app` vale `error` en el HTML de partida y después `cargando`, `parado` o `activo`. De él dependen la ayuda visible, el aspecto del botón, el campo deshabilitado y el modo compacto.
- `aria-invalid` en el campo sirve a la vez a las tecnologías de apoyo y como gancho del estilo de error; `:has()` muestra el mensaje cuando el campo es inválido y oculta los marcadores mientras está abierto el resultado.
- Cada letra de la muestra es un `<span>` con clase `letra--ok`, `letra--error`, `letra--pendiente` o `letra--sobrante`, más `letra--cursor` en la siguiente. Los spans se crean una vez por palabra y en cada pulsación solo cambian sus clases.

El único estilo que escribe el JavaScript es la propiedad personalizada `--letras`, con `style.setProperty`, al mostrar cada palabra. El CSS la usa para calcular el cuerpo de la muestra, `clamp(var(--paso-3), calc(140cqi / var(--letras)), var(--paso-6))`, de modo que una palabra larga en una pantalla estrecha reduce su tamaño y cabe en una línea.

Las clases siguen BEM y se usan para el estilo; los `data-vista` los usa el JavaScript para encontrar nodos.

## Diseño

### Cromático: complementario con acento análogo

El tono base es un azul (`--tono: 212`) y su complementario se calcula con `calc(var(--tono) + 180)`, un naranja tostado. A esa pareja se añade un verde análogo del azul (`--tono - 60`). Cada color tiene un papel:

- azul: acción (botón, foco, cursor de la palabra);
- naranja: error (letras mal, campo inválido, mensaje);
- verde: acierto (letras bien, destello del contador, aviso de récord).

El verde queda en la mitad fría del círculo, junto al azul y lejos del naranja, así que acierto y error se distinguen bien. El resto de la interfaz son grises teñidos del mismo azul. Todo está en `:root` como variables HSL. Los dos modos se resuelven con `light-dark()` en la misma declaración, y el borde suave de las tarjetas y el hover del botón en contorno se derivan con `color-mix()`. Los contrastes cumplen WCAG AA en los dos modos.

### Tipográfico: dos familias contrastadas

- Serif (`Charter`, `Cambria`, `Georgia`…) para el título, la palabra de muestra, el texto del campo y la cifra del resultado. Al usar el campo la misma fuente y alineación que la muestra, es más fácil compararlas letra a letra.
- Sans de sistema (`system-ui`) para la interfaz: etiquetas, ayuda, botones y marcadores.

No se descarga ninguna fuente; son pilas de sistema, como recomienda la teoría ("utiliza fuentes estándar"). Los tamaños salen de una escala modular de razón 1,25 en `rem`. Las cifras usan `tabular-nums` para que no se desplacen al cambiar. Las mayúsculas se reservan para siglas como PPM, y ni el cursor ni las letras se animan.

### Espacial

Una sola columna de 40 rem como máximo, centrada en vertical en escritorio con flexbox y márgenes automáticos; dentro, rejillas con `gap`. Las medidas usan propiedades lógicas (`inline-size`, `margin-block`…). Principios de la Gestalt aplicados:

- Proximidad: escenario, campo, mensaje y ayuda van más juntos entre sí que respecto a los marcadores.
- Semejanza: los tres marcadores son tarjetas idénticas, y el botón conserva la forma al pasar de Iniciar (relleno) a Detener (contorno).
- Figura y fondo: la palabra y el resultado ocupan el mismo escenario, una superficie más clara que el fondo.

`.principal` es contenedor de consulta. Por debajo de 24 rem de ancho el botón baja bajo el campo y el mensaje de error queda entre ambos, pegado al campo. En el móvil, `interactive-widget=resizes-content` hace que el teclado virtual encoja la ventana; si queda por debajo de 34 rem de alto durante la prueba, se ocultan cabecera, pie y ayuda y se compactan los marcadores, para que la palabra, el campo y el tiempo sigan a la vista.

## Interacción y accesibilidad

- Atajos: Intro empieza, Esc detiene y cualquier letra pulsada fuera del campo durante la prueba devuelve allí el foco. Se indican con `<kbd>` en una ayuda que cambia según el estado y en `aria-keyshortcuts`.
- Foco: al empezar va al campo y al detener al botón, así que Intro o Espacio relanzan la prueba sin ratón.
- El segundo clic de un doble clic en el botón se ignora (`event.detail`), y Esc con la prueba parada no hace nada.
- Teclados: con teclas muertas se espera a `compositionend` para que la tilde suelta no cuente como fallo. Los teclados de móvil que componen la palabra entera ven el progreso mientras escriben, y el Espacio, que en ellos no informa de la tecla, se detecta en el texto.
- El error se señala con algo más que el color: subrayado ondulado en la letra, tachado en lo que sobra, borde y fondo del campo y un mensaje escrito.
- Una sola región viva, fuera de los spans, anuncia el comienzo, cada palabra nueva, el primer error y el resumen final. Los marcadores son un `<dl>` sin `aria-live`, para que el lector de pantalla no lea el reloj cada segundo.
- La única animación es un destello de color en el contador al acertar. Las transiciones de color del campo y del botón y el cambio de su icono solo se aplican con `prefers-reduced-motion: no-preference`.
- `forced-colors`: las letras erróneas usan los colores de resaltado del sistema (`Mark`), el campo con error pasa a borde doble, el foco del campo usa `Highlight` y el icono del botón toma `ButtonText`.
- Campo y botón miden al menos 48 px de alto. El foco es un anillo de 3 px; en el campo se dibuja engrosando su borde, de modo que con error se ve un solo anillo naranja.
