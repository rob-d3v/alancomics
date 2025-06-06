/**
 * ViewportBoundary - Cria um retângulo que delimita a área visível no visualizador de conteúdo
 * 
 * Este módulo implementa um retângulo que serve como margem visual para indicar
 * a área que o usuário está visualizando atualmente no viewport. Conteúdo fora
 * deste retângulo está fora da área de visualização atual.
 */
class ViewportBoundary {
    constructor() {
        // Elemento do retângulo de margem
        this.boundaryElement = null;
        
        // Referência ao visualizador
        this.viewer = document.getElementById('viewer');
        this.imagesContainer = document.getElementById('imagesContainer');
        
        // Estado
        this.isEnabled = true;
        this.resizeObserver = null;
        this.scrollTimeout = null;
        
        // Inicializar
        this.initialize();
    }
    
    /**
     * Inicializa o módulo de margem de viewport
     */
    initialize() {
        // Esperar o DOM estar completamente carregado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    /**
     * Configura o módulo de margem de viewport
     */
    setup() {
        // Verificar se o visualizador existe
        if (!this.viewer || !this.imagesContainer) {
            console.error('ViewportBoundary: Elementos do visualizador não encontrados');
            return;
        }
        
        // Criar o elemento de margem
        this.createBoundaryElement();
        
        // Configurar observadores e eventos
        this.setupEventListeners();
        
        // Atualizar a posição inicial
        this.updateBoundaryPosition();
        
        // Adicionar estilos CSS
        this.addStyles();
        
        // console.log('ViewportBoundary: Inicializado com sucesso');
    }
    
    /**
     * Cria o elemento de retângulo de margem
     */
    createBoundaryElement() {
        // Verificar se já existe
        if (this.boundaryElement) {
            return;
        }
        
        // Criar elemento
        this.boundaryElement = document.createElement('div');
        this.boundaryElement.id = 'viewport-boundary';
        this.boundaryElement.className = 'viewport-boundary';
        
        // Adicionar ao DOM (como filho direto do body para evitar problemas de posicionamento)
        document.body.appendChild(this.boundaryElement);
    }
    
    /**
     * Configura os listeners de eventos
     */
    setupEventListeners() {
        // Evento de scroll
        window.addEventListener('scroll', () => {
            // Usar debounce para melhor performance
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => {
                this.updateBoundaryPosition();
            }, 100);
        });
        
        // Evento de redimensionamento da janela
        window.addEventListener('resize', () => {
            this.updateBoundaryPosition();
        });
        
        // Observar mudanças no conteúdo do visualizador
        this.resizeObserver = new ResizeObserver(() => {
            this.updateBoundaryPosition();
        });
        
        // Observar o container de imagens
        if (this.imagesContainer) {
            this.resizeObserver.observe(this.imagesContainer);
        }
        
        // Observar o visualizador
        if (this.viewer) {
            this.resizeObserver.observe(this.viewer);
        }
    }
    
    /**
     * Atualiza a posição do retângulo de margem
     */
    updateBoundaryPosition() {
        if (!this.isEnabled || !this.boundaryElement || !this.viewer) {
            return;
        }

        // console.log(">>> 6: Atualizando posição do viewport boundary");
        
        // Obter as dimensões do viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Obter a posição do visualizador em relação à janela
        const viewerRect = this.viewer.getBoundingClientRect();

        // console.log(">>> 7: Dimensões do viewport e visualizador:", {
        //     viewport: {
        //         width: viewportWidth,
        //         height: viewportHeight,
        //         scrollY: window.scrollY
        //     },
        //     viewer: {
        //         top: viewerRect.top,
        //         bottom: viewerRect.bottom,
        //         height: viewerRect.height
        //     }
        // });
        
        // Calcular a interseção entre o viewport e o visualizador
        const top = Math.max(0, viewerRect.top);
        const left = Math.max(0, viewerRect.left);
        const right = Math.min(viewportWidth, viewerRect.right);
        const bottom = Math.min(viewportHeight, viewerRect.bottom);
        
        // Verificar se o visualizador está visível
        if (top >= bottom || left >= right) {
            // O visualizador não está visível, ocultar o retângulo
            this.boundaryElement.style.display = 'none';
            return;
        }
        
        // Calcular as dimensões do retângulo
        const width = right - left;
        const height = bottom - top;
        
        // Aplicar margem para garantir que as bordas sejam visíveis
        // Aumentar a margem para garantir que as bordas inferior e direita sejam sempre visíveis
        const margin = 5; // Margem em pixels para garantir visibilidade da borda
        
        // Verificar se o retângulo está próximo das bordas da janela
        const isNearRightEdge = right + margin >= viewportWidth;
        const isNearBottomEdge = bottom + margin >= viewportHeight;
        
        // Ajustar a posição e tamanho para garantir que as bordas sejam visíveis
        // Posicionar e dimensionar o retângulo com margem
        this.boundaryElement.style.top = `${top}px`;
        this.boundaryElement.style.left = `${left}px`;
        this.boundaryElement.style.width = `${width - (isNearRightEdge ? margin * 2 : margin)}px`;
        this.boundaryElement.style.height = `${height - (isNearBottomEdge ? margin * 2 : margin)}px`;
        this.boundaryElement.style.display = 'block';
    }
    
    /**
     * Adiciona os estilos CSS necessários
     */
    addStyles() {
        // Verificar se os estilos já existem
        if (document.getElementById('viewport-boundary-styles')) {
            return;
        }
        
        // Criar elemento de estilo
        const styleElement = document.createElement('style');
        styleElement.id = 'viewport-boundary-styles';
        
        // Definir estilos
        styleElement.textContent = `
            .viewport-boundary {
                position: fixed;
                pointer-events: none;
                border: 3px dashed rgba(255, 0, 0, 0.8);
                background-color: rgba(255, 255, 0, 0.05);
                z-index: 9999;
                box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
                transition: all 0.2s ease-out;
                /* Garantir que as bordas sejam sempre visíveis */
                outline: 1px solid rgba(255, 255, 255, 0.5);
            }
        `;
        
        // Adicionar ao DOM
        document.head.appendChild(styleElement);
    }
    
    /**
     * Ativa ou desativa a exibição do retângulo de margem
     * @param {boolean} enabled - Se verdadeiro, ativa a exibição; se falso, desativa
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        if (this.boundaryElement) {
            this.boundaryElement.style.display = enabled ? 'block' : 'none';
        }
        
        if (enabled) {
            this.updateBoundaryPosition();
        }
    }
    
    /**
     * Alterna o estado de exibição do retângulo de margem
     */
    toggle() {
        this.setEnabled(!this.isEnabled);
    }
    
    /**
     * Método para limpar recursos quando necessário
     */
    destroy() {
        // Remover event listeners
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        
        // Desconectar observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        // Remover elemento do DOM
        if (this.boundaryElement) {
            this.boundaryElement.remove();
        }
        
        // Remover estilos
        const styleElement = document.getElementById('viewport-boundary-styles');
        if (styleElement) {
            styleElement.remove();
        }
    }
}

// Inicializar o módulo de margem de viewport
document.addEventListener('DOMContentLoaded', () => {
    window.viewportBoundary = new ViewportBoundary();
});