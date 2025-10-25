# Documentacion Tecnica: Expresiones Regulares y Base de Datos

## Estacion Meteorologica IoT - Version 2.0

---

## Tabla de Contenidos

1. [Modelo Entidad-Relacion](#1-modelo-entidad-relacion)
2. [Estructura de Base de Datos](#2-estructura-de-base-de-datos)
3. [Expresiones Regulares Implementadas](#3-expresiones-regulares-implementadas)
4. [Flujo de Datos](#4-flujo-de-datos)
5. [Validaciones y Reglas de Negocio](#5-validaciones-y-reglas-de-negocio)

---

## 1. Modelo Entidad-Relacion

### 1.1. Diagrama Conceptual

```
┌─────────────────────────────────────────────────────────────┐
│                  SISTEMA ESTACION METEOROLOGICA             │
└─────────────────────────────────────────────────────────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ SENSORES     │  │  SERVIDOR    │  │  BASE DE     │
    │ (Arduino)    │──│  Node.js     │──│  DATOS       │
    │              │  │  + Express   │  │  MySQL       │
    └──────────────┘  └──────────────┘  └──────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │  FRONTEND    │
                      │  HTML/CSS/JS │
                      └──────────────┘
```

### 1.2. Esquema de Tablas (Independientes)

```
┌──────────────────────────────────────────────────────────────────┐
│                        BASE DE DATOS                              │
│                   estacion_meteorologica                          │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐
│ lecturas_temperatura    │
├─────────────────────────┤
│ PK  id (INT)            │
│     valor (DECIMAL 5,2) │
│     alerta (BOOLEAN)    │
│     fecha_registro      │
│     (DATETIME(3))       │
│ IX  idx_fecha           │
└─────────────────────────┘

┌─────────────────────────┐
│ lecturas_humedad        │
├─────────────────────────┤
│ PK  id (INT)            │
│     valor (DECIMAL 5,2) │
│     fecha_registro      │
│     (DATETIME(3))       │
│ IX  idx_fecha           │
└─────────────────────────┘

┌─────────────────────────┐
│ lecturas_presion        │
├─────────────────────────┤
│ PK  id (INT)            │
│     valor (DECIMAL 7,2) │
│     fecha_registro      │
│     (DATETIME(3))       │
│ IX  idx_fecha           │
└─────────────────────────┘

┌─────────────────────────┐
│ lecturas_lluvia         │
├─────────────────────────┤
│ PK  id (INT)            │
│     detectada (BOOLEAN) │
│     alerta (BOOLEAN)    │
│     fecha_registro      │
│     (DATETIME(3))       │
│ IX  idx_fecha           │
└─────────────────────────┘

┌─────────────────────────┐
│ lecturas_humedad_suelo  │
├─────────────────────────┤
│ PK  id (INT)            │
│     valor_raw (INT)     │
│     valor_porcentaje    │
│     (DECIMAL 5,2)       │
│     fecha_registro      │
│     (DATETIME(3))       │
│ IX  idx_fecha           │
└─────────────────────────┘

┌─────────────────────────┐
│ lecturas_gas            │
├─────────────────────────┤
│ PK  id (INT)            │
│     valor_raw (INT)     │
│     alerta (BOOLEAN)    │
│     fecha_registro      │
│     (DATETIME(3))       │
│ IX  idx_fecha           │
└─────────────────────────┘

┌──────────────────────────────────────┐
│ VIEW: vista_ultima_lectura           │
├──────────────────────────────────────┤
│ Consolida ultima lectura de cada    │
│ sensor usando subconsultas           │
│ (SELECT ... ORDER BY ... LIMIT 1)    │
└──────────────────────────────────────┘
```

### 1.3. Cardinalidad y Relaciones

**Tipo de arquitectura:** Tablas independientes (sin relaciones FK)

**Razon del diseño:**
- Cada sensor registra datos de forma independiente
- No hay relacion directa entre lecturas de diferentes sensores
- Permite diferentes frecuencias de muestreo
- Optimiza queries individuales
- Simplifica escalabilidad

**Vista consolidada:**
- `vista_ultima_lectura` proporciona una vista unificada cuando se necesita
- No afecta el rendimiento de inserciones individuales

---

## 2. Estructura de Base de Datos

### 2.1. Tabla: lecturas_temperatura

**Proposito:** Almacenar lecturas del sensor DHT22 (temperatura)

```sql
CREATE TABLE lecturas_temperatura (
  id INT AUTO_INCREMENT PRIMARY KEY,
  valor DECIMAL(5,2) NOT NULL COMMENT 'Temperatura en grados Celsius',
  alerta BOOLEAN DEFAULT FALSE COMMENT 'Indica si supera umbral de alerta (>35°C)',
  fecha_registro DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
    COMMENT 'Fecha y hora con precision de milisegundos',
  INDEX idx_fecha_temperatura (fecha_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Registros del sensor DHT22 - Temperatura';
```

**Campos:**
- `id`: Clave primaria autoincrementable
- `valor`: Temperatura con 2 decimales de precision (-99.99 a 999.99)
- `alerta`: Flag booleano calculado si temperatura > 35°C
- `fecha_registro`: Timestamp con precision de milisegundos (DATETIME(3))

**Indices:**
- PRIMARY KEY en `id` (automatico)
- INDEX en `fecha_registro` para optimizar consultas temporales

**Espacio estimado:**
- Por registro: ~20 bytes
- 1 millon de registros: ~20 MB

**Consultas optimizadas:**
```sql
-- Lecturas de las ultimas 24 horas (usa indice)
SELECT * FROM lecturas_temperatura
WHERE fecha_registro >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY fecha_registro DESC;

-- Alertas activas
SELECT * FROM lecturas_temperatura WHERE alerta = TRUE;
```

### 2.2. Tabla: lecturas_humedad

**Proposito:** Almacenar lecturas del sensor DHT22 (humedad relativa)

```sql
CREATE TABLE lecturas_humedad (
  id INT AUTO_INCREMENT PRIMARY KEY,
  valor DECIMAL(5,2) NOT NULL COMMENT 'Humedad relativa en porcentaje (0-100%)',
  fecha_registro DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_fecha_humedad (fecha_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Rango de valores:** 0.00 - 100.00%

### 2.3. Tabla: lecturas_presion

**Proposito:** Almacenar lecturas del sensor BMP280 (presion atmosferica)

```sql
CREATE TABLE lecturas_presion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  valor DECIMAL(7,2) NOT NULL COMMENT 'Presion atmosferica en hectopascales (hPa)',
  fecha_registro DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_fecha_presion (fecha_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Rango tipico:** 800.00 - 1200.00 hPa

**Nota:** DECIMAL(7,2) permite hasta 99999.99 para escalabilidad

### 2.4. Tabla: lecturas_lluvia

**Proposito:** Almacenar detecciones del sensor de lluvia digital

```sql
CREATE TABLE lecturas_lluvia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  detectada BOOLEAN NOT NULL COMMENT 'TRUE si se detecta lluvia, FALSE si no',
  alerta BOOLEAN DEFAULT FALSE COMMENT 'Indica si hay alerta de lluvia activa',
  fecha_registro DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_fecha_lluvia (fecha_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Valores:**
- `detectada`: TRUE (hay lluvia) / FALSE (no hay lluvia)
- `alerta`: Calculado igual que `detectada` para consistencia

### 2.5. Tabla: lecturas_humedad_suelo

**Proposito:** Almacenar lecturas del sensor de humedad de suelo (analogico)

```sql
CREATE TABLE lecturas_humedad_suelo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  valor_raw INT NOT NULL COMMENT 'Valor analogico crudo (0-1023)',
  valor_porcentaje DECIMAL(5,2) COMMENT 'Conversion a porcentaje de humedad',
  fecha_registro DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_fecha_suelo (fecha_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Campos:**
- `valor_raw`: Lectura directa del ADC (0-1023)
- `valor_porcentaje`: Conversion calculada: `(valor_raw / 1023) * 100`

**Ventaja:** Mantener ambos valores permite recalibrar sin perder datos originales

### 2.6. Tabla: lecturas_gas

**Proposito:** Almacenar lecturas del sensor MQ-135 (calidad del aire)

```sql
CREATE TABLE lecturas_gas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  valor_raw INT NOT NULL COMMENT 'Valor analogico crudo (0-1023)',
  alerta BOOLEAN DEFAULT FALSE COMMENT 'Indica si supera umbral de alerta (>600)',
  fecha_registro DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_fecha_gas (fecha_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Umbral de alerta:** valor_raw > 600

### 2.7. Vista: vista_ultima_lectura

**Proposito:** Consolidar la ultima lectura de cada sensor en una sola consulta

```sql
CREATE VIEW vista_ultima_lectura AS
SELECT
  (SELECT valor FROM lecturas_temperatura ORDER BY fecha_registro DESC LIMIT 1) as temperatura,
  (SELECT fecha_registro FROM lecturas_temperatura ORDER BY fecha_registro DESC LIMIT 1) as temp_fecha,
  (SELECT valor FROM lecturas_humedad ORDER BY fecha_registro DESC LIMIT 1) as humedad,
  (SELECT fecha_registro FROM lecturas_humedad ORDER BY fecha_registro DESC LIMIT 1) as hum_fecha,
  (SELECT valor FROM lecturas_presion ORDER BY fecha_registro DESC LIMIT 1) as presion,
  (SELECT fecha_registro FROM lecturas_presion ORDER BY fecha_registro DESC LIMIT 1) as pres_fecha,
  (SELECT detectada FROM lecturas_lluvia ORDER BY fecha_registro DESC LIMIT 1) as lluvia,
  (SELECT fecha_registro FROM lecturas_lluvia ORDER BY fecha_registro DESC LIMIT 1) as lluvia_fecha,
  (SELECT valor_raw FROM lecturas_humedad_suelo ORDER BY fecha_registro DESC LIMIT 1) as humedad_suelo,
  (SELECT fecha_registro FROM lecturas_humedad_suelo ORDER BY fecha_registro DESC LIMIT 1) as suelo_fecha,
  (SELECT valor_raw FROM lecturas_gas ORDER BY fecha_registro DESC LIMIT 1) as gas,
  (SELECT fecha_registro FROM lecturas_gas ORDER BY fecha_registro DESC LIMIT 1) as gas_fecha;
```

**Uso:**
```sql
SELECT * FROM vista_ultima_lectura;
```

**Rendimiento:**
- Eficiente gracias a indices en fecha_registro
- Ideal para dashboards en tiempo real

---

## 3. Expresiones Regulares Implementadas

### 3.1. Backend (server.js)

**Ubicacion:** `server.js` lineas 14-35

#### 3.1.1. Temperatura

```javascript
temperatura: /^-?\d{1,2}(\.\d{1,2})?$/
```

**Explicacion:**
- `^` - Inicio de cadena
- `-?` - Signo negativo opcional (para temperaturas bajo cero)
- `\d{1,2}` - 1 o 2 digitos (ej: 5, 25, -10)
- `(\.\d{1,2})?` - Punto decimal seguido de 1 o 2 digitos (opcional)
- `$` - Fin de cadena

**Ejemplos validos:**
- `23`
- `23.5`
- `23.57`
- `-10`
- `-5.2`
- `0.5`

**Ejemplos invalidos:**
- `abc` (letras)
- `23.567` (mas de 2 decimales)
- `123` (mas de 2 digitos enteros)
- `23.` (punto sin decimales)
- ` 23` (espacio al inicio)

**Validacion adicional:**
```javascript
validarRango(datos.temperatura, -50, 70)
```
Rango logico: -50°C a 70°C

#### 3.1.2. Humedad

```javascript
humedad: /^\d{1,3}(\.\d{1,2})?$/
```

**Explicacion:**
- Similar a temperatura pero sin signo negativo
- `\d{1,3}` - 1 a 3 digitos (0-999)
- Permite decimales opcionales

**Ejemplos validos:**
- `0`
- `50`
- `100`
- `65.5`
- `75.23`

**Validacion adicional:**
```javascript
validarRango(datos.humedad, 0, 100)
```
Rango logico: 0% a 100%

#### 3.1.3. Presion

```javascript
presion: /^\d{3,4}(\.\d{1,2})?$/
```

**Explicacion:**
- `\d{3,4}` - 3 o 4 digitos (800-9999)
- Decimales opcionales

**Ejemplos validos:**
- `800`
- `1013`
- `1013.25`
- `1200.5`

**Validacion adicional:**
```javascript
validarRango(datos.presion, 800, 1200)
```
Rango logico: 800-1200 hPa

#### 3.1.4. Lluvia

```javascript
lluvia: /^(SI|NO|si|no|Si|No)$/
```

**Explicacion:**
- `^(SI|NO|si|no|Si|No)$` - Exactamente uno de los valores
- Case insensitive mediante alternativas

**Ejemplos validos:**
- `SI`
- `NO`
- `si`
- `no`
- `Si`
- `No`

**Ejemplos invalidos:**
- `yes`
- `true`
- `1`
- `0`
- `sí` (con acento)

#### 3.1.5. Valores Analogicos (Humedad Suelo, Gas)

```javascript
valorAnalogico: /^\d{1,4}$/
```

**Explicacion:**
- `\d{1,4}` - 1 a 4 digitos enteros
- Sin decimales (valores crudos del ADC)

**Ejemplos validos:**
- `0`
- `512`
- `1023`
- `999`

**Validacion adicional:**
```javascript
validarRango(datos.humedadSuelo, 0, 1023)
validarRango(datos.gas, 0, 1023)
```
Rango del ADC de Arduino: 0-1023

#### 3.1.6. Fecha ISO 8601

```javascript
fecha: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/
```

**Explicacion:**
- `\d{4}` - Año (4 digitos)
- `-\d{2}` - Mes (2 digitos)
- `-\d{2}` - Dia (2 digitos)
- `(T\d{2}:\d{2}:\d{2})?` - Hora opcional (HH:MM:SS)

**Ejemplos validos:**
- `2025-01-15`
- `2025-10-22`
- `2025-01-15T10:30:00`

**Ejemplos invalidos:**
- `2025/01/15` (separador incorrecto)
- `15-01-2025` (orden incorrecto)
- `2025-1-15` (sin cero inicial)

#### 3.1.7. Rango Numerico

```javascript
rango: /^\d+(\.\d+)?-\d+(\.\d+)?$/
```

**Explicacion:**
- `\d+` - Uno o mas digitos (minimo)
- `(\.\d+)?` - Decimales opcionales
- `-` - Separador (guion)
- `\d+(\.\d+)?` - Numero maximo con decimales opcionales

**Ejemplos validos:**
- `20-30`
- `15.5-25.8`
- `0-100`
- `1.2-3.4`

**Ejemplos invalidos:**
- `20 - 30` (espacios)
- `20..30` (puntos en lugar de guion)
- `abc-xyz` (letras)
- `20-` (falta el maximo)

**Validacion adicional:**
```javascript
const [min, max] = rango.split('-').map(parseFloat);
if (min >= max) {
  errores.push('El valor minimo debe ser menor que el maximo');
}
```

### 3.2. Frontend (app.js)

**Ubicacion:** `public/app.js` lineas 11-20

#### 3.2.1. Fecha (Frontend)

```javascript
fecha: /^\d{4}-\d{2}-\d{2}$/
```

Identica a la del backend pero sin la parte de tiempo (input type="date" no la incluye)

#### 3.2.2. Rango (Frontend)

```javascript
rango: /^\d+(\.\d+)?-\d+(\.\d+)?$/
```

Identica a la del backend para consistencia

#### 3.2.3. Numero Positivo

```javascript
numeroPositivo: /^\d+$/
```

**Uso:** Validar campo "limit" (cantidad de resultados)

**Ejemplos validos:**
- `1`
- `50`
- `500`

**Ejemplos invalidos:**
- `-10` (negativo)
- `10.5` (decimal)
- `abc` (letras)

### 3.3. Validacion en Tiempo Real (Frontend)

**Funcion:** `validarRangoTiempoReal()`
**Ubicacion:** `public/app.js:270`

```javascript
function validarRangoTiempoReal(e) {
    const input = e.target;
    const valor = input.value.trim();

    if (valor === '') {
        input.style.borderColor = '#dfe6e9';
        return;
    }

    if (REGEX_VALIDACION.rango.test(valor)) {
        input.style.borderColor = '#27ae60'; // Verde
    } else {
        input.style.borderColor = '#e74c3c'; // Rojo
    }
}
```

**Comportamiento:**
- Se ejecuta cada vez que el usuario escribe en el campo "Rango"
- Cambia el color del borde segun validez
- Verde: Formato correcto
- Rojo: Formato incorrecto
- Gris: Campo vacio

---

## 4. Flujo de Datos

### 4.1. Flujo de Insercion (Arduino → MySQL)

```
┌──────────────┐
│   ARDUINO    │
│  (Sensores)  │
└──────┬───────┘
       │ 1. Lee sensores cada 10 segundos
       │
       ▼
┌──────────────────────────────────────────┐
│  JSON Payload                            │
│  {                                       │
│    "temperatura": 23.5,                  │
│    "humedad": 65.2,                      │
│    "presion": 1013.25,                   │
│    "lluvia": "NO",                       │
│    "humedadSuelo": 512,                  │
│    "gas": 320                            │
│  }                                       │
└──────┬───────────────────────────────────┘
       │ 2. POST /api/lecturas
       │
       ▼
┌──────────────────────────────────────────┐
│  SERVER (server.js)                      │
│                                          │
│  • Validar datos completos               │
│  • Validar con REGEX_PATTERNS            │
│  • Validar rangos numericos              │
└──────┬───────────────────────────────────┘
       │ 3. Si OK, preparar inserts
       │
       ▼
┌──────────────────────────────────────────┐
│  6 Queries SQL en paralelo:              │
│                                          │
│  INSERT lecturas_temperatura             │
│  INSERT lecturas_humedad                 │
│  INSERT lecturas_presion                 │
│  INSERT lecturas_lluvia                  │
│  INSERT lecturas_humedad_suelo           │
│  INSERT lecturas_gas                     │
└──────┬───────────────────────────────────┘
       │ 4. Almacenar en MySQL
       │
       ▼
┌──────────────────────────────────────────┐
│  BASE DE DATOS MySQL                     │
│                                          │
│  • 6 tablas independientes               │
│  • Timestamp con precision ms            │
│  • Indices en fecha_registro             │
└──────────────────────────────────────────┘
```

**Tiempos estimados:**
- Lectura de sensores: ~100ms
- Envio HTTP: ~50ms
- Validacion backend: ~5ms
- Inserciones MySQL: ~20ms
- **Total:** ~175ms por ciclo

### 4.2. Flujo de Consulta (Dashboard → MySQL)

```
┌──────────────┐
│  NAVEGADOR   │
│  (Dashboard) │
└──────┬───────┘
       │ 1. GET /api/temperatura?limit=50
       │
       ▼
┌──────────────────────────────────────────┐
│  SERVER (server.js)                      │
│                                          │
│  • Validar parametros con REGEX          │
│  • Construir query SQL dinamico          │
└──────┬───────────────────────────────────┘
       │ 2. SELECT FROM lecturas_temperatura
       │
       ▼
┌──────────────────────────────────────────┐
│  BASE DE DATOS MySQL                     │
│                                          │
│  • Usa indice idx_fecha_temperatura      │
│  • ORDER BY fecha_registro DESC          │
│  • LIMIT 50                              │
└──────┬───────────────────────────────────┘
       │ 3. Retornar resultados JSON
       │
       ▼
┌──────────────────────────────────────────┐
│  FRONTEND (app.js)                       │
│                                          │
│  • Renderizar grafico con Chart.js      │
│  • Actualizar tarjeta del sensor         │
│  • Mostrar en tabla                      │
└──────────────────────────────────────────┘
```

### 4.3. Flujo de Busqueda Avanzada

```
┌──────────────┐
│  NAVEGADOR   │
│  (Formulario)│
└──────┬───────┘
       │ 1. Usuario ingresa filtros
       │
       ▼
┌──────────────────────────────────────────┐
│  FRONTEND (app.js)                       │
│                                          │
│  • Validar con REGEX_VALIDACION          │
│  • Validar logica (fecha_inicio < fin)   │
│  • Mostrar errores si invalido           │
└──────┬───────────────────────────────────┘
       │ 2. Si OK, GET /api/buscar/sensor?params
       │
       ▼
┌──────────────────────────────────────────┐
│  SERVER (server.js)                      │
│                                          │
│  • Re-validar con REGEX_PATTERNS         │
│  • Construir query SQL con filtros       │
│  • WHERE fecha BETWEEN ... AND ...       │
│  • WHERE valor BETWEEN min AND max       │
└──────┬───────────────────────────────────┘
       │ 3. Ejecutar query filtrado
       │
       ▼
┌──────────────────────────────────────────┐
│  BASE DE DATOS MySQL                     │
│                                          │
│  • Usa indices combinados                │
│  • Retorna solo registros que cumplen    │
└──────┬───────────────────────────────────┘
       │ 4. JSON con resultados
       │
       ▼
┌──────────────────────────────────────────┐
│  FRONTEND (app.js)                       │
│                                          │
│  • Mostrar en tabla dinamica             │
│  • Mostrar info de resultados            │
│  • Aplicar paginacion si necesario       │
└──────────────────────────────────────────┘
```

---

## 5. Validaciones y Reglas de Negocio

### 5.1. Reglas de Alertas

#### Temperatura
```javascript
alerta = temperatura > 35
```
- **Umbral:** 35°C
- **Accion:** Flag `alerta = TRUE` en BD
- **Respuesta:** Incluido en JSON de respuesta
- **UI:** Muestra alerta roja en dashboard

#### Gas
```javascript
alerta = valor_raw > 600
```
- **Umbral:** 600 (valor ADC)
- **Accion:** Flag `alerta = TRUE` en BD
- **Respuesta:** Incluido en JSON de respuesta
- **UI:** Muestra alerta naranja en dashboard

#### Lluvia
```javascript
alerta = detectada === TRUE
```
- **Umbral:** Deteccion binaria
- **Accion:** Flag `alerta = TRUE` en BD
- **Respuesta:** Incluido en JSON de respuesta
- **UI:** Muestra alerta azul en dashboard

### 5.2. Reglas de Conversion

#### Humedad del Suelo
```javascript
valor_porcentaje = (valor_raw / 1023) * 100
```
- **Entrada:** valor_raw (0-1023)
- **Salida:** valor_porcentaje (0.00-100.00)
- **Almacenamiento:** Ambos valores en BD
- **Precision:** 2 decimales

### 5.3. Reglas de Validacion (Capas)

#### Capa 1: Arduino (Basica)
- Verifica que sensores respondan
- Envia valores crudos sin procesamiento excesivo

#### Capa 2: Backend REGEX (Formato)
**Ubicacion:** `server.js:52-96`

```javascript
function validarDatosSensores(datos) {
  const errores = [];

  // Validacion de formato
  if (!REGEX_PATTERNS.temperatura.test(datos.temperatura)) {
    errores.push("Temperatura invalida (formato esperado: -50 a 70, ej: 23.5)");
  }

  // ... mas validaciones

  return errores;
}
```

**Valida:**
- Formato numerico correcto
- Caracteres permitidos
- Longitud de cadena

#### Capa 3: Backend Rangos (Logica)
**Ubicacion:** `server.js:44-47`

```javascript
function validarRango(valor, min, max) {
  const num = parseFloat(valor);
  return !isNaN(num) && num >= min && num <= max;
}
```

**Valida:**
- Rangos fisicamente posibles
- Limites del hardware
- Valores razonables

#### Capa 4: Frontend REGEX (UI)
**Ubicacion:** `public/app.js:317-346`

```javascript
function validarParametrosBusqueda({fechaInicio, fechaFin, rango}) {
  const errores = [];

  // Validar fecha inicio
  if (fechaInicio && !REGEX_VALIDACION.fecha.test(fechaInicio)) {
    errores.push('Fecha inicio invalida (formato: YYYY-MM-DD)');
  }

  // Validar logica de fechas
  if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
    errores.push('La fecha inicio no puede ser posterior a la fecha fin');
  }

  return errores;
}
```

**Valida:**
- Inputs del usuario en tiempo real
- Formato antes de enviar al servidor
- Logica de negocio (fecha_inicio < fecha_fin)

### 5.4. Matriz de Validacion

| Campo          | REGEX Backend | Rango Backend | REGEX Frontend | Validacion Logica |
|----------------|---------------|---------------|----------------|-------------------|
| Temperatura    | ✅            | ✅ (-50,70)   | N/A            | N/A               |
| Humedad        | ✅            | ✅ (0,100)    | N/A            | N/A               |
| Presion        | ✅            | ✅ (800,1200) | N/A            | N/A               |
| Lluvia         | ✅            | N/A           | N/A            | N/A               |
| HumedadSuelo   | ✅            | ✅ (0,1023)   | N/A            | N/A               |
| Gas            | ✅            | ✅ (0,1023)   | N/A            | N/A               |
| Fecha          | ✅            | N/A           | ✅             | ✅ (inicio < fin) |
| Rango          | ✅            | N/A           | ✅             | ✅ (min < max)    |
| Limit          | N/A           | N/A           | ✅             | N/A               |

### 5.5. Mensajes de Error Descriptivos

**Formato estandar:**
```json
{
  "error": "Categoria del error",
  "detalles": [
    "Descripcion especifica del problema 1",
    "Descripcion especifica del problema 2"
  ]
}
```

**Ejemplos:**

**Error de formato:**
```json
{
  "error": "Datos invalidos",
  "detalles": [
    "Temperatura invalida (formato esperado: -50 a 70, ej: 23.5)",
    "Gas invalido (formato esperado: 0-1023)"
  ]
}
```

**Error de rango:**
```json
{
  "error": "Datos invalidos",
  "detalles": [
    "Temperatura fuera de rango (-50 a 70°C)"
  ]
}
```

**Error de parametros:**
```json
{
  "error": "Parametros invalidos",
  "detalles": [
    "Fecha inicio invalida (formato: YYYY-MM-DD)",
    "Rango invalido (formato: min-max, ej: 20-30)"
  ]
}
```

---

## 6. Casos de Uso Detallados

### 6.1. Caso de Uso: Insercion Normal

**Entrada:**
```json
{
  "temperatura": 23.5,
  "humedad": 65.2,
  "presion": 1013.25,
  "lluvia": "NO",
  "humedadSuelo": 512,
  "gas": 320
}
```

**Proceso:**
1. Validar formato con REGEX_PATTERNS ✅
2. Validar rangos ✅
3. Calcular alertas:
   - temperatura (23.5 > 35) = FALSE
   - gas (320 > 600) = FALSE
   - lluvia (NO) = FALSE
4. Calcular porcentaje suelo: (512/1023)*100 = 50.05
5. Insertar en 6 tablas
6. Retornar respuesta

**Salida:**
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

### 6.2. Caso de Uso: Insercion con Alerta

**Entrada:**
```json
{
  "temperatura": 37.8,
  "humedad": 45.0,
  "presion": 1010.50,
  "lluvia": "SI",
  "humedadSuelo": 200,
  "gas": 750
}
```

**Proceso:**
1. Validar formato ✅
2. Validar rangos ✅
3. Calcular alertas:
   - temperatura (37.8 > 35) = TRUE ⚠️
   - gas (750 > 600) = TRUE ⚠️
   - lluvia (SI) = TRUE ⚠️
4. Insertar con flags de alerta activados
5. Retornar respuesta

**Salida:**
```json
{
  "status": "OK",
  "mensaje": "Lecturas guardadas correctamente",
  "alertas": {
    "temperatura": true,
    "gas": true,
    "lluvia": true
  }
}
```

**Efectos en UI:**
- Panel de alertas muestra 3 alertas
- Tarjeta de temperatura en rojo
- Tarjeta de gas en naranja
- Tarjeta de lluvia en azul

### 6.3. Caso de Uso: Rechazo por Validacion

**Entrada invalida:**
```json
{
  "temperatura": "abc",
  "humedad": 150,
  "presion": 500,
  "lluvia": "maybe",
  "humedadSuelo": -10,
  "gas": 2000
}
```

**Proceso:**
1. Validar formato:
   - temperatura: FALLO (no cumple regex) ❌
   - lluvia: FALLO (no es SI/NO) ❌
2. Validar rangos:
   - humedad: FALLO (150 > 100) ❌
   - presion: FALLO (500 < 800) ❌
   - humedadSuelo: FALLO (-10 < 0) ❌
   - gas: FALLO (2000 > 1023) ❌
3. NO insertar en BD
4. Retornar errores

**Salida:**
```json
{
  "error": "Datos invalidos",
  "detalles": [
    "Temperatura invalida (formato esperado: -50 a 70, ej: 23.5)",
    "Humedad fuera de rango (0-100%)",
    "Presion fuera de rango (800-1200 hPa)",
    "Lluvia invalida (valores permitidos: SI o NO)",
    "Humedad del suelo fuera de rango (0-1023)",
    "Gas fuera de rango (0-1023)"
  ]
}
```

### 6.4. Caso de Uso: Busqueda con Filtros

**Solicitud:**
```
GET /api/buscar/temperatura?fecha_inicio=2025-01-01&fecha_fin=2025-01-31&rango=20-30&limit=100
```

**Proceso:**
1. Validar parametros con REGEX:
   - fecha_inicio: /^\d{4}-\d{2}-\d{2}$/ ✅
   - fecha_fin: /^\d{4}-\d{2}-\d{2}$/ ✅
   - rango: /^\d+(\.\d+)?-\d+(\.\d+)?$/ ✅
2. Validar logica:
   - fecha_inicio (2025-01-01) < fecha_fin (2025-01-31) ✅
   - rango min (20) < max (30) ✅
3. Construir query SQL:
```sql
SELECT * FROM lecturas_temperatura
WHERE fecha_registro >= '2025-01-01'
  AND fecha_registro <= '2025-01-31 23:59:59'
  AND valor BETWEEN 20 AND 30
ORDER BY fecha_registro DESC
LIMIT 100
```
4. Ejecutar query
5. Retornar resultados

**Respuesta:**
```json
{
  "sensor": "temperatura",
  "total": 42,
  "filtros": {
    "rango": "20-30",
    "fecha_inicio": "2025-01-01",
    "fecha_fin": "2025-01-31"
  },
  "datos": [
    {
      "id": 125,
      "valor": 25.30,
      "alerta": false,
      "fecha_registro": "2025-01-22T14:30:15.456Z"
    },
    ...
  ]
}
```

---

## 7. Optimizaciones Implementadas

### 7.1. Indices en Base de Datos

**Todos los indices creados:**
```sql
INDEX idx_fecha_temperatura (fecha_registro)
INDEX idx_fecha_humedad (fecha_registro)
INDEX idx_fecha_presion (fecha_registro)
INDEX idx_fecha_lluvia (fecha_registro)
INDEX idx_fecha_suelo (fecha_registro)
INDEX idx_fecha_gas (fecha_registro)
```

**Beneficios:**
- Consultas por rango de fechas: O(log n) en lugar de O(n)
- ORDER BY fecha_registro: Usa indice directamente
- Vista consolidada: Mas rapida

**Estadisticas estimadas:**
- Sin indice: 1M registros = ~2 segundos
- Con indice: 1M registros = ~50 ms

### 7.2. Precision de Timestamps

**DATETIME(3) vs DATETIME:**
- DATETIME: Precision de 1 segundo
- DATETIME(3): Precision de 1 milisegundo

**Ventaja:**
- Permite distinguir multiples lecturas en el mismo segundo
- Mejor para analisis de alta frecuencia
- Solo 1 byte adicional por registro

### 7.3. Tipos de Datos Optimizados

| Campo           | Tipo           | Tamaño  | Razon                          |
|-----------------|----------------|---------|--------------------------------|
| id              | INT            | 4 bytes | Hasta 2.1 mil millones         |
| valor (temp)    | DECIMAL(5,2)   | 3 bytes | Precision fija, rapido         |
| valor (presion) | DECIMAL(7,2)   | 4 bytes | Rango mayor                    |
| valor_raw       | INT            | 4 bytes | Enteros, rapido                |
| alerta          | BOOLEAN        | 1 byte  | Minimo espacio                 |
| fecha_registro  | DATETIME(3)    | 8 bytes | Precision de milisegundos      |

**Total por registro (temperatura):**
- id: 4 bytes
- valor: 3 bytes
- alerta: 1 byte
- fecha_registro: 8 bytes
- **Total:** ~16 bytes + overhead (indices, etc.) = ~20 bytes

**1 millon de registros = ~20 MB**

---

## 8. Diagrama de Arquitectura Completa

```
┌─────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA DEL SISTEMA                  │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  CAPA FISICA         │
│  (Hardware)          │
│                      │
│  • DHT22 (Temp/Hum)  │
│  • BMP280 (Presion)  │
│  • Sensor Lluvia     │
│  • Sensor Suelo      │
│  • MQ-135 (Gas)      │
│  • LCD I2C           │
│  • LED + Buzzer      │
└──────────┬───────────┘
           │ Lecturas cada 10s
           ▼
┌──────────────────────┐
│  CAPA DISPOSITIVO    │
│  (Arduino UNO R4)    │
│                      │
│  • Lee sensores      │
│  • Valida lecturas   │
│  • Construye JSON    │
│  • WiFi POST         │
└──────────┬───────────┘
           │ HTTP POST /api/lecturas
           ▼
┌────────────────────────────────────┐
│  CAPA VALIDACION                   │
│  (server.js - Express)             │
│                                    │
│  REGEX_PATTERNS {                  │
│    temperatura: /^-?\d{1,2}...$/   │
│    humedad: /^\d{1,3}...$/         │
│    presion: /^\d{3,4}...$/         │
│    lluvia: /^(SI|NO|...)$/         │
│    valorAnalogico: /^\d{1,4}$/     │
│    fecha: /^\d{4}-\d{2}...$/       │
│    rango: /^\d+...-\d+...$/        │
│  }                                 │
│                                    │
│  validarDatosSensores()            │
│  validarRango()                    │
│  validarParametrosConsulta()       │
└────────────┬───────────────────────┘
             │ SQL Queries
             ▼
┌────────────────────────────────────────────────┐
│  CAPA PERSISTENCIA                             │
│  (MySQL Database)                              │
│                                                │
│  lecturas_temperatura (id, valor, alerta, ...) │
│  lecturas_humedad (id, valor, fecha_registro)  │
│  lecturas_presion (id, valor, fecha_registro)  │
│  lecturas_lluvia (id, detectada, alerta, ...)  │
│  lecturas_humedad_suelo (id, valor_raw, ...)   │
│  lecturas_gas (id, valor_raw, alerta, ...)     │
│                                                │
│  vista_ultima_lectura (consolidada)            │
│                                                │
│  Indices: idx_fecha_* en todas las tablas      │
└────────────┬───────────────────────────────────┘
             │ JSON Response
             ▼
┌────────────────────────────────────┐
│  CAPA API REST                     │
│  (server.js - Endpoints)           │
│                                    │
│  POST   /api/lecturas              │
│  GET    /api/temperatura           │
│  GET    /api/humedad               │
│  GET    /api/presion               │
│  GET    /api/lluvia                │
│  GET    /api/humedad-suelo         │
│  GET    /api/gas                   │
│  GET    /api/lecturas/ultima       │
│  GET    /api/buscar/:sensor        │
│  GET    /api/estadisticas/:sensor  │
└────────────┬───────────────────────┘
             │ HTTP GET
             ▼
┌────────────────────────────────────┐
│  CAPA PRESENTACION                 │
│  (Frontend)                        │
│                                    │
│  index.html                        │
│  ├─ Tarjetas de sensores           │
│  ├─ Panel de alertas               │
│  ├─ Filtros de busqueda            │
│  ├─ Graficos historicos            │
│  └─ Tabla de resultados            │
│                                    │
│  styles.css                        │
│  ├─ Variables CSS                  │
│  ├─ Grid responsive                │
│  ├─ Animaciones                    │
│  └─ Temas de color                 │
│                                    │
│  app.js                            │
│  ├─ REGEX_VALIDACION               │
│  ├─ validarParametrosBusqueda()    │
│  ├─ validarRangoTiempoReal()       │
│  ├─ Chart.js (graficos)            │
│  └─ Auto-refresh cada 10s          │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│  USUARIO FINAL                     │
│  (Navegador Web)                   │
│                                    │
│  • Visualiza datos en tiempo real  │
│  • Recibe alertas visuales         │
│  • Realiza busquedas avanzadas     │
│  • Analiza graficos historicos     │
└────────────────────────────────────┘
```

---

## Resumen de Ubicaciones de Codigo

### Expresiones Regulares

| Ubicacion                  | Lineas | Proposito                      |
|----------------------------|--------|--------------------------------|
| `server.js`                | 14-35  | Definicion de REGEX_PATTERNS   |
| `server.js`                | 52-96  | Funcion validarDatosSensores   |
| `server.js`                | 101-117| Funcion validarParametrosConsulta |
| `public/app.js`            | 11-20  | Definicion de REGEX_VALIDACION |
| `public/app.js`            | 270-284| Validacion en tiempo real      |
| `public/app.js`            | 317-346| Funcion validarParametrosBusqueda |

### Base de Datos

| Ubicacion                  | Contenido                      |
|----------------------------|--------------------------------|
| `nueva_estructura_bd.sql`  | Script completo de creacion BD |
| `db.js`                    | Configuracion de conexion      |

### Endpoints API

| Endpoint                   | Ubicacion en server.js |
|----------------------------|------------------------|
| POST /api/lecturas         | 122-224                |
| GET /api/temperatura       | 235-267                |
| GET /api/humedad           | 272-303                |
| GET /api/presion           | 308-339                |
| GET /api/lluvia            | 344-375                |
| GET /api/humedad-suelo     | 380-411                |
| GET /api/gas               | 416-447                |
| GET /api/lecturas/ultima   | 452-460                |
| GET /api/buscar/:sensor    | 465-531                |
| GET /api/estadisticas/:sensor | 536-574             |

---

**Fin del documento tecnico**
