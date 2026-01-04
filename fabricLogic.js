// fabricLogic.js

// Globale Variablen für die Canvas-Instanzen
window.canvasOben = new fabric.Canvas('canvas_oben');
window.canvasUnten = new fabric.Canvas('canvas_unten');

// Settings Inputs
const inputSize = document.getElementById('toolSize');
const inputColor = document.getElementById('toolColor');

function getSettings() {
    return {
        size: inputSize ? parseInt(inputSize.value, 10) : 40,
        color: inputColor ? inputColor.value : 'red'
    };
}

// Initialisiere die Startbilder
updateCanvasImage(window.canvasOben, './pics/katze.jpg');
updateCanvasImage(window.canvasUnten, './pics/hund.jpg');

// Hilfsfunktion zum Setzen des Hintergrundbilds
function updateCanvasImage(canvasInstance, imageUrl) {
    fabric.Image.fromURL(imageUrl).then((img) => {
        const scaleFactor = canvasInstance.width / img.width;
        const newHeight = img.height * scaleFactor;
        
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

let currentTool = 'none'; 
let lineToDraw = null;
let isMouseDown = false;
let activeCanvas = null; 
let ghostObject = null; // Vorschau-Objekt

// Mapping der Text-Werkzeuge
const textTools = {
    'f': 'f',
    'r': 'r',
    'u': 'ug',
    'l': 'Lü',
    '1': '1', '2': '2', '3': '3', '4': '4', '5': '5',
    '6': '6', '7': '7', '8': '8', '9': '9'
};

function setTool(tool) {
    currentTool = tool;
    console.log("Werkzeug aktiviert:", tool);
    
    [window.canvasOben, window.canvasUnten].forEach(c => {
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

// Live Update für Ghost bei Settings-Änderung
function updateGhostStyle() {
    if (!ghostObject) return;
    const { size, color } = getSettings();
    
    if (ghostObject.type === 'text') {
        ghostObject.set({ fontSize: size, fill: color });
    }
    // Falls Linien-Vorschau existiert (haben wir aktuell nicht als Ghost, nur als lineToDraw)
    ghostObject.canvas.requestRenderAll();
}

if(inputSize) inputSize.addEventListener('input', updateGhostStyle);
if(inputColor) inputColor.addEventListener('input', updateGhostStyle);


function attachDrawingLogic(canvas) {
    
    canvas.on('mouse:down', (o) => {
        let pointer = o.scenePoint || o.pointer;
        if (!pointer && canvas.getPointer) {
             pointer = canvas.getPointer(o.e);
        }
        if (!pointer) return;

        isMouseDown = true;
        activeCanvas = canvas;
        
        const { size, color } = getSettings();

        if (currentTool === 'line') {
            const points = [pointer.x, pointer.y, pointer.x, pointer.y];
            lineToDraw = new fabric.Line(points, {
                strokeWidth: Math.max(2, size / 10), // Dynamische Breite basierend auf Size
                stroke: color,
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
                fontSize: size,
                fill: color,
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
        let pointer = o.scenePoint || o.pointer;
        if (!pointer && canvas.getPointer) {
             pointer = canvas.getPointer(o.e);
        }
        
        if (!pointer) return;
        
        const { size, color } = getSettings();

        if (currentTool === 'line') {
            if (!isMouseDown || activeCanvas !== canvas) return;
            lineToDraw.set({ x2: pointer.x, y2: lineToDraw.y1 });
            canvas.requestRenderAll();
            
        } else if (textTools[currentTool]) {
            const textContent = textTools[currentTool];
            
            if (!ghostObject) {
                ghostObject = new fabric.Text(textContent, {
                    fontSize: size,
                    fill: color,
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
            
            // Text aktualisieren (falls Tool gewechselt)
            if (ghostObject.text !== textContent) {
                ghostObject.set('text', textContent);
            }
            // Style aktualisieren (falls Slider bewegt)
            ghostObject.set({ fontSize: size, fill: color });
            
            if (ghostObject.canvas !== canvas) {
                if (ghostObject.canvas) ghostObject.canvas.remove(ghostObject);
                canvas.add(ghostObject);
            }
            
            ghostObject.set({
                left: pointer.x,
                top: pointer.y,
                visible: true
            });
            
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
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    const key = event.key.toLowerCase();
    
    if (key === 'escape') {
        setTool('none');
    } else if (key === 's') { 
        setTool(currentTool === 'line' ? 'none' : 'line');
    } else if (textTools[key]) {
        // Generischer Handler für alle Text-Tools (Buchstaben & Zahlen)
        setTool(currentTool === key ? 'none' : key);
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
