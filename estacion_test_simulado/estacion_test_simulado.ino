#include <WiFiS3.h>
#include <ArduinoJson.h>

// ==== MODO DE PRUEBA - VALORES SIMULADOS ====
// Este código NO requiere sensores conectados
// Genera valores aleatorios dentro de rangos válidos

#define LED_PIN 7
#define BUZZER_PIN 8

// ==== CONFIGURACIÓN DE RED ====
char ssid[] = "CLARO_aJKvt5";
char pass[] = "C6707B2BD7";
WiFiClient client;
char server[] = "192.168.1.164"; // IP de tu servidor Node.js

// ==== SETUP ====
void setup() {
  Serial.begin(9600);

  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  Serial.println("=== MODO SIMULACION - SIN SENSORES FISICOS ===");
  Serial.println("Conectando a WiFi...");

  // Conexión WiFi
  while (WiFi.begin(ssid, pass) != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
    digitalWrite(LED_PIN, millis() % 1000 < 500 ? HIGH : LOW); // parpadeo mientras conecta
  }

  Serial.println("\n=== WiFi conectado! ===");
  Serial.print("IP asignada: ");
  Serial.println(WiFi.localIP());
  digitalWrite(LED_PIN, HIGH); // LED fijo cuando WiFi OK
  delay(2000);
}

// ==== LOOP PRINCIPAL ====
void loop() {
  // VALORES SIMULADOS (cambiarán en cada iteración)
  float temp = random(200, 300) / 10.0;        // 20.0 - 30.0°C
  float hum = random(400, 800) / 10.0;         // 40.0 - 80.0%
  float pres = random(10100, 10200) / 10.0;    // 1010.0 - 1020.0 hPa
  String lluviaTxt = random(0, 10) > 7 ? "SI" : "NO";  // 30% probabilidad de lluvia
  int humedadSuelo = random(300, 700);         // 300 - 700 (valor analógico)
  int gas = random(200, 500);                  // 200 - 500 (valor analógico)

  Serial.println("\n========================================");
  Serial.println("VALORES SIMULADOS:");
  Serial.print("  Temperatura: "); Serial.print(temp); Serial.println("°C");
  Serial.print("  Humedad: "); Serial.print(hum); Serial.println("%");
  Serial.print("  Presion: "); Serial.print(pres); Serial.println(" hPa");
  Serial.print("  Lluvia: "); Serial.println(lluviaTxt);
  Serial.print("  Humedad Suelo: "); Serial.println(humedadSuelo);
  Serial.print("  Gas: "); Serial.println(gas);
  Serial.println("========================================");

  // Crear JSON
  StaticJsonDocument<256> json;
  json["temperatura"] = temp;
  json["humedad"] = hum;
  json["presion"] = pres;
  json["lluvia"] = lluviaTxt;
  json["humedadSuelo"] = humedadSuelo;
  json["gas"] = gas;

  String payload;
  serializeJson(json, payload);

  Serial.println("\nPayload JSON:");
  Serial.println(payload);

  // Enviar al servidor
  Serial.print("\nConectando al servidor ");
  Serial.print(server);
  Serial.println(":3000...");

  if (client.connect(server, 3000)) {
    Serial.println("✓ Conexion establecida!");

    // Enviar request HTTP POST
    client.println("POST /api/lecturas HTTP/1.1");
    client.print("Host: ");
    client.println(server);
    client.println("Content-Type: application/json");
    client.print("Content-Length: ");
    client.println(payload.length());
    client.println();
    client.print(payload);

    Serial.println("✓ Datos enviados al servidor");

    // Esperar y leer respuesta del servidor
    delay(500);
    Serial.println("\n--- RESPUESTA DEL SERVIDOR ---");
    while (client.available()) {
      String line = client.readStringUntil('\n');
      Serial.println(line);
    }
    Serial.println("--- FIN RESPUESTA ---");

    client.stop();

    // LED parpadeo exitoso
    digitalWrite(LED_PIN, LOW);
    delay(100);
    digitalWrite(LED_PIN, HIGH);

  } else {
    Serial.println("✗ ERROR: No se pudo conectar al servidor");
    Serial.println("  Verifica:");
    Serial.println("  1. IP del servidor es correcta");
    Serial.println("  2. Servidor Node.js está corriendo");
    Serial.println("  3. Ambos están en la misma red WiFi");

    // Parpadeo rápido de error
    for (int i = 0; i < 5; i++) {
      digitalWrite(LED_PIN, LOW);
      delay(100);
      digitalWrite(LED_PIN, HIGH);
      delay(100);
    }
  }

  Serial.println("\nEsperando 10 segundos para siguiente envio...\n");
  delay(10000); // cada 10 segundos
}
