// electronLogic.js - Gekapselt in IIFE um Namenskonflikte zu vermeiden
(function() {
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

    if (btnFolderOben) {
        btnFolderOben.addEventListener('click', async () => {
            const result = await ipcRenderer.invoke('select-folder');
            if (result) {
                const { dirPath, images } = result;
                if(lblFolderOben) {
                    lblFolderOben.textContent = dirPath;
                    lblFolderOben.title = dirPath;
                }
                
                if (window.CarouselAPI) {
                    window.CarouselAPI.setImagesOben(images);
                }
            }
        });
    }

    if (btnFolderUnten) {
        btnFolderUnten.addEventListener('click', async () => {
            const result = await ipcRenderer.invoke('select-folder');
            if (result) {
                const { dirPath, images } = result;
                if(lblFolderUnten) {
                    lblFolderUnten.textContent = dirPath;
                    lblFolderUnten.title = dirPath;
                }
                
                if (window.CarouselAPI) {
                    window.CarouselAPI.setImagesUnten(images);
                }
            }
        });
    }


    // --- Manuelles Speichern/Laden Logik (angepasst an neue API) ---

    if (btnSave) {
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
    }

    if (btnLoad) {
        btnLoad.addEventListener('click', async () => {
            const jsonString = await ipcRenderer.invoke('load-json');
            if (!jsonString) return; 
            
            try {
                const data = JSON.parse(jsonString);
                
                if (window.CarouselAPI) {
                    if (data.cache) {
                        window.CarouselAPI.setAnnotationCache(data.cache);
                    }
                    alert("Annotationen geladen. Bitte sicherstellen, dass der richtige Bilder-Ordner geöffnet ist.");
                }
                
            } catch (e) {
                console.error("Fehler beim Laden:", e);
                alert('Fehler beim Laden der Datei.');
            }
        });
    }

})();