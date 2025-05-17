/**
 * SmartPauseSystem - Sistema de Pausa Inteligente para Narração
 * 
 * Este módulo implementa um sistema que verifica se o texto sendo narrado está visível
 * na tela do usuário e controla a narração para garantir que o usuário veja o que está
 * sendo narrado exatamente de onde foi coletado.
 */
class SmartPauseSystem {
    constructor() {
        // Configurações do sistema
        this.visibilityThreshold = 0.5; // Porcentagem mínima do elemento que deve estar visível (50%)
        this.waitTimeBeforeNext = 800; // Tempo de espera em ms antes de verificar o próximo elemento
        this.checkInterval = 200; // Intervalo em ms para verificar visibilidade durante narração
        
        // Estado do sistema
        this.isActive = false;
        this.currentElement = null;
        this.narrationStartTime = null;
        this.visibilityCheckTimer = null;
        this.waitingForVisibility = false;
        
        // Referências a outros módulos
        this.narrator = null;
        this.selectionManager = null;
        
        // Inicializar
        this.initialize();
    }
    
    /**
     * Inicializa o sistema de pausa inteligente
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
     * Configura o sistema de pausa inteligente
     */
    setup() {
        // Obter referência ao narrador principal
        if (window.comicNarrator) {
            this.narrator = window.comicNarrator;
            console.log('SmartPauseSystem: Conectado ao narrador principal');
        } else {
            console.warn('SmartPauseSystem: Narrador principal não encontrado');
            // Tentar novamente após um curto período
            setTimeout(() => {
                if (window.comicNarrator) {
                    this.narrator = window.comicNarrator;
                    console.log('SmartPauseSystem: Conectado ao narrador principal (tentativa 2)');
                }
            }, 1000);
        }
        
        // Obter referência ao gerenciador de seleção retangular
        if (window.rectangularSelectionManager) {
            this.selectionManager = window.rectangularSelectionManager;
            console.log('SmartPauseSystem: Conectado ao gerenciador de seleção retangular');
        } else {
            console.warn('SmartPauseSystem: Gerenciador de seleção retangular não encontrado');
            // Tentar novamente após um curto período
            setTimeout(() => {
                if (window.rectangularSelectionManager) {
                    this.selectionManager = window.rectangularSelectionManager;
                    console.log('SmartPauseSystem: Conectado ao gerenciador de seleção retangular (tentativa 2)');
                }
            }, 1000);
        }
        
        // Registrar o sistema globalmente para acesso de outros módulos
        window.smartPauseSystem = this;
        console.log('SmartPauseSystem: Sistema de pausa inteligente inicializado');
    }
    
    /**
     * Ativa o sistema de pausa inteligente
     */
    activate() {
        if (this.isActive) return;
        
        this.isActive = true;
        console.log('SmartPauseSystem: Sistema de pausa inteligente ativado');
    }
    
    /**
     * Desativa o sistema de pausa inteligente
     */
    deactivate() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.stopVisibilityCheck();
        console.log('SmartPauseSystem: Sistema de pausa inteligente desativado');
    }
    
    /**
     * Verifica se um elemento está visível na tela
     * @param {HTMLElement} element - Elemento a ser verificado
     * @returns {Object} - Objeto com informações de visibilidade
     */
    checkElementVisibility(element) {
        // Valores padrão para coordenadas quando o elemento não existe
        const defaultCoordinates = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            width: 0,
            height: 0
        };
        
        // Se o elemento não existir, retornar objeto com coordenadas padrão
        if (!element) {
            return { 
                isVisible: false, 
                visiblePercentage: 0,
                position: 'elemento inexistente',
                coordinates: defaultCoordinates
            };
        }
        
        // Verificar se o elemento está realmente no DOM
        if (!document.body.contains(element)) {
            return { 
                isVisible: false, 
                visiblePercentage: 0,
                position: 'elemento não está no DOM',
                coordinates: defaultCoordinates
            };
        }
        
        // Verificar se o elemento está oculto via CSS
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return { 
                isVisible: false, 
                visiblePercentage: 0,
                position: 'elemento oculto via CSS',
                coordinates: defaultCoordinates
            };
        }
        
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;
        
        // Extrair coordenadas do elemento para uso em todos os casos de retorno
        const coordinates = {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
            height: rect.height
        };
        
        // Verificar se o elemento tem dimensões muito pequenas (pode ser um erro)
        if (rect.width < 2 || rect.height < 2) {
            return { 
                isVisible: false, 
                visiblePercentage: 0, 
                position: 'dimensões muito pequenas',
                coordinates: coordinates
            };
        }
        
        // Verificar se o elemento está completamente fora da tela
        if (
            rect.bottom < 0 ||
            rect.top > windowHeight ||
            rect.right < 0 ||
            rect.left > windowWidth
        ) {
            return { 
                isVisible: false, 
                visiblePercentage: 0, 
                position: 'fora da tela',
                coordinates: coordinates
            };
        }
        
        // Calcular a área total do elemento
        const elementArea = rect.width * rect.height;
        if (elementArea === 0) {
            return { 
                isVisible: false, 
                visiblePercentage: 0, 
                position: 'área zero',
                coordinates: coordinates
            };
        }
        
        // Calcular a área visível do elemento
        const visibleTop = Math.max(0, rect.top);
        const visibleBottom = Math.min(windowHeight, rect.bottom);
        const visibleLeft = Math.max(0, rect.left);
        const visibleRight = Math.min(windowWidth, rect.right);
        
        const visibleWidth = Math.max(0, visibleRight - visibleLeft);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const visibleArea = visibleWidth * visibleHeight;
        
        // Calcular a porcentagem visível (garantir que não seja negativa)
        const visiblePercentage = Math.max(0, Math.min(1, visibleArea / elementArea));
        
        // Determinar a posição do elemento na tela
        let position = '';
        if (rect.top < 0) position += 'acima ';
        if (rect.bottom > windowHeight) position += 'abaixo ';
        if (rect.left < 0) position += 'à esquerda ';
        if (rect.right > windowWidth) position += 'à direita ';
        if (!position) position = 'totalmente visível';
        
        // Verificar se o elemento está suficientemente visível
        const isVisible = visiblePercentage >= this.visibilityThreshold;
        
        return {
            isVisible,
            visiblePercentage,
            position,
            coordinates: coordinates
        };
    }
    
    /**
     * Inicia a verificação contínua de visibilidade durante a narração
     * @param {HTMLElement} element - Elemento a ser verificado
     */
    startVisibilityCheck(element) {
        if (!this.isActive || !element) return;
        
        // Parar qualquer verificação anterior que possa estar em andamento
        this.stopVisibilityCheck();
        
        this.currentElement = element;
        this.narrationStartTime = Date.now();
        this.waitingForVisibility = false; // Iniciar como falso para verificar corretamente no primeiro ciclo
        this.checkCounter = 0; // Contador para controlar frequência de logs
        
        // Registrar início da narração com timestamp e coordenadas
        const visibility = this.checkElementVisibility(element);
        console.log(`🔊 [${new Date().toISOString()}] Iniciando narração - Elemento: ${element.id || 'sem ID'}`);
        console.log(`📍 Coordenadas: (${visibility.coordinates.left}, ${visibility.coordinates.top}) - (${visibility.coordinates.right}, ${visibility.coordinates.bottom})`);
        console.log(`👁️ Visibilidade inicial: ${Math.round(visibility.visiblePercentage * 100)}% - ${visibility.position}`);
        
        // Verificar visibilidade inicial
        this.checkAndWaitForVisibility(element);
        
        // Usar um intervalo maior para reduzir a quantidade de verificações
        // e evitar sobrecarga de logs e processamento
        const checkInterval = Math.max(500, this.checkInterval); // Mínimo de 500ms entre verificações
        
        // Iniciar verificação periódica
        this.visibilityCheckTimer = setInterval(() => {
            this.checkCounter++;
            this.checkAndWaitForVisibility(element);
        }, checkInterval);
    }
    
    /**
     * Para a verificação de visibilidade
     */
    stopVisibilityCheck() {
        if (this.visibilityCheckTimer) {
            clearInterval(this.visibilityCheckTimer);
            this.visibilityCheckTimer = null;
        }
        
        this.waitingForVisibility = false;
        this.currentElement = null;
    }
    
    /**
     * Verifica a visibilidade e aguarda se necessário
     * @param {HTMLElement} element - Elemento a ser verificado
     */
    checkAndWaitForVisibility(element) {
        if (!this.isActive || !element) return;
        
        // Verificar se o elemento ainda existe no DOM
        if (!document.body.contains(element)) {
            console.log(`⚠️ [${new Date().toISOString()}] Elemento não está mais no DOM, parando verificação`);
            this.stopVisibilityCheck();
            return;
        }
        
        const visibility = this.checkElementVisibility(element);
        
        // Variável para controlar se o estado mudou e precisamos registrar
        let stateChanged = false;
        
        // Se o elemento não estiver suficientemente visível, pausar a narração
        if (!visibility.isVisible && this.narrator && this.narrator.synth.speaking && !this.waitingForVisibility) {
            // Só registrar log quando o estado mudar (não estava esperando e agora está)
            console.log(`⏸️ [${new Date().toISOString()}] Pausando narração - Elemento não visível (${Math.round(visibility.visiblePercentage * 100)}%)`);
            this.narrator.pauseSpeech();
            this.waitingForVisibility = true;
            stateChanged = true;
        }
        // Se o elemento estiver visível e a narração estiver pausada, retomar
        else if (visibility.isVisible && this.narrator && this.narrator.synth.paused && this.waitingForVisibility) {
            // Só registrar log quando o estado mudar (estava esperando e agora não está)
            console.log(`▶️ [${new Date().toISOString()}] Retomando narração - Elemento visível (${Math.round(visibility.visiblePercentage * 100)}%)`);
            this.narrator.resumeSpeech();
            this.waitingForVisibility = false;
            stateChanged = true;
        }
        
        // Registrar informações de depuração apenas quando o estado mudar ou periodicamente
        if (stateChanged) {
            // Log detalhado apenas quando o estado muda
            console.log(`📊 Detalhes de visibilidade: ${Math.round(visibility.visiblePercentage * 100)}% - ${visibility.position}`);
        } else if (this.checkCounter % 10 === 0) {
            // Log periódico a cada 10 verificações para depuração, mas apenas se estiver esperando visibilidade
            if (this.waitingForVisibility) {
                console.log(`🔍 [${new Date().toISOString()}] Verificação periódica: ${Math.round(visibility.visiblePercentage * 100)}% - ${visibility.position}`);
            }
        }
        
        // Se a narração terminou, parar a verificação
        if (this.narrator && !this.narrator.synth.speaking && !this.narrator.synth.paused) {
            this.stopVisibilityCheck();
        }
    }
    
    /**
     * Verifica se o próximo elemento está visível antes de prosseguir com a narração
     * @param {HTMLElement} nextElement - Próximo elemento a ser narrado
     * @returns {Promise} - Promise que resolve quando o elemento estiver visível
     */
    waitForNextElementVisibility(nextElement) {
        return new Promise(resolve => {
            if (!this.isActive || !nextElement) {
                resolve(true);
                return;
            }
            
            const checkVisibility = () => {
                const visibility = this.checkElementVisibility(nextElement);
                
                if (visibility.isVisible) {
                    console.log(`✅ [${new Date().toISOString()}] Próximo elemento visível (${Math.round(visibility.visiblePercentage * 100)}%) - Continuando narração`);
                    resolve(true);
                } else {
                    console.log(`⏳ [${new Date().toISOString()}] Aguardando próximo elemento ficar visível (${Math.round(visibility.visiblePercentage * 100)}%)`);
                    setTimeout(checkVisibility, this.waitTimeBeforeNext);
                }
            };
            
            // Iniciar verificação após um pequeno atraso
            setTimeout(checkVisibility, this.waitTimeBeforeNext);
        });
    }
    
    /**
     * Processa um elemento antes da narração
     * @param {HTMLElement} element - Elemento a ser processado
     * @param {number} index - Índice do elemento na lista de seleções
     * @returns {Promise} - Promise que resolve quando o elemento estiver pronto para narração
     */
    async processElementBeforeNarration(element, index) {
        if (!this.isActive || !element) return true;
        
        // Verificar visibilidade inicial
        const visibility = this.checkElementVisibility(element);
        
        // Registrar informações do elemento
        console.log(`🔍 [${new Date().toISOString()}] Verificando elemento #${index + 1} antes da narração:`);
        console.log(`📍 Coordenadas: (${visibility.coordinates.left}, ${visibility.coordinates.top}) - (${visibility.coordinates.right}, ${visibility.coordinates.bottom})`);
        console.log(`👁️ Visibilidade: ${Math.round(visibility.visiblePercentage * 100)}% - ${visibility.position}`);
        
        // Se o elemento não estiver visível, rolar até ele
        if (!visibility.isVisible) {
            console.log(`🔄 [${new Date().toISOString()}] Rolando para o elemento #${index + 1} (não visível)`);
            
            // Usar o ScrollManager para rolar até o elemento
            if (this.selectionManager && this.selectionManager.scrollManager) {
                this.selectionManager.scrollManager.setCurrentElement(element);
                
                // Aguardar um tempo para a rolagem ser concluída
                await new Promise(resolve => setTimeout(resolve, 800));
                
                // Verificar novamente a visibilidade após a rolagem
                const newVisibility = this.checkElementVisibility(element);
                console.log(`👁️ Visibilidade após rolagem: ${Math.round(newVisibility.visiblePercentage * 100)}% - ${newVisibility.position}`);
                
                // Se ainda não estiver visível o suficiente, aguardar mais
                if (!newVisibility.isVisible) {
                    console.log(`⏳ [${new Date().toISOString()}] Aguardando elemento #${index + 1} ficar mais visível...`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
        
        return true;
    }
}

// Inicializar o sistema de pausa inteligente quando o script for carregado
const smartPauseSystem = new SmartPauseSystem();