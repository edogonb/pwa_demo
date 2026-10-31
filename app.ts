// Definimos interfaces para datos
interface Artefacto {
    id: number;
    nombre: string;
    estado: 'Operativo' | 'En Revisión' | 'Inactivo';
}

interface EventoAgenda {
    id: number;
    fecha: string; // formato YYYY-MM-DD
    auto: string;
    titulo: string;
    tipo: 'mantenimiento' | 'inspeccion' | 'entrega';
}

// Cargar artefactos de LocalStorage para persistencia offline real
const STORAGE_KEY_ARTEFACTOS = 'mipwa_artefactos';
const artefactosIniciales: Artefacto[] = [
    { id: 1, nombre: 'Sensor de Presión A1', estado: 'Operativo' },
    { id: 2, nombre: 'Módulo de Control B2', estado: 'En Revisión' },
    { id: 3, nombre: 'Gateway IoT Principal', estado: 'Operativo' }
];

function cargarArtefactos(): Artefacto[] {
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

function guardarArtefactos(items: Artefacto[]): void {
    localStorage.setItem(STORAGE_KEY_ARTEFACTOS, JSON.stringify(items));
}

let artefactos: Artefacto[] = cargarArtefactos();

// Helper para fecha en formato ISO local YYYY-MM-DD
function formatearFechaISO(d: Date): string {
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

let eventos: EventoAgenda[] = [
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
let autoFiltro: string | null = null;

const NOMBRES_MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Stream de cámara global para cerrarlo adecuadamente
let streamCamaraActivo: MediaStream | null = null;
let deferredPromptInstalacion: any = null;

// Helper para log en consola visual
function logHardware(mensaje: string, tipo: 'info' | 'exito' | 'error' = 'info'): void {
    const consoleText = document.getElementById('hardware-console-text');
    if (!consoleText) return;
    const prefijo = tipo === 'exito' ? '✅' : tipo === 'error' ? '⚠️' : '⚡';
    consoleText.textContent = `${prefijo} ${mensaje}`;
}

// -------------------------------------------------------------
// RENDERIZADO DE CALENDARIO
// -------------------------------------------------------------
function renderizarCalendario(): void {
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
        });

        gridDias.appendChild(boton);
    }

    renderizarEventosDelDia();
}

function renderizarEventosDelDia(): void {
    const lista = document.getElementById('lista-eventos-dia');
    const badge = document.getElementById('badge-total-eventos');
    const label = document.getElementById('label-dia-seleccionado');
    if (!lista || !badge || !label) return;

    const partes = diaSeleccionado.split('-');
    const fechaObj = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    const opciones: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
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
function renderizarArtefactos(): void {
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

    // Permitir alternar estados con un clic
    lista.querySelectorAll('.btn-toggle-estado').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLButtonElement;
            const id = Number(target.dataset.id);
            const index = artefactos.findIndex(a => a.id === id);
            if (index !== -1) {
                const actual = artefactos[index].estado;
                artefactos[index].estado = actual === 'Operativo' ? 'En Revisión' : actual === 'En Revisión' ? 'Inactivo' : 'Operativo';
                guardarArtefactos(artefactos);
                renderizarArtefactos();
                
                // Feedback háptico al cambiar estado
                if ('vibrate' in navigator) navigator.vibrate(30);
                logHardware(`Artefacto actualizado: ${artefactos[index].nombre} -> ${artefactos[index].estado}`, 'exito');
            }
        });
    });
}

// -------------------------------------------------------------
// FUNCIONES DEL KIT DEMOSTRATIVO DE HARDWARE PWA
// -------------------------------------------------------------

// 1. Cámara y Escáner en Vivo
async function iniciarCamara(): Promise<void> {
    const modal = document.getElementById('modal-camara');
    const video = document.getElementById('video-feed') as HTMLVideoElement | null;
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
            video: { facingMode: 'environment' } // Cámara trasera preferida
        });

        streamCamaraActivo = stream;
        video.srcObject = stream;
        video.play();
        if (status) status.textContent = 'Cámara activa (PWA WebRTC). Apunta a un sensor.';
        logHardware('Cámara conectada vía navigator.mediaDevices.getUserMedia', 'exito');
    } catch (err: any) {
        if (status) status.textContent = 'Acceso a cámara denegado o no disponible.';
        logHardware(`Error de cámara: ${err.message || 'Denegado'}`, 'error');
    }
}

function detenerCamara(): void {
    const modal = document.getElementById('modal-camara');
    const video = document.getElementById('video-feed') as HTMLVideoElement | null;
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

// 2. Geolocalización
function obtenerGeolocalizacion(): void {
    if (!('geolocation' in navigator)) {
        logHardware('Geolocalización no soportada en este navegador.', 'error');
        return;
    }

    logHardware('Consultando antena GPS del dispositivo...');
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude.toFixed(5);
            const lng = pos.coords.longitude.toFixed(5);
            const precision = Math.round(pos.coords.accuracy);
            logHardware(`GPS Ubicación fijada: ${lat}, ${lng} (±${precision}m)`, 'exito');
            if ('vibrate' in navigator) navigator.vibrate([40, 60, 40]);
        },
        (err) => {
            logHardware(`Error GPS: ${err.message}`, 'error');
        },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}

// 3. Vibración Háptica
function dispararVibracion(): void {
    if ('vibrate' in navigator) {
        // Patrón vibración: vibrar 80ms, pausa 50ms, vibrar 120ms
        const ok = navigator.vibrate([80, 50, 120]);
        if (ok) {
            logHardware('Vibración táctil ejecutada: [80ms, 50ms, 120ms]', 'exito');
        } else {
            logHardware('Vibración bloqueada por permisos del sistema o no soportada en este dispositivo.', 'error');
        }
    } else {
        logHardware('Vibration API no disponible en este dispositivo/navegador.', 'error');
    }
}

// 4. Compartir Nativo (Web Share API)
async function compartirNativo(): Promise<void> {
    const vehiculoActual = (document.getElementById('select-carros') as HTMLSelectElement)?.value || 'Sin vehículo';
    const totalOps = artefactos.filter(a => a.estado === 'Operativo').length;
    
    const shareData = {
        title: 'Reporte de Flota y Artefactos',
        text: `🚗 Reporte de ${vehiculoActual}\n📅 Fecha: ${diaSeleccionado}\n✅ Artefactos Operativos: ${totalOps}/${artefactos.length}\nEnviado desde PWA de Control`,
        url: window.location.href
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
            logHardware('Hoja nativa de compartir abierta con éxito.', 'exito');
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                logHardware(`Error al compartir: ${err.message}`, 'error');
            }
        }
    } else {
        // Fallback: copiar al portapapeles
        try {
            await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}`);
            logHardware('Web Share no disponible. Texto copiado al portapapeles.', 'info');
        } catch {
            logHardware('No se pudo abrir compartir ni copiar texto.', 'error');
        }
    }
}

// 5. Notificación Local del Sistema
async function dispararNotificacion(): Promise<void> {
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
            const vehiculoActual = (document.getElementById('select-carros') as HTMLSelectElement)?.value || 'Flota';
            
            // Si el service worker está listo, usar showNotification (más robusto)
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                const reg = await navigator.serviceWorker.ready;
                reg.showNotification('Alerta de Flota PWA', {
                    body: `Recordatorio: Revisión programada para ${vehiculoActual} en fecha ${diaSeleccionado}`,
                    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%232563eb"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
                    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%232563eb"><circle cx="12" cy="12" r="10"/></svg>'
                });
            } else {
                new Notification('Alerta de Flota PWA', {
                    body: `Revisión programada para ${vehiculoActual} (${diaSeleccionado})`
                });
            }
            logHardware('Notificación de sistema emitida con éxito.', 'exito');
            if ('vibrate' in navigator) navigator.vibrate(60);
        } else {
            logHardware('Permiso de notificaciones denegado por el usuario.', 'error');
        }
    } catch (err: any) {
        logHardware(`Error de notificación: ${err.message}`, 'error');
    }
}

// 6. Monitoreo de Red (Online / Offline)
function actualizarEstadoRed(): void {
    const badge = document.getElementById('badge-network');
    const text = document.getElementById('network-text');
    if (!badge || !text) return;

    if (navigator.onLine) {
        badge.className = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-white border border-emerald-300/40';
        badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>Online</span>';
        logHardware('Conexión reestablecida: modo Online', 'exito');
    } else {
        badge.className = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/30 text-amber-200 border border-amber-300/50';
        badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400"></span><span>Offline (Caché activa)</span>';
        logHardware('Modo sin conexión activado: la PWA sigue funcionando', 'info');
    }
}

// -------------------------------------------------------------
// INICIALIZACIÓN
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    renderizarCalendario();
    renderizarArtefactos();
    actualizarEstadoRed();

    // Eventos de conectividad
    window.addEventListener('online', actualizarEstadoRed);
    window.addEventListener('offline', actualizarEstadoRed);

    // Controles del Calendario
    document.getElementById('btn-mes-ant')?.addEventListener('click', () => {
        mesMostrado--;
        if (mesMostrado < 0) {
            mesMostrado = 11;
            añoMostrado--;
        }
        renderizarCalendario();
    });

    document.getElementById('btn-mes-sig')?.addEventListener('click', () => {
        mesMostrado++;
        if (mesMostrado > 11) {
            mesMostrado = 0;
            añoMostrado++;
        }
        renderizarCalendario();
    });

    document.getElementById('fecha-hoy-sub')?.addEventListener('click', () => {
        const d = new Date();
        mesMostrado = d.getMonth();
        añoMostrado = d.getFullYear();
        diaSeleccionado = isoHoy;
        renderizarCalendario();
    });

    // Filtro por vehículo
    const selectAuto = document.getElementById('select-carros') as HTMLSelectElement | null;
    selectAuto?.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        autoFiltro = target.value || null;
        renderizarCalendario();
        logHardware(`Vehículo seleccionado: ${target.value || 'Todos'}`, 'info');
    });

    // Botones del Kit de Hardware
    document.getElementById('btn-demo-camara')?.addEventListener('click', iniciarCamara);
    document.getElementById('btn-cerrar-camara')?.addEventListener('click', detenerCamara);
    document.getElementById('btn-capturar-foto')?.addEventListener('click', () => {
        if ('vibrate' in navigator) navigator.vibrate([50, 50]);
        logHardware('Foto capturada y lista para anexar al artefacto.', 'exito');
        detenerCamara();
    });

    document.getElementById('btn-demo-geo')?.addEventListener('click', obtenerGeolocalizacion);
    document.getElementById('btn-demo-vibrate')?.addEventListener('click', dispararVibracion);
    document.getElementById('btn-demo-share')?.addEventListener('click', compartirNativo);
    document.getElementById('btn-demo-notify')?.addEventListener('click', dispararNotificacion);

    // Botón agregar artefacto rápido (demuestra persistencia offline en LocalStorage)
    document.getElementById('btn-nuevo-artefacto')?.addEventListener('click', () => {
        const nuevoNombre = prompt('Nombre del nuevo artefacto/sensor:', `Sensor #${artefactos.length + 1}`);
        if (nuevoNombre && nuevoNombre.trim()) {
            const nuevo: Artefacto = {
                id: Date.now(),
                nombre: nuevoNombre.trim(),
                estado: 'Operativo'
            };
            artefactos.push(nuevo);
            guardarArtefactos(artefactos);
            renderizarArtefactos();
            if ('vibrate' in navigator) navigator.vibrate(40);
            logHardware(`Nuevo artefacto guardado offline: "${nuevo.nombre}"`, 'exito');
        }
    });

    // Captura del evento de instalación PWA
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