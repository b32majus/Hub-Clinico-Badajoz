// #956 tramo 5 (ADR-010 §3): menú de cada módulo para <nx-shell>.
// Qué módulos se ven lo decide el perfil del hospital (deployment-manifest.json, el de la Home);
// aquí solo está el menú interno de cada uno, que el manifiesto no trae.
// href: nombre de la página en la raíz del sitio. icono: clase de Font Awesome (vendor/).

export const MENUS = Object.freeze({
    farmacia: {
        producto: 'FarmaNEXus',
        titulo: 'Farmacia Hospitalaria',
        icono: 'fa-prescription-bottle-alt',
        secciones: [
            {
                titulo: 'Farmacia',
                enlaces: [
                    { texto: 'Inicio Farmacia', href: 'farmacia_index.html', icono: 'fa-search' },
                    { texto: 'Validación', href: 'farmacia_validacion.html', icono: 'fa-check-double' },
                    { texto: 'Primera Visita', href: 'farmacia_primera_visita.html', icono: 'fa-plus-circle' },
                    { texto: 'Seguimiento', href: 'farmacia_seguimiento.html', icono: 'fa-clipboard-list' },
                    { texto: 'Dashboard Paciente', href: 'farmacia_dashboard_paciente.html', icono: 'fa-user-circle' },
                ],
            },
            {
                titulo: 'Gestión',
                enlaces: [
                    { texto: 'Pendientes', href: 'farmacia_actividad_servicio.html', icono: 'fa-tasks' },
                    { texto: 'Estadísticas del servicio', href: 'farmacia_estadisticas.html', icono: 'fa-chart-bar' },
                    { texto: 'Fármacos', href: 'farmacia_farmacos.html', icono: 'fa-pills' },
                    { texto: 'Profesionales', href: 'farmacia_profesionales.html', icono: 'fa-users' },
                ],
            },
        ],
    },
    reuma: {
        producto: 'ReumaNEXus',
        titulo: 'Reumatología',
        icono: 'fa-stethoscope',
        secciones: [
            {
                titulo: 'Consulta',
                enlaces: [
                    { texto: 'Inicio', href: 'reuma_index.html', icono: 'fa-home' },
                    { texto: 'Nueva Visita', href: 'primera_visita.html', icono: 'fa-plus-circle' },
                    { texto: 'Visita de Seguimiento', href: 'seguimiento.html', icono: 'fa-clipboard-list' },
                ],
            },
            {
                titulo: 'Gestión',
                enlaces: [
                    { texto: 'Estadísticas', href: 'estadisticas.html', icono: 'fa-chart-bar' },
                    { texto: 'Profesionales', href: 'manage_professionals.html', icono: 'fa-users' },
                ],
            },
        ],
    },
});
