// Função para adicionar barra de rolagem horizontal
function enhanceHorizontalScrolling() {
    // Modificar a exibição da visualização horizontal
    const renderImagesOriginal = window.renderImages;
    
    window.renderImages = function() {
        // Chamar a função original
        if (renderImagesOriginal) renderImagesOriginal();
        
        const imageContainer = document.getElementById('imageContainer');
        const viewer = document.getElementById('viewer');
        
        if (!imageContainer || !viewer) return;
        
        // Ajustar estilos para exibir a barra de rolagem horizontal quando necessário
        if (!isVertical) {
            // Modificar o estilo do viewer para mostrar a barra de rolagem
            viewer.style.overflowX = 'auto';
            viewer.style.overflowY = 'hidden';
            
            // Ajustar o imageContainer para rolagem horizontal adequada
            imageContainer.style.width = 'auto';
            imageContainer.style.height = 'fit-content';
            imageContainer.style.maxHeight = '100%';
            imageContainer.style.display = 'flex';
            imageContainer.style.flexDirection = 'row';
            imageContainer.style.alignItems = 'center';
            
            // Garantir que o container tenha altura mínima suficiente
            imageContainer.style.minHeight = '80%';
            
            // Se necessário, adicionar padding ao container para espaçamento
            imageContainer.style.padding = '10px 0';
        } else {
            // Restaurar estilos para exibição vertical
            viewer.style.overflowX = 'hidden';
            viewer.style.overflowY = 'auto';
            
            imageContainer.style.width = 'fit-content';
            imageContainer.style.maxWidth = '100%';
            imageContainer.style.height = 'auto';
            imageContainer.style.display = 'flex';
            imageContainer.style.flexDirection = 'column';
            imageContainer.style.alignItems = 'center';
            
            // Remover possíveis estilos adicionados durante o modo horizontal
            imageContainer.style.minHeight = '';
            imageContainer.style.padding = '';
        }
        
        // Após a renderização, atualizar a exibição dos controles conforme necessário
        setTimeout(() => {
            adjustImageContainer();
            centerImages();
        }, 100);
    };
    
    // Melhorar a resposta ao trocar entre modos vertical e horizontal
    const verticalBtn = document.getElementById('verticalBtn');
    const horizontalBtn = document.getElementById('horizontalBtn');
    
    if (verticalBtn) {
        // Substituir o listener existente
        verticalBtn.removeEventListener('click', null);
        verticalBtn.addEventListener('click', () => {
            if (!isVertical) {
                isVertical = true;
                verticalBtn.classList.add('active');
                horizontalBtn.classList.remove('active');
                renderImages();
                
                // Forçar recálculo do layout após a troca
                setTimeout(() => {
                    adjustImageContainer();
                    centerImages();
                }, 200);
            }
        });
    }
    
    if (horizontalBtn) {
        // Substituir o listener existente
        horizontalBtn.removeEventListener('click', null);
        horizontalBtn.addEventListener('click', () => {
            if (isVertical) {
                isVertical = false;
                horizontalBtn.classList.add('active');
                verticalBtn.classList.remove('active');
                renderImages();
                
                // Forçar recálculo do layout após a troca
                setTimeout(() => {
                    adjustImageContainer();
                    centerImages();
                }, 200);
            }
        });
    }
}

// Adicionar CSS para melhorar a barra de rolagem horizontal
function addScrollbarStyles() {
    // Criar um elemento de estilo
    const styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    
    // Definir estilos para a barra de rolagem
    const css = `
        /* Estilizar a barra de rolagem para todos os navegadores */
        .viewer::-webkit-scrollbar {
            height: 8px;
            width: 8px;
        }
        
        .viewer::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 4px;
        }
        
        .viewer::-webkit-scrollbar-thumb {
            background: var(--primary-color, #4a6cf7);
            border-radius: 4px;
        }
        
        .viewer::-webkit-scrollbar-thumb:hover {
            background: var(--primary-color-dark, #3a5ce7);
        }
        
        /* Para Firefox */
        .viewer {
            scrollbar-width: thin;
            scrollbar-color: var(--primary-color, #4a6cf7) rgba(0, 0, 0, 0.1);
        }
        
        /* Ajustes para o modo horizontal */
        .viewer.horizontal-scroll {
            overflow-x: auto !important;
            overflow-y: hidden !important;
            scroll-behavior: smooth;
        }
        
        /* Ajustes para o modo vertical */
        .viewer.vertical-scroll {
            overflow-x: hidden !important;
            overflow-y: auto !important;
            scroll-behavior: smooth;
        }
    `;
    
    // Adicionar os estilos ao elemento
    if (styleElement.styleSheet) {
        styleElement.styleSheet.cssText = css;
    } else {
        styleElement.appendChild(document.createTextNode(css));
    }
    
    // Adicionar o elemento de estilo ao head do documento
    document.head.appendChild(styleElement);
    console.log("Estilos de barra de rolagem adicionados");
}

// Função para aplicar as melhorias de rolagem horizontal
function applyHorizontalScrollingFixes() {
    // Adicionar estilos de barra de rolagem
    addScrollbarStyles();
    
    // Aplicar melhorias de rolagem horizontal
    enhanceHorizontalScrolling();
    
    // Verificar o estado atual e aplicar as configurações corretas
    const viewer = document.getElementById('viewer');
    if (viewer) {
        if (isVertical) {
            viewer.classList.add('vertical-scroll');
            viewer.classList.remove('horizontal-scroll');
        } else {
            viewer.classList.add('horizontal-scroll');
            viewer.classList.remove('vertical-scroll');
        }
    }
}