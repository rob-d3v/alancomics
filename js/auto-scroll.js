/**
 * AutoScroll - Responsável pela rolagem automática durante a narração
 * 
 * Este módulo implementa a funcionalidade de rolagem automática para manter
 * o texto sendo narrado sempre visível na tela, com transições suaves.
 */
class AutoScroll {
    constructor() {
        // Elemento atual sendo narrado
        this.currentElement = null;
        // Configurações de rolagem
        this.settings = {
            // Margem de segurança para manter o elemento visível (em pixels)
            margin: 50,
            // Comportamento da rolagem (smooth ou auto)
            behavior: 'smooth',
            // Posição vertical do elemento na tela (0 = topo, 0.5 = centro, 1 = base)
            verticalAlignment: 0.3
        };
        // Flag para controlar se a rolagem automática está ativa
        this.isActive = false;
        // Referência ao observador de interseção
        this.observer = null;
    }

    /**
     * Inicia o sistema de rolagem automática
     */
    start() {
        this.isActive = true;
        this.setupIntersectionObserver();
    }

    /**
     * Para o sistema de rolagem automática
     */
    stop() {
        this.isActive = false;
        this.disconnectObserver();
    }

    /**
     * Configura o observador de interseção para monitorar a visibilidade do elemento
     */
    setupIntersectionObserver() {
        // Desconectar observador existente, se houver
        this.disconnectObserver();

        // Criar novo observador
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersection(entries),
            {
                root: null, // viewport
                rootMargin: `${this.settings.margin}px`,
                threshold: 0.1 // 10% de visibilidade é suficiente para acionar
            }
        );

        // Se houver um elemento atual, começar a observá-lo
        if (this.currentElement) {
            this.observer.observe(this.currentElement);
        }
    }

    /**
     * Desconecta o observador de interseção
     */
    disconnectObserver() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    /**
     * Manipula eventos de interseção (quando o elemento entra/sai da viewport)
     * @param {IntersectionObserverEntry[]} entries - Entradas do observador
     */
    handleIntersection(entries) {
        if (!this.isActive) return;

        // Verificar cada entrada
        entries.forEach(entry => {
            // Se o elemento não está suficientemente visível, rolar para ele
            if (!entry.isIntersecting) {
                this.scrollToElement(entry.target);
            }
        });
    }

    /**
     * Define o elemento atual para rolagem automática
     * @param {HTMLElement} element - Elemento a ser mantido visível
     */
    setCurrentElement(element) {
        if (!element) return;

        // Atualizar referência ao elemento atual
        this.currentElement = element;

        // Se o observador estiver ativo, começar a observar o novo elemento
        if (this.observer && this.isActive) {
            this.observer.disconnect();
            this.observer.observe(element);
            
            // Rolar imediatamente para o elemento
            this.scrollToElement(element);
        }
    }

    /**
     * Rola a página para manter o elemento visível
     * @param {HTMLElement} element - Elemento para o qual rolar
     */
    scrollToElement(element) {
        if (!element || !this.isActive) return;

        // Obter a posição do elemento
        const rect = element.getBoundingClientRect();
        
        // Calcular a posição desejada na tela
        // Usando verticalAlignment para determinar onde o elemento deve aparecer
        const viewportHeight = window.innerHeight;
        const targetPosition = viewportHeight * this.settings.verticalAlignment;
        
        // Calcular a posição de rolagem necessária
        const scrollPosition = window.pageYOffset + rect.top - targetPosition;
        
        // Rolar para a posição calculada com o comportamento definido
        window.scrollTo({
            top: scrollPosition,
            behavior: this.settings.behavior
        });
    }

    /**
     * Atualiza as configurações de rolagem
     * @param {Object} newSettings - Novas configurações
     */
    updateSettings(newSettings) {
        // Mesclar as novas configurações com as existentes
        this.settings = { ...this.settings, ...newSettings };
        
        // Reconfigurar o observador com as novas configurações
        if (this.isActive) {
            this.setupIntersectionObserver();
        }
    }
}

// Exportar a classe para uso global
window.AutoScroll = AutoScroll;