/**
 * TextNarrationTracker - Responsável por rastrear e destacar o texto sendo narrado
 * 
 * Este módulo implementa a funcionalidade de destacar o texto que está sendo narrado
 * em tempo real e garantir que o scroll acompanhe o texto, mantendo-o sempre visível.
 */
class TextNarrationTracker {
    constructor() {
        // Referência ao elemento de texto atual
        this.currentTextElement = null;
        
        // Referência ao elemento destacado atual
        this.highlightedElement = null;
        
        // Usar o ScrollManager global em vez de criar uma nova instância
        // Isso garante que todos os componentes usem a mesma instância do ScrollManager
        this.scrollManager = window.scrollManager || new ScrollManager();
        
        // Configurações
        this.settings = {
            // Cor de fundo para o destaque
            highlightColor: 'rgba(52, 152, 219, 0.3)',
            // Atraso para atualizar o destaque (ms)
            updateDelay: 50
        };
        
        // Estado
        this.isActive = false;
        this.currentPosition = 0;
        this.currentText = '';
        this.utterance = null;
        
        // Inicializar
        this.initialize();
    }
    
    /**
     * Inicializa o rastreador
     */
    initialize() {
        // Ativar o gerenciador de scroll
        this.scrollManager.activate();
        
        // Adicionar estilos CSS se necessário
        this.ensureStylesExist();
    }
    
    /**
     * Garante que os estilos necessários existam
     */
    ensureStylesExist() {
        // Verificar se já existe um estilo para o texto narrado
        if (!document.querySelector('style#text-narration-tracker-styles')) {
            const style = document.createElement('style');
            style.id = 'text-narration-tracker-styles';
            style.textContent = `
                .current-narration-text {
                    background-color: ${this.settings.highlightColor};
                    border-radius: 3px;
                    padding: 2px 4px;
                    margin: -2px -4px;
                    box-shadow: 0 0 12px rgba(52, 152, 219, 0.6);
                    transition: background-color 0.3s ease, box-shadow 0.3s ease;
                    display: inline;
                    position: relative;
                    z-index: 100;
                    animation: narration-pulse 1.5s infinite alternate;
                    outline: 2px solid rgba(52, 152, 219, 0.7);
                    font-weight: 500;
                }
                
                @keyframes narration-pulse {
                    0% { background-color: rgba(52, 152, 219, 0.4); box-shadow: 0 0 12px rgba(52, 152, 219, 0.5); }
                    100% { background-color: rgba(52, 152, 219, 0.6); box-shadow: 0 0 16px rgba(52, 152, 219, 0.8); }
                }
                
                /* Estilo adicional para quando o elemento recebe foco */
                .current-narration-text:focus {
                    outline: 3px solid rgba(52, 152, 219, 0.9);
                    box-shadow: 0 0 20px rgba(52, 152, 219, 0.8);
                }
                
                /* Estilo para destacar temporariamente quando o scroll é aplicado */
                .current-narration-text.scroll-highlight {
                    background-color: rgba(52, 152, 219, 0.7) !important;
                    box-shadow: 0 0 25px rgba(52, 152, 219, 1) !important;
                    transition: all 0.3s ease-in-out;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    /**
     * Ativa o rastreamento de narração
     * @param {HTMLElement} textElement - Elemento que contém o texto a ser narrado
     */
    activate(textElement) {
        if (!textElement) return;
        
        this.currentTextElement = textElement;
        this.isActive = true;
        
        console.log('TextNarrationTracker: Rastreamento de narração ativado');
    }
    
    /**
     * Desativa o rastreamento de narração
     */
    deactivate() {
        this.isActive = false;
        this.removeHighlight();
        
        console.log('TextNarrationTracker: Rastreamento de narração desativado');
    }
    
    /**
     * Inicia a narração com destaque e scroll automático
     * @param {string} text - Texto a ser narrado
     * @param {SpeechSynthesisUtterance} utterance - Objeto utterance da narração
     */
    startNarration(text, utterance) {
        if (!this.isActive || !this.currentTextElement) return;
        
        this.currentText = text;
        this.utterance = utterance;
        
        // Configurar eventos para rastrear o progresso da narração
        this.setupUtteranceEvents(utterance);
        
        // Destacar o início do texto
        this.highlightTextPosition(0);
    }
    
    /**
     * Configura eventos para rastrear o progresso da narração
     * @param {SpeechSynthesisUtterance} utterance - Objeto utterance da narração
     */
    setupUtteranceEvents(utterance) {
        if (!utterance) return;
        
        // Preservar eventos onboundary existentes se houver
        const existingOnBoundary = utterance.onboundary;
        
        // Evento de limite de palavra (word boundary)
        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                // Atualizar a posição atual no texto
                this.currentPosition = event.charIndex;
                
                // Destacar a posição atual
                this.highlightTextPosition(this.currentPosition);
                
                // Garantir que o ScrollManager acompanhe o elemento destacado
                if (this.scrollManager && this.highlightedElement) {
                    this.scrollManager.setCurrentElement(this.highlightedElement);
                }
            }
            
            // Chamar o handler existente se houver
            if (existingOnBoundary) {
                existingOnBoundary(event);
            }
        };
        
        // Evento de fim da narração
        utterance.onend = () => {
            // Remover destaque ao finalizar
            setTimeout(() => {
                this.removeHighlight();
            }, 500);
        };
    }
    
    /**
     * Destaca o texto na posição especificada
     * @param {number} position - Posição no texto a ser destacada
     */
    highlightTextPosition(position) {
        if (!this.isActive || !this.currentTextElement || !this.currentText) return;
        
        // Remover destaque anterior
        this.removeHighlight();
        
        // Encontrar a palavra atual e seu contexto
        const wordInfo = this.findWordAtPosition(position);
        if (!wordInfo) return;
        
        // Criar elemento de destaque
        const highlightElement = document.createElement('span');
        highlightElement.className = 'current-narration-text';
        highlightElement.textContent = wordInfo.word;
        
        // Adicionar atributos para melhorar a acessibilidade e foco
        highlightElement.setAttribute('tabindex', '-1');
        highlightElement.setAttribute('aria-live', 'assertive');
        
        // Dividir o texto em três partes: antes, palavra e depois
        const textBefore = this.currentText.substring(0, wordInfo.start);
        const textAfter = this.currentText.substring(wordInfo.end);
        
        // Limpar o conteúdo atual
        this.currentTextElement.innerHTML = '';
        
        // Adicionar o texto antes
        if (textBefore) {
            const beforeElement = document.createTextNode(textBefore);
            this.currentTextElement.appendChild(beforeElement);
        }
        
        // Adicionar o elemento destacado
        this.currentTextElement.appendChild(highlightElement);
        this.highlightedElement = highlightElement;
        
        // Adicionar o texto depois
        if (textAfter) {
            const afterElement = document.createTextNode(textAfter);
            this.currentTextElement.appendChild(afterElement);
        }
        
        // Garantir que o elemento destacado tenha um estilo que o torne mais visível
        highlightElement.style.display = 'inline-block';
        highlightElement.style.position = 'relative';
        highlightElement.style.zIndex = '100'; // Aumentar z-index para garantir visibilidade
        
        // Forçar um reflow para garantir que as mudanças de estilo sejam aplicadas
        highlightElement.getBoundingClientRect();
        
        // Reduzir o atraso para tornar a experiência mais responsiva
        const scrollDelay = Math.max(10, this.settings.updateDelay / 2);
        
        // Aguardar um pequeno intervalo para garantir que o DOM foi atualizado
        // antes de configurar o scroll, isso melhora a precisão do posicionamento
        setTimeout(() => {
            // Forçar o foco no elemento para garantir que ele receba atenção
            highlightElement.focus({ preventScroll: true });
            
            // Adicionar classe temporária para chamar atenção visual
            highlightElement.classList.add('scroll-highlight');
            
            // Encontrar o contêiner de scroll do texto (txt-content)
            const scrollContainer = this.findScrollContainer(this.currentTextElement);
            
            // Usar uma abordagem de dois níveis para garantir o scroll:
            // 1. Primeiro tentar usar o contêiner específico de texto
            // 2. Depois usar o ScrollManager global como backup
            
            // Primeiro nível: scroll no contêiner específico
            if (scrollContainer) {
                // Usar scroll direto no contêiner de texto
                this.scrollToHighlightedElement(highlightElement, scrollContainer);
                console.log('TextNarrationTracker: Usando scroll do contêiner de texto');
            }
            
            // Segundo nível: sempre usar o ScrollManager global também
            // Isso garante que, mesmo que o contêiner específico falhe,
            // o ScrollManager global tentará manter o elemento visível
            if (this.scrollManager) {
                // Ajustar configurações do ScrollManager para melhor visibilidade
                if (this.scrollManager.settings) {
                    this.scrollManager.settings.behavior = 'smooth';
                    this.scrollManager.settings.verticalAlignment = 0.35; // Posicionar mais ao centro
                    this.scrollManager.settings.margin = 120; // Aumentar margem de segurança
                    this.scrollManager.settings.scrollDelay = 50; // Reduzir atraso para resposta mais rápida
                }
                
                // Definir o elemento atual e forçar o scroll
                this.scrollManager.setCurrentElement(highlightElement);
                console.log('TextNarrationTracker: Usando ScrollManager global como backup');
            }
            
            // Remover a classe de destaque após um tempo
            setTimeout(() => {
                highlightElement.classList.remove('scroll-highlight');
            }, 1000);
            
        }, scrollDelay);
    }
    
    /**
     * Encontra o contêiner com scroll que contém o elemento
     * @param {HTMLElement} element - Elemento para encontrar o contêiner
     * @returns {HTMLElement|null} - Contêiner com scroll ou null se não encontrar
     */
    findScrollContainer(element) {
        if (!element) return null;
        
        // Primeiro, tentar encontrar diretamente o contêiner txt-content
        // que é o contêiner principal de texto na aplicação
        const txtContent = document.querySelector('.txt-content');
        if (txtContent) {
            console.log('TextNarrationTracker: Contêiner txt-content encontrado diretamente');
            return txtContent;
        }
        
        // Se não encontrou diretamente, procurar nos elementos pais
        let parent = element.parentElement;
        
        while (parent) {
            // Verificar se o elemento tem scroll
            const style = getComputedStyle(parent);
            const hasScroll = (
                parent.scrollHeight > parent.clientHeight &&
                (style.overflowY === 'auto' || 
                 style.overflowY === 'scroll' ||
                 style.overflow === 'auto' ||
                 style.overflow === 'scroll')
            );
            
            // Verificar também se é um contêiner de texto conhecido
            // Adicionamos mais classes que podem ser usadas como contêineres de texto
            const isTextContainer = (
                parent.classList.contains('txt-content') ||
                parent.classList.contains('text-container') ||
                parent.classList.contains('txt-container') ||
                parent.classList.contains('extracted-text-container') ||
                parent.id === 'imagesContainer'
            );
            
            if (hasScroll || isTextContainer) {
                console.log('TextNarrationTracker: Contêiner de scroll encontrado:', 
                    parent.className || parent.id || 'elemento sem classe/id');
                return parent;
            }
            
            parent = parent.parentElement;
        }
        
        // Se não encontrou nenhum contêiner específico, usar o body como último recurso
        console.log('TextNarrationTracker: Nenhum contêiner específico encontrado, usando document.body');
        return document.body;
    }
    
    /**
     * Centraliza o elemento destacado no contêiner de scroll
     * @param {HTMLElement} element - Elemento a ser centralizado
     * @param {HTMLElement} container - Contêiner de scroll
     */
    scrollToHighlightedElement(element, container) {
        if (!element || !container) return;
        
        // Obter as dimensões do elemento e do contêiner
        const elementRect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calcular a posição relativa do elemento dentro do contêiner
        const relativeTop = elementRect.top - containerRect.top + container.scrollTop;
        
        // Calcular a posição de destino para centralizar o elemento
        // Usar 0.35 como fator de centralização para posicionar um pouco acima do centro
        // mas não tão alto que fique muito próximo do topo
        const targetScroll = relativeTop - (containerRect.height * 0.35) + (elementRect.height / 2);
        
        // Margem de segurança para considerar o elemento visível (em pixels)
        const safetyMargin = 80;
        
        // Verificar se o elemento já está visível no viewport do contêiner
        // Tornamos a verificação mais precisa para garantir que o elemento esteja bem visível
        const isVisible = (
            relativeTop >= container.scrollTop + safetyMargin &&
            relativeTop + elementRect.height <= container.scrollTop + containerRect.height - safetyMargin
        );
        
        // Sempre fazer o scroll para garantir que o elemento esteja centralizado
        // Isso resolve o problema de elementos que estão tecnicamente visíveis
        // mas não estão em uma posição ideal para leitura
        
        // Adicionar classe de destaque para chamar atenção
        element.classList.add('scroll-highlight');
        
        // Fazer o scroll com animação suave
        container.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
        });
        
        // Remover a classe de destaque após um tempo
        setTimeout(() => {
            element.classList.remove('scroll-highlight');
        }, 1500);
        
        console.log('TextNarrationTracker: Elemento centralizado no contêiner de scroll');
    }
    
    /**
     * Encontra a palavra na posição especificada e seu contexto
     * @param {number} position - Posição no texto
     * @returns {Object|null} - Informações sobre a palavra ou null se não encontrada
     */
    findWordAtPosition(position) {
        if (!this.currentText || position < 0 || position >= this.currentText.length) return null;
        
        // Encontrar o início da palavra
        let start = position;
        while (start > 0 && !/\s/.test(this.currentText[start - 1])) {
            start--;
        }
        
        // Encontrar o fim da palavra
        let end = position;
        while (end < this.currentText.length && !/\s/.test(this.currentText[end])) {
            end++;
        }
        
        // Extrair a palavra
        const word = this.currentText.substring(start, end);
        
        return {
            word,
            start,
            end
        };
    }
    
    /**
     * Remove o destaque atual do texto
     */
    removeHighlight() {
        if (!this.currentTextElement) return;
        
        // Se não há elemento destacado, não fazer nada
        if (!this.highlightedElement) return;
        
        // Restaurar o texto original
        const fullText = this.currentTextElement.textContent;
        this.currentTextElement.innerHTML = '';
        this.currentTextElement.textContent = fullText;
        
        // Limpar referência ao elemento destacado
        this.highlightedElement = null;
    }
}

// Exportar para uso global
window.TextNarrationTracker = TextNarrationTracker;