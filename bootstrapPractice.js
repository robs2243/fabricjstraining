// bootstrapPractice.js

// Bilder-Listen (Objekte: { name: "dateiname.jpg", path: "full/path/to/file.jpg" })
let imagesOben = [];
let imagesUnten = [];

// Aktuelle Indizes (Start bei 0)
let indexOben = 0;
let indexUnten = 0;

// Zwischenspeicher für Annotationen (Key: Bildname (eindeutig?), Value: JSON-Daten)
// Wir nutzen den absoluten Pfad als Key, um Verwechslungen bei gleichen Dateinamen in versch. Ordnern zu vermeiden.
const annotationCache = {};

// Buttons
const btn_vor = document.getElementById("btn_vor");
const btn_zuruck = document.getElementById("btn_zuruck");
const btn_unten_vor = document.getElementById("btn_unten_vor");
const btn_unten_zuruck = document.getElementById("btn_unten_zuruck");

// Helper: Ansicht aktualisieren
function updateViewOben() {
    if (imagesOben.length === 0) return; // Nichts zu tun

    const imgObj = imagesOben[indexOben];
    // Wir nutzen den absoluten Pfad
    if(window.updateCanvasImage && window.canvasOben) {
        // "file://" Protokoll ist sicherer bei absoluten Pfaden, oft geht es aber auch so in Electron
        window.updateCanvasImage(window.canvasOben, imgObj.path);
    }
}

function updateViewUnten() {
    if (imagesUnten.length === 0) return;

    const imgObj = imagesUnten[indexUnten];
    if(window.updateCanvasImage && window.canvasUnten) {
        window.updateCanvasImage(window.canvasUnten, imgObj.path);
    }
}

// Helper: Zustand speichern & laden
function saveStateUnten() {
    if (!window.canvasUnten || imagesUnten.length === 0) return;
    
    const currentImgObj = imagesUnten[indexUnten];
    // Key ist der absolute Pfad (eindeutig)
    const key = currentImgObj.path;
    
    // JSON holen und Hintergrund entfernen
    const json = window.canvasUnten.toJSON();
    delete json.backgroundImage;
    
    annotationCache[key] = json;
    // console.log(`[DEBUG] Saved state for ${currentImgObj.name}`);
}

function restoreStateUnten() {
    if (!window.canvasUnten) return;
    
    // Canvas leeren
    window.canvasUnten.getObjects().forEach(obj => window.canvasUnten.remove(obj));
    
    if (imagesUnten.length === 0) return;

    const nextImgObj = imagesUnten[indexUnten];
    const key = nextImgObj.path;
    const data = annotationCache[key];
    
    if (data) {
        window.canvasUnten.loadFromJSON(data, () => {
            window.canvasUnten.requestRenderAll();
        });
    }
}


// Event Listeners Navigation
btn_vor.addEventListener("click", () => {
    if (imagesOben.length === 0) return;
    indexOben = (indexOben + 1) % imagesOben.length;
    updateViewOben();
});

btn_zuruck.addEventListener("click", () => {
    if (imagesOben.length === 0) return;
    indexOben = (indexOben - 1 + imagesOben.length) % imagesOben.length;
    updateViewOben();
});

// Unten: Jetzt mit Speichern/Laden Logik
btn_unten_vor.addEventListener("click", () => {
    if (imagesUnten.length === 0) return;
    saveStateUnten();
    indexUnten = (indexUnten + 1) % imagesUnten.length;
    updateViewUnten();
    restoreStateUnten();
});

btn_unten_zuruck.addEventListener("click", () => {
    if (imagesUnten.length === 0) return;
    saveStateUnten();
    indexUnten = (indexUnten - 1 + imagesUnten.length) % imagesUnten.length;
    updateViewUnten();
    restoreStateUnten();
});

// --- API für Electron ---
window.CarouselAPI = {
    // Liefert das aktuelle Bild-Objekt {name, path}
    getCurrentImageOben: () => imagesOben[indexOben],
    getCurrentImageUnten: () => imagesUnten[indexUnten],
    
    // Neue Funktionen zum Setzen der Listen
    setImagesOben: (list) => {
        imagesOben = list;
        indexOben = 0;
        updateViewOben();
    },
    
    setImagesUnten: (list) => {
        // Falls wir vorher was hatten, vielleicht Cache löschen? 
        // Nein, Cache behalten ist sicherer (falls man aus Versehen neu lädt)
        imagesUnten = list;
        indexUnten = 0;
        updateViewUnten();
        restoreStateUnten(); // Falls wir für das erste Bild schon was im Cache haben
    },

    // Legacy Support / Kompatibilität falls nötig
    getAnnotationCache: () => {
        saveStateUnten();
        return annotationCache;
    },
    
    setAnnotationCache: (newCache) => {
        for (const key in newCache) {
            annotationCache[key] = newCache[key];
        }
        restoreStateUnten();
    }
};
