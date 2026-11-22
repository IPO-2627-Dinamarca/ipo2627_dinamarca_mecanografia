const ENTERO = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
const SEGUNDOS = new Intl.NumberFormat('es', {
  style: 'unit', unit: 'second', unitDisplay: 'short', maximumFractionDigits: 1,
});
const PORCENTAJE = new Intl.NumberFormat('es', { style: 'percent', maximumFractionDigits: 0 });
const LISTA = new Intl.ListFormat('es', { type: 'conjunction' });

// Teclado español: la ´ está a la derecha de la ñ y recoge los fallos de tilde y diéresis;
// ⇧ recoge los de mayúscula.
const FILAS = ['qwertyuiop', 'asdfghjklñ´', '⇧zxcvbnm'];
const NOMBRES_TECLA = { '´': 'tilde', '⇧': 'mayúsculas' };
const NIVELES = 4;
const TECLAS_EN_RESUMEN = 5;
const PALABRAS_EN_RESUMEN = 5;

// Gráfica de ritmo en unidades del viewBox (288 × 112, que a tamaño natural son 18rem × 7rem).
const SVG = 'http://www.w3.org/2000/svg';
const RITMO = { izquierda: 2, derecha: 254, techo: 18, base: 80, marca: 6, marcaAlta: 14, rotulo: 106 };
// Por debajo de este tiempo la serie tendría tan pocos puntos que no diría nada.
const RITMO_MIN_S = 10;
const SEGUNDOS_EN_RESUMEN = 6;

// Lo tecleado de más que admite el campo; más allá no aporta nada y rompería la línea.
const SOBRANTES_MAX = 3;
// Pegar y arrastrar texto; la composición de teclas muertas y teclados de móvil sí se admite.
const INSERCIONES_BLOQUEADAS = new Set([
  'insertFromPaste', 'insertFromDrop', 'insertFromYank', 'insertFromPasteAsQuotation',
]);

const nombreTecla = (tecla) => NOMBRES_TECLA[tecla] ?? tecla;

// Los primeros max elementos y, si sobran, cuántos más.
function acotar(elementos, max) {
  const partes = elementos.slice(0, max);
  const resto = elementos.length - max;
  if (resto > 0) partes.push(`${resto} más`);
  return partes;
}

const listaAcotada = (elementos, max) => LISTA.format(acotar(elementos, max));

const textoCorrectas = (n) => `${n} ${n === 1 ? 'palabra correcta' : 'palabras correctas'}`;
const textoSinCorregir = (n) => `${n} ${n === 1 ? 'palabra' : 'palabras'} sin corregir`;

function crearLetra(letra) {
  const span = document.createElement('span');
  span.className = 'letra letra--pendiente';
  span.textContent = letra;
  return span;
}

function crearPalabraEnCola(texto) {
  const li = document.createElement('li');
  li.className = 'cola__palabra';
  li.textContent = texto;
  return li;
}

// Solo se toca el DOM si el valor cambia: el temporizador refresca varias veces por segundo.
function escribirTexto(nodo, texto) {
  if (nodo.textContent !== texto) nodo.textContent = texto;
}

// Leer una medida fuerza el reflow y reinicia la animación aunque la anterior no haya acabado.
function reiniciarAnimacion(nodo, clase) {
  nodo.classList.remove(clase);
  void nodo.offsetWidth;
  nodo.classList.add(clase);
}

const leerOpcion = (raiz, nombre) => raiz.querySelector(`input[name="${nombre}"]:checked`)?.value ?? '';

const leerLimite = (raiz, nombre) => {
  const valor = leerOpcion(raiz, nombre);
  return valor === '' ? null : Number(valor);
};

function crearSvg(padre, etiqueta, clase, atributos = {}) {
  const nodo = document.createElementNS(SVG, etiqueta);
  nodo.setAttribute('class', clase);
  for (const [nombre, valor] of Object.entries(atributos)) nodo.setAttribute(nombre, valor);
  padre.append(nodo);
  return nodo;
}

function crearPalabraEscrita({ pedida, escrita, estado }) {
  const li = document.createElement('li');
  li.className = 'escrita__palabra';
  if (estado === 'corregida') li.classList.add('escrita__palabra--corregida');
  if (estado !== 'sinCorregir') {
    li.textContent = pedida;
    return li;
  }
  li.classList.add('escrita__palabra--sin-corregir');
  const escrito = document.createElement('del');
  escrito.className = 'escrita__escrito';
  escrito.textContent = escrita;
  const correcta = document.createElement('ins');
  correcta.className = 'escrita__pedida';
  correcta.textContent = pedida;
  li.append(escrito, correcta);
  return li;
}

// Cada palabra en su span y los separadores que pone Intl.ListFormat entre ellas.
function crearListaPalabras(palabras) {
  const partes = acotar(palabras, PALABRAS_EN_RESUMEN);
  let indice = 0;
  return LISTA.formatToParts(partes).map(({ type, value }) => {
    if (type !== 'element' || indice++ >= PALABRAS_EN_RESUMEN) return document.createTextNode(value);
    const span = document.createElement('span');
    span.className = 'informe__palabra';
    span.textContent = value;
    return span;
  });
}

function resumirRitmo(puntos, fallos) {
  const [desde, hasta] = [puntos[0], puntos.at(-1)].map((p) => ENTERO.format(p.ppm));
  const valores = puntos.map((p) => p.ppm);
  const [menor, mayor] = [Math.min(...valores), Math.max(...valores)].map((n) => ENTERO.format(n));
  const ritmo = desde !== hasta ? `Ritmo: de ${desde} a ${hasta} palabras/min.`
    : menor === mayor ? `Ritmo: ${hasta} palabras/min de principio a fin.`
      : `Ritmo: empieza y acaba en ${hasta} palabras/min, entre ${menor} y ${mayor}.`;
  if (fallos.length === 0) return `${ritmo} Sin fallos.`;

  // Segundo de cada fallo como ordinal (el primero es el 1), sin repetir.
  const segundos = [...new Set(fallos.map((s) => Math.max(1, Math.ceil(s))))].map(String);
  const cuantos = fallos.length === 1 ? 'Un fallo' : `${ENTERO.format(fallos.length)} fallos`;
  const cuando = segundos.length === 1 ? `en el segundo ${segundos[0]}.`
    : segundos.length > SEGUNDOS_EN_RESUMEN
      ? `en los segundos ${segundos.slice(0, SEGUNDOS_EN_RESUMEN).join(', ')}…`
      : `en los segundos ${LISTA.format(segundos)}.`;
  return `${ritmo} ${cuantos}, ${cuando}`;
}

const textoTope = (limite) => (limite === null ? '' : `de ${ENTERO.format(limite)}`);

/** Presentación en el DOM. Recibe valores ya calculados y avisa al controlador de lo que hace el usuario. */
export class Vista {
  #app;
  #palabra;
  #cola;
  #ajustes;
  #topes;
  #correctas;
  #segundos;
  #ppm;
  #pulsaciones;
  #campo;
  #boton;
  #mensaje;
  #anuncio;
  #resultado;
  #hoja;
  #informe;
  #resumen;
  #teclas;
  #ritmo;
  #escrita;
  #practicar;
  #letras = [];

  constructor(raiz = document) {
    const nodo = (nombre) => raiz.querySelector(`[data-vista="${nombre}"]`);
    this.#app = nodo('app');
    this.#palabra = nodo('palabra');
    this.#cola = nodo('cola');
    this.#ajustes = nodo('ajustes');
    this.#topes = { palabras: nodo('tope-palabras'), segundos: nodo('tope-segundos') };
    this.#correctas = nodo('correctas');
    this.#segundos = nodo('segundos');
    this.#ppm = nodo('ppm');
    this.#pulsaciones = nodo('pulsaciones');
    this.#campo = nodo('campo');
    this.#boton = nodo('boton');
    this.#mensaje = nodo('mensaje');
    this.#anuncio = nodo('anuncio');
    this.#hoja = nodo('hoja');
    this.#informe = nodo('informe');
    this.#resumen = nodo('fallos-resumen');
    this.#teclas = Vista.#crearTeclado(nodo('teclado'));
    this.#ritmo = { ...Vista.#crearRitmo(nodo('ritmo')), resumen: nodo('ritmo-resumen') };
    this.#escrita = nodo('escrita');
    this.#practicar = nodo('practicar');
    this.#resultado = {
      panel: nodo('resultado'),
      ppm: nodo('resultado-ppm'),
      pulsaciones: nodo('resultado-pulsaciones'),
      tiempo: nodo('resultado-tiempo'),
      precision: nodo('resultado-precision'),
      precisionFinal: nodo('resultado-precision-final'),
      marca: nodo('resultado-marca'),
      record: nodo('resultado-record'),
      corregidos: nodo('resultado-corregidos'),
      correccion: nodo('resultado-correccion'),
      sinCorregir: nodo('resultado-sin-corregir'),
    };

    // Se bloquea pegar y arrastrar texto al campo.
    this.#campo.addEventListener('beforeinput', (evento) => {
      if (INSERCIONES_BLOQUEADAS.has(evento.inputType)) evento.preventDefault();
    });
  }

  /** El segundo clic de un doble clic se ignora para no iniciar y detener a la vez. */
  alPulsarBoton(manejador) {
    this.#boton.addEventListener('click', (evento) => {
      if (evento.detail <= 1) manejador();
    });
  }

  /**
   * @param {{escribir: (texto: string) => void, confirmar: (texto: string) => void,
   *          previsualizar: (texto: string) => void}} manejadores
   *   escribir con cada cambio, confirmar con Espacio o Intro y previsualizar mientras
   *   el teclado compone una palabra (teclados de móvil con sugerencias).
   */
  alEscribir({ escribir, confirmar, previsualizar }) {
    const procesar = () => {
      const texto = this.#campo.value;
      // Los teclados virtuales no informan de la tecla: el espacio se detecta en el texto.
      if (/\s/.test(texto)) {
        this.#campo.value = texto.replace(/\s+/g, '');
        confirmar(this.#campo.value);
      } else {
        escribir(texto);
      }
    };
    this.#campo.addEventListener('input', (evento) => {
      if (!evento.isComposing) procesar();
      // La tilde de una tecla muerta (´ + a) no es letra y se espera al carácter compuesto.
      else if (/^\p{L}+$/u.test(evento.data ?? '')) previsualizar(this.#campo.value);
    });
    this.#campo.addEventListener('compositionend', procesar);
    this.#campo.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter' && !evento.isComposing) {
        evento.preventDefault();
        confirmar(this.#campo.value);
      }
    });
  }

  /** Atajos globales: 'comenzar' (Intro), 'detener' (Esc) y 'enfocar' (una letra fuera del campo). */
  alPulsarAtajo(manejador) {
    document.addEventListener('keydown', (evento) => {
      if (evento.defaultPrevented || evento.isComposing
        || evento.altKey || evento.ctrlKey || evento.metaKey) return;

      if (evento.key === 'Escape') {
        manejador('detener');
      } else if (evento.key === 'Enter'
        && !evento.target.closest('a, button, input:not([type="radio"])')) {
        manejador('comenzar');
      } else if (evento.key.length === 1 && evento.key !== ' ' && evento.target !== this.#campo) {
        manejador('enfocar');
      }
    });
  }

  mostrarCargando() {
    this.#cambiarEstado('cargando');
  }

  mostrarListo() {
    this.#cambiarEstado('parado');
    this.#palabra.textContent = '¿Empezamos?';
  }

  /** Límites elegidos en los selectores; null es sin límite. */
  get limite() {
    return {
      segundos: leerLimite(this.#ajustes, 'segundos'),
      palabras: leerLimite(this.#ajustes, 'palabras'),
    };
  }

  /** Modo de paso elegido: 'libre' o 'estricto'. */
  get modo() {
    return leerOpcion(this.#ajustes, 'modo') || 'libre';
  }

  /** @param {{segundos: number|null, palabras: number|null}} limite */
  mostrarPrueba(limite) {
    this.#cambiarEstado('activo');
    this.#topes.palabras.textContent = textoTope(limite.palabras);
    this.#topes.segundos.textContent = textoTope(limite.segundos);
    this.#resultado.panel.hidden = true;
    this.#informe.hidden = true;
    this.#escrita.replaceChildren();
    this.#escrita.hidden = true;
    this.#practicar.replaceChildren();
    this.#practicar.hidden = true;
    this.#palabra.hidden = false;
    this.limpiarCampo();
    this.marcarError(false);
    this.#campo.focus();
  }

  /**
   * Crea un span por letra de la palabra en curso, que se actualizan después con
   * mostrarProgreso(), y pone debajo las siguientes.
   */
  mostrarPalabra(palabra, siguientes) {
    this.#cola.replaceChildren(...siguientes.map(crearPalabraEnCola));
    this.#letras = [...palabra].map(crearLetra);
    this.#palabra.replaceChildren(...this.#letras);
    this.#palabra.style.setProperty('--cursor', 0);
    // Con ella el CSS ajusta el cuerpo de la muestra y del campo a la longitud de la palabra.
    this.#hoja.style.setProperty('--letras', this.#letras.length);
    this.#campo.setAttribute('maxlength', this.#letras.length + SOBRANTES_MAX);
  }

  /** @param {{letra: string, estado: string}[]} progreso */
  mostrarProgreso(progreso) {
    while (this.#letras.length < progreso.length) {
      const sobrante = crearLetra('');
      this.#letras.push(sobrante);
      this.#palabra.append(sobrante);
    }
    while (this.#letras.length > progreso.length) this.#letras.pop().remove();

    const cursor = progreso.findIndex(({ estado }) => estado === 'pendiente');
    // Caracteres tecleados, sobrantes incluidos: la posición del cursor en la muestra.
    this.#palabra.style.setProperty('--cursor', cursor === -1 ? progreso.length : cursor);
    this.#letras.forEach((span, i) => {
      const { letra, estado } = progreso[i];
      escribirTexto(span, letra);
      const clase = `letra letra--${estado}`;
      if (span.className !== clase) span.className = clase;
    });
  }

  /** @param {{correctas: number, segundos: number, ppm: number|null, pulsaciones: number|null}} marcadores */
  mostrarMarcadores({ correctas, segundos, ppm, pulsaciones }) {
    escribirTexto(this.#correctas, ENTERO.format(correctas));
    escribirTexto(this.#segundos, ENTERO.format(segundos));
    escribirTexto(this.#ppm, ppm === null ? '—' : ENTERO.format(ppm));
    escribirTexto(this.#pulsaciones, pulsaciones === null ? '—' : ENTERO.format(pulsaciones));
  }

  /** Fracción (0–1) del límite ya cumplida, en --progreso de la hoja; null la retira. */
  mostrarAvance(fraccion) {
    if (fraccion === null) this.#hoja.style.removeProperty('--progreso');
    else this.#hoja.style.setProperty('--progreso', fraccion.toFixed(4));
  }

  /** Cambia aria-invalid, del que cuelga el estilo de error, y lo anuncia solo al aparecer. */
  marcarError(hayError) {
    const valor = String(hayError);
    if (this.#campo.getAttribute('aria-invalid') === valor) return;
    this.#campo.setAttribute('aria-invalid', valor);
    if (hayError) this.anunciar('Error en la palabra.');
  }

  limpiarCampo() {
    this.#campo.value = '';
  }

  enfocarCampo() {
    this.#campo.focus();
  }

  /** Subida de la hoja una línea al pasar de palabra. */
  avanzarHoja() {
    reiniciarAnimacion(this.#hoja, 'hoja--avanza');
  }

  /** Golpe del tipo en el contador de correctas y subida de la hoja una línea. */
  celebrarAcierto() {
    reiniciarAnimacion(this.#correctas, 'marcador__valor--golpe');
    this.avanzarHoja();
  }

  /**
   * @param {{ppm: number, pulsaciones: number, correctas: number, segundos: number, precision: number|null,
   *          precisionPalabras: number|null, mejorMarca: number, record: boolean, fallos: Map<string, number>,
   *          ritmo: {puntos: {s: number, ppm: number}[], fallos: number[], sinCorregir: number[],
   *                  duracion: number},
   *          pasadas: {pedida: string, escrita: string, estado: string}[],
   *          sinCorregir: {pedida: string, escrita: string}[],
   *          correcciones: {cuantas: number, mediaMs: number|null}}} resultado
   */
  mostrarResultado({
    ppm, pulsaciones, correctas, segundos, precision, precisionPalabras, mejorMarca, record, fallos, ritmo, pasadas, sinCorregir, correcciones,
  }) {
    const r = this.#resultado;
    r.ppm.textContent = ENTERO.format(ppm);
    r.pulsaciones.textContent = ENTERO.format(pulsaciones);
    r.tiempo.textContent = SEGUNDOS.format(segundos);
    r.precision.textContent = precision === null ? '—' : PORCENTAJE.format(precision);
    r.precisionFinal.textContent = precisionPalabras === null ? '—' : PORCENTAJE.format(precisionPalabras);
    r.marca.textContent = mejorMarca > 0 ? `${ENTERO.format(mejorMarca)} palabras/min` : '—';
    r.record.hidden = !record;
    r.corregidos.textContent = ENTERO.format(correcciones.cuantas);
    r.correccion.textContent = correcciones.mediaMs === null ? '—' : SEGUNDOS.format(correcciones.mediaMs / 1000);
    r.sinCorregir.textContent = ENTERO.format(sinCorregir.length);
    r.sinCorregir.dataset.cuenta = sinCorregir.length;
    this.#pintarFallos(fallos);
    const resumen = precision === null ? 'No se ha tecleado nada en esta prueba.' : Vista.#resumir(fallos);
    this.#resumen.textContent = resumen;
    this.#pintarRitmo(ritmo);
    this.#escrita.replaceChildren(...pasadas.map(crearPalabraEscrita));
    this.#escrita.hidden = pasadas.length === 0;
    const corregidas = [...new Set(pasadas.filter((p) => p.estado === 'corregida').map((p) => p.pedida))];
    const pendientes = [...new Set(sinCorregir.map((p) => p.pedida))];
    this.#pintarPracticar(pendientes);

    this.#cambiarEstado('parado');
    // Cada resultado empieza mostrando la hoja, no el detalle.
    const radioHoja = document.querySelector('input[name="vista-resultado"][value="hoja"]');
    if (radioHoja) radioHoja.checked = true;
    this.limpiarCampo();
    this.marcarError(false);
    this.#palabra.hidden = true;
    r.panel.hidden = false;
    this.#informe.hidden = false;
    this.#boton.focus();

    const detalle = precision === null ? ''
      : `, precisión real del ${PORCENTAJE.format(precision)}`
        + (precisionPalabras === null ? '' : ` y final del ${PORCENTAJE.format(precisionPalabras)}`);
    this.anunciar(
      `Prueba detenida. ${textoCorrectas(correctas)} en ${SEGUNDOS.format(segundos)}: `
      + `${ENTERO.format(ppm)} palabras por minuto, ${ENTERO.format(pulsaciones)} pulsaciones por minuto${detalle}.${record ? ' Nueva mejor marca.' : ''}`
      + (precision === null ? '' : ` ${resumen}`)
      + (corregidas.length === 0 ? '' : ` Corregidas: ${listaAcotada(corregidas, PALABRAS_EN_RESUMEN)}.`)
      + (pendientes.length === 0 ? '' : ` Sin corregir: ${listaAcotada(pendientes, PALABRAS_EN_RESUMEN)}.`),
    );
  }

  #pintarPracticar(palabras) {
    this.#practicar.hidden = palabras.length === 0;
    if (palabras.length === 0) {
      this.#practicar.replaceChildren();
      return;
    }
    this.#practicar.replaceChildren('Para practicar: ', ...crearListaPalabras(palabras), '.');
  }

  /** Crea una vez las teclas del teclado de fallos. @returns {Map<string, {tecla: Element, cuenta: Element}>} */
  static #crearTeclado(contenedor) {
    const teclas = new Map();
    const filas = FILAS.map((fila) => {
      const div = document.createElement('div');
      div.className = 'teclado__fila';
      for (const letra of fila) {
        const tecla = document.createElement('span');
        tecla.className = 'tecla';
        tecla.dataset.nivel = '0';
        const nombre = document.createElement('span');
        nombre.className = 'tecla__letra';
        nombre.textContent = letra;
        const cuenta = document.createElement('span');
        cuenta.className = 'tecla__cuenta';
        tecla.append(nombre, cuenta);
        div.append(tecla);
        teclas.set(letra, { tecla, cuenta });
      }
      return div;
    });
    contenedor.replaceChildren(...filas);
    return teclas;
  }

  /** Crea una vez los nodos de la gráfica de ritmo; después solo cambian sus atributos y textos. */
  static #crearRitmo(svg) {
    const { izquierda, derecha, techo, base, rotulo } = RITMO;
    crearSvg(svg, 'line', 'ritmo__rejilla', { x1: izquierda, x2: derecha, y1: techo, y2: techo });
    crearSvg(svg, 'line', 'ritmo__eje', { x1: izquierda, x2: derecha, y1: base, y2: base });
    const nodos = {
      svg,
      tope: crearSvg(svg, 'text', 'ritmo__texto', { x: izquierda, y: techo - 5 }),
      sinCorregir: crearSvg(svg, 'path', 'ritmo__sin-corregir'),
      fallos: crearSvg(svg, 'path', 'ritmo__fallos'),
      linea: crearSvg(svg, 'polyline', 'ritmo__linea'),
      punto: crearSvg(svg, 'circle', 'ritmo__punto', { r: 4 }),
      final: crearSvg(svg, 'text', 'ritmo__texto ritmo__texto--final'),
      inicio: crearSvg(svg, 'text', 'ritmo__texto', { x: izquierda, y: rotulo }),
      duracion: crearSvg(svg, 'text', 'ritmo__texto', { x: derecha, y: rotulo, 'text-anchor': 'end' }),
    };
    nodos.inicio.textContent = SEGUNDOS.format(0);
    return nodos;
  }

  // Escalas lineales: el tiempo de 0 a la duración y las PPM de 0 a la referencia, que es el
  // máximo redondeado hacia arriba a decenas.
  #pintarRitmo({ puntos, fallos, sinCorregir, duracion }) {
    const r = this.#ritmo;
    const dibujable = duracion >= RITMO_MIN_S && puntos.length > 0;
    r.svg.toggleAttribute('hidden', !dibujable);
    if (!dibujable) {
      // Oculta, pero sin restos de la prueba anterior
      r.linea.setAttribute('points', '');
      r.fallos.setAttribute('d', '');
      r.sinCorregir.setAttribute('d', '');
      r.resumen.textContent = `La prueba ha sido demasiado corta para dibujar el ritmo: hacen falta ${SEGUNDOS.format(RITMO_MIN_S)}.`;
      return;
    }

    const { izquierda, derecha, techo, base, marca, marcaAlta } = RITMO;
    const tope = Math.max(10, Math.ceil(Math.max(...puntos.map((p) => p.ppm)) / 10) * 10);
    const x = (s) => izquierda + (s / duracion) * (derecha - izquierda);
    const y = (ppm) => base - (ppm / tope) * (base - techo);
    const final = puntos.at(-1);

    r.tope.textContent = `${ENTERO.format(tope)} palabras/min`;
    r.linea.setAttribute('points', puntos.map((p) => `${x(p.s).toFixed(1)},${y(p.ppm).toFixed(1)}`).join(' '));
    r.punto.setAttribute('cx', x(final.s).toFixed(1));
    r.punto.setAttribute('cy', y(final.ppm).toFixed(1));
    r.final.setAttribute('x', (x(final.s) + 7).toFixed(1));
    r.final.setAttribute('y', (y(final.ppm) + 4).toFixed(1));
    r.final.textContent = ENTERO.format(final.ppm);
    const marcas = (instantes, alto) => instantes.map((s) => `M${x(s).toFixed(1)} ${base + 2}v${alto}`).join('');
    r.fallos.setAttribute('d', marcas(fallos, marca));
    r.sinCorregir.setAttribute('d', marcas(sinCorregir, marcaAlta));
    r.duracion.textContent = SEGUNDOS.format(duracion);
    r.resumen.textContent = resumirRitmo(puntos, fallos)
      + (sinCorregir.length === 0 ? '' : ` ${textoSinCorregir(sinCorregir.length)}.`);
  }

  // El reparto en niveles es presentación: la tecla más fallada siempre llega al último.
  #pintarFallos(fallos) {
    const max = Math.max(0, ...fallos.values());
    for (const [letra, { tecla, cuenta }] of this.#teclas) {
      const n = fallos.get(letra) ?? 0;
      tecla.dataset.nivel = n === 0 ? 0 : Math.ceil((n / max) * NIVELES);
      cuenta.textContent = n || '';
    }
  }

  static #resumir(fallos) {
    if (fallos.size === 0) return 'Ninguna tecla fallada en esta prueba.';
    const orden = [...fallos].sort((a, b) => b[1] - a[1]);
    const partes = orden.map(([tecla, n]) => `${nombreTecla(tecla)} (${n})`);
    return `Teclas con fallos: ${listaAcotada(partes, TECLAS_EN_RESUMEN)}.`;
  }

  mostrarError(mensaje) {
    this.#mensaje.textContent = mensaje;
    this.#cambiarEstado('error');
  }

  /** Texto para lectores de pantalla en la única región viva de la página. */
  anunciar(mensaje) {
    this.#anuncio.textContent = mensaje;
  }

  #cambiarEstado(estado) {
    const activo = estado === 'activo';
    this.#app.dataset.estado = estado;
    this.#boton.textContent = activo ? 'Detener' : 'Iniciar';
    this.#boton.setAttribute('aria-keyshortcuts', activo ? 'Escape' : 'Enter');
    this.#boton.disabled = estado !== 'activo' && estado !== 'parado';
    this.#campo.disabled = !activo;
    this.#ajustes.disabled = estado !== 'parado';
  }
}
