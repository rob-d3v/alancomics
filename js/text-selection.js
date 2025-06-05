/**
 * TextSelection - Responsável por permitir a seleção de texto para iniciar narração
 * 
 * Este módulo implementa a funcionalidade de selecionar um ponto específico no texto
 * para iniciar a narração a partir dali, melhorando a experiência do usuário.
 */
class TextSelection {
    constructor() {
        // Flag para controlar se o modo de seleção está ativo
        this.isSelectionModeActive = false;
        // Elemento de texto atual
        this.currentTextElement = null;
        // Callback a ser chamado quando um ponto for selecionado
        this.onSelectionCallback = null;
        // Elemento de instrução para o usuário
        this.instructionElement = null;
    }

    /**
     * Ativa o modo de seleção de texto
     * @param {HTMLElement} textElement - Elemento de texto onde a seleção será permitida
     * @param {Function} callback - Função a ser chamada quando um ponto for selecionado
     * @param {boolean} permanent - Se o modo de seleção deve ser permanente
     */
    enableSelectionMode(textElement, callback, permanent = false) {
        if (!textElement) return;
        
        // Armazenar referências
        this.currentTextElement = textElement;
        this.onSelectionCallback = callback;
        this.isPermanent = permanent;
        
        // Ativar modo de seleção
        this.isSelectionModeActive = true;
        
        // Adicionar classe visual para indicar que o modo de seleção está ativo
        textElement.classList.add('selection-mode-active');
        
        // Armazenar o handler de clique como propriedade da classe para poder removê-lo corretamente
        this.clickHandler = this.handleTextClick.bind(this);
        
        // Adicionar evento de clique
        textElement.addEventListener('click', this.clickHandler);
        
        // Mostrar instruções para o usuário
        this.showInstructions(textElement);
        
        // Alterar o cursor para indicar que o texto é clicável
        textElement.style.cursor = 'pointer';
        
        // console.log('Modo de seleção de texto ativado' + (permanent ? ' (modo permanente)' : ''));
    }

    /**
     * Desativa o modo de seleção de texto
     * @param {boolean} force - Força a desativação mesmo se for permanente
     */
    disableSelectionMode(force = false) {
        if (!this.currentTextElement) return;
        
        // Desativar modo de seleção
        this.isSelectionModeActive = false;
        
        // Remover classe visual
        this.currentTextElement.classList.remove('selection-mode-active');
        
        // Armazenar o handler de clique como propriedade da classe para poder removê-lo corretamente
        if (this.clickHandler) {
            this.currentTextElement.removeEventListener('click', this.clickHandler);
            this.clickHandler = null;
        }
        
        // Restaurar cursor
        this.currentTextElement.style.cursor = '';
        
        // Remover instruções
        this.hideInstructions();
        
        // console.log('Modo de seleção de texto desativado');
    }

    /**
     * Manipula o evento de clique no texto
     * @param {MouseEvent} event - Evento de clique
     */
    handleTextClick(event) {
        if (!this.isSelectionModeActive) return;
        
        // Obter a posição do clique no texto
        const clickPosition = this.getTextPositionFromPoint(event.clientX, event.clientY);
        
        // Se encontrou uma posição válida
        if (clickPosition !== -1) {
            // console.log(`Ponto de texto selecionado na posição: ${clickPosition}`);
            
            // Chamar o callback com a posição selecionada
            if (typeof this.onSelectionCallback === 'function') {
                this.onSelectionCallback(this.currentTextElement, clickPosition);
            }
            
            // Desativar o modo de seleção após a escolha, a menos que seja permanente
            if (!this.isPermanent) {
                this.disableSelectionMode();
            }
        }
    }

    /**
     * Obtém a posição no texto a partir das coordenadas da tela
     * @param {number} x - Coordenada X do clique
     * @param {number} y - Coordenada Y do clique
     * @returns {number} - Posição no texto ou -1 se não encontrada
     */
    getTextPositionFromPoint(x, y) {
        if (!this.currentTextElement) return -1;
        
        // Método 1: Usar API nativa de seleção de texto (mais preciso)
        try {
            let range;
            
            // Verificar qual método está disponível no navegador
            if (document.caretRangeFromPoint) {
                // Chrome, Safari, Edge moderno
                range = document.caretRangeFromPoint(x, y);
            } else if (document.caretPositionFromPoint) {
                // Firefox
                const position = document.caretPositionFromPoint(x, y);
                if (position) {
                    range = document.createRange();
                    range.setStart(position.offsetNode, position.offset);
                    range.setEnd(position.offsetNode, position.offset);
                }
            }
            
            if (range) {
                // Criar um range do início do elemento até o ponto clicado
                const fullRange = document.createRange();
                fullRange.setStart(this.currentTextElement, 0);
                fullRange.setEnd(range.startContainer, range.startOffset);
                
                // A posição é o comprimento do texto até o ponto clicado
                return fullRange.toString().length;
            }
        } catch (error) {
            console.warn('Erro ao usar método nativo de seleção:', error);
            // Continuar para o método alternativo
        }
        
        // Método 2: Usar elementos de texto (fallback mais robusto)
        try {
            // Obter o texto completo
            const textContent = this.currentTextElement.textContent;
            const textLength = textContent.length;
            
            // Obter as dimensões do elemento
            const rect = this.currentTextElement.getBoundingClientRect();
            
            // Verificar se o clique está dentro do elemento
            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                return -1; // Clique fora do elemento
            }
            
            // Calcular a posição relativa do clique
            const relativeX = (x - rect.left) / rect.width;
            const relativeY = (y - rect.top) / rect.height;
            
            // Criar um elemento temporário para calcular a posição do texto
            const tempElement = document.createElement('div');
            tempElement.style.position = 'absolute';
            tempElement.style.visibility = 'hidden';
            tempElement.style.width = `${rect.width}px`;
            tempElement.style.fontSize = window.getComputedStyle(this.currentTextElement).fontSize;
            tempElement.style.fontFamily = window.getComputedStyle(this.currentTextElement).fontFamily;
            tempElement.style.whiteSpace = 'pre-wrap';
            tempElement.style.wordBreak = 'break-word';
            document.body.appendChild(tempElement);
            
            // Dividir o texto em linhas aproximadas
            const lines = [];
            let currentLine = '';
            let currentPosition = 0;
            
            // Processar o texto caractere por caractere
            for (let i = 0; i < textContent.length; i++) {
                const char = textContent[i];
                currentLine += char;
                
                // Se encontrar uma quebra de linha ou o texto ficar muito longo
                if (char === '\n' || currentLine.length > 50) {
                    lines.push({
                        text: currentLine,
                        startPosition: currentPosition
                    });
                    currentPosition += currentLine.length;
                    currentLine = '';
                }
            }
            
            // Adicionar a última linha se houver texto restante
            if (currentLine.length > 0) {
                lines.push({
                    text: currentLine,
                    startPosition: currentPosition
                });
            }
            
            // Calcular a linha aproximada com base na posição Y relativa
            const lineIndex = Math.floor(relativeY * lines.length);
            const line = lines[Math.min(lineIndex, lines.length - 1)];
            
            // Calcular a posição aproximada na linha com base na posição X relativa
            const charIndex = Math.floor(relativeX * line.text.length);
            const position = line.startPosition + charIndex;
            
            // Limpar o elemento temporário
            document.body.removeChild(tempElement);
            
            return Math.max(0, Math.min(position, textLength));
        } catch (error) {
            console.warn('Erro ao usar método alternativo de seleção:', error);
            
            // Método 3: Fallback simples (menos preciso, mas funciona em qualquer caso)
            const textContent = this.currentTextElement.textContent;
            const textLength = textContent.length;
            const rect = this.currentTextElement.getBoundingClientRect();
            const relativeX = (x - rect.left) / rect.width;
            const estimatedPosition = Math.floor(relativeX * textLength);
            return Math.max(0, Math.min(estimatedPosition, textLength));
        }
    
    }

    /**
     * Mostra instruções para o usuário sobre como selecionar o texto
     * @param {HTMLElement} textElement - Elemento de texto
     */
    showInstructions(textElement) {
        // Criar elemento de instrução se não existir
        if (!this.instructionElement) {
            this.instructionElement = document.createElement('div');
            this.instructionElement.className = 'text-selection-instructions';
            this.instructionElement.textContent = 'Clique em qualquer parte do texto para iniciar a narração a partir desse ponto';
            
            // Estilizar o elemento
            this.instructionElement.style.backgroundColor = 'rgba(52, 152, 219, 0.8)';
            this.instructionElement.style.color = 'white';
            this.instructionElement.style.padding = '10px';
            this.instructionElement.style.borderRadius = '5px';
            this.instructionElement.style.marginBottom = '15px';
            this.instructionElement.style.textAlign = 'center';
            this.instructionElement.style.fontWeight = 'bold';
            this.instructionElement.style.position = 'sticky';
            this.instructionElement.style.top = '0';
            this.instructionElement.style.zIndex = '100';
        }
        
        // Inserir antes do elemento de texto
        if (textElement.parentNode) {
            textElement.parentNode.insertBefore(this.instructionElement, textElement);
        }
    }

    /**
     * Esconde as instruções de seleção
     */
    hideInstructions() {
        if (this.instructionElement && this.instructionElement.parentNode) {
            this.instructionElement.parentNode.removeChild(this.instructionElement);
        }
    
    }
}