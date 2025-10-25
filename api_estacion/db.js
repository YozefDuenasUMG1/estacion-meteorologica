import mysql from "mysql2";

export const db = mysql.createConnection({
host: "localhost",
user: "root",
password: "12345",
database: "estacion_meteorologica"
});

db.connect(err => {
if (err) {
console.error("❌ Error al conectar a MySQL:", err);
} else {
console.log("✅ Conectado a la base de datos MySQL.");
}
});