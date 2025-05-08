// enhanced-comic-reader.js - Arquivo de inicialização principal

// Função para inicializar o sistema completo
function initEnhancedComicReader() {
    console.log('Inicializando sistema de leitura automática de quadrinhos...');
    
    // Verificar componentes existentes e substituí-los pelas versões aprimoradas
    if (window.comicsViewer) {
        window.comicsViewer = new EnhancedComicsViewer();
    } else {
        window.comicsViewer = new EnhancedComicsViewer();
    }
    
    if (window.comicNarrator) {
        window.comicNarrator = new EnhancedComicNarrator();
    } else if (document.getElementById('enableNarration')) {
        window.comicNarrator = new EnhancedComicNarrator();
    }
    
    if (window.rectangularSelectionManager) {
        // Preservar seleções existentes
        const existingSelections = window.rectangularSelectionManager.selections || [];
        const existingExtractedTexts = window.rectangularSelectionManager.extractedTexts || new Map();
        
        // Criar nova instância aprimorada
        window.rectangularSelectionManager = new EnhancedRectangularSelectionManager();
        
        // Restaurar estado
        window.rectangularSelectionManager.selections = existingSelections;
        window.rectangularSelectionManager.extractedTexts = existingExtractedTexts;
        
        // Recalcular coordenadas absolutas para todas as seleções existentes
        if (existingSelections.length > 0) {
            window.rectangularSelectionManager.updateSelectionCoordinates();
        }
    } else {
        window.rectangularSelectionManager = new EnhancedRectangularSelectionManager();
    }
    
    // Inicializar a barra de progresso de narração global
    if (!window.narrationProgressBar) {
        window.narrationProgressBar = new NarrationProgressBar();
    }
    
    // Configurar o ScrollManager com configurações otimizadas para narração
    if (window.scrollManager) {
        // Configurações para melhor experiência durante a narração
        window.scrollManager.settings.behavior = 'smooth';
        window.scrollManager.settings.verticalAlignment = 0.35;
        window.scrollManager.settings.margin = 150;
        window.scrollManager.settings.scrollDelay = 30;
        
        // Adicionar um método avançado para acompanhamento mais suave das seleções
        window.scrollManager.followSelectionSmoothly = function(selectionElement, options = {}) {
            if (!selectionElement) return;
            
            const defaults = {
                offsetTop: 100,   // Deslocamento acima do elemento
                duration: 800,    // Duração da animação em ms
                easing: 'ease',   // Função de easing
                highlightDuration: 1500  // Duração do destaque em ms
            };
            
            const settings = {...defaults, ...options};
            
            // Obter posição do elemento
            const rect = selectionElement.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const targetTop = scrollTop + rect.top - settings.offsetTop;
            
            // Adicionar classe de destaque temporário
            selectionElement.classList.add('current-selection-highlight');
            
            // Criar animação de rolagem personalizada
            try {
                window.scrollTo({
                    top: targetTop,
                    behavior: 'smooth'
                });
                
                // Remover destaque após duração especificada
                setTimeout(() => {
                    selectionElement.classList.remove('current-selection-highlight');
                }, settings.highlightDuration);
                
            } catch (error) {
                // Fallback para navegadores que não suportam scrollTo com opções
                console.warn('Animação de rolagem suave não suportada, usando fallback', error);
                window.scrollTo(0, targetTop);
            }
        };
    }
    
    console.log('Sistema de leitura automática de quadrinhos inicializado com sucesso!');
    
    // Verificar se há seleções prontas para narração imediata
    setTimeout(() => {
        if (window.rectangularSelectionManager && 
            window.rectangularSelectionManager.selections && 
            window.rectangularSelectionManager.selections.length > 0 &&
            window.comicNarrator) {
            
            console.log(`Detectadas ${window.rectangularSelectionManager.selections.length} seleções existentes. Pronto para narração.`);
            
            // Adicionar notificação para o usuário
            const notification = document.createElement('div');
            notification.className = 'comic-reader-notification';
            notification.innerHTML = `
                <div class="notification-icon"><i class="fas fa-info-circle"></i></div>
                <div class="notification-content">
                    <div class="notification-title">Sistema de Leitura Aprimorado</div>
                    <div class="notification-text">
                        ${window.rectangularSelectionManager.selections.length} seleções encontradas. 
                        Clique em "Iniciar Narração" para começar a leitura automática.
                    </div>
                </div>
                <div class="notification-close"><i class="fas fa-times"></i></div>
            `;
            
            // Estilizar notificação
            const style = document.createElement('style');
            style.textContent = `
                .comic-reader-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(0, 0, 0, 0.85);
                    color: white;
                    padding: 15px;
                    border-radius: 8px;
                    box-shadow: 0 3px 15px rgba(0, 0, 0, 0.3);
                    z-index: 10000;
                    max-width: 350px;
                    display: flex;
                    align-items: flex-start;
                    border-left: 4px solid #3498db;
                    animation: slide-in-notification 0.5s ease-out forwards;
                }
                
                @keyframes slide-in-notification {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                .notification-icon {
                    font-size: 1.5rem;
                    margin-right: 15px;
                    color: #3498db;
                }
                
                .notification-content {
                    flex: 1;
                }
                
                .notification-title {
                    font-weight: bold;
                    margin-bottom: 5px;
                    font-size: 1.1rem;
                }
                
                .notification-text {
                    font-size: 0.9rem;
                    line-height: 1.4;
                }
                
                .notification-close {
                    cursor: pointer;
                    padding: 5px;
                    margin: -5px;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                }
                
                .notification-close:hover {
                    opacity: 1;
                }
            `;
            
            document.head.appendChild(style);
            document.body.appendChild(notification);
            
            // Adicionar evento para fechar notificação
            notification.querySelector('.notification-close').addEventListener('click', () => {
                notification.style.animation = 'slide-out-notification 0.3s ease-in forwards';
                setTimeout(() => notification.remove(), 300);
            });
            
            // Remover automaticamente após 8 segundos
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.style.animation = 'slide-out-notification 0.3s ease-in forwards';
                    setTimeout(() => notification.remove(), 300);
                }
            }, 8000);
            
            // Adicionar animação de saída
            const exitStyle = document.createElement('style');
            exitStyle.textContent = `
                @keyframes slide-out-notification {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(exitStyle);
        }
    }, 1500);
}