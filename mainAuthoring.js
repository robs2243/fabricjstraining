const { app, BrowserWindow } = require('electron');

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        resizable: true, 
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, 
            enableRemoteModule: true 
        }
    });

    win.loadFile('authoring.html');
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
