import { songs } from './songs.js';

let port, writer, audioCtx;
const decks = { 
    A: { audio: null, analyser: null, gain: null, cross: null, selectedIdx: 0, isPlaying: false }, 
    B: { audio: null, analyser: null, gain: null, cross: null, selectedIdx: 0, isPlaying: false } 
};

let activeDeck = 'A';
const PARAMS = ['pitch', 'volume', 'bass', 'reverb'];
let activeParamIdx = 1; 
let focusedParam = PARAMS[activeParamIdx]; 

const IR_MAPPING = {
    '0xBF40FF00': 'PLAY_SELECTED', 
    '0xBB44FF00': 'NAV_UP',       
    '0xBC43FF00': 'NAV_DOWN',     
    '0xF807FF00': 'XFADE_A',      
    '0xF609FF00': 'XFADE_B'       
};

// --- Particle System ---
const pCanvas = document.getElementById('particles');
const pCtx = pCanvas.getContext('2d');
let particles = [];

class Particle {
    constructor(side, color, fx) {
        this.side = side; // 'left' or 'right'
        this.color = color;
        this.x = side === 'left' ? 0 : pCanvas.width;
        this.y = Math.random() * pCanvas.height;
        
        // Behavior based on FX
        const speedBase = 2 + (fx.pitch * 5);
        this.vx = side === 'left' ? Math.random() * speedBase : -Math.random() * speedBase;
        this.vy = (Math.random() - 0.5) * fx.bass * 10;
        
        this.size = 1 + (fx.volume * 5);
        this.life = 1.0;
        this.decay = 0.01 + (Math.random() * 0.02);
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }

    draw() {
        pCtx.globalAlpha = this.life;
        pCtx.fillStyle = this.color;
        pCtx.beginPath();
        pCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        pCtx.fill();
    }
}

function spawnParticles() {
    ['A', 'B'].forEach(id => {
        const d = decks[id];
        if (!d.isPlaying) return;

        // Get FX levels for particle behavior
        const fx = {
            pitch: parseFloat(document.getElementById(`pitch${id}`).value),
            volume: parseFloat(document.getElementById(`volume${id}`).value),
            bass: Math.abs(parseFloat(document.getElementById(`bass${id}`).value)) / 20,
            reverb: parseFloat(document.getElementById(`reverb${id}`).value)
        };

        // Determine particle density based on volume
        const count = Math.floor(fx.volume * 5);
        const color = id === 'A' ? '#ff0000' : '#0000ff';
        const side = id === 'A' ? 'left' : 'right';

        for(let i = 0; i < count; i++) {
            particles.push(new Particle(side, color, fx));
        }
    });
}

// --- Audio & UI ---
async function setupAudio(id) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const d = decks[id];
    d.analyser = audioCtx.createAnalyser();
    d.analyser.fftSize = 512;
    d.gain = audioCtx.createGain();
    d.cross = audioCtx.createGain();
    d.gain.connect(d.cross);
    d.cross.connect(d.analyser);
    d.analyser.connect(audioCtx.destination);
    d.gain.gain.value = 0.8;
    d.cross.gain.value = 0.5;
}

function playTrack(id, file, el) {
    if (!decks[id].analyser) setupAudio(id);
    const d = decks[id];
    if (d.audio) d.audio.pause();
    d.audio = new Audio(`Music/${file}`);
    d.audio.crossOrigin = "anonymous";
    const source = audioCtx.createMediaElementSource(d.audio);
    source.connect(d.gain);
    document.querySelectorAll(`#list${id} .track`).forEach(t => t.classList.remove('playing'));
    el.classList.add('playing');
    d.audio.play();
    d.isPlaying = true;
}

function updateParams(id) {
    const d = decks[id];
    if (!d || !d.audio) return;
    d.audio.playbackRate = document.getElementById(`pitch${id}`).value;
    d.gain.gain.value = document.getElementById(`volume${id}`).value;
}

songs.forEach((s, index) => {
    ['A', 'B'].forEach(id => {
        const div = document.createElement('div');
        div.className = 'track';
        div.id = `track-${id}-${index}`;
        div.textContent = s.replace('.mp3', '');
        div.onclick = () => {
            decks[id].selectedIdx = index;
            updateSelectionUI(id);
            playSelected(id);
        };
        document.getElementById(`list${id}`).appendChild(div);
    });
});

function updateSelectionUI(id) {
    document.querySelectorAll(`#list${id} .track`).forEach((t, i) => {
        t.classList.toggle('selected', i === decks[id].selectedIdx);
    });
}

function navigateList(direction) {
    const d = decks[activeDeck];
    if (direction === 'DOWN') { d.selectedIdx = (d.selectedIdx + 1) % songs.length; } 
    else { d.selectedIdx = (d.selectedIdx - 1 + songs.length) % songs.length; }
    updateSelectionUI(activeDeck);
    const el = document.getElementById(`track-${activeDeck}-${d.selectedIdx}`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function playSelected(id) {
    const d = decks[id];
    const trackEl = document.getElementById(`track-${id}-${d.selectedIdx}`);
    playTrack(id, songs[d.selectedIdx], trackEl);
}

function updateFocusUI() {
    document.querySelectorAll('.ctl').forEach(c => c.classList.remove('focused'));
    const focusId = `${focusedParam}${activeDeck}`;
    const targetSlider = document.getElementById(focusId);
    if (targetSlider) targetSlider.parentElement.classList.add('focused');
}

function switchDeckOrCycleParam(id) {
    if (activeDeck === id) {
        activeParamIdx = (activeParamIdx + 1) % PARAMS.length;
        focusedParam = PARAMS[activeParamIdx];
    } else {
        activeDeck = id;
    }
    const deckA = document.getElementById('deck-a');
    const deckB = document.getElementById('deck-b');
    const status = document.getElementById('deck-status');
    if (activeDeck === 'A') { deckA.classList.add('active'); deckB.classList.remove('active'); } 
    else { deckB.classList.add('active'); deckA.classList.remove('active'); }
    status.textContent = `ACTIVE CATEGORY: ${activeDeck} | CONTROL: ${focusedParam.toUpperCase()}`;
    updateFocusUI();
}

['A', 'B'].forEach(id => {
    ['pitch', 'volume', 'bass', 'reverb'].forEach((p, idx) => {
        const el = document.getElementById(`${p}${id}`);
        el.oninput = () => updateParams(id);
        el.parentElement.onclick = () => { 
            activeDeck = id;
            activeParamIdx = idx;
            focusedParam = p;
            switchDeckOrCycleParam(id); 
        };
    });
});

document.getElementById('crossfader').oninput = (e) => {
    const v = e.target.value / 100;
    if (decks.A.cross) decks.A.cross.gain.value = 1 - v;
    if (decks.B.cross) decks.B.cross.gain.value = v;
};

function moveCrossfader(direction) {
    const xfade = document.getElementById('crossfader');
    let val = parseInt(xfade.value);
    const step = 10;
    if (direction === 'A') val = Math.max(0, val - step);
    else val = Math.min(100, val + step);
    xfade.value = val;
    const v = val / 100;
    if (decks.A.cross) decks.A.cross.gain.value = 1 - v;
    if (decks.B.cross) decks.B.cross.gain.value = v;
}

let serialBuffer = "";
async function connect() {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        const decoder = new TextDecoder();
        const reader = port.readable.getReader();
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            serialBuffer += decoder.decode(value);
            const lines = serialBuffer.split("\n");
            serialBuffer = lines.pop();
            lines.forEach(line => {
                const l = line.trim();
                if (!l) return;
                if (l === "BUTTON_EVENT:DECK_A_PRESSED") switchDeckOrCycleParam('A');
                if (l === "BUTTON_EVENT:DECK_B_PRESSED") switchDeckOrCycleParam('B');
                if (l.startsWith("POT_VAL:")) {
                    const v = parseInt(l.split(":")[1]);
                    const slider = document.getElementById(`${focusedParam}${activeDeck}`);
                    if (slider) {
                        const min = parseFloat(slider.min);
                        const max = parseFloat(slider.max);
                        slider.value = min + (v / 100) * (max - min);
                        updateParams(activeDeck);
                    }
                }
                if (l.startsWith("IR_EVENT:CODE_")) {
                    const parts = l.split("_");
                    const code = parts[parts.length - 1]; 
                    const action = IR_MAPPING[code];
                    if (action === 'NAV_DOWN') navigateList('DOWN');
                    if (action === 'NAV_UP') navigateList('UP');
                    if (action === 'PLAY_SELECTED') playSelected(activeDeck);
                    if (action === 'XFADE_A') moveCrossfader('A');
                    if (action === 'XFADE_B') moveCrossfader('B');
                }
            });
        }
    } catch (err) { console.error(err); }
}
document.getElementById('connectSerial').onclick = connect;

const canvas = document.getElementById('viz');
const ctx = canvas.getContext('2d');

function draw() {
    requestAnimationFrame(draw);
    
    // 1. Update Particle Canvas
    pCanvas.width = window.innerWidth;
    pCanvas.height = window.innerHeight;
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    
    spawnParticles();
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.update();
        p.draw();
    });

    // 2. Update Waveform Canvas
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const crossVal = document.getElementById('crossfader').value / 100;
    
    ['A', 'B'].forEach(id => {
        const d = decks[id];
        if (!d.analyser) return;
        const data = new Uint8Array(d.analyser.frequencyBinCount);
        d.analyser.getByteTimeDomainData(data);
        const prominence = id === 'A' ? (1 - crossVal) : crossVal;
        ctx.globalAlpha = 0.1 + (prominence * 0.9);
        const glowColor = id === 'A' ? '#ff0000' : '#0000ff';
        ctx.shadowBlur = 2 + (prominence * 20);
        ctx.shadowColor = glowColor;
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 1.5 + (prominence * 1.5);
        ctx.beginPath();
        const slice = canvas.width / data.length;
        let x = 0;
        for (let i = 0; i < data.length; i++) {
            const v = data[i] / 128.0;
            let y = v * canvas.height / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += slice;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
}
draw();
switchDeckOrCycleParam('A');
updateSelectionUI('A');
updateSelectionUI('B');
