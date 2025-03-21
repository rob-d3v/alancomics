// 1. Correção da rolagem vertical que para inesperadamente

// Função aprimorada para rolagem contínua
function startScrolling() {
    stopScrolling();

    if (images.length === 0) {
        return;
    }

    autoScrolling = true;

    if (scrollPosition <= 0) {
        scrollPosition = 0;
    }

    const startBtn = document.getElementById('startScrollingBtn');
    if (startBtn) {
        startBtn.innerHTML = '<i class="fas fa-play"></i> Rolando...';
        startBtn.style.opacity = '0.7';
    }

    // Iniciar o timer de contagem regressiva
    startCountdownTimer(3);
}

// Função para iniciar contagem regressiva
function startCountdownTimer(seconds) {
    // Criar ou obter o elemento de timer
    let timerElement = document.getElementById('countdownTimer');
    if (!timerElement) {
        timerElement = document.createElement('div');
        timerElement.id = 'countdownTimer';
        document.body.appendChild(timerElement);
    }

    timerElement.classList.add('countdown-timer');
    timerElement.style.display = 'flex';
    timerElement.textContent = seconds;

    // Mostrar a contagem regressiva
    const countdownInterval = setInterval(() => {
        seconds--;
        timerElement.textContent = seconds;

        if (seconds <= 0) {
            clearInterval(countdownInterval);
            timerElement.style.display = 'none';

            // Iniciar a rolagem real após a contagem regressiva
            startActualScrolling();
        }
    }, 1000);
}

// Função que realmente inicia a rolagem após contagem
function startActualScrolling() {
    let lastTime = null;
    let lastScrollPosition = scrollPosition;
    let stuckCounter = 0;

    function animate(timestamp) {
        if (!autoScrolling) return;

        if (!lastTime) lastTime = timestamp;
        const deltaTime = timestamp - lastTime;

        // Velocidade de rolagem aprimorada e mais consistente
        const pixelsPerSecond = scrollSpeed * 5;
        const increment = (pixelsPerSecond * deltaTime) / 1000;

        // Atualizar posição de rolagem
        scrollPosition += increment;
        updateScrollPosition();
        updateProgressIndicator();

        // Verificar se a rolagem está travada (mesma posição por muitos frames)
        if (Math.abs(scrollPosition - lastScrollPosition) < 0.01) {
            stuckCounter++;

            // Se ficar preso por muito tempo (30 frames), forçar um movimento
            if (stuckCounter > 30) {
                scrollPosition += 1; // Força um pequeno movimento
                stuckCounter = 0;
            }
        } else {
            stuckCounter = 0;
        }

        lastScrollPosition = scrollPosition;
        lastTime = timestamp;
        scrollInterval = requestAnimationFrame(animate);
    }

    scrollInterval = requestAnimationFrame(animate);
}

// 2. Adicionar botão para excluir todas as imagens
function addClearAllButton() {
    const thumbnailSection = document.querySelector('.section:nth-child(3)');
    if (!thumbnailSection) return;

    // Verificar se o botão já existe
    if (document.getElementById('clearAllBtn')) return;

    const sectionTitle = thumbnailSection.querySelector('.section-title');

    // Criar o botão de lixeira
    const clearAllBtn = document.createElement('button');
    clearAllBtn.id = 'clearAllBtn';
    clearAllBtn.className = 'clear-all-btn';
    clearAllBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
    clearAllBtn.title = 'Excluir todas as imagens';

    // Colocar o botão ao lado do título
    if (sectionTitle) {
        sectionTitle.style.display = 'flex';
        sectionTitle.style.justifyContent = 'space-between';
        sectionTitle.style.alignItems = 'center';
        sectionTitle.appendChild(clearAllBtn);

        // Adicionar evento de clique
        clearAllBtn.addEventListener('click', clearAllImages);
    }
}

// Função para excluir todas as imagens
function clearAllImages() {
    if (images.length === 0) return;

    if (confirm('Tem certeza que deseja excluir todas as imagens?')) {
        try {
            if (!db) {
                alert("Erro: banco de dados não inicializado");
                return;
            }

            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = function () {
                images = [];
                updateImageCounter();
                renderThumbnails();
                renderImages();

                // Parar rolagem se estiver acontecendo
                if (autoScrolling) {
                    stopScrolling();
                }
            };

            request.onerror = function (event) {
                alert("Erro ao excluir todas as imagens do banco de dados");
            };
        } catch (error) {
            alert("Erro ao excluir imagens: " + error.message);
        }
    }
}

// 3. Corrigir problemas de zoom e espaçamento
function fixZoomAndSpacing() {
    // Garantir espaçamento máximo no topo
    const MAX_TOP_SPACING = 10; // pixels

    // Corrigir função centerImages para limitar espaçamento no topo
    window.centerImages = function () {
        const viewer = document.getElementById('viewer');
        const imageContainer = document.getElementById('imageContainer');

        if (!viewer || !imageContainer) return;

        const viewerRect = viewer.getBoundingClientRect();
        const containerRect = imageContainer.getBoundingClientRect();

        if (autoScrolling) return;

        let offsetX = 0;
        let offsetY = 0;

        if (containerRect.width * currentZoom < viewerRect.width) {
            offsetX = (viewerRect.width - containerRect.width * currentZoom) / 2;
        }

        // Limitar espaçamento superior para no máximo MAX_TOP_SPACING pixels
        if (containerRect.height * currentZoom < viewerRect.height) {
            offsetY = Math.min(MAX_TOP_SPACING, (viewerRect.height - containerRect.height * currentZoom) / 2);
        } else {
            offsetY = MAX_TOP_SPACING; // Sempre garantir o espaçamento máximo
        }

        if (isVertical) {
            imageContainer.style.transform = `translateY(${offsetY - scrollPosition}px) scale(${currentZoom})`;
        } else {
            imageContainer.style.transform = `translateX(${offsetX - scrollPosition}px) scale(${currentZoom})`;
        }
    };
}

// Função melhorada para corrigir o zoom
function improveZoom() {
    // Corrigir função zoomAtPoint para melhor precisão
    window.zoomAtPoint = function (pointX, pointY) {
        const imageContainer = document.getElementById('imageContainer');
        const viewer = document.getElementById('viewer');

        if (!imageContainer || !viewer) return;

        // Armazenar scale antigo para calcular razão
        const oldZoom = parseFloat(imageContainer.style.transform.match(/scale\(([^)]+)\)/)
            ? parseFloat(imageContainer.style.transform.match(/scale\(([^)]+)\)/)[1])
            : 1);

        // Calcular posição do ponto em coordenadas "não escaladas"
        const containerRect = imageContainer.getBoundingClientRect();
        const unscaledX = (pointX - containerRect.left + viewer.scrollLeft) / oldZoom;
        const unscaledY = (pointY - containerRect.top + viewer.scrollTop) / oldZoom;

        // Aplicar nova escala
        imageContainer.style.transform = `scale(${currentZoom})`;

        // Calcular nova posição após escala
        const scaledX = unscaledX * currentZoom;
        const scaledY = unscaledY * currentZoom;

        // Calcular quanto o ponto se moveu
        const deltaX = scaledX - pointX;
        const deltaY = scaledY - pointY;

        // Atualizar posição de rolagem para compensar
        if (isVertical) {
            scrollPosition += deltaY;
        } else {
            scrollPosition += deltaX;
        }

        // Aplicar posição de rolagem com limite para o topo
        if (isVertical) {
            const offset = Math.min(10, containerRect.top);
            imageContainer.style.transform = `translateY(${offset - scrollPosition}px) scale(${currentZoom})`;
        } else {
            imageContainer.style.transform = `translateX(-${scrollPosition}px) scale(${currentZoom})`;
        }

        // Adicionar indicador visual de onde está o zoom
        addZoomIndicator(pointX, pointY);

        adjustImageContainer();
        updateProgressIndicator();
    };
}

// Indicador visual de local do zoom
function addZoomIndicator(x, y) {
    // Remover indicador anterior se existir
    const oldIndicator = document.getElementById('zoomIndicator');
    if (oldIndicator) {
        oldIndicator.remove();
    }

    // Criar novo indicador
    const indicator = document.createElement('div');
    indicator.id = 'zoomIndicator';
    indicator.style.position = 'absolute';
    indicator.style.left = `${x - 15}px`;
    indicator.style.top = `${y - 15}px`;
    indicator.style.width = '30px';
    indicator.style.height = '30px';
    indicator.style.borderRadius = '50%';
    indicator.style.border = '2px solid var(--primary-color)';
    indicator.style.backgroundColor = 'rgba(var(--primary-color-rgb, 67, 97, 238), 0.3)';
    indicator.style.pointerEvents = 'none';
    indicator.style.zIndex = '1000';
    indicator.style.transition = 'opacity 0.5s ease';

    document.body.appendChild(indicator);

    // Remover após um tempo
    setTimeout(() => {
        indicator.style.opacity = '0';
        setTimeout(() => indicator.remove(), 500);
    }, 1000);
}

// 4. Atualizar CSS para o timer de contagem e botão de limpar

// Função principal para aplicar todas as correções
function applyAllFixes() {
    // Substituir a função startScrolling original
    window.startScrolling = startScrolling;

    // Adicionar botão de limpar todas imagens
    addClearAllButton();

    // Corrigir zoom e espaçamento
    fixZoomAndSpacing();
    improveZoom();

    // Inicializar tudo novamente
    if (typeof enhanceInit === 'function') {
        enhanceInit();
    }
}
// fixes.js - Correção para problema de rolagem automática

// Substituição da função de rolagem automática
function enhancedScrolling() {
    // Função melhorada para iniciar a rolagem
    window.startScrolling = function () {
        // Primeiro para qualquer rolagem existente
        stopScrolling();

        if (images.length === 0) {
            console.log("Nenhuma imagem para rolar");
            return;
        }

        console.log("Iniciando rolagem automática");
        autoScrolling = true;

        // Desativar controles da sidebar enquanto rola
        toggleSidebarControls(true);

        const startBtn = document.getElementById('startScrollingBtn');
        if (startBtn) {
            startBtn.innerHTML = '<i class="fas fa-play"></i> Rolando...';
            startBtn.style.opacity = '0.7';
            startBtn.classList.add('active');
        }

        // Garantir que a posição inicial seja válida
        if (scrollPosition < 0) {
            scrollPosition = 0;
        }

        // Usar RequestAnimationFrame para rolagem suave
        let lastTimestamp = null;
        let accumulatedTime = 0;

        function scrollStep(timestamp) {
            if (!autoScrolling) return;

            // Calcular delta de tempo
            if (lastTimestamp === null) {
                lastTimestamp = timestamp;
            }
            const deltaTime = timestamp - lastTimestamp;
            lastTimestamp = timestamp;

            // Acumular tempo para tornar a animação mais estável
            accumulatedTime += deltaTime;

            // Atualizar posição de rolagem a cada 16ms (aprox. 60fps)
            if (accumulatedTime >= 16) {
                // Pixel por segundo baseado na velocidade configurada
                const pixelsPerSecond = scrollSpeed * 8;
                const increment = (pixelsPerSecond * accumulatedTime) / 1000;

                // Aplicar movimento
                scrollPosition += increment;

                // Aplicar a nova posição
                applyScrollPosition();

                // Verificar limites após o movimento
                checkScrollLimits();

                // Resetar tempo acumulado
                accumulatedTime = 0;

                // Atualizar indicador de progresso
                updateProgressIndicator();

                // Log para debug (remover em produção)
                if (window.scrollDebug) {
                    console.log(`Scroll: pos=${scrollPosition.toFixed(2)}, speed=${scrollSpeed}, incr=${increment.toFixed(2)}`);
                }
            }

            // Continuar animação
            scrollInterval = requestAnimationFrame(scrollStep);
        }

        // Iniciar animação
        scrollInterval = requestAnimationFrame(scrollStep);
        console.log("Rolagem iniciada com requestAnimationFrame");
    };

    // Função melhorada para aplicar a posição de rolagem
    function applyScrollPosition() {
        const imageContainer = document.getElementById('imageContainer');
        const viewer = document.getElementById('viewer');
        if (!imageContainer || !viewer) return;

        // Certificar-se de que a posição de rolagem nunca é negativa
        scrollPosition = Math.max(0, scrollPosition);

        // Calcular qualquer offset necessário para centralização
        const viewerRect = viewer.getBoundingClientRect();
        const containerRect = imageContainer.getBoundingClientRect();

        let offsetX = 0;
        let offsetY = 0;

        // Centralizar horizontalmente se o conteúdo for menor que o visualizador
        if (isVertical && containerRect.width * currentZoom < viewerRect.width) {
            offsetX = (viewerRect.width - containerRect.width * currentZoom) / (2 * currentZoom);
        }

        // Centralizar verticalmente se o conteúdo for menor que o visualizador
        if (!isVertical && containerRect.height * currentZoom < viewerRect.height) {
            offsetY = (viewerRect.height - containerRect.height * currentZoom) / (2 * currentZoom);
        }

        // Aplicar transformação com base na direção e offsets
        if (isVertical) {
            imageContainer.style.transform = `translateY(-${scrollPosition}px) translateX(${offsetX}px) scale(${currentZoom})`;
        } else {
            imageContainer.style.transform = `translateX(-${scrollPosition}px) translateY(${offsetY}px) scale(${currentZoom})`;
        }

        // Debug
        if (window.scrollDebug) {
            console.log(`Applied scroll: pos=${scrollPosition}, offsets=(${offsetX},${offsetY}), zoom=${currentZoom}`);
        }
    }

    // Função para verificar limites de rolagem
    function checkScrollLimits() {
        const imageContainer = document.getElementById('imageContainer');
        const viewer = document.getElementById('viewer');

        if (!imageContainer || !viewer || images.length === 0) {
            return;
        }

        // Obter todos os itens de imagem para calcular o tamanho real do conteúdo
        const imageItems = imageContainer.querySelectorAll('.image-item');
        if (imageItems.length === 0) return false;

        // Calcular o tamanho total real do conteúdo incluindo espaçamento
        let totalContentSize = 0;

        if (isVertical) {
            // Para vertical somamos a altura de cada item + espaçamento
            imageItems.forEach((item, idx) => {
                totalContentSize += item.offsetHeight;
                // Adicionar espaçamento entre itens, exceto para o último
                if (idx < imageItems.length - 1) {
                    totalContentSize += imageSpacing;
                }
            });

            // Adicionar margem superior para evitar que comece muito no topo
            totalContentSize += 20; // Pequena margem extra no final
        } else {
            // Para horizontal somamos a largura de cada item + espaçamento
            imageItems.forEach((item, idx) => {
                totalContentSize += item.offsetWidth;
                // Adicionar espaçamento entre itens, exceto para o último
                if (idx < imageItems.length - 1) {
                    totalContentSize += imageSpacing;
                }
            });

            // Adicionar margem lateral extra
            totalContentSize += 20; // Pequena margem extra no final
        }

        // Calcular os limites de rolagem
        const viewerRect = viewer.getBoundingClientRect();

        // O total que pode ser rolado é o tamanho do conteúdo menos o tamanho visível
        let maxScroll;
        if (isVertical) {
            // Espaço total menos altura do visualizador, considerando zoom
            maxScroll = Math.max(0, (totalContentSize * currentZoom - viewerRect.height) / currentZoom);
        } else {
            // Espaço total menos largura do visualizador, considerando zoom
            maxScroll = Math.max(0, (totalContentSize * currentZoom - viewerRect.width) / currentZoom);
        }

        // Debug
        if (window.scrollDebug) {
            console.log("Total content:", totalContentSize, "Max scroll:", maxScroll);
        }

        // Verificar se chegamos ao fim da rolagem
        // if (scrollPosition >= maxScroll && autoScrolling && maxScroll > 0) {
        //     console.log("Fim da rolagem atingido:", scrollPosition, maxScroll);
        //     stopScrolling();
        //     return true;
        // }

        return false;
    }

    // Sobrescrever a função updateScrollPosition para garantir aplicação correta
    window.updateScrollPosition = function () {
        applyScrollPosition();
        checkScrollLimits();
    };

    // Melhorar a função de parada de rolagem
    window.stopScrolling = function () {
        if (scrollInterval) {
            // if (typeof scrollInterval === 'number') {
            //     cancelAnimationFrame(scrollInterval);
            //     console.log("Rolagem interrompida (cancelAnimationFrame)");
            // } else {
            //     clearInterval(scrollInterval);
            //     console.log("Rolagem interrompida (clearInterval)");
            // }

            autoScrolling = false;
            scrollInterval = null;

            // Re-ativar controles da sidebar
            toggleSidebarControls(false);

            const startBtn = document.getElementById('startScrollingBtn');
            if (startBtn) {
                startBtn.innerHTML = '<i class="fas fa-play"></i> Iniciar Rolagem Automática';
                startBtn.style.opacity = '1';
                startBtn.classList.remove('active');
            }
        }
    };

    // Adicionar debug toggle para solução de problemas
    function addDebugControls() {
        window.scrollDebug = false;

        // Adicionar um botão oculto que pode ser ativado com Alt+D
        document.addEventListener('keydown', function (e) {
            if (e.altKey && e.key === 'd') {
                window.scrollDebug = !window.scrollDebug;
                console.log(`Debug de rolagem ${window.scrollDebug ? 'ativado' : 'desativado'}`);

                // Mostrar indicador visual
                let debugIndicator = document.getElementById('debugIndicator');
                if (!debugIndicator && window.scrollDebug) {
                    debugIndicator = document.createElement('div');
                    debugIndicator.id = 'debugIndicator';
                    debugIndicator.style.position = 'fixed';
                    debugIndicator.style.bottom = '10px';
                    debugIndicator.style.right = '10px';
                    debugIndicator.style.background = 'rgba(255,0,0,0.7)';
                    debugIndicator.style.color = 'white';
                    debugIndicator.style.padding = '5px 10px';
                    debugIndicator.style.borderRadius = '5px';
                    debugIndicator.style.zIndex = '9999';
                    debugIndicator.style.fontSize = '12px';
                    debugIndicator.textContent = 'DEBUG ATIVO';
                    document.body.appendChild(debugIndicator);
                } else if (debugIndicator && !window.scrollDebug) {
                    debugIndicator.remove();
                }
            }
        });
    }

    // Inicializar as melhorias
    addDebugControls();
    console.log("Melhorias de rolagem aplicadas");
}

// Correções para problemas de zoom que podem afetar a rolagem
function fixZoomIssues() {
    // Melhorar função de reset de zoom para garantir estado consistente
    window.resetZoom = function () {
        currentZoom = 1.0;
        scrollPosition = 0;

        const imageContainer = document.getElementById('imageContainer');
        if (imageContainer) {
            if (isVertical) {
                imageContainer.style.transform = `translateY(0) scale(1)`;
            } else {
                imageContainer.style.transform = `translateX(0) scale(1)`;
            }
        }

        centerImages();
    };

    // Garantir que o CSS TransformOrigin esteja correto
    window.adjustTransformOrigin = function () {
        const imageContainer = document.getElementById('imageContainer');
        if (!imageContainer) return;

        if (isVertical) {
            imageContainer.style.transformOrigin = 'center top';
        } else {
            imageContainer.style.transformOrigin = 'left center';
        }
    };

    // Corrigir aplicação do zoom
    const origUpdateZoom = window.updateZoom;
    window.updateZoom = function () {
        adjustTransformOrigin();
        if (origUpdateZoom) origUpdateZoom();
    };
}

// Melhorar tratamento de espaçamento entre imagens
function fixImageSpacing() {
    // Melhorar renderização para lidar com espaçamento negativo corretamente
    const origRenderImages = window.renderImages;
    window.renderImages = function () {
        if (origRenderImages) origRenderImages();

        // Ajustar containers após renderização
        setTimeout(() => {
            adjustImageContainer();
            centerImages();

            // Aplica TransformOrigin correto
            adjustTransformOrigin();

            console.log("Imagens renderizadas e ajustadas");
        }, 200);
    };
}

// Inicializar todas as correções quando o documento estiver pronto
function initializeAllFixes() {
    console.log("Aplicando correções para problemas de rolagem...");
    enhancedScrolling();
    fixZoomIssues();
    fixImageSpacing();
    addDiagnosticTools();

    // Garantir que as correções sejam aplicadas mesmo após recarga
    const origInit = window.init;
    window.init = function () {
        if (origInit) origInit();
        setTimeout(() => {
            console.log("Re-aplicando correções após inicialização...");
            enhancedScrolling();
            fixZoomIssues();
        }, 500);
    };
}

// Executar inicialização
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAllFixes);
} else {
    initializeAllFixes();
}
// Executar as correções quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', applyAllFixes);

// Se o documento já estiver carregado, aplicar imediatamente
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    applyAllFixes();
}