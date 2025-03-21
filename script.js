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
let autoCenter = true;
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

    // Store old scale to calculate ratio
    const oldZoom = parseFloat(imageContainer.style.transform.match(/scale\(([^)]+)\)/)
        ? parseFloat(imageContainer.style.transform.match(/scale\(([^)]+)\)/)[1])
        : 1);

    // Calculate the point's position relative to image in "unscaled" coordinates
    const unscaledX = pointX / oldZoom;
    const unscaledY = pointY / oldZoom;

    // Apply the new scale
    imageContainer.style.transform = `scale(${currentZoom})`;

    // Calculate new position after scaling
    const scaledX = unscaledX * currentZoom;
    const scaledY = unscaledY * currentZoom;

    // Calculate how much the point moved
    const deltaX = scaledX - pointX;
    const deltaY = scaledY - pointY;

    // Update scroll position to compensate
    if (isVertical) {
        scrollPosition += deltaY;
    } else {
        scrollPosition += deltaX;
    }

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

// Update scrollManually to use the limit
function scrollManually(direction) {
    if (images.length === 0) return;

    switch (direction) {
        case 'up':
            if (isVertical) scrollPosition -= manualScrollStep;
            break;
        case 'down':
            if (isVertical) scrollPosition += manualScrollStep;
            break;
        case 'left':
            if (!isVertical) scrollPosition -= manualScrollStep;
            break;
        case 'right':
            if (!isVertical) scrollPosition += manualScrollStep;
            break;
    }

    if (scrollPosition < 0) scrollPosition = 0;
    updateScrollPosition();

    // Limit scroll to keep images visible
    limitScrollPosition();
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
    if (!autoCenter) return;

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
    
    if (containerRect.height * currentZoom < viewerRect.height) {
        offsetY = (viewerRect.height - containerRect.height * currentZoom) / 2;
    }
    
    if (isVertical) {
        imageContainer.style.transform = `translateX(${offsetX / currentZoom}px) translateY(${offsetY / currentZoom - scrollPosition}px) scale(${currentZoom})`;
    } else {
        imageContainer.style.transform = `translateX(${offsetX / currentZoom - scrollPosition}px) translateY(${offsetY / currentZoom}px) scale(${currentZoom})`;
    }

    // Apply limitations after centering
    limitScrollPosition();
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

    if (isVertical) {
        imageContainer.style.width = 'fit-content';
        imageContainer.style.maxWidth = '100%';
        imageContainer.style.height = 'auto';
        imageContainer.style.display = 'flex';
        imageContainer.style.flexDirection = 'column';
        imageContainer.style.alignItems = 'center';
    } else {
        imageContainer.style.width = 'auto';
        imageContainer.style.height = 'fit-content';
        imageContainer.style.maxHeight = '100%';
        imageContainer.style.display = 'flex';
        imageContainer.style.flexDirection = 'row';
        imageContainer.style.alignItems = 'center';
    }

    // Calcular a largura/altura total para espaçamento negativo
    let totalOffset = 0;

    images.forEach((image, index) => {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';

        // Aplicar espaçamento, garantindo que mesmo com valores negativos a visualização seja correta
        if (index > 0) {
            if (isVertical) {
                imageItem.style.marginTop = `${imageSpacing}px`;
                // Para espaçamento negativo, usamos técnica de sobreposição com posição relativa
                if (imageSpacing < 0) {
                    imageItem.style.position = 'relative';
                    imageItem.style.marginTop = `${imageSpacing}px`;
                    totalOffset += imageSpacing;
                }
            } else {
                imageItem.style.marginLeft = `${imageSpacing}px`;
                if (imageSpacing < 0) {
                    imageItem.style.position = 'relative';
                    imageItem.style.marginLeft = `${imageSpacing}px`;
                    totalOffset += imageSpacing;
                }
            }
        }

        const img = document.createElement('img');
        img.src = image.data;
        img.alt = image.name;
        img.loading = "lazy";

        img.onload = function () {
            adjustImageContainer();
            centerImages();
            limitScrollPosition();
        };

        imageItem.appendChild(img);
        imageContainer.appendChild(imageItem);
    });

    resetScrollPosition();
    adjustImageContainer();
    centerImages();
    updateNavigationButtons();

    // Apply limitations after rendering
    limitScrollPosition();
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
    const centerBtn = document.getElementById('centerBtn');

    if (!document.getElementById('centerBtn')) {
        const centerBtn = document.createElement('button');
        centerBtn.className = 'control-button';
        centerBtn.id = 'centerBtn';
        centerBtn.title = 'Centralizar Imagens';
        centerBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
        centerBtn.addEventListener('click', () => {
            autoCenter = !autoCenter;
            centerBtn.classList.toggle('active');
            if (autoCenter) {
                centerImages();
            }
        });

        if (zoomControls && fullscreenBtn) {
            zoomControls.insertBefore(centerBtn, fullscreenBtn);
        }
    }

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

    // Removemos os event listeners de zoom aqui, pois serão substituídos pelo enhanceZoomControls
    // O resto do código permanece igual

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
            const theme = option.dataset.theme;

            themeOptions.forEach(btn => btn.classList.remove('active'));
            option.classList.add('active');

            changeTheme(theme);

            localStorage.setItem('alanComicsTheme', theme === 'light' ? '' : `${theme}-theme`);

            if (typeof createThemeBackground === 'function') {
                createThemeBackground();
            }
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
    if (!imageContainer) {
        return;
    }

    if (images.length === 0) return;

    const size = getImageContainerSize();

    if (isVertical) {
        imageContainer.style.width = '100%';
        imageContainer.style.height = `${size.height}px`;
    } else {
        imageContainer.style.width = `${size.width}px`;
        imageContainer.style.height = '100%';
    }
}

function resetScrollPosition() {
    scrollPosition = 0;
    updateScrollPosition();
}

function changeTheme(theme) {
    document.body.classList.remove('dark-theme', 'comics-theme', 'neon-theme');

    if (theme !== 'light') {
        document.body.classList.add(`${theme}-theme`);
    }

    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.classList.remove('active');
        if (option.dataset.theme === theme) {
            option.classList.add('active');
        }
    });

    if (typeof createThemeBackground === 'function') {
        createThemeBackground();
    }
}

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
// Certifique-se de que o handler de mudança de tela cheia funciona corretamente
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

    const svgContainer = document.createElement('div');
    svgContainer.className = 'logo-svg';
    svgContainer.innerHTML = 'AC';

    const title = document.createElement('h1');
    title.textContent = "Alan Comics";

    logoContainer.appendChild(svgContainer);
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
            const theme = this.dataset.theme;

            themeOptions.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            changeTheme(theme);

            localStorage.setItem('alanComicsTheme', theme === 'light' ? '' : `${theme}-theme`);

            createThemeBackground();
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