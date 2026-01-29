import { samplerGUI } from './samplerGUI.js';
import { SamplerEngine } from './samplerEngine.js';

const API_BASE = 'http://localhost:3000';

let decodedSounds = []

window.onload = async function init() {
    const gui = new samplerGUI();
    const engine = new SamplerEngine();

    const presetSelect = document.querySelector('#presetSelect');


    let presets = [];
    try {
        const resp = await fetch(`${API_BASE}/api/presets`);
        presets = await resp.json();
    } catch (e) {
        console.error('Erreur en récupérant les presets :', e);
        presets = [];
    }

    buildPresetMenuWithGroups();

    // code from M1InfoWebTechnos2025_2026\Seance5\ClientWithDynamicDropDownMenu
    function buildPresetMenuWithGroups() {
        // Build an option group for each category
        const categories = {};

        // First, group presets by category
        presets.forEach((preset, index) => {
            const category = preset.type || "Uncategorized";
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push({ preset, index });
        });

        for (const [category, items] of Object.entries(categories)) {
            const optgroup = document.createElement("optgroup");
            optgroup.label = category;

            items.forEach(({ preset, index }) => {
                const option = document.createElement("option");
                option.value = index;
                option.text = preset.name;
                if (option.text == "blank"){
                    option.selected = true
                }
                optgroup.appendChild(option);
            });

            presetSelect.appendChild(optgroup);
        }
    }


    // load preset and show name on buttons when select option
    let presetSamples = []
    presetSelect.onchange = async function (e) {
        gui.clearButtons()
        if (this.value >= 0){
            decodedSounds = await engine.loadPresetSamples(presets[this.value], gui.updateProgressBar)
            presetSamples = presets[this.value].samples
            gui.nameOnButtons(presetSamples)
            gui.createSounds(decodedSounds);
            gui.bindButtonEvents()
        }
        presetSelect.blur();
    }
    


    
    
    // bouton pour test sans interface qui charge le premier preset et joue le kick
    let headlessBtn = document.getElementById("headless")
    headlessBtn.addEventListener('click', async () => {
        decodedSounds = await engine.loadPresetSamples(presets[0])
        engine.playSoundById(0, decodedSounds);
    })
}