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
     */
    enableSelectionMode(textElement, callback) {
        if (!textElement) return;
        
        // Armazenar referências
        this.currentTextElement = textElement;
        this.onSelectionCallback = callback;
        
        // Ativar modo de seleção
        this.isSelectionModeActive = true;
        
        // Adicionar classe visual para indicar que o modo de seleção está ativo
        textElement.classList.add('selection-mode-active');
        
        // Adicionar evento de clique
        textElement.addEventListener('click', this.handleTextClick.bind(this));
        
        // Mostrar instruções para o usuário
        this.showInstructions(textElement);
        
        // Alterar o cursor para indicar que o texto é clicável
        textElement.style.cursor = 'pointer';
        
        console.log('Modo de seleção de texto ativado');
    }

    /**
     * Desativa o modo de seleção de texto
     */
    disableSelectionMode() {
        if (!this.currentTextElement) return;
        
        // Desativar modo de seleção
        this.isSelectionModeActive = false;
        
        // Remover classe visual
        this.currentTextElement.classList.remove('selection-mode-active');
        
        // Remover evento de clique
        this.currentTextElement.removeEventListener('click', this.handleTextClick.bind(this));
        
        // Restaurar cursor
        this.currentTextElement.style.cursor = '';
        
        // Remover instruções
        this.hideInstructions();
        
        console.log('Modo de seleção de texto desativado');
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
            console.log(`Ponto de texto selecionado na posição: ${clickPosition}`);
            
            // Chamar o callback com a posição selecionada
            if (typeof this.onSelectionCallback === 'function') {
                this.onSelectionCallback(this.currentTextElement, clickPosition);
            }
            
            // Desativar o modo de seleção após a escolha
            this.disableSelectionMode();
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
        
        // Usar a API de range para encontrar a posição do texto
        const range = document.caretRangeFromPoint(x, y);
        if (!range) return -1;
        
        // Criar um range do início do elemento até o ponto clicado
        const fullRange = document.createRange();
        fullRange.setStart(this.currentTextElement, 0);
        fullRange.setEnd(range.startContainer, range.startOffset);
        
        // A posição é o comprimento do texto até o ponto clicado
        return fullRange.toString().length;
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

// Exportar a classe para uso global
window.TextSelection = TextSelection;