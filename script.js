let db;
const dbName = 'AlanComicsDB';
const storeName = 'images';

let images = [];
let currentZoom = 1;
let isVertical = true;
let scrollSpeed = 3;
let imageSpacing = 10;
let scrollInterval;
let scrollPosition = 0;
let autoScrolling = false;
let manualScrollStep = 50;
let autoCenter = false;
let currentIndex = 0;
let isFullscreen = false;
let spacing = 20;

// Variáveis para controle de arrasto
let isDragging = false;
let startX = 0;
let startY = 0;
let scrollLeft = 0;
let scrollTop = 0;
let currentX = 0;
let currentY = 0;
let dragThreshold = 5; // Pixels mínimos para iniciar o drag
let boundaryPadding = 50; // Pixels de padding nas bordas

// Variável para controlar o debounce da troca de temas
let themeChangeTimeout;
let currentTheme = 'light-theme';

// Function to limit scrolling to keep images visible
function limitScrollPosition() {
    const imageContainer = document.getElementById('imageContainer');
    const viewer = document.getElementById('viewer');

    if (!imageContainer || !viewer || images.length === 0) {
        return;
    }

    const viewerRect = viewer.getBoundingClientRect();
    const firstImage = imageContainer.firstElementChild;
    const lastImage = imageContainer.lastElementChild;

    if (!firstImage || !lastImage) return;

    const firstImageRect = firstImage.getBoundingClientRect();
    const lastImageRect = lastImage.getBoundingClientRect();

    // Calculate actual margins we want to maintain (in pixels)
    const minMargin = 2; // 2px from edges as requested

    if (isVertical) {
        // For vertical scrolling
        // Limit scrolling at the top
        if (firstImageRect.top < viewerRect.top + minMargin) {
            // First image is too high, adjust down
            const adjustment = (viewerRect.top + minMargin) - firstImageRect.top;
            scrollPosition -= adjustment / currentZoom;
        }

        // Limit scrolling at the bottom
        if (lastImageRect.bottom > viewerRect.bottom - minMargin) {
            // This is fine, the last image can extend below the view
        } else if (images.length > 1 && lastImageRect.bottom < viewerRect.bottom - minMargin) {
            // Last image is too high, we have extra space at bottom
            // Only adjust if we're not at the top already
            if (firstImageRect.top > viewerRect.top + minMargin) {
                const adjustment = (viewerRect.bottom - minMargin) - lastImageRect.bottom;
                scrollPosition -= adjustment / currentZoom;
            }
        }
    } else {
        // For horizontal scrolling
        // Limit scrolling at the left
        if (firstImageRect.left < viewerRect.left + minMargin) {
            // First image is too far left, adjust right
            const adjustment = (viewerRect.left + minMargin) - firstImageRect.left;
            scrollPosition -= adjustment / currentZoom;
        }

        // Limit scrolling at the right
        if (lastImageRect.right > viewerRect.right - minMargin) {
            // This is fine, the last image can extend beyond the right edge
        } else if (images.length > 1 && lastImageRect.right < viewerRect.right - minMargin) {
            // Last image is too far left, we have extra space at right
            // Only adjust if we're not at the left already
            if (firstImageRect.left > viewerRect.left + minMargin) {
                const adjustment = (viewerRect.right - minMargin) - lastImageRect.right;
                scrollPosition -= adjustment / currentZoom;
            }
        }
    }

    // Update the scroll position after calculations
    updateScrollPosition();
}

// Modify updateZoom function to use the limitation
function updateZoom() {
    const imageContainer = document.getElementById('imageContainer');
    const viewer = document.getElementById('viewer');

    if (!imageContainer || !viewer) {
        return;
    }

    // Store the viewer's dimensions and position
    const viewerRect = viewer.getBoundingClientRect();

    // Calculate the current center point in the viewer
    const viewerCenterX = viewerRect.width / 2;
    const viewerCenterY = viewerRect.height / 2;

    // Get the current mouse position relative to the container before scaling
    // We're using the center of the viewer as reference point
    const containerRect = imageContainer.getBoundingClientRect();

    // Calculate the point in the image container that's currently at the center of the viewer
    // This needs to account for the current scroll position and zoom
    const pointX = viewerCenterX - containerRect.left + scrollPosition * (isVertical ? 0 : 1);
    const pointY = viewerCenterY - containerRect.top + scrollPosition * (isVertical ? 1 : 0);

    // Calculate what that point would be after scaling
    const scaleRatio = currentZoom / (imageContainer.style.transform ?
        parseFloat(imageContainer.style.transform.match(/scale\(([^)]+)\)/)[1]) : 1);

    // Apply the new zoom scale
    imageContainer.style.transform = `scale(${currentZoom})`;

    // Calculate where that same point would be after scaling
    const newContainerRect = imageContainer.getBoundingClientRect();
    const newPointX = (pointX * scaleRatio) + newContainerRect.left - viewerCenterX;
    const newPointY = (pointY * scaleRatio) + newContainerRect.top - viewerCenterY;

    // Update scroll position to keep the same point centered
    if (isVertical) {
        scrollPosition = newPointY;
    } else {
        scrollPosition = newPointX;
    }

    // Make sure we don't scroll past the bounds
    if (scrollPosition < 0) scrollPosition = 0;

    // Apply the scroll position
    if (isVertical) {
        imageContainer.style.transform = `translateY(-${scrollPosition}px) scale(${currentZoom})`;
    } else {
        imageContainer.style.transform = `translateX(-${scrollPosition}px) scale(${currentZoom})`;
    }

    // Limit scroll to keep images visible
    limitScrollPosition();

    adjustImageContainer();
    updateProgressIndicator();
}

// Update updateScrollPosition to use the limit
function updateScrollPosition() {
    const imageContainer = document.getElementById('imageContainer');
    const viewer = document.getElementById('viewer');

    if (!imageContainer || !viewer) {
        return;
    }

    const viewerRect = viewer.getBoundingClientRect();

    // Calcular as dimensões reais considerando o zoom
    const containerRect = {
        width: imageContainer.scrollWidth * currentZoom,
        height: imageContainer.scrollHeight * currentZoom
    };

    // Calcular o máximo de rolagem possível
    let maxScroll;
    if (isVertical) {
        maxScroll = Math.max(0, containerRect.height - viewerRect.height);
    } else {
        maxScroll = Math.max(0, containerRect.width - viewerRect.width);
    }

    // Limitar a posição de rolagem para não ultrapassar os limites
    scrollPosition = Math.max(0, Math.min(scrollPosition, maxScroll));

    // Aplicar transformação com base na direção
    if (isVertical) {
        imageContainer.style.transform = `translateY(-${scrollPosition}px) scale(${currentZoom})`;
    } else {
        imageContainer.style.transform = `translateX(-${scrollPosition}px) scale(${currentZoom})`;
    }

    // Parar rolagem automática se chegou ao final
    if (scrollPosition >= maxScroll && autoScrolling) {
        stopScrolling();
    }

    // Manter centralização se estiver ativa
    if (autoCenter) {
        centerImages();
    }

    updateProgressIndicator();
}

// Function to disable/enable sidebar controls
function toggleSidebarControls(disabled) {
    // Get all interactive elements in the sidebar
    const sidebarButtons = document.querySelectorAll('.sidebar button:not(#stopScrollingBtn)');
    const sidebarInputs = document.querySelectorAll('.sidebar input');
    const directionButtons = document.querySelectorAll('.direction-btn');
    const sidebar = document.querySelector('.sidebar');
    const viewer = document.getElementById('viewer');

    // Fixar a posição da sidebar e do viewer durante a rolagem
    if (disabled) {
        if (sidebar) {
            sidebar.style.position = 'fixed';
            sidebar.style.top = '0';
            sidebar.style.left = '0';
            sidebar.style.height = '100vh';
            sidebar.style.zIndex = '1000';
        }
        if (viewer) {
            viewer.style.position = 'fixed';
            viewer.style.top = '0';
            viewer.style.right = '0';
            viewer.style.width = 'calc(100% - 300px)';
            viewer.style.height = '100vh';
            viewer.style.zIndex = '999';
        }
    } else {
        if (sidebar) {
            sidebar.style.position = '';
            sidebar.style.top = '';
            sidebar.style.left = '';
            sidebar.style.height = '';
            sidebar.style.zIndex = '';
        }
        if (viewer) {
            viewer.style.position = '';
            viewer.style.top = '';
            viewer.style.right = '';
            viewer.style.width = '';
            viewer.style.height = '';
            viewer.style.zIndex = '';
        }
    }

    // Set disabled state for all controls
    sidebarButtons.forEach(button => {
        button.disabled = disabled;
        if (disabled) {
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
        } else {
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
        }
    });

    sidebarInputs.forEach(input => {
        input.disabled = disabled;
        if (disabled) {
            input.style.opacity = '0.5';
            input.style.cursor = 'not-allowed';
        } else {
            input.style.opacity = '1';
            input.style.cursor = 'pointer';
        }
    });

    directionButtons.forEach(button => {
        if (disabled) {
            button.style.pointerEvents = 'none';
            button.style.opacity = '0.5';
        } else {
            button.style.pointerEvents = 'auto';
            button.style.opacity = '1';
        }
    });

    // Always enable the stop scrolling button
    const stopScrollingBtn = document.getElementById('stopScrollingBtn');
    if (stopScrollingBtn) {
        stopScrollingBtn.disabled = false;
        stopScrollingBtn.style.opacity = '1';
        stopScrollingBtn.style.cursor = 'pointer';
    }
}

function stopScrolling() {
    if (scrollInterval) {
        if (typeof scrollInterval === 'number') {
            cancelAnimationFrame(scrollInterval);
        } else {
            clearInterval(scrollInterval);
        }
        autoScrolling = false;
        scrollInterval = null;

        // Re-enable sidebar controls
        toggleSidebarControls(false);

        const startBtn = document.getElementById('startScrollingBtn');
        if (startBtn) {
            startBtn.innerHTML = '<i class="fas fa-play"></i> Iniciar Rolagem Automática';
            startBtn.style.opacity = '1';
        }
    }
}

// Modify zoomAtPoint to use the limit
function zoomAtPoint(pointX, pointY) {
    const imageContainer = document.getElementById('imageContainer');
    const viewer = document.getElementById('viewer');
    if (!imageContainer || !viewer) return;

    // Armazenar a escala anterior
    const oldZoom = parseFloat(imageContainer.style.transform.match(/scale\(([^)]+)\)/)
        ? parseFloat(imageContainer.style.transform.match(/scale\(([^)]+)\)/)[1])
        : 1);

    // Calcular o ponto relativo ao container antes do zoom
    const containerRect = imageContainer.getBoundingClientRect();
    const viewerRect = viewer.getBoundingClientRect();
    
    // Calcular o centro do viewer
    const viewerCenterX = viewerRect.width / 2;
    const viewerCenterY = viewerRect.height / 2;
    
    // Calcular o ponto relativo ao container
    const containerX = pointX - containerRect.left;
    const containerY = pointY - containerRect.top;
    
    // Calcular a proporção do zoom
    const scaleRatio = currentZoom / oldZoom;
    
    // Calcular o novo ponto após o zoom
    const newContainerX = containerX * scaleRatio;
    const newContainerY = containerY * scaleRatio;
    
    // Calcular o deslocamento necessário para manter o ponto sob o cursor
    const deltaX = newContainerX - containerX;
    const deltaY = newContainerY - containerY;
    
    // Calcular o centro do container
    const containerCenterX = containerRect.width / 2;
    const containerCenterY = containerRect.height / 2;
    
    // Calcular o deslocamento do centro
    const centerOffsetX = containerCenterX - viewerCenterX;
    const centerOffsetY = containerCenterY - viewerCenterY;
    
    // Atualizar a posição de rolagem mantendo o centro
    if (isVertical) {
        scrollPosition = centerOffsetY + deltaY;
    } else {
        scrollPosition = centerOffsetX + deltaX;
    }
    
    // Limitar a posição de rolagem
    const maxX = (containerRect.width * currentZoom - viewerRect.width) / 2;
    const maxY = (containerRect.height * currentZoom - viewerRect.height) / 2;
    
    if (isVertical) {
        scrollPosition = Math.max(0, Math.min(scrollPosition, maxY));
    } else {
        scrollPosition = Math.max(0, Math.min(scrollPosition, maxX));
    }
    
    // Aplicar a transformação mantendo o centro
    if (isVertical) {
        imageContainer.style.transform = `translateY(-${scrollPosition}px) scale(${currentZoom})`;
    } else {
        imageContainer.style.transform = `translateX(-${scrollPosition}px) scale(${currentZoom})`;
    }
    
    // Atualizar a barra de progresso
    updateProgressIndicator();
}

// Update scrollManually to use the limit
function scrollManually(direction) {
    const viewer = document.querySelector('.viewer');
    const scrollAmount = 100; // Quantidade fixa de scroll

    if (direction === 'up') {
        viewer.scrollTop -= scrollAmount;
    } else if (direction === 'down') {
        viewer.scrollTop += scrollAmount;
    } else if (direction === 'left') {
        viewer.scrollLeft -= scrollAmount;
    } else if (direction === 'right') {
        viewer.scrollLeft += scrollAmount;
    }
}

// Update enhanceZoomControls to use the limit
function enhanceZoomControls() {
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetZoomBtn = document.getElementById('resetZoomBtn');

    if (zoomInBtn) {
        zoomInBtn.removeEventListener('click', null);
        zoomInBtn.addEventListener('click', () => {
            // Get viewer center point
            const viewer = document.getElementById('viewer');
            const viewerRect = viewer.getBoundingClientRect();
            const centerX = viewerRect.width / 2;
            const centerY = viewerRect.height / 2;

            currentZoom += 0.1;
            zoomAtPoint(centerX, centerY);

            // Limit scroll to keep images visible
            limitScrollPosition();
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.removeEventListener('click', null);
        zoomOutBtn.addEventListener('click', () => {
            // Get viewer center point
            const viewer = document.getElementById('viewer');
            const viewerRect = viewer.getBoundingClientRect();
            const centerX = viewerRect.width / 2;
            const centerY = viewerRect.height / 2;

            if (currentZoom > 0.1) {
                currentZoom -= 0.1;
                zoomAtPoint(centerX, centerY);

                // Limit scroll to keep images visible
                limitScrollPosition();
            }
        });
    }

    if (resetZoomBtn) {
        resetZoomBtn.removeEventListener('click', null);
        resetZoomBtn.addEventListener('click', () => {
            currentZoom = 1;
            resetScrollPosition();
            adjustImageContainer();
            centerImages();

            // Limit scroll to keep images visible
            limitScrollPosition();
        });
    }

    // Set up wheel zooming
    setupWheelZoom();
}

// Update setupWheelZoom to use the limit
function setupWheelZoom() {
    const viewer = document.getElementById('viewer');
    if (!viewer) return;

    viewer.addEventListener('wheel', function (e) {
        // Only zoom if Ctrl key is pressed (standard zoom behavior)
        if (e.ctrlKey) {
            e.preventDefault();

            // Store current mouse position relative to container
            const imageContainer = document.getElementById('imageContainer');
            const containerRect = imageContainer.getBoundingClientRect();
            const mouseX = e.clientX - containerRect.left;
            const mouseY = e.clientY - containerRect.top;

            // Determine zoom direction
            if (e.deltaY < 0) {
                // Zoom in
                currentZoom += 0.1;
            } else {
                // Zoom out
                if (currentZoom > 0.1) {
                    currentZoom -= 0.1;
                }
            }

            // Update zoom while maintaining focus on mouse position
            zoomAtPoint(mouseX, mouseY);

            // Limit scroll to keep images visible
            limitScrollPosition();
        }
    }, { passive: false });
}

// Update centerImages to check limitations after centering
function centerImages() {
    const viewer = document.getElementById('viewer');
    const imageContainer = document.getElementById('imageContainer');
    
    if (!viewer || !imageContainer) return;
    
    const viewerRect = viewer.getBoundingClientRect();
    const containerRect = imageContainer.getBoundingClientRect();
    
    if (autoScrolling) return;
    
    // Calcular offsets para centralização
    let offsetX = 0;
    let offsetY = 0;
    
    if (isVertical) {
        // Para rolagem vertical, centralizar horizontalmente
        if (containerRect.width < viewerRect.width) {
            offsetX = (viewerRect.width - containerRect.width) / 2;
        }
    } else {
        // Para rolagem horizontal, centralizar verticalmente
        if (containerRect.height < viewerRect.height) {
            offsetY = (viewerRect.height - containerRect.height) / 2;
        }
    }
    
    // Aplicar transformação mantendo o zoom atual
    if (isVertical) {
        imageContainer.style.transform = `translateX(${offsetX}px) translateY(${offsetY - scrollPosition}px) scale(${currentZoom})`;
    } else {
        imageContainer.style.transform = `translateX(${offsetX - scrollPosition}px) translateY(${offsetY}px) scale(${currentZoom})`;
    }
}

// Call limitScrollPosition when rendering images
function renderImages() {
    const imageContainer = document.getElementById('imageContainer');
    const viewer = document.getElementById('viewer');

    if (!imageContainer || !viewer) {
        return;
    }

    imageContainer.innerHTML = '';
    stopScrolling();

    if (images.length === 0) {
        const noImages = document.createElement('div');
        noImages.className = 'no-images';
        noImages.textContent = 'Nenhuma imagem carregada. Adicione imagens usando o painel à esquerda.';
        imageContainer.appendChild(noImages);
        return;
    }

    viewer.classList.remove('vertical-scroll', 'horizontal-scroll');
    viewer.classList.add(isVertical ? 'vertical-scroll' : 'horizontal-scroll');

    // Configurar o container baseado na direção
    if (isVertical) {
        imageContainer.style.width = '100%';
        imageContainer.style.height = 'auto';
        imageContainer.style.display = 'flex';
        imageContainer.style.flexDirection = 'column';
        imageContainer.style.alignItems = 'center';
    } else {
        imageContainer.style.width = 'auto';
        imageContainer.style.height = '100%';
        imageContainer.style.display = 'flex';
        imageContainer.style.flexDirection = 'row';
        imageContainer.style.alignItems = 'center';
    }

    // Renderizar cada imagem
    images.forEach((image, index) => {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';

        // Aplicar espaçamento
        if (index > 0) {
            if (isVertical) {
                imageItem.style.marginTop = `${imageSpacing}px`;
            } else {
                imageItem.style.marginLeft = `${imageSpacing}px`;
            }
        }

        const img = document.createElement('img');
        img.src = image.data;
        img.alt = image.name;
        img.loading = "lazy";

        // Configurar o carregamento da imagem
        img.onload = function() {
            // Ajustar dimensões após o carregamento
            adjustImageContainer();
            
            // Resetar a posição de rolagem para começar pela primeira imagem
            scrollPosition = 0;
            
            // Aplicar a transformação inicial
            if (isVertical) {
                imageContainer.style.transform = `translateY(0) scale(${currentZoom})`;
            } else {
                imageContainer.style.transform = `translateX(0) scale(${currentZoom})`;
            }
            
            // Atualizar a barra de progresso
            updateProgressIndicator();
        };

        imageItem.appendChild(img);
        imageContainer.appendChild(imageItem);
    });

    // Ajustar dimensões iniciais
    adjustImageContainer();
    
    // Atualizar botões de navegação
    updateNavigationButtons();
    
    // Atualizar a barra de progresso
    updateProgressIndicator();

    initDragSystem();
}

function init() {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const dropArea = document.getElementById('dropArea');
    const thumbnailContainer = document.getElementById('thumbnailContainer');
    const imageContainer = document.getElementById('imageContainer');
    const viewer = document.getElementById('viewer');
    const speedControl = document.getElementById('speedControl');
    const speedValue = document.getElementById('speedValue');

    // Modificar o range para suportar valores decimais (0.1 a 10)
    if (speedControl) {
        speedControl.min = "0.1";  // Valor mínimo de 0.1
        speedControl.max = "10";   // Mantém o máximo em 10
        speedControl.step = "0.1"; // Incremento de 0.1
        speedControl.value = scrollSpeed.toString(); // Define o valor inicial

        if (speedValue) {
            speedValue.textContent = scrollSpeed;
        }
    }

    const spacingControl = document.getElementById('spacingControl');
    const spacingValue = document.getElementById('spacingValue');

    if (spacingControl) {
        spacingControl.min = "-30"; // Valor mínimo de -30px
        spacingControl.max = "100"; // Mantém o máximo em 100px
        spacingControl.value = imageSpacing.toString(); // Define o valor inicial

        if (spacingValue) {
            spacingValue.textContent = `${imageSpacing}px`;
        }
    }
    const verticalBtn = document.getElementById('verticalBtn');
    const horizontalBtn = document.getElementById('horizontalBtn');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    const imageCounter = document.getElementById('imageCounter');
    const toggleSidebarBtn = document.querySelector('.toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    const startScrollingBtn = document.getElementById('startScrollingBtn');
    const stopScrollingBtn = document.getElementById('stopScrollingBtn');
    const scrollUpBtn = document.getElementById('scrollUpBtn');
    const scrollDownBtn = document.getElementById('scrollDownBtn');
    const scrollLeftBtn = document.getElementById('scrollLeftBtn');
    const scrollRightBtn = document.getElementById('scrollRightBtn');
    const themeOptions = document.querySelectorAll('.theme-option');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const zoomControls = document.querySelector('.zoom-controls');

    const elements = {
        fileInput, uploadBtn, dropArea, thumbnailContainer, imageContainer, viewer,
        speedControl, speedValue, spacingControl, spacingValue, verticalBtn, horizontalBtn,
        zoomInBtn, zoomOutBtn, resetZoomBtn, imageCounter, toggleSidebarBtn, sidebar,
        startScrollingBtn, stopScrollingBtn, scrollUpBtn, scrollDownBtn, scrollLeftBtn,
        scrollRightBtn, themeOptions, fullscreenBtn
    };

    const missingElements = [];
    for (const [name, element] of Object.entries(elements)) {
        if (!element && name !== 'themeOptions') {
            missingElements.push(name);
        }
    }

    if (missingElements.length > 0) {
        alert(`Erro: Elementos HTML não encontrados. Verifique o console para mais detalhes.`);
        return;
    }

    initDB();

    speedValue.textContent = scrollSpeed;
    spacingValue.textContent = `${imageSpacing}px`;

    if (!document.fullscreenEnabled &&
        !document.webkitFullscreenEnabled &&
        !document.mozFullScreenEnabled &&
        !document.msFullscreenEnabled) {
        if (fullscreenBtn) fullscreenBtn.style.display = 'none';
    }

    updateNavigationButtons();

    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        processFiles(e.target.files);
    });

    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.style.borderColor = '#b264e9';
        dropArea.style.backgroundColor = 'rgba(74, 108, 247, 0.1)';
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.style.borderColor = '#4a6cf7';
        dropArea.style.backgroundColor = '';
    });

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.style.borderColor = '#4a6cf7';
        dropArea.style.backgroundColor = '';
        processFiles(e.dataTransfer.files);
    });

    dropArea.addEventListener('click', () => {
        fileInput.click();
    });

    speedControl.addEventListener('input', (e) => {
        scrollSpeed = parseFloat(e.target.value);
        speedValue.textContent = scrollSpeed;

        if (autoScrolling) {
            startScrolling();
        }
    });

    spacingControl.addEventListener('input', (e) => {
        imageSpacing = parseInt(e.target.value);
        spacingValue.textContent = `${imageSpacing}px`;
        renderImages();
    });

    verticalBtn.addEventListener('click', () => {
        if (!isVertical) {
            isVertical = true;
            verticalBtn.classList.add('active');
            horizontalBtn.classList.remove('active');
            renderImages();
        }
    });

    horizontalBtn.addEventListener('click', () => {
        if (isVertical) {
            isVertical = false;
            horizontalBtn.classList.add('active');
            verticalBtn.classList.remove('active');
            renderImages();
        }
    });

    startScrollingBtn.addEventListener('click', () => {
        startScrolling();
    });

    stopScrollingBtn.addEventListener('click', () => {
        stopScrolling();
    });

    scrollUpBtn.addEventListener('click', () => {
        scrollManually('up');
    });

    scrollDownBtn.addEventListener('click', () => {
        scrollManually('down');
    });

    scrollLeftBtn.addEventListener('click', () => {
        scrollManually('left');
    });

    scrollRightBtn.addEventListener('click', () => {
        scrollManually('right');
    });

    toggleSidebarBtn.addEventListener('click', toggleSidebar);

    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const themeName = option.classList[1] + '-theme';
            changeTheme(themeName);
        });
    });

    fullscreenBtn.addEventListener('click', () => {
        toggleFullscreen();
    });

    document.addEventListener('fullscreenchange', updateFullscreenButton);
    document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
    document.addEventListener('mozfullscreenchange', updateFullscreenButton);
    document.addEventListener('MSFullscreenChange', updateFullscreenButton);

    window.addEventListener('resize', () => {
        adjustImageContainer();
    });
    // Check if we're auto-scrolling at startup and set controls accordingly
    if (autoScrolling) {
        toggleSidebarControls(true);
    } else {
        toggleSidebarControls(false);
    }
    setupLogoAndBackground();
    setupProgressIndicator();
    setupThemePersistence();

    updateImageCounter();
    renderThumbnails();
    renderImages();
    setupFullscreenListeners();
    checkAndFixScrolling();
    enhanceUserExperience();

    // Adiciona as novas funções
    enhanceScrollBehavior();
    centerContent();
}

function initDB() {
    try {
        const request = indexedDB.open(dbName, 1);

        request.onerror = function (event) {
            images = [];
            updateImageCounter();
            renderThumbnails();
            renderImages();
        };

        request.onupgradeneeded = function (event) {
            db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                const store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                store.createIndex('name', 'name', { unique: false });
            }
        };

        request.onsuccess = function (event) {
            db = event.target.result;
            loadImagesFromDB();
        };
    } catch (error) {
        images = [];
        updateImageCounter();
        renderThumbnails();
        renderImages();
    }
}

function loadImagesFromDB() {
    try {
        if (!db) {
            return;
        }

        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = function (event) {
            images = event.target.result;
            updateImageCounter();
            renderThumbnails();
            renderImages();
        };

        request.onerror = function (event) {
            images = [];
            updateImageCounter();
            renderThumbnails();
            renderImages();
        };
    } catch (error) {
        images = [];
        updateImageCounter();
        renderThumbnails();
        renderImages();
    }
}

function saveImageToDB(imageData) {
    try {
        if (!db) {
            alert("Erro ao salvar imagem: banco de dados não inicializado");
            return;
        }

        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(imageData);

        request.onsuccess = function () {
            loadImagesFromDB();
        };

        request.onerror = function (event) {
            alert("Erro ao salvar imagem no banco de dados");
        };
    } catch (error) {
        alert("Erro ao salvar imagem: " + error.message);
    }
}

function deleteImageFromDB(id) {
    try {
        if (!db) {
            alert("Erro ao excluir imagem: banco de dados não inicializado");
            return;
        }

        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = function () {
            loadImagesFromDB();
        };

        request.onerror = function (event) {
            alert("Erro ao excluir imagem do banco de dados");
        };
    } catch (error) {
        alert("Erro ao excluir imagem: " + error.message);
    }
}

function processFiles(files) {
    if (files.length === 0) {
        return;
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();

            reader.onload = function (e) {
                const imageData = {
                    name: file.name,
                    type: file.type,
                    data: e.target.result,
                    date: new Date().toISOString()
                };

                saveImageToDB(imageData);
            };

            reader.onerror = function (e) {
                alert(`Erro ao ler arquivo ${file.name}`);
            };

            reader.readAsDataURL(file);
        }
    }
}

function renderThumbnails() {
    const thumbnailContainer = document.getElementById('thumbnailContainer');
    if (!thumbnailContainer) {
        return;
    }

    thumbnailContainer.innerHTML = '';

    if (images.length === 0) {
        thumbnailContainer.innerHTML = '<p>Nenhuma imagem carregada ainda.</p>';
        return;
    }

    images.forEach(image => {
        const wrapper = document.createElement('div');
        wrapper.className = 'thumbnail-wrapper';

        const img = document.createElement('img');
        img.src = image.data;
        img.className = 'thumbnail';
        img.title = image.name;
        img.alt = image.name;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.title = 'Excluir imagem';
        deleteBtn.onclick = function (e) {
            e.stopPropagation();
            deleteImageFromDB(image.id);
        };

        wrapper.appendChild(img);
        wrapper.appendChild(deleteBtn);
        thumbnailContainer.appendChild(wrapper);

        img.addEventListener('click', function () {
            const allThumbnails = document.querySelectorAll('.thumbnail');
            allThumbnails.forEach(thumb => thumb.classList.remove('selected'));
            img.classList.add('selected');
        });
    });
}

function updateImageCounter() {
    const imageCounter = document.getElementById('imageCounter');
    if (!imageCounter) {
        return;
    }

    imageCounter.textContent = `${images.length}`;
}

function checkAndFixScrolling() {
    if (autoScrolling && !scrollInterval) {
        startScrolling();
    }
}

function getImageContainerSize() {
    if (images.length === 0) return { width: 0, height: 0 };

    const items = document.querySelectorAll('.image-item');
    let totalWidth = 0;
    let totalHeight = 0;

    items.forEach(item => {
        totalWidth += item.offsetWidth + imageSpacing;
        totalHeight += item.offsetHeight + imageSpacing;
    });

    return {
        width: totalWidth,
        height: totalHeight
    };
}

function adjustImageContainer() {
    const imageContainer = document.getElementById('imageContainer');
    const viewer = document.getElementById('viewer');
    const viewerWrapper = document.querySelector('.viewer-wrapper');
    
    if (!imageContainer || !viewer || !viewerWrapper) return;

    if (images.length === 0) return;

    const viewerRect = viewer.getBoundingClientRect();
    const items = document.querySelectorAll('.image-item');
    
    // Resetar transformações anteriores
    imageContainer.style.transform = '';
    
    // Definir margens (20% à direita, 10% à esquerda)
    const leftMargin = viewerRect.width * 0.1;
    const rightMargin = viewerRect.width * 0.2;
    const maxWidth = viewerRect.width - (leftMargin + rightMargin);
    
    // Calcular dimensões totais necessárias
    let totalWidth = 0;
    let totalHeight = 0;
    
    items.forEach(item => {
        const img = item.querySelector('img');
        if (img) {
            // Calcular dimensões mantendo a proporção
            const aspectRatio = img.naturalWidth / img.naturalHeight;
            let width, height;
            
            if (isVertical) {
                width = Math.min(maxWidth, img.naturalWidth);
                height = width / aspectRatio;
            } else {
                height = Math.min(viewerRect.height * 0.95, img.naturalHeight);
                width = height * aspectRatio;
                
                if (width > maxWidth) {
                    width = maxWidth;
                    height = width / aspectRatio;
                }
            }
            
            // Atualizar dimensões da imagem
            img.style.width = `${width}px`;
            img.style.height = `${height}px`;
            
            // Adicionar ao total considerando o espaçamento
            if (isVertical) {
                totalHeight += height + imageSpacing;
            } else {
                totalWidth += width + imageSpacing;
            }
        }
    });
    
    // Remover o espaçamento extra do último item
    if (isVertical) {
        totalHeight -= imageSpacing;
    } else {
        totalWidth -= imageSpacing;
    }
    
    // Aplicar dimensões ao container
    if (isVertical) {
        imageContainer.style.width = `${maxWidth}px`;
        imageContainer.style.height = `${totalHeight}px`;
        imageContainer.style.margin = `0 auto 0 ${leftMargin}px`; // Margem à esquerda
    } else {
        imageContainer.style.width = `${totalWidth}px`;
        imageContainer.style.height = '100%';
        imageContainer.style.marginLeft = `${leftMargin}px`; // Margem à esquerda
    }
    
    // Resetar a posição de rolagem para começar pela primeira imagem
    scrollPosition = 0;
    
    // Aplicar a transformação inicial
    if (isVertical) {
        imageContainer.style.transform = `translateY(0) scale(${currentZoom})`;
    } else {
        imageContainer.style.transform = `translateX(0) scale(${currentZoom})`;
    }
    
    // Atualizar a barra de progresso
    updateProgressIndicator();
}

function resetScrollPosition() {
    scrollPosition = 0;
    updateScrollPosition();
}

// Função otimizada para troca de temas
function changeTheme(themeName) {
    // Limpa o timeout anterior se existir
    if (themeChangeTimeout) {
        clearTimeout(themeChangeTimeout);
    }

    // Se o tema selecionado é o mesmo do atual, não faz nada
    if (themeName === currentTheme) {
        return;
    }

    // Usa requestAnimationFrame para melhor performance
    requestAnimationFrame(() => {
        // Remove todas as classes de tema anteriores
        document.body.classList.remove(
            'light-theme', 'dark-theme', 'comics-theme', 'neon-theme',
            'cyberpunk-theme', 'retro-theme', 'minimal-theme', 'nature-theme',
            'ocean-theme', 'sunset-theme', 'matrix-theme', 'rainbow-theme',
            'galaxy-theme', 'forest-theme', 'desert-theme'
        );

        // Adiciona a nova classe de tema
        document.body.classList.add(themeName);
        currentTheme = themeName;

        // Atualiza o indicador de tema ativo
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.remove('active');
            if (option.classList.contains(themeName.replace('-theme', ''))) {
                option.classList.add('active');
            }
        });

        // Salva a preferência do usuário
        localStorage.setItem('alanComicsTheme', themeName);
    });
}

// Inicializa o tema baseado na preferência do usuário
function initializeTheme() {
    const savedTheme = localStorage.getItem('alanComicsTheme');
    if (savedTheme) {
        changeTheme(savedTheme);
    } else {
        // Verifica se o sistema está em modo escuro
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        changeTheme(prefersDark ? 'dark-theme' : 'light-theme');
    }
}

// Adiciona event listeners para os botões de tema
document.addEventListener('DOMContentLoaded', () => {
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const themeName = option.classList[1] + '-theme';
            changeTheme(themeName);
        });
    });

    // Inicializa o tema
    initializeTheme();
});

function toggleFullscreen() {
    const viewer = document.getElementById('viewer');
    const header = document.querySelector('header');
    const sidebar = document.querySelector('.sidebar');
    const toggleSidebarBtn = document.querySelector('.toggle-sidebar');

    if (!viewer) return;

    if (!document.fullscreenElement &&
        !document.webkitFullscreenElement &&
        !document.mozFullScreenElement &&
        !document.msFullscreenElement) {
        try {
            // Adicionar classe para esconder elementos
            if (header) header.classList.add('fullscreen-hidden');
            if (sidebar) sidebar.classList.add('fullscreen-hidden');
            if (toggleSidebarBtn) toggleSidebarBtn.classList.add('fullscreen-hidden');

            // Adicionar classe para o viewer em tela cheia
            viewer.classList.add('fullscreen-viewer');

            // Solicitar tela cheia
            if (viewer.requestFullscreen) {
                viewer.requestFullscreen();
            } else if (viewer.mozRequestFullScreen) {
                viewer.mozRequestFullScreen();
            } else if (viewer.webkitRequestFullscreen) {
                viewer.webkitRequestFullscreen();
            } else if (viewer.msRequestFullscreen) {
                viewer.msRequestFullscreen();
            }
        } catch (error) {
            console.error("Erro ao entrar em tela cheia:", error);
        }
    } else {
        try {
            // Sair do modo tela cheia
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        } catch (error) {
            console.error("Erro ao sair da tela cheia:", error);
        }
    }
}

function setupFullscreenListeners() {
    const fullscreenEvents = [
        'fullscreenchange',
        'webkitfullscreenchange',
        'mozfullscreenchange',
        'MSFullscreenChange'
    ];

    fullscreenEvents.forEach(eventName => {
        document.addEventListener(eventName, handleFullscreenChange);
    });
}

// Atualizar a função handleFullscreenChange para não manipular posição ou zoom
function handleFullscreenChange() {
    updateFullscreenButton();

    const header = document.querySelector('header');
    const sidebar = document.querySelector('.sidebar');
    const toggleSidebarBtn = document.querySelector('.toggle-sidebar');
    const viewer = document.getElementById('viewer');

    // Se não estamos mais em modo tela cheia, restaurar elementos
    if (!document.fullscreenElement &&
        !document.webkitFullscreenElement &&
        !document.mozFullScreenElement &&
        !document.msFullscreenElement) {

        // Restaurar elementos ocultos
        if (header) header.classList.remove('fullscreen-hidden');
        if (sidebar) sidebar.classList.remove('fullscreen-hidden');
        if (toggleSidebarBtn) toggleSidebarBtn.classList.remove('fullscreen-hidden');
        if (viewer) viewer.classList.remove('fullscreen-viewer');
    }
}

function enhanceUserExperience() {
    // 1. Melhorar o suporte a rolagem com espaçamento negativo
    const spacingControl = document.getElementById('spacingControl');
    if (spacingControl) {
        spacingControl.addEventListener('change', function () {
            // Quando o usuário finaliza a mudança de espaçamento, reajusta as imagens
            setTimeout(() => {
                adjustImageContainer();
                centerImages();

                // Se estava rolando, garante que continua rolando com o novo layout
                if (autoScrolling) {
                    stopScrolling();
                    startScrolling();
                }
            }, 50);
        });
    }

    // 2. Adicionar feedback visual ao botão de toggle sidebar
    const toggleSidebarBtn = document.querySelector('.toggle-sidebar');
    if (toggleSidebarBtn) {
        // Adiciona efeito de hover para melhorar a visibilidade
        toggleSidebarBtn.addEventListener('mouseenter', function () {
            this.style.transform = this.classList.contains('collapsed') ? 'scale(1.1)' : 'scale(1.1) rotate(0deg)';
        });

        toggleSidebarBtn.addEventListener('mouseleave', function () {
            this.style.transform = this.classList.contains('collapsed') ? '' : 'rotate(0deg)';
        });
    }

    // 3. Adicionar verificação periódica para garantir consistência da UI
    setInterval(() => {
        // Verificar estado de rolagem automática
        if (autoScrolling && !scrollInterval) {
            // A rolagem automática está ativa mas o intervalo não existe
            startScrolling();
        }

        // Verificar estado de tela cheia
        const isFullscreen = document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement;

        const viewer = document.getElementById('viewer');
        if (viewer) {
            if (isFullscreen && !viewer.classList.contains('fullscreen-viewer')) {
                viewer.classList.add('fullscreen-viewer');
            } else if (!isFullscreen && viewer.classList.contains('fullscreen-viewer')) {
                viewer.classList.remove('fullscreen-viewer');
            }
        }
    }, 1000);
}

function enhanceInit() {
    // Substituir os listeners de tela cheia antigos
    document.removeEventListener('fullscreenchange', updateFullscreenButton);
    document.removeEventListener('webkitfullscreenchange', updateFullscreenButton);
    document.removeEventListener('mozfullscreenchange', updateFullscreenButton);
    document.removeEventListener('MSFullscreenChange', updateFullscreenButton);
    // Adicionar setup para controles de velocidade
    setupSpeedControl();
    enhanceZoomControls();
}

function updateFullscreenButton() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (!fullscreenBtn) return;

    if (document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement) {
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        fullscreenBtn.title = "Sair da Tela Cheia";
    } else {
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        fullscreenBtn.title = "Tela Cheia";
    }
}

function updateNavigationButtons() {
    const scrollUpBtn = document.getElementById('scrollUpBtn');
    const scrollDownBtn = document.getElementById('scrollDownBtn');
    const scrollLeftBtn = document.getElementById('scrollLeftBtn');
    const scrollRightBtn = document.getElementById('scrollRightBtn');

    if (!scrollUpBtn || !scrollDownBtn || !scrollLeftBtn || !scrollRightBtn) {
        return;
    }

    if (isVertical) {
        scrollUpBtn.style.display = 'flex';
        scrollDownBtn.style.display = 'flex';
        scrollLeftBtn.style.display = 'none';
        scrollRightBtn.style.display = 'none';
    } else {
        scrollUpBtn.style.display = 'none';
        scrollDownBtn.style.display = 'none';
        scrollLeftBtn.style.display = 'flex';
        scrollRightBtn.style.display = 'flex';
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const toggleSidebarBtn = document.querySelector('.toggle-sidebar');
    const viewer = document.getElementById('viewer');

    if (!sidebar || !toggleSidebarBtn || !viewer) return;

    sidebar.classList.toggle('collapsed');
    toggleSidebarBtn.classList.toggle('collapsed');

    if (sidebar.classList.contains('collapsed')) {
        toggleSidebarBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        viewer.classList.add('expanded-viewer');
    } else {
        toggleSidebarBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        viewer.classList.remove('expanded-viewer');
    }

    setTimeout(() => {
        adjustImageContainer();
        centerImages();
    }, 300);
}

function setupLogo() {
    const logoContainer = document.querySelector('.logo-container');
    if (!logoContainer) return;

    logoContainer.innerHTML = '';

    const title = document.createElement('h1');
    title.textContent = "Quadrinhos do Alan";

    logoContainer.appendChild(title);
}

function setupBackground() {
    const bgElement = document.getElementById('customBackground');
    if (!bgElement) return;

    const testImage = new Image();
    testImage.src = 'background.png';

    testImage.onload = function () {
        bgElement.style.backgroundImage = 'url("background.png")';
        bgElement.style.display = 'block';
    };

    testImage.onerror = function () {
        createThemeBackground();
    };
}

function createThemeBackground() {
    const bgElement = document.getElementById('customBackground');
    if (!bgElement) return;

    let pattern;

    if (document.body.classList.contains('comics-theme')) {
        pattern = createComicPattern();
    } else if (document.body.classList.contains('neon-theme')) {
        pattern = createNeonPattern();
    } else if (document.body.classList.contains('dark-theme')) {
        pattern = createDarkPattern();
    } else {
        pattern = createLightPattern();
    }

    bgElement.innerHTML = '';
    bgElement.appendChild(pattern);
    bgElement.style.display = 'block';
}

function createComicPattern() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
    pattern.setAttribute("id", "comicDots");
    pattern.setAttribute("width", "20");
    pattern.setAttribute("height", "20");
    pattern.setAttribute("patternUnits", "userSpaceOnUse");

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", "10");
    dot.setAttribute("cy", "10");
    dot.setAttribute("r", "1.5");
    dot.setAttribute("fill", "#e63946");

    pattern.appendChild(dot);
    defs.appendChild(pattern);
    svg.appendChild(defs);

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", "url(#comicDots)");

    svg.appendChild(rect);
    return svg;
}

function createNeonPattern() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
    pattern.setAttribute("id", "neonGrid");
    pattern.setAttribute("width", "40");
    pattern.setAttribute("height", "40");
    pattern.setAttribute("patternUnits", "userSpaceOnUse");

    const hLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    hLine.setAttribute("x1", "0");
    hLine.setAttribute("y1", "0");
    hLine.setAttribute("x2", "40");
    hLine.setAttribute("y2", "0");
    hLine.setAttribute("stroke", "#00ff9d");
    hLine.setAttribute("stroke-width", "0.5");
    hLine.setAttribute("opacity", "0.3");

    const vLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    vLine.setAttribute("x1", "0");
    vLine.setAttribute("y1", "0");
    vLine.setAttribute("x2", "0");
    vLine.setAttribute("y2", "40");
    vLine.setAttribute("stroke", "#ff00f5");
    vLine.setAttribute("stroke-width", "0.5");
    vLine.setAttribute("opacity", "0.3");

    pattern.appendChild(hLine);
    pattern.appendChild(vLine);
    defs.appendChild(pattern);
    svg.appendChild(defs);

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", "url(#neonGrid)");

    svg.appendChild(rect);
    return svg;
}

function createDarkPattern() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
    pattern.setAttribute("id", "starryPattern");
    pattern.setAttribute("width", "200");
    pattern.setAttribute("height", "200");
    pattern.setAttribute("patternUnits", "userSpaceOnUse");

    for (let i = 0; i < 20; i++) {
        const x = Math.floor(Math.random() * 200);
        const y = Math.floor(Math.random() * 200);
        const size = Math.random() * 1.5 + 0.5;
        const opacity = Math.random() * 0.5 + 0.3;

        const star = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        star.setAttribute("cx", x);
        star.setAttribute("cy", y);
        star.setAttribute("r", size);
        star.setAttribute("fill", "#ffffff");
        star.setAttribute("opacity", opacity);

        pattern.appendChild(star);
    }

    defs.appendChild(pattern);
    svg.appendChild(defs);

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", "url(#starryPattern)");

    svg.appendChild(rect);
    return svg;
}

function createLightPattern() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
    pattern.setAttribute("id", "wavyPattern");
    pattern.setAttribute("width", "100");
    pattern.setAttribute("height", "100");
    pattern.setAttribute("patternUnits", "userSpaceOnUse");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M0,20 C20,40 30,0 50,20 C70,40 80,0 100,20 L100,100 L0,100 Z");
    path.setAttribute("fill", "#4a6cf7");
    path.setAttribute("opacity", "0.05");

    pattern.appendChild(path);
    defs.appendChild(pattern);
    svg.appendChild(defs);

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", "url(#wavyPattern)");

    svg.appendChild(rect);
    return svg;
}

function setupLogoAndBackground() {
    setupLogo();
    setupBackground();
}

function setupProgressIndicator() {
    let progressIndicator = document.getElementById('progressIndicator');

    if (!progressIndicator) {
        progressIndicator = document.createElement('div');
        progressIndicator.id = 'progressIndicator';
        progressIndicator.className = 'progress-indicator';
        document.body.appendChild(progressIndicator);
    }
}

function setupSpeedControl() {
    const speedControl = document.getElementById('speedControl');
    const speedValue = document.getElementById('speedValue');

    if (!speedControl || !speedValue) return;

    speedControl.addEventListener('input', (e) => {
        scrollSpeed = parseFloat(e.target.value);
        speedValue.textContent = scrollSpeed.toFixed(1);

        if (autoScrolling) {
            startScrolling();
        }
    });
}

function updateProgressIndicator() {
    const progressIndicator = document.getElementById('progressIndicator');
    if (!progressIndicator) return;

    const viewer = document.getElementById('viewer');
    const imageContainer = document.getElementById('imageContainer');

    if (!viewer || !imageContainer) return;

    const viewerRect = viewer.getBoundingClientRect();
    const containerRect = {
        width: imageContainer.scrollWidth * currentZoom,
        height: imageContainer.scrollHeight * currentZoom
    };

    let maxScroll;
    if (isVertical) {
        maxScroll = Math.max(0, containerRect.height - viewerRect.height);
    } else {
        maxScroll = Math.max(0, containerRect.width - viewerRect.width);
    }

    const progress = maxScroll > 0 ? (scrollPosition / maxScroll) * 100 : 0;
    progressIndicator.style.width = `${progress}%`;
}

function setupThemePersistence() {
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.addEventListener('click', function () {
            const themeName = this.classList[1] + '-theme';
            changeTheme(themeName);
        });
    });
}

window.onerror = function (message, source, lineno, colno, error) {
    console.error("Erro detectado:", message, "na linha:", lineno, "coluna:", colno);
    console.error("Stack trace:", error && error.stack);

    alert(`Erro detectado: ${message}. Verifique o console para mais detalhes.`);

    images = [];
    updateImageCounter();
    renderThumbnails();
    renderImages();

    return true;
};

document.addEventListener('DOMContentLoaded', function () {
    init();
    enhanceInit();
});

// Função para configurar os controles de rolagem
function setupScrollControls() {
    const startScrollingBtn = document.getElementById('startScrollingBtn');
    const stopScrollingBtn = document.getElementById('stopScrollingBtn');
    const scrollSpeed = document.getElementById('scrollSpeed');
    const decreaseSpacingBtn = document.getElementById('decreaseSpacingBtn');
    const increaseSpacingBtn = document.getElementById('increaseSpacingBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    // Configurar botão de iniciar rolagem
    if (startScrollingBtn) {
        startScrollingBtn.addEventListener('click', () => {
            if (!autoScrolling) {
                startScrolling();
                startScrollingBtn.innerHTML = '<i class="fas fa-play"></i> Rolando...';
                startScrollingBtn.style.opacity = '0.7';
            }
        });
    }
    
    // Configurar botão de parar rolagem
    if (stopScrollingBtn) {
        stopScrollingBtn.addEventListener('click', () => {
            if (autoScrolling) {
                stopScrolling();
                startScrollingBtn.innerHTML = '<i class="fas fa-play"></i> Iniciar Rolagem';
                startScrollingBtn.style.opacity = '1';
            }
        });
    }
    
    // Configurar controle de velocidade
    if (scrollSpeed) {
        scrollSpeed.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            if (!isNaN(speed)) {
                scrollSpeed = speed;
            }
        });
    }
    
    // Configurar botões de espaçamento
    if (decreaseSpacingBtn) {
        decreaseSpacingBtn.addEventListener('click', () => {
            if (imageSpacing > 0) {
                imageSpacing -= 10;
                updateImageSpacing();
            }
        });
    }
    
    if (increaseSpacingBtn) {
        increaseSpacingBtn.addEventListener('click', () => {
            imageSpacing += 10;
            updateImageSpacing();
        });
    }
    
    // Configurar botões direcionais
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (autoScrolling) {
                stopScrolling();
            }
            
            const imageContainer = document.getElementById('imageContainer');
            const viewer = document.getElementById('viewer');
            
            if (!imageContainer || !viewer) return;
            
            const containerRect = imageContainer.getBoundingClientRect();
            const viewerRect = viewer.getBoundingClientRect();
            
            // Calcular o tamanho de uma página (largura/altura do viewer)
            const pageSize = isVertical ? viewerRect.height : viewerRect.width;
            
            // Calcular o máximo que podemos rolar
            const maxScroll = isVertical 
                ? (containerRect.height * currentZoom - viewerRect.height) / currentZoom
                : (containerRect.width * currentZoom - viewerRect.width) / currentZoom;
            
            // Atualizar a posição de rolagem (avançar)
            if (isVertical) {
                scrollPosition = Math.min(maxScroll, scrollPosition + pageSize);
                // Se chegou ao final, voltar ao início
                if (scrollPosition >= maxScroll) {
                    scrollPosition = 0;
                }
            } else {
                scrollPosition = Math.min(maxScroll, scrollPosition + pageSize);
                // Se chegou ao final, voltar ao início
                if (scrollPosition >= maxScroll) {
                    scrollPosition = 0;
                }
            }
            
            // Aplicar a transformação
            if (isVertical) {
                imageContainer.style.transform = `translateY(-${scrollPosition}px) scale(${currentZoom})`;
            } else {
                imageContainer.style.transform = `translateX(-${scrollPosition}px) scale(${currentZoom})`;
            }
            
            updateProgressIndicator();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (autoScrolling) {
                stopScrolling();
            }
            
            const imageContainer = document.getElementById('imageContainer');
            const viewer = document.getElementById('viewer');
            
            if (!imageContainer || !viewer) return;
            
            const containerRect = imageContainer.getBoundingClientRect();
            const viewerRect = viewer.getBoundingClientRect();
            
            // Calcular o tamanho de uma página (largura/altura do viewer)
            const pageSize = isVertical ? viewerRect.height : viewerRect.width;
            
            // Calcular o máximo que podemos rolar
            const maxScroll = isVertical 
                ? (containerRect.height * currentZoom - viewerRect.height) / currentZoom
                : (containerRect.width * currentZoom - viewerRect.width) / currentZoom;
            
            // Atualizar a posição de rolagem (avançar)
            if (isVertical) {
                scrollPosition = Math.min(maxScroll, scrollPosition + pageSize);
                // Se chegou ao final, voltar ao início
                if (scrollPosition >= maxScroll) {
                    scrollPosition = 0;
                }
            } else {
                scrollPosition = Math.min(maxScroll, scrollPosition + pageSize);
                // Se chegou ao final, voltar ao início
                if (scrollPosition >= maxScroll) {
                    scrollPosition = 0;
                }
            }
            
            // Aplicar a transformação
            if (isVertical) {
                imageContainer.style.transform = `translateY(-${scrollPosition}px) scale(${currentZoom})`;
            } else {
                imageContainer.style.transform = `translateX(-${scrollPosition}px) scale(${currentZoom})`;
            }
            
            updateProgressIndicator();
        });
    }
}

// Função para iniciar o arrasto
function dragStart(e) {
    const viewer = document.querySelector('.viewer');
    isDragging = true;
    viewer.classList.add('dragging');
    
    // Capturar posição inicial
    startX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
    startY = e.type.includes('mouse') ? e.pageY : e.touches[0].pageY;
    
    // Capturar posição inicial do scroll
    scrollLeft = viewer.scrollLeft;
    scrollTop = viewer.scrollTop;
}

function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    
    const viewer = document.querySelector('.viewer');
    
    // Calcular movimento
    const x = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
    const y = e.type.includes('mouse') ? e.pageY : e.touches[0].pageY;
    
    // Calcular distância percorrida
    const walkX = x - startX;
    const walkY = y - startY;
    
    // Atualizar scroll
    viewer.scrollLeft = scrollLeft - walkX;
    viewer.scrollTop = scrollTop - walkY;
}

function dragEnd() {
    isDragging = false;
    const viewer = document.querySelector('.viewer');
    viewer.classList.remove('dragging');
}

function setupDragAndZoom() {
    const viewer = document.querySelector('.viewer');
    
    // Eventos de mouse
    viewer.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
    
    // Eventos de toque
    viewer.addEventListener('touchstart', dragStart, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', dragEnd);
}

// Inicializar arrasto e zoom quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', setupDragAndZoom);

function startScrolling() {
    if (images.length === 0) return;
    
    // Criar overlay para contagem regressiva
    const overlay = document.createElement('div');
    overlay.className = 'countdown-overlay';
    document.body.appendChild(overlay);

    const showNumber = (num) => {
        overlay.innerHTML = `<div class="countdown-number">${num}</div>`;
        overlay.classList.add('visible');
    };

    const showStart = () => {
        overlay.innerHTML = `<div class="countdown-start">COMEÇAR!</div>`;
    };

    const removeOverlay = () => {
        overlay.classList.remove('visible');
        setTimeout(() => {
            overlay.remove();
        }, 300);
    };

    // Contagem regressiva
    let count = 3;
    showNumber(count);

    const countdown = setInterval(() => {
        count--;
        if (count > 0) {
            showNumber(count);
        } else {
            clearInterval(countdown);
            showStart();
            setTimeout(() => {
                removeOverlay();
                // Iniciar a rolagem após a contagem
                autoScrolling = true;
                toggleSidebarControls(true);
                
                const startBtn = document.getElementById('startScrollingBtn');
                if (startBtn) {
                    startBtn.innerHTML = '<i class="fas fa-pause"></i> Pausar Rolagem';
                    startBtn.style.opacity = '0.7';
                }

                if (scrollInterval) {
                    clearInterval(scrollInterval);
                }

                const speed = parseFloat(document.getElementById('speedInput').value) || 1;
                const spacing = parseFloat(document.getElementById('spacingInput').value) || 16;
                const direction = document.querySelector('.direction-btn.active')?.dataset.direction || 'down';
                const isVertical = direction === 'up' || direction === 'down';
                
                scrollInterval = setInterval(() => {
                    if (!autoScrolling) return;
                    
                    const step = speed * (isVertical ? 1 : -1);
                    if (isVertical) {
                        scrollPosition += step;
                    } else {
                        scrollPosition += step;
                    }
                    
                    updateScrollPosition();
                }, spacing);
            }, 1000);
        }
    }, 1000);
}

function initDragSystem() {
    const imageContainer = document.getElementById('imageContainer');
    const viewer = document.getElementById('viewer');
    
    if (!imageContainer || !viewer) return;
    
    // Funções auxiliares para limites
    function getBoundaries() {
        const containerRect = imageContainer.getBoundingClientRect();
        const viewerRect = viewer.getBoundingClientRect();
        const scale = currentZoom || 1;
        
        return {
            minX: viewerRect.width - containerRect.width * scale,
            maxX: 0,
            minY: viewerRect.height - containerRect.height * scale,
            maxY: 0
        };
    }
    
    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    // Função para aplicar transformação com limites
    function applyTransform(x, y) {
        const boundaries = getBoundaries();
        const clampedX = clamp(x, boundaries.minX - boundaryPadding, boundaries.maxX + boundaryPadding);
        const clampedY = clamp(y, boundaries.minY - boundaryPadding, boundaries.maxY + boundaryPadding);
        
        currentX = clampedX;
        currentY = clampedY;
        
        imageContainer.style.transform = `translate(${clampedX}px, ${clampedY}px) scale(${currentZoom})`;
        updateProgressIndicator();
    }
    
    // Eventos de mouse
    imageContainer.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Apenas botão esquerdo
        
        isDragging = true;
        imageContainer.classList.add('dragging');
        
        startX = e.pageX - currentX;
        startY = e.pageY - currentY;
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const x = e.pageX - startX;
        const y = e.pageY - startY;
        
        requestAnimationFrame(() => {
            applyTransform(x, y);
        });
        
        e.preventDefault();
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
        imageContainer.classList.remove('dragging');
    });
    
    // Eventos de touch
    imageContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        
        isDragging = true;
        imageContainer.classList.add('dragging');
        
        const touch = e.touches[0];
        startX = touch.pageX - currentX;
        startY = touch.pageY - currentY;
        
        e.preventDefault();
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        const x = touch.pageX - startX;
        const y = touch.pageY - startY;
        
        requestAnimationFrame(() => {
            applyTransform(x, y);
        });
        
        e.preventDefault();
    });
    
    document.addEventListener('touchend', () => {
        isDragging = false;
        imageContainer.classList.remove('dragging');
    });
    
    // Evento para parar o drag se o mouse sair da janela
    document.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            imageContainer.classList.remove('dragging');
        }
    });
    
    // Impedir seleção de texto durante o drag
    imageContainer.addEventListener('selectstart', (e) => {
        e.preventDefault();
    });
}

// Atualizar limites quando mudar o zoom
function updateZoom(scale) {
    currentZoom = scale;
    const imageContainer = document.getElementById('imageContainer');
    if (!imageContainer) return;
    
    const boundaries = getBoundaries();
    currentX = clamp(currentX, boundaries.minX - boundaryPadding, boundaries.maxX + boundaryPadding);
    currentY = clamp(currentY, boundaries.minY - boundaryPadding, boundaries.maxY + boundaryPadding);
    
    imageContainer.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;
}

// Função para melhorar o comportamento do scroll
function enhanceScrollBehavior() {
    const viewer = document.querySelector('.viewer');
    const container = document.querySelector('.image-container');

    // Configurar scroll suave
    viewer.style.scrollBehavior = 'smooth';
    container.style.scrollBehavior = 'smooth';

    // Adicionar suporte para scroll com teclado
    document.addEventListener('keydown', (e) => {
        const scrollAmount = 100;
        switch(e.key) {
            case 'ArrowUp':
                viewer.scrollTop -= scrollAmount;
                break;
            case 'ArrowDown':
                viewer.scrollTop += scrollAmount;
                break;
            case 'ArrowLeft':
                viewer.scrollLeft -= scrollAmount;
                break;
            case 'ArrowRight':
                viewer.scrollLeft += scrollAmount;
                break;
        }
    });

    // Adicionar suporte para scroll com touch
    let touchStartX = 0;
    let touchStartY = 0;

    viewer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });

    viewer.addEventListener('touchmove', (e) => {
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const deltaX = touchStartX - touchX;
        const deltaY = touchStartY - touchY;

        viewer.scrollLeft += deltaX;
        viewer.scrollTop += deltaY;

        touchStartX = touchX;
        touchStartY = touchY;
    });

    // Adicionar suporte para scroll horizontal com Shift + Mouse Wheel
    viewer.addEventListener('wheel', (e) => {
        if (e.shiftKey) {
            e.preventDefault();
            viewer.scrollLeft += e.deltaY;
        }
    }, { passive: false });
}

// Função para centralizar o conteúdo
function centerContent() {
    const viewer = document.querySelector('.viewer');
    const container = document.querySelector('.image-container');
    
    if (!viewer || !container) return;

    // Calcular a posição central
    const centerX = (viewer.scrollWidth - viewer.clientWidth) / 2;
    const centerY = (viewer.scrollHeight - viewer.clientHeight) / 2;

    // Aplicar a transformação para centralizar
    container.style.transform = `translate(${centerX}px, ${centerY}px)`;
}