import { SamplerEngine } from './samplerEngine.js';
import WaveformDrawer from './utils/waveformdrawer.js';
import TrimbarsDrawer from './utils/trimbarsdrawer.js';
import Sound from './utils/sound.js';

export class samplerGUI {
    constructor() {
        this.buttons = []
        this.sounds = []
        this.canvas = document.querySelector("#myCanvas");
        this.context = this.canvas.getContext('2d');
        this.canvasOverlay = document.querySelector("#myCanvasOverlay");
        this.mousePos = { x: 0, y: 0 }
        this.activeSoundIndex = 0;
        this.KEY_TO_SLOT = {
            'Digit1': 12, 'Digit2': 13, 'Digit3': 14, 'Digit4': 15,
            'KeyQ': 8, 'KeyW': 9, 'KeyE': 10, 'KeyR': 11,
            'KeyA': 4, 'KeyS': 5, 'KeyD': 6, 'KeyF': 7,
            'KeyZ': 0, 'KeyX': 1, 'KeyC': 2, 'KeyV': 3
        };
        this.engine = new SamplerEngine();
        this.loadButtons()
        this.keyboardEvents()
    }


    loadButtons(){
        let buttons = document.getElementById("buttons")

        let order = [12,13,14,15,8,9,10,11,4,5,6,7,0,1,2,3]
        order.forEach(element => {
            let button = document.createElement("button")
            let progress = document.createElement("progress")
            progress.value = 0
            let buttonPlusProgress = document.createElement("div")
            buttonPlusProgress.id = element
            buttonPlusProgress.appendChild(button)
            buttonPlusProgress.appendChild(progress)
            buttons.appendChild(buttonPlusProgress)
        });

    }

    clearButtons(){
        let buttons = document.getElementById("buttons").children
        for (let i = 0; i < buttons.length; i++){
            buttons[i].firstChild.innerHTML = ""
        }
        // remove event listeners and reset progress bars
        this.sounds = []
        for (let item of buttons) {
            let new_item = item.firstChild.cloneNode(true);
            item.firstChild.parentNode.replaceChild(new_item, item.firstChild);
            item.lastChild.value = 0
        }
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // clone canvas overlay to remove trimbars
        let new_canvasOverlay = this.canvasOverlay.cloneNode(true);
        this.canvasOverlay.parentNode.replaceChild(new_canvasOverlay, this.canvasOverlay);
        this.canvasOverlay = new_canvasOverlay;
    }


    nameOnButtons(presetSamples){
        if (presetSamples != ""){
            presetSamples.forEach((element, i) => {
                document.getElementById(i).firstChild.innerHTML = element.name
            });
        }
    }


    bindButtonEvents(){
        let buttons = document.getElementById("buttons").children
        for (let item of buttons) {
            if (this.sounds[item.id]){
                item.firstChild.addEventListener('click', () => {
                    this.buttonTrigger(item.id)
                });
            } 
        }
    }


    buttonTrigger(slot){
        this.engine.playSound(this.sounds[slot])
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.sounds[slot].waveForm.drawWave(0, this.canvas.height);
        this.activeSoundIndex = slot;
        this.mouseEvents()
        const btn = document.querySelector(`#buttons [id='${slot}']`).firstChild;
        if (btn) {
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 120);
        }
    }


    // create waveform and trimbars for a sound
    createSound(son){
        const wf = new WaveformDrawer();
        const tb = new TrimbarsDrawer(this.canvasOverlay, 0, this.canvasOverlay.width);
        const sound = new Sound(wf, tb, son, this.canvas);
        sound.init('#83E83E');
        this.sounds.push(sound);
    }


    createSounds(decodedSounds){
        this.sounds = []
        decodedSounds.forEach(element => {
            this.createSound(element);
        });
    }

    
    keyboardEvents(){
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            if (e.code in this.KEY_TO_SLOT && this.sounds[this.KEY_TO_SLOT[e.code]] ) {
                const slot = this.KEY_TO_SLOT[e.code];
                this.buttonTrigger(slot)
            }
        });
    }

    updateProgressBar(index, received, total){
        const bar = document.querySelector(`#buttons [id='${index}']`).lastChild
        bar.value = received;
        bar.max = total;
    }



    // mouse event listeners for ajusting the trim bars (code from tp)
    mouseEvents() {
        this.canvasOverlay.onmousemove = (evt) => {
            // console.log("mouse move")
            // get the mouse position in the canvas
            let rect = this.canvas.getBoundingClientRect();
    
            this.mousePos.x = (evt.clientX - rect.left);
            this.mousePos.y = (evt.clientY - rect.top);
    
            // When the mouse moves, we check if we are close to a trim bar
            // if so: move it!
            // operate on the active sound's trimbars if available
            if (this.sounds[this.activeSoundIndex] && this.sounds[this.activeSoundIndex].trimBars)
                this.sounds[this.activeSoundIndex].trimBars.moveTrimBars(this.mousePos);
        }
        this.canvasOverlay.onmousedown = (evt) => {
            // If a trim bar is close to the mouse position, we start dragging it
            if (this.sounds[this.activeSoundIndex] && this.sounds[this.activeSoundIndex].trimBars)
                this.sounds[this.activeSoundIndex].trimBars.startDrag();
        }

        this.canvasOverlay.onmouseup = (evt) => {
            // We stop dragging the trim bars (if they were being dragged)
            if (this.sounds[this.activeSoundIndex] && this.sounds[this.activeSoundIndex].trimBars)
                this.sounds[this.activeSoundIndex].trimBars.stopDrag();
        }

        // start the animation loop for drawing the trim bars
        requestAnimationFrame(this.animate.bind(this));
    }

    animate() {
        // clear overlay canvas;
        // clear overlay and draw the active sound's trim bars
        if (this.sounds[this.activeSoundIndex] && this.sounds[this.activeSoundIndex].trimBars) {
            this.sounds[this.activeSoundIndex].trimBars.clear();
            this.sounds[this.activeSoundIndex].trimBars.draw();
        }

        // redraw in 1/60th of a second
        requestAnimationFrame(this.animate.bind(this));
    }
}
