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
      previsualizar: (texto) => this.#vista.mostrarProgreso(this.#modelo.letras(texto)),
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
    this.#modelo.comenzar(this.#vista.limite, this.#vista.modo);
    this.#vista.mostrarPrueba(this.#modelo.limite);
    this.#vista.mostrarPalabra(this.#modelo.palabra, this.#modelo.siguientes);
    this.#refrescarMarcadores();
    this.#vista.anunciar(`Prueba en marcha. Primera palabra: ${this.#modelo.palabra}.`);
    this.#intervalo = setInterval(() => this.#tic(), REFRESCO_MS);
  }

  #tic() {
    if (!this.#terminarSiToca()) this.#refrescarMarcadores();
  }

  // El límite se comprueba en cada tic y en cada pulsación: la que llega después de cumplirse,
  // antes del siguiente tic, termina la prueba en lugar de contar como error.
  #terminarSiToca() {
    if (!this.#modelo.activo || !this.#modelo.limiteAlcanzado) return false;
    this.#detener();
    return true;
  }

  #detener() {
    clearInterval(this.#intervalo);
    this.#intervalo = null;
    this.#modelo.detener();
    // Los marcadores quedan con el valor final y no con el del último tic.
    this.#refrescarMarcadores();

    const { correctas, milisegundos, precision, precisionPalabras, fallosPorTecla, pasadas, sinCorregir, correcciones } = this.#modelo;
    const ppm = Math.round(this.#modelo.palabrasPorMinuto);
    const pulsaciones = Math.round(this.#modelo.pulsacionesPorMinuto);
    const record = correctas > 0 && milisegundos >= PPM_DESDE_MS && ppm > this.#mejorMarca;
    if (record) {
      this.#mejorMarca = ppm;
      guardarMejorMarca(ppm);
    }
    this.#vista.mostrarResultado({
      ppm, pulsaciones, correctas, segundos: milisegundos / 1000, precision, precisionPalabras, mejorMarca: this.#mejorMarca, record,
      fallos: fallosPorTecla, ritmo: this.#modelo.ritmo(PPM_DESDE_MS), pasadas, sinCorregir, correcciones,
    });
  }

  #escribir(texto) {
    if (this.#terminarSiToca()) return;
    this.#modelo.escribir(texto);
    this.#vista.mostrarProgreso(this.#modelo.letras());
    this.#vista.marcarError(this.#modelo.hayError);
  }

  #confirmar(texto) {
    if (texto === '' || this.#terminarSiToca()) return;
    const pedida = this.#modelo.palabra;
    const estado = this.#modelo.confirmar(texto);
    if (estado !== null) {
      this.#pasar(estado, pedida);
      return;
    }
    this.#vista.mostrarProgreso(this.#modelo.letras());
    this.#vista.marcarError(true);
  }

  #pasar(estado, pedida) {
    if (this.#terminarSiToca()) return;
    this.#vista.limpiarCampo();
    this.#vista.marcarError(false);
    this.#vista.mostrarPalabra(this.#modelo.palabra, this.#modelo.siguientes);
    this.#refrescarMarcadores();
    if (estado === 'sinCorregir') {
      this.#vista.avanzarHoja();
      this.#vista.anunciar(`Sin corregir: ${pedida}. ${this.#modelo.palabra}`);
    } else {
      this.#vista.celebrarAcierto();
      this.#vista.anunciar(this.#modelo.palabra);
    }
  }

  #refrescarMarcadores() {
    const { correctas, segundos, milisegundos, palabrasPorMinuto, pulsacionesPorMinuto, activo, progreso } = this.#modelo;
    const enMarcha = milisegundos >= PPM_DESDE_MS;
    this.#vista.mostrarMarcadores({
      correctas,
      segundos,
      ppm: enMarcha ? palabrasPorMinuto : null,
      pulsaciones: enMarcha ? pulsacionesPorMinuto : null,
    });
    this.#vista.mostrarAvance(activo ? progreso : null);
  }
}
