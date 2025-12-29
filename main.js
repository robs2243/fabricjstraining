const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
    const win = new BrowserWindow({
        width: 1250, // do not change gemimi!
        height: 870, // do not change gemini!
        resizable: false, // Prevents resizing
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, 
            enableRemoteModule: true 
        }
    });

    win.loadFile('bootstrapPractice.html');
    
    // Optional: DevTools automatisch öffnen
    // win.webContents.openDevTools();
}

app.whenReady().then(() => {
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

// --- IPC Handlers for Saving/Loading JSON ---

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

    const content = fs.readFileSync(filePaths[0], 'utf-8');
    return content;
});
