/**
 * NarrationEnhancer - Integra as funcionalidades de destaque de texto, rolagem automática e seleção de texto
 * 
 * Este módulo atua como um adaptador entre o sistema de narração existente e as novas funcionalidades,
 * permitindo destacar o texto sendo narrado, manter o texto visível com rolagem automática e
 * iniciar a narração a partir de um ponto selecionado pelo usuário.
 */
class NarrationEnhancer {
    constructor() {
        // Instanciar os componentes
        this.textHighlighter = new TextHighlighter();
        this.scrollManager = new ScrollManager(); // ScrollManager para controle de rolagem
        this.textSelection = new TextSelection();
        
        // Referência ao narrador principal
        this.narrator = null;
        
        // Estado da narração
        this.isEnhancedNarrationActive = false;
        
        // Elemento de texto atual
        this.currentTextElement = null;
        
        // Referência ao utterance atual
        this.currentUtterance = null;
        
        // Inicializar quando o DOM estiver pronto
        this.initialize();
    }
    
    /**
     * Inicializa o enhancer e conecta com o narrador existente
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
     * Configura o enhancer após o DOM estar carregado
     */
    setup() {
        // Obter referência ao narrador principal
        if (window.comicNarrator) {
            this.narrator = window.comicNarrator;
            // Conectado ao narrador principal
            
            // Estender o método speakText do narrador para incluir destaque
            this.extendNarratorMethods();
            
            // Adicionar botão para seleção de texto
            this.addTextSelectionButton();
        }
    }
    
    /**
     * Estende os métodos do narrador para incluir as novas funcionalidades
     */
    extendNarratorMethods() {
        if (!this.narrator) return;
        
        // Armazenar referência ao método original
        const originalSpeakText = this.narrator.speakText.bind(this.narrator);
        
        // Substituir o método speakText para incluir destaque de texto
        this.narrator.speakText = async (text) => {
            // Se não estamos em um arquivo de texto, usar o método original
            if (!this.isTextFile()) {
                return originalSpeakText(text);
            }
            
            // Encontrar o elemento de texto atual
            this.findCurrentTextElement();
            
            // Se não encontrou elemento de texto, usar o método original
            if (!this.currentTextElement) {
                return originalSpeakText(text);
            }
            
            // Ativar narração aprimorada
            this.activateEnhancedNarration();
            
            // Processar o texto em sentenças
            this.textHighlighter.setupTextElement(this.currentTextElement);
            
            // Narrar cada sentença com destaque
            return this.speakWithHighlight();
        };
        
        // Estender o método stopNarration
        const originalStopNarration = this.narrator.stopNarration.bind(this.narrator);
        this.narrator.stopNarration = () => {
            // Desativar narração aprimorada
            this.deactivateEnhancedNarration();
            
            // Chamar o método original
            originalStopNarration();
        };
    }
    
    /**
     * Verifica se o conteúdo atual é um arquivo de texto
     * @returns {boolean} - Verdadeiro se for um arquivo de texto
     */
    isTextFile() {
        const imagesContainer = document.getElementById('imagesContainer');
        if (!imagesContainer) return false;
        
        // Verificar se há um elemento txt-container
        return !!imagesContainer.querySelector('.txt-container');
    }
    
    /**
     * Encontra o elemento de texto atual
     */
    findCurrentTextElement() {
        const imagesContainer = document.getElementById('imagesContainer');
        if (!imagesContainer) return;
        
        // Encontrar o container de texto
        const txtContainer = imagesContainer.querySelector('.txt-container');
        if (!txtContainer) return;
        
        // Encontrar o elemento de conteúdo de texto
        this.currentTextElement = txtContainer.querySelector('.txt-content');
    }
    
    /**
     * Ativa a narração aprimorada com destaque e rolagem
     */
    activateEnhancedNarration() {
        if (this.isEnhancedNarrationActive) return;
        
        this.isEnhancedNarrationActive = true;
        
        // Iniciar rolagem automática
        this.scrollManager.activate(); // Ativar o ScrollManager para rolagem suave
    }
    
    /**
     * Desativa a narração aprimorada
     */
    deactivateEnhancedNarration() {
        if (!this.isEnhancedNarrationActive) return;
        
        this.isEnhancedNarrationActive = false;
        
        // Parar rolagem automática
        this.scrollManager.deactivate();
        
        // Remover destaques
        this.textHighlighter.reset();
        
        // Cancelar utterance atual se existir
        if (this.currentUtterance && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            this.currentUtterance = null;
        }
    }
    
    /**
     * Narra o texto com destaque visual
     * @returns {Promise} - Promessa que resolve quando a narração termina
     */
    async speakWithHighlight() {
        return new Promise(async (resolve) => {
            // Se a narração não está ativa, resolver imediatamente
            if (!this.isEnhancedNarrationActive || !this.narrator.isNarrating) {
                resolve();
                return;
            }
            
            // Destacar a próxima sentença
            const sentence = this.textHighlighter.highlightNextSentence();
            
            // Se não há mais sentenças, resolver
            if (!sentence) {
                resolve();
                return;
            }
            
            // Definir o elemento destacado para rolagem automática
            this.scrollManager.setCurrentElement(this.textHighlighter.highlightedElement);
            
            // Criar utterance para a sentença
            const utterance = new SpeechSynthesisUtterance(sentence);
            
            // Configurar a utterance com as propriedades do narrador
            if (this.narrator.currentVoice) {
                utterance.voice = this.narrator.currentVoice;
            }
            utterance.pitch = this.narrator.pitch;
            utterance.rate = this.narrator.rate;
            utterance.lang = this.narrator.currentVoice ? this.narrator.currentVoice.lang : 'pt-BR';
            
            // Armazenar referência à utterance atual
            this.currentUtterance = utterance;
            
            // Configurar eventos
            utterance.onend = async () => {
                // Se a narração ainda está ativa, continuar com a próxima sentença
                if (this.isEnhancedNarrationActive && this.narrator.isNarrating) {
                    await this.speakWithHighlight();
                }
                resolve();
            };
            
            utterance.onerror = (event) => {
                // Tratar erro silenciosamente
                resolve();
            };
            
            // Iniciar a narração
            window.speechSynthesis.speak(utterance);
        });
    }
    
    /**
     * Adiciona botão para seleção de texto no painel de controles de narração
     */
    addTextSelectionButton() {
        // Verificar se o painel de controles existe
        const narrationControls = document.getElementById('narrationControls');
        if (!narrationControls) return;
        
        // Criar o botão
        const selectTextBtn = document.createElement('button');
        selectTextBtn.id = 'selectTextNarration';
        selectTextBtn.className = 'select-text-narration';
        selectTextBtn.innerHTML = '<i class="fas fa-i-cursor"></i> Selecionar ponto de início';
        selectTextBtn.title = 'Clique para selecionar um ponto no texto para iniciar a narração';
        
        // Adicionar evento de clique
        selectTextBtn.addEventListener('click', () => this.toggleTextSelectionMode());
        
        // Adicionar ao painel de controles
        narrationControls.appendChild(selectTextBtn);
        
        // Armazenar referência ao botão
        this.selectTextBtn = selectTextBtn;
    }
    
    /**
     * Alterna o modo de seleção de texto
     */
    toggleTextSelectionMode() {
        // Se o narrador não está disponível, não fazer nada
        if (!this.narrator) return;
        
        // Se a narração está ativa, pará-la
        if (this.narrator.isNarrating) {
            this.narrator.stopNarration();
        }
        
        // Encontrar o elemento de texto atual
        this.findCurrentTextElement();
        
        // Se não encontrou elemento de texto, não fazer nada
        if (!this.currentTextElement) {
            alert('Nenhum texto disponível para seleção');
            return;
        }
        
        // Se o modo de seleção já está ativo, desativá-lo
        if (this.textSelection.isSelectionModeActive) {
            this.textSelection.disableSelectionMode();
            this.selectTextBtn.innerHTML = '<i class="fas fa-i-cursor"></i> Selecionar ponto de início';
            this.selectTextBtn.classList.remove('active');
        } else {
            // Ativar o modo de seleção
            this.textSelection.enableSelectionMode(this.currentTextElement, (element, position) => {
                // Callback quando um ponto for selecionado
                this.startNarrationFromPosition(element, position);
            });
            this.selectTextBtn.innerHTML = '<i class="fas fa-times"></i> Cancelar seleção';
            this.selectTextBtn.classList.add('active');
        }
    }
    
    /**
     * Inicia a narração a partir de uma posição específica no texto
     * @param {HTMLElement} element - Elemento de texto
     * @param {number} position - Posição no texto
     */
    startNarrationFromPosition(element, position) {
        // Se o narrador não está disponível, não fazer nada
        if (!this.narrator) return;
        
        // Configurar o elemento de texto atual
        this.currentTextElement = element;
        
        // Configurar o highlighter para começar da posição selecionada
        this.textHighlighter.startFromPosition(element, position);
        
        // Forçar a ativação do ScrollManager para garantir rolagem automática
        this.scrollManager.activate();
        window.scrollManagerActive = true;
        console.log('ScrollManager ativado para narração com seleção de texto');
        
        // Iniciar a narração
        this.narrator.startNarration();
    }
}

// Inicializar o enhancer quando o script for carregado
window.narrationEnhancer = new NarrationEnhancer();