const ENTERO = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
const SEGUNDOS = new Intl.NumberFormat('es', {
  style: 'unit', unit: 'second', unitDisplay: 'short', maximumFractionDigits: 1,
});
const PORCENTAJE = new Intl.NumberFormat('es', { style: 'percent', maximumFractionDigits: 0 });

const textoCorrectas = (n) => `${n} ${n === 1 ? 'palabra correcta' : 'palabras correctas'}`;

function crearLetra(letra) {
  const span = document.createElement('span');
  span.className = 'letra letra--pendiente';
  span.textContent = letra;
  return span;
}

// Solo se toca el DOM si el valor cambia: el temporizador refresca varias veces por segundo.
function escribirTexto(nodo, texto) {
  if (nodo.textContent !== texto) nodo.textContent = texto;
}

/** Presentación en el DOM. Recibe valores ya calculados y avisa al controlador de lo que hace el usuario. */
export class Vista {
  #app;
  #palabra;
  #correctas;
  #segundos;
  #ppm;
  #campo;
  #boton;
  #mensaje;
  #anuncio;
  #resultado;
  #letras = [];

  constructor(raiz = document) {
    const nodo = (nombre) => raiz.querySelector(`[data-vista="${nombre}"]`);
    this.#app = nodo('app');
    this.#palabra = nodo('palabra');
    this.#correctas = nodo('correctas');
    this.#segundos = nodo('segundos');
    this.#ppm = nodo('ppm');
    this.#campo = nodo('campo');
    this.#boton = nodo('boton');
    this.#mensaje = nodo('mensaje');
    this.#anuncio = nodo('anuncio');
    this.#resultado = {
      panel: nodo('resultado'),
      ppm: nodo('resultado-ppm'),
      correctas: nodo('resultado-correctas'),
      tiempo: nodo('resultado-tiempo'),
      precision: nodo('resultado-precision'),
      marca: nodo('resultado-marca'),
      record: nodo('resultado-record'),
    };

    // Se bloquea pegar y arrastrar texto al campo.
    this.#campo.addEventListener('beforeinput', (evento) => {
      if (evento.inputType.startsWith('insertFrom')) evento.preventDefault();
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
      } else if (evento.key === 'Enter' && !evento.target.closest('button, input')) {
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
    this.#palabra.textContent = '¿Preparado?';
  }

  mostrarPrueba() {
    this.#cambiarEstado('activo');
    this.#resultado.panel.hidden = true;
    this.#palabra.hidden = false;
    this.limpiarCampo();
    this.marcarError(false);
    this.#campo.focus();
  }

  /** Crea un span por letra; las letras se actualizan después con mostrarProgreso(). */
  mostrarPalabra(palabra) {
    this.#letras = [...palabra].map(crearLetra);
    this.#palabra.replaceChildren(...this.#letras);
    this.#letras[0].classList.add('letra--cursor');
    // Con ella el CSS reduce el cuerpo de letra de las palabras largas.
    this.#palabra.style.setProperty('--letras', this.#letras.length);
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
    this.#letras.forEach((span, i) => {
      const { letra, estado } = progreso[i];
      escribirTexto(span, letra);
      span.className = `letra letra--${estado}`;
      span.classList.toggle('letra--cursor', i === cursor);
    });
  }

  /** @param {{correctas: number, segundos: number, ppm: number|null}} marcadores */
  mostrarMarcadores({ correctas, segundos, ppm }) {
    escribirTexto(this.#correctas, ENTERO.format(correctas));
    escribirTexto(this.#segundos, ENTERO.format(segundos));
    escribirTexto(this.#ppm, ppm === null ? '—' : ENTERO.format(ppm));
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

  /** Destello de color en el contador de correctas. */
  celebrarAcierto() {
    this.#correctas.classList.remove('marcador__valor--acierto');
    // Leer una medida fuerza el reflow y reinicia la animación aunque la anterior no haya acabado.
    void this.#correctas.offsetWidth;
    this.#correctas.classList.add('marcador__valor--acierto');
  }

  /**
   * @param {{ppm: number, correctas: number, segundos: number, precision: number|null,
   *          mejorMarca: number, record: boolean}} resultado
   */
  mostrarResultado({ ppm, correctas, segundos, precision, mejorMarca, record }) {
    const r = this.#resultado;
    r.ppm.textContent = ENTERO.format(ppm);
    r.correctas.textContent = ENTERO.format(correctas);
    r.tiempo.textContent = SEGUNDOS.format(segundos);
    r.precision.textContent = precision === null ? '—' : PORCENTAJE.format(precision);
    r.marca.textContent = mejorMarca > 0 ? `${ENTERO.format(mejorMarca)} ppm` : '—';
    r.record.hidden = !record;

    this.#cambiarEstado('parado');
    this.limpiarCampo();
    this.marcarError(false);
    this.#palabra.hidden = true;
    r.panel.hidden = false;
    this.#boton.focus();

    const detalle = precision === null ? '' : `, precisión del ${PORCENTAJE.format(precision)}`;
    this.anunciar(
      `Prueba detenida. ${textoCorrectas(correctas)} en ${SEGUNDOS.format(segundos)}: `
      + `${ENTERO.format(ppm)} palabras por minuto${detalle}.${record ? ' Nueva mejor marca.' : ''}`,
    );
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
  }
}
