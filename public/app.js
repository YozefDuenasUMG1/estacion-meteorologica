// ============================================
// CONFIGURACION Y CONSTANTES
// ============================================
const API_BASE = 'http://localhost:3000/api';
const REFRESH_INTERVAL = 10000; // 10 segundos

// ============================================
// EXPRESIONES REGULARES PARA VALIDACION FRONTEND
// ============================================
const REGEX_VALIDACION = {
    // Formato de fecha: YYYY-MM-DD
    fecha: /^\d{4}-\d{2}-\d{2}$/,

    // Formato de rango: numero-numero (ej: 20-30, 15.5-25.8)
    rango: /^\d+(\.\d+)?-\d+(\.\d+)?$/,

    // Solo numeros positivos
    numeroPositivo: /^\d+$/
};

// ============================================
// VARIABLES GLOBALES
// ============================================
let chartHistorico = null;
let currentSensor = 'temperatura';
let intervalId = null;

// ============================================
// INICIALIZACION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    inicializarApp();
    configurarEventListeners();
    iniciarActualizacionAutomatica();
});

/**
 * Inicializa la aplicacion cargando datos iniciales
 */
async function inicializarApp() {
    await cargarDatosActuales();
    await cargarEstadisticas();
    await cargarGraficoHistorico(currentSensor);
}

/**
 * Configura todos los event listeners
 */
function configurarEventListeners() {
    // Botones de busqueda
    document.getElementById('btn-buscar').addEventListener('click', realizarBusqueda);
    document.getElementById('btn-limpiar').addEventListener('click', limpiarFiltros);

    // Tabs de graficos
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => cambiarSensor(e.target.dataset.sensor));
    });

    // Validacion en tiempo real del campo rango
    document.getElementById('rango-valores').addEventListener('input', validarRangoTiempoReal);
}

// ============================================
// ACTUALIZACION AUTOMATICA
// ============================================

/**
 * Inicia la actualizacion automatica cada 10 segundos
 */
function iniciarActualizacionAutomatica() {
    intervalId = setInterval(async () => {
        await cargarDatosActuales();
        await cargarEstadisticas();
        if (chartHistorico) {
            await cargarGraficoHistorico(currentSensor);
        }
    }, REFRESH_INTERVAL);
}

// ============================================
// CARGA DE DATOS ACTUALES
// ============================================

/**
 * Carga los valores actuales de todos los sensores
 */
async function cargarDatosActuales() {
    try {
        const response = await fetch(`${API_BASE}/lecturas/ultima`);
        const datos = await response.json();

        actualizarTarjetas(datos);
        actualizarAlertas(datos);
    } catch (error) {
        console.error('Error al cargar datos actuales:', error);
    }
}

/**
 * Actualiza las tarjetas con los valores actuales
 */
function actualizarTarjetas(datos) {
    // Temperatura
    if (datos.temperatura !== null) {
        document.getElementById('temp-actual').textContent = datos.temperatura.toFixed(1);
        document.getElementById('temp-fecha').textContent = formatearFecha(datos.temp_fecha);
    }

    // Humedad
    if (datos.humedad !== null) {
        document.getElementById('hum-actual').textContent = datos.humedad.toFixed(1);
        document.getElementById('hum-fecha').textContent = formatearFecha(datos.hum_fecha);
    }

    // Presion
    if (datos.presion !== null) {
        document.getElementById('pres-actual').textContent = datos.presion.toFixed(1);
        document.getElementById('pres-fecha').textContent = formatearFecha(datos.pres_fecha);
    }

    // Lluvia
    if (datos.lluvia !== null) {
        const lluviaEl = document.getElementById('lluvia-actual');
        lluviaEl.innerHTML = `<span>${datos.lluvia ? 'DETECTADA' : 'NO DETECTADA'}</span>`;
        lluviaEl.classList.toggle('detectada', datos.lluvia);
        lluviaEl.classList.toggle('no-detectada', !datos.lluvia);
        document.getElementById('lluvia-fecha').textContent = formatearFecha(datos.lluvia_fecha);
    }

    // Humedad Suelo
    if (datos.humedad_suelo !== null) {
        document.getElementById('suelo-actual').textContent = datos.humedad_suelo;
        document.getElementById('suelo-fecha').textContent = formatearFecha(datos.suelo_fecha);
    }

    // Gas
    if (datos.gas !== null) {
        document.getElementById('gas-actual').textContent = datos.gas;
        document.getElementById('gas-fecha').textContent = formatearFecha(datos.gas_fecha);
    }
}

/**
 * Actualiza el panel de alertas
 */
function actualizarAlertas(datos) {
    const container = document.getElementById('alertas-container');
    container.innerHTML = '';

    // Alerta de temperatura
    if (datos.temperatura && datos.temperatura > 35) {
        container.innerHTML += `
            <div class="alerta temperatura">
                <span class="icon">🌡️</span>
                <span>ALERTA: Temperatura alta detectada (${datos.temperatura.toFixed(1)}°C)</span>
            </div>
        `;
    }

    // Alerta de gas
    if (datos.gas && datos.gas > 600) {
        container.innerHTML += `
            <div class="alerta gas">
                <span class="icon">💨</span>
                <span>ALERTA: Nivel de gas elevado (${datos.gas} PPM)</span>
            </div>
        `;
    }

    // Alerta de lluvia
    if (datos.lluvia) {
        container.innerHTML += `
            <div class="alerta lluvia">
                <span class="icon">🌧️</span>
                <span>ALERTA: Lluvia detectada</span>
            </div>
        `;
    }
}

// ============================================
// ESTADISTICAS
// ============================================

/**
 * Carga las estadisticas de todos los sensores
 */
async function cargarEstadisticas() {
    const sensores = ['temperatura', 'humedad', 'presion', 'humedad-suelo', 'gas'];

    for (const sensor of sensores) {
        try {
            const response = await fetch(`${API_BASE}/estadisticas/${sensor}`);
            const data = await response.json();
            actualizarEstadisticasTarjeta(sensor, data.estadisticas);
        } catch (error) {
            console.error(`Error al cargar estadisticas de ${sensor}:`, error);
        }
    }
}

/**
 * Actualiza las estadisticas en las tarjetas
 */
function actualizarEstadisticasTarjeta(sensor, stats) {
    const prefix = sensor === 'humedad-suelo' ? 'suelo' : sensor.substring(0, 4);

    const minEl = document.getElementById(`${prefix}-min`);
    const maxEl = document.getElementById(`${prefix}-max`);
    const promEl = document.getElementById(`${prefix}-prom`);

    if (minEl && stats.minimo !== null) {
        minEl.textContent = Number(stats.minimo).toFixed(1);
    }
    if (maxEl && stats.maximo !== null) {
        maxEl.textContent = Number(stats.maximo).toFixed(1);
    }
    if (promEl && stats.promedio !== null) {
        promEl.textContent = Number(stats.promedio).toFixed(1);
    }
}

// ============================================
// GRAFICOS
// ============================================

/**
 * Cambia el sensor activo del grafico
 */
function cambiarSensor(sensor) {
    currentSensor = sensor;

    // Actualizar tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sensor === sensor);
    });

    cargarGraficoHistorico(sensor);
}

/**
 * Carga el grafico historico de un sensor
 */
async function cargarGraficoHistorico(sensor) {
    try {
        const response = await fetch(`${API_BASE}/${sensor}?limit=50`);
        const datos = await response.json();

        renderizarGrafico(sensor, datos);
    } catch (error) {
        console.error(`Error al cargar grafico de ${sensor}:`, error);
    }
}

/**
 * Renderiza el grafico con Chart.js
 */
function renderizarGrafico(sensor, datos) {
    const ctx = document.getElementById('chartHistorico').getContext('2d');

    // Destruir grafico anterior si existe
    if (chartHistorico) {
        chartHistorico.destroy();
    }

    // Preparar datos
    const labels = datos.map(d => formatearFechaCorta(d.fecha_registro)).reverse();
    const valores = datos.map(d => {
        if (sensor === 'humedad-suelo' || sensor === 'gas') {
            return d.valor_raw;
        } else if (sensor === 'lluvia') {
            return d.detectada ? 1 : 0;
        } else {
            return d.valor;
        }
    }).reverse();

    // Configuracion del grafico
    const config = {
        type: sensor === 'lluvia' ? 'bar' : 'line',
        data: {
            labels: labels,
            datasets: [{
                label: obtenerNombreSensor(sensor),
                data: valores,
                borderColor: obtenerColorSensor(sensor),
                backgroundColor: obtenerColorSensorTransparente(sensor),
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: sensor === 'lluvia',
                    title: {
                        display: true,
                        text: obtenerUnidadSensor(sensor)
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Fecha/Hora'
                    }
                }
            }
        }
    };

    chartHistorico = new Chart(ctx, config);
}

// ============================================
// BUSQUEDA Y FILTROS
// ============================================

/**
 * Valida el campo de rango en tiempo real usando expresiones regulares
 */
function validarRangoTiempoReal(e) {
    const input = e.target;
    const valor = input.value.trim();

    if (valor === '') {
        input.style.borderColor = '#dfe6e9';
        return;
    }

    // Validar formato con expresion regular
    if (REGEX_VALIDACION.rango.test(valor)) {
        input.style.borderColor = '#27ae60'; // Verde
    } else {
        input.style.borderColor = '#e74c3c'; // Rojo
    }
}

/**
 * Realiza una busqueda con los filtros especificados
 */
async function realizarBusqueda() {
    const sensor = document.getElementById('sensor-select').value;
    const fechaInicio = document.getElementById('fecha-inicio').value;
    const fechaFin = document.getElementById('fecha-fin').value;
    const rango = document.getElementById('rango-valores').value.trim();
    const limit = document.getElementById('limit').value;

    // Limpiar errores previos
    const errorDiv = document.getElementById('errores-busqueda');
    errorDiv.innerHTML = '';
    errorDiv.classList.remove('visible');

    // Validar con expresiones regulares
    const errores = validarParametrosBusqueda({fechaInicio, fechaFin, rango});

    if (errores.length > 0) {
        errorDiv.innerHTML = errores.map(e => `<div>• ${e}</div>`).join('');
        errorDiv.classList.add('visible');
        return;
    }

    // Construir query string
    const params = new URLSearchParams();
    if (fechaInicio) params.append('fecha_inicio', fechaInicio);
    if (fechaFin) params.append('fecha_fin', fechaFin);
    if (rango) params.append('rango', rango);
    if (limit) params.append('limit', limit);

    try {
        const url = `${API_BASE}/buscar/${sensor}?${params.toString()}`;
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            mostrarResultados(data);
        } else {
            errorDiv.innerHTML = `<div>• ${data.error}</div>`;
            if (data.detalles) {
                errorDiv.innerHTML += data.detalles.map(d => `<div>• ${d}</div>`).join('');
            }
            errorDiv.classList.add('visible');
        }
    } catch (error) {
        errorDiv.innerHTML = `<div>• Error al realizar la busqueda: ${error.message}</div>`;
        errorDiv.classList.add('visible');
    }
}

/**
 * Valida los parametros de busqueda usando expresiones regulares
 */
function validarParametrosBusqueda({fechaInicio, fechaFin, rango}) {
    const errores = [];

    // Validar fecha inicio
    if (fechaInicio && !REGEX_VALIDACION.fecha.test(fechaInicio)) {
        errores.push('Fecha inicio invalida (formato: YYYY-MM-DD)');
    }

    // Validar fecha fin
    if (fechaFin && !REGEX_VALIDACION.fecha.test(fechaFin)) {
        errores.push('Fecha fin invalida (formato: YYYY-MM-DD)');
    }

    // Validar rango
    if (rango && !REGEX_VALIDACION.rango.test(rango)) {
        errores.push('Rango invalido (formato: numero-numero, ej: 20-30)');
    }

    // Validar logica de fechas
    if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
        errores.push('La fecha inicio no puede ser posterior a la fecha fin');
    }

    // Validar logica de rango
    if (rango && REGEX_VALIDACION.rango.test(rango)) {
        const [min, max] = rango.split('-').map(parseFloat);
        if (min >= max) {
            errores.push('En el rango, el valor minimo debe ser menor que el maximo');
        }
    }

    return errores;
}

/**
 * Muestra los resultados de la busqueda en la tabla
 */
function mostrarResultados(data) {
    const infoDiv = document.getElementById('info-resultados');
    const tbody = document.getElementById('tabla-body');
    const thead = document.getElementById('tabla-header');

    // Actualizar info
    infoDiv.textContent = `Se encontraron ${data.total} resultados para ${data.sensor}`;

    // Actualizar encabezados de tabla segun el sensor
    thead.innerHTML = '';
    if (data.sensor === 'lluvia') {
        thead.innerHTML = '<th>ID</th><th>Detectada</th><th>Alerta</th><th>Fecha</th>';
    } else if (data.sensor === 'humedad-suelo' || data.sensor === 'gas') {
        thead.innerHTML = '<th>ID</th><th>Valor Raw</th><th>Valor %</th><th>Fecha</th>';
    } else {
        thead.innerHTML = '<th>ID</th><th>Valor</th><th>Alerta</th><th>Fecha</th>';
    }

    // Actualizar body
    tbody.innerHTML = '';

    if (data.datos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="no-data">No se encontraron resultados</td></tr>';
        return;
    }

    data.datos.forEach(item => {
        const row = document.createElement('tr');

        if (data.sensor === 'lluvia') {
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.detectada ? 'SI' : 'NO'}</td>
                <td>${item.alerta ? 'SI' : 'NO'}</td>
                <td>${formatearFecha(item.fecha_registro)}</td>
            `;
        } else if (data.sensor === 'humedad-suelo') {
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.valor_raw}</td>
                <td>${item.valor_porcentaje}%</td>
                <td>${formatearFecha(item.fecha_registro)}</td>
            `;
        } else if (data.sensor === 'gas') {
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.valor_raw}</td>
                <td>${item.alerta ? 'SI' : 'NO'}</td>
                <td>${formatearFecha(item.fecha_registro)}</td>
            `;
        } else {
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.valor.toFixed(2)}</td>
                <td>${item.alerta ? 'SI' : 'NO'}</td>
                <td>${formatearFecha(item.fecha_registro)}</td>
            `;
        }

        tbody.appendChild(row);
    });
}

/**
 * Limpia todos los filtros de busqueda
 */
function limpiarFiltros() {
    document.getElementById('sensor-select').value = 'temperatura';
    document.getElementById('fecha-inicio').value = '';
    document.getElementById('fecha-fin').value = '';
    document.getElementById('rango-valores').value = '';
    document.getElementById('rango-valores').style.borderColor = '#dfe6e9';
    document.getElementById('limit').value = '50';

    const errorDiv = document.getElementById('errores-busqueda');
    errorDiv.innerHTML = '';
    errorDiv.classList.remove('visible');

    const tbody = document.getElementById('tabla-body');
    tbody.innerHTML = '<tr><td colspan="3" class="no-data">Realiza una busqueda para ver resultados</td></tr>';

    document.getElementById('info-resultados').textContent = '';
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Formatea una fecha para mostrar
 */
function formatearFecha(fecha) {
    if (!fecha) return '--';
    const d = new Date(fecha);
    return d.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Formatea una fecha de forma corta para graficos
 */
function formatearFechaCorta(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleString('es-ES', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Obtiene el nombre descriptivo de un sensor
 */
function obtenerNombreSensor(sensor) {
    const nombres = {
        'temperatura': 'Temperatura (°C)',
        'humedad': 'Humedad (%)',
        'presion': 'Presion (hPa)',
        'lluvia': 'Lluvia',
        'humedad-suelo': 'Humedad Suelo (RAW)',
        'gas': 'Calidad Aire (PPM)'
    };
    return nombres[sensor] || sensor;
}

/**
 * Obtiene el color para un sensor
 */
function obtenerColorSensor(sensor) {
    const colores = {
        'temperatura': '#e74c3c',
        'humedad': '#3498db',
        'presion': '#9b59b6',
        'lluvia': '#16a085',
        'humedad-suelo': '#27ae60',
        'gas': '#f39c12'
    };
    return colores[sensor] || '#2c3e50';
}

/**
 * Obtiene el color transparente para un sensor
 */
function obtenerColorSensorTransparente(sensor) {
    const colores = {
        'temperatura': 'rgba(231, 76, 60, 0.2)',
        'humedad': 'rgba(52, 152, 219, 0.2)',
        'presion': 'rgba(155, 89, 182, 0.2)',
        'lluvia': 'rgba(22, 160, 133, 0.2)',
        'humedad-suelo': 'rgba(39, 174, 96, 0.2)',
        'gas': 'rgba(243, 156, 18, 0.2)'
    };
    return colores[sensor] || 'rgba(44, 62, 80, 0.2)';
}

/**
 * Obtiene la unidad de medida de un sensor
 */
function obtenerUnidadSensor(sensor) {
    const unidades = {
        'temperatura': 'Temperatura (°C)',
        'humedad': 'Humedad (%)',
        'presion': 'Presion (hPa)',
        'lluvia': 'Lluvia (0=No, 1=Si)',
        'humedad-suelo': 'Valor RAW',
        'gas': 'PPM'
    };
    return unidades[sensor] || '';
}
