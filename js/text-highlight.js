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
     * Rola a página para manter o elemento destacado visível e centralizado
     */
    scrollToHighlightedElement() {
        if (!this.highlightedElement) return;
        
        // Obter a posição do elemento destacado
        const rect = this.highlightedElement.getBoundingClientRect();
        
        // Verificar se o elemento está dentro de um contêiner com scroll próprio
        const scrollContainer = this.findScrollContainer(this.highlightedElement);
        
        if (scrollContainer) {
            // Caso 1: O elemento está dentro de um contêiner com scroll próprio
            console.log('Usando scroll do contêiner para centralizar texto');
            
            const containerRect = scrollContainer.getBoundingClientRect();
            
            // Calcular a posição relativa do elemento dentro do contêiner
            const relativeTop = rect.top - containerRect.top;
            const relativeBottom = rect.bottom - containerRect.top;
            
            // Verificar se o elemento está completamente visível dentro do contêiner
            const isFullyVisible = (
                relativeTop >= 0 &&
                relativeBottom <= containerRect.height
            );
            
            // Se não estiver completamente visível, centralizar no contêiner
            if (!isFullyVisible) {
                // Calcular a posição para centralizar o elemento no contêiner
                const targetScroll = scrollContainer.scrollTop + relativeTop - (containerRect.height / 2) + (rect.height / 2);
                
                // Rolar suavemente para a posição
                scrollContainer.scrollTo({
                    top: targetScroll,
                    behavior: 'smooth'
                });
            }
        } else {
            // Caso 2: Usar o scroll da página (fallback)
            console.log('Usando scroll da página para centralizar texto');
            
            // Verificar se o elemento está fora da área visível
            const isInViewport = (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
            
            // Sempre centralizar o elemento, mesmo que esteja parcialmente visível
            // Calcular posição para centralizar o elemento na tela
            const scrollTop = rect.top + window.pageYOffset - (window.innerHeight / 2) + (rect.height / 2);
            
            // Rolar suavemente para a posição
            window.scrollTo({
                top: scrollTop,
                behavior: 'smooth'
            });
        }
    }
    
    /**
     * Encontra o contêiner com scroll que contém o elemento
     * @param {HTMLElement} element - Elemento para encontrar o contêiner
     * @returns {HTMLElement|null} - Contêiner com scroll ou null se não encontrar
     */
    findScrollContainer(element) {
        if (!element) return null;
        
        // Verificar cada elemento pai até encontrar um com scroll
        let parent = element.parentElement;
        
        while (parent) {
            // Verificar se o elemento tem scroll
            const hasScroll = (
                parent.scrollHeight > parent.clientHeight &&
                (getComputedStyle(parent).overflowY === 'auto' ||
                 getComputedStyle(parent).overflowY === 'scroll')
            );
            
            if (hasScroll) {
                return parent;
            }
            
            parent = parent.parentElement;
        }
        
        return null; // Nenhum contêiner com scroll encontrado
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
        
        // Abordagem melhorada: usar a posição do caractere diretamente para encontrar a sentença
        const fullText = textElement.textContent;
        
        // Verificar se a posição está dentro dos limites do texto
        if (startPosition >= fullText.length) {
            console.warn('Posição inicial fora dos limites do texto, começando do início');
            this.currentSentenceIndex = -1;
            return;
        }
        
        // Encontrar a sentença que contém a posição inicial
        // Método direto: verificar cada sentença e suas posições no texto completo
        let currentPosition = 0;
        
        for (let i = 0; i < this.sentences.length; i++) {
            const sentence = this.sentences[i];
            const sentenceIndex = fullText.indexOf(sentence, currentPosition);
            
            if (sentenceIndex === -1) {
                // Se não encontrar a sentença a partir da posição atual, continuar procurando
                continue;
            }
            
            const sentenceEnd = sentenceIndex + sentence.length;
            currentPosition = sentenceEnd; // Atualizar a posição atual para a próxima busca
            
            // Verificar se a posição está dentro desta sentença
            if (startPosition >= sentenceIndex && startPosition < sentenceEnd) {
                console.log(`Iniciando narração a partir da sentença ${i}: "${sentence.substring(0, 30)}..."`);
                this.currentSentenceIndex = i - 1; // Definir para a sentença anterior
                return;
            }
        }
        
        // Se não encontrar uma correspondência exata, encontrar a sentença mais próxima
        let closestIndex = 0;
        let minDistance = Number.MAX_SAFE_INTEGER;
        currentPosition = 0;
        
        for (let i = 0; i < this.sentences.length; i++) {
            const sentence = this.sentences[i];
            const sentenceIndex = fullText.indexOf(sentence, currentPosition);
            
            if (sentenceIndex === -1) continue;
            
            const distance = Math.abs(sentenceIndex - startPosition);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = i;
            }
            
            currentPosition = sentenceIndex + sentence.length;
        }
        
        console.log(`Iniciando narração a partir da sentença mais próxima (${closestIndex}): "${this.sentences[closestIndex].substring(0, 30)}..."`);
        this.currentSentenceIndex = closestIndex - 1;
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