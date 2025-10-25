import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { db } from "./db.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// ============================================
// EXPRESIONES REGULARES PARA VALIDACIÓN
// ============================================
const REGEX_PATTERNS = {
  // Temperatura: -50 a 70°C (formato: 23.5, -10.2, 45)
  temperatura: /^-?\d{1,2}(\.\d{1,2})?$/,

  // Humedad: 0-100% (formato: 65.5, 100, 0)
  humedad: /^\d{1,3}(\.\d{1,2})?$/,

  // Presión: 800-1200 hPa (formato: 1013.25)
  presion: /^\d{3,4}(\.\d{1,2})?$/,

  // Lluvia: SI o NO (case insensitive)
  lluvia: /^(SI|NO|si|no|Si|No)$/,

  // Valores analógicos: 0-1023
  valorAnalogico: /^\d{1,4}$/,

  // Fecha ISO 8601 (formato: 2025-01-15, 2025-01-15T10:30:00)
  fecha: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/,

  // Rango numérico para búsquedas (formato: 20-30, 0-100)
  rango: /^\d+(\.\d+)?-\d+(\.\d+)?$/
};

// ============================================
// FUNCIONES DE VALIDACIÓN
// ============================================

/**
 * Valida que un valor numérico esté dentro de un rango
 */
function validarRango(valor, min, max) {
  const num = parseFloat(valor);
  return !isNaN(num) && num >= min && num <= max;
}

/**
 * Valida datos de sensores con expresiones regulares
 */
function validarDatosSensores(datos) {
  const errores = [];

  // Validar temperatura
  if (!REGEX_PATTERNS.temperatura.test(datos.temperatura)) {
    errores.push("Temperatura inválida (formato esperado: -50 a 70, ej: 23.5)");
  } else if (!validarRango(datos.temperatura, -50, 70)) {
    errores.push("Temperatura fuera de rango (-50 a 70°C)");
  }

  // Validar humedad
  if (!REGEX_PATTERNS.humedad.test(datos.humedad)) {
    errores.push("Humedad inválida (formato esperado: 0-100, ej: 65.5)");
  } else if (!validarRango(datos.humedad, 0, 100)) {
    errores.push("Humedad fuera de rango (0-100%)");
  }

  // Validar presión
  if (!REGEX_PATTERNS.presion.test(datos.presion)) {
    errores.push("Presión inválida (formato esperado: 800-1200, ej: 1013.25)");
  } else if (!validarRango(datos.presion, 800, 1200)) {
    errores.push("Presión fuera de rango (800-1200 hPa)");
  }

  // Validar lluvia
  if (!REGEX_PATTERNS.lluvia.test(datos.lluvia)) {
    errores.push("Lluvia inválida (valores permitidos: SI o NO)");
  }

  // Validar humedad del suelo
  if (!REGEX_PATTERNS.valorAnalogico.test(datos.humedadSuelo)) {
    errores.push("Humedad del suelo inválida (formato esperado: 0-1023)");
  } else if (!validarRango(datos.humedadSuelo, 0, 1023)) {
    errores.push("Humedad del suelo fuera de rango (0-1023)");
  }

  // Validar gas
  if (!REGEX_PATTERNS.valorAnalogico.test(datos.gas)) {
    errores.push("Gas inválido (formato esperado: 0-1023)");
  } else if (!validarRango(datos.gas, 0, 1023)) {
    errores.push("Gas fuera de rango (0-1023)");
  }

  return errores;
}

/**
 * Valida parámetros de consulta (fechas, rangos)
 */
function validarParametrosConsulta(params) {
  const errores = [];

  if (params.fecha_inicio && !REGEX_PATTERNS.fecha.test(params.fecha_inicio)) {
    errores.push("Fecha inicio inválida (formato: YYYY-MM-DD)");
  }

  if (params.fecha_fin && !REGEX_PATTERNS.fecha.test(params.fecha_fin)) {
    errores.push("Fecha fin inválida (formato: YYYY-MM-DD)");
  }

  if (params.rango && !REGEX_PATTERNS.rango.test(params.rango)) {
    errores.push("Rango inválido (formato: min-max, ej: 20-30)");
  }

  return errores;
}

// ============================================
// ENDPOINT: Recibir lecturas del Arduino
// ============================================
app.post("/api/lecturas", (req, res) => {
  const { temperatura, humedad, presion, lluvia, humedadSuelo, gas } = req.body;

  // Validación de datos completos
  if (
    temperatura == null ||
    humedad == null ||
    presion == null ||
    !lluvia ||
    humedadSuelo == null ||
    gas == null
  ) {
    return res.status(400).json({
      error: "Datos incompletos",
      mensaje: "Todos los campos son requeridos: temperatura, humedad, presion, lluvia, humedadSuelo, gas"
    });
  }

  // Validación con expresiones regulares
  const erroresValidacion = validarDatosSensores(req.body);
  if (erroresValidacion.length > 0) {
    return res.status(400).json({
      error: "Datos inválidos",
      detalles: erroresValidacion
    });
  }

  // Determinar alertas
  const alertaTemp = parseFloat(temperatura) > 35;
  const alertaGas = parseInt(gas) > 600;
  const lluviaDetectada = lluvia.toUpperCase() === "SI";
  const porcentajeSuelo = ((parseInt(humedadSuelo) / 1023) * 100).toFixed(2);

  // Insertar en cada tabla de forma independiente
  const queries = [
    {
      sql: "INSERT INTO lecturas_temperatura (valor, alerta) VALUES (?, ?)",
      params: [parseFloat(temperatura), alertaTemp],
      nombre: "temperatura"
    },
    {
      sql: "INSERT INTO lecturas_humedad (valor) VALUES (?)",
      params: [parseFloat(humedad)],
      nombre: "humedad"
    },
    {
      sql: "INSERT INTO lecturas_presion (valor) VALUES (?)",
      params: [parseFloat(presion)],
      nombre: "presión"
    },
    {
      sql: "INSERT INTO lecturas_lluvia (detectada, alerta) VALUES (?, ?)",
      params: [lluviaDetectada, lluviaDetectada],
      nombre: "lluvia"
    },
    {
      sql: "INSERT INTO lecturas_humedad_suelo (valor_raw, valor_porcentaje) VALUES (?, ?)",
      params: [parseInt(humedadSuelo), parseFloat(porcentajeSuelo)],
      nombre: "humedad_suelo"
    },
    {
      sql: "INSERT INTO lecturas_gas (valor_raw, alerta) VALUES (?, ?)",
      params: [parseInt(gas), alertaGas],
      nombre: "gas"
    }
  ];

  // Ejecutar todas las inserciones
  let completadas = 0;
  let errores = [];

  queries.forEach(query => {
    db.query(query.sql, query.params, (err) => {
      if (err) {
        console.error(`❌ Error al insertar ${query.nombre}:`, err);
        errores.push(`Error en ${query.nombre}`);
      }

      completadas++;

      // Cuando todas las queries terminen, enviar respuesta
      if (completadas === queries.length) {
        if (errores.length > 0) {
          return res.status(500).json({
            error: "Error parcial al guardar datos",
            detalles: errores
          });
        }

        console.log("✅ Lecturas guardadas exitosamente");
        res.json({
          status: "OK",
          mensaje: "Lecturas guardadas correctamente",
          alertas: {
            temperatura: alertaTemp,
            gas: alertaGas,
            lluvia: lluviaDetectada
          }
        });
      }
    });
  });
});

// ============================================
// ENDPOINTS: Consultas por sensor específico
// ============================================

/**
 * GET /api/temperatura
 * Obtiene lecturas de temperatura
 * Parámetros opcionales: ?limit=10&fecha_inicio=2025-01-01&fecha_fin=2025-01-31
 */
app.get("/api/temperatura", (req, res) => {
  const { limit = 50, fecha_inicio, fecha_fin } = req.query;

  // Validar parámetros con regex
  const errores = validarParametrosConsulta(req.query);
  if (errores.length > 0) {
    return res.status(400).json({ error: "Parámetros inválidos", detalles: errores });
  }

  let sql = "SELECT * FROM lecturas_temperatura WHERE 1=1";
  const params = [];

  if (fecha_inicio) {
    sql += " AND fecha_registro >= ?";
    params.push(fecha_inicio);
  }

  if (fecha_fin) {
    sql += " AND fecha_registro <= ?";
    params.push(fecha_fin + " 23:59:59");
  }

  sql += " ORDER BY fecha_registro DESC LIMIT ?";
  params.push(parseInt(limit));

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("❌ Error al consultar temperatura:", err);
      return res.status(500).json({ error: "Error en la consulta" });
    }
    res.json(result);
  });
});

/**
 * GET /api/humedad
 */
app.get("/api/humedad", (req, res) => {
  const { limit = 50, fecha_inicio, fecha_fin } = req.query;

  const errores = validarParametrosConsulta(req.query);
  if (errores.length > 0) {
    return res.status(400).json({ error: "Parámetros inválidos", detalles: errores });
  }

  let sql = "SELECT * FROM lecturas_humedad WHERE 1=1";
  const params = [];

  if (fecha_inicio) {
    sql += " AND fecha_registro >= ?";
    params.push(fecha_inicio);
  }

  if (fecha_fin) {
    sql += " AND fecha_registro <= ?";
    params.push(fecha_fin + " 23:59:59");
  }

  sql += " ORDER BY fecha_registro DESC LIMIT ?";
  params.push(parseInt(limit));

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("❌ Error al consultar humedad:", err);
      return res.status(500).json({ error: "Error en la consulta" });
    }
    res.json(result);
  });
});

/**
 * GET /api/presion
 */
app.get("/api/presion", (req, res) => {
  const { limit = 50, fecha_inicio, fecha_fin } = req.query;

  const errores = validarParametrosConsulta(req.query);
  if (errores.length > 0) {
    return res.status(400).json({ error: "Parámetros inválidos", detalles: errores });
  }

  let sql = "SELECT * FROM lecturas_presion WHERE 1=1";
  const params = [];

  if (fecha_inicio) {
    sql += " AND fecha_registro >= ?";
    params.push(fecha_inicio);
  }

  if (fecha_fin) {
    sql += " AND fecha_registro <= ?";
    params.push(fecha_fin + " 23:59:59");
  }

  sql += " ORDER BY fecha_registro DESC LIMIT ?";
  params.push(parseInt(limit));

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("❌ Error al consultar presión:", err);
      return res.status(500).json({ error: "Error en la consulta" });
    }
    res.json(result);
  });
});

/**
 * GET /api/lluvia
 */
app.get("/api/lluvia", (req, res) => {
  const { limit = 50, fecha_inicio, fecha_fin } = req.query;

  const errores = validarParametrosConsulta(req.query);
  if (errores.length > 0) {
    return res.status(400).json({ error: "Parámetros inválidos", detalles: errores });
  }

  let sql = "SELECT * FROM lecturas_lluvia WHERE 1=1";
  const params = [];

  if (fecha_inicio) {
    sql += " AND fecha_registro >= ?";
    params.push(fecha_inicio);
  }

  if (fecha_fin) {
    sql += " AND fecha_registro <= ?";
    params.push(fecha_fin + " 23:59:59");
  }

  sql += " ORDER BY fecha_registro DESC LIMIT ?";
  params.push(parseInt(limit));

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("❌ Error al consultar lluvia:", err);
      return res.status(500).json({ error: "Error en la consulta" });
    }
    res.json(result);
  });
});

/**
 * GET /api/humedad-suelo
 */
app.get("/api/humedad-suelo", (req, res) => {
  const { limit = 50, fecha_inicio, fecha_fin } = req.query;

  const errores = validarParametrosConsulta(req.query);
  if (errores.length > 0) {
    return res.status(400).json({ error: "Parámetros inválidos", detalles: errores });
  }

  let sql = "SELECT * FROM lecturas_humedad_suelo WHERE 1=1";
  const params = [];

  if (fecha_inicio) {
    sql += " AND fecha_registro >= ?";
    params.push(fecha_inicio);
  }

  if (fecha_fin) {
    sql += " AND fecha_registro <= ?";
    params.push(fecha_fin + " 23:59:59");
  }

  sql += " ORDER BY fecha_registro DESC LIMIT ?";
  params.push(parseInt(limit));

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("❌ Error al consultar humedad del suelo:", err);
      return res.status(500).json({ error: "Error en la consulta" });
    }
    res.json(result);
  });
});

/**
 * GET /api/gas
 */
app.get("/api/gas", (req, res) => {
  const { limit = 50, fecha_inicio, fecha_fin } = req.query;

  const errores = validarParametrosConsulta(req.query);
  if (errores.length > 0) {
    return res.status(400).json({ error: "Parámetros inválidos", detalles: errores });
  }

  let sql = "SELECT * FROM lecturas_gas WHERE 1=1";
  const params = [];

  if (fecha_inicio) {
    sql += " AND fecha_registro >= ?";
    params.push(fecha_inicio);
  }

  if (fecha_fin) {
    sql += " AND fecha_registro <= ?";
    params.push(fecha_fin + " 23:59:59");
  }

  sql += " ORDER BY fecha_registro DESC LIMIT ?";
  params.push(parseInt(limit));

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("❌ Error al consultar gas:", err);
      return res.status(500).json({ error: "Error en la consulta" });
    }
    res.json(result);
  });
});

// ============================================
// ENDPOINT: Vista consolidada (última lectura de cada sensor)
// ============================================
app.get("/api/lecturas/ultima", (req, res) => {
  db.query("SELECT * FROM vista_ultima_lectura", (err, result) => {
    if (err) {
      console.error("❌ Error al consultar vista consolidada:", err);
      return res.status(500).json({ error: "Error en la consulta" });
    }
    res.json(result[0] || {});
  });
});

// ============================================
// ENDPOINT: Búsqueda con filtros avanzados
// ============================================
app.get("/api/buscar/:sensor", (req, res) => {
  const { sensor } = req.params;
  const { rango, fecha_inicio, fecha_fin, limit = 100 } = req.query;

  // Validar sensor
  const sensoresValidos = ["temperatura", "humedad", "presion", "lluvia", "humedad-suelo", "gas"];
  if (!sensoresValidos.includes(sensor)) {
    return res.status(400).json({
      error: "Sensor inválido",
      sensores_validos: sensoresValidos
    });
  }

  // Validar parámetros
  const errores = validarParametrosConsulta(req.query);
  if (errores.length > 0) {
    return res.status(400).json({ error: "Parámetros inválidos", detalles: errores });
  }

  // Construir tabla según sensor
  const tablas = {
    "temperatura": "lecturas_temperatura",
    "humedad": "lecturas_humedad",
    "presion": "lecturas_presion",
    "lluvia": "lecturas_lluvia",
    "humedad-suelo": "lecturas_humedad_suelo",
    "gas": "lecturas_gas"
  };

  let sql = `SELECT * FROM ${tablas[sensor]} WHERE 1=1`;
  const params = [];

  // Filtro por rango de valores
  if (rango && REGEX_PATTERNS.rango.test(rango)) {
    const [min, max] = rango.split('-').map(parseFloat);
    const columna = (sensor === "humedad-suelo" || sensor === "gas") ? "valor_raw" : "valor";
    sql += ` AND ${columna} BETWEEN ? AND ?`;
    params.push(min, max);
  }

  // Filtro por fechas
  if (fecha_inicio) {
    sql += " AND fecha_registro >= ?";
    params.push(fecha_inicio);
  }

  if (fecha_fin) {
    sql += " AND fecha_registro <= ?";
    params.push(fecha_fin + " 23:59:59");
  }

  sql += " ORDER BY fecha_registro DESC LIMIT ?";
  params.push(parseInt(limit));

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error(`❌ Error en búsqueda de ${sensor}:`, err);
      return res.status(500).json({ error: "Error en la búsqueda" });
    }
    res.json({
      sensor,
      total: result.length,
      filtros: { rango, fecha_inicio, fecha_fin },
      datos: result
    });
  });
});

// ============================================
// ENDPOINT: Estadísticas por sensor
// ============================================
app.get("/api/estadisticas/:sensor", (req, res) => {
  const { sensor } = req.params;

  const tablas = {
    "temperatura": { tabla: "lecturas_temperatura", columna: "valor" },
    "humedad": { tabla: "lecturas_humedad", columna: "valor" },
    "presion": { tabla: "lecturas_presion", columna: "valor" },
    "humedad-suelo": { tabla: "lecturas_humedad_suelo", columna: "valor_raw" },
    "gas": { tabla: "lecturas_gas", columna: "valor_raw" }
  };

  if (!tablas[sensor]) {
    return res.status(400).json({ error: "Sensor inválido para estadísticas" });
  }

  const { tabla, columna } = tablas[sensor];

  const sql = `
    SELECT
      COUNT(*) as total_registros,
      MIN(${columna}) as minimo,
      MAX(${columna}) as maximo,
      AVG(${columna}) as promedio,
      MIN(fecha_registro) as primera_lectura,
      MAX(fecha_registro) as ultima_lectura
    FROM ${tabla}
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error(`❌ Error al obtener estadísticas de ${sensor}:`, err);
      return res.status(500).json({ error: "Error al calcular estadísticas" });
    }
    res.json({
      sensor,
      estadisticas: result[0]
    });
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(3000, () => {
  console.log("🚀 Servidor API corriendo en puerto 3000");
  console.log("📊 Endpoints disponibles:");
  console.log("   POST /api/lecturas");
  console.log("   GET  /api/temperatura");
  console.log("   GET  /api/humedad");
  console.log("   GET  /api/presion");
  console.log("   GET  /api/lluvia");
  console.log("   GET  /api/humedad-suelo");
  console.log("   GET  /api/gas");
  console.log("   GET  /api/lecturas/ultima");
  console.log("   GET  /api/buscar/:sensor");
  console.log("   GET  /api/estadisticas/:sensor");
});
