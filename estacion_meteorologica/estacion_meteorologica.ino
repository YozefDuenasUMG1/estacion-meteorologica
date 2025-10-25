#include <WiFiS3.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_BMP280.h>
#include <ArduinoJson.h>
#include <LiquidCrystal_I2C.h>

// ==== CONFIGURACIÓN DE SENSORES ====
#define DHTPIN 2
#define DHTTYPE DHT22
#define SENSOR_LLUVIADIG 3
#define SENSOR_SUELO A0
#define SENSOR_GAS A1
#define LED_PIN 7
#define BUZZER_PIN 8

DHT dht(DHTPIN, DHTTYPE);
Adafruit_BMP280 bmp;
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ==== CONFIGURACIÓN DE RED ====
char ssid[] = "CLARO_aJKvt5";
char pass[] = "C6707B2BD7";
WiFiClient client;
char server[] = "192.168.1.164"; // IP de tu servidor Node.js

// ==== FUNCIONES AUXILIARES ====
// Leer DHT22 con reintentos (mas confiable)
float leerDHT22_Temperatura() {
  for (int i = 0; i < 3; i++) {  // Intentar hasta 3 veces
    float temp = dht.readTemperature();
    if (!isnan(temp)) {
      return temp;
    }
    Serial.print("Reintento DHT22 temperatura (");
    Serial.print(i + 1);
    Serial.println("/3)");
    delay(2000);  // Esperar 2 segundos entre reintentos
  }
  return NAN;  // Retornar NAN si todos los intentos fallan
}

float leerDHT22_Humedad() {
  for (int i = 0; i < 3; i++) {  // Intentar hasta 3 veces
    float hum = dht.readHumidity();
    if (!isnan(hum)) {
      return hum;
    }
    Serial.print("Reintento DHT22 humedad (");
    Serial.print(i + 1);
    Serial.println("/3)");
    delay(2000);  // Esperar 2 segundos entre reintentos
  }
  return NAN;  // Retornar NAN si todos los intentos fallan
}

// ==== SETUP ====
void setup() {
  Serial.begin(9600);

  pinMode(SENSOR_LLUVIADIG, INPUT);
  pinMode(SENSOR_SUELO, INPUT);
  pinMode(SENSOR_GAS, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  Serial.println("Inicializando sensores...");

  // Inicializar DHT22 (necesita 2 segundos para estabilizarse)
  dht.begin();
  Serial.println("DHT22 iniciado, esperando estabilizacion...");
  delay(2000);

  // Hacer lectura de prueba del DHT22
  Serial.println("Probando sensor DHT22...");
  float testTemp = dht.readTemperature();
  float testHum = dht.readHumidity();

  if (isnan(testTemp) || isnan(testHum)) {
    Serial.println("ERROR: DHT22 no responde correctamente!");
    Serial.println("Verifica:");
    Serial.println("- Cable de datos conectado al pin 2");
    Serial.println("- Alimentacion VCC y GND");
    Serial.println("- Resistencia pull-up de 10K ohm");
  } else {
    Serial.println("DHT22 OK - Lectura de prueba:");
    Serial.print("  Temperatura: "); Serial.print(testTemp); Serial.println(" C");
    Serial.print("  Humedad: "); Serial.print(testHum); Serial.println(" %");
  }

  // Inicializar BMP280 - Intentar primero 0x76, luego 0x77
  if (!bmp.begin(0x76)) {
    Serial.println("BMP280 no encontrado en 0x76, intentando 0x77...");
    if (!bmp.begin(0x77)) {
      Serial.println("ERROR: BMP280 no encontrado");
    } else {
      Serial.println("BMP280 OK en direccion 0x77");
    }
  } else {
    Serial.println("BMP280 OK en direccion 0x76");
  }

  // Inicializar LCD
  lcd.begin(16, 2);
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Conectando WiFi");

  // Conexión WiFi
  while (WiFi.begin(ssid, pass) != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
    digitalWrite(LED_PIN, millis() % 1000 < 500 ? HIGH : LOW); // parpadeo mientras conecta
  }

  lcd.clear();
  lcd.print("WiFi conectado");
  Serial.println("\nWiFi conectado.");
  digitalWrite(LED_PIN, HIGH); // LED fijo cuando WiFi OK
  delay(2000);
}

// ==== LOOP PRINCIPAL ====
void loop() {
  // Usar funciones de lectura con reintentos para mayor confiabilidad
  float temp = leerDHT22_Temperatura();
  float hum = leerDHT22_Humedad();
  float pres = bmp.readPressure() / 100.0;
  int lluvia = digitalRead(SENSOR_LLUVIADIG);
  int humedadSuelo = analogRead(SENSOR_SUELO);
  int gas = analogRead(SENSOR_GAS);

  // Debug: Mostrar valores leídos
  Serial.println("\n--- Lecturas de sensores ---");
  Serial.print("Temperatura: "); Serial.println(temp);
  Serial.print("Humedad: "); Serial.println(hum);
  Serial.print("Presion: "); Serial.println(pres);
  Serial.print("Lluvia (digital): "); Serial.println(lluvia);
  Serial.print("Humedad suelo: "); Serial.println(humedadSuelo);
  Serial.print("Gas: "); Serial.println(gas);

  String lluviaTxt = lluvia == 0 ? "SI" : "NO";

  // Mostrar datos en LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("T:");
  lcd.print(temp, 1);
  lcd.print("C H:");
  lcd.print(hum, 1);
  lcd.print("%");

  lcd.setCursor(0, 1);
  lcd.print("Pres:");
  lcd.print(pres, 1);
  lcd.print("hPa");

  // Alertas LED y Buzzer
  bool alerta = false;

  if (temp > 35) {
    tone(BUZZER_PIN, 1000, 500); // beep medio segundo
    lcd.setCursor(0, 1);
    lcd.print("ALERTA: TEMP!");
    alerta = true;
  } 
  if (gas > 90) {
    tone(BUZZER_PIN, 1500, 1000); // beep largo
    lcd.setCursor(0, 1);
    lcd.print("ALERTA: GAS!");
    alerta = true;
  }
  if (lluviaTxt == "SI") {
    tone(BUZZER_PIN, 800, 300); // beep corto
    lcd.setCursor(0, 1);
    lcd.print("ALERTA: LLUVIA!");
    alerta = true;
  }

  if (!alerta) {
    noTone(BUZZER_PIN); // apagar buzzer
    digitalWrite(LED_PIN, HIGH); // LED WiFi OK
  } else {
    digitalWrite(LED_PIN, millis() % 500 < 250 ? HIGH : LOW); // parpadeo LED alerta
  }

  // Validacion de lecturas antes de enviar
  bool datosValidos = true;

  // Validar temperatura (-50 a 70)
  if (isnan(temp)) {
    Serial.println("ERROR CRITICO: DHT22 no responde - Temperatura NAN");
    Serial.println("SOLUCION:");
    Serial.println("  1. Verifica conexion del pin de datos (Pin 2)");
    Serial.println("  2. Verifica alimentacion VCC (5V) y GND");
    Serial.println("  3. Agrega resistencia pull-up 10K entre DATA y VCC");
    Serial.println("  4. Prueba con otro sensor DHT22");
    datosValidos = false;
  } else if (temp < -50 || temp > 70) {
    Serial.println("ADVERTENCIA: Temperatura fuera de rango");
    datosValidos = false;
  }

  // Validar humedad (0 a 100)
  if (isnan(hum)) {
    Serial.println("ERROR CRITICO: DHT22 no responde - Humedad NAN");
    datosValidos = false;
  } else if (hum < 0 || hum > 100) {
    Serial.println("ADVERTENCIA: Humedad fuera de rango");
    datosValidos = false;
  }

  // Validar presion (800 a 1200)
  if (isnan(pres) || pres < 800 || pres > 1200) {
    Serial.println("ADVERTENCIA: Presion fuera de rango");
    datosValidos = false;
  }

  // Envio de datos JSON solo si son validos
  if (datosValidos) {
    StaticJsonDocument<256> json;
    json["temperatura"] = temp;
    json["humedad"] = hum;
    json["presion"] = pres;
    json["lluvia"] = lluviaTxt;
    json["humedadSuelo"] = humedadSuelo;
    json["gas"] = gas;

    String payload;
    serializeJson(json, payload);

    if (client.connect(server, 3000)) {
      client.println("POST /api/lecturas HTTP/1.1");
      client.println("Host: servidor");
      client.println("Content-Type: application/json");
      client.print("Content-Length: ");
      client.println(payload.length());
      client.println();
      client.print(payload);

      // Esperar y leer respuesta del servidor
      delay(100);
      while (client.available()) {
        String line = client.readStringUntil('\n');
        if (line.indexOf("status") > 0) {
          Serial.println("Respuesta del servidor:");
          Serial.println(line);
        }
      }

      client.stop();
      Serial.println("Datos enviados correctamente:");
      Serial.println(payload);
    } else {
      Serial.println("Error al conectar al servidor");
      digitalWrite(LED_PIN, LOW); // Apagar LED si falla
      delay(500);
      digitalWrite(LED_PIN, HIGH); // Encender de nuevo
    }
  } else {
    Serial.println("ERROR: Datos invalidos, no se enviaron al servidor");
    // Parpadeo rapido del LED para indicar error
    for (int i = 0; i < 5; i++) {
      digitalWrite(LED_PIN, LOW);
      delay(100);
      digitalWrite(LED_PIN, HIGH);
      delay(100);
    }
  }

  delay(10000); // cada 10 segundos
}