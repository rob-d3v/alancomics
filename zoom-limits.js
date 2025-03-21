// Definindo limites de zoom
const ZOOM_MIN = 0.2;  // Limite mínimo de zoom (20%)
const ZOOM_MAX = 5.0;  // Limite máximo de zoom (500%)
const ZOOM_STEP = 0.1; // Passo de zoom (10%)

// Função para limitar o valor do zoom dentro dos limites definidos
function limitZoom(zoom) {
    return Math.max(ZOOM_MIN, Math.min(zoom, ZOOM_MAX));
}

// Função para mostrar indicador visual de limite de zoom
function showZoomLimitIndicator(isMax) {
    // Remover indicador anterior se existir
    const oldIndicator = document.getElementById('zoomLimitIndicator');
    if (oldIndicator) {
        oldIndicator.remove();
    }

    // Criar novo indicador
    const indicator = document.createElement('div');
    indicator.id = 'zoomLimitIndicator';
    indicator.className = 'zoom-limit-indicator';
    indicator.textContent = isMax ? 'Zoom máximo atingido' : 'Zoom mínimo atingido';
    
    document.body.appendChild(indicator);
    
    // Mostrar indicador
    setTimeout(() => indicator.classList.add('visible'), 10);
    
    // Remover após a animação
    setTimeout(() => indicator.remove(), 3000);
}

// Função melhorada para controle de zoom
function enhancedZoomControl() {
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetZoomBtn = document.getElementById('resetZoomBtn');

    if (zoomInBtn) {
        zoomInBtn.removeEventListener('click', null);
        zoomInBtn.addEventListener('click', () => {
            const viewer = document.getElementById('viewer');
            const viewerRect = viewer.getBoundingClientRect();
            const centerX = viewerRect.width / 2;
            const centerY = viewerRect.height / 2;

            const newZoom = limitZoom(currentZoom + ZOOM_STEP);
            
            if (newZoom === ZOOM_MAX) {
                showZoomLimitIndicator(true);
            }
            
            currentZoom = newZoom;
            zoomAtPoint(centerX, centerY);
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.removeEventListener('click', null);
        zoomOutBtn.addEventListener('click', () => {
            const viewer = document.getElementById('viewer');
            const viewerRect = viewer.getBoundingClientRect();
            const centerX = viewerRect.width / 2;
            const centerY = viewerRect.height / 2;

            const newZoom = limitZoom(currentZoom - ZOOM_STEP);
            
            if (newZoom === ZOOM_MIN) {
                showZoomLimitIndicator(false);
            }
            
            currentZoom = newZoom;
            zoomAtPoint(centerX, centerY);
        });
    }

    if (resetZoomBtn) {
        resetZoomBtn.removeEventListener('click', null);
        resetZoomBtn.addEventListener('click', () => {
            currentZoom = 1.0;
            resetScrollPosition();
            adjustImageContainer();
            centerImages();
        });
    }

    // Configurar zoom com roda do mouse
    setupWheelZoom();
}

// Função para zoom com roda do mouse
function setupWheelZoom() {
    const viewer = document.getElementById('viewer');
    if (!viewer) return;

    viewer.addEventListener('wheel', function(e) {
        if (e.ctrlKey) {
            e.preventDefault();

            const imageContainer = document.getElementById('imageContainer');
            const containerRect = imageContainer.getBoundingClientRect();
            const mouseX = e.clientX - containerRect.left;
            const mouseY = e.clientY - containerRect.top;

            let scaleFactor = ZOOM_STEP;
            // Ajustar fator de escala para movimentos mais suaves
            if (Math.abs(e.deltaY) < 50) {
                scaleFactor = ZOOM_STEP / 2;
            }

            if (e.deltaY < 0) {
                // Zoom in
                const newZoom = limitZoom(currentZoom + scaleFactor);
                if (newZoom === ZOOM_MAX) {
                    showZoomLimitIndicator(true);
                }
                currentZoom = newZoom;
            } else {
                // Zoom out
                const newZoom = limitZoom(currentZoom - scaleFactor);
                if (newZoom === ZOOM_MIN) {
                    showZoomLimitIndicator(false);
                }
                currentZoom = newZoom;
            }

            zoomAtPoint(mouseX, mouseY);
        }
    }, { passive: false });
}

// Função para instalar as melhorias de zoom
function installZoomLimits() {
    console.log("Instalando limites de zoom...");
    
    // Substituir controles de zoom existentes
    enhancedZoomControl();
    
    // Garantir que o zoom atual está dentro dos limites
    currentZoom = limitZoom(currentZoom);
    
    console.log("Limites de zoom instalados com sucesso!");
} 