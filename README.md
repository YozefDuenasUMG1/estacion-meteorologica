# Estacion Meteorologica IoT - Version 2.0

Sistema completo de monitoreo meteorologico con Arduino, Node.js, MySQL y frontend interactivo.

## Caracteristicas Principales

- **6 sensores independientes** con almacenamiento separado
- **Validacion completa** con expresiones regulares en backend y frontend
- **Dashboard interactivo** con graficos historicos y alertas en tiempo real
- **API REST completa** con 10 endpoints para consultas avanzadas
- **Base de datos normalizada** con precision de milisegundos
- **Busqueda avanzada** con filtros por fecha, rango de valores y sensor

## Tecnologias Utilizadas

### Hardware
- Arduino UNO R4 WiFi
- DHT22 (Temperatura y Humedad)
- BMP280 (Presion Atmosferica)
- Sensor de Lluvia Digital
- Sensor de Humedad de Suelo
- MQ-135 (Calidad del Aire)
- LCD I2C 16x2
- LED y Buzzer para alertas

### Backend
- Node.js + Express
- MySQL 5.7+
- Expresiones Regulares para validacion

### Frontend
- HTML5 + CSS3 + JavaScript
- Chart.js para graficos
- Actualizacion automatica cada 10 segundos

## Instalacion Rapida

### 1. Clonar o Descargar el Proyecto

```bash
cd C:\laragon\www\api_estacion
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Crear la Base de Datos

**Opcion A: Desde linea de comandos**
```bash
mysql -u root -p < nueva_estructura_bd.sql
```

**Opcion B: Desde phpMyAdmin o MySQL Workbench**
- Abrir el archivo `nueva_estructura_bd.sql`
- Ejecutar todo el script

### 4. Verificar Configuracion de Conexion

Editar `db.js` si es necesario:
```javascript
export const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "", // Cambiar si tienes password
  database: "estacion_meteorologica"
});
```

### 5. Iniciar el Servidor

```bash
npm start
```

El servidor iniciara en: `http://localhost:3000`

### 6. Abrir el Dashboard

Navegar a: `http://localhost:3000`

### 7. Configurar Arduino (Opcional)

Si tienes el hardware:
1. Abrir `estacion_meteorologica.ino` en Arduino IDE
2. Modificar credenciales WiFi (lineas 22-23):
```cpp
char ssid[] = "TU_RED_WIFI";
char pass[] = "TU_PASSWORD_WIFI";
```
3. Modificar IP del servidor (linea 25):
```cpp
char server[] = "192.168.X.X"; // IP de tu PC
```
4. Compilar y cargar al Arduino

## Estructura del Proyecto

```
api_estacion/
├── server.js                          # API REST + Validaciones
├── db.js                              # Configuracion MySQL
├── package.json                       # Dependencias Node.js
├── nueva_estructura_bd.sql            # Script de creacion de BD
├── estacion_meteorologica.ino         # Codigo Arduino
├── CAMBIOS.md                         # Documentacion de cambios
├── EXPRESIONES_REGULARES_Y_BD.md      # Documentacion tecnica
├── README.md                          # Este archivo
└── public/
    ├── index.html                     # Dashboard principal
    ├── styles.css                     # Estilos CSS
    └── app.js                         # Logica JavaScript
```

## Base de Datos

### Tablas Creadas

1. **lecturas_temperatura** - Temperatura en °C
2. **lecturas_humedad** - Humedad relativa en %
3. **lecturas_presion** - Presion atmosferica en hPa
4. **lecturas_lluvia** - Deteccion de lluvia (SI/NO)
5. **lecturas_humedad_suelo** - Humedad del suelo (0-1023)
6. **lecturas_gas** - Calidad del aire (0-1023)

### Vista Consolidada

- **vista_ultima_lectura** - Ultima lectura de cada sensor

## Endpoints de la API

### Insercion de Datos
```
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

### Consultas por Sensor
```
GET /api/temperatura?limit=50&fecha_inicio=2025-01-01&fecha_fin=2025-01-31
GET /api/humedad
GET /api/presion
GET /api/lluvia
GET /api/humedad-suelo
GET /api/gas
```

### Otras Consultas
```
GET /api/lecturas/ultima              # Ultima lectura de todos los sensores
GET /api/estadisticas/temperatura     # Min, Max, Promedio
GET /api/buscar/temperatura?rango=20-30&fecha_inicio=2025-01-01
```

## Expresiones Regulares Implementadas

### Backend (server.js)

- **Temperatura:** `/^-?\d{1,2}(\.\d{1,2})?$/` - Formato: -50 a 70
- **Humedad:** `/^\d{1,3}(\.\d{1,2})?$/` - Formato: 0 a 100
- **Presion:** `/^\d{3,4}(\.\d{1,2})?$/` - Formato: 800 a 1200
- **Lluvia:** `/^(SI|NO|si|no|Si|No)$/` - Valores: SI o NO
- **Valores Analogicos:** `/^\d{1,4}$/` - Formato: 0 a 1023
- **Fecha:** `/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/` - ISO 8601
- **Rango:** `/^\d+(\.\d+)?-\d+(\.\d+)?$/` - Formato: min-max

### Frontend (app.js)

- **Fecha:** `/^\d{4}-\d{2}-\d{2}$/` - YYYY-MM-DD
- **Rango:** `/^\d+(\.\d+)?-\d+(\.\d+)?$/` - numero-numero
- **Numero Positivo:** `/^\d+$/` - Solo digitos

## Ejemplos de Uso

### Consultar Ultimas Lecturas
```bash
curl http://localhost:3000/api/temperatura?limit=10
```

### Buscar con Filtros
```bash
curl "http://localhost:3000/api/buscar/temperatura?fecha_inicio=2025-01-01&rango=20-30"
```

### Obtener Estadisticas
```bash
curl http://localhost:3000/api/estadisticas/humedad
```

## Funcionalidades del Dashboard

### Tarjetas de Sensores
- Valor actual en tiempo real
- Minimo, Maximo y Promedio
- Fecha de ultima actualizacion
- Iconos descriptivos

### Panel de Alertas
- Temperatura > 35°C (Roja)
- Gas > 600 PPM (Naranja)
- Lluvia Detectada (Azul)

### Graficos Historicos
- Tabs para cambiar entre sensores
- Visualizacion con Chart.js
- Ultimas 50 lecturas
- Auto-actualizacion

### Busqueda Avanzada
- Filtro por sensor
- Rango de fechas
- Rango de valores
- Limite de resultados
- Validacion en tiempo real

## Validaciones Implementadas

### Capas de Validacion

1. **Arduino** - Validacion basica de lecturas
2. **Backend Regex** - Formato de datos
3. **Backend Rangos** - Valores logicos
4. **Frontend Regex** - Inputs del usuario

### Reglas de Negocio

**Alertas:**
- Temperatura > 35°C
- Gas > 600
- Lluvia = SI

**Rangos Validos:**
- Temperatura: -50 a 70°C
- Humedad: 0 a 100%
- Presion: 800 a 1200 hPa
- Valores Analogicos: 0 a 1023

## Documentacion Completa

- **CAMBIOS.md** - Lista completa de cambios implementados
- **EXPRESIONES_REGULARES_Y_BD.md** - Documentacion tecnica detallada con:
  - Modelo Entidad-Relacion
  - Explicacion de cada expresion regular
  - Flujo de datos
  - Casos de uso
  - Optimizaciones

## Mantenimiento

### Backup de la Base de Datos
```bash
mysqldump -u root -p estacion_meteorologica > backup.sql
```

### Limpiar Datos Antiguos
```sql
DELETE FROM lecturas_temperatura WHERE fecha_registro < DATE_SUB(NOW(), INTERVAL 6 MONTH);
-- Repetir para todas las tablas
```

### Optimizar Indices
```sql
ANALYZE TABLE lecturas_temperatura;
ANALYZE TABLE lecturas_humedad;
-- etc.
```

## Problemas Comunes

### Error de Conexion MySQL
**Sintoma:** "Error al conectar a MySQL"
**Solucion:** Verificar que MySQL este corriendo y que las credenciales en `db.js` sean correctas

### Graficos no se Muestran
**Sintoma:** Canvas en blanco
**Solucion:** Verificar que Chart.js se cargue desde CDN y que haya datos en la BD

### CORS Error
**Sintoma:** "Access-Control-Allow-Origin"
**Solucion:** Verificar que `cors` este instalado: `npm install cors`

## Requisitos del Sistema

- Node.js v14 o superior
- MySQL 5.7 o superior
- Navegador moderno (Chrome, Firefox, Edge)
- Arduino IDE (si usas hardware)

## Proximas Mejoras

- Autenticacion de usuarios
- Exportacion de datos (CSV/Excel)
- Notificaciones push
- Prediccion con Machine Learning
- Aplicacion movil

## Licencia

Proyecto educativo de codigo abierto.

## Contacto

Para soporte, revisar la documentacion en `CAMBIOS.md` y `EXPRESIONES_REGULARES_Y_BD.md`.

---

**Version:** 2.0
**Fecha:** Enero 2025
**Autor:** Claude Code
