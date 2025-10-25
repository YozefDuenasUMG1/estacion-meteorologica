import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { db } from "./db.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Ruta para guardar lecturas
app.post("/api/lecturas", (req, res) => {
const { temperatura, humedad, presion, lluvia, humedadSuelo, gas } = req.body;

// Validación básica
if (
temperatura == null ||
humedad == null ||
presion == null ||
!lluvia ||
humedadSuelo == null ||
gas == null
) {
return res.status(400).send({ error: "Datos incompletos o inválidos" });
}

// Insertar en MySQL
const sql =
"INSERT INTO registro (temperatura, humedad, presion, lluvia, humedadSuelo, gas) VALUES (?, ?, ?, ?, ?, ?)";
db.query(sql, [temperatura, humedad, presion, lluvia, humedadSuelo, gas], err => {
if (err) {
console.error("❌ Error al insertar en la base de datos:", err);
return res.status(500).send({ error: "Error al guardar en la base de datos" });
}
res.send({ status: "OK" });
});
});

// Ruta para obtener las últimas 10 lecturas
app.get("/api/lecturas", (req, res) => {
db.query("SELECT * FROM registro ORDER BY id DESC LIMIT 10", (err, result) => {
if (err) {
console.error("❌ Error al consultar datos:", err);
return res.status(500).send({ error: "Error en la consulta" });
}
res.send(result);
});
});

app.listen(3000, () => console.log("🚀 Servidor API corriendo en puerto 3000"));
