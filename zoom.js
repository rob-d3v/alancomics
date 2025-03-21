// Função melhorada para garantir que as imagens permaneçam centralizadas durante o zoom
function enhancedZoomAtPoint(pointX, pointY) {
    const imageContainer = document.getElementById('imageContainer');
    const viewer = document.getElementById('viewer');

    if (!imageContainer || !viewer) return;

    // Obter as dimensões do visualizador e do container
    const viewerRect = viewer.getBoundingClientRect();
    const containerRect = imageContainer.getBoundingClientRect();
    
    // Armazenar zoom antigo para calcular a proporção
    const oldZoom = currentZoom;
    
    // Calcular o centro do visualizador
    const viewerCenterX = viewerRect.width / 2;
    const viewerCenterY = viewerRect.height / 2;
    
    // Calcular o deslocamento do ponto clicado em relação ao centro do visualizador
    const offsetX = pointX - viewerCenterX;
    const offsetY = pointY - viewerCenterY;
    
    // Aplicar o novo zoom
    imageContainer.style.transform = `scale(${currentZoom})`;
    
    // Calcular a posição que mantém o centro do visualizador fixo
    // independentemente de onde o zoom foi aplicado
    if (isVertical) {
        // Para rolagem vertical
        imageContainer.style.transformOrigin = 'center center';
        scrollPosition = scrollPosition * (currentZoom / oldZoom);
    } else {
        // Para rolagem horizontal
        imageContainer.style.transformOrigin = 'center center';
        scrollPosition = scrollPosition * (currentZoom / oldZoom);
    }
    
    // Aplicar a transformação com a nova posição de rolagem
    updateScrollPosition();
    
    // Verificar se o container está menor que o visualizador e centralizar se necessário
    centerIfNeeded();
    
    // Atualizar outros elementos da UI
    adjustImageContainer();
    updateProgressIndicator();
}

// Função para centralizar o container se ele for menor que o visualizador
function centerIfNeeded() {
    const imageContainer = document.getElementById('imageContainer');
    const viewer = document.getElementById('viewer');
    
    if (!imageContainer || !viewer) return;
    
    const viewerRect = viewer.getBoundingClientRect();
    const containerRect = imageContainer.getBoundingClientRect();
    
    // Calcular offsets para centralização
    let offsetX = 0;
    let offsetY = 0;
    
    // Centralizar horizontalmente se o container for menor que o visualizador
    if (containerRect.width < viewerRect.width) {
        offsetX = (viewerRect.width - containerRect.width) / 2;
    }
    
    // Centralizar verticalmente se o container for menor que o visualizador
    if (containerRect.height < viewerRect.height) {
        offsetY = (viewerRect.height - containerRect.height) / 2;
    }
    
    // Aplicar transformação com os offsets calculados
    if (isVertical) {
        imageContainer.style.transform = `translateY(-${scrollPosition}px) translateX(${offsetX / currentZoom}px) scale(${currentZoom})`;
    } else {
        imageContainer.style.transform = `translateX(-${scrollPosition}px) translateY(${offsetY / currentZoom}px) scale(${currentZoom})`;
    }
}

// Substituir a função updateScrollPosition para manter a centralização
function enhancedUpdateScrollPosition() {
    const imageContainer = document.getElementById('imageContainer');
    const viewer = document.getElementById('viewer');
    
    if (!imageContainer || !viewer) return;
    
    const viewerRect = viewer.getBoundingClientRect();
    const containerRect = imageContainer.getBoundingClientRect();
    
    // Calcular as dimensões reais considerando o zoom
    const scaledWidth = containerRect.width;
    const scaledHeight = containerRect.height;
    
    // Calcular o máximo de rolagem possível
    let maxScroll;
    if (isVertical) {
        maxScroll = Math.max(0, scaledHeight - viewerRect.height);
    } else {
        maxScroll = Math.max(0, scaledWidth - viewerRect.width);
    }
    
    // Limitar a posição de rolagem para não ultrapassar os limites
    scrollPosition = Math.max(0, Math.min(scrollPosition, maxScroll / currentZoom));
    
    // Calcular offsets para centralização
    let offsetX = 0;
    let offsetY = 0;
    
    // Centralizar horizontalmente se o container for menor que o visualizador
    if (scaledWidth < viewerRect.width) {
        offsetX = (viewerRect.width - scaledWidth) / 2 / currentZoom;
    }
    
    // Centralizar verticalmente se o container for menor que o visualizador
    if (scaledHeight < viewerRect.height) {
        offsetY = (viewerRect.height - scaledHeight) / 2 / currentZoom;
    }
    
    // Aplicar transformação com base na direção e centralização
    if (isVertical) {
        imageContainer.style.transform = `translateY(-${scrollPosition}px) translateX(${offsetX}px) scale(${currentZoom})`;
    } else {
        imageContainer.style.transform = `translateX(-${scrollPosition}px) translateY(${offsetY}px) scale(${currentZoom})`;
    }
    
    // Parar rolagem automática se chegou ao final
    if (scrollPosition >= maxScroll / currentZoom && autoScrolling) {
        stopScrolling();
    }
    
    updateProgressIndicator();
}

// Substituir a função enhanceZoomControls para usar nossas funções melhoradas
function enhancedZoomControls() {
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    
    if (zoomInBtn) {
        zoomInBtn.removeEventListener('click', null);
        zoomInBtn.addEventListener('click', () => {
            // Obter ponto central do visualizador
            const viewer = document.getElementById('viewer');
            const viewerRect = viewer.getBoundingClientRect();
            const centerX = viewerRect.width / 2;
            const centerY = viewerRect.height / 2;
            
            currentZoom += 0.1;
            enhancedZoomAtPoint(centerX, centerY);
        });
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.removeEventListener('click', null);
        zoomOutBtn.addEventListener('click', () => {
            // Obter ponto central do visualizador
            const viewer = document.getElementById('viewer');
            const viewerRect = viewer.getBoundingClientRect();
            const centerX = viewerRect.width / 2;
            const centerY = viewerRect.height / 2;
            
            if (currentZoom > 0.1) {
                currentZoom -= 0.1;
                enhancedZoomAtPoint(centerX, centerY);
            }
        });
    }
    
    if (resetZoomBtn) {
        resetZoomBtn.removeEventListener('click', null);
        resetZoomBtn.addEventListener('click', () => {
            currentZoom = 1;
            resetScrollPosition();
            adjustImageContainer();
            centerImages();
        });
    }
    
    // Configurar zoom com a roda do mouse
    setupEnhancedWheelZoom();
}

// Configurar zoom com a roda do mouse
function setupEnhancedWheelZoom() {
    const viewer = document.getElementById('viewer');
    if (!viewer) return;
    
    viewer.addEventListener('wheel', function (e) {
        // Zoom apenas se a tecla Ctrl estiver pressionada (comportamento padrão)
        if (e.ctrlKey) {
            e.preventDefault();
            
            // Obter o centro do visualizador
            const viewerRect = viewer.getBoundingClientRect();
            const centerX = viewerRect.width / 2;
            const centerY = viewerRect.height / 2;
            
            // Determinar direção do zoom
            if (e.deltaY < 0) {
                // Zoom in
                currentZoom += 0.1;
            } else {
                // Zoom out
                if (currentZoom > 0.1) {
                    currentZoom -= 0.1;
                }
            }
            
            // Atualizar zoom mantendo foco no centro
            enhancedZoomAtPoint(centerX, centerY);
        }
    }, { passive: false });
}

// Substituir a função centerImages para garantir centralização consistente
function enhancedCenterImages() {
    const viewer = document.getElementById('viewer');
    const imageContainer = document.getElementById('imageContainer');
    
    if (!viewer || !imageContainer) return;
    
    const viewerRect = viewer.getBoundingClientRect();
    const containerRect = imageContainer.getBoundingClientRect();
    
    if (autoScrolling) return;
    
    // Calcular offsets para centralização
    let offsetX = 0;
    let offsetY = 0;
    
    if (containerRect.width * currentZoom < viewerRect.width) {
        offsetX = (viewerRect.width - containerRect.width * currentZoom) / 2 / currentZoom;
    }
    
    if (containerRect.height * currentZoom < viewerRect.height) {
        offsetY = (viewerRect.height - containerRect.height * currentZoom) / 2 / currentZoom;
    }
    
    // Aplicar transformação com os offsets calculados
    if (isVertical) {
        imageContainer.style.transform = `translateY(-${scrollPosition}px) translateX(${offsetX}px) scale(${currentZoom})`;
    } else {
        imageContainer.style.transform = `translateX(-${scrollPosition}px) translateY(${offsetY}px) scale(${currentZoom})`;
    }
}

// Função para aplicar todas as melhorias de zoom
function applyZoomFixes() {
    // Substituir as funções originais pelas melhoradas
    window.zoomAtPoint = enhancedZoomAtPoint;
    window.updateScrollPosition = enhancedUpdateScrollPosition;
    window.enhanceZoomControls = enhancedZoomControls;
    window.centerImages = enhancedCenterImages;
    
    // Aplicar imediatamente as melhorias
    enhancedZoomControls();
}