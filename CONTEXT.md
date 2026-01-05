# Projekt-Spezifikation: Electron Korrektur-Assistent

## 1. Überblick
Dies ist eine **Electron-Desktop-Anwendung**, die entwickelt wurde, um Lehrern das digitale Korrigieren und Bewerten von Schülerabgaben (im Bildformat, z.B. JPG) zu erleichtern. Die Anwendung ermöglicht den direkten visuellen Vergleich mit einer Musterlösung, das Einzeichnen von Korrekturen mittels `Fabric.js` und das Speichern von Bewertungen (Metadaten) direkt in den Bilddateien (EXIF) sowie in einer lokalen Datenbank.

## 2. Technologie-Stack
*   **Laufzeitumgebung:** Node.js / Electron (mit `nodeIntegration: true`, `contextIsolation: false`).
*   **Frontend-UI:** HTML5, Bootstrap 5.3 (via CDN), Bootstrap Icons.
*   **Logik & Interaktivität:** Vanilla JavaScript (ES6+).
*   **Grafik/Canvas:** `Fabric.js` (v5/v7) für Zeichenfunktionen und Overlay-Handling auf Bildern.
*   **Datenhaltung:**
    *   **Lokal (NeDB):** `corrections.db` für persistente Speicherung von Anmerkungen/Status.
    *   **In-File (EXIF):** `piexifjs` zum Lesen/Schreiben von JSON-Metadaten (Name, Punkte, Klasse) direkt in den `UserComment`-Tag der JPG-Dateien.
*   **Build-System:** Keines (direkte Nutzung von Scripts).

## 3. Architektur & Module

Die Anwendung besteht aus zwei Hauptmodulen (Startpunkten) und Hilfsfenstern:

### A. Hauptanwendung (Korrektur-Modus)
*   **Entry Point:** `main.js` (startet `bootstrapPractice.html`).
*   **GUI (`bootstrapPractice.html`):**
    *   **Split-View:** Oben Referenzbild (Musterlösung), Unten Arbeitsbild (Schülerabgabe).
    *   **Canvas (`fabricLogic.js`):** Instanziiert zwei `fabric.Canvas`-Objekte (`canvasOben`, `canvasUnten`). Handhabt Zeichenwerkzeuge (Linien, Text-Stempel wie "f", "r", "ug").
    *   **Sidebar:** Eingabefelder für Metadaten (Vorname, Nachname, Punkte), Werkzeug-Einstellungen (Farbe/Größe) und Tastatur-Shortcuts.
*   **Logik (`bootstrapPractice.js` / `electronLogic.js`):**
    *   Lädt Bilder aus gewählten lokalen Verzeichnissen.
    *   Kommuniziert via IPC mit dem Main-Process (z.B. Ordnerwahl, Speichern).

### B. Authoring-Tool (Metadaten-Editor)
*   **Entry Point:** `mainAuthoring.js` (startet `authoring.html`).
*   **Zweck:** Ein separates Tool, um Schüler-Metadaten (Name, Klasse, Aufgabe) *vor* oder *nach* der Korrektur stapelweise in die JPG-EXIF-Daten zu schreiben.
*   **Logik (`authoringLogic.js`):**
    *   Lädt ein Bild, liest vorhandene EXIF-Daten (`piexifjs`).
    *   Erlaubt das Editieren und Rückschreiben der Daten als JSON-String in den EXIF-Tag.

### C. Hilfsfenster & Services (Main Process)
*   **Drucken (`print.html`):** Generiert eine PDF-Übersicht der Korrektur. Wird dynamisch mit Daten befüllt.
*   **Musterlösung (`solution.html`):** Ein externes Fenster, um die Musterlösung auf einem zweiten Monitor anzuzeigen.
*   **Datenbank:** NeDB wird im Main-Process initialisiert und speichert den Status der Korrekturen (um z.B. Arbeitsstände wiederherzustellen).

## 4. Datenfluss & Datenmodelle

### Metadaten-Struktur (JSON)
Diese Struktur wird im EXIF `UserComment` oder in der NeDB gespeichert:
```json
{
  "vorname": "Max",
  "nachname": "Mustermann",
  "klasse": "E2ME2",
  "aufgabe": "Aufg1",
  "punkte": "10",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### IPC-Kommunikation (Renderer <-> Main)
Die App nutzt ein klassisches IPC-Muster:
1.  **Renderer:** Ruft `ipcRenderer.invoke('select-folder')` auf.
2.  **Main:** Öffnet System-Dialog, scannt Verzeichnis, gibt Dateiliste zurück.
3.  **Renderer:** Lädt Bild in Canvas (`fabric.Image.fromURL`).
4.  **Speichern:** Renderer sammelt Daten -> `ipcRenderer.invoke('db-upsert', ...)` oder nutzt `piexifjs` lokal im Renderer (dank Node-Integration), um die Datei zu überschreiben.

## 5. Coding-Konventionen für KI-Agenten
*   **Modul-System:** Da kein Bundler (Webpack) verwendet wird, sind `require()` Aufrufe direkt im Frontend-Code (wegen Electron `nodeIntegration`) üblich und notwendig.
*   **Pfad-Handling:** Immer `path.join()` verwenden, da die App cross-platform (Windows/Mac) sein könnte, aktuell aber auf Windows (`win32`) läuft.
*   **UI-Updates:** Direkte DOM-Manipulation (`document.getElementById`) ist der Standard; kein React/Vue Framework.
*   **Fabric.js:** Beachte die Unterschiede zwischen Fabric v5 und v7 (hier wird v7 importiert, aber Code sieht teils nach v5-Mustern aus – Vorsicht bei API-Changes wie `setDimensions` vs `setWidth`).
