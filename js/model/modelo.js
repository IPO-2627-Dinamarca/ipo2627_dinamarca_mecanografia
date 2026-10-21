// Vocal acentuada y su vocal base. La tilde y la diéresis se escriben con la tecla ´ (¨ con mayúsculas).
const BASE_ACENTUADA = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u' };

/** Estado de una prueba: palabra en curso, aciertos, pulsaciones y tiempo transcurrido. */
export class Modelo {
  #palabras;
  #indice = -1;
  #palabra = '';
  #objetivo = '';
  #intento = '';
  #correctas = 0;
  #pulsaciones = 0;
  #fallos = 0;
  #inicio = 0;
  #fin = 0;
  #activo = false;
  #fallosPorTecla = new Map();

  /** @param {string[]} palabras sin repetidas */
  constructor(palabras) {
    // Con una sola palabra no habría forma de no repetir la anterior.
    if (palabras.length < 2) {
      throw new Error('La lista necesita al menos dos palabras distintas.');
    }
    this.#palabras = palabras;
  }

  get activo() { return this.#activo; }
  get palabra() { return this.#palabra; }
  get correctas() { return this.#correctas; }

  /** Copia de los fallos de la prueba por tecla: Map<tecla, número>. */
  get fallosPorTecla() { return new Map(this.#fallosPorTecla); }

  /** Tiempo de la prueba en curso o de la última, medido con el reloj del navegador. */
  get milisegundos() {
    return (this.#activo ? performance.now() : this.#fin) - this.#inicio;
  }

  get segundos() {
    return Math.floor(this.milisegundos / 1000);
  }

  get palabrasPorMinuto() {
    const ms = this.milisegundos;
    return ms > 0 ? (this.#correctas * 60_000) / ms : 0;
  }

  /** Fracción de pulsaciones correctas (0–1), o null si aún no se ha tecleado nada. */
  get precision() {
    return this.#pulsaciones > 0 ? (this.#pulsaciones - this.#fallos) / this.#pulsaciones : null;
  }

  /** true si lo escrito ya no es el principio de la palabra. */
  get hayError() {
    return !this.#objetivo.startsWith(this.#intento);
  }

  /**
   * Estado de cada letra (ok, error o pendiente) y de lo que sobra al final (sobrante).
   * Sin argumento usa lo último registrado; con texto no altera el estado.
   */
  progreso(texto = this.#intento) {
    const intento = Modelo.#normalizar(texto);
    const letras = [...this.#palabra].map((letra, i) => ({
      letra,
      estado: i >= intento.length ? 'pendiente'
        : intento[i] === this.#objetivo[i] ? 'ok' : 'error',
    }));
    const sobrantes = [...intento.slice(this.#objetivo.length)]
      .map((letra) => ({ letra, estado: 'sobrante' }));
    return letras.concat(sobrantes);
  }

  comenzar() {
    this.#correctas = 0;
    this.#pulsaciones = 0;
    this.#fallos = 0;
    this.#fallosPorTecla.clear();
    this.#inicio = performance.now();
    this.#activo = true;
    this.#siguientePalabra();
  }

  detener() {
    if (!this.#activo) return;
    this.#fin = performance.now();
    this.#activo = false;
    this.#intento = '';
  }

  /**
   * Registra el contenido del campo. Cada letra nueva cuenta como pulsación y, si no
   * coincide con la de su posición, como fallo.
   * @returns {boolean} true si completa la palabra; entonces ya hay otra en curso.
   */
  escribir(texto) {
    if (!this.#activo) return false;
    const intento = Modelo.#normalizar(texto);
    for (let i = this.#intento.length; i < intento.length; i++) {
      this.#pulsaciones++;
      if (intento[i] !== this.#objetivo[i]) {
        this.#fallos++;
        this.#anotarFallo(this.#objetivo[i], intento[i]);
      }
    }
    this.#intento = intento;
    if (intento !== this.#objetivo) return false;

    this.#correctas++;
    this.#siguientePalabra();
    return true;
  }

  /**
   * Validación explícita (Espacio o Intro). Si lo escrito es correcto pero incompleto, cuenta un
   * fallo; si ya tenía un error, ese fallo se contó al teclearlo y no se suma otro.
   * @returns {boolean} true si era correcta.
   */
  confirmar(texto) {
    if (!this.#activo) return false;
    if (this.escribir(texto)) return true;
    if (!this.hayError) {
      this.#pulsaciones++;
      this.#fallos++;
      this.#anotarFallo(this.#objetivo[this.#intento.length]); // la letra que faltaba
    }
    return false;
  }

  #anotarFallo(esperada, escrita) {
    if (esperada === undefined) return; // lo tecleado de más no corresponde a ninguna tecla
    const tecla = Modelo.#teclaDe(esperada, escrita);
    this.#fallosPorTecla.set(tecla, (this.#fallosPorTecla.get(tecla) ?? 0) + 1);
  }

  // Se culpa a la tecla de la letra pedida; si solo faltó la tilde (a por á), a la tecla ´.
  // La ñ es su propia tecla: por eso la tabla explícita y no NFD.
  static #teclaDe(esperada, escrita) {
    const base = BASE_ACENTUADA[esperada];
    if (base && escrita === base) return '´';
    return base ?? esperada;
  }

  #siguientePalabra() {
    // Se sortea entre las demás para no repetir la anterior sin tener que reintentar.
    const total = this.#palabras.length;
    let indice = Math.floor(Math.random() * (this.#indice < 0 ? total : total - 1));
    if (this.#indice >= 0 && indice >= this.#indice) indice++;

    this.#indice = indice;
    this.#palabra = this.#palabras[indice];
    this.#objetivo = Modelo.#normalizar(this.#palabra);
    this.#intento = '';
  }

  // Se exigen las tildes pero no las mayúsculas. NFC une la tilde y la vocal cuando el
  // teclado las entrega como dos caracteres.
  static #normalizar(texto) {
    return texto.normalize('NFC').toLocaleLowerCase('es');
  }
}
