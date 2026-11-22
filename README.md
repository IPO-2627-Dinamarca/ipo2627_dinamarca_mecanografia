# Proyecto Mecanografía

[Probar en línea](https://ipo-2627-dinamarca.github.io/ipo2627_dinamarca_mecanografia/)

![Resultado de una prueba en modo libre de 25 palabras: 99 palabras por minuto y 793 pulsaciones por minuto en la hoja y, debajo, la hoja escrita con las palabras bien, las corregidas con subrayado ondulado y las sin corregir con lo escrito tachado junto a la palabra pedida; a la izquierda los límites y el modo, y a la derecha el detalle con el tiempo, la precisión real y la final, las correcciones, la mejor marca, la gráfica de ritmo, las palabras para practicar y el teclado de fallos](img/captura.png)

La aplicación web consiste en un programa para testaer la velocidad en mecanografía.

# Objetivos

Los objetivos del proyecto son: 
- Manejo de intervalos (temporizador) en JS
- Interacción mediante teclado


# Descripción

El sistema interactúa con un único actor, que es el usuario que realizará la prueba de velocidad.

El sistema dispone de un almacén de palabras que serán mostradas como muestra para ser tecleadas por el usuario durante el test de velocidad.

La mecánica de la prueba es la siguiente:
- Comienzo y Detención: el usuario tendrá la capacidad de comenzar y detener la prueba. 
- Palabra de Muestra: durante la prueba el sistema mostrará una palabra de muestra seleccionada aleatoriamente de la colección de palabras para que el usuario la teclee. 
- Contador de palabras correctas: cuando el usuario termina de teclear la palabra de muestra correctamente, el sistema ofrecerá una nueva y procederá a actualizar un contador de palabras correctamente tecleadas. Este contador se pondrá a cero cada nuevo comienzo de test. 
- Temporizador: al comenzar el test se iniciará un temporizador que permitirá mostrar sucesivamente el número de segundos transcurridos desde que comenzó la prueba.


# Diseño

## Arquitectura 
- La aplicación deberá estar implementada siguiendo un patrón MVC (_Model-View-Controller_) con objeto de clarificar y diferenciar las distintas responsabilidades. 

## Organización 

- Tanto la distribución del código de los ficheros como la propia organización de los ficheros incluidos en la carpeta del proyecto deberán facilitar la comprensión y el mantenimiento de la solución aportada. 
- Se empleará un mecanismo moderno y apropiado para vincular los ficheros HTML, CSS y JS.

## Estilística

La vista del sistema deberá implementarse con el objeto de diferenciar los distintos aspectos considerados: diseño cromático, tipográfico y espacial. Y cada uno estará cimentado en una sólida estrategia:
  - diseño cromático: monocromática, triádica, complementaria, etc.
  - diseño tipográfico: dos fuentes contrastadas, una única fuente con niveles distintos de realce, etc.
  - diseño espacial: selección de unidades de medida y contenedores, principios de diseño `Gestalt`, etc. 

## Interacción 

La implementación de la interacción estará guiada para favorecer la usabilidad de la aplicación.

# Buenas prácticas

- Se deberá cuidar el etiquetado HTML con el objeto de reflejar adecuadamente la estructura de la página y del propio soneto.
- El empleo de una estrategia de selección en CSS de elementos HTML moderna y mantenible.
- Una sólida política de coordinación de JS tanto con el DOM (_Document Object Model_) como con el CSSOM (_CSS Object Model_)

## Referencias

- [MDN input_event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/input_event)
- [MDN: setInterval](https://developer.mozilla.org/en-US/docs/Web/API/setInterval)
- [MDN: clearInterval](https://developer.mozilla.org/en-US/docs/Web/API/clearInterval)


# Solución

La aplicación usa solo HTML, CSS y JavaScript del navegador. Para probarla hay que servir la carpeta con un servidor local (Live Server, `python3 -m http.server`...), porque las palabras se cargan con `fetch` y los módulos de JS no cargan si se abre el archivo directamente. En ese caso la página se queda en su estado inicial, que es un aviso que explica cómo servirla.

## Estructura

```
index.html                estructura de la página: límites, marcadores, hoja, mando y detalle
DESIGN.md                 dirección de arte: concepto, color, tipografía, espacio, componentes y revisiones
favicon.svg               icono: una tecla redonda de tinta con la ñ
img/
  captura.png, og.png     captura del README y vista previa al compartir el enlace
css/
  tokens.css              orden de capas y variables (cromático, tipográfico, espacial y tiempos)
  base.css                reinicio, foco visible y utilidades (hidden, visualmente-oculto)
  layout.css              reparto de la página y de cada pieza con Grid y Flexbox, consultas de contenedor
  componentes.css         límites, marcadores, hoja, cola, campo, botón, detalle y teclado de fallos
  ritmo.css               gráfica de ritmo
js/
  main.js                 punto de entrada: carga las palabras y crea modelo, vista y controlador
  model/
    almacen.js            descarga y depuración de las palabras y mejor marca en localStorage
    modelo.js             estado y reglas de la prueba
  view/
    vista.js              lectura y escritura del DOM, gráfica de ritmo y teclado de fallos
  controller/
    controlador.js        temporizador y coordinación entre modelo y vista
data/
  palabras.json           5 000 palabras comunes y 47 588 raras
```

## Arquitectura MVC

`Modelo` guarda el estado en campos privados: las dos listas de palabras, la palabra en curso y las tres siguientes, lo escrito, los límites, el modo, las correctas, las pulsaciones, los fallos de cada tecla, el instante de inicio y de fin, y un registro de la prueba con cada palabra pasada (lo pedido, lo escrito, su estado y el instante), el momento de cada fallo y lo que duró cada corrección. Expone getters de solo lectura (`palabra`, `siguientes`, `correctas`, `segundos`, `limite`, `modo`, `progreso`, `limiteAlcanzado`, `hayError`, `palabrasPorMinuto`, `pulsacionesPorMinuto`, `precision`, `precisionPalabras`, `correcciones`, `pasadas`, `sinCorregir`, `fallosPorTecla`...), que devuelven copias, los métodos `letras()` (el estado de cada letra) y `ritmo(desdeMs)` (los puntos de la gráfica) y las operaciones `comenzar(limite, modo)`, `escribir`, `confirmar` y `detener`. `confirmar` devuelve cómo quedó la palabra pasada (`bien`, `corregida` o `sinCorregir`), o `null` si no avanza. Qué palabra sigue, cuándo lleva mayúscula, cuándo se cumple un límite, cuándo empieza y acaba un error y a qué tecla se apunta un fallo son reglas del dominio y están aquí. El modelo no toca el DOM.

`almacen.js` descarga `palabras.json`, quita las entradas repetidas o con espacios, las normaliza a NFC y da un mensaje distinto si falla la red, la respuesta HTTP o el JSON. También lee y guarda la mejor marca dentro de `try/catch`, porque `localStorage` puede estar bloqueado, y descarta valores fuera de rango.

`Vista` localiza los nodos por `data-vista` y no conoce el modelo. Escribe los valores que recibe, lee los límites y el modo elegidos (getters `limite` y `modo`) y avisa al controlador mediante callbacks (`alPulsarBoton`, `alEscribir`, `alPulsarAtajo`). La presentación también es suya: reparte los fallos en niveles de color, redacta los resúmenes y dibuja la gráfica. El controlador es el único que habla con los dos: pide los cambios al modelo, dice a la vista qué mostrar, guarda la mejor marca y es el dueño del intervalo. `main.js` crea las piezas después de cargar las palabras con `await` en el nivel superior del módulo; si algo falla, la vista muestra el mensaje.

El enunciado pide `setInterval`, pero contar ticks acumula deriva, y en una pestaña en segundo plano el navegador los espacia. Por eso el modelo guarda `performance.now()` al empezar y al terminar y calcula el tiempo como diferencia. El intervalo, cada 200 ms, solo repinta los marcadores y comprueba los límites, y `clearInterval` lo para al detener. El límite se comprueba también en cada pulsación, así que una tecla que llega justo después de cumplirse termina la prueba en lugar de contar como error.

## Mecánica de la prueba

- Comienzo y detención: el mismo botón dice Iniciar o Detener. Intro empieza la prueba desde cualquier parte de la página, también con el foco en un botón de límite, y Esc la detiene. El contador de correctas vuelve a cero en cada comienzo.
- Límites: dos grupos de botones, Segundos (sin límite, 15, 30, 60 o 120; 60 por defecto) y Palabras (sin límite, 10, 25, 50 o 100; sin límite por defecto). La prueba acaba con el primero que se cumpla, y con los dos en sin límite solo para con Detener. Mientras dura, los botones quedan bloqueados, los marcadores muestran el tope («3 de 10 correctas», «5 de 15 segundos») y el rodillo de la hoja se llena según el límite que vaya más avanzado. Si se acaba el tiempo, la prueba dura exactamente el límite aunque el temporizador lo note unas décimas tarde.
- Modo: Libre (por defecto) o Estricto. En Libre, Espacio pasa siempre de palabra: si estaba bien suma a las correctas, y si estaba mal o a medias queda sin corregir, no suma y cada letra que faltaba cuenta como fallo. En Estricto solo se avanza acertando, como describe el enunciado; si se intenta pasar una palabra bien empezada pero incompleta, cuenta un fallo en la letra que faltaba.
- Palabra de muestra: se sortea del almacén y nunca sale la misma dos veces seguidas. Debajo se ven las tres siguientes, cada una más pequeña y más clara, para no tener que parar a leer; al pasar de palabra la cola sube una línea y entra otra por abajo. Una de cada cinco sale con la inicial en mayúscula. Se exigen las tildes y las mayúsculas.
- Validación letra a letra: cada letra se pinta según esté bien, mal o pendiente, lo que sobra sale tachado y un subrayado que se desliza marca la siguiente. Una palabra completa no pasa sola: hay que pulsar Espacio (o Intro), como entre dos palabras de un texto. Con el campo vacío no ocurre nada. El campo admite como mucho tres letras más que la palabra y no deja pegar ni arrastrar texto.
- Temporizador: muestra los segundos desde el comienzo. A partir del segundo 5 aparecen también en vivo las palabras por minuto y las pulsaciones por minuto; antes, un solo acierto daría cifras disparatadas.

### Medidas

- Palabras por minuto, rotuladas «palabras/min»: solo cuentan las palabras bien entregadas, con o sin corrección.
- Pulsaciones por minuto, rotuladas «ppm», que es como se suelen abreviar en mecanografía: son brutas. Cuentan cada carácter que llega al campo, acierte o falle, también los que luego se borran, y cada Espacio o Intro que pasa de palabra. No cuentan el Retroceso, el Espacio que no avanza ni las letras que faltaban en una palabra pasada a medias, porque no se teclearon.
- Precisión real: pulsaciones acertadas entre pulsaciones. Las letras que faltaban al pasar una palabra a medias cuentan como falladas.
- Precisión final: palabras bien entregadas entre palabras pasadas. Solo la bajan las que quedaron sin corregir, así que en Estricto siempre es del 100 %.
- Correcciones: un error empieza cuando lo escrito deja de ser el principio de la palabra y queda corregido cuando, borrando, vuelve a serlo. Varias letras malas seguidas son un solo error. El modelo guarda lo que tarda cada corrección y el detalle da la media. Si se pasa de palabra con el error abierto, la palabra queda sin corregir.

### Resultado

Al terminar, la cifra de palabras por minuto ocupa en la hoja el sitio de la palabra, con las pulsaciones por minuto debajo de su unidad. En el hueco de la cola y del campo queda la hoja escrita: todas las palabras pasadas, en orden y en tres niveles. Las que salieron bien van en tinta; las que tuvieron un fallo y se corrigieron, con subrayado ondulado rojo, y las que se pasaron sin corregir, con lo escrito tachado en rojo y la palabra pedida al lado en un recuadro. Así el fallo grave se distingue por la forma y no solo por el color. Lo que no cabe se recorta con un desvanecido.

A la derecha aparece el detalle de la prueba:

- Tiempo con una décima, precisión real y precisión final.
- Errores corregidos, tiempo medio por corrección y palabras sin corregir, cifra que pasa a rojo si hay alguna.
- Mejor marca en palabras/min, con «(nueva)» cuando se acaba de batir. Se guarda en `localStorage` y solo cuentan las pruebas de 5 segundos o más con alguna palabra correcta.
- Gráfica de ritmo: las palabras/min acumuladas segundo a segundo desde el quinto, con el último punto en el instante final para que coincida con la cifra de la hoja. Bajo el eje hay una marca roja corta en cada fallo y otra más alta y gruesa donde se pasó una palabra sin corregir. No lleva segundo eje ni leyenda: una línea de referencia en el máximo, redondeado a decenas, da la escala. El pie la resume en texto («Ritmo: de 48 a 57 palabras/min. 22 fallos, en los segundos 1, 3 y 4. 2 palabras sin corregir.»). Con menos de 10 segundos no se dibuja y el pie lo explica.
- Para practicar: las palabras que quedaron sin corregir, sin repetir, hasta cinco.
- Teclado de fallos: un teclado español de 29 teclas (QWERTY con Ñ, la tecla ´ a su derecha y ⇧) que tiñe de rojo las teclas falladas en cuatro niveles; la más fallada siempre llega al último. Encima, una frase nombra las cinco con más fallos. Cada fallo se apunta a la tecla de la letra que se pedía. Si solo falló la mayúscula (`c` por `C`, o al revés), se apunta a ⇧, y si solo faltó la tilde o la diéresis (`a` por `á`), a ´. Lo tecleado de más no corresponde a ninguna tecla y no se apunta, de modo que la suma del teclado puede quedar por debajo de los fallos de la precisión.

### El almacén de palabras

`data/palabras.json` tiene dos listas, `comunes` y `raras`, todas de 2 a 12 letras. El modelo sortea de las raras con probabilidad 1/300 y de las comunes el resto de las veces.

- `comunes`: las 5 000 palabras más frecuentes del español según FrequencyWords, una lista sacada de subtítulos. Por eso incluye las formas que se usan al hablar (`está`, `tengo`, `dime`) y no solo lemas. Se han quitado los nombres propios (salvo los que también son palabras españolas, como `flores`), muletillas de subtítulos (`ok`, `hey`, `hmm`), algunas erratas sin tilde (`dia`, `fué`), vulgarismos e insultos.
- `raras`: 47 588 palabras del diccionario ortográfico de español de LibreOffice que no están entre las comunes, sin nombres propios, siglas ni caracteres ajenos al alfabeto español. Como es la lista de un corrector, trae palabras poco usadas y alguna forma con pronombre (`dadle`, `jugártela`).

El tope de 12 letras evita que una palabra larguísima tenga que encogerse hasta ser ilegible en un móvil. El fichero pesa unos 630 KB, unos 170 KB comprimido con gzip.

## Composición y posicionamiento

- Grid para lo bidimensional: la página, `.principal`, la hoja, el mando, las filas del detalle y el teclado. En escritorio (desde 64 rem) `.principal` tiene tres columnas: los límites a la izquierda, los marcadores y la hoja en el centro (entre 30 y 44 rem) y el detalle a la derecha. Las laterales miden 18 rem cuando hay sitio, así que la hoja queda centrada bajo el título; si falta, la de los límites cede hasta 11 rem. La columna del detalle está reservada siempre y el detalle ocupa solo la fila de la hoja, de modo que su alto nunca empuja la hoja ni el botón. Entre 48 y 64 rem los límites pasan a una fila arriba y el detalle sigue a la derecha de la hoja. Por debajo de 48 rem va todo en una columna. La rejilla coloca las piezas con `grid-template-areas` y el orden del DOM (título, límites, marcadores, prueba y detalle) es también el del tabulador.
- La hoja es una rejilla de tres filas con nombre (`linea`, `cola`, `controles`). La palabra, la cifra del resultado y el aviso de error comparten la celda `linea`, de alto fijo; la cola tiene también alto fijo y se oculta con `visibility`; el campo mide lo mismo con cualquier palabra, y la hoja escrita ocupa las celdas de la cola y del campo con `contain: size`, sin aportar alto. El botón mide lo mismo con «Iniciar» que con «Detener», y las dos ayudas comparten celda y se alternan con `visibility`. Por eso el campo y el botón no se mueven al empezar, con un error ni al ver el resultado.
- En el móvil no caben a la vez la hoja y el detalle. Con el resultado abierto aparece un conmutador «Hoja | Detalle», hecho con dos radios, y el CSS decide qué se ve con `:has(:checked)`; el JavaScript solo marca «Hoja» en cada resultado. Con el resultado se ocultan los marcadores, que repiten lo que dice la hoja, y con «Detalle» también los límites.
- Flexbox para lo unidimensional: cada tira de botones de límite, los marcadores en escritorio ancho, la cifra del resultado con sus unidades, el botón y la hoja escrita, que se parte en líneas como un texto.
- Marcadores: desde 80 rem van los cuatro en una línea. Entre 48 y 80 rem van en dos filas fijas (correctas y segundos arriba, las dos velocidades abajo), porque con topes de tres cifras no caben en una y partirse a mitad de prueba bajaría la hoja. En columna estrecha son dos filas de dos, con la cifra sobre el nombre.
- `position` para lo que se superpone sin ocupar sitio: el rodillo (`.hoja::before`, más ancho que la hoja), la cinta bicolor en el punto de impresión (`.hoja::after`), el cursor (`.muestra::after`, que se desplaza con `translate`), los radios de los límites, invisibles pero enfocables dentro de su etiqueta, y la utilidad `.visualmente-oculto`, que deja textos solo para el lector de pantalla.
- Consultas de contenedor: `.principal`, `.hoja`, `.ajustes`, `.marcadores` y `.teclado` son contenedores con nombre. El cuerpo de la palabra se mide en `cqi` contra el ancho de la hoja. Si los límites miden menos de 20 rem (en la columna lateral del escritorio o a 320 px), cada grupo lleva el nombre encima y los botones a todo el ancho. Si la columna principal mide menos de 30 rem, el cuerpo máximo de la palabra baja a `min(4.5rem, 7dvh)` y el margen lateral de la hoja a 1 rem; por debajo de 20 rem, la ayuda pasa debajo del botón. Si el teclado de fallos mide menos de 30 rem, sus letras bajan un paso y las cuentas las da la frase.
- En escritorio todo cabe en una pantalla, sin desplazarse, en los tres estados. Los tamaños grandes se acotan también por el alto: el título mide como mucho `8dvh`, el cuerpo máximo de la palabra `min(5.5rem, 10dvh)` y el margen exterior `min(var(--espacio-5), 4dvh)`, que baja a `3dvh` en ventanas de menos de 45 rem de alto.
- Modo compacto: el viewport lleva `interactive-widget=resizes-content`, así que en el móvil el teclado virtual encoge la ventana. Si durante la prueba queda por debajo de 36 rem de alto, se ocultan el título, los límites, la ayuda y la cola salvo su primera palabra, y la palabra baja a 3,25 rem, para que la palabra, el campo y el tiempo sigan a la vista. En pantallas de 320 × 568, antes de empezar, también se recogen los nombres de los límites, la etiqueta del campo y la ayuda (que siguen para el lector de pantalla) para que el inicio quepa entero.

## Estilística

Cada estrategia tiene su bloque en `css/tokens.css`, y el resto de hojas solo usa esas variables: colores, fuentes, escala tipográfica, espacios, anchos de columna, radio, anillo de foco y duraciones.

### Cromática

La idea de partida es la hoja de papel metida en una Hispano Olivetti M40, la máquina de la filial española de Olivetti, con la ñ en el teclado. La hoja sale de un rodillo de tinta y lleva en el punto de impresión un trozo de cinta de dos bandas, negra y roja. La palabra de muestra aparece en gris, como el modelo impreso de un cuaderno de academia, y lo que se teclea cae encima en tinta; los errores, en tinta roja, como con la cinta bicolor.

El esquema es monocromático. Hay un solo tono, `--tono: 0` (el rojo del círculo cromático), y todo sale de mover la saturación y la luminosidad en HSL. Con una saturación de entre el 5 y el 14 % salen los neutros, grises con una temperatura muy leve y todos de la misma familia; con el 70-75 %, el rojo, que se reserva para el error. El acierto va en la tinta normal, sin color propio, como en la máquina.

| Variable | Papel | Claro | Oscuro |
|---|---|---|---|
| `--mesa` | fondo de la página | `#e7e4e4` | `#191515` |
| `--papel` | la hoja | `#fdfcfc` | `#262121` |
| `--renglon` | fondo del campo | `#f4f1f1` | `#312b2b` |
| `--tinta` | texto, letras acertadas, botón, rodillo | `#1f1919` | `#ede8e8` |
| `--tinta-suave` | etiquetas y notas | `#594f4f` | `#bcb3b3` |
| `--guia` | letras pendientes y cola | `#736868` | `#a39999` |
| `--borde` | renglón del campo, controles bloqueados | `#7c6e6e` | `#8c7d7d` |
| `--cinta` | error, banda roja de la cinta | `#af1d1d` | `#eb7070` |
| `--calor-0` a `--calor-4` | teclas del teclado de fallos | del gris al rojo | del gris al rojo |

Los dos modos se resuelven con `light-dark()` en la misma declaración. El oscuro funciona como papel carbón: mesa casi negra, hoja un escalón más clara y tinta clara, así que la hoja sigue siendo la figura. Los textos cumplen el nivel AA en los dos: la tinta sobre el papel da 16,96:1 en claro y 13,08:1 en oscuro, las letras pendientes 5,24 y 5,73, y el rojo sobre el papel 6,79 y 5,34. La segunda y la tercera palabra de la cola mezclan la guía con el papel (`color-mix`) y bajan a 3,56 y 3,07 en claro, que basta para texto grande en negrita. La escala de calor del teclado es el mismo tono cada vez más saturado. El rojo y el gris de las letras pendientes tienen casi la misma luminosidad, y por eso el error nunca se marca solo con color.

### Tipográfica

Dos familias contrastadas, cada una con su papel, y ninguna descargada:

- Una monoespaciada de máquina (`Courier New` y, donde no está, Courier 10 Pitch, Nimbus Mono PS o Liberation Mono) para lo que escribe la máquina: la palabra, la cola, el campo, la cifra del resultado, la hoja escrita y las palabras para practicar. La razón es funcional. Con paso fijo, y con la misma pila, peso, cuerpo y sangría en la muestra y en el campo, cada letra tecleada queda justo debajo de la que la pide. Va en negrita porque la Courier New normal es demasiado fina en pantalla, y en Courier la negrita no cambia el ancho. La alineación depende de que muestra y campo usen la misma pila, no de una fuente concreta.
- La sans del sistema (`system-ui`) para lo que dice la aplicación: título, límites, marcadores, ayuda, botón, detalle y teclado de fallos. El título va en peso normal y no pasa del 80 % del cuerpo de la palabra, para que lo que más pese en la pantalla sea la palabra de la hoja.

Los tamaños salen de una escala modular de razón 1,25 en `rem`: 12,8 px para notas y nombres del detalle, 16 px para el texto, 20 px para las cifras del detalle y la hoja escrita, 25 y 31,25 px para la cola y las cifras de los marcadores, y 39 px para el «¿Empezamos?» del inicio. Fuera de la escala solo quedan el título, fluido entre 32 y 68 px y acotado a `8dvh`, y el cuerpo de la palabra, que se calcula con el número de letras para que la más larga quepa a 320 px. Las cifras usan `tabular-nums` para que no bailen. Las mayúsculas se dejan para las teclas, como en un teclado real, y las abreviaturas «palabras/min» y «ppm» van en `abbr` con el nombre completo.

### Espacial

Unidades `rem` para texto y espaciado, con una escala de 0,25, 0,5, 1 y 1,5 rem y un último paso fluido de 1,5 a 3 rem; `cqi` para el cuerpo de la hoja, `dvh` para los topes de alto, `ch` para el cursor y la medida de lectura (60 caracteres) y `fr` para las rejillas. Todas las medidas usan propiedades lógicas (`inline-size`, `padding-block`...). Muestra, cola, campo y hoja escrita comparten la misma sangría de 0,75 rem. El radio es de 2 px, casi recto, salvo en las teclas, que son círculos como las de la M40. Los botones de límite miden al menos 44 px y el botón principal 48 px de alto.

Principios de la Gestalt:

- Figura y fondo: la hoja es más clara que la mesa y se separa de ella solo por el tono, sin bordes ni sombras. El rodillo oscuro de su borde superior refuerza la lectura del papel saliendo de la máquina.
- Proximidad y región común: palabra, cola, campo y mensaje de error van juntos dentro de la hoja. Los botones de cada límite forman una tira con un solo borde exterior de 2 px y separadores de 1 px, así que se leen como tres grupos y no como doce cajas sueltas. El botón y la ayuda forman otro grupo debajo de la hoja, y el detalle queda en la columna opuesta a los límites, con su título a la misma altura que «Límites de la prueba».
- Semejanza: todas las medidas, las de los marcadores y las del detalle, tienen la misma forma, una cifra en negrita con el nombre al lado o debajo. Los botones de límite se dibujan como el de Iniciar, y bloqueados llevan el mismo borde discontinuo que el botón y el campo deshabilitados. El rojo significa error en la letra, en el campo, en el mensaje, en la hoja escrita, en la gráfica y en el teclado.
- Escala: la palabra en curso es lo más grande de la pantalla, y cada palabra de la cola es un paso más pequeña y algo más clara, como el papel que se aleja del rodillo, así que el orden de lectura se ve sin numerarlas.
- Continuidad: muestra y campo comparten borde izquierdo y paso de letra, y el ojo baja en vertical de la letra pedida a la tecleada.
- Cierre: el teclado de fallos se lee como un teclado completo aunque son círculos sueltos en tres filas escalonadas.

## Interacción y usabilidad

- Atajos: Intro empieza, Espacio pasa a la siguiente palabra, Esc detiene y cualquier letra pulsada fuera del campo durante la prueba le devuelve el foco. Se indican con `<kbd>` en una ayuda que cambia con el estado y en `aria-keyshortcuts` del botón, que pasa de `Enter` a `Escape` al empezar.
- Foco: al empezar va al campo y al terminar al botón, así que Intro relanza la prueba sin tocar el ratón. El segundo clic de un doble clic en el botón se ignora (`event.detail`) para no empezar y parar a la vez.
- Teclados: con teclas muertas se espera a `compositionend`, para que la tilde suelta no cuente como fallo. En los teclados de móvil, que no informan de la tecla, el Espacio se detecta en el texto, y si el teclado compone la palabra entera se ve el progreso mientras se escribe.
- El error se señala con algo más que el color: subrayado ondulado en la letra, tachado en lo que sobra, fondo y renglón del campo en rojo y el mensaje «Palabra incompleta o con errores.».
- Modo foco: durante la prueba el título y la columna de límites bajan a media opacidad (el título conserva 3,15:1) y los marcadores y la hoja siguen a plena intensidad. No se aplica con `prefers-contrast: more` ni en `forced-colors`.
- Movimiento: si el sistema no pide reducirlo (`prefers-reduced-motion`), la cifra de correctas da un golpe corto al acertar, como el tipo que sube y vuelve (140 ms), la palabra y la cola suben una línea al pasar (160 ms), el cursor se desliza a la letra siguiente (100 ms), el rodillo se llena con una transición lineal y, al terminar, la cifra del resultado y las piezas del detalle entran con un fundido escalonado. Las letras nunca se mueven mientras se escribe. Al pulsar el botón, este baja 1 px, como una tecla; eso ocurre siempre, porque no es una animación.
- Accesibilidad: una región `aria-live="polite"` anuncia el comienzo, cada palabra nueva (precedida de «Sin corregir: ...» si la anterior se pasó mal), cada error en cuanto aparece y un resumen final con las velocidades, las precisiones, las teclas falladas y las palabras corregidas y sin corregir. Los marcadores son un `<dl>` sin región viva, para que el lector de pantalla no lea el reloj cada segundo. La gráfica, la hoja escrita y el teclado llevan `aria-hidden`: lo que dicen está en los `figcaption` visibles y en el anuncio final. El campo usa `aria-invalid`, `aria-errormessage` y `aria-describedby` hacia la ayuda. Los límites son radios nativos dentro de `fieldset` y `legend`, así que se eligen con Tab y las flechas y se anuncian como grupo.

## Recursos de CSS

- Capas (`@layer tokens, base, layout, componentes, utilidades`), declaradas una sola vez en `tokens.css`. `layout` decide dónde va cada caja y `componentes` cómo se ve. El orden de las capas decide qué regla gana, así que no hace falta ningún `!important`: hasta la regla de `[hidden]` está en `utilidades`, la última.
- Clases con nomenclatura BEM y sin ids para el estilo; el anidamiento nativo se usa para estados y contextos (`&:has(:checked)`, `.ajustes:disabled &`), y las medidas usan propiedades lógicas.
- `:has()` para leer el estado sin clases extra: el límite elegido y enfocado (`:has(:checked)`, `:has(:focus-visible)`), ocultar las velocidades y el campo mientras el resultado está abierto y el conmutador Hoja | Detalle del móvil. El mensaje de error aparece con el combinador de hermano (`.campo[aria-invalid="true"] + .controles__error`).
- El teclado usa `subgrid`: la rejilla tiene 23 columnas de media tecla, cada fila las hereda y cada tecla ocupa dos. La segunda fila empieza en la columna 2 para escalonarse media tecla; en la tercera, ⇧ ocupa las dos primeras y la Z cae en la tercera.
- `@starting-style` fija desde dónde empieza la transición de lo que pasa de `display: none` a visible: la cifra del resultado, la hoja escrita y las piezas del detalle, con retardos escalonados de 60 ms.
- La hoja escrita usa `contain: size` para no aportar alto y `mask-image` para desvanecer la última línea de lo que no cabe.
- `forced-colors`: en el modo de alto contraste la hoja recupera un borde, el campo pasa a borde completo (doble si hay error) sin descuadrar las letras, las letras erróneas y las teclas falladas usan los colores de resaltado del sistema (`Mark`), el límite elegido usa `Highlight`, el rodillo se llena en `CanvasText` sobre `GrayText` y la gráfica pasa a `CanvasText` con los fallos en `Mark`. En el teclado el nivel se lee en el grosor del borde, de 1 a 4 px. Las corregidas solo llevan el subrayado y las sin corregir el tachado y el recuadro, así que se distinguen por la forma.
- `prefers-contrast: more`: las letras pendientes, la cola y el renglón pasan a la tinta suave, la mesa se oscurece un escalón para que la hoja destaque más, el renglón, los subrayados y los tachados engordan, y el tercer nivel de rojo del teclado se separa más de su letra (de 5,54 a 7,32 de contraste en claro).
- El *hover* solo existe en `(hover: hover)`, para que en pantallas táctiles no se quede marcado tras tocar.

## Buenas prácticas

- HTML semántico: `header` con el único `h1`, `main`, los límites en un `fieldset` con un `fieldset` y su `legend` por grupo, los marcadores y los datos del detalle como listas de definiciones, la cola y la hoja escrita como listas ordenadas, lo tachado y lo pedido con `del` e `ins`, la prueba y el detalle como `section` con su título, y la gráfica y el teclado como `figure` con `figcaption`. También `theme-color` para modo claro y oscuro, metadatos para compartir el enlace y un favicon SVG propio.
- Vinculación: el HTML enlaza las cinco hojas con `<link>` y un único `<script type="module">` hacia `main.js`; el resto de ficheros se importan entre sí con `import`.
- JS y DOM: la vista localiza los nodos por `data-vista` (las clases quedan para el estilo) y crea una sola vez lo que se repite. Cada letra de la palabra es un `<span>` creado al mostrarla, y en cada pulsación solo cambia su clase (`letra--ok`, `letra--error`, `letra--pendiente` o `letra--sobrante`). Los nodos de la gráfica se crean una vez con `createElementNS` y después solo cambian atributos y textos, y las 29 teclas igual. El temporizador refresca cinco veces por segundo, así que la vista solo toca un nodo si su texto ha cambiado. Números y listas se formatean con `Intl` («10,5 s», «78 %», «publicidad y generalmente»).
- JS y CSSOM: el JS no escribe estilos sueltos. El estado se comunica con atributos y tres propiedades personalizadas, y el CSS decide cómo se ve:
  - `data-estado` en `.app` vale `error` en el HTML de partida y después `cargando`, `parado` o `activo`. De él dependen el aspecto del botón, la ayuda visible, la cola, el modo foco y el modo compacto.
  - `aria-invalid` en el campo sirve a la vez a las tecnologías de apoyo y como gancho del estilo de error. `data-nivel` (0 a 4) en cada tecla y `data-cuenta` en la cifra de sin corregir dan el color.
  - `--letras` en `.hoja`: la muestra y el campo calculan con ella el mismo cuerpo, `clamp(1.75rem, calc((100cqi - 2 * var(--sangria)) * 1.55 / (var(--letras, 8) + 1)), var(--cuerpo-max))`. El `+ 1` deja sitio al cursor detrás de la última letra, y una palabra larga en una pantalla estrecha baja de tamaño y cabe en una línea.
  - `--cursor` en `.muestra`: cuántos caracteres se han tecleado. El cursor es un `::after` de 1ch desplazado `calc(var(--cursor) * 1ch)`, que en una letra monoespaciada es justo el avance de cada carácter.
  - `--progreso` en `.hoja`, de 0 a 1, solo mientras dura una prueba con límite: el rodillo pinta la tinta con un `background-size` de ese ancho sobre una pista más clara. Fuera de la prueba la vista la quita y el rodillo vuelve a ser entero.

## Créditos

Las palabras comunes se han elegido con la lista de frecuencias del español de [FrequencyWords](https://github.com/hermitdave/FrequencyWords), de Hermit Dave (licencia MIT), y las raras proceden del [diccionario de español para LibreOffice](https://github.com/LibreOffice/dictionaries/tree/master/es) (proyecto RLA-ES), distribuido con triple licencia GPL 3, LGPL 3 o MPL 1.1; aquí se usa bajo la LGPL 3. Solo se han filtrado, como se explica en «El almacén de palabras».
