export class Modelo {
  #palabras;
  #palabraActual = '';
  #contador = 0;
  #segundos = 0;
  #activo = false;

  constructor(palabras) {
    this.#palabras = palabras;
  }

  get palabraActual() { return this.#palabraActual; }
  get contador()      { return this.#contador; }
  get segundos()      { return this.#segundos; }
  get activo()        { return this.#activo; }

  iniciar() {
    this.#contador = 0;
    this.#segundos = 0;
    this.#activo = true;
    this.#nuevaPalabra();
  }

  parar() {
    this.#activo = false;
  }

  tick() {
    if (this.#activo) this.#segundos++;
  }

  palabraCorrecta(intento) {
    if (!this.#activo || Modelo.#normalizar(intento) !== this.#palabraActual) return false;
    this.#contador++;
    this.#nuevaPalabra();
    return true;
  }

  vaBien(intento) {
    return this.#palabraActual.startsWith(Modelo.#normalizar(intento));
  }

  get palabrasPorMinuto() {
    return this.#segundos === 0 ? 0 : Math.round((this.#contador * 60) / this.#segundos);
  }

  #nuevaPalabra() {
    let siguiente;
    do {
      siguiente = this.#palabras[Math.floor(Math.random() * this.#palabras.length)];
    } while (siguiente === this.#palabraActual);
    this.#palabraActual = siguiente;
  }

  // NFC: algunos teclados componen las tildes como dos caracteres (a + ´) y no coincidirían.
  static #normalizar(texto) {
    return texto.trim().normalize('NFC');
  }
}
