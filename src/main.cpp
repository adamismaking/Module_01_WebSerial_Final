#include <Arduino.h>
#include <IRremote.hpp>

const int POT_PIN = A0;
const int BTN_A_PIN = 4;
const int BTN_B_PIN = 5;
const int IR_PIN = 11;
const int LED_R = 9;
const int LED_G = 10;
const int LED_B = 6;

char activeDeck = 'A';
float smoothedPot = 0;
const float filterAlpha = 0.15;
int lastSentVal = -1;

void setup() {
  Serial.begin(9600);
  
  // Setup IR Receiver
  IrReceiver.begin(IR_PIN, ENABLE_LED_FEEDBACK);
  
  pinMode(BTN_A_PIN, INPUT_PULLUP);
  pinMode(BTN_B_PIN, INPUT_PULLUP);
  pinMode(LED_R, OUTPUT);
  pinMode(LED_G, OUTPUT);
  pinMode(LED_B, OUTPUT);
  
  Serial.println("SYSTEM:READY");
  
  // Initial Deck A State (Red)
  analogWrite(LED_R, 255);
  analogWrite(LED_G, 0);
  analogWrite(LED_B, 0);
  
  smoothedPot = analogRead(POT_PIN);
}

void loop() {
  // Physical Button A Logic
  if (digitalRead(BTN_A_PIN) == LOW) {
    // Explicitly send the event every time it's pressed for debugging
    Serial.println("BUTTON_EVENT:DECK_A_PRESSED");
    if (activeDeck != 'A') {
      activeDeck = 'A';
      analogWrite(LED_R, 255);
      analogWrite(LED_G, 0);
      analogWrite(LED_B, 0);
    }
    delay(300); // Robust debounce
  }

  // Physical Button B Logic
  if (digitalRead(BTN_B_PIN) == LOW) {
    Serial.println("BUTTON_EVENT:DECK_B_PRESSED");
    if (activeDeck != 'B') {
      activeDeck = 'B';
      analogWrite(LED_R, 0);
      analogWrite(LED_G, 0);
      analogWrite(LED_B, 255);
    }
    delay(300); // Robust debounce
  }

  // Handle IR Data
  if (IrReceiver.decode()) {
    Serial.print("IR_EVENT:CODE_0x");
    Serial.println(IrReceiver.decodedIRData.decodedRawData, HEX);
    IrReceiver.resume(); 
  }

  // Potentiometer Smoothing
  int rawVal = analogRead(POT_PIN);
  smoothedPot = (rawVal * filterAlpha) + (smoothedPot * (1.0 - filterAlpha));
  int currentVal = map((int)smoothedPot, 0, 1023, 0, 100);
  
  if (currentVal != lastSentVal) {
    lastSentVal = currentVal;
    Serial.print("POT_VAL:");
    Serial.println(currentVal);
  }

  delay(10);
}
