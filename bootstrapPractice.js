// bootstrapPractice.js

// Bilder-Listen
const imagesOben = ['katze.jpg', 'katze2.jpg'];
const imagesUnten = ['hund.jpg', 'hund2.jpg'];

// Aktuelle Indizes (Start bei 0)
let indexOben = 0;
let indexUnten = 0;

// Buttons
const btn_vor = document.getElementById("btn_vor");
const btn_zuruck = document.getElementById("btn_zuruck");
const btn_unten_vor = document.getElementById("btn_unten_vor");
const btn_unten_zuruck = document.getElementById("btn_unten_zuruck");

// Helper: Ansicht aktualisieren
function updateViewOben() {
    const filename = imagesOben[indexOben];
    if(window.updateCanvasImage && window.canvasOben) {
        window.updateCanvasImage(window.canvasOben, `./pics/${filename}`);
    }
}

function updateViewUnten() {
    const filename = imagesUnten[indexUnten];
    if(window.updateCanvasImage && window.canvasUnten) {
        window.updateCanvasImage(window.canvasUnten, `./pics/${filename}`);
    }
}

// Event Listeners
btn_vor.addEventListener("click", () => {
    indexOben = (indexOben + 1) % imagesOben.length;
    updateViewOben();
});

btn_zuruck.addEventListener("click", () => {
    // Modulo mit negativen Zahlen in JS handhaben: (+ length)
    indexOben = (indexOben - 1 + imagesOben.length) % imagesOben.length;
    updateViewOben();
});

btn_unten_vor.addEventListener("click", () => {
    indexUnten = (indexUnten + 1) % imagesUnten.length;
    updateViewUnten();
});

btn_unten_zuruck.addEventListener("click", () => {
    indexUnten = (indexUnten - 1 + imagesUnten.length) % imagesUnten.length;
    updateViewUnten();
});

// --- API für Electron/Speichern ---
// Damit wir von außen (electronLogic.js) steuern können, welches Bild angezeigt wird.
window.CarouselAPI = {
    getImageNameOben: () => imagesOben[indexOben],
    getImageNameUnten: () => imagesUnten[indexUnten],
    
    setImageByNameOben: (name) => {
        const idx = imagesOben.indexOf(name);
        if (idx !== -1) {
            indexOben = idx;
            updateViewOben();
        } else {
            console.warn(`Bild ${name} nicht gefunden in Oben-Liste.`);
        }
    },
    
    setImageByNameUnten: (name) => {
        const idx = imagesUnten.indexOf(name);
        if (idx !== -1) {
            indexUnten = idx;
            updateViewUnten();
        } else {
            console.warn(`Bild ${name} nicht gefunden in Unten-Liste.`);
        }
    }
};