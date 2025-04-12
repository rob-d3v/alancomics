/**
 * OCRControls - Gerencia os controles de OCR e seleção retangular de texto em imagens
 * 
 * Este módulo controla a interface de usuário para ativar/desativar o OCR e
 * a seleção retangular de texto em imagens, integrando com o RectangularSelectionManager.
 */
class OCRControls {
    constructor() {
        // Elementos DOM
        this.enableOCRCheckbox = document.getElementById('enableOCR');
        this.ocrControls = document.getElementById('ocrControls');
        this.selectRectangularTextBtn = document.getElementById('selectRectangularTextBtn');
        
        // Referência ao gerenciador de seleção retangular
        this.rectangularSelectionManager = null;
        
        // Estado
        this.isOCREnabled = false;
        
        // Inicializar
        this.initialize();
    }
    
    /**
     * Inicializa os controles de OCR
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
     * Configura os controles de OCR
     */
    setup() {
        // Verificar se os elementos existem
        if (!this.enableOCRCheckbox || !this.ocrControls || !this.selectRectangularTextBtn) {
            console.error('OCRControls: Elementos DOM não encontrados');
            return;
        }
        
        // Obter referência ao gerenciador de seleção retangular
        if (window.rectangularSelectionManager) {
            this.rectangularSelectionManager = window.rectangularSelectionManager;
            console.log('OCRControls: Conectado ao gerenciador de seleção retangular');
        } else {
            console.warn('OCRControls: Gerenciador de seleção retangular não encontrado');
            // Tentar novamente após um curto período
            setTimeout(() => {
                if (window.rectangularSelectionManager) {
                    this.rectangularSelectionManager = window.rectangularSelectionManager;
                    console.log('OCRControls: Conectado ao gerenciador de seleção retangular (tentativa 2)');
                }
            }, 1000);
        }
        
        // Configurar eventos
        this.setupEventListeners();
    }
    
    /**
     * Configura os listeners de eventos
     */
    setupEventListeners() {
        // Evento de alteração do checkbox de OCR
        this.enableOCRCheckbox.addEventListener('change', () => {
            this.toggleOCR();
        });
        
        // Evento de clique no botão de seleção retangular
        this.selectRectangularTextBtn.addEventListener('click', () => {
            this.activateRectangularSelection();
        });
    }
    
    /**
     * Alterna o estado do OCR (ativado/desativado)
     */
    toggleOCR() {
        this.isOCREnabled = this.enableOCRCheckbox.checked;
        
        if (this.isOCREnabled) {
            // Ativar OCR
            this.ocrControls.classList.remove('disabled');
            console.log('OCR ativado');
            
            // Mostrar notificação
            this.showNotification('Seleção de texto em imagens ativada. Clique no botão "Selecionar trechos de texto" para iniciar.', 'info');
        } else {
            // Desativar OCR
            this.ocrControls.classList.add('disabled');
            console.log('OCR desativado');
            
            // Desativar modo de seleção se estiver ativo
            if (this.rectangularSelectionManager && this.rectangularSelectionManager.isSelectionModeActive) {
                this.rectangularSelectionManager.disableSelectionMode();
            }
            
            // Mostrar notificação
            this.showNotification('Seleção de texto em imagens desativada.', 'info');
        }
    }
    
    /**
     * Ativa o modo de seleção retangular
     */
    activateRectangularSelection() {
        if (!this.isOCREnabled) {
            console.warn('OCR não está ativado');
            return;
        }
        
        if (!this.rectangularSelectionManager) {
            console.error('Gerenciador de seleção retangular não disponível');
            this.showNotification('Erro: Gerenciador de seleção retangular não disponível. Tente recarregar a página.', 'error');
            return;
        }
        
        // Ativar modo de seleção
        this.rectangularSelectionManager.toggleSelectionMode();
        
        // Atualizar estado do botão
        if (this.rectangularSelectionManager.isSelectionModeActive) {
            this.selectRectangularTextBtn.classList.add('active');
            this.showNotification('Modo de seleção ativado. Desenhe retângulos sobre o texto que deseja extrair. Cada seleção será confirmada automaticamente.', 'info');
        } else {
            this.selectRectangularTextBtn.classList.remove('active');
        }
    }
    
    /**
     * Mostra uma notificação na interface
     * @param {string} message - Mensagem a ser exibida
     * @param {string} type - Tipo de notificação (info, success, error, warning)
     */
    showNotification(message, type = 'info') {
        // Verificar se já existe um elemento de notificação
        let notification = document.querySelector('.ocr-notification');
        
        // Criar elemento de notificação se não existir
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'ocr-notification';
            document.body.appendChild(notification);
        }
        
        // Definir classe de tipo
        notification.className = `ocr-notification ${type}`;
        
        // Definir mensagem
        notification.textContent = message;
        
        // Mostrar notificação
        notification.style.display = 'block';
        
        // Ocultar após 3 segundos
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

// Inicializar controles de OCR
document.addEventListener('DOMContentLoaded', () => {
    window.ocrControls = new OCRControls();
});