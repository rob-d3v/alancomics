/**
 * ScrollManager - Gerencia a rolagem automática durante a narração
 * 
 * Este módulo implementa uma rolagem automática inteligente e diferenciada que mantém o texto
 * sendo narrado sempre visível na tela, com transições suaves, efeitos visuais e comportamento adaptativo.
 */
class ScrollManager {
    constructor() {
        // Elemento atual sendo narrado
        this.currentElement = null;
        
        // Elemento anterior (para animações de transição)
        this.previousElement = null;
        
        // Configurações
        this.settings = {
            // Margem de segurança para manter o elemento visível (em pixels)
            margin: 50,
            // Comportamento da rolagem (smooth ou auto)
            behavior: 'smooth',
            // Posição vertical do elemento na tela (0 = topo, 0.5 = centro, 1 = base)
            verticalAlignment: 0.35,
            // Atraso antes de rolar (ms) - aumentado para transição mais suave
            scrollDelay: 150,
            // Duração do destaque visual (ms)
            highlightDuration: 2500,
            // Duração da animação de pulso (ms)
            pulseDuration: 1500,
            // Intensidade do efeito de pulso (0-1)
            pulseIntensity: 0.3
        };
        
        // Estado
        this.isActive = false;
        this.scrollTimer = null;
        this.highlightTimer = null;
        this.pulseTimer = null;
        this.isScrolling = false;
        
        // Inicializar
        this.initialize();
        
        // Adicionar estilos CSS necessários
        this.addScrollStyles();
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
        
        // Adicionar listener para eventos de scroll para detectar interação do usuário
        window.addEventListener('scroll', () => {
            if (!this.isScrolling) {
                // Se o usuário está rolando manualmente, pausar brevemente a rolagem automática
                this.pauseScrolling();
                
                // Retomar a rolagem automática após um tempo
                clearTimeout(this.userScrollTimer);
                this.userScrollTimer = setTimeout(() => {
                    if (this.isActive && this.currentElement) {
                        this.resumeScrolling();
                    }
                }, 1500); // Aguardar 1.5 segundos após o usuário parar de rolar
            }
        });
        
        // Verificar periodicamente se o ScrollManager deve estar ativo
        setInterval(() => {
            if (window.scrollManagerActive === true && !this.isActive) {
                this.activate();
                // console.log('ScrollManager: Reativado automaticamente');
            }
        }, 2000);
        
        // Variável global para controlar o estado de rolagem
        window.scrollManagerActive = false;
    }
    
    /**
     * Adiciona estilos CSS necessários para os efeitos visuais
     */
    addScrollStyles() {
        // Verificar se o arquivo CSS já foi carregado
        if (document.getElementById('auto-scroll-styles')) return;
        
        // Criar elemento de link para o arquivo CSS externo
        const linkElement = document.createElement('link');
        linkElement.id = 'auto-scroll-styles';
        linkElement.rel = 'stylesheet';
        linkElement.href = 'css/auto-scroll.css';
        
        // Adicionar ao documento
        document.head.appendChild(linkElement);
        
        // console.log('ScrollManager: Estilos de rolagem automática carregados');
    }
    
    /**
     * Ativa a rolagem automática
     */
    activate() {
        this.isActive = true;
        window.scrollManagerActive = true;
        
        // Adicionar classe ao body para indicar que a rolagem automática está ativa
        document.body.classList.add('auto-scroll-active');
        
        // console.log('ScrollManager: Ativado com efeitos visuais aprimorados');
    }
    
    /**
     * Desativa a rolagem automática
     */
    deactivate() {
        this.isActive = false;
        window.scrollManagerActive = false;
        
        // Limpar todos os timers
        this.clearAllTimers();
        
        // Remover classe do body
        document.body.classList.remove('auto-scroll-active');
        
        // Remover destaques visuais de qualquer elemento
        this.removeVisualEffects();
        
        // console.log('ScrollManager: Desativado');
    }
    
    /**
     * Pausa temporariamente a rolagem (durante a narração de um trecho ou interação do usuário)
     */
    pauseScrolling() {
        if (this.isActive) {
            this.isPaused = true;
            this.clearScrollTimer();
            // console.log('ScrollManager: Rolagem pausada');
        }
    }
    
    /**
     * Retoma a rolagem após a narração de um trecho ou interação do usuário
     */
    resumeScrolling() {
        if (this.isActive) {
            this.isPaused = false;
            if (this.currentElement) {
                this.scheduleScroll();
                // console.log('ScrollManager: Rolagem retomada');
            }
        }
    }
    
    /**
     * Remove todos os efeitos visuais dos elementos
     */
    removeVisualEffects() {
        // Remover classes de destaque de todos os elementos
        const highlightedElements = document.querySelectorAll('.scroll-highlight, .scroll-pulse, .scroll-active-element');
        highlightedElements.forEach(element => {
            element.classList.remove('scroll-highlight', 'scroll-pulse', 'scroll-active-element');
        });
    }
    
    /**
     * Limpa todos os timers
     */
    clearAllTimers() {
        this.clearScrollTimer();
        
        if (this.highlightTimer) {
            clearTimeout(this.highlightTimer);
            this.highlightTimer = null;
        }
        
        if (this.pulseTimer) {
            clearTimeout(this.pulseTimer);
            this.pulseTimer = null;
        }
        
        if (this.userScrollTimer) {
            clearTimeout(this.userScrollTimer);
            this.userScrollTimer = null;
        }
    }
    
    /**
     * Define o elemento atual para rolagem
     * @param {HTMLElement} element - Elemento a ser mantido visível
     */
    setCurrentElement(element) {
        if (!element) return;
        
        // Armazenar o elemento anterior para efeitos de transição
        this.previousElement = this.currentElement;
        
        // Atualizar o elemento atual
        this.currentElement = element;
        
        // Remover efeitos visuais do elemento anterior
        if (this.previousElement && this.previousElement !== this.currentElement) {
            this.previousElement.classList.remove('scroll-highlight', 'scroll-pulse', 'scroll-active-element');
        }
        
        // Adicionar classe de elemento ativo ao novo elemento
        this.currentElement.classList.add('scroll-active-element');
        
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
     * Rola a página para manter o elemento visível e centralizado com efeitos visuais
     * @param {HTMLElement} element - Elemento para manter visível
     */
    scrollToElement(element) {
        if (!element || !this.isActive) return;
        
        // Limpar qualquer timer pendente
        this.clearAllTimers();
        
        // Marcar que estamos iniciando uma rolagem programática
        this.isScrolling = true;
        
        // Adicionar classe de destaque visual com animação
        element.classList.add('scroll-highlight');
        
        // Adicionar efeito de pulso para chamar atenção
        element.classList.add('scroll-pulse');
        
        // Definir um timer para remover o destaque após um tempo
        this.highlightTimer = setTimeout(() => {
            element.classList.remove('scroll-highlight');
        }, this.settings.highlightDuration);
        
        // Definir um timer para remover o efeito de pulso
        this.pulseTimer = setTimeout(() => {
            element.classList.remove('scroll-pulse');
        }, this.settings.pulseDuration);
        
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
                // Aplicar efeito de destaque antes da rolagem para chamar atenção
                const viewerElement = document.getElementById('viewer');
                if (viewerElement) {
                    viewerElement.style.scrollBehavior = this.settings.behavior;
                }
                
                // Rolar para a posição desejada
                window.scrollTo({
                    top: targetPosition,
                    behavior: this.settings.behavior
                });
                
                // Marcar que a rolagem programática terminou após a animação
                setTimeout(() => {
                    this.isScrolling = false;
                }, 500); // Tempo aproximado para a animação de rolagem terminar
            } else {
                // Se já estiver visível, apenas marcar que não estamos mais rolando
                this.isScrolling = false;
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