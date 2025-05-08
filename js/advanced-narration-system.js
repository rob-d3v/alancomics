// advanced-narration-integration.js

/**
 * Sistema avançado de integração entre narração e visualização
 * Cria uma experiência mais imersiva durante a narração de seleções
 */
class AdvancedNarrationSystem {
    constructor() {
        // Referências aos componentes principais
        this.narrator = window.comicNarrator;
        this.selectionManager = window.rectangularSelectionManager;
        this.viewer = window.comicsViewer;
        this.scrollManager = window.scrollManager;
        
        // Estado da narração
        this.isActive = false;
        this.currentSelectionIndex = -1;
        
        // Elementos visuais
        this.progressOverlay = null;
        this.currentTextPreview = null;
        
        // Inicialização
        this.init();
    }
    
    init() {
        console.log('Inicializando sistema avançado de narração...');
        
        // Verificar componentes necessários
        if (!this.narrator || !this.selectionManager) {
            console.error('Componentes necessários não encontrados');
            return;
        }
        
        // Criar overlay de progresso avançado
        this.createProgressOverlay();
        
        // Integrar com o narrador
        this.hookIntoNarrator();
        
        // Aprimorar visibilidade das seleções
        if (this.selectionManager.enhanceSelectionVisibility) {
            this.selectionManager.enhanceSelectionVisibility();
        }
        
        // Integrar com controles do visualizador
        this.integrateWithViewerControls();
    }
    
    createProgressOverlay() {
        // Verificar se já existe
        if (document.querySelector('.advanced-narration-overlay')) {
            this.progressOverlay = document.querySelector('.advanced-narration-overlay');
            return;
        }
        
        // Criar overlay principal
        this.progressOverlay = document.createElement('div');
        this.progressOverlay.className = 'advanced-narration-overlay';
        
        // Barra de progresso
        const progressBar = document.createElement('div');
        progressBar.className = 'advanced-progress-bar';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'advanced-progress-fill';
        progressBar.appendChild(progressFill);
        
        // Contadores
        const counters = document.createElement('div');
        counters.className = 'advanced-progress-counters';
        counters.innerHTML = '<span class="current-count">0</span> / <span class="total-count">0</span>';
        
        // Prévia do texto atual
        this.currentTextPreview = document.createElement('div');
        this.currentTextPreview.className = 'advanced-text-preview';
        
        // Controles rápidos
        const quickControls = document.createElement('div');
        quickControls.className = 'advanced-quick-controls';
        
        const pauseButton = document.createElement('button');
        pauseButton.className = 'advanced-control pause';
        pauseButton.innerHTML = '<i class="fas fa-pause"></i>';
        pauseButton.addEventListener('click', () => this.togglePause());
        
        const prevButton = document.createElement('button');
        prevButton.className = 'advanced-control prev';
        prevButton.innerHTML = '<i class="fas fa-step-backward"></i>';
        prevButton.addEventListener('click', () => this.goToPrevSelection());
        
        const nextButton = document.createElement('button');
        nextButton.className = 'advanced-control next';
        nextButton.innerHTML = '<i class="fas fa-step-forward"></i>';
        nextButton.addEventListener('click', () => this.goToNextSelection());
        
        const stopButton = document.createElement('button');
        stopButton.className = 'advanced-control stop';
        stopButton.innerHTML = '<i class="fas fa-stop"></i>';
        stopButton.addEventListener('click', () => this.stopNarration());
        
        quickControls.appendChild(prevButton);
        quickControls.appendChild(pauseButton);
        quickControls.appendChild(nextButton);
        quickControls.appendChild(stopButton);
        
        // Montar overlay
        this.progressOverlay.appendChild(progressBar);
        this.progressOverlay.appendChild(counters);
        this.progressOverlay.appendChild(this.currentTextPreview);
        this.progressOverlay.appendChild(quickControls);
        
        // Adicionar estilos
        const style = document.createElement('style');
        style.textContent = `
            .advanced-narration-overlay {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 15px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                transform: translateY(100%);
                transition: transform 0.4s ease-out;
                box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
                border-top: 2px solid rgba(52, 152, 219, 0.5);
            }
            
            .advanced-narration-overlay.active {
                transform: translateY(0);
            }
            
            .advanced-progress-bar {
                height: 6px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 3px;
                overflow: hidden;
                width: 100%;
            }
            
            .advanced-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #3498db, #2ecc71);
                width: 0%;
                transition: width 0.3s ease;
            }
            
            .advanced-progress-counters {
                font-size: 14px;
                font-weight: bold;
                text-align: center;
            }
            
            .advanced-text-preview {
                font-size: 14px;
                opacity: 0.8;
                max-height: 60px;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                font-style: italic;
                text-align: center;
                padding: 0 15%;
            }
            
            .advanced-quick-controls {
                display: flex;
                justify-content: center;
                gap: 20px;
                margin-top: 10px;
            }
            
            .advanced-control {
                background: rgba(52, 152, 219, 0.3);
                border: none;
                color: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .advanced-control:hover {
                background: rgba(52, 152, 219, 0.6);
                transform: scale(1.1);
            }
            
            .advanced-control.pause.paused {
                background: rgba(46, 204, 113, 0.4);
            }
            
            .advanced-control.pause.paused:hover {
                background: rgba(46, 204, 113, 0.7);
            }
            
            .advanced-control.stop {
                background: rgba(231, 76, 60, 0.3);
            }
            
            .advanced-control.stop:hover {
                background: rgba(231, 76, 60, 0.6);
            }
            
            /* Animação de destaque para o texto */
            @keyframes text-highlight-pulse {
                0% { background: transparent; }
                50% { background: rgba(52, 152, 219, 0.15); }
                100% { background: transparent; }
            }
            
            .text-highlight-animation {
                animation: text-highlight-pulse 2s infinite;
                border-radius: 4px;
                padding: 2px 5px;
                margin: -2px -5px;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(this.progressOverlay);
        
        console.log('Overlay de progresso avançado criado');
    }
    
    hookIntoNarrator() {
        if (!this.narrator) return;
        
        // Armazenar referência para acesso no escopo de função
        const self = this;
        
        // Sobrescrever o método de narração de múltiplos textos
        const originalSpeakMultipleTexts = this.narrator.speakMultipleTexts;
        this.narrator.speakMultipleTexts = async function(multiText) {
            // Ativar o sistema avançado
            self.activate(multiText.texts.length);
            
            // Rolar para a posição 0,0 do visualizador antes de iniciar
            self.scrollToInitialPosition();
            
            // Chamada ao método original
            await originalSpeakMultipleTexts.call(this, multiText);
            
            // Desativar o sistema quando concluir
            self.deactivate();
        };
        
        // Monitorar mudanças no índice de narração
        const originalHighlightSelection = this.selectionManager.highlightSelection;
        this.selectionManager.highlightSelection = function(index) {
            // Atualizar o índice atual no sistema avançado
            self.updateCurrentSelection(index);
            
            // Chamada ao método original
            return originalHighlightSelection.call(this, index);
        };
        
        console.log('Integração com narrador concluída');
    }
    
    integrateWithViewerControls() {
        // Adicionar teclas de atalho globais
        document.addEventListener('keydown', e => {
            // Só processar se a narração estiver ativa
            if (!this.isActive) return;
            
            switch(e.key) {
                case ' ': // Espaço
                    this.togglePause();
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                    this.goToPrevSelection();
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    this.goToNextSelection();
                    e.preventDefault();
                    break;
                case 'Escape':
                    this.stopNarration();
                    e.preventDefault();
                    break;
            }
        });
        
        console.log('Atalhos de teclado configurados para narração');
    }
    
    scrollToInitialPosition() {
        const viewer = document.getElementById('viewer');
        if (!viewer) return;
        
        console.log('Rolando para posição inicial (0,0)...');
        
        // Primeiro, rolar a página para o visualizador
        const viewerRect = viewer.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetTop = scrollTop + viewerRect.top;
        
        // Animação suave para o topo do visualizador
        window.scrollTo({
            top: targetTop,
            behavior: 'smooth'
        });
        
        // Em seguida, rolar o visualizador para a posição 0,0
        setTimeout(() => {
            viewer.scrollTo({
                top: 0,
                left: 0,
                behavior: 'smooth'
            });
            
            console.log('Posição inicial alcançada');
        }, 500);
    }
    
    activate(totalSelections) {
        this.isActive = true;
        this.currentSelectionIndex = -1;
        
        // Atualizar interface
        this.progressOverlay.classList.add('active');
        
        // Atualizar contadores
        const totalCount = this.progressOverlay.querySelector('.total-count');
        if (totalCount) totalCount.textContent = totalSelections;
        
        console.log(`Sistema avançado de narração ativado com ${totalSelections} seleções`);
    }
    
    deactivate() {
        this.isActive = false;
        
        // Atualizar interface
        this.progressOverlay.classList.remove('active');
        
        console.log('Sistema avançado de narração desativado');
    }
    
    updateCurrentSelection(index) {
        if (index === this.currentSelectionIndex) return;
        
        this.currentSelectionIndex = index;
        
        // Atualizar barra de progresso
        const totalCount = parseInt(this.progressOverlay.querySelector('.total-count').textContent);
        const progressPercentage = totalCount > 0 ? (index + 1) / totalCount * 100 : 0;
        
        const progressFill = this.progressOverlay.querySelector('.advanced-progress-fill');
        if (progressFill) progressFill.style.width = `${progressPercentage}%`;
        
        // Atualizar contador atual
        const currentCount = this.progressOverlay.querySelector('.current-count');
        if (currentCount) currentCount.textContent = index + 1;
        
        // Atualizar texto atual
        if (this.selectionManager.extractedTexts && this.selectionManager.selections) {
            // Encontrar o texto para essa seleção
            const selection = this.selectionManager.selections[index];
            if (selection && selection.imageId) {
                const textsForImage = this.selectionManager.extractedTexts.get(selection.imageId);
                if (textsForImage && textsForImage[index]) {
                    // Obter texto e fazer prévia
                    let text = textsForImage[index];
                    
                    // Processar texto para exibição
                    text = text.replace(/\n/g, ' ').trim();
                    if (text.length > 100) {
                        text = text.substring(0, 100) + '...';
                    }
                    
                    this.currentTextPreview.innerHTML = `<span class="text-highlight-animation">"${text}"</span>`;
                }
            }
        }
        
        console.log(`Atualizada seleção atual para #${index + 1}`);
        
        // Usar o método aprimorado de destaque, se disponível
        if (this.selectionManager.highlightCurrentSelection) {
            this.selectionManager.highlightCurrentSelection(index);
        }
    }
    
    togglePause() {
        const pauseButton = this.progressOverlay.querySelector('.advanced-control.pause');
        
        if (this.narrator.synth.paused) {
            // Retomar narração
            this.narrator.synth.resume();
            pauseButton.innerHTML = '<i class="fas fa-pause"></i>';
            pauseButton.classList.remove('paused');
            console.log('Narração retomada');
        } else if (this.narrator.synth.speaking) {
            // Pausar narração
            this.narrator.synth.pause();
            pauseButton.innerHTML = '<i class="fas fa-play"></i>';
            pauseButton.classList.add('paused');
            console.log('Narração pausada');
        }
    }
    goToPrevSelection() {
        // Implementar navegação para seleção anterior
        if (this.currentSelectionIndex <= 0) {
            console.log('Já está na primeira seleção');
            return;
        }
        
        // Parar narração atual
        this.narrator.synth.cancel();
        
        // Decrementar índice
        const newIndex = this.currentSelectionIndex - 1;
        
        // Atualizar estado do narrador
        if (this.narrator.narrationState) {
            this.narrator.narrationState.lastProcessedSelection = newIndex - 1;
        }
        
        // Destacar e rolar para a seleção anterior
        if (this.selectionManager.highlightCurrentSelection) {
            this.selectionManager.highlightCurrentSelection(newIndex);
        } else if (this.selectionManager.highlightSelection) {
            this.selectionManager.highlightSelection(newIndex);
        }
        
        // Buscar o texto da seleção anterior
        if (this.selectionManager.selections && this.selectionManager.extractedTexts) {
            const selection = this.selectionManager.selections[newIndex];
            if (selection && selection.imageId) {
                const textsForImage = this.selectionManager.extractedTexts.get(selection.imageId);
                if (textsForImage && textsForImage[newIndex]) {
                    // Processar o texto
                    let textToSpeak = textsForImage[newIndex];
                    if (this.selectionManager.processTextForNarration) {
                        textToSpeak = this.selectionManager.processTextForNarration(textToSpeak);
                    }
                    
                    // Iniciar narração do texto
                    setTimeout(() => {
                        this.narrator.speakText(textToSpeak);
                        this.updateCurrentSelection(newIndex);
                    }, 500);
                }
            }
        }
        
        console.log(`Navegado para seleção anterior #${newIndex + 1}`);
    }
    
    goToNextSelection() {
        // Verificar se existe uma próxima seleção
        if (!this.selectionManager.selections || 
            this.currentSelectionIndex >= this.selectionManager.selections.length - 1) {
            console.log('Já está na última seleção');
            return;
        }
        
        // Parar narração atual
        this.narrator.synth.cancel();
        
        // Incrementar índice
        const newIndex = this.currentSelectionIndex + 1;
        
        // Atualizar estado do narrador
        if (this.narrator.narrationState) {
            this.narrator.narrationState.lastProcessedSelection = newIndex - 1;
        }
        
        // Destacar e rolar para a próxima seleção
        if (this.selectionManager.highlightCurrentSelection) {
            this.selectionManager.highlightCurrentSelection(newIndex);
        } else if (this.selectionManager.highlightSelection) {
            this.selectionManager.highlightSelection(newIndex);
        }
        
        // Buscar o texto da próxima seleção
        if (this.selectionManager.selections && this.selectionManager.extractedTexts) {
            const selection = this.selectionManager.selections[newIndex];
            if (selection && selection.imageId) {
                const textsForImage = this.selectionManager.extractedTexts.get(selection.imageId);
                if (textsForImage && textsForImage[newIndex]) {
                    // Processar o texto
                    let textToSpeak = textsForImage[newIndex];
                    if (this.selectionManager.processTextForNarration) {
                        textToSpeak = this.selectionManager.processTextForNarration(textToSpeak);
                    }
                    
                    // Iniciar narração do texto
                    setTimeout(() => {
                        this.narrator.speakText(textToSpeak);
                        this.updateCurrentSelection(newIndex);
                    }, 500);
                }
            }
        }
        
        console.log(`Navegado para próxima seleção #${newIndex + 1}`);
    }
    
    stopNarration() {
        // Parar a narração completamente
        if (this.narrator) {
            this.narrator.stopNarration();
        }
        
        // Desativar o sistema avançado
        this.deactivate();
        
        console.log('Narração interrompida');
    }
}

// Integração avançada com o ScrollManager
class EnhancedScrollTracker {
    constructor() {
        this.scrollManager = window.scrollManager;
        this.lastScrollPosition = 0;
        this.scrollDirection = 'down';
        this.selectionManager = window.rectangularSelectionManager;
        this.narrator = window.comicNarrator;
        this.isActive = false;
        this.currentElement = null;
        this.scrollTracker = null;
        
        // Inicializar
        this.init();
    }
    
    init() {
        if (!this.scrollManager) {
            console.warn('ScrollManager não encontrado, não é possível aprimorar o rastreamento de rolagem');
            return;
        }
        
        console.log('Inicializando rastreador de rolagem aprimorado...');
        
        // Configurar o observador de rolagem
        this.setupScrollObserver();
        
        // Integrar com o ScrollManager para melhorar o comportamento durante a narração
        this.enhanceScrollManager();
    }
    
    setupScrollObserver() {
        // Monitorar eventos de rolagem para detectar direção
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
            
            // Determinar direção da rolagem
            if (currentScroll > this.lastScrollPosition) {
                this.scrollDirection = 'down';
            } else if (currentScroll < this.lastScrollPosition) {
                this.scrollDirection = 'up';
            }
            
            // Armazenar a posição atual para comparação futura
            this.lastScrollPosition = currentScroll;
            
            // Atualizar o rastreador com a nova direção
            if (this.isActive && this.scrollTracker) {
                this.scrollTracker.setAttribute('data-direction', this.scrollDirection);
            }
        }, { passive: true });
    }
    
    enhanceScrollManager() {
        // Melhorar o comportamento de rolagem durante a narração
        const originalSetCurrentElement = this.scrollManager.setCurrentElement;
        
        this.scrollManager.setCurrentElement = (element, options = {}) => {
            // Armazenar referência ao elemento atual
            this.currentElement = element;
            
            // Mostrar indicador visual durante a narração
            if (this.narrator && this.narrator.isNarrating) {
                this.showScrollTracker(element);
            }
            
            // Adicionar opções melhoradas
            const enhancedOptions = {
                ...options,
                // Melhorar os valores padrão para uma experiência de narração mais suave
                behavior: options.behavior || 'smooth',
                verticalAlignment: options.verticalAlignment || 0.35,
                margin: options.margin || 150
            };
            
            // Chamar o método original com as opções aprimoradas
            return originalSetCurrentElement.call(this.scrollManager, element, enhancedOptions);
        };
        
        console.log('ScrollManager aprimorado para melhor experiência de narração');
    }
    
    showScrollTracker(element) {
        if (!element) return;
        
        // Criar ou reutilizar o indicador visual
        if (!this.scrollTracker) {
            this.scrollTracker = document.createElement('div');
            this.scrollTracker.className = 'scroll-tracker';
            document.body.appendChild(this.scrollTracker);
            
            // Adicionar estilos
            const style = document.createElement('style');
            style.textContent = `
                .scroll-tracker {
                    position: fixed;
                    width: 8px;
                    height: 40px;
                    background: linear-gradient(to bottom, #3498db, #2ecc71);
                    right: 5px;
                    border-radius: 4px;
                    z-index: 10000;
                    opacity: 0.7;
                    transition: opacity 0.3s, transform 0.3s;
                    box-shadow: 0 0 10px rgba(52, 152, 219, 0.5);
                }
                
                .scroll-tracker:hover {
                    opacity: 1;
                }
                
                .scroll-tracker[data-direction='down'] {
                    border-bottom: 3px solid #2ecc71;
                }
                
                .scroll-tracker[data-direction='up'] {
                    border-top: 3px solid #3498db;
                }
                
                .scroll-tracker::before {
                    content: '';
                    position: absolute;
                    width: 0;
                    height: 0;
                    right: 8px;
                }
                
                .scroll-tracker[data-direction='down']::before {
                    border-left: 6px solid transparent;
                    border-right: 6px solid transparent;
                    border-top: 6px solid #2ecc71;
                    bottom: -6px;
                }
                
                .scroll-tracker[data-direction='up']::before {
                    border-left: 6px solid transparent;
                    border-right: 6px solid transparent;
                    border-bottom: 6px solid #3498db;
                    top: -6px;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Posicionar o indicador na borda da tela, na mesma altura do elemento
        const rect = element.getBoundingClientRect();
        const centerY = rect.top + (rect.height / 2);
        
        // Atualizar posição e direção
        this.scrollTracker.style.top = `${centerY - 20}px`; // Centralizar no elemento
        this.scrollTracker.setAttribute('data-direction', this.scrollDirection);
        this.scrollTracker.style.display = 'block';
        
        // Ativar o rastreador
        this.isActive = true;
    }
    
    hideScrollTracker() {
        if (this.scrollTracker) {
            this.scrollTracker.style.display = 'none';
        }
        
        this.isActive = false;
    }
}

/**
 * Classe para aprimorar as transições visuais durante a narração
 * Adiciona efeitos de zoom suave e destaques para as seleções
 */
class EnhancedVisualTransitions {
    constructor() {
        this.selectionManager = window.rectangularSelectionManager;
        this.viewer = document.getElementById('viewer');
        this.activeZoomTimeout = null;
        this.isActive = false;
        
        // Inicializar
        this.init();
    }
    
    init() {
        if (!this.selectionManager || !this.viewer) {
            console.warn('Componentes necessários não encontrados para transições visuais');
            return;
        }
        
        console.log('Inicializando sistema de transições visuais...');
        
        // Adicionar estilos para efeitos visuais
        this.addTransitionStyles();
        
        // Integrar com o sistema de seleção
        this.integrateWithSelectionManager();
    }
    
    addTransitionStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Estilos para transições de zoom */
            .zoom-transition {
                transition: transform 1.2s cubic-bezier(0.165, 0.84, 0.44, 1);
            }
            
            /* Efeito de destaque para seleção atual */
            @keyframes selection-focus-pulse {
                0% { box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.7); }
                70% { box-shadow: 0 0 0 15px rgba(52, 152, 219, 0); }
                100% { box-shadow: 0 0 0 0 rgba(52, 152, 219, 0); }
            }
            
            .selection-focus-effect {
                animation: selection-focus-pulse 2s infinite;
                position: relative;
                z-index: 1000;
            }
            
            /* Efeito de foco no conteúdo atual */
            .content-focus-effect::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: radial-gradient(
                    circle at var(--focus-x, 50%) var(--focus-y, 50%),
                    transparent 30%,
                    rgba(0, 0, 0, 0.4) 100%
                );
                pointer-events: none;
                z-index: 9990;
                opacity: 0;
                transition: opacity 0.8s ease;
            }
            
            .content-focus-effect.active::before {
                opacity: 1;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    integrateWithSelectionManager() {
        if (!this.selectionManager) return;
        
        // Referência para uso em funções internas
        const self = this;
        
        // Integrar com o método de atualização de scroll para seleção atual
        const originalUpdateScrollMethod = this.selectionManager.updateScrollForCurrentSelection;
        
        this.selectionManager.updateScrollForCurrentSelection = function(index) {
            // Ativar efeitos visuais aprimorados
            self.activateEnhancedVisuals(index);
            
            // Chamar método original
            return originalUpdateScrollMethod.call(this, index);
        };
    }
    
    activateEnhancedVisuals(selectionIndex) {
        // Verificar se o índice é válido
        if (!this.selectionManager.selections || 
            selectionIndex < 0 || 
            selectionIndex >= this.selectionManager.selections.length) {
            return;
        }
        
        // Obter a seleção atual
        const selection = this.selectionManager.selections[selectionIndex];
        if (!selection || !selection.element) return;
        
        // Limpar efeitos anteriores
        this.clearActiveEffects();
        
        // Ativar o estado do sistema
        this.isActive = true;
        
        // Aplicar efeito de foco à seleção
        selection.element.classList.add('selection-focus-effect');
        
        // Criar efeito de foco no conteúdo
        this.applyContentFocusEffect(selection.element);
    }
    
    applyContentFocusEffect(element) {
        // Adicionar classe de efeito ao body
        document.body.classList.add('content-focus-effect');
        
        // Calcular posição do foco
        const rect = element.getBoundingClientRect();
        const focusX = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
        const focusY = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
        
        // Aplicar variáveis CSS para posição do foco
        document.body.style.setProperty('--focus-x', `${focusX}%`);
        document.body.style.setProperty('--focus-y', `${focusY}%`);
        
        // Ativar o efeito após um pequeno delay para a transição funcionar
        setTimeout(() => {
            document.body.classList.add('active');
        }, 50);
        
        // Aplicar efeito de zoom suave, se apropriado
        this.applySmartZoomEffect(element);
    }
    
    applySmartZoomEffect(element) {
        // Somente aplicar zoom se o elemento for pequeno em relação à tela
        const rect = element.getBoundingClientRect();
        const viewportArea = window.innerWidth * window.innerHeight;
        const elementArea = rect.width * rect.height;
        
        // Calcular a proporção do elemento em relação à tela
        const areaRatio = elementArea / viewportArea;
        
        // Só aplicar zoom para elementos pequenos (menos de 15% da tela)
        if (areaRatio < 0.15) {
            // Adicionar classe de transição ao visualizador
            this.viewer.classList.add('zoom-transition');
            
            // Determinar o fator de zoom com base no tamanho (quanto menor, maior o zoom)
            const zoomFactor = Math.min(1.35, 1 + (0.15 - areaRatio) * 3);
            
            console.log(`Aplicando zoom de ${zoomFactor.toFixed(2)}x para seleção`);
            
            // Calcular transformação para centralizar no elemento
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Calcular deslocamento necessário
            const translateX = (window.innerWidth / 2 - centerX) / zoomFactor;
            const translateY = (window.innerHeight / 2 - centerY) / zoomFactor;
            
            // Aplicar transformação com zoom e centralização
            this.viewer.style.transform = `scale(${zoomFactor}) translate(${translateX}px, ${translateY}px)`;
            
            // Restaurar após a narração deste elemento
            if (this.activeZoomTimeout) {
                clearTimeout(this.activeZoomTimeout);
            }
            
            // Estimar o tempo para narração baseado no tamanho do texto
            let textLength = 0;
            if (this.selectionManager.extractedTexts && element.dataset.imageId) {
                const textsForImage = this.selectionManager.extractedTexts.get(element.dataset.imageId);
                if (textsForImage && textsForImage[element.dataset.index]) {
                    textLength = textsForImage[element.dataset.index].length;
                }
            }
            
            // Estimar tempo necessário (mínimo 3s, máximo 10s)
            const narrationTime = Math.min(10000, Math.max(3000, textLength * 50));
            
            this.activeZoomTimeout = setTimeout(() => {
                this.clearActiveEffects();
            }, narrationTime);
        }
    }
    
    clearActiveEffects() {
        // Limpar efeito de foco no conteúdo
        document.body.classList.remove('content-focus-effect', 'active');
        
        // Limpar efeitos de foco em todas as seleções
        if (this.selectionManager && this.selectionManager.selections) {
            this.selectionManager.selections.forEach(selection => {
                if (selection.element) {
                    selection.element.classList.remove('selection-focus-effect');
                }
            });
        }
        
        // Remover efeito de zoom
        if (this.viewer) {
            this.viewer.style.transform = '';
            
            // Remover classe de transição após concluir
            setTimeout(() => {
                this.viewer.classList.remove('zoom-transition');
            }, 1500);
        }
        
        this.isActive = false;
    }
}

// Inicializar componentes avançados
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar após pequeno delay para garantir que outros componentes estejam prontos
    setTimeout(() => {
        // Verificar se os componentes necessários estão disponíveis
        if (window.comicNarrator && window.rectangularSelectionManager) {
            // Inicializar sistemas avançados
            window.advancedNarrationSystem = new AdvancedNarrationSystem();
            window.enhancedScrollTracker = new EnhancedScrollTracker();
            window.enhancedVisualTransitions = new EnhancedVisualTransitions();
            
            console.log('✨ Sistemas avançados de narração e visualização inicializados com sucesso! ✨');
        }
    }, 1000);
});