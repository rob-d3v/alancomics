/**
 * Correção mínima para problemas de zoom e posicionamento
 * Sem limites que cortam as imagens e sem duplicação
 */

(function() {
    // Verificar quando o DOM estiver carregado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', aplicarCorrecoes);
    } else {
        // Se já estiver carregado, aplicar imediatamente
        setTimeout(aplicarCorrecoes, 500);
    }

    function aplicarCorrecoes() {
        console.log("Aplicando correções mínimas...");

        // 1. Corrigir problema de zoom que joga imagem para fora
        corrigirZoom();

        // 2. Implementar sistema básico de posicionamento manual
        implementarPosicionamento();

        // 3. Corrigir problemas de corte nas laterais
        corrigirCorte();

        // 4. Corrigir problema de duplicação na rolagem automática
        corrigirRolagemAutomatica();
    }

    // 1. Corrigir problema de zoom
    function corrigirZoom() {
        // Substituir o gerenciamento de zoom para manter a visibilidade
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const resetZoomBtn = document.getElementById('resetZoomBtn');

        if (zoomInBtn) {
            zoomInBtn.onclick = function() {
                // Limitar zoom máximo
                if (currentZoom < 5.0) {
                    currentZoom += 0.1;
                }
                aplicarZoom();
            };
        }

        if (zoomOutBtn) {
            zoomOutBtn.onclick = function() {
                // Limitar zoom mínimo
                if (currentZoom > 0.2) {
                    currentZoom -= 0.1;
                }
                aplicarZoom();
            };
        }

        if (resetZoomBtn) {
            resetZoomBtn.onclick = function() {
                // Resetar zoom e posição
                currentZoom = 1.0;
                scrollPosition = 0;
                
                // Reajustar container sem limites
                ajustarContainer();
                
                // Centralizar na tela
                setTimeout(function() {
                    centralizarConteudo();
                }, 50);
            };
        }

        // Função para aplicar zoom seguro
        function aplicarZoom() {
            const imageContainer = document.getElementById('imageContainer');
            if (!imageContainer) return;

            // Aplicar escala sem restringir posição
            if (isVertical) {
                imageContainer.style.transform = `translateY(-${scrollPosition}px) scale(${currentZoom})`;
            } else {
                imageContainer.style.transform = `translateX(-${scrollPosition}px) scale(${currentZoom})`;
            }
        }
    }

    // 2. Implementar sistema básico de posicionamento manual
    function implementarPosicionamento() {
        const viewer = document.getElementById('viewer');
        const imageContainer = document.getElementById('imageContainer');
        
        if (!viewer || !imageContainer) return;
        
        let isDragging = false;
        let startX, startY;
        let startScrollPos;
        
        // Iniciar arrasto
        viewer.addEventListener('mousedown', function(e) {
            if (e.button !== 0 || autoScrolling) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startScrollPos = scrollPosition;
            
            viewer.style.cursor = 'grabbing';
            
            e.preventDefault();
        });
        
        // Mover durante arrasto
        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            
            const deltaX = startX - e.clientX;
            const deltaY = startY - e.clientY;
            
            // Calcular nova posição
            if (isVertical) {
                scrollPosition = startScrollPos + (deltaY / currentZoom);
            } else {
                scrollPosition = startScrollPos + (deltaX / currentZoom);
            }
            
            // Manter positivo
            scrollPosition = Math.max(0, scrollPosition);
            
            // Aplicar posição sem restrições
            if (isVertical) {
                imageContainer.style.transform = `translateY(-${scrollPosition}px) scale(${currentZoom})`;
            } else {
                imageContainer.style.transform = `translateX(-${scrollPosition}px) scale(${currentZoom})`;
            }
            
            // Atualizar barra de progresso
            if (typeof updateProgressIndicator === 'function') {
                updateProgressIndicator();
            }
            
            e.preventDefault();
        });
        
        // Finalizar arrasto
        document.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                viewer.style.cursor = 'grab';
            }
        });
        
        // Também suportar eventos touch
        viewer.addEventListener('touchstart', function(e) {
            if (autoScrolling || e.touches.length !== 1) return;
            
            isDragging = true;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startScrollPos = scrollPosition;
            
            e.preventDefault();
        }, {passive: false});
        
        document.addEventListener('touchmove', function(e) {
            if (!isDragging || e.touches.length !== 1) return;
            
            const deltaX = startX - e.touches[0].clientX;
            const deltaY = startY - e.touches[0].clientY;
            
            if (isVertical) {
                scrollPosition = startScrollPos + (deltaY / currentZoom);
            } else {
                scrollPosition = startScrollPos + (deltaX / currentZoom);
            }
            
            scrollPosition = Math.max(0, scrollPosition);
            
            if (isVertical) {
                imageContainer.style.transform = `translateY(-${scrollPosition}px) scale(${currentZoom})`;
            } else {
                imageContainer.style.transform = `translateX(-${scrollPosition}px) scale(${currentZoom})`;
            }
            
            if (typeof updateProgressIndicator === 'function') {
                updateProgressIndicator();
            }
            
            e.preventDefault();
        }, {passive: false});
        
        document.addEventListener('touchend', function() {
            isDragging = false;
        });
        
        // Ajustar estilos de cursor
        viewer.style.cursor = 'grab';
    }

    // 3. Corrigir problemas de corte nas laterais
    function corrigirCorte() {
        // Substituir a função de ajuste de container para não cortar nada
        window.ajustarContainer = function() {
            const imageContainer = document.getElementById('imageContainer');
            const viewer = document.getElementById('viewer');
            
            if (!imageContainer || !viewer || images.length === 0) return;
            
            // Remover margens e limites
            imageContainer.style.margin = '0';
            imageContainer.style.padding = '0';
            imageContainer.style.width = '';
            imageContainer.style.height = '';
            
            // Reajustar imagens sem restrições de tamanho
            const items = document.querySelectorAll('.image-item');
            if (items.length === 0) return;
            
            // Calcular dimensões necessárias
            let totalWidth = 0;
            let totalHeight = 0;
            
            items.forEach((item, index) => {
                const img = item.querySelector('img');
                if (!img) return;
                
                // Garantir que as imagens não sejam restritas
                img.style.maxWidth = 'none';
                img.style.maxHeight = 'none';
                
                // Manter proporção original
                const ratio = img.naturalWidth / img.naturalHeight;
                
                // Calcular tamanho baseado no modo de visualização
                if (isVertical) {
                    // Para modo vertical
                    const maxWidth = viewer.offsetWidth * 0.95;
                    const width = Math.min(img.naturalWidth, maxWidth);
                    const height = width / ratio;
                    
                    // Aplicar tamanho
                    img.style.width = `${width}px`;
                    img.style.height = `${height}px`;
                    
                    // Adicionar ao tamanho total
                    totalHeight += height;
                    totalWidth = Math.max(totalWidth, width);
                    
                    // Adicionar espaçamento
                    if (index < items.length - 1) {
                        totalHeight += Math.max(0, imageSpacing);
                    }
                } else {
                    // Para modo horizontal
                    const maxHeight = viewer.offsetHeight * 0.95;
                    const height = Math.min(img.naturalHeight, maxHeight);
                    const width = height * ratio;
                    
                    // Aplicar tamanho
                    img.style.height = `${height}px`;
                    img.style.width = `${width}px`;
                    
                    // Adicionar ao tamanho total
                    totalWidth += width;
                    totalHeight = Math.max(totalHeight, height);
                    
                    // Adicionar espaçamento
                    if (index < items.length - 1) {
                        totalWidth += Math.max(0, imageSpacing);
                    }
                }
            });
            
            // Definir dimensões do container
            if (isVertical) {
                imageContainer.style.width = `${totalWidth}px`;
                imageContainer.style.height = `${totalHeight}px`;
            } else {
                imageContainer.style.width = `${totalWidth}px`;
                imageContainer.style.height = `${totalHeight}px`;
            }
            
            // Adicionar espaço no final
            if (isVertical) {
                imageContainer.style.paddingBottom = '50px';
            } else {
                imageContainer.style.paddingRight = '50px';
            }
            
            // Resetar scroll position
            scrollPosition = 0;
            
            // Aplicar transformação inicial
            if (isVertical) {
                imageContainer.style.transform = `translateY(0) scale(${currentZoom})`;
            } else {
                imageContainer.style.transform = `translateX(0) scale(${currentZoom})`;
            }
            
            // Atualizar barra de progresso
            if (typeof updateProgressIndicator === 'function') {
                updateProgressIndicator();
            }
        };
        
        // Substituir a função adjustImageContainer original
        if (typeof window.adjustImageContainer === 'function') {
            window.adjustImageContainer = window.ajustarContainer;
        }
        
        // Chamar ajuste imediatamente
        setTimeout(function() {
            ajustarContainer();
        }, 200);
    }

    // 4. Corrigir problema de duplicação na rolagem automática
    function corrigirRolagemAutomatica() {
        // Substituir a função startScrolling para evitar duplicações
        const originalStartScrolling = window.startScrolling;
        
        window.startScrolling = function() {
            // Parar qualquer rolagem anterior
            if (typeof stopScrolling === 'function') {
                stopScrolling();
            }
            
            // Ativar flag de auto-scroll
            autoScrolling = true;
            
            // Desativar controles da sidebar
            if (typeof toggleSidebarControls === 'function') {
                toggleSidebarControls(true);
            }
            
            // Atualizar botão de start
            const startBtn = document.getElementById('startScrollingBtn');
            if (startBtn) {
                startBtn.innerHTML = '<i class="fas fa-play"></i> Rolando...';
                startBtn.style.opacity = '0.7';
            }
            
            // Reajustar container e posição ANTES de iniciar rolagem
            scrollPosition = 0;
            
            // Centralizar o conteúdo
            centralizarConteudo();
            
            // Usar requestAnimationFrame para rolagem suave
            let lastTimestamp = null;
            
            function animar(timestamp) {
                if (!autoScrolling) return;
                
                // Calcular delta de tempo
                if (lastTimestamp === null) {
                    lastTimestamp = timestamp;
                }
                const delta = timestamp - lastTimestamp;
                lastTimestamp = timestamp;
                
                // Calcular incremento baseado na velocidade
                const incremento = (scrollSpeed * delta) / 100;
                
                // Atualizar posição
                scrollPosition += incremento;
                
                // Aplicar nova posição
                const imageContainer = document.getElementById('imageContainer');
                if (!imageContainer) return;
                
                // Verificar se chegou ao final do conteúdo
                const viewerEl = document.getElementById('viewer');
                if (viewerEl) {
                    const viewerRect = viewerEl.getBoundingClientRect();
                    const containerRect = imageContainer.getBoundingClientRect();
                    
                    // Calcular máximo de rolagem
                    let maxScroll = 0;
                    if (isVertical) {
                        maxScroll = Math.max(0, (containerRect.height - viewerRect.height) / currentZoom);
                    } else {
                        maxScroll = Math.max(0, (containerRect.width - viewerRect.width) / currentZoom);
                    }
                    
                    // Se chegou ao final, voltar ao início
                    if (scrollPosition > maxScroll && maxScroll > 0) {
                        scrollPosition = 0;
                    }
                }
                
                // Aplicar transformação
                if (isVertical) {
                    imageContainer.style.transform = `translateY(-${scrollPosition}px) scale(${currentZoom})`;
                } else {
                    imageContainer.style.transform = `translateX(-${scrollPosition}px) scale(${currentZoom})`;
                }
                
                // Atualizar barra de progresso
                if (typeof updateProgressIndicator === 'function') {
                    updateProgressIndicator();
                }
                
                // Continuar a animação
                scrollInterval = requestAnimationFrame(animar);
            }
            
            // Iniciar animação
            scrollInterval = requestAnimationFrame(animar);
        };
    }

    // Função auxiliar para centralizar conteúdo
    function centralizarConteudo() {
        const imageContainer = document.getElementById('imageContainer');
        const viewer = document.getElementById('viewer');
        
        if (!imageContainer || !viewer) return;
        
        // Calcular posição central
        const containerRect = imageContainer.getBoundingClientRect();
        const viewerRect = viewer.getBoundingClientRect();
        
        // Se o container for menor que o viewer, centralizar
        if (containerRect.width < viewerRect.width) {
            const offsetX = (viewerRect.width - containerRect.width) / 2;
            imageContainer.style.marginLeft = `${offsetX}px`;
        } else {
            imageContainer.style.marginLeft = '0';
        }
        
        if (containerRect.height < viewerRect.height) {
            const offsetY = (viewerRect.height - containerRect.height) / 2;
            imageContainer.style.marginTop = `${offsetY}px`;
        } else {
            imageContainer.style.marginTop = '0';
        }
    }
})();