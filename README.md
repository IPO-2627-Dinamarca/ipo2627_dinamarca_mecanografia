# Mecanografía · Test de velocidad

[Probar en línea](https://ipo-2627-dinamarca.github.io/ipo2627_dinamarca_mecanografia/)

![Resultado de una prueba en modo libre: 61 palabras por minuto en la hoja y, debajo, las palabras escritas en tres niveles (bien, corregidas con subrayado ondulado y sin corregir con lo escrito tachado junto a la palabra pedida); a la izquierda los límites y el modo, y a la derecha el detalle con los errores corregidos y sin corregir, la gráfica de ritmo, las palabras para practicar y el teclado de fallos](img/captura.png)

Práctica de IPO 2026/27, grupo Dinamarca.

Aplicación web para medir la velocidad al teclado. Se pulsa Iniciar, aparece una palabra elegida al azar con las tres siguientes debajo y hay que escribirla y pulsar Espacio, como en un texto corrido; si estaba bien, el contador sube y la siguiente pasa a su sitio. Se puede fijar un límite de segundos, de palabras o de las dos cosas. Un temporizador muestra los segundos desde el comienzo y, al terminar, la hoja enseña las palabras por minuto y a su derecha aparece el detalle con un teclado que marca las teclas más falladas. En un ordenador todo cabe en una pantalla, sin desplazarse.

## Cómo ejecutarla

Las palabras se cargan con `fetch` y los scripts son módulos ES, así que la página tiene que servirse por HTTP:

```bash
python3 -m http.server 8080
# http://localhost:8080
```

Abierta con `file://`, el navegador bloquea el módulo y la página se queda en su estado inicial, que es un aviso explicando cómo servirla.

## Funcionamiento

- Iniciar y Detener: el mismo botón arranca y para la prueba. También se empieza con Intro desde cualquier parte de la página (incluidos los botones de límite) y se detiene con Esc.
- Límites: a la izquierda de la hoja (encima en tableta y móvil) hay dos grupos de botones, Segundos (sin límite, 15, 30, 60 o 120) y Palabras (sin límite, 10, 25, 50 o 100). Se elige uno de cada grupo y la prueba acaba sola con el primero que se cumpla, como recuerda una nota bajo los botones; con los dos en sin límite solo se para con Detener, que funciona siempre. Mientras dura la prueba los botones quedan bloqueados y los marcadores muestran el tope («12 de 25 correctas», «34 de 60 segundos»). Además, el rodillo de tinta que corona la hoja se va llenando como el carro de la máquina: la parte recorrida en tinta y lo que falta en un gris claro, según el límite que vaya más avanzado. Si se acaba el tiempo, la prueba dura exactamente el límite aunque el temporizador lo detecte unas décimas tarde.
- Modo: un tercer grupo de botones elige cómo se pasa de palabra. En Libre, que es el modo por defecto, Espacio pasa siempre: si la palabra estaba bien suma a las correctas, y si estaba mal o a medias queda sin corregir, no suma y cada letra que faltaba cuenta como fallo en la precisión y en su tecla. En Estricto solo se avanza acertando, que es lo que describe el enunciado al pie de la letra. En los dos modos el contador de correctas y las palabras por minuto solo cuentan palabras bien escritas.
- Palabras de muestra: se sortean entre las más de 50 000 del almacén y nunca sale dos veces seguida la misma. Debajo de la que se escribe se ven las tres siguientes, cada una más pequeña, para no tener que parar a leer; al acertar, la cola sube una línea y entra otra por abajo. Una de cada cinco sale con la inicial en mayúscula.
- Validación letra a letra: cada letra se colorea según vaya bien, mal o falte por escribir, y un subrayado que se desliza de letra en letra marca la siguiente; con la palabra completa se queda detrás de la última, donde va el Espacio. Una palabra completa no pasa sola: hay que pulsar Espacio (o Intro), como entre dos palabras de un texto. Con el campo vacío no pasa nada. Lo que ocurre con una palabra mal o incompleta depende del modo: en Libre pasa como sin corregir; en Estricto se indica el error y no avanza, y comprobar una palabra correcta pero a medias cuenta como un fallo, apuntado a la letra que faltaba (si ya tenía una letra mal, ese fallo se contó al teclearla y la comprobación no suma otro).
- Correcciones: un error empieza en cuanto lo escrito deja de ser el principio de la palabra y queda corregido cuando, borrando, vuelve a serlo. Se mide el tiempo que pasa entre los dos momentos. Varias letras malas seguidas son un solo error, y si se pasa de palabra con el error abierto, ese error no se ha corregido. El Espacio que cierra una palabra bien escrita cuenta como pulsación acertada. El campo admite como mucho tres letras más que la palabra.
- Contador de correctas: sube con cada acierto y vuelve a cero en cada nuevo comienzo.
- Temporizador: arranca al pulsar Iniciar con `setInterval` y se para con `clearInterval`. Muestra los segundos transcurridos y, pasados cinco segundos, las palabras por minuto en vivo. En cada tic se comprueba además si se ha cumplido el límite de tiempo.
- Resultado: al terminar, la cifra de palabras por minuto ocupa en la hoja el sitio de la palabra y, debajo, en el hueco de la cola y el campo, queda la hoja escrita: todas las palabras pasadas en orden, en tres niveles. Las que salieron bien, en tinta; las que tuvieron un fallo y se corrigieron, con el subrayado ondulado rojo, y las que se pasaron sin corregir, con lo que se escribió tachado en rojo y la palabra pedida al lado en un recuadro, para que el fallo más grave se vea sin depender del color. Los marcadores se quedan con las correctas y los segundos finales, y en la columna de la derecha aparece el detalle (debajo del botón en el móvil): el tiempo con una décima, la precisión y la mejor marca en una fila; debajo, otra fila con los errores corregidos, el tiempo medio por corrección y las palabras sin corregir (en rojo si hay alguna); la gráfica de ritmo; la línea «Para practicar» con las palabras que quedaron sin corregir (hasta cinco), y el teclado de fallos.
- Gráfica de ritmo: una línea con las palabras por minuto acumuladas segundo a segundo, desde el quinto, que termina justo en la cifra grande, y debajo del eje una marca roja corta en el instante de cada fallo y otra el doble de larga y más gruesa donde se pasó una palabra sin corregir. No tiene segundo eje ni leyenda: una línea de referencia en el máximo redondeado a decenas basta para leer la escala. El pie de la figura lo resume en texto («Ritmo: de 38 a 47 ppm. Fallos en los segundos 3, 6 y 9.»). Con menos de 10 segundos no se dibuja y el pie lo explica. La marca se guarda en `localStorage` y solo cuentan las pruebas de cinco segundos o más; si se supera, se avisa.
- Teclado de fallos: un teclado español (QWERTY con Ñ y la tecla de mayúsculas) tiñe de rojo las teclas falladas en esa prueba, más intenso cuanto más se han fallado, y una frase debajo las enumera. Cada fallo se apunta a la tecla de la letra que se pedía. Si solo falló la mayúscula (`c` por `C`, o al revés), se apunta a `⇧`. Si solo faltó la tilde o la diéresis (`a` por `á`), se apunta a la tecla `´`, que en el teclado español está a la derecha de la Ñ y sirve para las dos. Lo que se teclea de más no corresponde a ninguna tecla y no se apunta. Por eso la suma del teclado nunca supera los fallos que cuenta la precisión, aunque puede quedarse por debajo.

Se exigen las tildes y las mayúsculas, porque las palabras con inicial mayúscula solo tienen sentido si hay que teclearla. El campo no admite pegar ni arrastrar texto.

### El almacén de palabras

`data/palabras.json` sale de la lista de palabras del diccionario ortográfico de español de LibreOffice (`es_ES.dic`). De sus 58 000 entradas se han quitado los nombres propios, las siglas y lo que lleva caracteres fuera del alfabeto español, y se han dejado las de 2 a 12 letras: 50 436 palabras, unos 620 KB (155 KB comprimidas, que es lo que sirve GitHub Pages). El tope de 12 letras evita que una palabra larguísima tenga que encogerse hasta ser ilegible en un móvil. Como la lista es la de un corrector, trae lemas y también algunas formas con pronombre (`dadle`, `jugártela`).

## Estructura

```
ipo2627_dinamarca_mecanografia/
├── index.html
├── favicon.svg           una tecla redonda de la M40 con la ñ
├── DESIGN.md             dirección de arte y especificación del diseño
├── img/                  captura y vista previa para compartir
├── css/
│   ├── tokens.css        orden de capas y variables (color, tipografía, espacio)
│   ├── base.css          reinicio, elementos sueltos y utilidades
│   ├── layout.css        disposición de las cajas y consulta de contenedor
│   ├── componentes.css   aspecto de límites, marcadores, hoja, cola, campo, botón, detalle y teclado de fallos
│   └── ritmo.css         aspecto de la gráfica de ritmo
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
    └── palabras.json     50 436 palabras del diccionario
```

El HTML enlaza las cinco hojas con `<link>` y un único `<script type="module">` hacia `main.js`; el resto de ficheros se importan entre sí con `import`. Las hojas usan `@layer`. El orden (`tokens, base, layout, componentes, utilidades`) se declara una vez en `tokens.css` y cada fichero rellena su capa (`ritmo.css` también va en `componentes`): `layout` decide cómo se colocan las cajas (`display`, rejillas, `gap`) y `componentes` cómo se ven. Así la cascada depende de las capas y no hace falta subir la especificidad ni usar `!important`: hasta la regla de `[hidden]` está en `utilidades`, la última capa.

## Arquitectura

Sigue el patrón MVC.

- `model/almacen.js` descarga `palabras.json`, descarta entradas repetidas o con espacios y normaliza a NFC. Sus errores llevan un mensaje pensado para el usuario según la causa: fallo de red, respuesta HTTP o JSON mal formado. También lee y guarda la mejor marca dentro de `try/catch`, porque `localStorage` puede no estar disponible, y descarta valores fuera de rango.
- `model/modelo.js` guarda el estado en campos privados: palabra actual, cola de las siguientes, texto escrito, límites, correctas, pulsaciones, fallos, fallos por tecla, instante de inicio y de fin, el modo y el registro de la prueba (cada palabra pasada con lo pedido, lo escrito, su estado y el instante; cuándo ocurrió cada fallo, y cuánto tardó cada corrección). Expone getters de solo lectura (`siguientes`, `limite`, `modo`, `limiteAlcanzado`, `progreso`, `pasadas`, `sinCorregir`, `correcciones`, `hayError`, `precision`, `palabrasPorMinuto`, `fallosPorTecla`…), los métodos `letras()` (estado de cada letra de la palabra en curso) y `ritmo(desdeMs)` (puntos de la gráfica e instantes de los fallos), y las operaciones `comenzar(limite, modo)`, `escribir`, `confirmar` (que devuelve el estado de la palabra pasada: `bien`, `corregida` o `sinCorregir`, o `null` si no avanza) y `detener`. Qué palabra sigue, cuándo lleva mayúscula, cuándo se ha cumplido un límite, cuánto falta para cumplirlo, cuándo empieza y acaba un error, qué es una PPM en cada instante y a qué tecla se apunta un fallo son reglas del dominio y viven aquí. No toca el DOM.
- `view/vista.js` localiza los nodos por atributos `data-vista`, escribe en ellos los valores que recibe (también reparte los fallos en cuatro niveles de color y redacta el resumen), lee los límites y el modo elegidos (`limite`, `modo`), dibuja la gráfica de ritmo (las escalas y el trazado son presentación) y avisa al controlador de lo que hace el usuario mediante `alPulsarBoton`, `alEscribir` y `alPulsarAtajo`. No conoce el modelo.
- `controller/controlador.js` es el único que habla con los dos y el dueño del intervalo: en cada tic repinta los marcadores y el progreso del límite o, si se ha cumplido, detiene la prueba y pasa a la vista el resultado con el ritmo, las palabras pasadas, las correcciones y las palabras sin corregir.
- `main.js` crea las piezas tras cargar las palabras con `await` en el nivel superior del módulo; si algo falla, la vista muestra el mensaje.

### El temporizador

El enunciado pide `setInterval`, pero contar ticks acumula deriva y en una pestaña en segundo plano el navegador los espacia. Por eso el modelo guarda `performance.now()` al comenzar y al detener y calcula el tiempo como diferencia. El intervalo, cada 200 ms, solo repinta los marcadores, y la vista únicamente toca el DOM si la cifra ha cambiado. El resultado final usa el tiempo real, con décimas, y las palabras por minuto salen exactas. Al detener, el controlador repinta los marcadores una última vez para que muestren el valor final y no el del último tic.

### Coordinación con el DOM y el CSSOM

El estado se comunica sobre todo con atributos, y el CSS decide cómo se ve:

- `data-estado` en `.app` vale `error` en el HTML de partida y después `cargando`, `parado` o `activo`. De él dependen la ayuda visible, el aspecto del botón, la cola, el campo deshabilitado y el modo compacto. Los botones de límite van en un `<fieldset>` que la vista deshabilita fuera del estado `parado`, y el CSS lo lee con `:disabled`.
- Los botones de límite son radios dentro de `<label>`: el radio queda invisible pero enfocable, y el aspecto sale de `:has(:checked)` y `:has(:focus-visible)` en la etiqueta. Así se eligen con el ratón, con Tab y las flechas, y el lector de pantalla los anuncia como grupo de opciones.
- `aria-invalid` en el campo sirve a la vez a las tecnologías de apoyo y como gancho del estilo de error. El mensaje de error aparece con el combinador de hermano (`.campo[aria-invalid="true"] + .controles__error`). Con `:has()`, mientras el resultado está abierto, se esconden las PPM del marcador, porque la cifra ya está en la hoja, y también la etiqueta y el renglón vacío, sin que cambie su alto.
- Cada letra de la muestra es un `<span>` con clase `letra--ok`, `letra--error`, `letra--pendiente` o `letra--sobrante`. Los spans se crean una vez por palabra y en cada pulsación solo cambian sus clases.
- La gráfica de ritmo es un SVG cuyos nodos se crean una sola vez con `createElementNS`; al terminar cada prueba la vista solo cambia atributos, `points` y textos. Los colores salen del CSS por clase, así que siguen al modo oscuro y a `forced-colors` sin tocar el JavaScript.
- Las 29 teclas del teclado de fallos se crean una sola vez. Al detener, la vista solo cambia su atributo `data-nivel` (de 0 a 4) y la cuenta que llevan dentro; el color sale del CSS.

El JavaScript solo escribe tres propiedades personalizadas con `style.setProperty`, y el CSS decide qué hacer con ellas:

- `--letras` en `.hoja`, para que la hereden la muestra y el campo, que calculan el mismo cuerpo con `clamp(1.75rem, calc(150cqi / (var(--letras) + 1)), var(--cuerpo-max))`. El `+ 1` deja sitio al cursor detrás de la última letra. La hoja es contenedor de consulta, de modo que `cqi` se mide contra su ancho y una palabra larga en una pantalla estrecha baja de tamaño y cabe en una línea.
- `--cursor` en `.muestra`: cuántos caracteres se han tecleado. El cursor es un `::after` de 1ch de ancho desplazado `calc(var(--cursor) * 1ch)`, que en una letra monoespaciada es justo el avance de cada carácter. Sin la propiedad, su ancho no es válido y no se dibuja.
- `--progreso` en `.hoja`, de 0 a 1, solo mientras dura una prueba con límite: el rodillo (`.hoja::before`) pinta la tinta con un degradado de corte duro de ese ancho sobre una pista clara. Fuera de la prueba la vista la quita y el rodillo vuelve a ser entero.

El teclado usa *subgrid*: la rejilla tiene 23 columnas de media tecla, cada fila hereda esas columnas y cada tecla ocupa dos, así que basta con empezar la segunda fila en la columna 2 para escalonarla. En la tercera, `⇧` ocupa las columnas 1 y 2 y la Z cae sola en la 3, una tecla más adentro que la Q, como en la máquina. La palabra y la cifra del resultado se apoyan al fondo de su celda con `align-content: end`, que ya funciona en bloques normales sin convertirlos en rejilla.

Las clases siguen BEM y se usan para el estilo; los `data-vista` los usa el JavaScript para encontrar nodos.

## Diseño

La idea de partida es la hoja de papel metida en una Hispano Olivetti M40, de la filial española de Olivetti, con la ñ en el teclado. La hoja sale de un rodillo, una barra de tinta redondeada algo más ancha que ella, y lleva en el punto de impresión un trozo de cinta de dos bandas, negra y roja, el único detalle de color fuera del error. La palabra de muestra aparece en la hoja en gris, como el modelo impreso de un cuaderno de academia, y lo que se teclea va cayendo encima en tinta negra; los errores, en tinta roja, como con la cinta bicolor. Debajo asoman las siguientes palabras, que suben una línea con cada acierto, como el papel que va saliendo del rodillo. El detalle completo, con medidas y contrastes, está en `DESIGN.md`.

### Cromático: monocromática sobre el rojo de la cinta

Hay un solo tono, `--tono: 0` (el rojo del círculo cromático), y todo lo demás sale de mover la saturación y la luminosidad en HSL. Con una saturación de entre el 5 y el 14 % salen los neutros, grises con una temperatura muy leve y todos de la misma familia. Con el 70-75 % sale el rojo, que se reserva para el error. El acierto no tiene color propio: es la tinta normal, igual que en la máquina.

| Variable | Papel | Claro | Oscuro |
|---|---|---|---|
| `--mesa` | fondo de la página | `#e7e4e4` | `#191515` |
| `--papel` | la hoja | `#fdfcfc` | `#262121` |
| `--renglon` | fondo del campo | `#f4f1f1` | `#312b2b` |
| `--tinta` | texto, letras acertadas, botón, rodillo | `#1f1919` | `#ede8e8` |
| `--tinta-intensa` | botón al pasar el puntero | `#433737` | `#d1c7c7` |
| `--tinta-suave` | etiquetas y notas | `#594f4f` | `#bcb3b3` |
| `--guia` | letras pendientes | `#736868` | `#a39999` |
| `--borde` | renglón del campo, controles deshabilitados | `#7c6e6e` | `#8c7d7d` |
| `--cinta` | error, banda roja de la cinta | `#af1d1d` | `#eb7070` |
| `--tinte-cinta` | fondo del campo con error | `#fbe9e9` | `#3d1a1a` |
| `--calor-0` a `--calor-4` | teclas del teclado de fallos | del gris al rojo | del gris al rojo |

Los dos modos se resuelven con `light-dark()` en la misma declaración. El oscuro funciona como papel carbón: la mesa casi negra, la hoja un escalón más clara y la tinta clara, de modo que la hoja sigue siendo la figura. Los contrastes cumplen WCAG AA en los dos: la tinta sobre el papel da 16,96 en claro y 13,08 en oscuro, las letras pendientes 5,24 y 5,73, y el rojo sobre el papel 6,79 y 5,34. El rojo y el gris de las letras pendientes tienen casi la misma luminosidad, y por eso el error nunca se marca solo con color.

### Tipográfico: dos familias contrastadas, cada una con su papel

- Monoespaciada de máquina (`Courier New` y sus equivalentes de Linux) para lo que escribe la máquina: la palabra, el texto del campo y la cifra de PPM del resultado. La razón es funcional. Con paso fijo, y con la misma pila, el mismo peso, el mismo cuerpo y la misma sangría en la muestra y en el campo, cada letra tecleada queda justo debajo de la letra que la pide. Va en negrita porque la Courier New normal es demasiado fina en pantalla, y en Courier la negrita no cambia el ancho. Muchas distribuciones de Linux no traen Courier New; en ese caso la pila pasa a Courier 10 Pitch, Nimbus Mono PS o Liberation Mono, y en último término a la monoespaciada del sistema. La alineación no se pierde, porque depende de que la muestra y el campo usen la misma pila y no de una fuente concreta.
- Sans de sistema para todo lo que dice la aplicación: título (en peso normal, para que la palabra de la hoja siga siendo lo que más pesa), etiquetas, marcadores, ayuda, botón, detalle y teclado de fallos. `system-ui` es la familia genérica que apunta a la fuente de la interfaz de cada sistema (Segoe UI, San Francisco, Cantarell o Roboto), así que se cumple lo de usar fuentes estándar.

No se descarga ninguna fuente. Los tamaños de texto salen de una escala modular de razón 1,25 en `rem`; solo la palabra de la hoja tiene un cuerpo fluido aparte. Las cifras usan `tabular-nums` y las mayúsculas se dejan para las teclas, como en un teclado real.

### Espacial

La página cabe en una pantalla. Arriba va solo el título, centrado y grande. Debajo, en escritorio (desde 64 rem de ancho), una rejilla de tres columnas: los límites a la izquierda, los marcadores y la hoja con el botón en el centro (44 rem como máximo) y el detalle del resultado a la derecha. Las columnas laterales miden 18 rem cuando hay sitio, así que la hoja queda centrada bajo el título; si falta, la de los límites cede hasta 11 rem, con el nombre de cada grupo encima de su tira de botones. La columna de los límites lleva un título visible, «Límites de la prueba», a la misma altura que «Detalle de la prueba» en la columna opuesta, para que las dos se lean como pareja. Entre 64 y 80 rem la columna central está en su mínimo y los tres marcadores con topes de tres cifras no caben en una fila, así que las PPM van siempre en su propia línea: si se partiera la fila a mitad de prueba, la hoja bajaría. La columna del detalle está reservada siempre, vacía hasta que acaba la prueba, y el detalle ocupa solo la fila de la hoja, de modo que su alto nunca empuja la hoja. El orden del DOM es título, límites, marcadores, prueba y detalle, y la rejilla lo coloca con `grid-template-areas`, sin `order`.

Entre 48 y 64 rem los límites pasan a una fila encima de los marcadores y el detalle sigue a la derecha de la hoja. Por debajo de 48 rem todo va en una columna en el orden del DOM: título, límites (cada grupo en una línea con su nombre delante), marcadores, hoja, botón y, debajo, el detalle.

Para que quepa también en ventanas bajas, los tamaños grandes se acotan por el alto: el título mide como mucho `8dvh`, el cuerpo máximo de la palabra `min(5.5rem, 10dvh)` (con él cambian el alto de su celda, el del campo y los huecos de la hoja) y los márgenes exteriores y el superior de la hoja `min(var(--espacio-5), 4dvh)`. Las medidas usan `rem`, `cqi` para el cuerpo de la hoja, `dvh` para los topes de alto y `fr` para las rejillas, siempre con propiedades lógicas.

Nada se mueve al empezar ni al terminar. La palabra y la cifra del resultado comparten una celda de alto fijo, la cola de siguientes tiene también alto fijo (se oculta con `visibility` fuera de la prueba), la hoja escrita del resultado ocupa las celdas de la cola y del campo con `contain: size`, de modo que no aporta alto, el botón mide lo mismo con «Iniciar» que con «Detener», el campo tiene también un alto fijo aunque su letra cambie con cada palabra y el detalle aparece en su columna reservada. La palabra nunca se parte: va en una sola línea, su cuerpo se calcula para que la más larga del almacén quepa a 320 px y lo que sobra al final se recorta en lugar de bajar a otra línea. La línea del mensaje de error queda reservada y las dos ayudas comparten celda y se alternan con `visibility`. Así, al pulsar Iniciar, ya sea desde el estado inicial o desde un resultado, ni el campo ni el botón cambian de sitio.

Principios de la Gestalt aplicados:

- Figura y fondo: la hoja es más clara que la mesa y se separa de ella solo por el tono, sin bordes ni sombras. El rodillo oscuro de su borde superior refuerza la lectura del papel saliendo de la máquina.
- Proximidad y región común: muestra, cola, etiqueta, campo y mensaje de error van juntos dentro de la hoja; los cinco botones de cada límite forman una tira con un solo borde exterior, así que se leen como dos grupos y no como diez cajas sueltas, el botón y la ayuda otro debajo de la hoja, y el detalle queda en la columna opuesta.
- Semejanza: todas las medidas, las de los marcadores y las del detalle, tienen la misma forma, una cifra grande en negrita con el nombre detrás. Los botones de límite se dibujan como el de Iniciar (borde de tinta, relleno de tinta el elegido) y, deshabilitados, con el mismo borde discontinuo que el botón y el campo. La tinta roja significa error en la letra, en el campo, en el mensaje y en el teclado.
- Escala: la palabra en curso es lo más grande de la pantalla, por encima del título, y cada palabra de la cola es un paso más pequeña de la escala tipográfica y algo más clara, como el papel que se aleja del rodillo, así que el orden de lectura se ve sin numerarlas.
- Continuidad: muestra y campo comparten borde izquierdo y paso de letra, y el ojo baja en vertical de la letra pedida a la tecleada.
- Cierre: el teclado de fallos se lee como un teclado completo aunque solo son círculos sueltos en tres filas escalonadas.

`.principal` y `.hoja` son contenedores de consulta. Si la columna mide menos de 30 rem, el cuerpo máximo de la palabra baja a `min(4.5rem, 7.5dvh)`, el margen lateral de la hoja pasa de 1,5 a 1 rem, las correctas ocupan su propia línea con los segundos y las PPM debajo, y las teclas del teclado de fallos se juntan para ganar tamaño. Por debajo de 20 rem (pantallas de 320 px), cada grupo de límites lleva el nombre encima y los botones a todo el ancho, y el botón ocupa todo el ancho con la ayuda debajo. En el móvil, `interactive-widget=resizes-content` hace que el teclado virtual encoja la ventana; si queda por debajo de 36 rem de alto durante la prueba, se ocultan la cabecera, los límites, la ayuda y todas las palabras de la cola menos la primera, y la palabra baja a 3,25 rem, para que la palabra, el campo y el tiempo sigan a la vista.

## Interacción y accesibilidad

- Atajos: Intro empieza (también con el foco en un botón de límite, para elegir y arrancar sin ratón), Espacio pasa a la siguiente palabra, Esc detiene y cualquier letra pulsada fuera del campo durante la prueba devuelve allí el foco. Se indican con `<kbd>` en una ayuda que cambia según el estado y en `aria-keyshortcuts`.
- Foco: al empezar va al campo y al detener al botón, así que Intro o Espacio relanzan la prueba sin ratón.
- Modo foco: durante la prueba el título y la columna de límites bajan a media opacidad (sin pasar de 3:1 de contraste); los marcadores, el tiempo y la hoja siguen a plena intensidad. No se aplica con `prefers-contrast: more` ni en `forced-colors`.
- El segundo clic de un doble clic en el botón se ignora (`event.detail`), y Esc con la prueba parada no hace nada.
- Teclados: con teclas muertas se espera a `compositionend` para que la tilde suelta no cuente como fallo. Los teclados de móvil que componen la palabra entera ven el progreso mientras escriben, y el Espacio, que en ellos no informa de la tecla, se detecta en el texto.
- El error se señala con algo más que el color: subrayado ondulado en la letra, tachado en lo que sobra, fondo y renglón del campo y un mensaje escrito.
- El teclado de fallos está oculto para las tecnologías de apoyo (`aria-hidden`) y no tiene nada enfocable. Toda su información está en el `figcaption`, que es texto visible y da nombre a la figura, y el anuncio final la repite. Así un lector de pantalla oye "Teclas con fallos: ñ (3), r (2) y tilde (1)" en lugar de recorrer 29 teclas. El nivel tampoco depende solo del color: en pantallas anchas cada tecla lleva su cuenta.
- Una sola región viva, fuera de los spans, anuncia el comienzo, cada palabra nueva (precedida de «Sin corregir: …» si la anterior se pasó mal), el primer error y el resumen final con las teclas falladas, las palabras corregidas y las sin corregir. La gráfica y la hoja escrita llevan `aria-hidden`: lo que dicen está en el pie de la figura y en ese anuncio. Los marcadores son un `<dl>` sin `aria-live`, para que el lector de pantalla no lea el reloj cada segundo.
- Movimiento: las letras no parpadean ni se mueven mientras se escribe. Al acertar, la cifra de correctas da un golpe corto, como el tipo que sube, marca y vuelve (140 ms, solo `transform`), y la palabra y la cola suben desde la línea de abajo mientras entra la nueva (160 ms, `translate` y `opacity`). El cursor se desliza a la letra siguiente en 100 ms y el rodillo se llena con una transición lineal de 200 ms. Al detener, la cifra del resultado y las piezas del detalle entran con un fundido escalonado desde `@starting-style`, porque pasan de `display: none` a visibles. El golpe, la subida de la cola, el deslizamiento del cursor, el llenado del rodillo, los fundidos, las transiciones de color del campo y del botón y el cambio de su icono solo se aplican con `prefers-reduced-motion: no-preference`. Al pulsarlo, el botón baja 1 px, y su *hover* solo existe con `(hover: hover)`, para que en una pantalla táctil no se quede marcado tras tocarlo.
- `forced-colors`: la hoja recupera un borde, el campo pasa a borde completo (doble si hay error) sin perder la alineación con la muestra, las letras erróneas y las teclas falladas usan los colores de resaltado del sistema (`Mark`), el límite elegido usa `Highlight` (`GrayText` si está bloqueado), el rodillo se llena en `CanvasText` sobre `GrayText`, la gráfica pasa a `CanvasText` con los fallos en `Mark`, el foco del campo usa `Highlight` y el icono del botón toma `ButtonText`.
- `prefers-contrast: more`: las letras pendientes, las tres palabras de la cola y el renglón pasan a la tinta suave, la mesa se oscurece un escalón para que la hoja destaque más, el renglón y el subrayado del error engordan y en el teclado de fallos las letras de las teclas sin fallos pasan a la tinta y el tercer nivel de rojo se separa más de su letra (de 5,5 a más de 6,8 de contraste).
- El botón mide al menos 48 px de alto y el campo bastante más. El foco es un anillo de 3 px en tinta, pegado al borde del campo; con error pasa a rojo, y se ve una sola línea.

## Créditos

La lista de palabras procede del [diccionario de español para LibreOffice](https://github.com/LibreOffice/dictionaries/tree/master/es) (proyecto RLA-ES, coordinado por Santiago Bosio), distribuido con triple licencia GPL 3, LGPL 3 o MPL 1.1; aquí se usa bajo la LGPL 3. Solo se ha filtrado, como se explica en «El almacén de palabras».
