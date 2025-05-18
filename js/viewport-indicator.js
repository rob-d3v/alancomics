/**
 * ViewportIndicator - Sistema de indicação visual da área visível
 * 
 * Este módulo implementa um sistema que cria um retângulo visual ao redor da área
 * que o usuário está visualizando atualmente na tela, ajudando a identificar
 * o conteúdo que está dentro da área visível versus o que está fora.
 */
class ViewportIndicator {
    constructor() {
        // Configurações do indicador
        this.borderWidth = 4; // Largura da borda em pixels
        this.borderColor = 'rgba(0, 120, 215, 0.7)'; // Cor da borda (azul semi-transparente)
        this.borderStyle = 'solid'; // Estilo da borda
        this.updateInterval = 200; // Intervalo de atualização em ms
        
        // Estado do sistema
        this.isActive = false;
        this.updateTimer = null;
        this.indicatorElement = null;
        
        // Referências a outros módulos
        this.viewer = null;
        
        // Inicializar
        this.initialize();
    }
    
    /**
     * Inicializa o sistema de indicação de viewport
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
     * Configura o sistema de indicação de viewport
     */
    setup() {
        // Obter referência ao visualizador principal
        if (window.comicsViewer) {
            this.viewer = window.comicsViewer;
            console.log('ViewportIndicator: Conectado ao visualizador principal');
        } else {
            console.warn('ViewportIndicator: Visualizador principal não encontrado');
            // Tentar novamente após um curto período
            setTimeout(() => {
                if (window.comicsViewer) {
                    this.viewer = window.comicsViewer;
                    console.log('ViewportIndicator: Conectado ao visualizador principal (tentativa 2)');
                }
            }, 1000);
        }
        
        // Criar o elemento indicador de viewport
        this.createIndicatorElement();
        
        // Registrar o sistema globalmente para acesso de outros módulos
        window.viewportIndicator = this;
        console.log('ViewportIndicator: Sistema de indicação de viewport inicializado');
        
        // Adicionar botão de controle ao menu de ferramentas
        this.addToggleButton();
        
        // Adicionar listeners para eventos de scroll e resize
        window.addEventListener('scroll', this.updateIndicator.bind(this));
        window.addEventListener('resize', this.updateIndicator.bind(this));
    }
    
    /**
     * Cria o elemento visual que indica a área visível
     */
    createIndicatorElement() {
        // Verificar se o elemento já existe
        if (this.indicatorElement) {
            return;
        }
        
        // Criar o elemento de indicação
        this.indicatorElement = document.createElement('div');
        this.indicatorElement.className = 'viewport-indicator';
        
        // Definir estilos iniciais
        Object.assign(this.indicatorElement.style, {
            position: 'fixed',
            pointerEvents: 'none', // Não interferir com cliques
            zIndex: '9999',
            border: `${this.borderWidth}px ${this.borderStyle} ${this.borderColor}`,
            boxSizing: 'border-box',
            display: 'none' // Inicialmente oculto
        });
        
        // Adicionar ao corpo do documento
        document.body.appendChild(this.indicatorElement);
    }
    
    /**
     * Adiciona um botão para ativar/desativar o indicador de viewport
     */
    addToggleButton() {
        // Verificar se o container de controles existe
        const controlsContainer = document.querySelector('#viewer .floating-controls');
        if (!controlsContainer) {
            console.warn('ViewportIndicator: Container de controles não encontrado');
            return;
        }
        
        // Criar o botão
        const toggleButton = document.createElement('button');
        toggleButton.id = 'toggleViewportIndicator';
        toggleButton.className = 'floating-button viewport-indicator-toggle';
        toggleButton.innerHTML = '<i class="fas fa-border-style"></i>';
        toggleButton.title = 'Mostrar/Ocultar área visível';
        
        // Adicionar evento de clique
        toggleButton.addEventListener('click', () => {
            if (this.isActive) {
                this.deactivate();
            } else {
                this.activate();
            }
        });
        
        // Adicionar ao container de controles
        controlsContainer.appendChild(toggleButton);
    }
    
    /**
     * Ativa o indicador de viewport
     */
    activate() {
        if (this.isActive) return;
        
        this.isActive = true;
        
        // Mostrar o indicador
        if (this.indicatorElement) {
            this.indicatorElement.style.display = 'block';
        }
        
        // Atualizar imediatamente
        this.updateIndicator();
        
        // Iniciar atualizações periódicas
        this.updateTimer = setInterval(() => {
            this.updateIndicator();
        }, this.updateInterval);
        
        console.log('ViewportIndicator: Indicador de viewport ativado');
    }
    
    /**
     * Desativa o indicador de viewport
     */
    deactivate() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // Ocultar o indicador
        if (this.indicatorElement) {
            this.indicatorElement.style.display = 'none';
        }
        
        // Parar atualizações periódicas
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        
        console.log('ViewportIndicator: Indicador de viewport desativado');
    }
    
    /**
     * Atualiza a posição e tamanho do indicador de viewport
     * para corresponder exatamente à área visível na tela do usuário
     */
    updateIndicator() {
        if (!this.isActive || !this.indicatorElement) return;
        
        // Obter as dimensões da janela de visualização (área visível)
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        
        // Obter a posição de scroll atual
        const scrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
        
        // Definir posição e tamanho do indicador para corresponder exatamente à área visível
        Object.assign(this.indicatorElement.style, {
            top: '0px',  // Fixado no topo da janela visível
            left: '0px', // Fixado no lado esquerdo da janela visível
            width: `${viewportWidth}px`,
            height: `${viewportHeight}px`,
            position: 'fixed' // Garantir que o elemento fique fixo na janela visível
        });
    }
    
    /**
     * Verifica se um elemento está visível na área de visualização
     * @param {HTMLElement} element - Elemento a ser verificado
     * @returns {Object} - Objeto com informações de visibilidade
     */
    checkElementVisibility(element) {
        if (!element) return { isVisible: false, visiblePercentage: 0 };
        
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;
        
        // Verificar se o elemento está completamente fora da tela
        if (
            rect.bottom < 0 ||
            rect.top > windowHeight ||
            rect.right < 0 ||
            rect.left > windowWidth
        ) {
            return { 
                isVisible: false, 
                visiblePercentage: 0
            };
        }
        
        // Calcular a área total do elemento
        const elementArea = rect.width * rect.height;
        if (elementArea === 0) {
            return { 
                isVisible: false, 
                visiblePercentage: 0
            };
        }
        
        // Calcular a área visível do elemento
        const visibleTop = Math.max(0, rect.top);
        const visibleBottom = Math.min(windowHeight, rect.bottom);
        const visibleLeft = Math.max(0, rect.left);
        const visibleRight = Math.min(windowWidth, rect.right);
        
        const visibleWidth = Math.max(0, visibleRight - visibleLeft);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const visibleArea = visibleWidth * visibleHeight;
        
        // Calcular a porcentagem visível
        const visiblePercentage = visibleArea / elementArea;
        
        return {
            isVisible: visiblePercentage > 0,
            visiblePercentage: visiblePercentage
        };
    }
}

// Inicializar o indicador de viewport quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Criar instância do indicador de viewport
    window.viewportIndicator = new ViewportIndicator();
});