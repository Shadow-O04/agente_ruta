/// PROYECTO: AGENTE DE RUTAS TURÍSTICAS DE PAMPAS - JAVASCRIPT

let googleMap = null;
let markers = [];
let polylines = [];
let directionsRenderers = [];
let currentResultado = null;

// Elementos del DOM
const btnCalcular = document.getElementById('btnCalcular');
const btnEsquema = document.getElementById('btnEsquema');
const btnMapa = document.getElementById('btnMapa');
const canvasContainer = document.getElementById('canvasContainer');
const googleMapContainer = document.getElementById('googleMapContainer');
const loading = document.getElementById('loading');
const resultados = document.getElementById('resultados');
const errorMsg = document.getElementById('errorMsg');
const canvas = document.getElementById('mapaCanvas');
const ctx = canvas.getContext('2d');

// Coordenadas para el esquema visual
const coordenadas = {
    'Plaza de Armas de Pampas': { x: 400, y: 300 },
    'Iglesia Catedral San Pedro de Pampas': { x: 350, y: 250 },
    'Parque Ecológico Infantil de Chalampampa': { x: 300, y: 350 },
    'Gruta de la Virgen Purísima': { x: 250, y: 280 },
    'Óvalo de Cultura de Rumichaca': { x: 500, y: 280 },
    'Alameda Grau': { x: 550, y: 320 },
    'Casa Hacienda San Juan de Pillo': { x: 600, y: 200 },
    'Bosque de Pinos': { x: 650, y: 100 },
    'Manantial de Agua Salada de La Colpa': { x: 700, y: 180 },
    'Piscigranja de La Colpa': { x: 750, y: 220 },
    'Laguna de Champaccocha (Acraquia)': { x: 500, y: 50 }
};

// Event Listeners
btnCalcular.addEventListener('click', calcularRuta);
btnEsquema.addEventListener('click', () => cambiarVista('esquema'));
btnMapa.addEventListener('click', () => cambiarVista('mapa'));

// Inicializar Google Maps
function initGoogleMap() {
    if (!googleMap) {
        googleMap = new google.maps.Map(document.getElementById('map'), {
            center: { lat: -12.3958, lng: -74.8708 },
            zoom: 13,
            mapTypeId: 'terrain'
        });
    }
}

// Cambiar entre vistas
function cambiarVista(vista) {
    if (vista === 'esquema') {
        btnEsquema.classList.add('active');
        btnMapa.classList.remove('active');
        canvasContainer.style.display = 'block';
        googleMapContainer.style.display = 'none';
        document.getElementById('mapTitle').textContent = 'Esquema de Rutas Turísticas de Pampas';
        dibujarEsquema();
    } else {
        btnMapa.classList.add('active');
        btnEsquema.classList.remove('active');
        canvasContainer.style.display = 'none';
        googleMapContainer.style.display = 'block';
        document.getElementById('mapTitle').textContent = 'Mapa Interactivo de Google Maps - Pampas, Tayacaja, Huancavelica';
        initGoogleMap();
        if (currentResultado) {
            // Pequeño delay para asegurar que el mapa esté listo
            setTimeout(() => {
                dibujarGoogleMap(currentResultado);
            }, 100);
        }
    }
}

// Calcular ruta
async function calcularRuta() {
    const inicio = document.getElementById('inicio').value;
    const destino = document.getElementById('destino').value;

    if (!inicio || !destino) {
        alert('Por favor selecciona un lugar de inicio y destino');
        return;
    }

    // Mostrar loading
    loading.style.display = 'flex';
    resultados.style.display = 'none';
    errorMsg.style.display = 'none';

    try {
        const response = await fetch('/calcular_ruta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inicio, destino })
        });

        const data = await response.json();
        loading.style.display = 'none';

        if (data.success) {
            currentResultado = data;
            mostrarResultados(data, inicio, destino);
            
            // Dibujar según vista activa
            if (btnEsquema.classList.contains('active')) {
                dibujarEsquema();
            } else {
                dibujarGoogleMap(data);
            }
        } else {
            errorMsg.style.display = 'block';
        }
    } catch (error) {
        loading.style.display = 'none';
        console.error('Error:', error);
        alert('Error al calcular la ruta. Por favor intenta nuevamente.');
    }
}

// Mostrar resultados
function mostrarResultados(data, inicio, destino) {
    resultados.style.display = 'block';

    // Actualizar métricas
    document.getElementById('metricTiempo').textContent = `${data.costo} min`;
    document.getElementById('metricNodos').textContent = data.nodos;
    document.getElementById('metricCalculo').textContent = `${data.tiempo}s`;
    document.getElementById('rutaParadas').textContent = data.ruta.length;

    // Mostrar ruta detallada
    const rutaDetalle = document.getElementById('rutaDetalle');
    rutaDetalle.innerHTML = '';

    data.ruta.forEach((item, index) => {
        const routeItem = document.createElement('div');
        routeItem.className = 'route-item';
        routeItem.style.animationDelay = `${index * 0.1}s`;

        let timeText = '';
        if (item.tiempo_siguiente) {
            timeText = `<div class="route-time">↓ ${item.tiempo_siguiente} minutos</div>`;
        }

        routeItem.innerHTML = `
            <div class="route-number">${item.orden}</div>
            <div class="route-content">
                <div class="route-place">${item.lugar}</div>
                ${timeText}
            </div>
        `;

        rutaDetalle.appendChild(routeItem);
    });
}

// Dibujar esquema en canvas
function dibujarEsquema() {
    const width = canvas.width;
    const height = canvas.height;

    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);

    // Fondo con gradiente
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f0fdf4');
    gradient.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    if (!currentResultado) return;

    const inicio = document.getElementById('inicio').value;
    const destino = document.getElementById('destino').value;

    // Dibujar todas las conexiones
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    currentResultado.conexiones.forEach(conn => {
        const orig = coordenadas[conn.origen];
        const dest = coordenadas[conn.destino];
        if (orig && dest) {
            ctx.beginPath();
            ctx.moveTo(orig.x, orig.y);
            ctx.lineTo(dest.x, dest.y);
            ctx.stroke();
        }
    });

    // Dibujar ruta óptima
    if (currentResultado.ruta.length > 1) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < currentResultado.ruta.length - 1; i++) {
            const orig = coordenadas[currentResultado.ruta[i].lugar];
            const dest = coordenadas[currentResultado.ruta[i + 1].lugar];

            ctx.beginPath();
            ctx.moveTo(orig.x, orig.y);
            ctx.lineTo(dest.x, dest.y);
            ctx.stroke();

            // Dibujar flecha
            const angle = Math.atan2(dest.y - orig.y, dest.x - orig.x);
            const midX = (orig.x + dest.x) / 2;
            const midY = (orig.y + dest.y) / 2;

            ctx.save();
            ctx.translate(midX, midY);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-10, -5);
            ctx.lineTo(-10, 5);
            ctx.closePath();
            ctx.fillStyle = '#10b981';
            ctx.fill();
            ctx.restore();
        }
    }

    // Dibujar nodos
    currentResultado.todos_lugares.forEach(lugar => {
        const coord = coordenadas[lugar.nombre];
        if (!coord) return;

        const isInicio = lugar.nombre === inicio;
        const isDestino = lugar.nombre === destino;
        const isEnRuta = currentResultado.ruta.some(r => r.lugar === lugar.nombre);

        // Sombra
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Círculo
        ctx.beginPath();
        ctx.arc(coord.x, coord.y, isInicio || isDestino ? 18 : 12, 0, 2 * Math.PI);

        if (isInicio) {
            ctx.fillStyle = '#3b82f6';
        } else if (isDestino) {
            ctx.fillStyle = '#ef4444';
        } else if (isEnRuta) {
            ctx.fillStyle = '#10b981';
        } else {
            ctx.fillStyle = '#6b7280';
        }

        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.shadowColor = 'transparent';

        // Etiqueta
        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = '#1f2937';
        ctx.textAlign = 'center';

        const nombre = lugar.nombre.length > 25 ? lugar.nombre.substring(0, 25) + '...' : lugar.nombre;
        const lines = nombre.split(' ');

        if (lines.length > 3) {
            ctx.fillText(lines.slice(0, 2).join(' '), coord.x, coord.y - 25);
            ctx.fillText(lines.slice(2).join(' '), coord.x, coord.y - 13);
        } else {
            lines.forEach((line, i) => {
                ctx.fillText(line, coord.x, coord.y - 25 + (i * 12));
            });
        }

        // Ícono
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        if (isInicio) {
            ctx.fillText('🚩', coord.x, coord.y);
        } else if (isDestino) {
            ctx.fillText('🎯', coord.x, coord.y);
        } else if (isEnRuta) {
            const item = currentResultado.ruta.find(r => r.lugar === lugar.nombre);
            ctx.fillText(item.orden, coord.x, coord.y);
        }
    });
}

// Dibujar en Google Maps
function dibujarGoogleMap(data) {
    // Limpiar marcadores, líneas y directions anteriores
    markers.forEach(marker => marker.setMap(null));
    polylines.forEach(polyline => polyline.setMap(null));
    directionsRenderers.forEach(renderer => renderer.setMap(null));
    markers = [];
    polylines = [];
    directionsRenderers = [];

    const inicio = document.getElementById('inicio').value;
    const destino = document.getElementById('destino').value;

    // Dibujar conexiones base en gris (líneas rectas)
    data.conexiones.forEach(conn => {
        const line = new google.maps.Polyline({
            path: [
                { lat: conn.origen_lat, lng: conn.origen_lng },
                { lat: conn.destino_lat, lng: conn.destino_lng }
            ],
            geodesic: true,
            strokeColor: '#d1d5db',
            strokeOpacity: 0.4,
            strokeWeight: 2,
            map: googleMap
        });
        polylines.push(line);
    });

    // Dibujar ruta óptima siguiendo las calles con Directions Service
    if (data.ruta.length > 1) {
        dibujarRutaPorCalles(data.ruta);
    }

    // Agregar marcadores
    data.todos_lugares.forEach(lugar => {
        const isInicio = lugar.nombre === inicio;
        const isDestino = lugar.nombre === destino;
        const rutaItem = data.ruta.find(r => r.lugar === lugar.nombre);
        const isEnRuta = !!rutaItem;

        let icon, label;

        if (isInicio) {
            icon = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
            label = '🚩';
        } else if (isDestino) {
            icon = 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
            label = '🎯';
        } else if (isEnRuta) {
            icon = 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
            label = String(rutaItem.orden);
        } else {
            icon = 'http://maps.google.com/mapfiles/ms/icons/grey-dot.png';
            label = '';
        }

        const marker = new google.maps.Marker({
            position: { lat: lugar.lat, lng: lugar.lng },
            map: googleMap,
            title: lugar.nombre,
            icon: icon,
            label: {
                text: label,
                color: 'white',
                fontWeight: 'bold'
            }
        });

        const infowindow = new google.maps.InfoWindow({
            content: `<div style="font-weight: bold; color: #047857;">${lugar.nombre}</div>`
        });

        marker.addListener('click', () => {
            infowindow.open(googleMap, marker);
        });

        markers.push(marker);
    });
}

// Dibujar ruta siguiendo las calles con Google Directions Service
async function dibujarRutaPorCalles(ruta) {
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
        map: googleMap,
        suppressMarkers: true, // No mostrar marcadores por defecto
        polylineOptions: {
            strokeColor: '#10b981',
            strokeWeight: 6,
            strokeOpacity: 0.8
        }
    });

    directionsRenderers.push(directionsRenderer);

    // Mostrar mensaje de carga
    loading.style.display = 'flex';
    document.getElementById('loadingText').textContent = 'Trazando ruta por las calles...';

    // Si hay más de 2 puntos, necesitamos waypoints
    if (ruta.length === 2) {
        // Ruta simple de 2 puntos
        const origen = { lat: ruta[0].lat, lng: ruta[0].lng };
        const destinoFinal = { lat: ruta[1].lat, lng: ruta[1].lng };

        try {
            const resultado = await new Promise((resolve, reject) => {
                directionsService.route({
                    origin: origen,
                    destination: destinoFinal,
                    travelMode: google.maps.TravelMode.DRIVING
                }, (result, status) => {
                    if (status === 'OK') {
                        resolve(result);
                    } else {
                        reject(status);
                    }
                });
            });
            
            directionsRenderer.setDirections(resultado);
            loading.style.display = 'none';
        } catch (error) {
            console.log('No se pudo calcular ruta por calles:', error);
            loading.style.display = 'none';
            dibujarRutaDirecta(ruta);
        }
    } else if (ruta.length > 2) {
        // Ruta con múltiples paradas (waypoints)
        const origen = { lat: ruta[0].lat, lng: ruta[0].lng };
        const destinoFinal = { lat: ruta[ruta.length - 1].lat, lng: ruta[ruta.length - 1].lng };
        
        // Puntos intermedios (máximo 25 waypoints en Google Maps API)
        const waypoints = ruta.slice(1, -1).map(item => ({
            location: { lat: item.lat, lng: item.lng },
            stopover: true
        }));

        try {
            const resultado = await new Promise((resolve, reject) => {
                directionsService.route({
                    origin: origen,
                    destination: destinoFinal,
                    waypoints: waypoints,
                    travelMode: google.maps.TravelMode.DRIVING,
                    optimizeWaypoints: false // Mantener el orden de nuestra ruta A*
                }, (result, status) => {
                    if (status === 'OK') {
                        resolve(result);
                    } else {
                        reject(status);
                    }
                });
            });
            
            directionsRenderer.setDirections(resultado);
            loading.style.display = 'none';
        } catch (error) {
            console.log('No se pudo calcular ruta por calles con waypoints:', error);
            loading.style.display = 'none';
            dibujarRutaDirecta(ruta);
        }
    }
}

// Dibujar ruta directa como fallback
function dibujarRutaDirecta(ruta) {
    const rutaPath = ruta.map(item => ({
        lat: item.lat,
        lng: item.lng
    }));

    const rutaLine = new google.maps.Polyline({
        path: rutaPath,
        geodesic: true,
        strokeColor: '#10b981',
        strokeOpacity: 1.0,
        strokeWeight: 5,
        map: googleMap
    });
    polylines.push(rutaLine);

    // Ajustar vista
    const bounds = new google.maps.LatLngBounds();
    rutaPath.forEach(coord => bounds.extend(coord));
    googleMap.fitBounds(bounds);
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('Agente de Rutas Turísticas de Pampas - Inicializado');
});