// Configuração do layout
const layoutConfig = {
    MIN_ZOOM: 0.2,
    MAX_ZOOM: 5.0,
    ZOOM_STEP: 0.1,
    SCROLL_STEP: 100,
    ITEM_SPACING: 12,
    TRANSITION_DURATION: 0.2
};

// Estado do layout
const layoutState = {
    currentZoom: 1.0,
    scrollX: 0,
    scrollY: 0,
    isVertical: true,
    containerSize: { width: 0, height: 0 },
    viewerSize: { width: 0, height: 0 },
    centerOffset: { x: 0, y: 0 },
    images: []
};

// Elementos do DOM
let elements = null;

// Inicialização do layout
function initSmartLayout() {
    console.log('Iniciando layout inteligente...');
    
    try {
        // Configurar elementos
        setupElements();
        
        // Configurar eventos
        setupEventListeners();
        
        // Inicializar estado
        layoutState.images = Array.from(document.querySelectorAll('.image-item img'));
        console.log(`Layout inicializado com ${layoutState.images.length} imagens`);
        
        // Configurar viewer
        elements.viewer.classList.add('vertical-scroll');
        
        // Calcular tamanhos iniciais
        updateLayout();
        
    } catch (error) {
        console.error('Erro ao inicializar layout:', error);
        throw error;
    }
}

// Configuração dos elementos
function setupElements() {
    console.log('Configurando elementos do DOM...');
    
    elements = {
        container: document.querySelector('.image-container'),
        viewer: document.querySelector('.viewer'),
        items: document.querySelectorAll('.image-item'),
        zoomInBtn: document.getElementById('zoomInBtn'),
        zoomOutBtn: document.getElementById('zoomOutBtn'),
        resetZoomBtn: document.getElementById('resetZoomBtn'),
        centerBtn: document.getElementById('centerBtn'),
        upBtn: document.getElementById('upBtn'),
        downBtn: document.getElementById('downBtn'),
        leftBtn: document.getElementById('leftBtn'),
        rightBtn: document.getElementById('rightBtn'),
        toggleOrientationBtn: document.getElementById('toggleOrientationBtn'),
        fullscreenBtn: document.getElementById('fullscreenBtn'),
        zoomFeedback: document.querySelector('.zoom-feedback')
    };

    if (!elements.container || !elements.viewer) {
        throw new Error('Elementos essenciais não encontrados');
    }

    // Configurar container
    elements.container.style.transition = `transform ${layoutConfig.TRANSITION_DURATION}s ease-out`;
    elements.container.style.transformOrigin = 'center top';
    
    console.log('Elementos configurados com sucesso');
}

// Atualização completa do layout
function updateLayout() {
    calculateContainerSize();
    calculateViewerSize();
    calculateCenterOffset();
    applySmartTransform();
}

// Cálculo do tamanho do container
function calculateContainerSize() {
    console.log('Calculando tamanho do container...');
    
    const items = layoutState.images.filter(img => img.complete);
    if (items.length === 0) {
        console.warn('Nenhuma imagem carregada para calcular tamanho');
        return;
    }

    if (layoutState.isVertical) {
        let maxWidth = 0;
        let totalHeight = 0;
        
        items.forEach(img => {
            const ratio = img.naturalWidth / img.naturalHeight;
            const height = Math.min(img.naturalHeight, window.innerHeight * 0.9);
            const width = height * ratio;
            
            maxWidth = Math.max(maxWidth, width);
            totalHeight += height + layoutConfig.ITEM_SPACING;
        });
        
        layoutState.containerSize = {
            width: maxWidth,
            height: totalHeight - layoutConfig.ITEM_SPACING
        };
    } else {
        let totalWidth = 0;
        let maxHeight = 0;
        
        items.forEach(img => {
            const ratio = img.naturalWidth / img.naturalHeight;
            const height = Math.min(img.naturalHeight, window.innerHeight * 0.9);
            const width = height * ratio;
            
            totalWidth += width + layoutConfig.ITEM_SPACING;
            maxHeight = Math.max(maxHeight, height);
        });
        
        layoutState.containerSize = {
            width: totalWidth - layoutConfig.ITEM_SPACING,
            height: maxHeight
        };
    }
    
    console.log('Tamanho do container:', layoutState.containerSize);
}

// Cálculo do tamanho do viewer
function calculateViewerSize() {
    layoutState.viewerSize = {
        width: elements.viewer.clientWidth,
        height: elements.viewer.clientHeight
    };
}

// Cálculo do offset de centralização
function calculateCenterOffset() {
    const { viewerSize, containerSize, currentZoom } = layoutState;
    
    layoutState.centerOffset = {
        x: (viewerSize.width - containerSize.width * currentZoom) / 2,
        y: Math.max(0, (viewerSize.height - containerSize.height * currentZoom) / 2)
    };
}

// Aplicação da transformação
function applySmartTransform() {
    const { currentZoom, scrollX, scrollY, centerOffset } = layoutState;
    const transform = `translate(${scrollX + centerOffset.x}px, ${scrollY + centerOffset.y}px) scale(${currentZoom})`;
    elements.container.style.transform = transform;
}

// Zoom
function zoom(factor) {
    const viewer = elements.viewer;
    const container = elements.container;
    if (!viewer || !container) return;

    // Prevenir rolagem da janela durante o zoom
    event?.preventDefault();

    // Obter o centro do viewer
    const viewerRect = viewer.getBoundingClientRect();
    const viewerCenterX = viewerRect.width / 2;
    const viewerCenterY = viewerRect.height / 2;

    // Calcular o novo zoom
    const oldZoom = layoutState.currentZoom;
    const newZoom = Math.max(layoutConfig.MIN_ZOOM, 
                            Math.min(layoutConfig.MAX_ZOOM, 
                                   oldZoom * factor));
    
    if (newZoom === oldZoom) {
        showZoomFeedback(newZoom === layoutConfig.MAX_ZOOM ? 'Zoom máximo atingido' : 'Zoom mínimo atingido');
        return;
    }

    // Atualizar o zoom
    layoutState.currentZoom = newZoom;

    // Calcular o ponto de zoom em relação ao container
    const containerRect = container.getBoundingClientRect();
    const pointX = viewerCenterX - containerRect.left;
    const pointY = viewerCenterY - containerRect.top;

    // Calcular a nova posição para manter o ponto centralizado
    const scale = newZoom / oldZoom;
    const dx = (scale - 1) * pointX;
    const dy = (scale - 1) * pointY;

    // Atualizar a posição de scroll mantendo a centralização
    if (layoutState.isVertical) {
        layoutState.scrollY -= dy;
        // Limitar o scroll para manter a imagem centralizada
        const maxScrollY = (containerRect.height * newZoom - viewerRect.height) / 2;
        layoutState.scrollY = Math.max(-maxScrollY, Math.min(maxScrollY, layoutState.scrollY));
    } else {
        layoutState.scrollX -= dx;
        // Limitar o scroll para manter a imagem centralizada
        const maxScrollX = (containerRect.width * newZoom - viewerRect.width) / 2;
        layoutState.scrollX = Math.max(-maxScrollX, Math.min(maxScrollX, layoutState.scrollX));
    }

    // Aplicar transformação
    updateLayout();

    // Mostrar feedback
    showZoomFeedback(`${Math.round(newZoom * 100)}%`);

    // Atualizar o nível de zoom na interface
    const zoomLevel = document.getElementById('zoomLevel');
    if (zoomLevel) {
        zoomLevel.textContent = `${Math.round(newZoom * 100)}%`;
    }
}

// Reset do zoom
function resetZoom() {
    layoutState.currentZoom = 1.0;
    layoutState.scrollX = 0;
    layoutState.scrollY = 0;
    updateLayout();
    showZoomFeedback('100%');
}

// Centralização das imagens
function centerImages() {
    const viewer = elements.viewer;
    const container = elements.container;
    if (!viewer || !container) return;

    const viewerRect = viewer.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Calcular o offset para centralizar
    if (layoutState.isVertical) {
        const maxScrollY = (containerRect.height * layoutState.currentZoom - viewerRect.height) / 2;
        layoutState.scrollY = Math.max(-maxScrollY, Math.min(maxScrollY, 0));
    } else {
        const maxScrollX = (containerRect.width * layoutState.currentZoom - viewerRect.width) / 2;
        layoutState.scrollX = Math.max(-maxScrollX, Math.min(maxScrollX, 0));
    }
    
    layoutState.scrollX = 0;
    layoutState.scrollY = 0;
    updateLayout();
}

// Navegação direcional
function directionalScroll(direction) {
    const step = layoutConfig.SCROLL_STEP * layoutState.currentZoom;
    
    switch (direction) {
        case 'up':
            layoutState.scrollY += step;
            break;
        case 'down':
            layoutState.scrollY -= step;
            break;
        case 'left':
            layoutState.scrollX += step;
            break;
        case 'right':
            layoutState.scrollX -= step;
            break;
    }
    
    applySmartTransform();
}

// Alternar orientação
function toggleOrientation() {
    layoutState.isVertical = !layoutState.isVertical;
    elements.viewer.classList.toggle('vertical-scroll');
    elements.viewer.classList.toggle('horizontal-scroll');
    updateLayout();
}

// Tela cheia
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        elements.viewer.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// Manipulação do zoom com roda do mouse
function handleWheelZoom(event) {
    if (!event.ctrlKey) return;
    
    // Prevenir rolagem da janela
    event.preventDefault();
    
    const viewer = elements.viewer;
    const container = elements.container;
    if (!viewer || !container) return;

    // Obter o centro do viewer
    const viewerRect = viewer.getBoundingClientRect();
    const viewerCenterX = viewerRect.width / 2;
    const viewerCenterY = viewerRect.height / 2;

    // Determinar fator de zoom
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    
    // Aplicar zoom
    zoom(factor);
}

// Manipulação do redimensionamento
function handleResize() {
    updateLayout();
}

// Feedback visual do zoom
function showZoomFeedback(message) {
    const feedback = document.getElementById('zoomFeedback');
    if (!feedback) return;

    feedback.textContent = message;
    feedback.classList.add('visible');
    
    // Remover classe após animação
    setTimeout(() => {
        feedback.classList.remove('visible');
    }, 2000);
}

// Navegação para imagem específica
function scrollToImage(index) {
    const item = layoutState.images[index];
    if (!item) return;
    
    const itemRect = item.getBoundingClientRect();
    const viewerRect = elements.viewer.getBoundingClientRect();
    
    if (layoutState.isVertical) {
        layoutState.scrollY = -(itemRect.top - viewerRect.top - layoutState.centerOffset.y);
    } else {
        layoutState.scrollX = -(itemRect.left - viewerRect.left - layoutState.centerOffset.x);
    }
    
    applySmartTransform();
}

// Configuração dos eventos
function setupEventListeners() {
    console.log('Configurando eventos...');
    
    try {
        // Zoom
        elements.zoomInBtn?.addEventListener('click', () => zoom(1.1));
        elements.zoomOutBtn?.addEventListener('click', () => zoom(0.9));
        elements.resetZoomBtn?.addEventListener('click', resetZoom);
        
        // Centralização
        elements.centerBtn?.addEventListener('click', centerImages);
        
        // Navegação
        elements.upBtn?.addEventListener('click', () => directionalScroll('up'));
        elements.downBtn?.addEventListener('click', () => directionalScroll('down'));
        elements.leftBtn?.addEventListener('click', () => directionalScroll('left'));
        elements.rightBtn?.addEventListener('click', () => directionalScroll('right'));
        
        // Orientação
        elements.toggleOrientationBtn?.addEventListener('click', toggleOrientation);
        
        // Tela cheia
        elements.fullscreenBtn?.addEventListener('click', toggleFullscreen);
        
        // Zoom com roda do mouse
        elements.viewer?.addEventListener('wheel', handleWheelZoom, { passive: false });
        
        // Redimensionamento
        window.addEventListener('resize', handleResize);
        
        console.log('Eventos configurados com sucesso');
    } catch (error) {
        console.error('Erro ao configurar eventos:', error);
        throw error;
    }
}

// Inicializar o layout quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando layout...');
    initSmartLayout();
}); 