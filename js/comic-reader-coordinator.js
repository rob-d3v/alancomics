// comic-reader-coordinator.js - Coordenação entre todos os sistemas

/**
 * Coordenador central do sistema de leitura automática de quadrinhos
 * Garante uma experiência fluida e mágica entre todos os componentes
 */
class ComicReaderCoordinator {
    constructor() {
        // Referências aos principais componentes
        this.narrator = window.comicNarrator;
        this.selectionManager = window.rectangularSelectionManager;
        this.viewer = window.comicsViewer;
        this.scrollManager = window.scrollManager;
        
        // Sistema de registro e log
        this.logHistory = [];
        this.isDebugMode = false;
        
        // Estado da narração
        this.isPlaying = false;
        
        // Inicializar
        this.init();
    }
    
    init() {
        console.log('Inicializando coordenador central do sistema de leitura automática...');
        
        // Verificar componentes essenciais
        if (!this.checkEssentialComponents()) {
            console.error('Componentes essenciais não disponíveis. Inicialização cancelada.');
            return;
        }
        
        // Registrar eventos globais de coordenação
        this.registerGlobalEvents();
        
        // Coordenar início do fluxo de trabalho
        this.setupWorkflow();
        
        // Melhorar a interface do usuário
        this.enhanceUserInterface();
        
        console.log('Coordenador central inicializado com sucesso!');
    }
    
    checkEssentialComponents() {
        let allComponentsAvailable = true;
        const missingComponents = [];
        
        // Verificar componentes um por um
        if (!this.narrator) {
            missingComponents.push('ComicNarrator');
            allComponentsAvailable = false;
        }
        
        if (!this.selectionManager) {
            missingComponents.push('RectangularSelectionManager');
            allComponentsAvailable = false;
        }
        
        if (!this.viewer) {
            missingComponents.push('ComicsViewer');
            allComponentsAvailable = false;
        }
        
        if (!this.scrollManager) {
            missingComponents.push('ScrollManager');
            allComponentsAvailable = false;
        }
        
        // Relatório de componentes faltantes
        if (missingComponents.length > 0) {
            console.warn(`Componentes faltantes: ${missingComponents.join(', ')}`);
        }
        
        return allComponentsAvailable;
    }
    
    registerGlobalEvents() {
        // Eventos relacionados à narração
        document.addEventListener('narration-started', (e) => {
            this.log('Evento de início de narração recebido');
            this.isPlaying = true;
            
            // Coordenar posicionamento inicial
            this.ensureStartingPosition();
        });
        
        document.addEventListener('narration-stopped', (e) => {
            this.log('Evento de interrupção de narração recebido');
            this.isPlaying = false;
            
            // Restaurar estado visual normal
            if (window.enhancedVisualTransitions) {
                window.enhancedVisualTransitions.clearActiveEffects();
            }
        });
        
        document.addEventListener('narration-selection-changed', (e) => {
            const index = e.detail ? e.detail.index : -1;
            this.log(`Evento de mudança de seleção narrada recebido: índice ${index}`);
            
            // Garantir rolagem adequada para a seleção
            if (index >= 0 && this.selectionManager && this.selectionManager.selections) {
                this.ensureSelectionVisible(index);
            }
        });
        
        // Eventos relacionados à visualização
        document.addEventListener('viewer-resized', () => {
            this.log('Evento de redimensionamento do visualizador recebido');
            
            // Recalcular coordenadas de seleção quando o visualizador for redimensionado
            if (this.selectionManager && this.selectionManager.updateSelectionCoordinates) {
                this.selectionManager.updateSelectionCoordinates();
            }
        });
        
        // Monitorar redimensionamento da janela
        window.addEventListener('resize', () => {
            // Disparar evento personalizado para nosso sistema
            document.dispatchEvent(new CustomEvent('viewer-resized'));
        });
        
        // Adicionar evento personalizado para o progresso da narração
        this.createCustomNarrationEvents();
    }
    
    createCustomNarrationEvents() {
        // Se o narrador estiver disponível, ampliar seus métodos para disparar eventos
        if (!this.narrator) return;
        
        // Sobrescrever métodos-chave para adicionar eventos
        const originalSpeakText = this.narrator.speakText;
        this.narrator.speakText = function(text) {
            // Disparar evento de início de fala
            document.dispatchEvent(new CustomEvent('narration-text-started', {
                detail: { text }
            }));
            
            // Chamar método original
            return originalSpeakText.call(this, text);
        };
        
        const originalStartNarration = this.narrator.startNarration;
        this.narrator.startNarration = function() {
            // Disparar evento de início de narração
            document.dispatchEvent(new CustomEvent('narration-started'));
            
            // Chamar método original
            return originalStartNarration.call(this);
        };
        
        const originalStopNarration = this.narrator.stopNarration;
        this.narrator.stopNarration = function() {
            // Disparar evento de interrupção de narração
            document.dispatchEvent(new CustomEvent('narration-stopped'));
            
            // Chamar método original
            return originalStopNarration.call(this);
        };
        
        // Integrar com o gerenciador de seleção para rastrear mudanças de seleção
        if (this.selectionManager) {
            const originalHighlightSelection = this.selectionManager.highlightSelection;
            this.selectionManager.highlightSelection = function(index) {
                // Disparar evento de mudança de seleção
                document.dispatchEvent(new CustomEvent('narration-selection-changed', {
                    detail: { index }
                }));
                
                // Chamar método original
                return originalHighlightSelection.call(this, index);
            };
        }
    }
    
    setupWorkflow() {
        // Configurar fluxo de trabalho integrado para narração fluida
        this.log('Configurando fluxo de trabalho integrado...');
        
        // Garantir que o ScrollManager esteja configurado corretamente
        if (this.scrollManager) {
            // Usar configurações otimizadas para a melhor experiência de narração
            this.scrollManager.settings.behavior = 'smooth';
            this.scrollManager.settings.verticalAlignment = 0.35; // Posicionar mais próximo ao centro
            this.scrollManager.settings.margin = 150; // Margem maior para melhor visualização
            this.scrollManager.settings.scrollDelay = 30; // Resposta mais rápida
            
            this.log('ScrollManager configurado com parâmetros otimizados');
        }
        
        // Coordenar com o gerenciador de seleção
        if (this.selectionManager) {
            // Adicionar método para garantir que as coordenadas sejam sempre precisas
            this.selectionManager.ensureCoordinatesPrecision = () => {
                if (this.selectionManager.updateSelectionCoordinates) {
                    this.selectionManager.updateSelectionCoordinates();
                    this.log('Coordenadas de seleção atualizadas para maior precisão');
                }
            };
            
            // Chamar este método periodicamente durante a narração
            setInterval(() => {
                if (this.isPlaying && this.selectionManager.ensureCoordinatesPrecision) {
                    this.selectionManager.ensureCoordinatesPrecision();
                }
            }, 5000);
        }
    }
    
    ensureStartingPosition() {
        this.log('Garantindo posição inicial de rolagem...');
        
        // Definir as coordenadas 0,0 como ponto de início da narração
        const viewer = document.getElementById('viewer');
        if (!viewer) return;
        
        // Primeiro, rolar a página para visualizar o topo do visualizador
        const viewerRect = viewer.getBoundingClientRect();
        window.scrollTo({
            top: viewerRect.top + window.pageYOffset - 20,
            behavior: 'smooth'
        });
        
        // Em seguida, rolar o visualizador para a posição 0,0
        setTimeout(() => {
            viewer.scrollTo({
                top: 0,
                left: 0,
                behavior: 'smooth'
            });
            
            this.log('Posição inicial 0,0 alcançada');
            
            // Animar um indicador visual na posição 0,0
            this.showInitialPositionIndicator(viewer);
        }, 800);
    }
    
    showInitialPositionIndicator(viewer) {
        // Criar indicador visual temporário na posição 0,0
        const indicator = document.createElement('div');
        indicator.className = 'initial-position-indicator';
        indicator.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
        
        // Posicionar no topo do visualizador
        indicator.style.position = 'absolute';
        indicator.style.top = '0';
        indicator.style.left = '0';
        indicator.style.color = '#3498db';
        indicator.style.fontSize = '24px';
        indicator.style.zIndex = '9999';
        indicator.style.transformOrigin = 'center';
        indicator.style.animation = 'position-pulse 1.5s ease-out forwards';
        
        // Adicionar animação
        const style = document.createElement('style');
        style.textContent = `
            @keyframes position-pulse {
                0% { transform: scale(0.5); opacity: 0; }
                20% { transform: scale(1.2); opacity: 1; }
                60% { transform: scale(1); opacity: 1; }
                100% { transform: scale(2); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        // Adicionar ao visualizador
        viewer.appendChild(indicator);
        
        // Remover após a animação
        setTimeout(() => {
            if (viewer.contains(indicator)) {
                viewer.removeChild(indicator);
            }
        }, 1500);
    }
    
    ensureSelectionVisible(index) {
        this.log(`Garantindo visibilidade da seleção #${index + 1}`);
        
        // Verificar se a seleção existe
        if (!this.selectionManager || !this.selectionManager.selections ||
            index < 0 || index >= this.selectionManager.selections.length) {
            return;
        }
        
        // Obter a seleção
        const selection = this.selectionManager.selections[index];
        if (!selection || !selection.element) return;
        
        // Usar método avançado de rolagem, se disponível
        if (this.selectionManager.highlightCurrentSelection) {
            this.selectionManager.highlightCurrentSelection(index);
            this.log(`Usando método avançado de destaque para seleção #${index + 1}`);
            return;
        }
        
        // Método convencional como fallback
        if (this.scrollManager) {
            this.scrollManager.setCurrentElement(selection.element, {
                behavior: 'smooth',
                verticalAlignment: 0.35,
                margin: 150
            });
            
            // Adicionar destaque visual
            selection.element.classList.add('current-selection-highlight');
            
            // Remover após um tempo
            setTimeout(() => {
                selection.element.classList.remove('current-selection-highlight');
            }, 3000);
            
            this.log(`Método convencional usado para destacar seleção #${index + 1}`);
        }
    }
    
    enhanceUserInterface() {
        this.log('Aprimorando interface do usuário para experiência de leitura...');
        
        // Adicionar controles flutuantes para narração com atalhos de teclado
        this.addNarrationShortcuts();
        
        // Melhorar visibilidade dos elementos de seleção
        if (this.selectionManager && this.selectionManager.enhanceSelectionVisibility) {
            this.selectionManager.enhanceSelectionVisibility();
        }
        
        // Adicionar indicador de status da narração
        this.addNarrationStatusIndicator();
    }
    
    addNarrationShortcuts() {
        // Criar um elemento informativo sobre atalhos de teclado
        const shortcutsInfo = document.createElement('div');
        shortcutsInfo.className = 'shortcuts-info';
        shortcutsInfo.innerHTML = `
            <div class="shortcuts-title">Atalhos de Teclado</div>
            <div class="shortcut-item"><span class="key">Espaço</span> Pausar/Retomar narração</div>
            <div class="shortcut-item"><span class="key">←</span> Seleção anterior</div>
            <div class="shortcut-item"><span class="key">→</span> Próxima seleção</div>
            <div class="shortcut-item"><span class="key">Esc</span> Parar narração</div>
            <div class="toggle-button">Mostrar Atalhos</div>
        `;
        
        // Estilizar o elemento
        const style = document.createElement('style');
        style.textContent = `
            .shortcuts-info {
                position: fixed;
                bottom: 20px;
                right: -250px;
                width: 240px;
                background: rgba(0, 0, 0, 0.85);
                color: white;
                padding: 15px;
                border-radius: 8px 0 0 8px;
                box-shadow: 0 3px 15px rgba(0, 0, 0, 0.3);
                z-index: 9998;
                font-size: 14px;
                transition: right 0.3s ease-out;
                border-left: 4px solid #3498db;
            }
            
            .shortcuts-info.visible {
                right: 0;
            }
            
            .shortcuts-title {
                font-weight: bold;
                margin-bottom: 10px;
                font-size: 16px;
                color: #3498db;
            }
            
            .shortcut-item {
                margin-bottom: 8px;
                display: flex;
                align-items: center;
            }
            
            .key {
                display: inline-block;
                background: rgba(52, 152, 219, 0.3);
                padding: 3px 8px;
                border-radius: 4px;
                margin-right: 10px;
                min-width: 20px;
                text-align: center;
                font-family: monospace;
                border: 1px solid rgba(52, 152, 219, 0.5);
            }
            
            .toggle-button {
                position: absolute;
                left: -90px;
                top: 50%;
                transform: translateY(-50%) rotate(-90deg);
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 5px 10px;
                border-radius: 4px 4px 0 0;
                cursor: pointer;
                font-size: 12px;
                transition: background 0.2s;
                white-space: nowrap;
                border-top: 2px solid #3498db;
            }
            
            .toggle-button:hover {
                background: rgba(0, 0, 0, 0.9);
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(shortcutsInfo);
        
        // Adicionar funcionalidade ao botão de alternância
        const toggleButton = shortcutsInfo.querySelector('.toggle-button');
        toggleButton.addEventListener('click', () => {
            shortcutsInfo.classList.toggle('visible');
            toggleButton.textContent = shortcutsInfo.classList.contains('visible') ? 'Ocultar Atalhos' : 'Mostrar Atalhos';
        });
        
        // Implementar os atalhos de teclado globais
        document.addEventListener('keydown', (e) => {
            // Só processar se houver narração ativa
            if (!this.narrator || !this.narrator.isNarrating) return;
            
            switch(e.key) {
                case ' ': // Espaço
                    this.togglePauseNarration();
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                    this.navigateToPreviousSelection();
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    this.navigateToNextSelection();
                    e.preventDefault();
                    break;
                case 'Escape':
                    this.stopNarration();
                    e.preventDefault();
                    break;
            }
        });
        
        this.log('Atalhos de teclado para navegação configurados');
    }
    
    addNarrationStatusIndicator() {
        // Criar indicador de status de narração
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'narration-status-indicator';
        
        // Conteúdo inicial
        statusIndicator.innerHTML = `
            <div class="status-icon"><i class="fas fa-book-reader"></i></div>
            <div class="status-text">Pronto para narração</div>
        `;
        
        // Estilizar o indicador
        const style = document.createElement('style');
        style.textContent = `
            .narration-status-indicator {
                position: fixed;
                top: 20px;
                left: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px 15px;
                border-radius: 30px;
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 9999;
                font-size: 14px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(52, 152, 219, 0.5);
                opacity: 0;
                transform: translateY(-20px);
                transition: opacity 0.3s, transform 0.3s;
                pointer-events: none;
            }
            
            .narration-status-indicator.visible {
                opacity: 1;
                transform: translateY(0);
            }
            
            .narration-status-indicator.narrating {
                background: rgba(46, 204, 113, 0.8);
                border-color: rgba(46, 204, 113, 0.5);
            }
            
            .narration-status-indicator.paused {
                background: rgba(243, 156, 18, 0.8);
                border-color: rgba(243, 156, 18, 0.5);
            }
            
            .status-icon {
                font-size: 16px;
            }
            
            .narration-status-indicator.narrating .status-icon i {
                animation: status-pulse 1.5s infinite;
            }
            
            .narration-status-indicator.paused .status-icon i {
                animation: status-blink 1.5s infinite;
            }
            
            @keyframes status-pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }
            
            @keyframes status-blink {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(statusIndicator);
        
        // Atualizar o status com base nos eventos
        document.addEventListener('narration-started', () => {
            statusIndicator.classList.remove('paused');
            statusIndicator.classList.add('visible', 'narrating');
            statusIndicator.querySelector('.status-text').textContent = 'Narrando...';
            statusIndicator.querySelector('.status-icon i').className = 'fas fa-book-reader';
            
            // Ocultar após alguns segundos
            setTimeout(() => {
                if (statusIndicator.classList.contains('narrating') &&
                    !statusIndicator.classList.contains('paused')) {
                    statusIndicator.classList.remove('visible');
                }
            }, 3000);
        });
        
        document.addEventListener('narration-stopped', () => {
            statusIndicator.classList.remove('narrating', 'paused');
            statusIndicator.classList.add('visible');
            statusIndicator.querySelector('.status-text').textContent = 'Narração interrompida';
            statusIndicator.querySelector('.status-icon i').className = 'fas fa-stop-circle';
            
            // Ocultar após alguns segundos
            setTimeout(() => {
                statusIndicator.classList.remove('visible');
            }, 3000);
        });
        
        // Adicionar eventos para pausa/retomada
        if (window.speechSynthesis) {
            // Verificar periodicamente o estado da síntese de fala
            setInterval(() => {
                if (this.narrator && this.narrator.isNarrating) {
                    if (window.speechSynthesis.paused) {
                        // Atualizar para estado pausado
                        if (!statusIndicator.classList.contains('paused')) {
                            statusIndicator.classList.add('visible', 'paused');
                            statusIndicator.querySelector('.status-text').textContent = 'Narração pausada';
                            statusIndicator.querySelector('.status-icon i').className = 'fas fa-pause-circle';
                        }
                    } else if (window.speechSynthesis.speaking) {
                        // Atualizar para estado de narração ativa
                        if (statusIndicator.classList.contains('paused')) {
                            statusIndicator.classList.remove('paused');
                            statusIndicator.classList.add('narrating');
                            statusIndicator.querySelector('.status-text').textContent = 'Narrando...';
                            statusIndicator.querySelector('.status-icon i').className = 'fas fa-book-reader';
                            
                            // Ocultar após alguns segundos
                            setTimeout(() => {
                                if (statusIndicator.classList.contains('narrating') &&
                                    !statusIndicator.classList.contains('paused')) {
                                    statusIndicator.classList.remove('visible');
                                }
                            }, 3000);
                        }
                    }
                }
            }, 500);
        }
        
        this.log('Indicador de status de narração adicionado');
    }
    
    togglePauseNarration() {
        this.log('Alternando pausa da narração');
        
        if (!this.narrator || !window.speechSynthesis) return;
        
        if (window.speechSynthesis.paused) {
            // Retomar narração
            window.speechSynthesis.resume();
            this.log('Narração retomada');
        } else if (window.speechSynthesis.speaking) {
            // Pausar narração
            window.speechSynthesis.pause();
            this.log('Narração pausada');
        }
    }
    
    navigateToPreviousSelection() {
        this.log('Navegando para seleção anterior');
        
        // Usar implementação avançada, se disponível
        if (window.advancedNarrationSystem) {
            window.advancedNarrationSystem.goToPrevSelection();
            return;
        }
        
        // Implementação básica como fallback
        if (this.narrator && this.selectionManager) {
            // Encontrar o índice atual
            const currentIndex = this.selectionManager.currentNarrationIndex || 0;
            
            if (currentIndex > 0) {
                // Parar narração atual
                window.speechSynthesis.cancel();
                
                // Voltar para a seleção anterior
                const newIndex = currentIndex - 1;
                
                // Destacar e rolar para a seleção
                this.selectionManager.highlightSelection(newIndex);
                
                // Pegar o texto dessa seleção
                if (this.selectionManager.selections && 
                    this.selectionManager.extractedTexts) {
                    
                    const selection = this.selectionManager.selections[newIndex];
                    if (selection && selection.imageId) {
                        const textsForImage = this.selectionManager.extractedTexts.get(selection.imageId);
                        if (textsForImage && textsForImage[newIndex]) {
                            // Narrar o texto
                            this.narrator.speakText(textsForImage[newIndex]);
                        }
                    }
                }
            }
        }
    }
    
    navigateToNextSelection() {
        this.log('Navegando para próxima seleção');
        
        // Usar implementação avançada, se disponível
        if (window.advancedNarrationSystem) {
            window.advancedNarrationSystem.goToNextSelection();
            return;
        }
        
        // Implementação básica como fallback
        if (this.narrator && this.selectionManager) {
            // Encontrar o índice atual
            const currentIndex = this.selectionManager.currentNarrationIndex || 0;
            
            // Verificar se há uma próxima seleção
            if (this.selectionManager.selections && 
                currentIndex < this.selectionManager.selections.length - 1) {
                
                // Parar narração atual
                window.speechSynthesis.cancel();
                
                // Avançar para a próxima seleção
                const newIndex = currentIndex + 1;
                
                // Destacar e rolar para a seleção
                this.selectionManager.highlightSelection(newIndex);
                
                // Pegar o texto dessa seleção
                if (this.selectionManager.selections && 
                    this.selectionManager.extractedTexts) {
                    
                    const selection = this.selectionManager.selections[newIndex];
                    if (selection && selection.imageId) {
                        const textsForImage = this.selectionManager.extractedTexts.get(selection.imageId);
                        if (textsForImage && textsForImage[newIndex]) {
                            // Narrar o texto
                            this.narrator.speakText(textsForImage[newIndex]);
                        }
                    }
                }
            }
        }
    }
    
    stopNarration() {
        this.log('Interrompendo narração');
        
        if (this.narrator) {
            this.narrator.stopNarration();
        }
    }
    
    log(message) {
        // Adicionar timestamp
        const timestamp = new Date().toISOString().substr(11, 8);
        const logEntry = `[${timestamp}] ${message}`;
        
        // Adicionar ao histórico
        this.logHistory.push(logEntry);
        
        // Limitar tamanho do histórico
        if (this.logHistory.length > 100) {
            this.logHistory.shift();
        }
        
        // Mostrar no console se em modo de depuração
        if (this.isDebugMode) {
            console.log(`🔄 ${logEntry}`);
        }
    }
    
    // Método para exibir o histórico de logs
    showLogHistory() {
        console.log('=== Histórico de Logs do Leitor de Quadrinhos ===');
        this.logHistory.forEach(entry => console.log(entry));
        console.log('==============================================');
    }
    
    // Ativar/desativar modo de depuração
    toggleDebugMode() {
        this.isDebugMode = !this.isDebugMode;
        console.log(`Modo de depuração ${this.isDebugMode ? 'ativado' : 'desativado'}`);
        
        if (this.isDebugMode) {
            this.showLogHistory();
        }
    }
}

// Inicializar o coordenador quando todos os outros componentes estiverem prontos
document.addEventListener('DOMContentLoaded', () => {
    // Aguardar que todos os componentes sejam carregados
    const checkAndInitialize = () => {
        if (window.comicNarrator && 
            window.rectangularSelectionManager && 
            window.comicsViewer && 
            window.scrollManager) {
            
            // Todos os componentes estão disponíveis
            window.comicReaderCoordinator = new ComicReaderCoordinator();
        } else {
            // Tentar novamente após um breve intervalo
            setTimeout(checkAndInitialize, 500);
        }
    };
    
    // Iniciar verificação após um atraso inicial
    setTimeout(checkAndInitialize, 1000);
});