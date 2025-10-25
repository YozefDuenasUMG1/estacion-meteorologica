import mysql from "mysql2";

// Configuración de conexión a MySQL
export const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "estacion_meteorologica",
  timezone: "+00:00", // UTC
  dateStrings: false, // Mantener objetos Date
  multipleStatements: false // Seguridad: evitar múltiples statements
});

// Conexión a la base de datos
db.connect(err => {
  if (err) {
    console.error("❌ Error al conectar a MySQL:", err);
    process.exit(1); // Salir si no hay conexión
  } else {
    console.log("✅ Conectado a la base de datos MySQL.");
  }
});

// Manejo de errores de conexión
db.on('error', (err) => {
  console.error('❌ Error en la conexión MySQL:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('La conexión con la base de datos se perdió.');
  }
});