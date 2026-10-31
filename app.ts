// Definimos una interfaz limpia para los artefactos
interface Artefacto {
    id: number;
    nombre: string;
    estado: 'Operativo' | 'En Revisión' | 'Inactivo';
}

// Datos de ejemplo
const artefactos: Artefacto[] = [
    { id: 1, nombre: 'Sensor de Presión A1', estado: 'Operativo' },
    { id: 2, nombre: 'Módulo de Control B2', estado: 'En Revisión' },
    { id: 3, nombre: 'Gateway IoT Principal', estado: 'Operativo' }
];

// Función para mostrar la fecha actual
function mostrarFecha(): void {
    const contenedorFecha = document.getElementById('fecha-actual');
    if (contenedorFecha) {
        const hoy = new Date();
        contenedorFecha.textContent = hoy.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
}

// Función para renderizar los artefactos en el HTML
function renderizarArtefactos(): void {
    const lista = document.getElementById('lista-artefactos');
    if (!lista) return;

    lista.innerHTML = '';
    artefactos.forEach(item => {
        const li = document.createElement('li');
        li.className = 'py-2 flex justify-between items-center';
        
        const colorEstado = item.estado === 'Operativo' ? 'text-green-600 font-medium' : 'text-amber-600 font-medium';
        
        li.innerHTML = `
            <span>${item.nombre}</span>
            <span class="${colorEstado} text-xs px-2 py-1 bg-gray-50 rounded border">${item.estado}</span>
        `;
        lista.appendChild(li);
    });
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => {
    mostrarFecha();
    renderizarArtefactos();
});