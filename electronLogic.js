const { ipcRenderer } = require('electron');

// Buttons Ordnerwahl
const btnFolderOben = document.getElementById('btn_select_folder_oben');
const btnFolderUnten = document.getElementById('btn_select_folder_unten');
const lblFolderOben = document.getElementById('lbl_folder_oben');
const lblFolderUnten = document.getElementById('lbl_folder_unten');

// Buttons Save/Load (Legacy / Manuell)
const btnSave = document.getElementById('btn_json_speichern');
const btnLoad = document.getElementById('btn_json_laden');

// --- Ordner Logik ---

btnFolderOben.addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('select-folder');
    if (result) {
        const { dirPath, images } = result;
        lblFolderOben.textContent = dirPath;
        lblFolderOben.title = dirPath; // Tooltip für langen Pfad
        
        if (window.CarouselAPI) {
            window.CarouselAPI.setImagesOben(images);
        }
    }
});

btnFolderUnten.addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('select-folder');
    if (result) {
        const { dirPath, images } = result;
        lblFolderUnten.textContent = dirPath;
        lblFolderUnten.title = dirPath;
        
        if (window.CarouselAPI) {
            window.CarouselAPI.setImagesUnten(images);
        }
    }
});


// --- Manuelles Speichern/Laden Logik (angepasst an neue API) ---

btnSave.addEventListener('click', async () => {
    if (!window.CarouselAPI) return;

    const cache = window.CarouselAPI.getAnnotationCache();
    
    // Wir holen uns das aktuelle Bild-Objekt
    const currentImgObj = window.CarouselAPI.getCurrentImageUnten();
    const currentImgPath = currentImgObj ? currentImgObj.path : null;

    const data = {
        currentImage: currentImgPath, // Wir speichern den Pfad
        cache: cache
    };
    
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
            if (data.cache) {
                window.CarouselAPI.setAnnotationCache(data.cache);
            }
            // Hinweis: Das automatische Springen zum Bild funktioniert nur,
            // wenn der Ordner bereits geladen wurde, der dieses Bild enthält!
            // Da wir jetzt dynamische Pfade haben, ist das Laden komplexer.
            // Wir lassen es erstmal so (Daten werden in Cache geladen).
            alert("Annotationen geladen. Bitte sicherstellen, dass der richtige Bilder-Ordner geöffnet ist.");
        }
        
    } catch (e) {
        console.error("Fehler beim Laden:", e);
        alert('Fehler beim Laden der Datei.');
    }
});
