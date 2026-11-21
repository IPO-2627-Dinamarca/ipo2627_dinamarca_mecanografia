// Vocal acentuada y su vocal base. La tilde y la diéresis se escriben con la tecla ´ (¨ con mayúsculas).
const BASE_ACENTUADA = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u' };
// Tecla a la que se apuntan los fallos de mayúscula, tanto si falta como si sobra.
const TECLA_MAYUS = '⇧';
// Una de cada cinco palabras sale con la inicial en mayúscula.
const PROBABILIDAD_MAYUSCULA = 0.2;
// Palabras que se ven por adelantado debajo de la que se está escribiendo.
const EN_COLA = 3;
const SIN_LIMITE = Object.freeze({ segundos: null, palabras: null });

/** Estado de una prueba: palabra en curso, aciertos, pulsaciones y tiempo transcurrido. */
export class Modelo {
  #palabras;
  #indiceUltima = -1;
  #palabra = '';
  #cola = [];
  #intento = '';
  #correctas = 0;
  #pulsaciones = 0;
  #fallos = 0;
  #inicio = 0;
  #fin = 0;
  #activo = false;
  #limite = SIN_LIMITE;
  #fallosPorTecla = new Map();
  // Registro de la prueba, en ms desde el inicio: cada palabra aceptada y cada fallo.
  #aceptadas = [];
  #instantesFallo = [];
  #palabraConFallo = false;

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

  /** Las próximas palabras, en orden. */
  get siguientes() { return [...this.#cola]; }

  /** Límites de la prueba en curso o de la última; null es sin límite. */
  get limite() { return { ...this.#limite }; }

  /** Copia de los fallos de la prueba por tecla: Map<tecla, número>. */
  get fallosPorTecla() { return new Map(this.#fallosPorTecla); }

  /** Palabras aceptadas en orden, con si tuvieron algún fallo: [{texto, conFallos}]. */
  get aceptadas() {
    return this.#aceptadas.map(({ texto, conFallos }) => ({ texto, conFallos }));
  }

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

  /** Avance hacia el límite (0–1): el más cercano de los que haya; null sin límite. */
  get progreso() {
    const { segundos, palabras } = this.#limite;
    const fracciones = [];
    if (segundos !== null) fracciones.push(this.milisegundos / (segundos * 1000));
    if (palabras !== null) fracciones.push(this.#correctas / palabras);
    return fracciones.length === 0 ? null : Math.min(1, Math.max(...fracciones));
  }

  /** true si lo escrito ya no es el principio de la palabra. */
  get hayError() {
    return !this.#palabra.startsWith(this.#intento);
  }

  /** true en cuanto se cumple cualquiera de los dos límites. */
  get limiteAlcanzado() {
    const { segundos, palabras } = this.#limite;
    return (palabras !== null && this.#correctas >= palabras)
      || (segundos !== null && this.milisegundos >= segundos * 1000);
  }

  /**
   * Estado de cada letra (ok, error o pendiente) y de lo que sobra al final (sobrante).
   * Sin argumento usa lo último registrado; con texto no altera el estado.
   */
  letras(texto = this.#intento) {
    const intento = Modelo.#normalizar(texto);
    const letras = [...this.#palabra].map((letra, i) => ({
      letra,
      estado: i >= intento.length ? 'pendiente'
        : intento[i] === this.#palabra[i] ? 'ok' : 'error',
    }));
    const sobrantes = [...intento.slice(this.#palabra.length)]
      .map((letra) => ({ letra, estado: 'sobrante' }));
    return letras.concat(sobrantes);
  }

  /**
   * PPM media acumulada, un punto por segundo desde desdeMs; el último, en el instante final,
   * coincide con palabrasPorMinuto. Los tiempos van en segundos.
   * @returns {{puntos: {s: number, ppm: number}[], fallos: number[], duracion: number}}
   */
  ritmo(desdeMs) {
    const total = this.milisegundos;
    const ppmEn = (ms) => (this.#aceptadas.filter((p) => p.ms <= ms).length * 60_000) / ms;
    const puntos = [];
    for (let ms = desdeMs; ms < total; ms += 1000) puntos.push({ s: ms / 1000, ppm: ppmEn(ms) });
    if (total >= desdeMs) puntos.push({ s: total / 1000, ppm: this.palabrasPorMinuto });
    return { puntos, fallos: this.#instantesFallo.map((ms) => ms / 1000), duracion: total / 1000 };
  }

  /** @param {{segundos: number|null, palabras: number|null}} limite */
  comenzar(limite = SIN_LIMITE) {
    this.#limite = { ...limite };
    this.#correctas = 0;
    this.#pulsaciones = 0;
    this.#fallos = 0;
    this.#fallosPorTecla.clear();
    this.#aceptadas = [];
    this.#instantesFallo = [];
    this.#cola = Array.from({ length: EN_COLA }, () => this.#sortear());
    this.#inicio = performance.now();
    this.#activo = true;
    this.#avanzar();
  }

  detener() {
    if (!this.#activo) return;
    // Si se acabó el tiempo, la prueba dura exactamente el límite aunque el aviso llegue tarde.
    const { segundos } = this.#limite;
    const ahora = performance.now();
    this.#fin = segundos === null ? ahora : Math.min(ahora, this.#inicio + segundos * 1000);
    this.#activo = false;
    this.#intento = '';
  }

  /**
   * Registra el contenido del campo. Cada letra nueva cuenta como pulsación y, si no
   * coincide con la de su posición, como fallo.
   */
  escribir(texto) {
    if (!this.#activo || this.limiteAlcanzado) return;
    const intento = Modelo.#normalizar(texto);
    for (let i = this.#intento.length; i < intento.length; i++) {
      this.#pulsaciones++;
      if (intento[i] !== this.#palabra[i]) this.#fallar(this.#palabra[i], intento[i]);
    }
    this.#intento = intento;
  }

  /**
   * Espacio o Intro: si la palabra está completa y sin errores, suma y pasa a la siguiente.
   * Si lo escrito es correcto pero incompleto, cuenta un fallo; si ya tenía un error, ese
   * fallo se contó al teclearlo y no se suma otro.
   * @returns {boolean} true si era correcta.
   */
  confirmar(texto) {
    if (!this.#activo || this.limiteAlcanzado) return false;
    this.escribir(texto);
    if (this.#intento === this.#palabra) {
      this.#pulsaciones++; // el espacio también es una pulsación
      this.#correctas++;
      this.#aceptadas.push({ texto: this.#palabra, conFallos: this.#palabraConFallo, ms: this.milisegundos });
      this.#avanzar();
      return true;
    }
    if (!this.hayError) {
      this.#pulsaciones++;
      this.#fallar(this.#palabra[this.#intento.length]); // la letra que faltaba
    }
    return false;
  }

  #fallar(esperada, escrita) {
    this.#fallos++;
    this.#palabraConFallo = true;
    this.#instantesFallo.push(this.milisegundos);
    this.#anotarFallo(esperada, escrita);
  }

  #anotarFallo(esperada, escrita) {
    if (esperada === undefined) return; // lo tecleado de más no corresponde a ninguna tecla
    const tecla = Modelo.#teclaDe(esperada, escrita);
    this.#fallosPorTecla.set(tecla, (this.#fallosPorTecla.get(tecla) ?? 0) + 1);
  }

  // Se culpa a la tecla de la letra pedida. Si solo falló la mayúscula, a la tecla de mayúsculas;
  // si solo faltó la tilde (a por á), a la tecla ´. La ñ es su propia tecla: por eso la tabla
  // explícita y no NFD.
  static #teclaDe(esperada, escrita) {
    const pedida = esperada.toLocaleLowerCase('es');
    const tecleada = escrita?.toLocaleLowerCase('es');
    if (tecleada === pedida) return TECLA_MAYUS;
    const base = BASE_ACENTUADA[pedida];
    if (base && tecleada === base) return '´';
    return base ?? pedida;
  }

  // La primera de la cola pasa a escribirse y entra una nueva por el final.
  #avanzar() {
    const [primera, ...resto] = this.#cola;
    this.#palabra = primera;
    this.#cola = [...resto, this.#sortear()];
    this.#intento = '';
    this.#palabraConFallo = false;
  }

  // Se sortea entre las demás para no repetir la última de la cola sin tener que reintentar.
  #sortear() {
    const total = this.#palabras.length;
    const ultima = this.#indiceUltima;
    let indice = Math.floor(Math.random() * (ultima < 0 ? total : total - 1));
    if (ultima >= 0 && indice >= ultima) indice++;

    this.#indiceUltima = indice;
    return Modelo.#quizaConMayuscula(this.#palabras[indice]);
  }

  static #quizaConMayuscula(palabra) {
    if (Math.random() >= PROBABILIDAD_MAYUSCULA) return palabra;
    return palabra[0].toLocaleUpperCase('es') + palabra.slice(1);
  }

  // Se exigen tildes y mayúsculas. NFC une la tilde y la vocal cuando el teclado las entrega
  // como dos caracteres.
  static #normalizar(texto) {
    return texto.normalize('NFC');
  }
}
