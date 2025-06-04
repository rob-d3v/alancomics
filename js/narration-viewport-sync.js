/**
 * NarrationViewportSync - Sincroniza a narração com a viewport
 * 
 * Este módulo garante que os textos só sejam narrados quando estiverem visíveis
 * na viewport do usuário, coordenando a narração com a rolagem automática.
 */
class NarrationViewportSync {
    constructor() {
        // Referências a outros módulos
        this.viewportBoundary = null;
        this.narrator = null;
        this.scrollManager = null;
        this.selectionManager = null;

        // Estado
        this.isEnabled = true;
        this.currentNarrationIndex = -1;
        this.pendingNarration = false;
        this.checkInterval = null;
        this.lastScrollPosition = 0;

        // Configurações
        this.minVisibilityRatio = 0.5; // Quanto do elemento deve estar visível (50%)
        this.scrollCheckInterval = 100; // ms entre verificações de scroll
        this.scrollStabilityThreshold = 50; // ms sem scroll para considerar estável
        this.extraPauseTime = 1000; // Pausa extra quando texto não está visível

        // Inicializar
        this.initialize();
    }

    /**
     * Inicializa o módulo
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
     * Configura o módulo
     */
    setup() {
        // Obter referências aos outros módulos
        this.viewportBoundary = window.viewportBoundary;
        this.narrator = window.comicNarrator;
        this.scrollManager = window.scrollManager;

        if (!this.viewportBoundary || !this.narrator || !this.scrollManager) {
            console.warn('>>> 1 NarrationViewportSync: Módulos necessários não encontrados, tentando novamente em 1s...');
            setTimeout(() => this.setup(), 1000);
            return;
        }

        // Configurar observadores de eventos
        this.setupEventListeners();

        console.log('>>> 2 NarrationViewportSync: Inicializado com sucesso');
    }

    /**
     * Configura os listeners de eventos
     */
    setupEventListeners() {
        // Monitorar eventos de narração
        document.addEventListener('narrationStarted', () => {
            console.log('>>> 3 NarrationViewportSync: Narração iniciada');
            this.startViewportChecking();
        });

        document.addEventListener('narrationStopped', () => {
            console.log('>>> 4 NarrationViewportSync: Narração interrompida');
            this.stopViewportChecking();
        });

        // Monitorar eventos de scroll
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            this.lastScrollPosition = window.scrollY;

            scrollTimeout = setTimeout(() => {
                this.onScrollStabilized();
            }, this.scrollStabilityThreshold);
        });
    }

    /**
     * Inicia a verificação da viewport
     */
    startViewportChecking() {
        if (this.checkInterval) return;

        this.checkInterval = setInterval(() => {
            this.checkCurrentNarrationVisibility();
        }, this.scrollCheckInterval);

        console.log('>>> 5 NarrationViewportSync: Iniciando verificação de viewport');
    }

    /**
     * Para a verificação da viewport
     */
    stopViewportChecking() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('>>> 6 NarrationViewportSync: Verificação de viewport interrompida');
        }
    }

    /**
     * Verifica se o elemento atual está visível na viewport
     */
    checkCurrentNarrationVisibility() {
        if (!this.narrator || !this.narrator.currentElement) return;

        const element = this.narrator.currentElement;
        const visibility = this.calculateElementVisibility(element);

        console.log(`>>> 7 NarrationViewportSync: Verificando visibilidade do elemento atual: ${visibility.toFixed(2)}`);

        if (visibility >= this.minVisibilityRatio) {
            if (this.pendingNarration) {
                console.log('>>> 8 NarrationViewportSync: Elemento visível, retomando narração');
                this.resumeNarration();
            }
        } else {
            if (!this.pendingNarration && this.narrator.isNarrating) {
                console.log('>>> 9 NarrationViewportSync: Elemento não visível, pausando narração');
                this.pauseNarration();
                this.scrollToElement(element);
            }
        }
    }

    /**
     * Calcula a visibilidade de um elemento na viewport
     * @param {HTMLElement} element - O elemento a ser verificado
     * @returns {number} - Razão de visibilidade (0 a 1)
     */
    calculateElementVisibility(element) {
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // Calcular área visível
        const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
        const elementHeight = rect.height;

        // Calcular razão de visibilidade
        return Math.max(0, visibleHeight / elementHeight);
    }

    /**
     * Chamado quando a rolagem se estabiliza
     */
    onScrollStabilized() {
        if (this.pendingNarration) {
            this.checkCurrentNarrationVisibility();
        }
    }

    /**
     * Pausa a narração
     */
    pauseNarration() {
        if (!this.narrator) return;

        this.pendingNarration = true;
        this.narrator.pause();
        console.log('>>> 10 NarrationViewportSync: Narração pausada');
    }

    /**
     * Retoma a narração
     */
    resumeNarration() {
        if (!this.narrator) return;

        // Adicionar pausa extra antes de retomar
        setTimeout(() => {
            this.pendingNarration = false;
            this.narrator.resume();
            console.log('>>> 11 NarrationViewportSync: Narração retomada após pausa extra');
        }, this.extraPauseTime);
    }

    /**
     * Rola a página até um elemento
     * @param {HTMLElement} element - O elemento alvo
     */
    scrollToElement(element) {
        if (!this.scrollManager) return;

        const elementRect = element.getBoundingClientRect();
        const targetScroll = window.scrollY + elementRect.top - (window.innerHeight / 3);

        window.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
        });

        console.log('>>> 12 NarrationViewportSync: Rolando para elemento:', {
            elementTop: elementRect.top,
            targetScroll: targetScroll
        });
    }
}

// Inicializar o módulo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.narrationViewportSync = new NarrationViewportSync();
});