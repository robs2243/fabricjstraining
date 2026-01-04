const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const Datastore = require('@seald-io/nedb');

// Datenbank initialisieren
const dbPath = path.join(__dirname, 'corrections.db');
const db = new Datastore({ filename: dbPath, autoload: true });
console.log("Datenbank Pfad:", dbPath);

let printWindow = null;

// --- Print Window Helper ---
async function openPrintWindow(dataPayload) {
    if (printWindow) {
        printWindow.focus();
        printWindow.webContents.send('init-print-direct', dataPayload);
        return;
    }

    printWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        title: "Drucken",
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    printWindow.loadFile('print.html');
    // printWindow.webContents.openDevTools(); 

    printWindow.webContents.once('dom-ready', () => {
        printWindow.webContents.send('init-print-direct', dataPayload);
    });

    printWindow.on('closed', () => {
        printWindow = null;
    });
}

// IPC: Renderer sendet FERTIGE Daten (Bilder + Meta)
ipcMain.on('open-print-window-direct', (event, collectedData) => {
    openPrintWindow(collectedData);
});

// IPC: PDF generieren
ipcMain.handle('print-to-pdf', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: 'Korrekturen.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (canceled) return false;

    const data = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 } // Wir nutzen CSS margins
    });

    fs.writeFileSync(filePath, data);
    return true;
});


// --- Menu Creation ---
function createAppMenu() {
    const template = [
        {
            label: 'Datei',
            submenu: [
                {
                    label: 'Korrekturen drucken...',
                    accelerator: 'CmdOrCtrl+P',
                    click: (menuItem, browserWindow) => {
                        // Wir bitten das aktive Fenster um die Daten
                        if (browserWindow) {
                            browserWindow.webContents.send('menu-print-request');
                        }
                    }
                },
                { type: 'separator' },
                { role: 'quit', label: 'Beenden' }
            ]
        },
        {
            label: 'Bearbeiten',
            submenu: [
                { role: 'undo', label: 'Rückgängig' },
                { role: 'redo', label: 'Wiederholen' },
                { type: 'separator' },
                { role: 'cut', label: 'Ausschneiden' },
                { role: 'copy', label: 'Kopieren' },
                { role: 'paste', label: 'Einfügen' },
                { role: 'selectAll', label: 'Alles auswählen' }
            ]
        },
        {
            label: 'Ansicht',
            submenu: [
                { role: 'reload', label: 'Neu laden' },
                { role: 'forceReload', label: 'Erzwungenes Neu laden' },
                { role: 'toggleDevTools', label: 'Entwicklertools' },
                { type: 'separator' },
                { role: 'resetZoom', label: 'Originalgröße' },
                { role: 'zoomIn', label: 'Vergrößern' },
                { role: 'zoomOut', label: 'Verkleinern' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'Vollbild' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}


function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        resizable: true, 
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, 
            enableRemoteModule: true 
        }
    });

    win.loadFile('bootstrapPractice.html');
}

app.whenReady().then(() => {
    createAppMenu(); // Menü setzen
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// --- IPC Handlers for Saving/Loading JSON (Legacy) ---
ipcMain.handle('save-json', async (event, dataString) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        defaultPath: 'annotations.json'
    });
    if (canceled) return false;
    fs.writeFileSync(filePath, dataString);
    return true;
});

ipcMain.handle('load-json', async (event) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (canceled || filePaths.length === 0) return null;
    return fs.readFileSync(filePaths[0], 'utf-8');
});

// --- Folder Selection ---
ipcMain.handle('select-folder', async (event) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });

    if (canceled || filePaths.length === 0) return null;

    const dirPath = filePaths[0];
    
    try {
        const files = fs.readdirSync(dirPath);
        // Filter JPGs
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ext === '.jpg' || ext === '.jpeg';
        }).map(file => {
            return {
                name: file,
                path: path.join(dirPath, file) 
            };
        });
        
        return { dirPath, images: imageFiles };
    } catch (err) {
        console.error("Error reading directory:", err);
        return null;
    }
});

// --- NeDB Handler ---
ipcMain.handle('db-upsert', async (event, { imagePath, data }) => {
    try {
        await db.updateAsync({ _id: imagePath }, { $set: data }, { upsert: true });
        return true;
    } catch (err) {
        console.error("DB Upsert Error:", err);
        return false;
    }
});

ipcMain.handle('db-get', async (event, imagePath) => {
    try {
        const doc = await db.findOneAsync({ _id: imagePath });
        return doc;
    } catch (err) {
        console.error("DB Get Error:", err);
        return null;
    }
});

// --- Solution Window Management ---
let solutionWindow = null;

ipcMain.on('open-solution-window', (event, initialImagePath) => {
    if (solutionWindow) {
        solutionWindow.focus();
        if (initialImagePath) {
            solutionWindow.webContents.send('show-image', initialImagePath);
        }
        return;
    }

    solutionWindow = new BrowserWindow({
        width: 800,
        height: 600,
        autoHideMenuBar: true,
        title: "Musterlösung (Extern)",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    solutionWindow.loadFile('solution.html');

    solutionWindow.webContents.once('dom-ready', () => {
        if (initialImagePath) {
            solutionWindow.webContents.send('show-image', initialImagePath);
        }
    });

    solutionWindow.on('closed', () => {
        solutionWindow = null;
    });
});

ipcMain.on('update-solution-image', (event, imagePath) => {
    if (solutionWindow) {
        solutionWindow.webContents.send('show-image', imagePath);
    }
});