# WebSerial Pro DJ

WebSerial Pro DJ is a browser-based DJ application that allows you to mix tracks using WebSerial to connect with external hardware (like an Arduino or ESP32). It features a particle-based visualizer that reacts to the music and FX levels.

## Features

- **Dual Deck Interface**: Track A and Track B with independent controls.
- **FX Controls**: Adjust Pitch, Volume, Bass, and Reverb for each deck.
- **Crossfader**: Smoothly transition between tracks.
- **Hardware Integration**: Connect external devices via WebSerial.
- **IR Remote Mapping**: Control the DJ decks using an IR remote.
- **Reactive Visualizer**: Particle system that responds to audio and FX parameters.

## Hardware Control (IR Mapping)

The application supports IR remote commands:
- `0xBF40FF00`: Play Selected
- `0xBB44FF00`: Nav Up
- `0xBC43FF00`: Nav Down
- `0xF807FF00`: Crossfade A
- `0xF609FF00`: Crossfade B

## Demo Video

![Project Demo](IMG_7006.MOV)

## Getting Started

1. Open `index.html` in a WebSerial-compatible browser (like Chrome or Edge).
2. Connect your hardware device via the "CONNECT DEVICE" button.
3. Start mixing!
