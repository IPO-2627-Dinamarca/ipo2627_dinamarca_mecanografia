const ENTERO = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
const SEGUNDOS = new Intl.NumberFormat('es', {
  style: 'unit', unit: 'second', unitDisplay: 'short', maximumFractionDigits: 1,
});
// En los anuncios, «15 s» se leería como la letra.
const SEGUNDOS_LARGO = new Intl.NumberFormat('es', {
  style: 'unit', unit: 'second', unitDisplay: 'long', maximumFractionDigits: 1,
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

// Lo tecleado de más que admite el campo; más allá no aporta nada y rompería la línea.
const SOBRANTES_MAX = 3;
// Pegar y arrastrar texto; la composición de teclas muertas y teclados de móvil sí se admite.
const INSERCIONES_BLOQUEADAS = new Set([
  'insertFromPaste', 'insertFromDrop', 'insertFromYank', 'insertFromPasteAsQuotation',
]);

// Mover el cursor por el campo.
const TECLAS_DE_CURSOR = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

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
// Cifra con su formato, o una raya si no hay dato.
const cifra = (formato, n) => (n === null ? '—' : formato.format(n));

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

const leerOpcion = (raiz, nombre) => raiz.querySelector(`input[name="${nombre}"]:checked`)?.value ?? '';

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

/** Presentación en el DOM. Recibe valores ya calculados y avisa al controlador de lo que hace el usuario. */
export class Vista {
  #app;
  #palabra;
  #cola;
  #ajustes;
  #tope;
  #correctas;
  #correctasRotulo;
  #segundos;
  #segundosRotulo;
  #ayudaLista;
  #ayudaEspera;
  #campo;
  #boton;
  #mensaje;
  #anuncio;
  #resultado;
  #hoja;
  #informe;
  #resumen;
  #sinCorregir;
  #teclas;
  #escrita;
  #letras = [];

  constructor(raiz = document) {
    const nodo = (nombre) => raiz.querySelector(`[data-vista="${nombre}"]`);
    this.#app = nodo('app');
    this.#palabra = nodo('palabra');
    this.#cola = nodo('cola');
    this.#ajustes = nodo('ajustes');
    this.#tope = nodo('tope-segundos');
    this.#correctas = nodo('correctas');
    this.#segundos = nodo('segundos');
    this.#correctasRotulo = nodo('correctas-rotulo');
    this.#segundosRotulo = nodo('segundos-rotulo');
    this.#ayudaLista = nodo('ayuda-lista');
    this.#ayudaEspera = nodo('ayuda-espera');
    this.#campo = nodo('campo');
    this.#boton = nodo('boton');
    this.#mensaje = nodo('mensaje');
    this.#anuncio = nodo('anuncio');
    this.#hoja = nodo('hoja');
    this.#informe = nodo('informe');
    this.#resumen = nodo('fallos-resumen');
    this.#sinCorregir = nodo('sin-corregir');
    this.#teclas = Vista.#crearTeclado(nodo('teclado'));
    this.#escrita = nodo('escrita');
    this.#resultado = {
      panel: nodo('resultado'),
      titulo: nodo('resultado-titulo'),
      ppm: nodo('resultado-ppm'),
      tiempo: nodo('resultado-tiempo'),
      precision: nodo('resultado-precision'),
      precisionFinal: nodo('resultado-precision-final'),
      marca: nodo('resultado-marca'),
      record: nodo('resultado-record'),
    };

    // Se bloquea pegar y arrastrar texto al campo.
    this.#campo.addEventListener('beforeinput', (evento) => {
      if (INSERCIONES_BLOQUEADAS.has(evento.inputType)) evento.preventDefault();
    });

    // Solo se escribe y se borra al final de la palabra: sin mover el cursor ni seleccionar.
    this.#campo.addEventListener('keydown', (evento) => {
      if (TECLAS_DE_CURSOR.has(evento.key)) evento.preventDefault();
    });
    this.#campo.addEventListener('pointerdown', (evento) => {
      evento.preventDefault();
      this.#campo.focus();
    });
    this.#campo.addEventListener('select', () => {
      const { length } = this.#campo.value;
      this.#campo.setSelectionRange(length, length);
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
      if ((evento.key === 'Enter' || evento.key === ' ') && !evento.isComposing) {
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

  /** Duración elegida, en segundos. */
  get limite() {
    return Number(leerOpcion(this.#ajustes, 'segundos'));
  }

  /** Modo de paso elegido: 'libre' o 'estricto'. */
  get modo() {
    return leerOpcion(this.#ajustes, 'modo') || 'libre';
  }

  /** @param {number} segundos Duración de la prueba. */
  mostrarPrueba(segundos) {
    this.#cambiarEstado('activo');
    this.#tope.textContent = `de ${ENTERO.format(segundos)}`;
    this.#resultado.panel.hidden = true;
    this.#informe.hidden = true;
    this.#escrita.replaceChildren();
    this.#escrita.hidden = true;
    this.#palabra.hidden = false;
    this.limpiarCampo();
    this.marcarError(false);
    this.#campo.focus();
  }

  /**
   * Crea un span por letra de la palabra en curso, que se actualizan después con
   * mostrarProgreso(), y pone debajo la siguiente.
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

  /** @param {{correctas: number, segundos: number}} marcadores */
  mostrarMarcadores({ correctas, segundos }) {
    escribirTexto(this.#correctas, ENTERO.format(correctas));
    escribirTexto(this.#segundos, ENTERO.format(segundos));
    escribirTexto(this.#correctasRotulo, correctas === 1 ? 'correcta' : 'correctas');
    escribirTexto(this.#segundosRotulo, segundos === 1 ? 'segundo' : 'segundos');
  }

  /** Con false el botón queda atenuado (sigue enfocable) y la ayuda pide esperar. */
  permitirReinicio(permitido) {
    if (permitido) this.#boton.removeAttribute('aria-disabled');
    else this.#boton.setAttribute('aria-disabled', 'true');
    this.#ayudaLista.hidden = !permitido;
    this.#ayudaEspera.hidden = permitido;
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

  /**
   * @param {{ppm: number|null, correctas: number, segundos: number, precision: number|null,
   *          precisionFinal: number|null, mejorMarca: number, record: boolean, fallos: Map<string, number>,
   *          pasadas: {pedida: string, escrita: string, estado: string}[]}} resultado
   */
  mostrarResultado({
    ppm, correctas, segundos, precision, precisionFinal, mejorMarca, record, fallos, pasadas,
  }) {
    const r = this.#resultado;
    r.ppm.textContent = cifra(ENTERO, ppm);
    r.tiempo.textContent = SEGUNDOS.format(segundos);
    r.precision.textContent = cifra(PORCENTAJE, precision);
    r.precisionFinal.textContent = cifra(PORCENTAJE, precisionFinal);
    r.marca.textContent = mejorMarca > 0 ? `${ENTERO.format(mejorMarca)} palabras/min` : '—';
    r.record.hidden = !record;
    this.#pintarFallos(fallos);
    const resumen = precision === null ? 'No se ha tecleado nada en esta prueba.' : Vista.#resumir(fallos);
    this.#resumen.textContent = resumen;
    this.#escrita.replaceChildren(...pasadas.map(crearPalabraEscrita));
    this.#escrita.hidden = pasadas.length === 0;
    // La hoja escrita es aria-hidden: lo que quedó sin corregir se deja aquí para el lector de pantalla.
    const pendientes = [...new Set(pasadas.filter((p) => p.estado === 'sinCorregir').map((p) => p.pedida))];
    this.#sinCorregir.textContent = pendientes.length === 0 ? ''
      : `Sin corregir: ${listaAcotada(pendientes, PALABRAS_EN_RESUMEN)}.`;

    this.#cambiarEstado('parado');
    this.limpiarCampo();
    this.marcarError(false);
    this.#palabra.hidden = true;
    r.panel.hidden = false;
    this.#informe.hidden = false;
    r.titulo.focus();

    const detalle = precision === null ? ''
      : `, precisión real del ${PORCENTAJE.format(precision)} y final del ${PORCENTAJE.format(precisionFinal)}`;
    const velocidad = ppm === null
      ? 'prueba demasiado corta para medir la velocidad'
      : `${ENTERO.format(ppm)} palabras por minuto`;
    this.anunciar(
      `Prueba detenida. ${textoCorrectas(correctas)} en ${SEGUNDOS_LARGO.format(segundos)}: `
      + `${velocidad}${detalle}.${record ? ' Nueva mejor marca.' : ''}`,
    );
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
