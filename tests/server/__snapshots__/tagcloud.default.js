(function () {
function start() {
    if (!document.getElementById('resCanvas') || typeof TagCanvas === 'undefined') return;
    try {
        TagCanvas.textFont = "Helvetica, Arial, \"PingFang SC\", \"Microsoft YaHei\", \"Hiragino Sans GB\", \"Source Han Sans CN\", \"Noto Sans CJK SC\", sans-serif";
        TagCanvas.textColour = "#333";
        TagCanvas.textHeight = 15;
        TagCanvas.outlineColour = "#E2E1C1";
        TagCanvas.maxSpeed = 0.03;
        TagCanvas.freezeActive = true;
        TagCanvas.outlineMethod = 'block';
        TagCanvas.minBrightness = 0.2;
        TagCanvas.depth = 0.92;
        TagCanvas.pulsateTo = 0.6;
        TagCanvas.initial = [0.1, -0.1];
        TagCanvas.decel = 0.98;
        TagCanvas.reverse = true;
        TagCanvas.hideTags = false;
        TagCanvas.shadow = '#ccf';
        TagCanvas.shadowBlur = 3;
        TagCanvas.weight = false;
        TagCanvas.imageScale = null;
        TagCanvas.fadeIn = 1000;
        TagCanvas.clickToFront = 600;
        TagCanvas.lock = false;
        TagCanvas.Start('resCanvas');
        TagCanvas.tc['resCanvas'].Wheel(true);
    } catch (e) {
        var container = document.getElementById('myCanvasContainer');
        if (container) container.style.display = 'none';
    }
}
if (document.readyState === 'complete') {
    start();
} else {
    window.addEventListener('load', start);
}
})();
