// Se resuelve desde este módulo, así sirve aunque index.html se publique en otra ruta.
const URL_PALABRAS = new URL('../../data/palabras.json', import.meta.url);
const CLAVE_MEJOR_MARCA = 'mecanografia.mejorMarca';
// Muy por encima de cualquier marca humana; descarta valores manipulados.
const MARCA_MAXIMA = 300;

/**
 * Descarga la lista de palabras y la depura (sin repetidas ni espacios, en NFC).
 * Los mensajes de error están pensados para mostrarse al usuario.
 */
export async function cargarPalabras(url = URL_PALABRAS) {
  let respuesta;
  try {
    respuesta = await fetch(url);
  } catch (error) {
    throw new Error(
      'No se pudo descargar la lista de palabras. Si has abierto index.html directamente, sírvelo desde un servidor local.',
      { cause: error },
    );
  }
  if (!respuesta.ok) {
    throw new Error(`La lista de palabras no está disponible (HTTP ${respuesta.status}).`);
  }

  let datos;
  try {
    datos = await respuesta.json();
  } catch (error) {
    throw new Error('La lista de palabras no es un JSON válido.', { cause: error });
  }
  if (!Array.isArray(datos)) {
    throw new Error('La lista de palabras debe ser un array de cadenas.');
  }

  const palabras = [...new Set(
    datos
      .filter((palabra) => typeof palabra === 'string')
      .map((palabra) => palabra.trim().normalize('NFC'))
      .filter((palabra) => palabra !== '' && !/\s/.test(palabra)),
  )];
  const descartadas = datos.length - palabras.length;
  if (descartadas > 0) {
    console.warn(`palabras.json: ${descartadas} entradas descartadas por repetidas o no válidas.`);
  }
  return palabras;
}

/** Mejor marca guardada en palabras por minuto, o 0 si no hay ninguna. */
export function leerMejorMarca() {
  try {
    const valor = Number(localStorage.getItem(CLAVE_MEJOR_MARCA));
    return valor > 0 && valor <= MARCA_MAXIMA ? valor : 0;
  } catch {
    return 0;
  }
}

/** Guarda la mejor marca; si el navegador no deja usar localStorage, no hace nada. */
export function guardarMejorMarca(ppm) {
  try {
    localStorage.setItem(CLAVE_MEJOR_MARCA, String(ppm));
  } catch {
    // Modo privado o almacenamiento bloqueado: la marca vive solo en memoria.
  }
}
