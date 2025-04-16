/**
 * NarrationProgressBar - Implementa uma barra de progresso interativa para o narrador
 * 
 * Este módulo cria uma interface visual que mostra o progresso da narração,
 * permitindo ao usuário ver o que já foi narrado, o que falta narrar, e
 * oferecendo controles para avançar ou retroceder na narração.
 */
class NarrationProgressBar {
    constructor() {
        // Referência ao narrador principal
        this.narrator = null;
        
        // Elementos da interface
        this.progressBarContainer = null;
        this.progressBar = null;
        this.progressIndicator = null;
        this.controlsContainer = null;
        this.timeInfo = null;
        
        // Estado da narração
        this.totalItems = 0;          // Total de itens a serem narrados (páginas ou seleções)
        this.currentItemIndex = -1;    // Índice do item atual sendo narrado
        this.isVisible = false;        // Se a barra de progresso está visível
        this.currentText = '';         // Texto atual sendo narrado
        this.startTime = null;         // Tempo de início da narração
        this.elapsedTime = 0;          // Tempo decorrido em segundos
        this.estimatedTotalTime = 0;   // Tempo total estimado em segundos
        
        // Referência ao utterance atual
        this.currentUtterance = null;
        
        // Inicializar quando o DOM estiver pronto
        this.initialize();
    }
    
    /**
     * Inicializa o componente e conecta com o narrador existente
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
     * Configura o componente após o DOM estar carregado
     */
    setup() {
        // Obter referência ao narrador principal
        if (window.comicNarrator) {
            this.narrator = window.comicNarrator;
            console.log('NarrationProgressBar: Conectado ao narrador principal');
            
            // Estender os métodos do narrador para incluir a barra de progresso
            this.extendNarratorMethods();
            
            // Criar elementos da interface
            this.createProgressBarElements();
            
            // Adicionar estilos CSS
            this.addStyles();
        } else {
            console.warn('NarrationProgressBar: Narrador principal não encontrado');
            // Tentar novamente após um curto período
            setTimeout(() => {
                if (window.comicNarrator) {
                    this.narrator = window.comicNarrator;
                    console.log('NarrationProgressBar: Conectado ao narrador principal (tentativa 2)');
                    this.extendNarratorMethods();
                    this.createProgressBarElements();
                    this.addStyles();
                }
            }, 1000);
        }
    }
    
    /**
     * Estende os métodos do narrador para incluir a barra de progresso
     */
    extendNarratorMethods() {
        if (!this.narrator) return;
        
        // Estender o método startNarration
        const originalStartNarration = this.narrator.startNarration.bind(this.narrator);
        this.narrator.startNarration = async function() {
            // Chamar o método original
            const result = await originalStartNarration.apply(this, arguments);
            
            // Inicializar a barra de progresso
            if (window.narrationProgressBar) {
                window.narrationProgressBar.initializeProgress();
                window.narrationProgressBar.show();
            }
            
            return result;
        };
        
        // Estender o método stopNarration
        const originalStopNarration = this.narrator.stopNarration.bind(this.narrator);
        this.narrator.stopNarration = function() {
            // Chamar o método original
            originalStopNarration.apply(this, arguments);
            
            // Ocultar a barra de progresso
            if (window.narrationProgressBar) {
                window.narrationProgressBar.hide();
                window.narrationProgressBar.resetProgress();
            }
        };
        
        // Estender o método speakText
        const originalSpeakText = this.narrator.speakText.bind(this.narrator);
        this.narrator.speakText = async function(text) {
            // Atualizar o texto atual na barra de progresso
            if (window.narrationProgressBar) {
                window.narrationProgressBar.setCurrentText(text);
            }
            
            // Chamar o método original
            return await originalSpeakText.apply(this, arguments);
        };
        
        // Estender o método readNextPage
        const originalReadNextPage = this.narrator.readNextPage.bind(this.narrator);
        this.narrator.readNextPage = async function() {
            // Atualizar o índice atual na barra de progresso
            if (window.narrationProgressBar && this.currentPage !== undefined) {
                window.narrationProgressBar.setCurrentItemIndex(this.currentPage);
            }
            
            // Chamar o método original
            return await originalReadNextPage.apply(this, arguments);
        };
    }
    
    /**
     * Cria os elementos da barra de progresso
     */
    createProgressBarElements() {
        // Verificar se os elementos já existem
        if (document.querySelector('.narration-progress-container')) {
            this.progressBarContainer = document.querySelector('.narration-progress-container');
            return;
        }
        
        // Container principal
        this.progressBarContainer = document.createElement('div');
        this.progressBarContainer.className = 'narration-progress-container';
        
        // Barra de progresso
        const progressBarWrapper = document.createElement('div');
        progressBarWrapper.className = 'narration-progress-bar-wrapper';
        
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'narration-progress-bar';
        
        this.progressIndicator = document.createElement('div');
        this.progressIndicator.className = 'narration-progress-indicator';
        
        this.progressBar.appendChild(this.progressIndicator);
        progressBarWrapper.appendChild(this.progressBar);
        
        // Container de controles
        this.controlsContainer = document.createElement('div');
        this.controlsContainer.className = 'narration-controls-container';
        
        // Botão de retroceder
        const prevButton = document.createElement('button');
        prevButton.className = 'narration-control-button prev-button';
        prevButton.innerHTML = '<i class="fas fa-step-backward"></i>';
        prevButton.title = 'Voltar para o item anterior';
        prevButton.addEventListener('click', () => this.goToPreviousItem());
        
        // Botão de play/pause
        const playPauseButton = document.createElement('button');
        playPauseButton.className = 'narration-control-button narration-play-pause';
        playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
        playPauseButton.title = 'Pausar/Continuar narração';
        playPauseButton.addEventListener('click', () => this.togglePlayPause());
        
        // Botão de avançar
        const nextButton = document.createElement('button');
        nextButton.className = 'narration-control-button next-button';
        nextButton.innerHTML = '<i class="fas fa-step-forward"></i>';
        nextButton.title = 'Avançar para o próximo item';
        nextButton.addEventListener('click', () => this.goToNextItem());
        
        // Informações de tempo
        this.timeInfo = document.createElement('div');
        this.timeInfo.className = 'narration-time-info';
        this.timeInfo.textContent = '00:00 / 00:00';
        
        // Adicionar elementos ao container de controles
        this.controlsContainer.appendChild(prevButton);
        this.controlsContainer.appendChild(playPauseButton);
        this.controlsContainer.appendChild(nextButton);
        this.controlsContainer.appendChild(this.timeInfo);
        
        // Adicionar elementos ao container principal
        this.progressBarContainer.appendChild(progressBarWrapper);
        this.progressBarContainer.appendChild(this.controlsContainer);
        
        // Adicionar eventos à barra de progresso
        this.progressBar.addEventListener('click', (e) => this.handleProgressBarClick(e));
        
        // Adicionar ao corpo do documento
        document.body.appendChild(this.progressBarContainer);
        
        // Inicialmente oculto
        this.progressBarContainer.style.display = 'none';
    }
    
    /**
     * Adiciona os estilos CSS necessários
     */
    addStyles() {
        // Verificar se os estilos já existem
        if (document.querySelector('style#narration-progress-bar-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'narration-progress-bar-styles';
        style.textContent = `
            .narration-progress-container {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                width: 80%;
                max-width: 800px;
                background-color: rgba(44, 62, 80, 0.9);
                border-radius: 10px;
                padding: 15px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                z-index: 1000;
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .narration-progress-bar-wrapper {
                width: 100%;
                height: 10px;
                background-color: rgba(255, 255, 255, 0.2);
                border-radius: 5px;
                overflow: hidden;
                cursor: pointer;
                position: relative;
            }
            
            .narration-progress-bar {
                width: 100%;
                height: 100%;
                position: relative;
            }
            
            .narration-progress-indicator {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                width: 0%;
                background-color: var(--accent-color, #3498db);
                border-radius: 5px;
                transition: width 0.3s ease;
            }
            
            .narration-controls-container {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 15px;
            }
            
            .narration-control-button {
                background-color: rgba(52, 152, 219, 0.8);
                color: white;
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 16px;
            }
            
            .narration-control-button:hover {
                background-color: rgba(52, 152, 219, 1);
                transform: scale(1.1);
            }
            
            .narration-play-pause {
                width: 50px;
                height: 50px;
                font-size: 18px;
            }
            
            .narration-play-pause.paused i::before {
                content: "\f04b"; /* Ícone de play */
            }
            
            .narration-time-info {
                color: white;
                font-size: 14px;
                margin-left: 10px;
                min-width: 100px;
                text-align: right;
            }
            
            /* Responsividade para dispositivos móveis */
            @media (max-width: 768px) {
                .narration-progress-container {
                    width: 95%;
                    padding: 10px;
                    bottom: 10px;
                }
                
                .narration-control-button {
                    width: 36px;
                    height: 36px;
                    font-size: 14px;
                }
                
                .narration-play-pause {
                    width: 44px;
                    height: 44px;
                }
                
                .narration-time-info {
                    font-size: 12px;
                    min-width: 80px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Inicializa o progresso da narração
     */
    initializeProgress() {
        // Resetar o estado
        this.resetProgress();
        
        // Determinar o total de itens com base no tipo de narração
        if (this.narrator.pages && this.narrator.pages.length > 0) {
            // Narração de páginas
            this.totalItems = this.narrator.pages.length;
            this.currentItemIndex = this.narrator.currentPage || 0;
        } else if (window.rectangularSelectionManager && 
                  window.rectangularSelectionManager.selections && 
                  window.rectangularSelectionManager.selections.length > 0) {
            // Narração de seleções retangulares
            this.totalItems = window.rectangularSelectionManager.selections.length;
            this.currentItemIndex = window.rectangularSelectionManager.currentNarrationIndex || 0;
        } else {
            // Fallback para um único item
            this.totalItems = 1;
            this.currentItemIndex = 0;
        }
        
        // Iniciar o tempo
        this.startTime = new Date();
        this.updateTimeInfo();
        
        // Iniciar o timer para atualizar o tempo
        this.startTimeUpdateTimer();
        
        // Atualizar a interface
        this.updateProgressBar();
    }
    
    /**
     * Reseta o progresso da narração
     */
    resetProgress() {
        this.totalItems = 0;
        this.currentItemIndex = -1;
        this.currentText = '';
        this.startTime = null;
        this.elapsedTime = 0;
        this.estimatedTotalTime = 0;
        
        // Resetar a interface
        if (this.progressIndicator) {
            this.progressIndicator.style.width = '0%';
        }
        
        if (this.timeInfo) {
            this.timeInfo.textContent = '00:00 / 00:00';
        }
        
        // Parar o timer
        this.stopTimeUpdateTimer();
    }
    
    /**
     * Atualiza a barra de progresso
     */
    updateProgressBar() {
        if (!this.progressIndicator || this.totalItems <= 0) return;
        
        // Garantir que o índice atual seja válido
        if (this.currentItemIndex < 0) {
            this.currentItemIndex = 0;
        } else if (this.currentItemIndex >= this.totalItems) {
            this.currentItemIndex = this.totalItems - 1;
        }
        
        // Calcular a porcentagem de progresso
        const progress = ((this.currentItemIndex + 1) / this.totalItems) * 100;
        
        // Garantir que o progresso não ultrapasse 100%
        const clampedProgress = Math.min(progress, 100);
        
        // Atualizar a largura do indicador
        this.progressIndicator.style.width = `${clampedProgress}%`;
        
        // Atualizar as informações de tempo
        this.updateTimeInfo();
        
        // Log para debug
        console.log(`Progresso da narração: ${this.currentItemIndex + 1}/${this.totalItems} (${clampedProgress.toFixed(1)}%)`);
    }
    
    /**
     * Inicia o timer para atualizar as informações de tempo
     */
    startTimeUpdateTimer() {
        // Parar o timer existente, se houver
        this.stopTimeUpdateTimer();
        
        // Iniciar um novo timer
        this.timeUpdateTimer = setInterval(() => {
            this.updateTimeInfo();
        }, 1000);
    }
    
    /**
     * Para o timer de atualização de tempo
     */
    stopTimeUpdateTimer() {
        if (this.timeUpdateTimer) {
            clearInterval(this.timeUpdateTimer);
            this.timeUpdateTimer = null;
        }
    }
    
    /**
     * Atualiza as informações de tempo
     */
    updateTimeInfo() {
        if (!this.timeInfo || !this.startTime) return;
        
        // Calcular o tempo decorrido
        const now = new Date();
        this.elapsedTime = Math.floor((now - this.startTime) / 1000);
        
        // Estimar o tempo total com base no progresso atual
        if (this.currentItemIndex >= 0 && this.totalItems > 0) {
            const progress = (this.currentItemIndex + 1) / this.totalItems;
            if (progress > 0) {
                this.estimatedTotalTime = Math.floor(this.elapsedTime / progress);
            }
        }
        
        // Formatar os tempos
        const elapsedFormatted = this.formatTime(this.elapsedTime);
        const totalFormatted = this.formatTime(this.estimatedTotalTime);
        
        // Garantir que o índice atual seja válido para exibição
        let currentItem = this.currentItemIndex + 1; // Converter para 1-based para exibição
        if (currentItem < 1) currentItem = 1;
        if (currentItem > this.totalItems) currentItem = this.totalItems;
        
        // Atualizar o texto com formato "x/y - tempo"
        this.timeInfo.textContent = `${currentItem}/${this.totalItems} - ${elapsedFormatted}/${totalFormatted}`;
    }
    
    /**
     * Formata o tempo em segundos para o formato MM:SS
     * @param {number} seconds - Tempo em segundos
     * @returns {string} - Tempo formatado
     */
    formatTime(seconds) {
        if (!seconds || isNaN(seconds) || seconds <= 0) {
            return '00:00';
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * Define o índice do item atual
     * @param {number} index - Índice do item
     */
    setCurrentItemIndex(index) {
        // Garantir que o índice esteja dentro dos limites válidos
        if (index < 0) {
            index = 0;
        } else if (index >= this.totalItems && this.totalItems > 0) {
            index = this.totalItems - 1;
        }
        
        this.currentItemIndex = index;
        this.updateProgressBar();
        
        // Log para debug
        console.log(`Índice atual atualizado: ${this.currentItemIndex + 1}/${this.totalItems}`);
    }
    
    /**
     * Define o texto atual sendo narrado
     * @param {string} text - Texto atual
     */
    setCurrentText(text) {
        this.currentText = text;
    }
    
    /**
     * Mostra a barra de progresso
     */
    show() {
        if (!this.progressBarContainer) return;
        
        this.progressBarContainer.style.display = 'flex';
        this.isVisible = true;
    }
    
    /**
     * Oculta a barra de progresso
     */
    hide() {
        if (!this.progressBarContainer) return;
        
        this.progressBarContainer.style.display = 'none';
        this.isVisible = false;
        
        // Parar o timer
        this.stopTimeUpdateTimer();
    }
    
    /**
     * Alterna entre pausar e continuar a narração
     */
    togglePlayPause() {
        if (!this.narrator) return;
        
        const playPauseButton = document.querySelector('.narration-play-pause');
        
        if (this.narrator.synth.paused) {
            // Continuar a narração
            this.narrator.synth.resume();
            if (playPauseButton) {
                playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
                playPauseButton.classList.remove('paused');
            }
        } else if (this.narrator.synth.speaking) {
            // Pausar a narração
            this.narrator.synth.pause();
            if (playPauseButton) {
                playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
                playPauseButton.classList.add('paused');
            }
        }
    }
    
    /**
     * Vai para o item anterior
     */
    goToPreviousItem() {
        if (!this.narrator || this.currentItemIndex <= 0) return;
        
        // Parar a narração atual
        this.narrator.synth.cancel();
        
        // Atualizar o índice
        this.currentItemIndex--;
        
        // Atualizar a interface
        this.updateProgressBar();
        
        // Verificar o tipo de narração
        if (this.narrator.pages && this.narrator.pages.length > 0) {
            // Narração de páginas
            this.narrator.currentPage = this.currentItemIndex;
            this.narrator.readNextPage();
        } else if (window.rectangularSelectionManager && 
                  window.rectangularSelectionManager.selections && 
                  window.rectangularSelectionManager.selections.length > 0) {
            // Narração de seleções retangulares
            window.rectangularSelectionManager.currentNarrationIndex = this.currentItemIndex - 1; // -1 porque o método incrementa antes de narrar
            
            // Obter o texto da seleção anterior
            const selections = window.rectangularSelectionManager.selections;
            if (selections[this.currentItemIndex]) {
                const imageId = selections[this.currentItemIndex].imageId;
                const extractedTexts = window.rectangularSelectionManager.extractedTexts.get(imageId);
                
                if (extractedTexts && extractedTexts[this.currentItemIndex]) {
                    // Destacar a seleção
                    window.rectangularSelectionManager.highlightSelection(this.currentItemIndex);
                    
                    // Narrar o texto
                    window.rectangularSelectionManager.startNarrationWithText(extractedTexts[this.currentItemIndex]);
                }
            }
        }
    }
    
    /**
     * Vai para o próximo item
     */
    goToNextItem() {
        if (!this.narrator || this.currentItemIndex >= this.totalItems - 1) return;
        
        // Parar a narração atual
        this.narrator.synth.cancel();
        
        // Atualizar o índice
        this.currentItemIndex++;
        
        // Atualizar a interface
        this.updateProgressBar();
        
        // Verificar o tipo de narração
        if (this.narrator.pages && this.narrator.pages.length > 0) {
            // Narração de páginas
            this.narrator.currentPage = this.currentItemIndex;
            this.narrator.readNextPage();
        } else if (window.rectangularSelectionManager && 
                  window.rectangularSelectionManager.selections && 
                  window.rectangularSelectionManager.selections.length > 0) {
            // Narração de seleções retangulares
            window.rectangularSelectionManager.currentNarrationIndex = this.currentItemIndex - 1; // -1 porque o método incrementa antes de narrar
            
            // Obter o texto da próxima seleção
            const selections = window.rectangularSelectionManager.selections;
            if (selections[this.currentItemIndex]) {
                const imageId = selections[this.currentItemIndex].imageId;
                const extractedTexts = window.rectangularSelectionManager.extractedTexts.get(imageId);
                
                if (extractedTexts && extractedTexts[this.currentItemIndex]) {
                    // Destacar a seleção
                    window.rectangularSelectionManager.highlightSelection(this.currentItemIndex);
                    
                    // Narrar o texto
                    window.rectangularSelectionManager.startNarrationWithText(extractedTexts[this.currentItemIndex]);
                }
            }
        }
    }
    
    /**
     * Manipula o clique na barra de progresso
     * @param {Event} e - Evento de clique
     */
    handleProgressBarClick(e) {
        if (!this.narrator || this.totalItems <= 0) return;
        
        // Calcular a posição relativa do clique
        const rect = this.progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        
        // Calcular o novo índice
        const newIndex = Math.floor(percentage * this.totalItems);
        
        // Verificar se o índice é válido
        if (newIndex < 0 || newIndex >= this.totalItems || newIndex === this.currentItemIndex) return;
        
        // Parar a narração atual
        this.narrator.synth.cancel();
        
        // Atualizar o índice
        this.currentItemIndex = newIndex;
        
        // Atualizar a interface
        this.updateProgressBar();
        
        // Verificar o tipo de narração e iniciar a narração do novo item
        if (this.narrator.pages && this.narrator.pages.length > 0) {
            // Narração de páginas
            this.narrator.currentPage = this.currentItemIndex;
            this.narrator.readNextPage();
        } else if (window.rectangularSelectionManager && 
                  window.rectangularSelectionManager.selections && 
                  window.rectangularSelectionManager.selections.length > 0) {
            // Narração de seleções retangulares
            window.rectangularSelectionManager.currentNarrationIndex = this.currentItemIndex - 1; // -1 porque o método incrementa antes de narrar
            
            // Obter o texto da seleção
            const selections = window.rectangularSelectionManager.selections;
            if (selections[this.currentItemIndex]) {
                const imageId = selections[this.currentItemIndex].imageId;
                const extractedTexts = window.rectangularSelectionManager.extractedTexts.get(imageId);
                
                if (extractedTexts && extractedTexts[this.currentItemIndex]) {
                    // Destacar a seleção
                    window.rectangularSelectionManager.highlightSelection(this.currentItemIndex);
                    
                    // Narrar o texto
                    window.rectangularSelectionManager.startNarrationWithText(extractedTexts[this.currentItemIndex]);
                }
            }
        }
    }
}

// Criar instância global
window.narrationProgressBar = new NarrationProgressBar();