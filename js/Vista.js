const AYUDA = 'Pulsa Espacio o Intro para comprobar y Esc para detener.';
const AYUDA_ERROR = 'No coincide con la palabra de muestra. Corrígela.';

export class Vista {
  #app;
  #palabra;
  #contador;
  #tiempo;
  #entrada;
  #ayuda;
  #boton;
  #estado;

  constructor(raiz = document) {
    this.#app = raiz.getElementById('app');
    this.#palabra = raiz.getElementById('palabra');
    this.#contador = raiz.getElementById('contador');
    this.#tiempo = raiz.getElementById('tiempo');
    this.#entrada = raiz.getElementById('entrada');
    this.#ayuda = raiz.getElementById('ayuda');
    this.#boton = raiz.getElementById('boton');
    this.#estado = raiz.getElementById('estado');

    this.#palabra.addEventListener('animationend', () => {
      this.#palabra.classList.remove('muestra__palabra--acierto');
    });
  }

  get boton() {
    return this.#boton;
  }

  get entrada() {
    return this.#entrada;
  }

  get textoIntroducido() {
    return this.#entrada.value;
  }

  mostrarPalabra(palabra) {
    this.#palabra.textContent = palabra;
  }

  mostrarContador(contador) {
    this.#contador.value = contador;
  }

  mostrarTiempo(segundos) {
    this.#tiempo.value = segundos;
  }

  setEstado(activo) {
    this.#app.dataset.estado = activo ? 'activo' : 'parado';
    this.#boton.textContent = activo ? 'Detener' : 'Iniciar';
    this.#boton.disabled = false;
    this.#entrada.disabled = !activo;
    this.limpiarEntrada();
    this.marcarError(false);
    // Al parar con Esc el campo queda deshabilitado; el foco pasa al botón para no perderse.
    (activo ? this.#entrada : this.#boton).focus();
  }

  limpiarEntrada() {
    this.#entrada.value = '';
  }

  marcarError(hayError) {
    this.#entrada.setAttribute('aria-invalid', String(hayError));
    const mensaje = hayError ? AYUDA_ERROR : AYUDA;
    // Solo se reescribe si cambia, para que el lector de pantalla no lo repita en cada tecla.
    if (this.#ayuda.textContent !== mensaje) this.#ayuda.textContent = mensaje;
  }

  celebrarAcierto() {
    this.#palabra.classList.remove('muestra__palabra--acierto');
    // Forzar reflow reinicia la animación aunque el acierto anterior no haya terminado.
    void this.#palabra.offsetWidth;
    this.#palabra.classList.add('muestra__palabra--acierto');
  }

  mostrarEstado(mensaje) {
    this.#estado.textContent = mensaje;
  }

  mostrarResumen(contador, segundos, palabrasPorMinuto) {
    this.mostrarEstado(
      `Prueba detenida: ${contador} palabras correctas en ${segundos} s (${palabrasPorMinuto} por minuto).`,
    );
  }

  mostrarError(mensaje) {
    this.#boton.disabled = true;
    this.#entrada.disabled = true;
    this.mostrarEstado(mensaje);
  }
}
