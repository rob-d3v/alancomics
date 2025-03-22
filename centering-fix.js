/**
 * Correção específica para centralizar imagens que estão desalinhadas à esquerda
 */
(function() {
    // Aplicar centralização quando o documento estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', aplicarCentralizacao);
    } else {
        // Se já estiver carregado, aplicar imediatamente
        setTimeout(aplicarCentralizacao, 500);
    }

    function aplicarCentralizacao() {
        console.log("Aplicando correção para centralizar imagens...");

        // Sobrescrever função de renderização de imagens
        const originalRenderImages = window.renderImages;
        
        window.renderImages = function() {
            // Chamar função original primeiro
            if (typeof originalRenderImages === 'function') {
                originalRenderImages();
            }
            
            // Aplicar centralização após renderização
            setTimeout(centralizarImagens, 100);
        };

        // Função para centralizar as imagens
        window.centralizarImagens = function() {
            const container = document.getElementById('imageContainer');
            const items = document.querySelectorAll('.image-item');
            
            if (!container || items.length === 0) return;
            
            // Para layout vertical: centralizar horizontalmente cada imagem
            if (isVertical) {
                items.forEach(item => {
                    item.style.display = 'flex';
                    item.style.justifyContent = 'center';
                    item.style.width = '100%';
                    
                    const img = item.querySelector('img');
                    if (img) {
                        img.style.margin = '0 auto';
                    }
                });
                
                // Centralizar todo o container
                const viewer = document.getElementById('viewer');
                if (viewer) {
                    const viewerWidth = viewer.offsetWidth;
                    const containerWidth = container.offsetWidth;
                    
                    // Se o container for menor que o viewer, centralizá-lo
                    if (containerWidth < viewerWidth) {
                        const offset = (viewerWidth - containerWidth) / 2;
                        container.style.marginLeft = offset + 'px';
                    } else {
                        container.style.marginLeft = '0';
                    }
                }
            } 
            // Para layout horizontal: centralizar verticalmente cada imagem
            else {
                items.forEach(item => {
                    item.style.display = 'flex';
                    item.style.alignItems = 'center';
                    item.style.height = '100%';
                    
                    const img = item.querySelector('img');
                    if (img) {
                        img.style.margin = 'auto 0';
                    }
                });
                
                // Centralizar todo o container verticalmente
                const viewer = document.getElementById('viewer');
                if (viewer) {
                    const viewerHeight = viewer.offsetHeight;
                    const containerHeight = container.offsetHeight;
                    
                    if (containerHeight < viewerHeight) {
                        const offset = (viewerHeight - containerHeight) / 2;
                        container.style.marginTop = offset + 'px';
                    } else {
                        container.style.marginTop = '0';
                    }
                }
            }
            
            console.log("Centralização aplicada!");
        };

        // Sobrescrever ajuste de container para incluir centralização
        const originalAdjustContainer = window.adjustImageContainer;
        
        window.adjustImageContainer = function() {
            // Chamar função original
            if (typeof originalAdjustContainer === 'function') {
                originalAdjustContainer();
            }
            
            // Aplicar centralização
            setTimeout(centralizarImagens, 100);
        };

        // Corrigir centralização após mudança de direção
        const verticalBtn = document.getElementById('verticalBtn');
        const horizontalBtn = document.getElementById('horizontalBtn');
        
        if (verticalBtn) {
            const originalClick = verticalBtn.onclick;
            verticalBtn.onclick = function(e) {
                if (originalClick) originalClick.call(this, e);
                setTimeout(centralizarImagens, 300);
            };
        }
        
        if (horizontalBtn) {
            const originalClick = horizontalBtn.onclick;
            horizontalBtn.onclick = function(e) {
                if (originalClick) originalClick.call(this, e);
                setTimeout(centralizarImagens, 300);
            };
        }

        // Também centralizar durante a rolagem automática
        const originalStartScrolling = window.startScrolling;
        
        window.startScrolling = function() {
            // Primeiro centralizar
            centralizarImagens();
            
            // Depois iniciar rolagem
            if (typeof originalStartScrolling === 'function') {
                originalStartScrolling();
            }
        };

        // Aplicar centralização agora
        setTimeout(centralizarImagens, 100);
        
        // E também após um tempo maior para garantir
        setTimeout(centralizarImagens, 1000);
    }
})();
