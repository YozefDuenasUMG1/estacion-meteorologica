
USE estacion_meteorologica;

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
