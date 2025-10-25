# Documentacion de Cambios - Estacion Meteorologica IoT

## Version 2.0 - Migracion Completa del Sistema

Fecha: Enero 2025

---

## Resumen Ejecutivo

Se ha realizado una migracion completa del sistema de estacion meteorologica, mejorando significativamente la arquitectura de la base de datos, implementando validaciones robustas con expresiones regulares, y creando un frontend interactivo moderno. Los cambios principales incluyen:

- **Base de datos normalizada** con tablas separadas por sensor
- **Validacion completa** usando expresiones regulares en backend y frontend
- **API REST expandida** con endpoints especificos y filtros avanzados
- **Dashboard interactivo** con graficos historicos y busqueda avanzada

---

## 1. Cambios en la Base de Datos

### 1.1. Estructura Anterior

**Tabla unica: `registro`**
```sql
CREATE TABLE registro (
  id INT AUTO_INCREMENT PRIMARY KEY,
  temperatura FLOAT,
  humedad FLOAT,
  presion FLOAT,
  lluvia VARCHAR(10),
  humedadSuelo FLOAT,
  gas FLOAT,
  fecha DATETIME DEFAULT NOW()
);
```

**Problemas:**
- Todos los sensores en una sola fila
- Perdida de precision en timestamps
- Dificil escalar o agregar nuevos sensores
- No permite frecuencias de muestreo diferentes por sensor

### 1.2. Estructura Nueva (Normalizada)

**6 tablas independientes:**

1. **`lecturas_temperatura`**
   - `id` (PK, AUTO_INCREMENT)
   - `valor` (DECIMAL 5,2) - Temperatura en °C
   - `alerta` (BOOLEAN) - TRUE si >35°C
   - `fecha_registro` (DATETIME con precision de milisegundos)

2. **`lecturas_humedad`**
   - `id` (PK, AUTO_INCREMENT)
   - `valor` (DECIMAL 5,2) - Humedad en %
   - `fecha_registro` (DATETIME(3))

3. **`lecturas_presion`**
   - `id` (PK, AUTO_INCREMENT)
   - `valor` (DECIMAL 7,2) - Presion en hPa
   - `fecha_registro` (DATETIME(3))

4. **`lecturas_lluvia`**
   - `id` (PK, AUTO_INCREMENT)
   - `detectada` (BOOLEAN) - TRUE/FALSE
   - `alerta` (BOOLEAN)
   - `fecha_registro` (DATETIME(3))

5. **`lecturas_humedad_suelo`**
   - `id` (PK, AUTO_INCREMENT)
   - `valor_raw` (INT) - Valor analogico 0-1023
   - `valor_porcentaje` (DECIMAL 5,2) - Conversion a %
   - `fecha_registro` (DATETIME(3))

6. **`lecturas_gas`**
   - `id` (PK, AUTO_INCREMENT)
   - `valor_raw` (INT) - Valor analogico 0-1023
   - `alerta` (BOOLEAN) - TRUE si >600
   - `fecha_registro` (DATETIME(3))

**Vista consolidada:** `vista_ultima_lectura`
- Consolida la ultima lectura de cada sensor en una sola consulta

### 1.3. Ventajas de la Nueva Estructura

- **Precision de timestamps**: Milisegundos en lugar de segundos
- **Indices por fecha**: Mejora rendimiento en consultas temporales
- **Escalabilidad**: Facil agregar nuevos sensores
- **Flexibilidad**: Cada sensor puede tener frecuencia diferente
- **Mejor normalizacion**: Cumple con 3FN
- **Comentarios descriptivos**: Documentacion en la propia BD
- **Tipos de datos optimizados**: DECIMAL para precision, BOOLEAN para flags

### 1.4. Script de Migracion

**Archivo:** `nueva_estructura_bd.sql`

Para ejecutar la migracion:
```bash
mysql -u root -p < nueva_estructura_bd.sql
```

**Importante:** Este script elimina la base de datos anterior. Asegurate de hacer backup si necesitas los datos historicos.

---

## 2. Cambios en el Backend (server.js)

### 2.1. Expresiones Regulares Implementadas

Se agregaron validaciones robustas en `server.js` (lineas 14-35):

```javascript
const REGEX_PATTERNS = {
  // Temperatura: -50 a 70°C
  temperatura: /^-?\d{1,2}(\.\d{1,2})?$/,

  // Humedad: 0-100%
  humedad: /^\d{1,3}(\.\d{1,2})?$/,

  // Presion: 800-1200 hPa
  presion: /^\d{3,4}(\.\d{1,2})?$/,

  // Lluvia: SI o NO (case insensitive)
  lluvia: /^(SI|NO|si|no|Si|No)$/,

  // Valores analogicos: 0-1023
  valorAnalogico: /^\d{1,4}$/,

  // Fecha ISO 8601
  fecha: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/,

  // Rango numerico para busquedas
  rango: /^\d+(\.\d+)?-\d+(\.\d+)?$/
};
```

**Ubicacion:** `server.js:14-35`

### 2.2. Funciones de Validacion

**`validarDatosSensores(datos)`** - Linea 52
- Valida formato con regex
- Valida rangos numericos
- Retorna array de errores descriptivos

**`validarParametrosConsulta(params)`** - Linea 101
- Valida parametros de busqueda
- Valida fechas y rangos

**`validarRango(valor, min, max)`** - Linea 44
- Valida que valores numericos esten dentro de rangos logicos

### 2.3. Nuevos Endpoints de API

#### POST /api/lecturas
- **Funcion:** Recibir lecturas del Arduino
- **Cambio:** Ahora inserta en 6 tablas independientes
- **Validacion:** Regex + rangos antes de insertar
- **Respuesta:** Incluye estado de alertas activadas
- **Ubicacion:** `server.js:122-224`

#### GET /api/temperatura
- **Funcion:** Obtener lecturas de temperatura
- **Parametros:** `?limit=50&fecha_inicio=2025-01-01&fecha_fin=2025-01-31`
- **Ubicacion:** `server.js:235-267`

#### GET /api/humedad
- Similar a temperatura pero para humedad
- **Ubicacion:** `server.js:272-303`

#### GET /api/presion
- **Ubicacion:** `server.js:308-339`

#### GET /api/lluvia
- **Ubicacion:** `server.js:344-375`

#### GET /api/humedad-suelo
- **Ubicacion:** `server.js:380-411`

#### GET /api/gas
- **Ubicacion:** `server.js:416-447`

#### GET /api/lecturas/ultima
- **Funcion:** Vista consolidada de ultima lectura de cada sensor
- **Ubicacion:** `server.js:452-460`

#### GET /api/buscar/:sensor
- **Funcion:** Busqueda avanzada con filtros
- **Parametros:**
  - `sensor`: temperatura | humedad | presion | lluvia | humedad-suelo | gas
  - `rango`: min-max (ej: 20-30)
  - `fecha_inicio`: YYYY-MM-DD
  - `fecha_fin`: YYYY-MM-DD
  - `limit`: numero (default 100)
- **Validacion:** Regex en todos los parametros
- **Ubicacion:** `server.js:465-531`

#### GET /api/estadisticas/:sensor
- **Funcion:** Obtener min, max, promedio, total registros
- **Ubicacion:** `server.js:536-574`

### 2.4. Mejoras en la Seguridad

- Validacion estricta con regex antes de queries
- Parametrizacion de queries SQL (previene SQL injection)
- Manejo de errores robusto
- Validacion de tipos de datos

---

## 3. Cambios en el Frontend

### 3.1. Archivos Creados

**`public/index.html`**
- Dashboard completo con tarjetas por sensor
- Panel de alertas dinamico
- Filtros de busqueda avanzada con validacion
- Graficos historicos con tabs
- Tabla de resultados interactiva

**`public/styles.css`**
- Diseno moderno y responsivo
- Variables CSS para temas
- Animaciones y transiciones suaves
- Grid layout adaptativo
- Modo mobile-friendly

**`public/app.js`**
- Logica completa de la aplicacion
- Validacion con regex en frontend
- Graficos con Chart.js
- Actualizacion automatica cada 10 segundos
- Manejo de errores

### 3.2. Expresiones Regulares en Frontend

**Ubicacion:** `public/app.js:11-20`

```javascript
const REGEX_VALIDACION = {
    // Formato de fecha: YYYY-MM-DD
    fecha: /^\d{4}-\d{2}-\d{2}$/,

    // Formato de rango: numero-numero
    rango: /^\d+(\.\d+)?-\d+(\.\d+)?$/,

    // Solo numeros positivos
    numeroPositivo: /^\d+$/
};
```

**Funciones de validacion:**
- `validarRangoTiempoReal()` - Linea 270: Validacion mientras el usuario escribe
- `validarParametrosBusqueda()` - Linea 317: Validacion antes de enviar la busqueda

### 3.3. Funcionalidades del Dashboard

**Tarjetas de Sensores:**
- Valor actual en tiempo real
- Estadisticas (min, max, promedio)
- Fecha de ultima actualizacion
- Iconos descriptivos

**Panel de Alertas:**
- Aparece automaticamente cuando hay alertas
- Diferentes colores por tipo de alerta
- Animacion de entrada

**Graficos Historicos:**
- Tabs para cambiar entre sensores
- Chart.js para visualizacion
- Ultimas 50 lecturas
- Actualizacion automatica

**Busqueda Avanzada:**
- Filtros por sensor
- Rango de fechas
- Rango de valores (validado con regex)
- Limite de resultados
- Validacion en tiempo real

**Tabla de Resultados:**
- Muestra datos filtrados
- Informacion de cantidad de resultados
- Columnas adaptativas segun el sensor

---

## 4. Cambios en db.js

### 4.1. Mejoras

**Antes:**
```javascript
export const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "estacion_meteorologica"
});
```

**Despues:**
```javascript
export const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "estacion_meteorologica",
  timezone: "+00:00", // UTC
  dateStrings: false, // Mantener objetos Date
  multipleStatements: false // Seguridad
});

// Manejo de errores de conexion
db.on('error', (err) => {
  console.error('Error en la conexion MySQL:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('La conexion con la base de datos se perdio.');
  }
});
```

**Mejoras:**
- Configuracion de timezone
- Seguridad: multipleStatements desactivado
- Manejo de errores en tiempo real
- Exit si falla la conexion inicial

---

## 5. Cambios en Arduino (estacion_meteorologica.ino)

### 5.1. Compatibilidad

El codigo Arduino **NO requiere cambios** para funcionar con la nueva API.

**Razon:** El endpoint POST `/api/lecturas` mantiene retrocompatibilidad:
- Acepta el mismo formato JSON
- Mismos nombres de campos
- Ahora con validacion adicional

### 5.2. Mejoras Opcionales (Futuras)

Si deseas aprovechar al maximo el nuevo sistema:
- Enviar timestamps desde Arduino (mas precision)
- Implementar reintentos si falla validacion
- Agregar checksum para integridad de datos

---

## 6. Instrucciones de Instalacion

### 6.1. Requisitos Previos

- Node.js v14+
- MySQL 5.7+
- Navegador moderno

### 6.2. Pasos de Instalacion

**1. Migrar la base de datos:**
```bash
mysql -u root -p < nueva_estructura_bd.sql
```

**2. Instalar dependencias (si no estan instaladas):**
```bash
npm install
```

**3. Iniciar el servidor:**
```bash
npm start
```

**4. Abrir el dashboard:**
```
http://localhost:3000
```

### 6.3. Verificacion

**Verificar que las tablas se crearon:**
```sql
USE estacion_meteorologica;
SHOW TABLES;
```

Deberia mostrar:
- lecturas_temperatura
- lecturas_humedad
- lecturas_presion
- lecturas_lluvia
- lecturas_humedad_suelo
- lecturas_gas
- vista_ultima_lectura

**Verificar endpoints de la API:**
- GET http://localhost:3000/api/temperatura
- GET http://localhost:3000/api/lecturas/ultima
- GET http://localhost:3000/api/estadisticas/temperatura

---

## 7. Ejemplos de Uso

### 7.1. Enviar Lectura desde Arduino

```javascript
POST /api/lecturas
Content-Type: application/json

{
  "temperatura": 23.5,
  "humedad": 65.2,
  "presion": 1013.25,
  "lluvia": "NO",
  "humedadSuelo": 512,
  "gas": 320
}
```

**Respuesta exitosa:**
```json
{
  "status": "OK",
  "mensaje": "Lecturas guardadas correctamente",
  "alertas": {
    "temperatura": false,
    "gas": false,
    "lluvia": false
  }
}
```

**Respuesta con error de validacion:**
```json
{
  "error": "Datos invalidos",
  "detalles": [
    "Temperatura fuera de rango (-50 a 70°C)",
    "Gas invalido (formato esperado: 0-1023)"
  ]
}
```

### 7.2. Buscar Lecturas con Filtros

```
GET /api/buscar/temperatura?fecha_inicio=2025-01-01&fecha_fin=2025-01-31&rango=20-30&limit=100
```

**Respuesta:**
```json
{
  "sensor": "temperatura",
  "total": 45,
  "filtros": {
    "rango": "20-30",
    "fecha_inicio": "2025-01-01",
    "fecha_fin": "2025-01-31"
  },
  "datos": [
    {
      "id": 1,
      "valor": 23.50,
      "alerta": false,
      "fecha_registro": "2025-01-15T10:30:25.123Z"
    },
    ...
  ]
}
```

### 7.3. Obtener Estadisticas

```
GET /api/estadisticas/humedad
```

**Respuesta:**
```json
{
  "sensor": "humedad",
  "estadisticas": {
    "total_registros": 1250,
    "minimo": 45.20,
    "maximo": 85.60,
    "promedio": 65.35,
    "primera_lectura": "2025-01-01T00:00:00.000Z",
    "ultima_lectura": "2025-01-22T15:30:00.000Z"
  }
}
```

---

## 8. Testing y Validacion

### 8.1. Probar Validaciones Regex

**Temperatura invalida:**
```bash
curl -X POST http://localhost:3000/api/lecturas \
  -H "Content-Type: application/json" \
  -d '{"temperatura": "abc", "humedad": 65, "presion": 1013, "lluvia": "NO", "humedadSuelo": 512, "gas": 320}'
```

Deberia rechazar con error descriptivo.

**Rango invalido en busqueda:**
```
GET /api/buscar/temperatura?rango=abc-xyz
```

Deberia retornar error de validacion.

### 8.2. Probar Dashboard

1. Abrir http://localhost:3000
2. Verificar que las tarjetas cargan datos
3. Cambiar entre tabs de graficos
4. Realizar busqueda con filtros
5. Probar validacion en tiempo real del campo "Rango"

---

## 9. Mantenimiento y Optimizacion

### 9.1. Recomendaciones

**Limpieza de datos antiguos:**
```sql
-- Eliminar lecturas mayores a 6 meses
DELETE FROM lecturas_temperatura WHERE fecha_registro < DATE_SUB(NOW(), INTERVAL 6 MONTH);
-- Repetir para todas las tablas
```

**Optimizar indices:**
```sql
ANALYZE TABLE lecturas_temperatura;
ANALYZE TABLE lecturas_humedad;
-- etc.
```

**Backup automatico:**
```bash
# Agregar a cron (diario)
mysqldump -u root -p estacion_meteorologica > backup_$(date +%Y%m%d).sql
```

---

## 10. Problemas Conocidos y Soluciones

### 10.1. Error de Conexion MySQL

**Problema:** "Error al conectar a MySQL: ECONNREFUSED"

**Solucion:**
- Verificar que MySQL este corriendo
- Verificar credenciales en `db.js`
- Verificar que la base de datos exista

### 10.2. CORS Error en Frontend

**Problema:** "Access-Control-Allow-Origin" error

**Solucion:**
- Verificar que `cors` este instalado: `npm install cors`
- Verificar que `app.use(cors())` este en `server.js`

### 10.3. Graficos no se Muestran

**Problema:** Canvas en blanco

**Solucion:**
- Verificar que Chart.js se cargue desde CDN
- Verificar consola del navegador para errores
- Verificar que haya datos en la base de datos

---

## 11. Proximas Mejoras Planificadas

- [ ] Autenticacion de usuarios
- [ ] Exportacion de datos (CSV, Excel)
- [ ] Notificaciones push para alertas
- [ ] API de prediccion basada en ML
- [ ] Aplicacion movil
- [ ] Soporte para multiples estaciones

---

## Contacto y Soporte

Para reportar problemas o sugerencias:
- Revisar esta documentacion primero
- Consultar `EXPRESIONES_REGULARES_Y_BD.md` para detalles tecnicos
- Verificar logs del servidor Node.js
- Verificar logs de MySQL

---

**Fin del documento**
