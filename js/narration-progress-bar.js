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

        // Referência ao ScrollManager
        this.scrollManager = window.scrollManager || new ScrollManager();

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
        this.narrationCompleted = false; // Indica se a narração foi completada
        this.finalTimeLocked = false;  // Indica se o tempo final já foi fixado

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
        this.narrator.startNarration = async function () {
            // Chamar o método original
            const result = await originalStartNarration.apply(this, arguments);

            // Inicializar a barra de progresso e ativar o ScrollManager
            if (window.narrationProgressBar) {
                window.narrationProgressBar.initializeProgress();
                window.narrationProgressBar.show();
                
                // Ativar o ScrollManager com configurações otimizadas
                if (window.narrationProgressBar.scrollManager) {
                    window.narrationProgressBar.scrollManager.settings.behavior = 'smooth';
                    window.narrationProgressBar.scrollManager.settings.verticalAlignment = 0.35;
                    window.narrationProgressBar.scrollManager.settings.margin = 120;
                    window.narrationProgressBar.scrollManager.settings.scrollDelay = 50;
                    window.narrationProgressBar.scrollManager.activate();
                    
                    // Definir a variável global para garantir que outros componentes saibam que o scroll está ativo
                    window.scrollManagerActive = true;
                    console.log('ScrollManager global ativado pela barra de progresso');
                }
            }
            
            return result;
        };

        // Estender o método stopNarration
        const originalStopNarration = this.narrator.stopNarration.bind(this.narrator);
        this.narrator.stopNarration = function () {
            // Chamar o método original
            originalStopNarration.apply(this, arguments);

            // Ocultar a barra de progresso e parar o timer
            if (window.narrationProgressBar) {
                window.narrationProgressBar.stopTimeUpdateTimer();
                window.narrationProgressBar.hide();
                window.narrationProgressBar.resetProgress();
            }
        };

        // Estender o método speakText
        const originalSpeakText = this.narrator.speakText.bind(this.narrator);
        this.narrator.speakText = async function (text) {
            // Atualizar o texto atual na barra de progresso
            if (window.narrationProgressBar) {
                window.narrationProgressBar.setCurrentText(text);
            }

            // Pausar a rolagem antes de iniciar a narração
            if (window.narrationProgressBar && window.narrationProgressBar.scrollManager) {
                window.narrationProgressBar.scrollManager.pauseScrolling();
            }

            // Chamar o método original
            const result = await originalSpeakText.apply(this, arguments);

            // Retomar a rolagem após a narração
            if (window.narrationProgressBar && window.narrationProgressBar.scrollManager) {
                window.narrationProgressBar.scrollManager.resumeScrolling();
            }

            return result;
        };

        // Estender o método readNextPage
        const originalReadNextPage = this.narrator.readNextPage.bind(this.narrator);
        this.narrator.readNextPage = async function () {
            // Atualizar o índice atual na barra de progresso
            if (window.narrationProgressBar && this.currentPage !== undefined) {
                window.narrationProgressBar.setCurrentItemIndex(this.currentPage);
                
                // Verificar se é a última página
                if (this.currentPage >= this.pages.length - 1) {
                    console.log('Última página alcançada');
                    // Fixar o tempo total quando chegar na última página
                    if (window.narrationProgressBar.estimatedTotalTime === 0) {
                        window.narrationProgressBar.estimatedTotalTime = window.narrationProgressBar.elapsedTime;
                    }
                }
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
        
        // Container de cabeçalho para botões de controle de tamanho
        const headerContainer = document.createElement('div');
        headerContainer.className = 'narration-header-container';
        
        // Botões de controle de tamanho
        const sizeControlsContainer = document.createElement('div');
        sizeControlsContainer.className = 'narration-size-controls';
        
        // Botão para diminuir tamanho
        const decreaseSizeButton = document.createElement('button');
        decreaseSizeButton.className = 'narration-size-button';
        decreaseSizeButton.innerHTML = '<i class="fas fa-search-minus"></i>';
        decreaseSizeButton.title = 'Diminuir tamanho';
        decreaseSizeButton.addEventListener('click', () => this.decreaseSize());
        
        // Botão para aumentar tamanho
        const increaseSizeButton = document.createElement('button');
        increaseSizeButton.className = 'narration-size-button';
        increaseSizeButton.innerHTML = '<i class="fas fa-search-plus"></i>';
        increaseSizeButton.title = 'Aumentar tamanho';
        increaseSizeButton.addEventListener('click', () => this.increaseSize());
        
        // Botão para minimizar/maximizar
        const minimizeButton = document.createElement('button');
        minimizeButton.className = 'narration-size-button narration-minimize-button';
        minimizeButton.innerHTML = '<i class="fas fa-window-minimize"></i>';
        minimizeButton.title = 'Minimizar/Maximizar';
        minimizeButton.addEventListener('click', () => this.toggleMinimize());
        
        // Adicionar botões ao container de controles de tamanho
        sizeControlsContainer.appendChild(decreaseSizeButton);
        sizeControlsContainer.appendChild(increaseSizeButton);
        sizeControlsContainer.appendChild(minimizeButton);
        
        // Adicionar controles de tamanho ao cabeçalho
        headerContainer.appendChild(sizeControlsContainer);
        
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
        this.progressBarContainer.appendChild(headerContainer);
        this.progressBarContainer.appendChild(progressBarWrapper);
        this.progressBarContainer.appendChild(this.controlsContainer);

        // Adicionar eventos à barra de progresso
        this.progressBar.addEventListener('click', (e) => this.handleProgressBarClick(e));

        // Adicionar ao corpo do documento
        document.body.appendChild(this.progressBarContainer);

        // Inicialmente oculto
        this.progressBarContainer.style.display = 'none';
        
        // Estado inicial de tamanho
        this.currentSizeIndex = 2; // Tamanho médio (padrão)
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
                background-color: rgba(52, 152, 219, 0.95);
                border-radius: 12px;
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
                padding: 15px;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                transition: all 0.3s ease;
                backdrop-filter: blur(5px);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .narration-header-container {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 5px;
            }
            
            .narration-size-controls {
                display: flex;
                gap: 5px;
            }
            
            .narration-size-button {
                background-color: rgba(255, 255, 255, 0.7);
                color: #2980b9;
                border: none;
                border-radius: 4px;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s ease;
            }
            
            .narration-size-button:hover {
                background-color: white;
                transform: scale(1.1);
            }
            
            .narration-progress-container.minimized {
                padding: 8px;
                max-height: 40px;
                overflow: hidden;
            }
            
            .narration-progress-container.minimized .narration-controls-container,
            .narration-progress-container.minimized .narration-progress-bar-wrapper,
            .narration-progress-container.minimized .narration-current-text {
                display: none;
            }
            
            .narration-progress-container.size-small {
                width: 60%;
                max-width: 600px;
                padding: 10px;
            }
            
            .narration-progress-container.size-large {
                width: 90%;
                max-width: 1000px;
                padding: 18px;
            }
            
            .narration-progress-bar-wrapper {
                width: 100%;
                height: 12px;
                background-color: rgba(255, 255, 255, 0.3);
                border-radius: 6px;
                overflow: hidden;
                position: relative;
                cursor: pointer;
                box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
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
                background: linear-gradient(90deg, #2980b9, #3498db);
                border-radius: 6px;
                transition: width 0.3s ease;
                box-shadow: 0 0 8px rgba(52, 152, 219, 0.6);
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% { box-shadow: 0 0 8px rgba(52, 152, 219, 0.6); }
                50% { box-shadow: 0 0 12px rgba(52, 152, 219, 0.8); }
                100% { box-shadow: 0 0 8px rgba(52, 152, 219, 0.6); }
            }
            
            .narration-controls-container {
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
                padding: 0 5px;
            }
            
            .narration-control-button {
                background-color: rgba(255, 255, 255, 0.9);
                color: #2980b9;
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            }
            
            .narration-control-button:hover {
                background-color: white;
                transform: scale(1.08);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            }
            
            .narration-control-button:active {
                transform: scale(0.95);
            }
            
            .narration-play-pause {
                width: 52px;
                height: 52px;
                font-size: 1.2em;
                background-color: white;
                color: #2980b9;
            }
            
            .narration-play-pause.paused i::before {
                content: "\f04b"; /* Ícone de play */
            }
            
            .narration-time-info {
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 14px;
                font-weight: 500;
                color: white;
                min-width: 100px;
                text-align: right;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            .narration-current-text {
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 15px;
                color: white;
                margin-top: 5px;
                text-align: center;
                max-height: 60px;
                overflow-y: auto;
                padding: 8px 12px;
                background-color: rgba(255, 255, 255, 0.15);
                border-radius: 8px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                border: 1px solid rgba(255, 255, 255, 0.1);
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            /* Estilo para destacar o elemento sendo narrado */
            .narration-highlighted-element {
                background-color: rgba(52, 152, 219, 0.3);
                border-radius: 4px;
                box-shadow: 0 0 12px rgba(52, 152, 219, 0.6);
                transition: all 0.3s ease;
                animation: highlight-pulse 2s infinite alternate;
            }
            
            @keyframes highlight-pulse {
                0% { background-color: rgba(52, 152, 219, 0.2); box-shadow: 0 0 8px rgba(52, 152, 219, 0.4); }
                100% { background-color: rgba(52, 152, 219, 0.4); box-shadow: 0 0 16px rgba(52, 152, 219, 0.7); }
            }
            
            /* Responsividade para dispositivos móveis */
            @media (max-width: 768px) {
                .narration-progress-container {
                    width: 95%;
                    padding: 12px;
                }
                
                .narration-control-button {
                    width: 36px;
                    height: 36px;
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
        this.narrationCompleted = false;
        this.finalTimeLocked = false;

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
            
            // Verificar se a narração está completa para parar o timer
            if (this.narrationCompleted || 
                (this.currentItemIndex >= this.totalItems - 1 && this.narrator && !this.narrator.isNarrating)) {
                console.log('Narração completa, parando o timer de atualização');
                this.fixFinalTime();
                this.stopTimeUpdateTimer();
            }
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
     * Fixa o tempo final da narração para evitar que continue incrementando
     */
    fixFinalTime() {
        if (this.finalTimeLocked) return;
        
        console.log('Fixando tempo final da narração');
        
        // Se o tempo estimado for menor que o tempo decorrido, usar o tempo decorrido
        if (this.estimatedTotalTime < this.elapsedTime) {
            this.estimatedTotalTime = this.elapsedTime;
        }
        
        // Marcar o tempo como fixado para evitar atualizações futuras
        this.finalTimeLocked = true;
        
        // Atualizar a interface uma última vez
        if (this.timeInfo) {
            const elapsedFormatted = this.formatTime(this.elapsedTime);
            const totalFormatted = this.formatTime(this.estimatedTotalTime);
            this.timeInfo.textContent = `${this.totalItems}/${this.totalItems} - ${elapsedFormatted}/${totalFormatted}`;
        }
    }

    /**
     * Atualiza as informações de tempo
     */
    updateTimeInfo() {
        if (!this.timeInfo || !this.startTime) return;

        // Verificar se a narração está completa (chegou ao último item)
        const isNarrationComplete = this.narrationCompleted || 
                                   (this.currentItemIndex >= this.totalItems - 1 && 
                                    this.narrator && !this.narrator.isNarrating);

        // Se a narração estiver completa, marcar como completada e fixar o tempo final
        if (isNarrationComplete && !this.narrationCompleted) {
            this.narrationCompleted = true;
            this.fixFinalTime();
            return; // Importante: sair da função após fixar o tempo final
        }

        // Calcular o tempo decorrido apenas se o tempo final não estiver fixado
        if (!this.finalTimeLocked) {
            const now = new Date();
            this.elapsedTime = Math.floor((now - this.startTime) / 1000);
            
            // Estimar o tempo total com base no progresso atual e tempo médio por item
            if (this.currentItemIndex >= 0 && this.totalItems > 0) {
                const itemsCompleted = this.currentItemIndex + 1;
                const averageTimePerItem = this.elapsedTime / itemsCompleted;
                const estimatedTotalTime = Math.ceil(averageTimePerItem * this.totalItems);
                
                // Atualizar a estimativa apenas se for maior que o tempo decorrido
                if (estimatedTotalTime > this.elapsedTime) {
                    // Usar uma média ponderada para suavizar as mudanças na estimativa
                    if (this.estimatedTotalTime === 0) {
                        this.estimatedTotalTime = estimatedTotalTime;
                    } else {
                        // Dar mais peso à estimativa atual para evitar flutuações bruscas
                        this.estimatedTotalTime = Math.round(
                            this.estimatedTotalTime * 0.8 + estimatedTotalTime * 0.2
                        );
                    }
                }
            }
        }
        
        // Garantir que o tempo decorrido nunca ultrapasse o tempo estimado total
        // Isso evita que a barra de progresso mostre valores como "30/10"
        if (this.estimatedTotalTime > 0 && this.elapsedTime > this.estimatedTotalTime) {
            this.elapsedTime = this.estimatedTotalTime;
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
        
        // Verificar se chegamos ao último item
        if (index >= this.totalItems - 1) {
            console.log('Último item alcançado, verificando se narração terminou');
            // Se estamos no último item, verificar se a narração terminou
            if (this.narrator && !this.narrator.isNarrating) {
                this.narrationCompleted = true;
                this.fixFinalTime();
            }
        }

        // Log para debug
        console.log(`Índice atual atualizado: ${this.currentItemIndex + 1}/${this.totalItems}`);
    }

    /**
     * Define o texto atual sendo narrado
     * @param {string} text - Texto atual
     */
    setCurrentText(text) {
        if (!text) return;

        this.currentText = text;

        // Atualizar o elemento de texto atual se existir
        const currentTextElement = this.progressBarContainer.querySelector('.narration-current-text');
        if (currentTextElement) {
            currentTextElement.textContent = text.length > 100 ? text.substring(0, 100) + '...' : text;
        } else {
            // Criar o elemento se não existir
            const textElement = document.createElement('div');
            textElement.className = 'narration-current-text';
            textElement.textContent = text.length > 100 ? text.substring(0, 100) + '...' : text;
            this.progressBarContainer.appendChild(textElement);
        }

        // Tentar encontrar o elemento que contém este texto para centralizar na tela
        this.findAndHighlightTextElement(text);
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
     * Alterna entre o estado minimizado e normal da barra de progresso
     */
    toggleMinimize() {
        if (!this.progressBarContainer) return;
        
        this.progressBarContainer.classList.toggle('minimized');
        
        // Atualizar o ícone do botão
        const minimizeButton = this.progressBarContainer.querySelector('.narration-minimize-button i');
        if (minimizeButton) {
            if (this.progressBarContainer.classList.contains('minimized')) {
                minimizeButton.className = 'fas fa-window-maximize';
            } else {
                minimizeButton.className = 'fas fa-window-minimize';
            }
        }
    }
    
    /**
     * Aumenta o tamanho da barra de progresso
     */
    increaseSize() {
        if (!this.progressBarContainer) return;
        
        // Remover classes de tamanho existentes
        this.progressBarContainer.classList.remove('size-small', 'size-large');
        
        // Incrementar o índice de tamanho
        this.currentSizeIndex++;
        if (this.currentSizeIndex > 3) this.currentSizeIndex = 3;
        
        // Aplicar a classe de tamanho apropriada
        if (this.currentSizeIndex === 1) {
            this.progressBarContainer.classList.add('size-small');
        } else if (this.currentSizeIndex === 3) {
            this.progressBarContainer.classList.add('size-large');
        }
        
        console.log(`Tamanho da barra de progresso: ${this.currentSizeIndex}`);
    }
    
    /**
     * Diminui o tamanho da barra de progresso
     */
    decreaseSize() {
        if (!this.progressBarContainer) return;
        
        // Remover classes de tamanho existentes
        this.progressBarContainer.classList.remove('size-small', 'size-large');
        
        // Decrementar o índice de tamanho
        this.currentSizeIndex--;
        if (this.currentSizeIndex < 1) this.currentSizeIndex = 1;
        
        // Aplicar a classe de tamanho apropriada
        if (this.currentSizeIndex === 1) {
            this.progressBarContainer.classList.add('size-small');
        } else if (this.currentSizeIndex === 3) {
            this.progressBarContainer.classList.add('size-large');
        }
        
        console.log(`Tamanho da barra de progresso: ${this.currentSizeIndex}`);
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

    /**
 * Encontra e destaca o elemento que contém o texto sendo narrado
 * @param {string} text - Texto sendo narrado
 */
    findAndHighlightTextElement(text) {
        if (!text || !this.scrollManager) return;

        // Remover destaque anterior
        const previousHighlighted = document.querySelectorAll('.narration-highlighted-element');
        previousHighlighted.forEach(el => el.classList.remove('narration-highlighted-element'));

        // Texto normalizado para comparação
        const normalizedText = text.trim().toLowerCase();

        // Primeiro, verificar se estamos no modo de seleção retangular
        if (window.rectangularSelectionManager && window.rectangularSelectionManager.hasSelection()) {
            const selection = window.rectangularSelectionManager.getCurrentSelection();
            if (selection && selection.element) {
                this.highlightAndScrollToElement(selection.element);
                return;
            }
        }

        // Caso contrário, procurar em todos os elementos de texto da página
        const textElements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, li, td, th, caption, label, a'));

        // Filtrar apenas elementos visíveis com conteúdo de texto
        const visibleElements = textElements.filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                el.textContent.trim().length > 0;
        });

        // Procurar pelo elemento que contém o texto exato ou mais próximo
        for (const element of visibleElements) {
            if (element.textContent.trim().toLowerCase() === normalizedText) {
                this.highlightAndScrollToElement(element);
                return; // Correspondência exata
            }
        }

        // Se não encontrou correspondência exata, procurar por correspondência parcial
        for (const element of visibleElements) {
            if (element.textContent.trim().toLowerCase().includes(normalizedText) ||
                normalizedText.includes(element.textContent.trim().toLowerCase())) {
                this.highlightAndScrollToElement(element);
                return;
            }
        }
    }

    /**
     * Destaca um elemento e rola a página para centralizá-lo
     * @param {HTMLElement} element - Elemento a ser destacado e centralizado
     */
    highlightAndScrollToElement(element) {
        if (!element || !this.scrollManager) return;

        // Armazenar referência ao elemento atual
        this.currentElement = element;

        // Adicionar classe de destaque
        element.classList.add('narration-highlighted-element');

        // Usar o ScrollManager para centralizar o elemento
        this.scrollManager.setCurrentElement(element);
    }

}

// Criar instância global
window.narrationProgressBar = new NarrationProgressBar();