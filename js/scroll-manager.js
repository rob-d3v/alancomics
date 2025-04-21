/**
 * ScrollManager - Gerencia a rolagem automática durante a narração
 * 
 * Este módulo implementa uma rolagem automática aprimorada que mantém o texto
 * sendo narrado sempre visível na tela, com transições suaves e inteligentes.
 */
class ScrollManager {
    constructor() {
        // Elemento atual sendo narrado
        this.currentElement = null;
        
        // Configurações
        this.settings = {
            // Margem de segurança para manter o elemento visível (em pixels)
            margin: 50,
            // Comportamento da rolagem (smooth ou auto)
            behavior: 'smooth',
            // Posição vertical do elemento na tela (0 = topo, 0.5 = centro, 1 = base)
            verticalAlignment: 0.3,
            // Atraso antes de rolar (ms)
            scrollDelay: 100
        };
        
        // Estado
        this.isActive = false;
        this.scrollTimer = null;
        
        // Inicializar
        this.initialize();
    }
    
    /**
     * Inicializa o gerenciador de rolagem
     */
    initialize() {
        // Adicionar listener para eventos de redimensionamento da janela
        window.addEventListener('resize', () => {
            if (this.isActive && this.currentElement) {
                this.scrollToElement(this.currentElement);
            }
        });
        
        // Verificar periodicamente se o ScrollManager deve estar ativo
        setInterval(() => {
            if (window.scrollManagerActive === true && !this.isActive) {
                this.activate();
                console.log('ScrollManager: Reativado automaticamente');
            }
        }, 2000);
        
        // Variável global para controlar o estado de rolagem
        window.scrollManagerActive = false;
    }
    
    /**
     * Ativa a rolagem automática
     */
    activate() {
        this.isActive = true;
        window.scrollManagerActive = true;
        console.log('ScrollManager: Ativado');
    }
    
    /**
     * Desativa a rolagem automática
     */
    deactivate() {
        this.isActive = false;
        window.scrollManagerActive = false;
        this.clearScrollTimer();
        console.log('ScrollManager: Desativado');
    }
    
    /**
     * Pausa temporariamente a rolagem (durante a narração de um trecho)
     */
    pauseScrolling() {
        if (this.isActive) {
            this.isPaused = true;
            this.clearScrollTimer();
            console.log('ScrollManager: Rolagem pausada durante narração');
        }
    }
    
    /**
     * Retoma a rolagem após a narração de um trecho
     */
    resumeScrolling() {
        if (this.isActive) {
            this.isPaused = false;
            if (this.currentElement) {
                this.scheduleScroll();
                console.log('ScrollManager: Rolagem retomada após narração');
            }
        }
    }
    
    /**
     * Define o elemento atual para rolagem
     * @param {HTMLElement} element - Elemento a ser mantido visível
     */
    setCurrentElement(element) {
        if (!element) return;
        
        this.currentElement = element;
        
        // Programar a rolagem com um pequeno atraso para permitir que o DOM seja atualizado
        this.scheduleScroll();
    }
    
    /**
     * Programa a rolagem com um pequeno atraso
     */
    scheduleScroll() {
        this.clearScrollTimer();
        
        this.scrollTimer = setTimeout(() => {
            if (this.isActive && this.currentElement) {
                this.scrollToElement(this.currentElement);
            }
        }, this.settings.scrollDelay);
    }
    
    /**
     * Limpa o timer de rolagem
     */
    clearScrollTimer() {
        if (this.scrollTimer) {
            clearTimeout(this.scrollTimer);
            this.scrollTimer = null;
        }
    }
    
    /**
     * Rola a página para manter o elemento visível e centralizado
     * @param {HTMLElement} element - Elemento para manter visível
     */
    scrollToElement(element) {
        if (!element || !this.isActive) return;
        
        // Limpar qualquer timer pendente
        this.clearScrollTimer();
        
        // Adicionar classe de destaque visual temporário
        element.classList.add('scroll-highlight');
        
        // Definir um timer para remover o destaque após um tempo
        setTimeout(() => {
            element.classList.remove('scroll-highlight');
        }, 3000); // Aumentado para 3 segundos para melhor visibilidade
        
        // Definir um timer para a rolagem (para dar tempo ao usuário de perceber onde está)
        this.scrollTimer = setTimeout(() => {
            // Obter a posição do elemento
            const rect = element.getBoundingClientRect();
            
            // Calcular a posição desejada na tela (centralizado verticalmente)
            const windowHeight = window.innerHeight;
            const targetPosition = rect.top + window.scrollY - (windowHeight * this.settings.verticalAlignment) + (rect.height / 2);
            
            // Verificar se o elemento está completamente visível e centralizado na área desejada
            // Tornamos a verificação mais rigorosa para garantir que o elemento esteja bem centralizado
            const centerY = windowHeight * this.settings.verticalAlignment;
            const elementCenterY = rect.top + (rect.height / 2);
            const distanceFromIdealCenter = Math.abs(elementCenterY - centerY);
            
            // Consideramos visível apenas se estiver próximo do centro ideal e completamente visível
            const isVisible = (
                rect.top >= this.settings.margin && 
                rect.bottom <= windowHeight - this.settings.margin &&
                distanceFromIdealCenter < (windowHeight * 0.1) // 10% da altura da janela de tolerância
            );
            
            // Se não estiver visível na área desejada, rolar para a posição
            if (!isVisible) {
                window.scrollTo({
                    top: targetPosition,
                    behavior: this.settings.behavior
                });
            }
        }, this.settings.scrollDelay);
    }
    
    /**
     * Verifica se um elemento está visível na viewport
     * @param {HTMLElement} element - Elemento a verificar
     * @returns {boolean} - Verdadeiro se o elemento estiver visível
     */
    isElementVisible(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
        );
    }
}