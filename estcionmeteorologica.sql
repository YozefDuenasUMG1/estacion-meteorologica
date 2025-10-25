-- ============================================
-- SCRIPT DE MIGRACIÓN COMPLETA
-- Sistema de Estación Meteorológica
-- ============================================

-- Eliminar base de datos anterior si existe
DROP DATABASE IF EXISTS estacion_meteorologica;

-- Crear base de datos
CREATE DATABASE estacion_meteorologica;
USE estacion_meteorologica;

-- ============================================
-- TABLA: lecturas_temperatura
-- Almacena registros de temperatura en °C
-- ============================================
CREATE TABLE lecturas_temperatura (
  id INT AUTO_INCREMENT PRIMARY KEY,
  valor DECIMAL(5,2) NOT NULL COMMENT 'Temperatura en grados Celsius',
  alerta BOOLEAN DEFAULT FALSE COMMENT 'Indica si supera umbral de alerta (>35°C)',
  fecha_registro DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Fecha y hora con precisión de milisegundos',
  INDEX idx_fecha_temperatura (fecha_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Registros del sensor DHT22 - Temperatura';

-- ============================================
-- TABLA: lecturas_humedad
-- Almacena registros de humedad relativa en %
-- ============================================
CREATE TABLE lecturas_humedad (
  id INT AUTO_INCREMENT PRIMARY KEY,
  valor DECIMAL(5,2) NOT NULL COMMENT 'Humedad relativa en porcentaje (0-100%)',
  fecha_registro DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Fecha y hora con precisión de milisegundos',
  INDEX idx_fecha_humedad (fecha_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Registros del sensor DHT22 - Humedad';

-- ============================================
-- TABLA: lecturas_presion
-- Almacena registros de presión atmosférica en hPa
-- ============================================
CREATE TABLE lecturas_presion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  valor DECIMAL(7,2) NOT NULL COMMENT 'Presión atmosférica en hectopascales (hPa)',
  fecha_registro DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Fecha y hora con precisión de milisegundos',
  INDEX idx_fecha_presion (fecha_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Registros del sensor BMP280 - Presión';

-- ============================================
-- TABLA: lecturas_lluvia
-- Almacena detección de lluvia (sensor digital)
-- ============================================
CREATE TABLE lecturas_lluvia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  detectada BOOLEAN NOT NULL COMMENT 'TRUE si se detecta lluvia, FALSE si no',
  alerta BOOLEAN DEFAULT FALSE COMMENT 'Indica si hay alerta de lluvia activa',
  fecha_registro DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Fecha y hora con precisión de milisegundos',
  INDEX idx_fecha_lluvia (fecha_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Registros del sensor de lluvia digital';

-- ============================================
-- TABLA: lecturas_humedad_suelo
-- Almacena lecturas analógicas de humedad del suelo
-- ============================================
CREATE TABLE lecturas_humedad_suelo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  valor_raw INT NOT NULL COMMENT 'Valor analógico crudo (0-1023)',
  valor_porcentaje DECIMAL(5,2) COMMENT 'Conversión a porcentaje de humedad',
  fecha_registro DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Fecha y hora con precisión de milisegundos',
  INDEX idx_fecha_suelo (fecha_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Registros del sensor de humedad de suelo';

-- ============================================
-- TABLA: lecturas_gas
-- Almacena lecturas del sensor de gas (calidad del aire)
-- ============================================
CREATE TABLE lecturas_gas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  valor_raw INT NOT NULL COMMENT 'Valor analógico crudo (0-1023)',
  alerta BOOLEAN DEFAULT FALSE COMMENT 'Indica si supera umbral de alerta (>600)',
  fecha_registro DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Fecha y hora con precisión de milisegundos',
  INDEX idx_fecha_gas (fecha_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Registros del sensor de gas MQ-135';

-- ============================================
-- VISTA: lecturas_consolidadas
-- Consolida la última lectura de cada sensor
-- ============================================
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

-- ============================================
-- DATOS DE PRUEBA (Opcional)
-- ============================================
-- Insertar algunas lecturas de ejemplo
INSERT INTO lecturas_temperatura (valor, alerta) VALUES
  (23.5, FALSE), (24.1, FALSE), (36.2, TRUE), (22.8, FALSE), (25.3, FALSE);

INSERT INTO lecturas_humedad (valor) VALUES
  (65.2), (68.5), (72.1), (60.8), (66.3);

INSERT INTO lecturas_presion (valor) VALUES
  (1013.25), (1012.80), (1014.10), (1013.50), (1012.95);

INSERT INTO lecturas_lluvia (detectada, alerta) VALUES
  (FALSE, FALSE), (FALSE, FALSE), (TRUE, TRUE), (FALSE, FALSE), (FALSE, FALSE);

INSERT INTO lecturas_humedad_suelo (valor_raw, valor_porcentaje) VALUES
  (512, 50.0), (600, 58.6), (450, 44.0), (520, 50.8), (480, 46.9);

INSERT INTO lecturas_gas (valor_raw, alerta) VALUES
  (320, FALSE), (450, FALSE), (650, TRUE), (380, FALSE), (410, FALSE);

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 'Base de datos creada exitosamente' as mensaje;
SHOW TABLES;
