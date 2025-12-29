// bootstrapPractice.js

// Bilder-Listen
const imagesOben = ['katze.jpg', 'katze2.jpg'];
const imagesUnten = ['hund.jpg', 'hund2.jpg'];

// Aktuelle Indizes (Start bei 0)
let indexOben = 0;
let indexUnten = 0;

// Zwischenspeicher für Annotationen (Key: Bildname, Value: JSON-Daten)
const annotationCache = {};

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

// Helper: Zustand speichern & laden
function saveStateUnten() {
    if (!window.canvasUnten) return;
    const currentImage = imagesUnten[indexUnten];
    
    // JSON holen und Hintergrund entfernen (wir speichern nur die Zeichnungen)
    const json = window.canvasUnten.toJSON();
    delete json.backgroundImage;
    
    annotationCache[currentImage] = json;
    // console.log("Gespeichert für:", currentImage);
}

function restoreStateUnten() {
    if (!window.canvasUnten) return;
    
    // Canvas leeren (aber sanft, damit wir nicht flackern, falls das BG-Bild lädt)
    // Wir entfernen nur die Objekte, nicht den Background (der wird eh überschrieben durch updateViewUnten)
    window.canvasUnten.getObjects().forEach(obj => window.canvasUnten.remove(obj));
    
    const nextImage = imagesUnten[indexUnten];
    const data = annotationCache[nextImage];
    
    if (data) {
        window.canvasUnten.loadFromJSON(data, () => {
            window.canvasUnten.requestRenderAll();
        });
        // console.log("Geladen für:", nextImage);
    }
}


// Event Listeners
btn_vor.addEventListener("click", () => {
    indexOben = (indexOben + 1) % imagesOben.length;
    updateViewOben();
});

btn_zuruck.addEventListener("click", () => {
    indexOben = (indexOben - 1 + imagesOben.length) % imagesOben.length;
    updateViewOben();
});

// Unten: Jetzt mit Speichern/Laden Logik
btn_unten_vor.addEventListener("click", () => {
    saveStateUnten(); // 1. Alten Zustand sichern
    indexUnten = (indexUnten + 1) % imagesUnten.length;
    updateViewUnten(); // 2. Neues Bild laden
    restoreStateUnten(); // 3. Annotationen für neues Bild holen (falls vorhanden)
});

btn_unten_zuruck.addEventListener("click", () => {
    saveStateUnten();
    indexUnten = (indexUnten - 1 + imagesUnten.length) % imagesUnten.length;
    updateViewUnten();
    restoreStateUnten();
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
            restoreStateUnten(); // WICHTIG: Annotations für dieses Bild laden!
        } else {
            console.warn(`Bild ${name} nicht gefunden in Unten-Liste.`);
        }
    },
    
    // Cache Zugriff für Speichern/Laden
    getAnnotationCache: () => {
        saveStateUnten(); // Sicherstellen, dass aktueller Stand im Cache ist
        console.log("Speichere Cache. Keys:", Object.keys(annotationCache));
        return annotationCache;
    },
    
    setAnnotationCache: (newCache) => {
        // Cache überschreiben
        for (const key in newCache) {
            annotationCache[key] = newCache[key];
        }
        // Aktuelle Ansicht refreshen (falls gerade Daten geladen wurden für das aktuelle Bild)
        restoreStateUnten();
    }
};