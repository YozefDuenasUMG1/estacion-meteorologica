/*
 * DIAGNÓSTICO AUTOMÁTICO DEL DHT22
 *
 * Este sketch prueba el sensor DHT22 en diferentes pines para identificar:
 * - Si el sensor funciona (problema de pin del Arduino)
 * - Si el sensor no funciona (sensor dañado o falta resistencia pull-up)
 *
 * INSTRUCCIONES:
 * 1. Mantén el DHT22 conectado como está
 * 2. Sube este sketch
 * 3. Abre el monitor serial a 9600 baud
 * 4. Lee los resultados
 */

#include <DHT.h>

#define DHTTYPE DHT22

// Pines a probar
int pinesAPrueba[] = {2, 4, 5, 6};
int numPines = 4;

void setup() {
  Serial.begin(9600);
  delay(2000);

  Serial.println("===========================================");
  Serial.println("  DIAGNOSTICO AUTOMATICO DEL SENSOR DHT22");
  Serial.println("===========================================\n");

  Serial.println("Este test probara el DHT22 en los siguientes pines:");
  Serial.println("- Pin 2 (configuracion actual)");
  Serial.println("- Pin 4");
  Serial.println("- Pin 5");
  Serial.println("- Pin 6\n");

  Serial.println("Conecta el cable DATA del DHT22 al pin 2 y presiona RESET\n");
  Serial.println("Iniciando pruebas en 3 segundos...\n");
  delay(3000);

  Serial.println("===========================================\n");

  // Probar cada pin
  for (int i = 0; i < numPines; i++) {
    int pin = pinesAPrueba[i];
    probarDHT22EnPin(pin);
    delay(2000);
  }

  Serial.println("\n===========================================");
  Serial.println("  DIAGNÓSTICO COMPLETO");
  Serial.println("===========================================\n");

  Serial.println("INTERPRETACIÓN DE RESULTADOS:\n");

  Serial.println("Si TODOS los pines muestran 'FALLO':");
  Serial.println("  -> El sensor DHT22 está dañado, O");
  Serial.println("  -> Falta resistencia pull-up de 10K entre DATA y VCC\n");

  Serial.println("Si ALGÚN pin muestra 'EXITO':");
  Serial.println("  -> Usa ese pin en tu código principal");
  Serial.println("  -> El pin 2 podría estar dañado\n");

  Serial.println("PRÓXIMO PASO:");
  Serial.println("1. Lee los resultados arriba");
  Serial.println("2. Si encontró un pin que funciona, cámbialo en el código principal");
  Serial.println("3. Si ningún pin funciona, verifica la resistencia pull-up de 10K");
  Serial.println("   entre el pin DATA y VCC (5V)\n");
}

void probarDHT22EnPin(int pin) {
  Serial.print(">>> Probando Pin ");
  Serial.print(pin);
  Serial.println(" <<<");

  if (pin == 2) {
    Serial.println("(Este es el pin actual en tu configuración)\n");
  }

  // Crear instancia temporal del DHT22
  DHT dhtTemp(pin, DHTTYPE);
  dhtTemp.begin();

  Serial.println("Esperando estabilización (3 segundos)...");
  delay(3000);

  // Intentar 3 lecturas
  bool exito = false;
  float temp, hum;

  for (int intento = 1; intento <= 3; intento++) {
    Serial.print("  Intento ");
    Serial.print(intento);
    Serial.print("/3: ");

    temp = dhtTemp.readTemperature();
    hum = dhtTemp.readHumidity();

    if (!isnan(temp) && !isnan(hum)) {
      Serial.println("LECTURA EXITOSA!");
      Serial.print("    Temperatura: ");
      Serial.print(temp);
      Serial.println(" °C");
      Serial.print("    Humedad: ");
      Serial.print(hum);
      Serial.println(" %");
      exito = true;
      break;
    } else {
      Serial.println("Fallo (NAN)");
      delay(2000);
    }
  }

  Serial.println();
  Serial.println("RESULTADO:");
  if (exito) {
    Serial.print("✓ EXITO - El DHT22 FUNCIONA en el Pin ");
    Serial.println(pin);
    Serial.println("  -> Usa este pin en tu código principal!");
  } else {
    Serial.print("✗ FALLO - El DHT22 NO responde en el Pin ");
    Serial.println(pin);
  }

  Serial.println("\n-------------------------------------------\n");
}

void loop() {
  // No hacer nada en el loop
  delay(10000);

  Serial.println("\nPara volver a ejecutar el test, presiona el botón RESET\n");
}
