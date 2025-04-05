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
        
        // Gerenciador de scroll
        this.scrollManager = new ScrollManager();
        
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
                    box-shadow: 0 0 8px rgba(52, 152, 219, 0.4);
                    transition: background-color 0.3s ease, box-shadow 0.3s ease;
                    display: inline;
                    position: relative;
                    z-index: 10;
                    animation: narration-pulse 2s infinite alternate;
                }
                
                @keyframes narration-pulse {
                    0% { background-color: rgba(52, 152, 219, 0.3); box-shadow: 0 0 8px rgba(52, 152, 219, 0.4); }
                    100% { background-color: rgba(52, 152, 219, 0.5); box-shadow: 0 0 12px rgba(52, 152, 219, 0.6); }
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
        
        // Evento de limite de palavra (word boundary)
        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                // Atualizar a posição atual no texto
                this.currentPosition = event.charIndex;
                
                // Destacar a posição atual
                this.highlightTextPosition(this.currentPosition);
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
        
        // Configurar o scroll para manter o elemento visível
        this.scrollManager.setCurrentElement(highlightElement);
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