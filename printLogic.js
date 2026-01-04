const { ipcRenderer } = require('electron');
const container = document.getElementById('print-container');
const btnPdf = document.getElementById('btn-print-pdf');

function escapeHtml(text) {
    if (!text) return '-';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

ipcRenderer.on('init-print-direct', (event, collectedData) => {
    container.innerHTML = '';
    
    if (!collectedData || collectedData.length === 0) {
        container.innerHTML = '<div class="alert alert-warning">Keine Daten empfangen.</div>';
        return;
    }

    // Gruppieren
    const students = {};
    
    for (const item of collectedData) {
        const meta = item.meta;
        // Key: Klasse_Nachname_Vorname
        // Fallback für fehlende Meta
        const k = meta.klasse || '';
        const n = meta.nachname || '';
        const v = meta.vorname || '';
        const key = `${k}_${n}_${v}`;
        
        if (!students[key]) {
            students[key] = { meta: meta, tasks: [] };
        }
        
        students[key].tasks.push({
            dataUrl: item.dataUrl,
            taskName: meta.aufgabe || item.filename,
            points: meta.punkte
        });
    }
    
    // Rendern
    const sortedKeys = Object.keys(students).sort();
    
    for (const key of sortedKeys) {
        const student = students[key];
        
        // Gesamtpunkte berechnen
        let totalPoints = 0;
        student.tasks.forEach(t => {
            // Punkte können "5", "5.5" oder "-" sein. Wir parsen sicher.
            // Wir ersetzen Komma durch Punkt für parseFloat, falls nötig.
            const p = parseFloat(String(t.points).replace(',', '.'));
            if (!isNaN(p)) {
                totalPoints += p;
            }
        });
        // Runden auf max 1 Nachkommastelle, um 5.0000001 zu vermeiden
        totalPoints = Math.round(totalPoints * 10) / 10;
        
        const sheet = document.createElement('div');
        sheet.className = 'page-sheet mb-5';
        
        // Header
        const header = document.createElement('div');
        header.innerHTML = `
            <div class="main-title">Bewertungsbogen</div>
            <div class="row mb-4">
                <div class="col-8">
                    <table class="meta-table">
                        <tr><td class="label">Vorname:</td><td>${escapeHtml(student.meta.vorname)}</td></tr>
                        <tr><td class="label">Nachname:</td><td>${escapeHtml(student.meta.nachname)}</td></tr>
                        <tr><td class="label">Klasse:</td><td>${escapeHtml(student.meta.klasse)}</td></tr>
                        <tr class="fw-bold"><td class="label pt-2">Gesamtpunkte:</td><td class="pt-2">${totalPoints}</td></tr>
                    </table>
                </div>
                <div class="col-4 text-end text-muted small">Datum: ${new Date().toLocaleDateString()}</div>
            </div>
            <hr class="mb-4">
        `;
        sheet.appendChild(header);
        
        // Tasks
        for (const task of student.tasks) {
            const item = document.createElement('div');
            item.className = 'correction-item';
            
            const taskHeader = document.createElement('div');
            taskHeader.className = 'task-header';
            taskHeader.innerHTML = `
                <span>Aufgabe: ${escapeHtml(task.taskName)}</span>
                <span class="points-box">${escapeHtml(task.points)} Punkte</span>
            `;
            item.appendChild(taskHeader);
            
            const imgDiv = document.createElement('div');
            imgDiv.className = 'image-placeholder';
            imgDiv.style.background = 'white';
            imgDiv.style.height = 'auto';
            
            const img = document.createElement('img');
            img.src = task.dataUrl; 
            img.className = 'img-result';
            img.style.width = '100%';
            
            imgDiv.appendChild(img);
            item.appendChild(imgDiv);
            sheet.appendChild(item);
        }
        
        container.appendChild(sheet);
        
        const pb = document.createElement('div');
        pb.style.pageBreakAfter = 'always';
        container.appendChild(pb);
    }
    
    if(container.lastChild) container.lastChild.remove();
});

btnPdf.addEventListener('click', () => {
    ipcRenderer.invoke('print-to-pdf').then(success => {
        if(success) alert("PDF erfolgreich gespeichert!");
    });
});