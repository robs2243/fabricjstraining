// fabricLogic.js

// Globale Variablen für die Canvas-Instanzen
window.canvasOben = new fabric.Canvas('canvas_oben');
window.canvasUnten = new fabric.Canvas('canvas_unten');

// Initialisiere die Startbilder
updateCanvasImage(window.canvasOben, './pics/katze.jpg');
updateCanvasImage(window.canvasUnten, './pics/hund.jpg');

// Hilfsfunktion zum Setzen des Hintergrundbilds
function updateCanvasImage(canvasInstance, imageUrl) {
    fabric.Image.fromURL(imageUrl).then((img) => {
        // Wir passen die Höhe des Canvas dynamisch an das Bild an.
        // Die Breite ist fix (definiert im HTML, z.B. 800px).
        // Wir skalieren das Bild so, dass es exakt in die Breite passt.
        
        const scaleFactor = canvasInstance.width / img.width;
        const newHeight = img.height * scaleFactor;
        
        // Fabric.js v6+ nutzt setDimensions statt setHeight
        canvasInstance.setDimensions({ height: newHeight });

        img.set({
            originX: 'left', 
            originY: 'top',
            scaleX: scaleFactor,
            scaleY: scaleFactor
        });

        canvasInstance.backgroundImage = img;
        canvasInstance.requestRenderAll();
    }).catch(err => {
        console.error("Fehler beim Laden des Bildes:", err);
    });
}

window.updateCanvasImage = updateCanvasImage;


// --- Zeichen-Logik & Werkzeuge ---

let currentTool = 'none'; // 'none', 'line', 'f', 'r', 'u', 'l'
let lineToDraw = null;
let isMouseDown = false;
let activeCanvas = null; 
let ghostObject = null; // Vorschau-Objekt

// Mapping der Text-Werkzeuge auf ihren Inhalt
const textTools = {
    'f': 'f',
    'r': 'r',
    'u': 'ug',
    'l': 'Lü'
};

function setTool(tool) {
    currentTool = tool;
    console.log("Werkzeug aktiviert:", tool);
    
    [window.canvasOben, window.canvasUnten].forEach(c => {
        // Ghost entfernen beim Werkzeugwechsel
        if (ghostObject && ghostObject.canvas === c) {
            c.remove(ghostObject);
        }
        
        if (tool === 'none') {
            c.selection = true;
            c.defaultCursor = 'default';
        } else {
            c.selection = false;
            c.defaultCursor = tool === 'line' ? 'crosshair' : 'default';
            c.discardActiveObject();
            c.requestRenderAll();
        }
    });
    ghostObject = null;
}

function attachDrawingLogic(canvas) {
    
    canvas.on('mouse:down', (o) => {
        let pointer = o.scenePoint || o.pointer;
        if (!pointer && canvas.getPointer) {
             pointer = canvas.getPointer(o.e);
        }
        if (!pointer) return;

        isMouseDown = true;
        activeCanvas = canvas;
        
        if (currentTool === 'line') {
            const points = [pointer.x, pointer.y, pointer.x, pointer.y];
            lineToDraw = new fabric.Line(points, {
                strokeWidth: 3,
                stroke: 'red',
                selectable: false,
                evented: false,
                originX: 'center',
                originY: 'center'
            });
            canvas.add(lineToDraw);
        
        } else if (textTools[currentTool]) {
            // Text stempeln
            const textContent = textTools[currentTool];
            const text = new fabric.Text(textContent, {
                left: pointer.x,
                top: pointer.y,
                fontSize: 40,
                fill: 'red',
                fontWeight: 'bold',
                fontFamily: 'Arial',
                originX: 'center',
                originY: 'center'
            });
            canvas.add(text);
            canvas.requestRenderAll();
        }
    });
    
    canvas.on('mouse:move', (o) => {
        // Robuste Pointer-Ermittlung
        let pointer = o.scenePoint || o.pointer;
        if (!pointer && canvas.getPointer) {
             pointer = canvas.getPointer(o.e);
        }
        
        if (!pointer) return;
        
        if (currentTool === 'line') {
            if (!isMouseDown || activeCanvas !== canvas) return;
            
            // Linie zeichnen (horizontal erzwungen)
            lineToDraw.set({
                x2: pointer.x,
                y2: lineToDraw.y1 
            });
            canvas.requestRenderAll();
            
        } else if (textTools[currentTool]) {
            // Ghost-Logik für Text-Werkzeuge
            const textContent = textTools[currentTool];
            
            if (!ghostObject) {
                ghostObject = new fabric.Text(textContent, {
                    fontSize: 40,
                    fill: 'red',
                    fontWeight: 'bold',
                    fontFamily: 'Arial',
                    originX: 'center',
                    originY: 'center',
                    opacity: 0.5,
                    selectable: false,
                    evented: false,
                    visible: false 
                });
                canvas.add(ghostObject);
            }
            
            // Text aktualisieren, falls Werkzeug gewechselt wurde (Sicherheitsnetz)
            if (ghostObject.text !== textContent) {
                ghostObject.set('text', textContent);
            }
            
            // Falls Ghost auf anderem Canvas war
            if (ghostObject.canvas !== canvas) {
                if (ghostObject.canvas) ghostObject.canvas.remove(ghostObject);
                canvas.add(ghostObject);
            }
            
            ghostObject.set({
                left: pointer.x,
                top: pointer.y,
                visible: true
            });
            
            // Sicherstellen, dass Ghost oben ist
            if (canvas.bringObjectToFront) {
                canvas.bringObjectToFront(ghostObject);
            } else if (ghostObject.bringToFront) {
                ghostObject.bringToFront();
            }
            
            canvas.requestRenderAll();
        }
    });
    
    canvas.on('mouse:up', (o) => {
        if (currentTool === 'line' && isMouseDown && activeCanvas === canvas) {
             if (lineToDraw) {
                 lineToDraw.setCoords();
                 lineToDraw.set({
                     selectable: true,
                     evented: true
                 });
                 lineToDraw = null;
             }
        }
        isMouseDown = false;
        activeCanvas = null;
    });
    
    canvas.on('mouse:out', () => {
        if (textTools[currentTool] && ghostObject && ghostObject.canvas === canvas) {
            canvas.remove(ghostObject);
            ghostObject = null;
            canvas.requestRenderAll();
        }
    });
}

attachDrawingLogic(window.canvasOben);
attachDrawingLogic(window.canvasUnten);


// --- Globale Tastatur-Events ---

window.addEventListener('keydown', (event) => {
    // Ignoriere Tastatur-Events, wenn der Benutzer in einem Eingabefeld schreibt
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    const key = event.key.toLowerCase();
    
    if (key === 'escape') {
        setTool('none');
    } else if (key === 's') { // 's' für Strich (Linie)
        setTool(currentTool === 'line' ? 'none' : 'line');
    } else if (key === 'f') {
        setTool(currentTool === 'f' ? 'none' : 'f');
    } else if (key === 'r') {
        setTool(currentTool === 'r' ? 'none' : 'r');
    } else if (key === 'u') {
        setTool(currentTool === 'u' ? 'none' : 'u');
    } else if (key === 'l') { // 'l' für Lü
        setTool(currentTool === 'l' ? 'none' : 'l');
    } else if (key === 'delete' || key === 'backspace') {
        [window.canvasOben, window.canvasUnten].forEach(c => {
            const activeObjects = c.getActiveObjects();
            if (activeObjects.length) {
                c.discardActiveObject();
                activeObjects.forEach((obj) => {
                    c.remove(obj);
                });
                c.requestRenderAll();
            }
        });
    }
});