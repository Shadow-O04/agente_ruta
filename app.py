import heapq
import time
import random
from math import radians, sin, cos, sqrt, atan2, exp
import math
from flask import Flask, render_template, request, jsonify

# --- 1. FUNCIONES DE CÁLCULO (Distancia y Tiempo) ---

def haversine(coord1, coord2):
    R = 6371.0
    lat1, lon1 = radians(coord1[0]), radians(coord1[1]) 
    lat2, lon2 = radians(coord2[0]), radians(coord2[1])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

def km_a_minutos_caminando(km, velocidad_kmh=5.0):
    return (km / velocidad_kmh) * 60.0

# --- 2. TUS 21 COORDENADAS ---
coordenadas_lugares = {
    'Plaza de Armas de Pampas': [-12.398309422102479, -74.86844007673412],
    'Iglesia Catedral San Pedro de Pampas': [-12.398309727030066, -74.86856775913408],
    'Parque Ecológico Infantil de Chalampampa': [-12.401048306147485, -74.8741951946349],
    'Gruta de la Virgen Purísima': [-12.3995, -74.8675],
    'Óvalo de Daniel Hernandez': [-12.394331867598137, -74.86172658283682],
    'Alameda Grau': [-12.399439714624672, -74.86960892719367],
    'Casa Hacienda San Juan de Pillo': [-12.381877260835456, -74.94583396962732],
    'Mirador de Daniel Hernandez': [-12.395303007251748, -74.86049582625742],
    'Manantial de Agua Salada de La Colpa': [-12.407081874506718, -74.9205150276463],
    'Piscigranja de La Colpa': [-12.3890, -74.8570],
    'Plaza de Acraquia': [-12.406661765437489, -74.90133839791775],
    'Mirador de Pampas': [-12.403050878087642, -74.86844215033284],
    'Plaza de Daniel Hernandez':[-12.389501862278301, -74.85893049831185],
    'UNH-Sistemas':[-12.389094325337956, -74.85913533199317],
    'UNH-Electronica': [-12.395148414788073, -74.87262899876333],
    'Óvalo de Pampas': [-12.392792152489418, -74.86980684579709],
    'Ciudad Universitaria-UNAT': [-12.400426157589523, -74.89005927736468],
    'Ostuna': [-12.424149498302803, -74.87195403030077],
    'Cementerio de Pampas': [-12.402989743856034, -74.87609719391966],
    'Cuartel de Pampas': [-12.397762822422166, -74.86190293573205],
    'CIAM-Pampas': [-12.396174363986217, -74.869379794405],
}

# --- 3. MODIFICADO: GENERACIÓN DEL `mapa_turistico` (Red de Caminos) ---
# Ahora solo conectamos cada lugar con sus 4 vecinos más cercanos.

print("Generando red de caminos realista...")
lugares = list(coordenadas_lugares.keys())
mapa_turistico = {lugar: {} for lugar in lugares}
N_VECINOS_MAS_CERCANOS = 4 # Puedes cambiar este número (4 o 5 es bueno)

for lugar_origen in lugares:
    # 1. Calcular la distancia a todos los demás lugares
    distancias_vecinos = []
    for lugar_destino in lugares:
        if lugar_origen == lugar_destino:
            continue
        
        coord_a = coordenadas_lugares[lugar_origen]
        coord_b = coordenadas_lugares[lugar_destino]
        
        dist_km = haversine(coord_a, coord_b)
        dist_min = km_a_minutos_caminando(dist_km)
        distancias_vecinos.append((dist_min, lugar_destino))
    
    # 2. Ordenar por distancia (más cercano primero)
    distancias_vecinos.sort()
    
    # 3. Añadir solo los N vecinos más cercanos al mapa
    for i in range(N_VECINOS_MAS_CERCANOS):
        if i < len(distancias_vecinos):
            costo = distancias_vecinos[i][0]
            vecino = distancias_vecinos[i][1]
            
            # Añadir la conexión en ambos sentidos
            mapa_turistico[lugar_origen][vecino] = costo
            mapa_turistico[vecino][lugar_origen] = costo

print(f"Red de caminos generada conectando los {N_VECINOS_MAS_CERCANOS} vecinos más cercanos.")

# --- 4. Generador de Heurística Dinámica (Sin cambios) ---
def generar_heuristica_dinamica(destino):
    heuristica = {}
    if destino not in coordenadas_lugares:
        return None
    coord_destino = coordenadas_lugares[destino]
    for lugar, coord in coordenadas_lugares.items():
        dist_km = haversine(coord, coord_destino)
        heuristica[lugar] = km_a_minutos_caminando(dist_km)
    return heuristica

# --- 5. CÓDIGO DEL AGENTE (Mejorado: clima correlacionado y manejo de lluvia) ---
def generar_clima_aleatorio(mapa, prob_soleado=0.8, correlation_radius_km=0.5, seed=None):
    """
    Genera clima con correlación espacial.
    - prob_soleado: probabilidad global de que un punto esté soleado.
    - correlation_radius_km: radio (km) de influencia para zonas lluviosas.
    La idea: escogemos algunos centros lluviosos y cada lugar tiene probabilidad de
    lluvia dependiente de la distancia al centro más cercano (función Gaussiana).
    """
    if seed is not None:
        random.seed(seed)

    lugares = list(mapa.keys())
    n = len(lugares)
    clima_lugares = {}

    # Probabilidad global de lluvia
    prob_lluvia_global = 1.0 - prob_soleado

    # Número aproximado de núcleos (centros) de lluvia según prob_lluvia_global
    # A mayor prob_lluvia_global, más núcleos
    seeds_count = max(1, round(n * prob_lluvia_global)) if prob_lluvia_global > 0 else 0
    lluvia_centros = []
    if seeds_count > 0:
        lluvia_centros = random.sample(lugares, min(seeds_count, n))

    # Para cada lugar, calcular probabilidad de lluvia según distancia al centro más cercano
    for lugar in lugares:
        if seeds_count == 0:
            # Todo soleado con probabilidad establecida
            clima_lugares[lugar] = 'soleado' if random.random() < prob_soleado else 'lluvioso'
            continue

        coord = coordenadas_lugares[lugar]
        # distancia mínima al conjunto de centros lluviosos
        min_dist = min(haversine(coord, coordenadas_lugares[c]) for c in lluvia_centros)

        # Probabilidad de lluvia: función decreciente con la distancia (Gaussiana)
        # cuando min_dist=0 -> prob cercana a 1; cuando min_dist >> correlation_radius_km -> cercana a 0
        sigma = max(correlation_radius_km, 0.01)
        prob_lluvia_local = prob_lluvia_global * exp(- (min_dist / sigma) ** 2)

        # Añadir un poco de ruido para realismo
        prob_lluvia_local = min(1.0, max(0.0, prob_lluvia_local + random.uniform(-0.05, 0.05)))

        clima_lugares[lugar] = 'lluvioso' if random.random() < prob_lluvia_local else 'soleado'

    return clima_lugares


def a_estrella(inicio, destino, clima_lugares, avoid_rain=False, rain_penalty=3.0):
    """
    A* que no falla solo porque un nodo está lluvioso.
    - Si avoid_rain=True entonces se evitan nodos lluviosos (se excluyen).
    - Si avoid_rain=False entonces los nodos lluviosos se permiten pero penalizan el costo.
    """
    heuristica = generar_heuristica_dinamica(destino)
    if heuristica is None:
        return None, float('inf'), 0, f"Error: No se pudieron generar heurísticas para '{destino}'."

    cola = [(heuristica[inicio], 0, inicio, [inicio])]
    visitados = set()
    nodos = 0

    while cola:
        f, g, nodo, camino = heapq.heappop(cola)
        nodos += 1

        if nodo == destino:
            return camino, g, nodos, None

        if nodo in visitados:
            continue

        visitados.add(nodo)

        for vecino, peso in mapa_turistico[nodo].items():
            if vecino in visitados:
                continue

            # Si se quiere evitar lluvia y el vecino está lluvioso, saltarlo
            if avoid_rain and clima_lugares.get(vecino, 'soleado') == 'lluvioso':
                continue

            # Si está lluvioso aplicamos penalización sobre el peso (tiempo)
            multiplicador = rain_penalty if clima_lugares.get(vecino, 'soleado') == 'lluvioso' else 1.0
            nuevo_costo = g + peso * multiplicador
            f_total = nuevo_costo + heuristica[vecino]
            heapq.heappush(cola, (f_total, nuevo_costo, vecino, camino + [vecino]))

    return None, float('inf'), nodos, "Error: No se encontró una ruta válida con el clima actual."

# --- 6. CÓDIGO DE FLASK (Sin cambios) ---
app = Flask(__name__)

@app.route('/')
def index():
    lugares_mapa = list(mapa_turistico.keys())
    return render_template('index.html', lugares=lugares_mapa, coordenadas=coordenadas_lugares)

@app.route('/calcular_ruta')
def calcular_ruta():
    inicio = request.args.get('inicio')
    destino = request.args.get('destino')

    if not inicio or not destino:
        return jsonify({'error': 'Faltan parámetros de inicio o destino.'}), 400
    if inicio not in mapa_turistico or destino not in mapa_turistico:
        return jsonify({'error': 'Lugar no encontrado en el mapa.'}), 400

    # Parámetros opcionales para controlar generación de clima y comportamiento frente a lluvia
    try:
        prob_soleado = float(request.args.get('prob_soleado', 0.8))
    except ValueError:
        prob_soleado = 0.8

    try:
        correlation_radius_km = float(request.args.get('correlation_radius_km', 0.5))
    except ValueError:
        correlation_radius_km = 0.5

    avoid_rain = request.args.get('avoid_rain', 'false').lower() in ('1', 'true', 'yes')

    try:
        rain_penalty = float(request.args.get('rain_penalty', 3.0))
    except ValueError:
        rain_penalty = 3.0

    seed_param = request.args.get('seed')
    try:
        seed = int(seed_param) if seed_param is not None else None
    except ValueError:
        seed = None

    clima_actual = generar_clima_aleatorio(mapa_turistico, prob_soleado=prob_soleado, correlation_radius_km=correlation_radius_km, seed=seed)

    ruta, costo, nodos, error = a_estrella(inicio, destino, clima_actual, avoid_rain=avoid_rain, rain_penalty=rain_penalty)

    warning = None
    # Si no se encontró ruta al evitar lluvia, intentar fallback permitiendo lluvia (penalizada)
    if ruta is None and avoid_rain:
        ruta2, costo2, nodos2, error2 = a_estrella(inicio, destino, clima_actual, avoid_rain=False, rain_penalty=rain_penalty)
        if ruta2 is not None:
            ruta, costo, nodos = ruta2, costo2, nodos2
            warning = 'No se pudo encontrar ruta evitando lluvia; se devolvió ruta permitiendo lluvia con penalización.'
        else:
            # Si aún no se encontró ruta, devolver el error original
            return jsonify({
                'clima': clima_actual,
                'error': error2 or error
            })
    elif ruta is None:
        # Si no se encontró ruta y no se pidió evitar lluvia, devolver el error
        return jsonify({
            'clima': clima_actual,
            'error': error
        })

    ruta_coords = [coordenadas_lugares[lugar] for lugar in ruta]

    resp = {
        'ruta': ruta,
        'costo': costo,
        'nodos_explorados': nodos,
        'clima': clima_actual,
        'ruta_coords': ruta_coords,
        'params': {
            'prob_soleado': prob_soleado,
            'correlation_radius_km': correlation_radius_km,
            'avoid_rain': avoid_rain,
            'rain_penalty': rain_penalty,
            'seed': seed
        }
    }

    if warning:
        resp['warning'] = warning

    # Campos adicionales para la UI: costo en minutos redondeado, pasos legibles
    try:
        resp['costo_minutos'] = None if math.isinf(costo) else round(float(costo), 2)
    except Exception:
        resp['costo_minutos'] = None

    try:
        resp['nodos_explorados'] = int(nodos)
    except Exception:
        resp['nodos_explorados'] = nodos

    resp['pasos'] = ' → '.join(ruta) if ruta else ''

    return jsonify(resp)

if __name__ == '__main__':
    app.run(debug=True)