var btn_vor = document.getElementById("btn_vor");
var btn_unten_vor = document.getElementById("btn_unten_vor");
var btn_zuruck = document.getElementById("btn_zuruck");
var btn_unten_zuruck = document.getElementById("btn_unten_zuruck");

// Wir greifen auf die globalen Canvas-Variablen aus fabricLogic.js zu
// window.canvasOben und window.canvasUnten

btn_vor.addEventListener("click", ()=>{
    // bild.src = "./pics/katze2.jpg"
    if(window.updateCanvasImage && window.canvasOben) {
        window.updateCanvasImage(window.canvasOben, "./pics/katze2.jpg");
    }
})

btn_unten_vor.addEventListener("click", ()=>{
    // bild_unten.src = "./pics/hund2.jpg"
    if(window.updateCanvasImage && window.canvasUnten) {
        window.updateCanvasImage(window.canvasUnten, "./pics/hund2.jpg");
    }
})


btn_zuruck.addEventListener("click", ()=>{
    // bild.src = "./pics/katze.jpg"
    if(window.updateCanvasImage && window.canvasOben) {
        window.updateCanvasImage(window.canvasOben, "./pics/katze.jpg");
    }
})


btn_unten_zuruck.addEventListener("click", ()=>{
    // bild_unten.src = "./pics/hund.jpg"
    if(window.updateCanvasImage && window.canvasUnten) {
        window.updateCanvasImage(window.canvasUnten, "./pics/hund.jpg");
    }
})
