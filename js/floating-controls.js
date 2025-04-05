/**
 * FloatingControls - Implementa controles flutuantes para a interface
 * 
 * Este módulo adiciona botões flutuantes à interface, incluindo um botão
 * de play/pause para controlar a narração sem precisar acessar a barra lateral.
 */
class FloatingControls {
    constructor() {
        // Referência ao narrador principal
        this.narrator = null;
        
        // Elementos DOM
        this.controlsContainer = null;
        this.playPauseButton = null;
        
        // Estado
        this.isNarrationActive = false;
        this.isPaused = false;
        
        // Inicializar quando o DOM estiver pronto
        this.initialize();
    }
    
    /**
     * Inicializa os controles flutuantes
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
     * Configura os controles flutuantes
     */
    setup() {
        // Obter referência ao narrador principal
        if (window.comicNarrator) {
            this.narrator = window.comicNarrator;
            console.log('FloatingControls: Conectado ao narrador principal');
            
            // Criar os elementos de controle
            this.createControlElements();
            
            // Estender os métodos do narrador para atualizar o estado dos botões
            this.extendNarratorMethods();
        } else {
            console.warn('FloatingControls: Narrador principal não encontrado');
        }
    }
    
    /**
     * Cria os elementos de controle flutuantes
     */
    createControlElements() {
        // Criar o container principal
        this.controlsContainer = document.createElement('div');
        this.controlsContainer.className = 'floating-controls';
        document.body.appendChild(this.controlsContainer);
        
        // Criar botão de play/pause para narração
        this.playPauseButton = document.createElement('button');
        this.playPauseButton.className = 'floating-button narration-play-pause';
        this.playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
        this.playPauseButton.title = 'Iniciar/Pausar narração';
        this.playPauseButton.addEventListener('click', () => this.togglePlayPause());
        this.controlsContainer.appendChild(this.playPauseButton);
        
        // Garantir que o botão de play/pause seja visível quando a narração estiver habilitada
        const narrationEnabled = document.getElementById('enableNarration')?.checked || false;
        this.playPauseButton.style.display = narrationEnabled ? 'flex' : 'none';
        
        // Adicionar um observador para o checkbox de narração
        const narrationCheckbox = document.getElementById('enableNarration');
        if (narrationCheckbox) {
            narrationCheckbox.addEventListener('change', (event) => {
                this.playPauseButton.style.display = event.target.checked ? 'flex' : 'none';
                console.log('Estado da narração alterado:', event.target.checked ? 'ativado' : 'desativado');
            });
        }
        
        // Verificar periodicamente o estado da narração para garantir que o botão seja exibido corretamente
        setInterval(() => {
            if (this.narrator && document.getElementById('enableNarration')?.checked) {
                // Garantir que o botão esteja visível quando a narração estiver habilitada
                this.playPauseButton.style.display = 'flex';
                
                // Atualizar o estado do botão com base no estado atual da narração
                if (this.narrator.isNarrating) {
                    const isPaused = window.speechSynthesis && window.speechSynthesis.paused;
                    this.updatePlayPauseButton(true, isPaused);
                }
            }
        }, 1000); // Verificar a cada segundo
        
        // Criar botão de voltar ao topo
        const topButton = document.createElement('button');
        topButton.className = 'floating-button scroll-top';
        topButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
        topButton.title = 'Voltar ao topo';
        topButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        this.controlsContainer.appendChild(topButton);
        
        // Criar botão de alternar tema
        const themeButton = document.createElement('button');
        themeButton.className = 'floating-button toggle-theme';
        themeButton.innerHTML = '<i class="fas fa-moon"></i>';
        themeButton.title = 'Alternar tema claro/escuro';
        themeButton.addEventListener('click', () => {
            if (window.themeManager) {
                window.themeManager.toggleTheme();
                // Atualizar ícone do botão
                const isDarkTheme = document.body.classList.contains('dark-theme');
                themeButton.innerHTML = isDarkTheme ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            }
        });
        this.controlsContainer.appendChild(themeButton);
        
        // Criar botão de alternar barra lateral
        const sidebarButton = document.createElement('button');
        sidebarButton.className = 'floating-button toggle-sidebar';
        sidebarButton.innerHTML = '<i class="fas fa-bars"></i>';
        sidebarButton.title = 'Alternar barra lateral';
        sidebarButton.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.toggle('open');
                // Atualizar ícone do botão
                const isOpen = sidebar.classList.contains('open');
                sidebarButton.innerHTML = isOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
            }
        });
        this.controlsContainer.appendChild(sidebarButton);
        
        // Criar botão de narração de texto
        const narrationButton = document.createElement('button');
        narrationButton.className = 'floating-button toggle-narration';
        narrationButton.innerHTML = '<i class="fas fa-headphones"></i>';
        narrationButton.title = 'Iniciar/Parar narração de texto';
        narrationButton.addEventListener('click', () => {
            if (this.narrator) {
                if (this.narrator.isNarrating) {
                    this.narrator.stopNarration();
                } else {
                    this.narrator.startNarration();
                }
            }
        });
        this.controlsContainer.appendChild(narrationButton);
    }
    
    /**
     * Estende os métodos do narrador para atualizar o estado dos botões
     */
    extendNarratorMethods() {
        if (!this.narrator) return;
        
        // Estender o método startNarration
        const originalStartNarration = this.narrator.startNarration.bind(this.narrator);
        this.narrator.startNarration = async function() {
            const result = await originalStartNarration.apply(this, arguments);
            this.isNarrating = true;
            window.floatingControls.updatePlayPauseButton(true, false);
            return result;
        };
        
        // Estender o método stopNarration
        const originalStopNarration = this.narrator.stopNarration.bind(this.narrator);
        this.narrator.stopNarration = function() {
            originalStopNarration.apply(this, arguments);
            this.isNarrating = false;
            window.floatingControls.updatePlayPauseButton(false, false);
        };
        
        // Adicionar método para pausar a narração
        if (!this.narrator.pauseNarration) {
            this.narrator.pauseNarration = function() {
                if (!this.isNarrating) return;
                
                if (window.speechSynthesis) {
                    window.speechSynthesis.pause();
                    console.log('Narração pausada');
                    window.floatingControls.updatePlayPauseButton(true, true);
                }
            };
        }
        
        // Adicionar método para retomar a narração
        if (!this.narrator.resumeNarration) {
            this.narrator.resumeNarration = function() {
                if (!this.isNarrating) return;
                
                if (window.speechSynthesis && window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                    console.log('Narração retomada');
                    window.floatingControls.updatePlayPauseButton(true, false);
                }
            };
        }
    }
    
    /**
     * Alterna entre play e pause da narração
     */
    togglePlayPause() {
        if (!this.narrator) return;
        
        // Se a narração não está ativa, iniciar
        if (!this.narrator.isNarrating) {
            this.narrator.startNarration();
            return;
        }
        
        // Se a narração está ativa, alternar entre pause e resume
        if (window.speechSynthesis.paused) {
            this.narrator.resumeNarration();
            this.updatePlayPauseButton(true, false);
        } else {
            this.narrator.pauseNarration();
            this.updatePlayPauseButton(true, true);
        }
    }
    
    /**
     * Atualiza o botão de play/pause da narração
     * @param {boolean} isActive - Se a narração está ativa
     * @param {boolean} isPaused - Se a narração está pausada
     */
    updatePlayPauseButton(isActive, isPaused) {
        if (!this.playPauseButton) return;
        
        // Atualizar visibilidade - sempre visível quando a narração está habilitada
        const narrationEnabled = document.getElementById('enableNarration')?.checked;
        this.playPauseButton.style.display = narrationEnabled ? 'flex' : 'none';
        
        // Atualizar ícone e classe
        if (isActive) {
            if (isPaused) {
                this.playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
                this.playPauseButton.classList.add('paused');
                this.playPauseButton.classList.remove('active');
            } else {
                this.playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
                this.playPauseButton.classList.remove('paused');
                this.playPauseButton.classList.add('active');
            }
        } else {
            this.playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
            this.playPauseButton.classList.remove('active', 'paused');
        }
    }
}

// Inicializar os controles flutuantes
window.floatingControls = new FloatingControls();