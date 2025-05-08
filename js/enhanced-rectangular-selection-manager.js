// Adição ao RectangularSelectionManager - Melhor log e registro de coordenadas
class EnhancedRectangularSelectionManager extends RectangularSelectionManager {
    constructor() {
        super();
        // Armazenar coordenadas absolutas (relativas à página)
        this.absoluteCoordinates = [];
        // Armazenar índice da imagem na ordem de aparição
        this.imageIndices = new Map();
    }

    // Sobrescrever método de criação de seleção para registrar coordenadas absolutas
    createSelectionElement(img, x, y, width, height) {
        super.createSelectionElement(img, x, y, width, height);
        
        // Determinar índice da imagem na sequência do documento
        if (!this.imageIndices.has(img.id)) {
            const allImages = Array.from(document.querySelectorAll('#imagesContainer img'));
            const index = allImages.findIndex(image => image.id === img.id);
            this.imageIndices.set(img.id, index >= 0 ? index + 1 : '?');
        }
        
        // Registrar informações detalhadas
        console.log(`Criando seleção na imagem #${this.imageIndices.get(img.id)} em coordenadas (${x}, ${y}) com dimensões ${width}x${height}`);
    }

    // Sobrescrever confirmação de seleção para registrar coordenadas absolutas
    confirmCurrentSelection() {
        if (!this.currentSelection || !this.currentImage) {
            return super.confirmCurrentSelection();
        }

        // Obter coordenadas absolutas da seleção
        const imgRect = this.currentImage.getBoundingClientRect();
        const viewerElement = document.getElementById('viewer');
        const viewerRect = viewerElement.getBoundingClientRect();
        
        // Calcular posição absoluta em relação ao topo da página
        const absoluteY = window.pageYOffset + imgRect.top + parseFloat(this.currentSelection.style.top);
        const absoluteX = window.pageXOffset + imgRect.left + parseFloat(this.currentSelection.style.left);
        
        // Calcular posição relativa ao visualizador (para rolagem)
        const relativeY = absoluteY - (window.pageYOffset + viewerRect.top);
        const relativeX = absoluteX - (window.pageXOffset + viewerRect.left);
        
        const imgIndex = this.imageIndices.get(this.currentImage.id) || '?';
        console.log(`Confirmando seleção #${this.selections.length + 1} na imagem #${imgIndex}:`);
        console.log(`- Coordenadas absolutas: (${absoluteX.toFixed(2)}, ${absoluteY.toFixed(2)})`);
        console.log(`- Coordenadas relativas ao visualizador: (${relativeX.toFixed(2)}, ${relativeY.toFixed(2)})`);
        
        // Armazenar coordenadas para uso durante a narração
        this.absoluteCoordinates.push({
            index: this.selections.length,
            imageId: this.currentImage.id,
            imageIndex: imgIndex,
            absoluteX,
            absoluteY,
            relativeX,
            relativeY,
            width: parseFloat(this.currentSelection.style.width),
            height: parseFloat(this.currentSelection.style.height)
        });
        
        // Chamar o método original para completar a confirmação
        return super.confirmCurrentSelection();
    }

    // Método melhorado para rolagem durante narração
    updateScrollForCurrentSelection(index) {
        // Verificar se o índice é válido
        if (index < 0 || index >= this.selections.length) {
            return;
        }

        // Obter a seleção atual
        const currentSelection = this.selections[index];
        if (!currentSelection) return;
        
        // Obter coordenadas absolutas para essa seleção
        const coordinates = this.absoluteCoordinates.find(coord => coord.index === index);
        
        // Desativar o scroll manager global durante nossa rolagem personalizada
        if (window.scrollManager) {
            window.scrollManager.deactivate();
        }
        
        // Determinar se é a primeira seleção a ser narrada
        const isFirstSelection = index === 0;
        
        // Se for a primeira seleção, rolar primeiro para o topo do visualizador
        if (isFirstSelection) {
            console.log("Primeira seleção: rolando para o topo do visualizador primeiro");
            
            // Rolar para o topo do visualizador com comportamento suave
            const viewer = document.getElementById('viewer');
            if (viewer) {
                viewer.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
                
                // Aguardar que a rolagem para o topo termine antes de rolar para a seleção
                setTimeout(() => {
                    this.scrollToSelectionWithAnimation(currentSelection, coordinates, index);
                }, 800);
            } else {
                this.scrollToSelectionWithAnimation(currentSelection, coordinates, index);
            }
        } else {
            // Para as próximas seleções, rolar diretamente para elas
            this.scrollToSelectionWithAnimation(currentSelection, coordinates, index);
        }
    }

    // Método para criar uma rolagem suave e mais "mágica" para a seleção
    scrollToSelectionWithAnimation(selection, coordinates, index) {
        if (!selection || !selection.element) return;
        
        // Destacar visualmente a seleção com uma animação
        selection.element.classList.add('current-selection-highlight');
        selection.element.classList.add('selection-pulse-animation');
        
        // Encontrar a imagem pai
        let targetImage = null;
        if (selection.imageId) {
            targetImage = document.getElementById(selection.imageId);
        }
        
        // Log da ação de rolagem
        console.log(`Rolando para seleção #${index + 1} ${coordinates ? 
            `em coordenadas absolutas (${coordinates.absoluteX.toFixed(0)}, ${coordinates.absoluteY.toFixed(0)})` : 
            'com coordenadas desconhecidas'}`);
        
        // Calcular a posição para centralizar a seleção na tela
        const rect = selection.element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Calcular a posição centralizada para uma experiência mais imersiva
        const targetScroll = scrollTop + rect.top - (window.innerHeight / 2) + (rect.height / 2);
        
        // Efeito de transição mais suave para rolagem
        window.scrollTo({
            top: targetScroll, 
            behavior: 'smooth'
        });
        
        // Remover as classes de animação após um tempo
        setTimeout(() => {
            if (selection.element) {
                selection.element.classList.remove('selection-pulse-animation');
                // Manter a classe highlight por mais tempo para que o usuário possa ver qual texto está sendo narrado
                setTimeout(() => {
                    selection.element.classList.remove('current-selection-highlight');
                }, 1500);
            }
        }, 1200);
    }
}

// CSS para a animação de pulso
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse-glow {
        0% { box-shadow: 0 0 5px 2px rgba(52, 152, 219, 0.5); }
        50% { box-shadow: 0 0 15px 5px rgba(52, 152, 219, 0.8); }
        100% { box-shadow: 0 0 5px 2px rgba(52, 152, 219, 0.5); }
    }
    
    .selection-pulse-animation {
        animation: pulse-glow 1.5s ease-in-out infinite;
        z-index: 1000 !important;
    }
    
    .current-selection-highlight {
        background-color: rgba(52, 152, 219, 0.4) !important;
        border: 2px solid rgba(52, 152, 219, 0.8) !important;
        box-shadow: 0 0 10px rgba(52, 152, 219, 0.6);
        z-index: 100;
        transition: all 0.3s ease-in-out;
    }
    
    /* Estilo para o indicador de progresso da narração */
    .narration-progress {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 15px;
        border-radius: 20px;
        font-size: 14px;
        z-index: 9999;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 10px;
        border: 1px solid rgba(52, 152, 219, 0.5);
        max-width: 90%;
    }
    
    .narration-progress-bar {
        height: 8px;
        background: rgba(52, 152, 219, 0.3);
        border-radius: 4px;
        position: relative;
        width: 200px;
        overflow: hidden;
    }
    
    .narration-progress-fill {
        position: absolute;
        height: 100%;
        left: 0;
        top: 0;
        background: linear-gradient(90deg, #3498db, #2980b9);
        transition: width 0.3s ease-out;
    }
    
    .narration-text-preview {
        font-style: italic;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        min-width: 0;
    }
`;
document.head.appendChild(style);

// Classe para gerenciar a barra de progresso da narração
class NarrationProgressBar {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'narration-progress';
        this.container.style.display = 'none';
        
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'narration-progress-bar';
        
        this.progressFill = document.createElement('div');
        this.progressFill.className = 'narration-progress-fill';
        this.progressFill.style.width = '0%';
        
        this.textPreview = document.createElement('div');
        this.textPreview.className = 'narration-text-preview';
        
        this.progressBar.appendChild(this.progressFill);
        this.container.appendChild(this.progressBar);
        this.container.appendChild(this.textPreview);
        
        document.body.appendChild(this.container);
        
        this.currentItemIndex = 0;
        this.totalItems = 0;
        this.currentText = '';
    }
    
    setCurrentItemIndex(index) {
        this.currentItemIndex = index;
        this.updateProgressBar();
    }
    
    setCurrentText(text) {
        if (!text) return;
        
        this.currentText = typeof text === 'string' ? 
            text.substring(0, 60) + (text.length > 60 ? '...' : '') : 
            'Narrando...';
            
        this.textPreview.textContent = this.currentText;
    }
    
    setTotalItems(total) {
        this.totalItems = total;
        this.updateProgressBar();
    }
    
    updateProgressBar() {
        if (this.totalItems === 0) {
            this.progressFill.style.width = '0%';
            return;
        }
        
        const progress = Math.min(100, Math.max(0, (this.currentItemIndex / this.totalItems) * 100));
        this.progressFill.style.width = `${progress}%`;
        
        // Mostrar a barra de progresso se estiver em progresso
        if (progress > 0 && progress < 100) {
            this.container.style.display = 'flex';
        } else if (progress >= 100) {
            // Esconder progressivamente quando completo
            setTimeout(() => {
                this.container.style.display = 'none';
            }, 2000);
        }
    }
    
    show() {
        this.container.style.display = 'flex';
    }
    
    hide() {
        this.container.style.display = 'none';
    }
}