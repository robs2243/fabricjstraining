const { ipcRenderer } = require('electron');

const btnSave = document.getElementById('btn_json_speichern');
const btnLoad = document.getElementById('btn_json_laden');

btnSave.addEventListener('click', async () => {
    // Wir speichern NUR das untere Canvas (Arbeitsbereich)
    
    // 1. Annotations holen (ohne Hintergrundbild)
    const jsonUnten = window.canvasUnten.toJSON();
    delete jsonUnten.backgroundImage;

    // 2. Bildnamen holen
    const imgUnten = window.CarouselAPI ? window.CarouselAPI.getImageNameUnten() : null;

    // 3. Datenpaket
    const data = {
        imageName: imgUnten,
        annotations: jsonUnten
    };
    
    // An Main Process senden
    const result = await ipcRenderer.invoke('save-json', JSON.stringify(data, null, 2));
    
    if (result) {
        alert('Erfolgreich gespeichert!');
    }
});

btnLoad.addEventListener('click', async () => {
    const jsonString = await ipcRenderer.invoke('load-json');
    
    if (!jsonString) return; 
    
    try {
        const data = JSON.parse(jsonString);
        
        // Prüfen, ob das Format passt (wir erwarten { imageName, annotations })
        if (data.annotations) {
            
            // Annotations in Canvas Unten laden
            window.canvasUnten.loadFromJSON(data.annotations, () => {
                
                // Bild wiederherstellen
                if (data.imageName && window.CarouselAPI) {
                    window.CarouselAPI.setImageByNameUnten(data.imageName);
                }
                
                window.canvasUnten.requestRenderAll();
            });
            
        } else {
            // Fallback für alte Formate oder Fehler
            console.warn("Unbekanntes Format. Versuche direkten Load...");
            // Vielleicht war es noch das alte Format { unten: ... }?
            if (data.unten && data.unten.annotations) {
                 window.canvasUnten.loadFromJSON(data.unten.annotations, () => {
                    if (data.unten.imageName) window.CarouselAPI.setImageByNameUnten(data.unten.imageName);
                    window.canvasUnten.requestRenderAll();
                });
            }
        }
        
    } catch (e) {
        console.error("Fehler beim Laden:", e);
        alert('Fehler beim Laden der Datei.');
    }
});
