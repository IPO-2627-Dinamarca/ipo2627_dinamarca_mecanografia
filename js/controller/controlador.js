import { guardarMejorMarca, leerMejorMarca } from '../model/almacen.js';

// El modelo mide el tiempo; el intervalo solo repinta. Se refresca varias veces por
// segundo para que el cambio de cifra llegue sin retraso apreciable.
const REFRESCO_MS = 200;
// Con pocos segundos un solo acierto dispara las PPM: no se muestran en vivo ni cuentan
// como mejor marca hasta pasado este tiempo.
const PPM_DESDE_MS = 5000;

/** Coordina modelo y vista, y gestiona el temporizador de la prueba. */
export class Controlador {
  #modelo;
  #vista;
  #intervalo = null;
  #mejorMarca = 0;

  constructor(modelo, vista) {
    this.#modelo = modelo;
    this.#vista = vista;
  }

  iniciar() {
    this.#mejorMarca = leerMejorMarca();
    this.#vista.alPulsarBoton(() => this.#alternar());
    this.#vista.alEscribir({
      escribir: (texto) => this.#escribir(texto),
      confirmar: (texto) => this.#confirmar(texto),
      previsualizar: (texto) => this.#vista.mostrarProgreso(this.#modelo.progreso(texto)),
    });
    this.#vista.alPulsarAtajo((atajo) => this.#atajo(atajo));
    this.#vista.mostrarListo();
  }

  #alternar() {
    if (this.#modelo.activo) this.#detener();
    else this.#comenzar();
  }

  #atajo(atajo) {
    const activo = this.#modelo.activo;
    if (atajo === 'comenzar' && !activo) this.#comenzar();
    else if (atajo === 'detener' && activo) this.#detener();
    else if (atajo === 'enfocar' && activo) this.#vista.enfocarCampo();
  }

  #comenzar() {
    this.#modelo.comenzar();
    this.#vista.mostrarPrueba();
    this.#vista.mostrarPalabra(this.#modelo.palabra);
    this.#refrescarMarcadores();
    this.#vista.anunciar(`Prueba en marcha. Primera palabra: ${this.#modelo.palabra}.`);
    this.#intervalo = setInterval(() => this.#refrescarMarcadores(), REFRESCO_MS);
  }

  #detener() {
    clearInterval(this.#intervalo);
    this.#intervalo = null;
    this.#modelo.detener();

    const { correctas, milisegundos, precision } = this.#modelo;
    const ppm = Math.round(this.#modelo.palabrasPorMinuto);
    const record = correctas > 0 && milisegundos >= PPM_DESDE_MS && ppm > this.#mejorMarca;
    if (record) {
      this.#mejorMarca = ppm;
      guardarMejorMarca(ppm);
    }
    this.#vista.mostrarResultado({
      ppm, correctas, segundos: milisegundos / 1000, precision, mejorMarca: this.#mejorMarca, record,
    });
  }

  #escribir(texto) {
    if (this.#modelo.escribir(texto)) {
      this.#acertar();
      return;
    }
    this.#vista.mostrarProgreso(this.#modelo.progreso());
    this.#vista.marcarError(this.#modelo.hayError);
  }

  #confirmar(texto) {
    if (texto === '') return;
    if (this.#modelo.confirmar(texto)) {
      this.#acertar();
      return;
    }
    this.#vista.mostrarProgreso(this.#modelo.progreso());
    this.#vista.marcarError(true);
  }

  #acertar() {
    this.#vista.limpiarCampo();
    this.#vista.marcarError(false);
    this.#vista.mostrarPalabra(this.#modelo.palabra);
    this.#refrescarMarcadores();
    this.#vista.celebrarAcierto();
    this.#vista.anunciar(this.#modelo.palabra);
  }

  #refrescarMarcadores() {
    const { correctas, segundos, milisegundos, palabrasPorMinuto } = this.#modelo;
    const ppm = milisegundos >= PPM_DESDE_MS ? palabrasPorMinuto : null;
    this.#vista.mostrarMarcadores({ correctas, segundos, ppm });
  }
}
