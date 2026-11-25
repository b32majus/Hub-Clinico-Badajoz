// #956 tramo 4: botones de prueba de la página de muestra. Datos inventados.
import { avisar, confirmar } from '../modules/nexus/index.js';
import '../modules/nexus/piezas/nx-ayuda.js';

const TEXTOS = {
    error: ['No se pudo guardar el fichero. Vuelva a intentarlo.', 'Error al guardar'],
    ok: ['Los datos se copiaron al portapapeles.', undefined],
};

document.addEventListener('click', async (evento) => {
    const botonAviso = evento.target.closest('[data-muestra-avisar]');
    if (botonAviso) {
        const tipo = botonAviso.dataset.muestraAvisar;
        const [texto, titulo] = TEXTOS[tipo];
        avisar(texto, { tipo, titulo });
        return;
    }
    const botonConfirmar = evento.target.closest('[data-muestra-confirmar]');
    if (botonConfirmar) {
        const peligro = botonConfirmar.dataset.muestraConfirmar === 'peligro';
        const si = await confirmar(peligro
            ? { titulo: '¿Descartar los cambios?', texto: 'Se perderá lo que no se haya exportado.', aceptar: 'Descartar', cancelar: 'Seguir editando', peligro: true }
            : { titulo: '¿Copiar los datos?', texto: 'Se copiarán al portapapeles.', aceptar: 'Copiar' });
        document.getElementById('muestra-resultado').textContent = `Respuesta: ${si ? 'aceptar' : 'cancelar'}.`;
    }
});
