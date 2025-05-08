// auto-init.js - Inicialização automática completa

/**
 * Script de inicialização automática para o sistema de leitura de quadrinhos
 * Garante que todos os componentes sejam inicializados na ordem correta
 */
(function() {
    console.log('🚀 Iniciando sistema de leitura automática de quadrinhos...');
    
    // Verificar componentes já inicializados
    const componentsStatus = {
        viewer: false,
        narrator: false,
        selectionManager: false,
        scrollManager: false,
        advancedSystems: false
    };
    
    // Função para inicializar componentes na ordem correta
    function initializeComponents() {
        // Inicializar o visualizador primeiro
        if (!componentsStatus.viewer) {
            if (!window.comicsViewer) {
                window.comicsViewer = new EnhancedComicsViewer();
            } else if (!(window.comicsViewer instanceof EnhancedComicsViewer)) {
                // Preservar configurações existentes
                const existingZoomLevel = window.comicsViewer.zoomLevel;
                
                // Substituir por versão aprimorada
                window.comicsViewer = new EnhancedComicsViewer();
                window.comicsViewer.zoomLevel = existingZoomLevel;
            }
            componentsStatus.viewer = true;
            console.log('✅ Visualizador inicializado');
        }
        
        // Inicializar o gerenciador de rolagem
        if (!componentsStatus.scrollManager) {
            if (!window.scrollManager) {
                // Criar ScrollManager se não existir
                // (normalmente já estaria disponível no código original)
                console.log('⚠️ ScrollManager não encontrado, este componente deve ser inicializado pelo código original');
            } else {
                // Melhorar configurações
                window.scrollManager.settings = {
                    ...window.scrollManager.settings,
                    behavior: 'smooth',
                    verticalAlignment: 0.35,
                    margin: 150,
                    scrollDelay: 30
                };
                
                // Adicionar método avançado
                if (!window.scrollManager.followSelectionSmoothly) {
                    window.scrollManager.followSelectionSmoothly = function(selectionElement, options = {}) {
                        if (!selectionElement) return;
                        
                        const defaults = {
                            offsetTop: 100,
                            duration: 800,
                            easing: 'ease',
                            highlightDuration: 1500
                        };
                        
                        const settings = {...defaults, ...options};
                        
                        const rect = selectionElement.getBoundingClientRect();
                        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                        const targetTop = scrollTop + rect.top - settings.offsetTop;
                        
                        selectionElement.classList.add('current-selection-highlight');
                        
                        try {
                            window.scrollTo({
                                top: targetTop,
                                behavior: 'smooth'
                            });
                            
                            setTimeout(() => {
                                selectionElement.classList.remove('current-selection-highlight');
                            }, settings.highlightDuration);
                            
                        } catch (error) {
                            console.warn('Animação de rolagem suave não suportada, usando fallback', error);
                            window.scrollTo(0, targetTop);
                        }
                    };
                }
                
                componentsStatus.scrollManager = true;
                console.log('✅ Gerenciador de rolagem configurado');
            }
        }
        
        // Inicializar o narrador
        if (!componentsStatus.narrator) {
            if (!window.comicNarrator) {
                if (document.getElementById('enableNarration')) {
                    window.comicNarrator = new EnhancedComicNarrator();
                } else {
                    console.log('⚠️ Elementos de narração não encontrados no DOM');
                }
            } else if (!(window.comicNarrator instanceof EnhancedComicNarrator)) {
                // Preservar configurações existentes
                const existingVoice = window.comicNarrator.currentVoice;
                const existingPitch = window.comicNarrator.pitch;
                const existingRate = window.comicNarrator.rate;
                
                // Substituir por versão aprimorada
                window.comicNarrator = new EnhancedComicNarrator();
                
                // Restaurar configurações
                if (existingVoice) window.comicNarrator.currentVoice = existingVoice;
                if (existingPitch) window.comicNarrator.pitch = existingPitch;
                if (existingRate) window.comicNarrator.rate = existingRate;
            }
            
            if (window.comicNarrator) {
                componentsStatus.narrator = true;
                console.log('✅ Narrador inicializado');
            }
        }
        
        // Inicializar o gerenciador de seleção
        if (!componentsStatus.selectionManager) {
            if (!window.rectangularSelectionManager) {
                window.rectangularSelectionManager = new EnhancedRectangularSelectionManager();
            } else if (!(window.rectangularSelectionManager instanceof EnhancedRectangularSelectionManager)) {
                // Preservar seleções existentes
                const existingSelections = window.rectangularSelectionManager.selections || [];
                const existingExtractedTexts = window.rectangularSelectionManager.extractedTexts || new Map();
                
                // Substituir por versão aprimorada
                window.rectangularSelectionManager = new EnhancedRectangularSelectionManager();
                
                // Restaurar estado
                window.rectangularSelectionManager.selections = existingSelections;
                window.rectangularSelectionManager.extractedTexts = existingExtractedTexts;
                
                // Recalcular coordenadas
                if (existingSelections.length > 0 && 
                    window.rectangularSelectionManager.updateSelectionCoordinates) {
                    window.rectangularSelectionManager.updateSelectionCoordinates();
                }
            }
            
            componentsStatus.selectionManager = true;
            console.log('✅ Gerenciador de seleção inicializado');
        }
        
        // Inicializar sistemas avançados
        if (!componentsStatus.advancedSystems) {
            if (componentsStatus.viewer && 
                componentsStatus.narrator && 
                componentsStatus.selectionManager && 
                componentsStatus.scrollManager) {
                
                // Inicializar componentes avançados
                if (!window.narrationProgressBar) {
                    window.narrationProgressBar = new NarrationProgressBar();
                }
                
                if (!window.advancedNarrationSystem) {
                    window.advancedNarrationSystem = new AdvancedNarrationSystem();
                }
                
                if (!window.enhancedScrollTracker) {
                    window.enhancedScrollTracker = new EnhancedScrollTracker();
                }
                
                if (!window.enhancedVisualTransitions) {
                    window.enhancedVisualTransitions = new EnhancedVisualTransitions();
                }
                
                // Inicializar o coordenador central
                if (!window.comicReaderCoordinator) {
                    window.comicReaderCoordinator = new ComicReaderCoordinator();
                }
                
                componentsStatus.advancedSystems = true;
                console.log('✅ Sistemas avançados inicializados');
                
                // Adicionar mensagem de sucesso
                showSuccessMessage();
            }
        }
        
        // Verificar se todos os componentes estão inicializados
        if (Object.values(componentsStatus).every(status => status)) {
            console.log('🎉 Sistema de leitura automática de quadrinhos inicializado com sucesso!');
            return true;
        }
        
        return false;
    }
    
    // Função para mostrar mensagem de sucesso
    function showSuccessMessage() {
        // Criar elemento de mensagem
        const messageElement = document.createElement('div');
        messageElement.className = 'comic-reader-success';
        messageElement.innerHTML = `
            <div class="success-icon"><i class="fas fa-check-circle"></i></div>
            <div class="success-content">
                <div class="success-title">Sistema de Leitura Automática Ativado</div>
                <div class="success-text">Selecione áreas de texto nas imagens e inicie a narração para uma experiência mágica!</div>
            </div>
        `;
        
        // Estilizar a mensagem
        const style = document.createElement('style');
        style.textContent = `
            .comic-reader-success {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%) translateY(-100px);
                background: rgba(46, 204, 113, 0.9);
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 3px 15px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 15px;
                max-width: 90%;
                width: 500px;
                animation: slide-in-success 0.5s ease-out forwards,
                           slide-out-success 0.5s ease-in forwards 6s;
            }
            
            @keyframes slide-in-success {
                from { transform: translateX(-50%) translateY(-100px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            
            @keyframes slide-out-success {
                from { transform: translateX(-50%) translateY(0); opacity: 1; }
                to { transform: translateX(-50%) translateY(-100px); opacity: 0; }
            }
            
            .success-icon {
                font-size: 30px;
                color: white;
            }
            
            .success-content {
                flex: 1;
            }
            
            .success-title {
                font-weight: bold;
                margin-bottom: 5px;
                font-size: 18px;
            }
            
            .success-text {
                font-size: 14px;
                opacity: 0.9;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(messageElement);
        
        // Remover após a animação
        setTimeout(() => {
            if (document.body.contains(messageElement)) {
                document.body.removeChild(messageElement);
            }
        }, 7000);
    }
    
    // Tentar inicializar componentes
    let attempts = 0;
    const maxAttempts = 10;
    
    function attemptInitialization() {
        attempts++;
        
        if (attempts > maxAttempts) {
            console.warn(`⚠️ Não foi possível inicializar todos os componentes após ${maxAttempts} tentativas`);
            return;
        }
        
        const initialized = initializeComponents();
        
        if (!initialized) {
            // Tentar novamente após um intervalo
            setTimeout(attemptInitialization, 500);
        }
    }
    
    // Iniciar processo de inicialização
    setTimeout(attemptInitialization, 1000);
})();