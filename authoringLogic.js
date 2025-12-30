const fs = require('fs');
const piexif = require('piexifjs');
const { webUtils } = require('electron');

// DOM Elemente
const fileInput = document.getElementById('fileInput');
const previewImage = document.getElementById('preview-image');
const placeholderText = document.getElementById('placeholder-text');

const inpVorname = document.getElementById('vorname');
const inpNachname = document.getElementById('nachname');
const inpKlasse = document.getElementById('klasse');
const inpAufgabe = document.getElementById('aufgabe');
const inpPunkte = document.getElementById('punkte');

const btnLoad = document.getElementById('btnLoadMeta');
const btnSave = document.getElementById('btnSaveMeta');

let currentFilePath = null;
let currentJpegBinary = null; 

// 1. Datei auswählen und anzeigen
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Pfad sicher holen (Electron-spezifisch)
    // Bei älteren Versionen war es file.path, jetzt oft via webUtils
    if (file.path) {
        currentFilePath = file.path;
    } else if (webUtils) {
        currentFilePath = webUtils.getPathForFile(file);
    } else {
        console.error("Konnte Pfad nicht ermitteln.");
        return;
    }

    console.log("Pfad:", currentFilePath);

    // Datei lesen
    try {
        const buffer = fs.readFileSync(currentFilePath);
        // Piexif braucht "binary" string, nicht buffer
        currentJpegBinary = buffer.toString('binary'); 
        
        // Vorschau anzeigen (base64)
        const base64 = buffer.toString('base64');
        previewImage.src = `data:image/jpeg;base64,${base64}`;
        previewImage.style.display = 'block';
        placeholderText.style.display = 'none';

        // Optional: Direkt beim Öffnen versuchen zu laden? 
        // Wir machen es manuell per Button, wie gewünscht, oder automatisch?
        // User sagte "Laden Button". Also warten wir auf Klick.
        console.log("Bild geladen:", currentFilePath);
        
    } catch (err) {
        console.error("Fehler beim Lesen der Datei:", err);
        alert("Fehler beim Öffnen der Datei.");
    }
});

// 2. Metadaten aus Bild laden
btnLoad.addEventListener('click', () => {
    console.log("--- Lade Metadaten ---");
    if (!currentJpegBinary) {
        alert("Bitte erst ein Bild auswählen.");
        return;
    }

    try {
        const exifObj = piexif.load(currentJpegBinary);
        console.log("Gesamtes EXIF Objekt:", exifObj);
        
        // Tag 37510 (0x9286) ist UserComment
        const userComment = exifObj["Exif"][piexif.ExifIFD.UserComment];
        console.log("Raw UserComment:", userComment);

        if (!userComment) {
            console.warn("Kein UserComment Tag gefunden.");
            alert("Keine Metadaten gefunden.");
            return;
        }

        // Dekodierung: UserComment ist oft ASCII-Code oder Buffer
        // Piexif gibt es meist als String zurück, aber manchmal mit "ASCII\0\0\0" Prefix
        let jsonString = userComment;
        
        // Prüfen auf "ASCII" Header (erste 5-8 chars)
        // Manchmal ist es ein String, manchmal ein Array von Char-Codes?
        // Piexif js load returns strings usually.
        
        if (jsonString.startsWith("ASCII\0\0\0")) {
            jsonString = jsonString.substring(8);
        } else if (jsonString.startsWith("UNICODE\0\0\0")) {
            jsonString = jsonString.substring(8); // Encoding issues might apply here
        }
        
        console.log("Bereinigter JSON String:", jsonString);

        const data = JSON.parse(jsonString);
        console.log("Geparste Daten:", data);
        
        inpVorname.value = data.vorname || '';
        inpNachname.value = data.nachname || '';
        inpKlasse.value = data.klasse || '';
        inpAufgabe.value = data.aufgabe || '';
        inpPunkte.value = data.punkte || '';

        alert("Daten erfolgreich geladen!");

    } catch (err) {
        console.error("Fehler beim Parsen/Laden:", err);
        alert("Fehler beim Lesen der Metadaten. Siehe Konsole.");
    }
});

// 3. Metadaten speichern
btnSave.addEventListener('click', () => {
    console.log("--- Speichere Metadaten ---");
    if (!currentFilePath || !currentJpegBinary) {
        alert("Bitte erst ein Bild auswählen.");
        return;
    }

    const data = {
        vorname: inpVorname.value,
        nachname: inpNachname.value,
        klasse: inpKlasse.value,
        aufgabe: inpAufgabe.value,
        punkte: inpPunkte.value,
        timestamp: new Date().toISOString()
    };
    
    console.log("Zu speichernde Daten:", data);

    try {
        const jsonString = JSON.stringify(data);
        // Wir fügen "ASCII\0\0\0" hinzu, damit es standardkonform ist
        // Das hilft vielen Readern.
        const userComment = "ASCII\0\0\0" + jsonString;

        const exifObj = piexif.load(currentJpegBinary);
        
        if (!exifObj["Exif"]) exifObj["Exif"] = {};
        
        exifObj["Exif"][piexif.ExifIFD.UserComment] = userComment;

        console.log("Neues EXIF Objekt (Ausschnitt):", exifObj["Exif"]);

        const exifBytes = piexif.dump(exifObj);
        const newJpegBinary = piexif.insert(exifBytes, currentJpegBinary);

        const newBuffer = Buffer.from(newJpegBinary, 'binary');
        fs.writeFileSync(currentFilePath, newBuffer);
        
        currentJpegBinary = newJpegBinary; // Cache update

        console.log("Datei erfolgreich geschrieben:", currentFilePath);
        alert("Daten erfolgreich ins Bild geschrieben!");

    } catch (err) {
        console.error("Fehler beim Speichern:", err);
        alert("Fehler beim Speichern. Siehe Konsole.");
    }
});
