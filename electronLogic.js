const { ipcRenderer } = require('electron');

const btnSave = document.getElementById('btn_json_speichern');
const btnLoad = document.getElementById('btn_json_laden');

btnSave.addEventListener('click', async () => {
    // Zugriff auf API prüfen
    if (!window.CarouselAPI) return;

    // 1. Gesamten Cache holen (inkl. aktuellem Stand)
    const cache = window.CarouselAPI.getAnnotationCache();
    
    // 2. Welches Bild ist gerade offen?
    const currentImg = window.CarouselAPI.getImageNameUnten();

    // 3. Datenpaket
    const data = {
        currentImage: currentImg,
        cache: cache
    };
    
    // An Main Process senden
    const result = await ipcRenderer.invoke('save-json', JSON.stringify(data, null, 2));
    
    if (result) {
        alert('Alle Annotationen gespeichert!');
    }
});

btnLoad.addEventListener('click', async () => {
    const jsonString = await ipcRenderer.invoke('load-json');
    
    if (!jsonString) return; 
    
    try {
        const data = JSON.parse(jsonString);
        
        if (window.CarouselAPI) {
            
            // A. Cache wiederherstellen (falls vorhanden)
            if (data.cache) {
                window.CarouselAPI.setAnnotationCache(data.cache);
            } else if (data.annotations) {
                // Fallback für das Format von vorhin (nur Einzelbild)
                // Wir basteln uns einen Cache-Eintrag für das damalige Bild
                const singleCache = {};
                if (data.imageName) {
                    singleCache[data.imageName] = data.annotations;
                }
                window.CarouselAPI.setAnnotationCache(singleCache);
            }
            
            // B. Zum richtigen Bild springen
            // Das triggert in bootstrapPractice.js auch das Laden aus dem (soeben gesetzten) Cache
            if (data.currentImage) {
                window.CarouselAPI.setImageByNameUnten(data.currentImage);
            } else if (data.imageName) {
                // Fallback
                window.CarouselAPI.setImageByNameUnten(data.imageName);
            }
        }
        
    } catch (e) {
        console.error("Fehler beim Laden:", e);
        alert('Fehler beim Laden der Datei.');
    }
});