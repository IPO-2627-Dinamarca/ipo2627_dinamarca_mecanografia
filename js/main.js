import { cargarPalabras } from './model/almacen.js';
import { Modelo } from './model/modelo.js';
import { Vista } from './view/vista.js';
import { Controlador } from './controller/controlador.js';

// El HTML arranca en estado de error con un aviso estático; si este módulo llega a
// ejecutarse, se sustituye por el de carga.
const vista = new Vista();
vista.mostrarCargando();
try {
  const modelo = new Modelo(await cargarPalabras());
  new Controlador(modelo, vista).iniciar();
} catch (error) {
  console.error(error);
  vista.mostrarError(error.message);
}
