// Definindo limites de zoom
const ZOOM_MIN = 0.2;  // Limite mínimo de zoom
const ZOOM_MAX = 5.0;  // Limite máximo de zoom

// Função melhorada para limitar e aplicar o zoom
function enhancedZoomControl() {
    // Substituir as funções de zoom existentes
    
    // 1. Melhorar o zoom in com limite máximo
    const originalZoomIn = document.getElementById('zoomInBtn');
    if (originalZoomIn) {
        originalZoomIn.removeEventListener('click', null);
        originalZoomIn.addEventListener('click', () => {
            // Obter o centro do viewer para zoom centralizado
            const viewer = document.getElementById('viewer');
            const viewerRect = viewer.getBoundingClientRect();
            const centerX = viewerRect.width / 2;
            const centerY = viewerRect.height / 2;
            
            // Limitar o zoom máximo
            if (currentZoom < ZOOM_MAX) {
                currentZoom = Math.min(currentZoom + 0.1, ZOOM_MAX);
                
                // Aplicar zoom mantendo a posição atual
                const imageContainer = document.getElementById('imageContainer');
                if (imageContainer) {
                    if (isVertical) {
                        imageContainer.style.transform = `translateY(-${scrollPosition}px) scale(${currentZoom})`;
                    } else {
                        imageContainer.style.transform = `translateX(-${scrollPosition}px) scale(${currentZoom})`;
                    }
                }
                
                console.log(`Zoom in: ${currentZoom.toFixed(1)}`);
            }
        });
    }
    
    // 2. Melhorar o zoom out com limite mínimo
    const originalZoomOut = document.getElementById('zoomOutBtn');
    if (originalZoomOut) {
        originalZoomOut.removeEventListener('click', null);
        originalZoomOut.addEventListener('click', () => {
            // Obter o centro do viewer para zoom centralizado
            const viewer = document.getElementById('viewer');
            const viewerRect = viewer.getBoundingClientRect();
            const centerX = viewerRect.width / 2;
            const centerY = viewerRect.height / 2;
            
            // Limitar o zoom mínimo
            if (currentZoom > ZOOM_MIN) {
                currentZoom = Math.max(currentZoom - 0.1, ZOOM_MIN);
                
                // Aplicar zoom mantendo a posição atual
                const imageContainer = document.getElementById('imageContainer');
                if (imageContainer) {
                    if (isVertical) {
                        imageContainer.style.transform = `translateY(-${scrollPosition}px) scale(${currentZoom})`;
                    } else {
                        imageContainer.style.transform = `translateX(-${scrollPosition}px) scale(${currentZoom})`;
                    }
                }
                
                console.log(`Zoom out: ${currentZoom.toFixed(1)}`);
            }
        });
    }
    
    // 3. Melhorar o reset de zoom
    const originalResetZoom = document.getElementById('resetZoomBtn');
    if (originalResetZoom) {
        originalResetZoom.removeEventListener('click', null);
        originalResetZoom.addEventListener('click', () => {
            currentZoom = 1.0;
            scrollPosition = 0;
            
            const imageContainer = document.getElementById('imageContainer');
            if (imageContainer) {
                // Aplicar transformação diretamente
                if (isVertical) {
                    imageContainer.style.transform = 'translateY(0) scale(1)';
                } else {
                    imageContainer.style.transform = 'translateX(0) scale(1)';
                }
                
                // Ajustar e centralizar
                setTimeout(() => {
                    adjustImageContainer();
                    centerImages();
                }, 10);
            }
        });
    }
    
    // 4. Implementar zoom com roda do mouse melhorado
    setupEnhancedWheelZoom();
}

// Função melhorada para zoom com roda do mouse
function setupEnhancedWheelZoom() {
    const viewer = document.getElementById('viewer');
    if (!viewer) return;
    
    viewer.addEventListener('wheel', function(e) {
        // Zoom apenas quando a tecla Ctrl estiver pressionada
        if (e.ctrlKey) {
            e.preventDefault();
            
            // Calcular posição do mouse relativa ao contêiner
            const imageContainer = document.getElementById('imageContainer');
            const containerRect = imageContainer.getBoundingClientRect();
            const mouseX = e.clientX - containerRect.left;
            const mouseY = e.clientY - containerRect.top;
            
            let scaleFactor = 0.1;
            // Para movimentos de roda mais suaves, podemos ajustar dinamicamente
            if (Math.abs(e.deltaY) < 50) {
                scaleFactor = 0.05;
            }
            
            // Aplicar zoom baseado na direção da roda
            if (e.deltaY < 0) {
                // Zoom in
                if (currentZoom < ZOOM_MAX) {
                    currentZoom = Math.min(currentZoom + scaleFactor, ZOOM_MAX);
                    enhancedZoomAtPoint(mouseX, mouseY);
                }
            } else {
                // Zoom out
                if (currentZoom > ZOOM_MIN) {
                    currentZoom = Math.max(currentZoom - scaleFactor, ZOOM_MIN);
                    enhancedZoomAtPoint(mouseX, mouseY);
                }
            }
        }
    }, { passive: false });
}

// Função melhorada para aplicar zoom em um ponto específico
function enhancedZoomAtPoint(pointX, pointY) {
    const imageContainer = document.getElementById('imageContainer');
    const viewer = document.getElementById('viewer');
    
    if (!imageContainer || !viewer) return;
    
    // Obter o zoom atual da transformação do contêiner
    const currentTransform = imageContainer.style.transform;
    const oldZoom = currentTransform.match(/scale\(([^)]+)\)/) 
        ? parseFloat(currentTransform.match(/scale\(([^)]+)\)/)[1]) 
        : 1.0;
    
    // Calcular as coordenadas relativas dentro do contêiner antes do zoom
    const containerRect = imageContainer.getBoundingClientRect();
    
    // Calcular ponto em coordenadas não-escaladas
    const unscaledX = (pointX - containerRect.left + (isVertical ? 0 : scrollPosition)) / oldZoom;
    const unscaledY = (pointY - containerRect.top + (isVertical ? scrollPosition : 0)) / oldZoom;
    
    // Aplicar nova escala
    let translateX = 0;
    let translateY = 0;
    
    if (isVertical) {
        const translateMatch = currentTransform.match(/translateY\(([^)]+)px\)/);
        translateY = translateMatch ? parseFloat(translateMatch[1]) : 0;
    } else {
        const translateMatch = currentTransform.match(/translateX\(([^)]+)px\)/);
        translateX = translateMatch ? parseFloat(translateMatch[1]) : 0;
    }
    
    // Calcular nova posição após escala
    const scaledX = unscaledX * currentZoom;
    const scaledY = unscaledY * currentZoom;
    
    // Calcular quanto o ponto se moveu
    const deltaX = scaledX - pointX;
    const deltaY = scaledY - pointY;
    
    // Atualizar posição de rolagem para compensar, mas apenas para a imagem atual
    if (isVertical) {
        // Manter a posição Y atual e apenas ajustar o zoom
        imageContainer.style.transform = `translateY(-${scrollPosition}px) scale(${currentZoom})`;
    } else {
        // Manter a posição X atual e apenas ajustar o zoom
        imageContainer.style.transform = `translateX(-${scrollPosition}px) scale(${currentZoom})`;
    }
    
    // Atualizar indicador de progresso e ajustar contêiner
    updateProgressIndicator();
    adjustImageContainer();
    
    // Manter centralização se estiver ativa
    if (autoCenter) {
        centerImages();
    }
    
    // Adicionar efeito visual para indicar o ponto de zoom
    showZoomIndicator(pointX, pointY);
}

// Função para mostrar indicador visual de onde o zoom está sendo aplicado
function showZoomIndicator(x, y) {
    // Remover indicador anterior se existir
    const oldIndicator = document.getElementById('zoomIndicator');
    if (oldIndicator) {
        oldIndicator.remove();
    }
    
    // Criar novo indicador
    const indicator = document.createElement('div');
    indicator.id = 'zoomIndicator';
    indicator.style.position = 'absolute';
    indicator.style.left = `${x - 15}px`;
    indicator.style.top = `${y - 15}px`;
    indicator.style.width = '30px';
    indicator.style.height = '30px';
    indicator.style.borderRadius = '50%';
    indicator.style.border = '2px solid var(--primary-color)';
    indicator.style.backgroundColor = 'rgba(var(--primary-color-rgb, 67, 97, 238), 0.3)';
    indicator.style.pointerEvents = 'none';
    indicator.style.zIndex = '1000';
    indicator.style.animation = 'zoomIndicatorFade 0.5s forwards';
    
    // Adicionar estilo de animação se ainda não existir
    if (!document.getElementById('zoomIndicatorStyle')) {
        const style = document.createElement('style');
        style.id = 'zoomIndicatorStyle';
        style.textContent = `
            @keyframes zoomIndicatorFade {
                0% { transform: scale(0.5); opacity: 1; }
                100% { transform: scale(1.5); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(indicator);
    
    // Remover após a animação
    setTimeout(() => {
        indicator.remove();
    }, 500);
}

// Função melhorada para centralizar imagens
function enhancedCenterImages() {
    const viewer = document.getElementById('viewer');
    const imageContainer = document.getElementById('imageContainer');
    
    if (!viewer || !imageContainer) return;
    
    const viewerRect = viewer.getBoundingClientRect();
    const containerRect = imageContainer.getBoundingClientRect();
    
    // Não centralizar se estivermos em rolagem automática
    if (autoScrolling) return;
    
    let offsetX = 0;
    let offsetY = 0;
    
    // Centralizar horizontalmente se o contêiner for mais estreito que o visualizador
    if (containerRect.width * currentZoom < viewerRect.width) {
        offsetX = (viewerRect.width - containerRect.width * currentZoom) / 2;
    }
    
    // Centralizar verticalmente se o contêiner for mais baixo que o visualizador
    if (containerRect.height * currentZoom < viewerRect.height) {
        offsetY = (viewerRect.height - containerRect.height * currentZoom) / 2;
    }
    
    // Aplicar transformação com base na direção
    if (isVertical) {
        // Para scroll vertical, mantenha a posição X centralizada
        // e ajuste Y com base na posição de rolagem
        imageContainer.style.transform = `translateX(${offsetX / currentZoom}px) translateY(${offsetY / currentZoom - scrollPosition}px) scale(${currentZoom})`;
    } else {
        // Para scroll horizontal, mantenha a posição Y centralizada
        // e ajuste X com base na posição de rolagem
        imageContainer.style.transform = `translateX(${offsetX / currentZoom - scrollPosition}px) translateY(${offsetY / currentZoom}px) scale(${currentZoom})`;
    }
    
    console.log(`Centralizado - Offsets: X=${offsetX.toFixed(1)}, Y=${offsetY.toFixed(1)}, Zoom: ${currentZoom.toFixed(1)}`);
}

// Função para ajustar o contêiner de imagens
function enhancedAdjustImageContainer() {
    const imageContainer = document.getElementById('imageContainer');
    if (!imageContainer || images.length === 0) return;
    
    // Calcular dimensões baseadas nas imagens carregadas
    const items = imageContainer.querySelectorAll('.image-item');
    
    if (items.length === 0) return;
    
    let totalWidth = 0;
    let totalHeight = 0;
    let maxWidth = 0;
    
    // Calcular dimensões totais
    items.forEach((item, index) => {
        // Para direção vertical
        if (isVertical) {
            totalHeight += item.offsetHeight;
            maxWidth = Math.max(maxWidth, item.offsetWidth);
            
            // Adicionar espaçamento entre itens (exceto para o último)
            if (index < items.length - 1) {
                totalHeight += imageSpacing;
            }
        } 
        // Para direção horizontal
        else {
            totalWidth += item.offsetWidth;
            
            // Adicionar espaçamento entre itens (exceto para o último)
            if (index < items.length - 1) {
                totalWidth += imageSpacing;
            }
        }
    });
    
    // Garantir dimensões mínimas para evitar problemas de layout
    totalWidth = Math.max(totalWidth, 100);
    totalHeight = Math.max(totalHeight, 100);
    
    // Aplicar dimensões calculadas
    if (isVertical) {
        imageContainer.style.width = `${maxWidth}px`;
        imageContainer.style.height = `${totalHeight}px`;
    } else {
        imageContainer.style.width = `${totalWidth}px`;
        imageContainer.style.height = '100%';
    }
    
    console.log(`Contêiner ajustado - Largura: ${totalWidth}px, Altura: ${totalHeight}px`);
}

// Função para verificar e limitar a posição de rolagem
function limitScrollPosition() {
    const imageContainer = document.getElementById('imageContainer');
    const viewer = document.getElementById('viewer');
    
    if (!imageContainer || !viewer || images.length === 0) return;
    
    const viewerRect = viewer.getBoundingClientRect();
    const containerRect = imageContainer.getBoundingClientRect();
    
    // Calcular o máximo que podemos rolar
    let maxScroll;
    
    if (isVertical) {
        maxScroll = Math.max(0, (containerRect.height * currentZoom - viewerRect.height) / currentZoom);
    } else {
        maxScroll = Math.max(0, (containerRect.width * currentZoom - viewerRect.width) / currentZoom);
    }
    
    // Limitar a posição de rolagem
    scrollPosition = Math.max(0, Math.min(scrollPosition, maxScroll));
    
    // Aplicar a posição limitada
    if (isVertical) {
        imageContainer.style.transform = `translateY(-${scrollPosition}px) scale(${currentZoom})`;
    } else {
        imageContainer.style.transform = `translateX(-${scrollPosition}px) scale(${currentZoom})`;
    }
    
    updateProgressIndicator();
}

// Função para instalar as melhorias
function installZoomFixes() {
    console.log("Instalando correções de zoom...");
    
    // Substituir funções existentes
    window.zoomAtPoint = enhancedZoomAtPoint;
    window.centerImages = enhancedCenterImages;
    window.adjustImageContainer = enhancedAdjustImageContainer;
    window.limitScrollPosition = limitScrollPosition;
    
    // Aplicar melhorias nos controles de zoom
    enhancedZoomControl();
    
    // Adicionar observador para ajustar imagens quando o tamanho da janela mudar
    window.addEventListener('resize', function() {
        enhancedAdjustImageContainer();
        enhancedCenterImages();
        limitScrollPosition();
    });
    
    // Executar ajustes iniciais
    setTimeout(() => {
        enhancedAdjustImageContainer();
        enhancedCenterImages();
    }, 500);
    
    console.log("Correções de zoom instaladas com sucesso!");
}

// Inicializar quando o documento estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installZoomFixes);
} else {
    installZoomFixes();
}