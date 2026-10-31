// Cargar artefactos de LocalStorage para persistencia offline real
const STORAGE_KEY_ARTEFACTOS = 'mipwa_artefactos';
const artefactosIniciales = [
    { id: 1, nombre: 'Sensor de Presión A1', estado: 'Operativo' },
    { id: 2, nombre: 'Módulo de Control B2', estado: 'En Revisión' },
    { id: 3, nombre: 'Gateway IoT Principal', estado: 'Operativo' }
];

function cargarArtefactos() {
    const data = localStorage.getItem(STORAGE_KEY_ARTEFACTOS);
    if (!data) {
        localStorage.setItem(STORAGE_KEY_ARTEFACTOS, JSON.stringify(artefactosIniciales));
        return artefactosIniciales;
    }
    try {
        return JSON.parse(data);
    } catch {
        return artefactosIniciales;
    }
}

function guardarArtefactos(items) {
    localStorage.setItem(STORAGE_KEY_ARTEFACTOS, JSON.stringify(items));
}

let artefactos = cargarArtefactos();

// Helper para fecha en formato ISO local YYYY-MM-DD
function formatearFechaISO(d) {
    const año = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

const hoy = new Date();
const isoHoy = formatearFechaISO(hoy);

const fechaAyer = new Date(hoy);
fechaAyer.setDate(hoy.getDate() - 1);

const fechaMañana = new Date(hoy);
fechaMañana.setDate(hoy.getDate() + 1);

const fechaEnTresDias = new Date(hoy);
fechaEnTresDias.setDate(hoy.getDate() + 3);

let eventos = [
    { id: 1, fecha: isoHoy, auto: 'Auto 01', titulo: 'Inspección de Frenos y Presión', tipo: 'inspeccion' },
    { id: 2, fecha: isoHoy, auto: 'Auto 04', titulo: 'Cambio de Aceite y Filtros', tipo: 'mantenimiento' },
    { id: 3, fecha: formatearFechaISO(fechaMañana), auto: 'Auto 02', titulo: 'Calibración de Sensores IoT', tipo: 'inspeccion' },
    { id: 4, fecha: formatearFechaISO(fechaEnTresDias), auto: 'Auto 05', titulo: 'Entrega a Operaciones', tipo: 'entrega' },
    { id: 5, fecha: formatearFechaISO(fechaAyer), auto: 'Auto 03', titulo: 'Revisión Batería 12V', tipo: 'mantenimiento' }
];

// Estado del Calendario
let mesMostrado = hoy.getMonth();
let añoMostrado = hoy.getFullYear();
let diaSeleccionado = isoHoy;
let autoFiltro = null;

const NOMBRES_MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

let streamCamaraActivo = null;
let deferredPromptInstalacion = null;

// Helper para log en consola visual
function logHardware(mensaje, tipo = 'info') {
    const consoleText = document.getElementById('hardware-console-text');
    if (!consoleText) return;
    const prefijo = tipo === 'exito' ? '✅' : tipo === 'error' ? '⚠️' : '⚡';
    consoleText.textContent = `${prefijo} ${mensaje}`;
}

// -------------------------------------------------------------
// RENDERIZADO DE CALENDARIO
// -------------------------------------------------------------
function renderizarCalendario() {
    const labelMesAño = document.getElementById('mes-año-label');
    const gridDias = document.getElementById('grid-dias');
    if (!labelMesAño || !gridDias) return;

    labelMesAño.textContent = `${NOMBRES_MESES[mesMostrado]} ${añoMostrado}`;

    const primerDia = new Date(añoMostrado, mesMostrado, 1);
    let diaSemanaInicio = primerDia.getDay(); 
    diaSemanaInicio = (diaSemanaInicio === 0) ? 6 : diaSemanaInicio - 1;

    const totalDiasMes = new Date(añoMostrado, mesMostrado + 1, 0).getDate();
    const diasMesAnterior = new Date(añoMostrado, mesMostrado, 0).getDate();

    gridDias.innerHTML = '';

    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
        const diaNum = diasMesAnterior - i;
        const div = document.createElement('div');
        div.className = 'py-2 text-gray-300 select-none';
        div.textContent = diaNum.toString();
        gridDias.appendChild(div);
    }

    for (let dia = 1; dia <= totalDiasMes; dia++) {
        const mesStr = String(mesMostrado + 1).padStart(2, '0');
        const diaStr = String(dia).padStart(2, '0');
        const fechaClave = `${añoMostrado}-${mesStr}-${diaStr}`;

        const esHoy = fechaClave === isoHoy;
        const esSeleccionado = fechaClave === diaSeleccionado;

        const eventosDelDia = eventos.filter(ev => {
            const coincideFecha = ev.fecha === fechaClave;
            return autoFiltro ? (coincideFecha && ev.auto === autoFiltro) : coincideFecha;
        });
        const tieneEventos = eventosDelDia.length > 0;

        const boton = document.createElement('button');
        boton.type = 'button';
        boton.dataset.fecha = fechaClave;

        let clases = 'py-2 rounded-lg flex flex-col items-center justify-center relative transition font-medium ';
        if (esSeleccionado) {
            clases += 'bg-blue-600 text-white shadow-sm ';
        } else if (esHoy) {
            clases += 'bg-blue-50 text-blue-700 font-bold border border-blue-200 ';
        } else {
            clases += 'text-gray-700 hover:bg-gray-100 ';
        }
        boton.className = clases;

        boton.innerHTML = `
            <span>${dia}</span>
            ${tieneEventos ? `<span class="w-1.5 h-1.5 rounded-full ${esSeleccionado ? 'bg-amber-300' : 'bg-blue-600'} mt-0.5"></span>` : '<span class="w-1.5 h-1.5 mt-0.5"></span>'}
        `;

        boton.addEventListener('click', () => {
            diaSeleccionado = fechaClave;
            renderizarCalendario();
            renderizarEventosDelDia();
            if ('vibrate' in navigator) navigator.vibrate(20);
            logHardware(`Día seleccionado: ${fechaClave} (${eventosDelDia.length} eventos)`, 'info');
        });

        gridDias.appendChild(boton);
    }

    renderizarEventosDelDia();
}

function renderizarEventosDelDia() {
    const lista = document.getElementById('lista-eventos-dia');
    const badge = document.getElementById('badge-total-eventos');
    const label = document.getElementById('label-dia-seleccionado');
    if (!lista || !badge || !label) return;

    const partes = diaSeleccionado.split('-');
    const fechaObj = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    const opciones = { weekday: 'short', day: 'numeric', month: 'short' };
    const fechaTexto = fechaObj.toLocaleDateString('es-ES', opciones);

    label.textContent = `Agenda: ${fechaTexto}`;

    const eventosDelDia = eventos.filter(ev => {
        const coincideFecha = ev.fecha === diaSeleccionado;
        return autoFiltro ? (coincideFecha && ev.auto === autoFiltro) : coincideFecha;
    });

    badge.textContent = `${eventosDelDia.length} evento${eventosDelDia.length === 1 ? '' : 's'}`;

    lista.innerHTML = '';
    if (eventosDelDia.length === 0) {
        lista.innerHTML = `<li class="text-gray-400 italic py-1">No hay revisiones para este día${autoFiltro ? ' (' + autoFiltro + ')' : ''}.</li>`;
        return;
    }

    eventosDelDia.forEach(ev => {
        const li = document.createElement('li');
        li.className = 'p-2 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between text-xs';
        
        let colorTag = 'bg-blue-100 text-blue-700';
        if (ev.tipo === 'mantenimiento') colorTag = 'bg-amber-100 text-amber-700';
        if (ev.tipo === 'entrega') colorTag = 'bg-emerald-100 text-emerald-700';

        li.innerHTML = `
            <div class="flex flex-col">
                <span class="font-semibold text-gray-800">${ev.auto} - ${ev.titulo}</span>
                <span class="text-[11px] text-gray-400 capitalize">${ev.tipo}</span>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-medium ${colorTag}">
                ${ev.tipo}
            </span>
        `;
        lista.appendChild(li);
    });
}

// -------------------------------------------------------------
// RENDERIZADO DE ARTEFACTOS
// -------------------------------------------------------------
function renderizarArtefactos() {
    const lista = document.getElementById('lista-artefactos');
    if (!lista) return;

    lista.innerHTML = '';
    artefactos.forEach(item => {
        const li = document.createElement('li');
        li.className = 'py-2 flex justify-between items-center';
        
        let colorEstado = 'text-green-600 bg-green-50 border-green-200';
        if (item.estado === 'En Revisión') colorEstado = 'text-amber-600 bg-amber-50 border-amber-200';
        if (item.estado === 'Inactivo') colorEstado = 'text-red-600 bg-red-50 border-red-200';
        
        li.innerHTML = `
            <span class="text-gray-700 font-medium">${item.nombre}</span>
            <button data-id="${item.id}" class="btn-toggle-estado text-xs px-2 py-1 rounded border font-medium transition cursor-pointer hover:opacity-80 ${colorEstado}">
                ${item.estado}
            </button>
        `;
        lista.appendChild(li);
    });

    lista.querySelectorAll('.btn-toggle-estado').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const id = Number(target.dataset.id);
            const index = artefactos.findIndex(a => a.id === id);
            if (index !== -1) {
                const actual = artefactos[index].estado;
                artefactos[index].estado = actual === 'Operativo' ? 'En Revisión' : actual === 'En Revisión' ? 'Inactivo' : 'Operativo';
                guardarArtefactos(artefactos);
                renderizarArtefactos();
                
                if ('vibrate' in navigator) navigator.vibrate(30);
                logHardware(`Artefacto: ${artefactos[index].nombre} -> ${artefactos[index].estado}`, 'exito');
            }
        });
    });
}

// -------------------------------------------------------------
// FUNCIONES DEL KIT DE HARDWARE
// -------------------------------------------------------------
async function iniciarCamara() {
    const modal = document.getElementById('modal-camara');
    const video = document.getElementById('video-feed');
    const status = document.getElementById('camara-status');
    if (!modal || !video) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (status) status.textContent = 'Iniciando sensor de cámara...';

    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Cámara no soportada en este entorno.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });

        streamCamaraActivo = stream;
        video.srcObject = stream;
        video.play();
        if (status) status.textContent = 'Cámara activa (PWA WebRTC).';
        logHardware('Cámara conectada vía getUserMedia API', 'exito');
    } catch (err) {
        if (status) status.textContent = 'Acceso a cámara denegado o no disponible.';
        logHardware(`Error de cámara: ${err.message || 'Denegado'}`, 'error');
    }
}

function detenerCamara() {
    const modal = document.getElementById('modal-camara');
    const video = document.getElementById('video-feed');
    if (streamCamaraActivo) {
        streamCamaraActivo.getTracks().forEach(track => track.stop());
        streamCamaraActivo = null;
    }
    if (video) video.srcObject = null;
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function obtenerGeolocalizacion() {
    if (!('geolocation' in navigator)) {
        logHardware('Geolocalización no soportada.', 'error');
        return;
    }

    logHardware('Consultando antena GPS...');
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude.toFixed(5);
            const lng = pos.coords.longitude.toFixed(5);
            const precision = Math.round(pos.coords.accuracy);
            logHardware(`GPS: ${lat}, ${lng} (±${precision}m)`, 'exito');
            if ('vibrate' in navigator) navigator.vibrate([40, 60, 40]);
        },
        (err) => {
            logHardware(`Error GPS: ${err.message}`, 'error');
        },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}

function dispararVibracion() {
    if ('vibrate' in navigator) {
        const ok = navigator.vibrate([80, 50, 120]);
        if (ok) {
            logHardware('Vibración háptica ejecutada [80ms, 50ms, 120ms]', 'exito');
        } else {
            logHardware('Vibración no permitida o no disponible en este dispositivo.', 'error');
        }
    } else {
        logHardware('Vibration API no disponible.', 'error');
    }
}

async function compartirNativo() {
    const vehiculoActual = document.getElementById('select-carros')?.value || 'Sin vehículo';
    const totalOps = artefactos.filter(a => a.estado === 'Operativo').length;
    
    const shareData = {
        title: 'Reporte de Flota y Artefactos',
        text: `🚗 Reporte de ${vehiculoActual}\n📅 Fecha: ${diaSeleccionado}\n✅ Artefactos Operativos: ${totalOps}/${artefactos.length}\nEnviado desde PWA de Control`,
        url: window.location.href
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
            logHardware('Hoja nativa de compartir abierta.', 'exito');
        } catch (err) {
            if (err.name !== 'AbortError') {
                logHardware(`Error al compartir: ${err.message}`, 'error');
            }
        }
    } else {
        try {
            await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}`);
            logHardware('Copiado al portapapeles (Web Share no disponible).', 'info');
        } catch {
            logHardware('No se pudo compartir.', 'error');
        }
    }
}

async function dispararNotificacion() {
    if (!('Notification' in window)) {
        logHardware('Notificaciones no soportadas en este navegador.', 'error');
        return;
    }

    try {
        let permiso = Notification.permission;
        if (permiso !== 'granted') {
            permiso = await Notification.requestPermission();
        }

        if (permiso === 'granted') {
            const vehiculoActual = document.getElementById('select-carros')?.value || 'Flota';
            
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                const reg = await navigator.serviceWorker.ready;
                reg.showNotification('Alerta de Flota PWA', {
                    body: `Recordatorio: Revisión programada para ${vehiculoActual} en fecha ${diaSeleccionado}`
                });
            } else {
                new Notification('Alerta de Flota PWA', {
                    body: `Revisión programada para ${vehiculoActual} (${diaSeleccionado})`
                });
            }
            logHardware('Notificación de sistema emitida.', 'exito');
            if ('vibrate' in navigator) navigator.vibrate(60);
        } else {
            logHardware('Permiso de notificaciones denegado.', 'error');
        }
    } catch (err) {
        logHardware(`Error de notificación: ${err.message}`, 'error');
    }
}

function actualizarEstadoRed() {
    const badge = document.getElementById('badge-network');
    const text = document.getElementById('network-text');
    if (!badge || !text) return;

    if (navigator.onLine) {
        badge.className = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-white border border-emerald-300/40';
        badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>Online</span>';
        logHardware('Modo Online activo', 'exito');
    } else {
        badge.className = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/30 text-amber-200 border border-amber-300/50';
        badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400"></span><span>Offline (Caché activa)</span>';
        logHardware('Sin conexión: PWA operando 100% en local', 'info');
    }
}

// -------------------------------------------------------------
// INICIALIZACIÓN
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    renderizarCalendario();
    renderizarArtefactos();
    actualizarEstadoRed();

    window.addEventListener('online', actualizarEstadoRed);
    window.addEventListener('offline', actualizarEstadoRed);

    // Botones de navegación del mes
    document.getElementById('btn-mes-ant')?.addEventListener('click', () => {
        mesMostrado--;
        if (mesMostrado < 0) {
            mesMostrado = 11;
            añoMostrado--;
        }
        renderizarCalendario();
        logHardware(`Mes: ${NOMBRES_MESES[mesMostrado]} ${añoMostrado}`, 'info');
    });

    document.getElementById('btn-mes-sig')?.addEventListener('click', () => {
        mesMostrado++;
        if (mesMostrado > 11) {
            mesMostrado = 0;
            añoMostrado++;
        }
        renderizarCalendario();
        logHardware(`Mes: ${NOMBRES_MESES[mesMostrado]} ${añoMostrado}`, 'info');
    });

    // Botón "Hoy"
    document.getElementById('fecha-hoy-sub')?.addEventListener('click', () => {
        const d = new Date();
        mesMostrado = d.getMonth();
        añoMostrado = d.getFullYear();
        diaSeleccionado = isoHoy;
        renderizarCalendario();
        logHardware('Calendario restablecido a la fecha actual', 'info');
    });

    // Filtro por vehículo
    const selectAuto = document.getElementById('select-carros');
    selectAuto?.addEventListener('change', (e) => {
        const target = e.target;
        autoFiltro = target.value || null;
        renderizarCalendario();
        logHardware(`Vehículo: ${target.value || 'Todos'}`, 'info');
    });

    // Botones del Kit de Hardware
    document.getElementById('btn-demo-camara')?.addEventListener('click', iniciarCamara);
    document.getElementById('btn-cerrar-camara')?.addEventListener('click', detenerCamara);
    document.getElementById('btn-capturar-foto')?.addEventListener('click', () => {
        if ('vibrate' in navigator) navigator.vibrate([50, 50]);
        logHardware('Foto capturada para el expediente.', 'exito');
        detenerCamara();
    });

    document.getElementById('btn-demo-geo')?.addEventListener('click', obtenerGeolocalizacion);
    document.getElementById('btn-demo-vibrate')?.addEventListener('click', dispararVibracion);
    document.getElementById('btn-demo-share')?.addEventListener('click', compartirNativo);
    document.getElementById('btn-demo-notify')?.addEventListener('click', dispararNotificacion);

    // Botón Registrar Artefacto
    document.getElementById('btn-nuevo-artefacto')?.addEventListener('click', () => {
        const nuevoNombre = prompt('Nombre del nuevo artefacto/sensor:', `Sensor #${artefactos.length + 1}`);
        if (nuevoNombre && nuevoNombre.trim()) {
            const nuevo = {
                id: Date.now(),
                nombre: nuevoNombre.trim(),
                estado: 'Operativo'
            };
            artefactos.push(nuevo);
            guardarArtefactos(artefactos);
            renderizarArtefactos();
            if ('vibrate' in navigator) navigator.vibrate(40);
            logHardware(`Artefacto guardado localmente: "${nuevo.nombre}"`, 'exito');
        }
    });

    // Evento de instalación PWA
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPromptInstalacion = e;
        const btnInstall = document.getElementById('btn-install-pwa');
        if (btnInstall) {
            btnInstall.classList.remove('hidden');
            btnInstall.classList.add('inline-flex');
            btnInstall.addEventListener('click', async () => {
                if (deferredPromptInstalacion) {
                    deferredPromptInstalacion.prompt();
                    const { outcome } = await deferredPromptInstalacion.userChoice;
                    logHardware(`Instalación: ${outcome === 'accepted' ? 'Aceptada' : 'Cancelada'}`, outcome === 'accepted' ? 'exito' : 'info');
                    deferredPromptInstalacion = null;
                    btnInstall.classList.add('hidden');
                }
            });
        }
    });
});
