import { Almacen } from './Almacen.js';
import { Modelo } from './Modelo.js';
import { Vista } from './Vista.js';

const TECLAS_VALIDAR = new Set([' ', 'Enter']);

class Controlador {
  #modelo;
  #vista;
  #intervalo = null;

  constructor(modelo, vista) {
    this.#modelo = modelo;
    this.#vista = vista;

    vista.boton.addEventListener('click', () => this.#alternar());
    vista.entrada.addEventListener('input', () => this.#alEscribir());
    vista.entrada.addEventListener('keydown', (evento) => this.#alPulsar(evento));

    vista.setEstado(false);
    vista.mostrarEstado('Pulsa «Iniciar» para comenzar la prueba.');
  }

  #alternar() {
    if (this.#modelo.activo) this.#parar();
    else this.#iniciar();
  }

  #iniciar() {
    this.#modelo.iniciar();
    this.#vista.mostrarPalabra(this.#modelo.palabraActual);
    this.#vista.mostrarContador(this.#modelo.contador);
    this.#vista.mostrarTiempo(this.#modelo.segundos);
    this.#vista.setEstado(true);
    this.#vista.mostrarEstado('Prueba en marcha.');

    this.#intervalo = setInterval(() => {
      this.#modelo.tick();
      this.#vista.mostrarTiempo(this.#modelo.segundos);
    }, 1000);
  }

  #parar() {
    clearInterval(this.#intervalo);
    this.#intervalo = null;
    this.#modelo.parar();
    this.#vista.setEstado(false);
    this.#vista.mostrarResumen(
      this.#modelo.contador,
      this.#modelo.segundos,
      this.#modelo.palabrasPorMinuto,
    );
  }

  #alEscribir() {
    const intento = this.#vista.textoIntroducido;
    if (this.#modelo.palabraCorrecta(intento)) {
      this.#acierto();
    } else {
      this.#vista.marcarError(!this.#modelo.vaBien(intento));
    }
  }

  #alPulsar(evento) {
    if (evento.isComposing) return;

    if (evento.key === 'Escape') {
      this.#parar();
      return;
    }

    if (TECLAS_VALIDAR.has(evento.key)) {
      // Las palabras no llevan espacios: se impide escribirlo y se usa solo como orden de validar.
      evento.preventDefault();
      if (this.#modelo.palabraCorrecta(this.#vista.textoIntroducido)) this.#acierto();
      else this.#vista.marcarError(true);
    }
  }

  #acierto() {
    this.#vista.limpiarEntrada();
    this.#vista.marcarError(false);
    this.#vista.mostrarPalabra(this.#modelo.palabraActual);
    this.#vista.mostrarContador(this.#modelo.contador);
    this.#vista.celebrarAcierto();
  }
}

const vista = new Vista();
try {
  const palabras = await Almacen.cargar();
  new Controlador(new Modelo(palabras), vista);
} catch (error) {
  console.error(error);
  vista.mostrarError('No se pudieron cargar las palabras. Abre la página desde un servidor local (no con file://).');
}
