/**
 * TextHighlighter - Responsável por destacar o texto sendo narrado
 * 
 * Este módulo implementa a funcionalidade de destacar o texto que está sendo narrado
 * em tempo real, aplicando estilos visuais para melhorar a experiência do usuário.
 */
class TextHighlighter {
    constructor() {
        // Referência ao elemento de texto atual
        this.currentTextElement = null;
        // Array de sentenças do texto atual
        this.sentences = [];
        // Índice da sentença atual sendo narrada
        this.currentSentenceIndex = -1;
        // Elemento atualmente destacado
        this.highlightedElement = null;
        // Cor de fundo para o destaque (pode ser personalizada)
        this.highlightColor = 'rgba(52, 152, 219, 0.3)';
    }

    /**
     * Processa o texto dividindo-o em sentenças para narração
     * @param {string} text - Texto completo a ser processado
     * @returns {Array} - Array de sentenças
     */
    processText(text) {
        if (!text) return [];

        // Dividir o texto em sentenças usando regex
        // Considera pontos, exclamações, interrogações como separadores de sentenças
        const sentenceRegex = /[^.!?\r\n]+[.!?]?[\r\n]*/g;
        const matches = text.match(sentenceRegex);

        // Se não encontrar sentenças, retorna o texto completo como uma única sentença
        if (!matches) return [text];

        // Filtrar sentenças vazias e trimá-las
        return matches
            .filter(sentence => sentence.trim().length > 0)
            .map(sentence => sentence.trim());
    }

    /**
     * Configura o elemento de texto para narração com destaque
     * @param {HTMLElement} textElement - Elemento que contém o texto a ser narrado
     */
    setupTextElement(textElement) {
        if (!textElement) return;

        // Armazenar referência ao elemento de texto
        this.currentTextElement = textElement;
        
        // Obter o texto completo do elemento
        const fullText = textElement.textContent || '';
        
        // Processar o texto em sentenças
        this.sentences = this.processText(fullText);
        
        // Resetar o índice da sentença atual
        this.currentSentenceIndex = -1;
        
        console.log(`Texto processado em ${this.sentences.length} sentenças para narração com destaque`);
    }

    /**
     * Destaca a próxima sentença no texto
     * @returns {string} - A sentença que foi destacada
     */
    highlightNextSentence() {
        // Remover destaque anterior
        this.removeHighlight();
        
        // Avançar para a próxima sentença
        this.currentSentenceIndex++;
        
        // Verificar se ainda há sentenças para destacar
        if (this.currentSentenceIndex >= this.sentences.length) {
            console.log('Fim do texto alcançado');
            return '';
        }
        
        // Obter a sentença atual
        const currentSentence = this.sentences[this.currentSentenceIndex];
        
        // Destacar a sentença atual no texto
        this.highlightSentence(currentSentence);
        
        // Rolar para manter a sentença visível
        this.scrollToHighlightedElement();
        
        return currentSentence;
    }

    /**
     * Destaca uma sentença específica no texto
     * @param {string} sentence - Sentença a ser destacada
     */
    highlightSentence(sentence) {
        if (!this.currentTextElement || !sentence) return;

        // Obter o texto completo
        const fullText = this.currentTextElement.textContent;
        
        // Encontrar a posição da sentença no texto completo
        const sentenceIndex = fullText.indexOf(sentence);
        
        if (sentenceIndex === -1) {
            console.warn('Sentença não encontrada no texto:', sentence);
            return;
        }
        
        // Criar elemento de destaque
        const highlightElement = document.createElement('span');
        highlightElement.className = 'narrating-text';
        highlightElement.textContent = sentence;
        highlightElement.style.backgroundColor = this.highlightColor;
        
        // Dividir o texto em três partes: antes, sentença e depois
        const textBefore = fullText.substring(0, sentenceIndex);
        const textAfter = fullText.substring(sentenceIndex + sentence.length);
        
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

    /**
     * Rola a página para manter o elemento destacado visível
     */
    scrollToHighlightedElement() {
        if (!this.highlightedElement) return;
        
        // Obter a posição do elemento destacado
        const rect = this.highlightedElement.getBoundingClientRect();
        
        // Verificar se o elemento está fora da área visível
        const isInViewport = (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
        
        // Se não estiver visível, rolar para ele
        if (!isInViewport) {
            // Calcular posição para centralizar o elemento na tela
            const scrollTop = rect.top + window.pageYOffset - (window.innerHeight / 2);
            
            // Rolar suavemente para a posição
            window.scrollTo({
                top: scrollTop,
                behavior: 'smooth'
            });
        }
    }

    /**
     * Inicia a narração a partir de um ponto específico no texto
     * @param {HTMLElement} textElement - Elemento de texto
     * @param {number} startPosition - Posição inicial no texto (índice do caractere)
     */
    startFromPosition(textElement, startPosition) {
        if (!textElement) return;
        
        // Configurar o elemento de texto
        this.setupTextElement(textElement);
        
        // Se a posição inicial não for especificada, começar do início
        if (typeof startPosition !== 'number' || startPosition < 0) {
            this.currentSentenceIndex = -1;
            return;
        }
        
        // Encontrar a sentença que contém a posição inicial
        const fullText = textElement.textContent;
        let accumulatedLength = 0;
        
        for (let i = 0; i < this.sentences.length; i++) {
            const sentenceIndex = fullText.indexOf(this.sentences[i], accumulatedLength);
            const sentenceEnd = sentenceIndex + this.sentences[i].length;
            
            if (startPosition >= sentenceIndex && startPosition <= sentenceEnd) {
                // Definir o índice para a sentença anterior, para que highlightNextSentence() destaque a correta
                this.currentSentenceIndex = i - 1;
                return;
            }
            
            accumulatedLength = sentenceEnd;
        }
        
        // Se não encontrar, começar do início
        this.currentSentenceIndex = -1;
    }

    /**
     * Limpa todos os destaques e reseta o estado
     */
    reset() {
        this.removeHighlight();
        this.currentTextElement = null;
        this.sentences = [];
        this.currentSentenceIndex = -1;
        this.highlightedElement = null;
    }
}

// Exportar a classe para uso global
window.TextHighlighter = TextHighlighter;