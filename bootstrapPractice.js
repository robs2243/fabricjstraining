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
const btn_open_external = document.getElementById("btn_open_external");

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
                 
                 setVal('input', data.punkte);
                 
             } catch (parseErr) {
                 console.warn("Metadaten sind kein gültiges JSON.");
                 clearInputs();
             }
        } else {
             clearInputs();
        }
    } catch(e) {
        clearInputs();
    }
}

// Helper: Ansicht aktualisieren (Oben / Musterlösung)
function updateViewOben() {
    if (imagesOben.length === 0) return; 

    const imgObj = imagesOben[indexOben];
    if(window.updateCanvasImage && window.canvasOben) {
        window.updateCanvasImage(window.canvasOben, imgObj.path);
    }
    
    // Synchronisiere externes Fenster, falls offen
    ipcRenderer.send('update-solution-image', imgObj.path);
}

// Helper: Ansicht aktualisieren (Unten / Schüler)
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

if (btn_open_external) {
    btn_open_external.addEventListener("click", () => {
        if (imagesOben.length === 0) {
            alert("Bitte erst einen Musterlösungs-Ordner wählen.");
            return;
        }
        const imgObj = imagesOben[indexOben];
        ipcRenderer.send('open-solution-window', imgObj.path);
    });
}

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

// Automatisches Speichern beim Schließen/Unload
window.addEventListener('beforeunload', () => {
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
    },
    
    // Legacy support for manual saving/loading if still needed
    getAnnotationCache: () => {
         // Mocking cache access via DB logic is hard. 
         // Since we switched to DB, manual JSON export would need to query DB.
         // For now, we return empty object or partial logic if requested.
         return {};
    }
};