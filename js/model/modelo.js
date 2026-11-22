// Vocal acentuada y su vocal base. La tilde y la diéresis se escriben con la tecla ´ (¨ con mayúsculas).
const BASE_ACENTUADA = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u' };
// Tecla a la que se apuntan los fallos de mayúscula, tanto si falta como si sobra.
const TECLA_MAYUS = '⇧';
// Una de cada cinco palabras sale con la inicial en mayúscula.
const PROBABILIDAD_MAYUSCULA = 0.2;
// Una de cada trescientas sale de las raras (el resto del diccionario) en lugar de las comunes.
const PROBABILIDAD_RARA = 1 / 300;
// Palabras que se ven por adelantado debajo de la que se está escribiendo.
const EN_COLA = 3;
const SIN_LIMITE = Object.freeze({ segundos: null, palabras: null });
// Libre: Espacio pasa siempre de palabra. Estricto: solo si está completa y bien.
const MODO_POR_DEFECTO = 'libre';

/** Estado de una prueba: palabra en curso, aciertos, pulsaciones y tiempo transcurrido. */
export class Modelo {
  #comunes;
  #raras;
  #ultima = '';
  #palabra = '';
  #cola = [];
  #intento = '';
  #correctas = 0;
  #pulsaciones = 0;
  // Teclas que escriben de verdad; a diferencia de #pulsaciones, no incluye las letras que
  // el modelo apunta como fallo al pasar una palabra incompleta.
  #teclas = 0;
  #fallos = 0;
  #inicio = 0;
  #fin = 0;
  #activo = false;
  #limite = SIN_LIMITE;
  #modo = MODO_POR_DEFECTO;
  #fallosPorTecla = new Map();
  // Registro de la prueba, en ms desde el inicio: cada palabra pasada, cada fallo y la
  // duración de cada corrección.
  #pasadas = [];
  #instantesFallo = [];
  #correcciones = [];
  #inicioError = null;
  #palabraConFallo = false;

  /** @param {{comunes: string[], raras: string[]}} palabras listas sin repetidas */
  constructor({ comunes, raras = [] }) {
    // Con una sola palabra no habría forma de no repetir la anterior.
    if (comunes.length < 2) {
      throw new Error('La lista necesita al menos dos palabras comunes distintas.');
    }
    this.#comunes = comunes;
    this.#raras = raras;
  }

  get activo() { return this.#activo; }
  get palabra() { return this.#palabra; }
  get correctas() { return this.#correctas; }

  /** Las próximas palabras, en orden. */
  get siguientes() { return [...this.#cola]; }

  /** Límites de la prueba en curso o de la última; null es sin límite. */
  get limite() { return { ...this.#limite }; }

  /** Modo de paso de la prueba en curso o de la última: 'libre' o 'estricto'. */
  get modo() { return this.#modo; }

  /** Copia de los fallos de la prueba por tecla: Map<tecla, número>. */
  get fallosPorTecla() { return new Map(this.#fallosPorTecla); }

  /**
   * Palabras pasadas en orden. estado: 'bien' (sin fallos), 'corregida' (tuvo fallos y se
   * entregó bien) o 'sinCorregir' (se pasó mal o incompleta, solo en modo libre).
   * @returns {{pedida: string, escrita: string, estado: string}[]}
   */
  get pasadas() {
    return this.#pasadas.map(({ pedida, escrita, estado }) => ({ pedida, escrita, estado }));
  }

  /** Las pasadas sin corregir, en orden: [{pedida, escrita}]. */
  get sinCorregir() {
    return this.#pasadas.filter((p) => p.estado === 'sinCorregir')
      .map(({ pedida, escrita }) => ({ pedida, escrita }));
  }

  /** Errores corregidos y tiempo medio entre el error y su corrección (null si no hubo). */
  get correcciones() {
    const cuantas = this.#correcciones.length;
    const total = this.#correcciones.reduce((suma, ms) => suma + ms, 0);
    return { cuantas, mediaMs: cuantas > 0 ? total / cuantas : null };
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

  /** Pulsaciones brutas por minuto: todas las teclas que escriben, también las erróneas o borradas. */
  get pulsacionesPorMinuto() {
    const ms = this.milisegundos;
    return ms > 0 ? (this.#teclas * 60_000) / ms : 0;
  }

  /** Fracción de pulsaciones correctas (0–1), o null si aún no se ha tecleado nada. */
  get precision() {
    return this.#pulsaciones > 0 ? (this.#pulsaciones - this.#fallos) / this.#pulsaciones : null;
  }

  /** Fracción de palabras pasadas que se entregaron bien (0–1), o null si no se pasó ninguna. */
  get precisionPalabras() {
    const pasadas = this.#pasadas.length;
    return pasadas > 0 ? this.#correctas / pasadas : null;
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
   * coincide con palabrasPorMinuto. Solo cuentan las palabras bien entregadas. Los tiempos
   * van en segundos: fallos e instantes en que se pasó una palabra sin corregir.
   * @returns {{puntos: {s: number, ppm: number}[], fallos: number[], sinCorregir: number[],
   *            duracion: number}}
   */
  ritmo(desdeMs) {
    const total = this.milisegundos;
    const bien = this.#pasadas.filter((p) => p.estado !== 'sinCorregir');
    const ppmEn = (ms) => (bien.filter((p) => p.ms <= ms).length * 60_000) / ms;
    const puntos = [];
    for (let ms = desdeMs; ms < total; ms += 1000) puntos.push({ s: ms / 1000, ppm: ppmEn(ms) });
    if (total >= desdeMs) puntos.push({ s: total / 1000, ppm: this.palabrasPorMinuto });
    return {
      puntos,
      fallos: this.#instantesFallo.map((ms) => ms / 1000),
      sinCorregir: this.#pasadas.filter((p) => p.estado === 'sinCorregir').map((p) => p.ms / 1000),
      duracion: total / 1000,
    };
  }

  /**
   * @param {{segundos: number|null, palabras: number|null}} limite
   * @param {'libre'|'estricto'} modo
   */
  comenzar(limite = SIN_LIMITE, modo = MODO_POR_DEFECTO) {
    this.#limite = { ...limite };
    this.#modo = modo === 'estricto' ? 'estricto' : 'libre';
    this.#correctas = 0;
    this.#pulsaciones = 0;
    this.#teclas = 0;
    this.#fallos = 0;
    this.#fallosPorTecla.clear();
    this.#pasadas = [];
    this.#instantesFallo = [];
    this.#correcciones = [];
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
    this.#inicioError = null;
  }

  /**
   * Registra el contenido del campo. Cada letra nueva cuenta como pulsación y, si no
   * coincide con la de su posición, como fallo. Un error empieza cuando lo escrito deja de
   * ser principio de la palabra y queda corregido cuando vuelve a serlo.
   */
  escribir(texto) {
    if (!this.#activo || this.limiteAlcanzado) return;
    const intento = Modelo.#normalizar(texto);
    const habiaError = this.hayError;
    for (let i = this.#intento.length; i < intento.length; i++) {
      this.#pulsaciones++;
      this.#teclas++;
      if (intento[i] !== this.#palabra[i]) this.#fallar(this.#palabra[i], intento[i]);
    }
    this.#intento = intento;

    if (!habiaError && this.hayError) {
      this.#inicioError = this.milisegundos;
    } else if (habiaError && !this.hayError) {
      this.#correcciones.push(this.milisegundos - this.#inicioError);
      this.#inicioError = null;
    }
  }

  /**
   * Espacio o Intro con algo escrito. Si la palabra está completa y sin errores, suma y pasa
   * a la siguiente. Si no, en modo libre pasa igualmente sin sumar y cada letra que faltaba
   * cuenta como pulsación fallada. En estricto no avanza: si lo escrito es correcto pero
   * incompleto cuenta un fallo; si ya tenía un error, ese fallo se contó al teclearlo.
   * @returns {string|null} estado de la palabra pasada, o null si no se pasó.
   */
  confirmar(texto) {
    if (!this.#activo || this.limiteAlcanzado) return null;
    this.escribir(texto);
    if (this.#intento === '') return null;
    if (this.#intento === this.#palabra) {
      this.#pulsaciones++; // el espacio también es una pulsación
      this.#teclas++;
      this.#correctas++;
      return this.#pasar(this.#palabraConFallo ? 'corregida' : 'bien');
    }
    if (this.#modo === 'libre') {
      this.#teclas++; // el espacio que pasa de palabra; las letras que faltan no se teclearon
      for (const letra of this.#palabra.slice(this.#intento.length)) {
        this.#pulsaciones++;
        this.#fallar(letra);
      }
      return this.#pasar('sinCorregir');
    }
    if (!this.hayError) {
      this.#pulsaciones++;
      this.#fallar(this.#palabra[this.#intento.length]); // la letra que faltaba
    }
    return null;
  }

  #pasar(estado) {
    this.#pasadas.push({ pedida: this.#palabra, escrita: this.#intento, estado, ms: this.milisegundos });
    this.#avanzar();
    return estado;
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
    this.#inicioError = null;
    this.#palabraConFallo = false;
  }

  // Casi siempre una común y, de vez en cuando, una rara; nunca la misma que la última de la cola.
  #sortear() {
    const lista = this.#raras.length > 1 && Math.random() < PROBABILIDAD_RARA ? this.#raras : this.#comunes;
    let palabra;
    do palabra = lista[Math.floor(Math.random() * lista.length)];
    while (palabra === this.#ultima);

    this.#ultima = palabra;
    return Modelo.#quizaConMayuscula(palabra);
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
