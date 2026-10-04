// Se resuelve respecto al módulo, no al documento, para que no dependa de dónde se sirva index.html.
const URL_PALABRAS = new URL('../data/palabras.json', import.meta.url);

export class Almacen {
  static async cargar(url = URL_PALABRAS) {
    const respuesta = await fetch(url);
    if (!respuesta.ok) {
      throw new Error(`No se pudo cargar ${url} (HTTP ${respuesta.status})`);
    }
    let datos;
    try {
      datos = await respuesta.json();
    } catch {
      throw new Error(`El fichero ${url} no contiene JSON válido`);
    }
    if (!Array.isArray(datos)) {
      throw new Error('palabras.json debe contener un array de palabras');
    }

    const palabras = [...new Set(
      datos
        .filter((palabra) => typeof palabra === 'string')
        .map((palabra) => palabra.trim().normalize('NFC'))
        .filter((palabra) => palabra !== '' && !/\s/.test(palabra)),
    )];

    // El modelo evita repetir la palabra anterior, así que necesita al menos dos distintas.
    if (palabras.length < 2) {
      throw new Error('El almacén necesita al menos dos palabras distintas');
    }
    return palabras;
  }
}
