// bootstrapPractice.js
const fs = require('fs');
const piexif = require('piexifjs');
const { ipcRenderer } = require('electron');

// Bilder-Listen
let imagesOben = [];
let imagesUnten = [];

// Aktuelle Indizes
let indexOben = 0;
let indexUnten = 0;

// Buttons
const btn_vor = document.getElementById("btn_vor");
const btn_zuruck = document.getElementById("btn_zuruck");
const btn_unten_vor = document.getElementById("btn_unten_vor");
const btn_unten_zuruck = document.getElementById("btn_unten_zuruck");

// Helper: Inputs leeren
function clearInputs() {
    const ids = ['vornameSchuler', 'nachnameSchuler', 'klasseSchuler', 'aufgabeNr', 'input'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// Helper: Metadaten laden (EXIF)
function loadMetadata(filePath) {
    try {
        const buffer = fs.readFileSync(filePath);
        const binary = buffer.toString('binary');
        const exifObj = piexif.load(binary);
        const userComment = exifObj["Exif"][piexif.ExifIFD.UserComment];

        if (userComment) {
             let jsonString = userComment;
             if (jsonString.startsWith("ASCII\0\0\0")) {
                 jsonString = jsonString.substring(8);
             } else if (jsonString.startsWith("UNICODE\0\0\0")) {
                 jsonString = jsonString.substring(8);
             }
             
             try {
                 const data = JSON.parse(jsonString);
                 
                 const setVal = (id, val) => {
                     const el = document.getElementById(id);
                     if (el) el.value = val || '';
                 };
                 
                 setVal('vornameSchuler', data.vorname);
                 setVal('nachnameSchuler', data.nachname);
                 setVal('klasseSchuler', data.klasse);
                 setVal('aufgabeNr', data.aufgabe);
                 
                 // Punkte erstmal aus EXIF, kann von DB überschrieben werden
                 setVal('input', data.punkte);
                 
             } catch (parseErr) {
                 console.warn("Metadaten sind kein gültiges JSON.");
                 clearInputs();
             }
        } else {
             clearInputs();
        }
    } catch(e) {
        // console.warn("Fehler/Keine Metadaten:", e.message);
        clearInputs();
    }
}

// Helper: Ansicht aktualisieren
function updateViewOben() {
    if (imagesOben.length === 0) return; 
    const imgObj = imagesOben[indexOben];
    if(window.updateCanvasImage && window.canvasOben) {
        window.updateCanvasImage(window.canvasOben, imgObj.path);
    }
}

async function updateViewUnten() {
    if (imagesUnten.length === 0) return;

    const imgObj = imagesUnten[indexUnten];
    const imagePath = imgObj.path;
    
    // 1. Canvas Bild laden
    if(window.updateCanvasImage && window.canvasUnten) {
        window.updateCanvasImage(window.canvasUnten, imagePath);
    }
    
    // 2. Metadaten (Basis) laden
    loadMetadata(imagePath);
    
    // 3. Datenbank prüfen (Overrides & Annotations)
    try {
        const doc = await ipcRenderer.invoke('db-get', imagePath);
        
        // Erstmal alles löschen (außer BG)
        window.canvasUnten.getObjects().forEach(obj => window.canvasUnten.remove(obj));

        if (doc) {
            console.log("DB Treffer für:", imgObj.name);
            
            // Annotations wiederherstellen
            if (doc.annotations) {
                 window.canvasUnten.loadFromJSON(doc.annotations, () => {
                     window.canvasUnten.requestRenderAll();
                 });
            }
            
            // Punkte aus DB sind aktueller als im Bild
            if (doc.punkte !== undefined && doc.punkte !== null) {
                document.getElementById('input').value = doc.punkte;
            }
        } else {
            console.log("Keine DB Daten für:", imgObj.name);
        }
    } catch (err) {
        console.error("DB Load Fehler:", err);
    }
}

// Helper: Zustand speichern (in DB)
async function saveStateUnten() {
    if (!window.canvasUnten || imagesUnten.length === 0) return;
    
    const currentImgObj = imagesUnten[indexUnten];
    const imagePath = currentImgObj.path;
    
    // JSON holen
    const json = window.canvasUnten.toJSON();
    delete json.backgroundImage;
    
    // Punkte holen
    const punkte = document.getElementById('input').value;
    
    const data = {
        annotations: json,
        punkte: punkte,
        lastModified: new Date().toISOString()
    };
    
    await ipcRenderer.invoke('db-upsert', { imagePath, data });
    console.log("Gespeichert (DB):", currentImgObj.name);
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

// Unten - Async Navigation mit Speichern
btn_unten_vor.addEventListener("click", async () => {
    if (imagesUnten.length === 0) return;
    await saveStateUnten(); // Warten bis gespeichert
    indexUnten = (indexUnten + 1) % imagesUnten.length;
    updateViewUnten();
});

btn_unten_zuruck.addEventListener("click", async () => {
    if (imagesUnten.length === 0) return;
    await saveStateUnten();
    indexUnten = (indexUnten - 1 + imagesUnten.length) % imagesUnten.length;
    updateViewUnten();
});

// Automatisches Speichern beim Schließen/Unload (Best Effort)
window.addEventListener('beforeunload', () => {
    // Sync call nicht möglich hier, aber wir versuchen es noch abzusetzen
    // Da ipcRenderer async ist, ist beforeunload schwierig.
    // Electron apps schließen meist über main process events.
    // Wir vertrauen auf "Save on Navigation". 
    // Man müsste explizit beim Schließen im Main Process nachfragen, 
    // aber das ist komplex. Fürs erste reicht Navigation-Save.
    saveStateUnten(); 
});


// --- API für Electron / Externe Steuerung ---
window.CarouselAPI = {
    getCurrentImageOben: () => imagesOben[indexOben],
    getCurrentImageUnten: () => imagesUnten[indexUnten],
    
    setImagesOben: (list) => {
        imagesOben = list;
        indexOben = 0;
        updateViewOben();
    },
    
    setImagesUnten: (list) => {
        imagesUnten = list;
        indexUnten = 0;
        updateViewUnten();
        // Hier kein restoreStateUnten mehr nötig, da updateViewUnten das macht
    }
};
