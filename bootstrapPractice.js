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
const inputPunkte = document.getElementById('input');
const btn_save_meta = document.getElementById('btn_save_meta');

// Helper: Inputs leeren
function clearInputs() {
    const ids = ['vornameSchuler', 'nachnameSchuler', 'klasseSchuler', 'aufgabeNr', 'input'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// Helper: Metadaten schreiben (in JPG)
function writeMetadataToImage(filePath) {
    if (!filePath) return;
    
    const data = {
        vorname: document.getElementById('vornameSchuler').value,
        nachname: document.getElementById('nachnameSchuler').value,
        klasse: document.getElementById('klasseSchuler').value,
        aufgabe: document.getElementById('aufgabeNr').value,
        punkte: document.getElementById('input').value
    };
    
    try {
        // Wir konvertieren das JSON zu reinem ASCII (Unicode-Escaping)
        const jsonString = JSON.stringify(data).replace(/[\u007f-\uffff]/g, c => '\\u'+('0000'+c.charCodeAt(0).toString(16)).slice(-4));
        const jpegData = fs.readFileSync(filePath).toString("binary");
        
        const exifObj = { "0th": {}, "Exif": {}, "GPS": {}, "Interop": {}, "1st": {}, "thumbnail": null };
        exifObj["Exif"][piexif.ExifIFD.UserComment] = jsonString; 
        
        const exifBytes = piexif.dump(exifObj);
        const newJpegData = piexif.insert(exifBytes, jpegData);
        const newJpegBuffer = Buffer.from(newJpegData, "binary");
        
        fs.writeFileSync(filePath, newJpegBuffer);
        console.log("Metadaten (EXIF) geschrieben:", filePath);
        
        if(btn_save_meta) {
             const originalHtml = btn_save_meta.innerHTML;
             btn_save_meta.innerHTML = '<i class="bi bi-check-lg"></i>';
             btn_save_meta.classList.replace('btn-primary', 'btn-success');
             setTimeout(() => {
                 btn_save_meta.innerHTML = originalHtml;
                 btn_save_meta.classList.replace('btn-success', 'btn-primary');
             }, 1000);
        }

    } catch (err) {
        console.error("Fehler beim Schreiben der Metadaten:", err);
    }
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
             if (jsonString.startsWith("ASCII\0\0\0")) jsonString = jsonString.substring(8);
             if (jsonString.startsWith("UNICODE\0\0\0")) jsonString = jsonString.substring(8);
             
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
                 clearInputs();
             }
        } else {
             clearInputs();
        }
    } catch(e) {
        clearInputs();
    }
}

// Helper: Ansicht aktualisieren (Oben)
function updateViewOben() {
    if (imagesOben.length === 0) return; 

    const imgObj = imagesOben[indexOben];
    if(window.updateCanvasImage && window.canvasOben) {
        window.updateCanvasImage(window.canvasOben, imgObj.path);
    }
    ipcRenderer.send('update-solution-image', imgObj.path);
}

// Helper: Ansicht aktualisieren (Unten)
async function updateViewUnten() {
    if (imagesUnten.length === 0) return;

    const imgObj = imagesUnten[indexUnten];
    const imagePath = imgObj.path;
    
    // 1. Canvas Bild laden
    if(window.updateCanvasImage && window.canvasUnten) {
        window.updateCanvasImage(window.canvasUnten, imagePath);
    }
    
    // 2. Metadaten laden
    loadMetadata(imagePath);
    
    // 3. Datenbank prüfen
    try {
        const doc = await ipcRenderer.invoke('db-get', imagePath);
        
        window.canvasUnten.getObjects().forEach(obj => window.canvasUnten.remove(obj));

        if (doc) {
            if (doc.annotations) {
                 window.canvasUnten.loadFromJSON(doc.annotations, () => {
                     window.canvasUnten.requestRenderAll();
                 });
            }
            if (doc.punkte !== undefined && doc.punkte !== null) {
                document.getElementById('input').value = doc.punkte;
            }
        }
    } catch (err) {
        console.error("DB Load Fehler:", err);
    }
}

// Helper: Zustand speichern (DB + EXIF) - IMMER
async function saveStateUnten() {
    if (!window.canvasUnten || imagesUnten.length === 0) return;
    
    const currentImgObj = imagesUnten[indexUnten];
    const imagePath = currentImgObj.path;
    
    // 1. Metadaten in JPG schreiben
    writeMetadataToImage(imagePath);

    // 2. DB Update
    const json = window.canvasUnten.toJSON();
    delete json.backgroundImage;
    const punkte = document.getElementById('input').value;
    
    const data = {
        annotations: json,
        punkte: punkte,
        lastModified: new Date().toISOString()
    };
    
    await ipcRenderer.invoke('db-upsert', { imagePath, data });
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
    await saveStateUnten(); 
    indexUnten = (indexUnten + 1) % imagesUnten.length;
    updateViewUnten();
});

btn_unten_zuruck.addEventListener("click", async () => {
    if (imagesUnten.length === 0) return;
    await saveStateUnten();
    indexUnten = (indexUnten - 1 + imagesUnten.length) % imagesUnten.length;
    updateViewUnten();
});

// Manueller Save Button
if (btn_save_meta) {
    btn_save_meta.addEventListener('click', () => {
        if (imagesUnten.length > 0) {
            writeMetadataToImage(imagesUnten[indexUnten].path);
        }
    });
}

// Automatisches Speichern beim Schließen/Unload
window.addEventListener('beforeunload', () => {
    saveStateUnten(); 
});

// Menü Event Handler: Drucken (Screenshot-Methode)
ipcRenderer.on('menu-print-request', () => {
    if (imagesUnten.length === 0) {
        alert("Bitte wählen Sie zuerst einen Ordner mit Schülerarbeiten aus.");
        return;
    }
    collectPrintData();
});

async function collectPrintData() {
    // UI Blockieren / Overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;color:white;display:flex;flex-direction:column;justify-content:center;align-items:center;font-family:sans-serif;";
    overlay.innerHTML = '<div class="spinner-border text-light mb-3" style="width: 3rem; height: 3rem;"></div><h2 id="print-status">Starte Druck-Aufbereitung...</h2>';
    document.body.appendChild(overlay);
    
    const statusText = document.getElementById('print-status');
    const originalIndex = indexUnten; 
    const collectedData = [];

    try {
        // Durch alle Bilder iterieren
        for (let i = 0; i < imagesUnten.length; i++) {
            statusText.innerText = `Rendere Bild ${i+1} von ${imagesUnten.length}...`;
            
            // Zum Bild wechseln
            indexUnten = i;
            await updateViewUnten(); // Wartet bis Bild + DB Daten geladen sind
            
            // Kurze Pause für Fabric Rendering (sicher ist sicher)
            await new Promise(r => setTimeout(r, 150));
            
            // Screenshot erstellen (High Res)
            const dataUrl = window.canvasUnten.toDataURL({ format: 'png', multiplier: 2 });
            
            // Metadaten direkt aus den geladenen Inputs holen
            const meta = {
                vorname: document.getElementById('vornameSchuler').value,
                nachname: document.getElementById('nachnameSchuler').value,
                klasse: document.getElementById('klasseSchuler').value,
                aufgabe: document.getElementById('aufgabeNr').value,
                punkte: document.getElementById('input').value,
                filename: imagesUnten[i].name
            };
            
            collectedData.push({
                dataUrl: dataUrl,
                meta: meta
            });
        }
        
        statusText.innerText = "Fertig! Öffne Vorschau...";
        
        // Zurück zum Ursprung
        indexUnten = originalIndex;
        await updateViewUnten();
        
        // Daten senden
        ipcRenderer.send('open-print-window-direct', collectedData);
        
    } catch (err) {
        console.error("Fehler beim Sammeln:", err);
        alert("Fehler beim Erstellen der Druckdaten: " + err.message);
    } finally {
        if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
        }
    }
}


// --- API für Electron ---
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
    
    getAnnotationCache: () => ({})
};
