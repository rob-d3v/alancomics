/**
 * RectangularSelectionManager - Gerencia a seleção retangular de texto em imagens
 * 
 * Este módulo implementa uma interface avançada para selecionar regiões de texto em imagens,
 * extrair o texto dessas regiões usando OCR e enviá-lo para narração na ordem correta,
 * iniciando a narração assim que o primeiro trecho estiver pronto.
 */
class RectangularSelectionManager {
    constructor() {
        // Estado da seleção
        this.isSelectionModeActive = false;
        this.currentImage = null;
        this.selections = [];
        this.scrollManager = window.scrollManager; // Referência ao ScrollManager global
        this.currentSelection = null;
        this.startX = 0;
        this.startY = 0;
        this.isMouseDown = false;

        // Armazenar textos extraídos por imagem
        this.extractedTexts = new Map(); // Map de imageId -> array de textos extraídos
        this.currentNarrationIndex = -1; // Índice da seleção sendo narrada atualmente
        this.isNarrating = false; // Indica se há narração em andamento

        // Elementos DOM
        this.selectionControls = null;
        this.selectionIndicator = null;
        this.extractedTextContainer = null;

        // Referências a outros módulos
        this.narrator = null;
        this.ocrProcessor = null;
        this.processingQueue = null;

        // Inicializar
        this.initialize();
    }

    /**
     * Inicializa o módulo de seleção de texto em imagens
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
     * Configura o módulo de seleção
     */
    setup() {
        // Obter referência ao narrador principal
        if (window.comicNarrator) {
            this.narrator = window.comicNarrator;
            console.log('RectangularSelectionManager: Conectado ao narrador principal');
        } else {
            console.warn('RectangularSelectionManager: Narrador principal não encontrado');
            // Tentar novamente após um curto período
            setTimeout(() => {
                if (window.comicNarrator) {
                    this.narrator = window.comicNarrator;
                    console.log('RectangularSelectionManager: Conectado ao narrador principal (tentativa 2)');
                }
            }, 1000);
        }

        // Inicializar o processador OCR
        this.ocrProcessor = new OCRProcessor();

        // Inicializar a fila de processamento em background
        this.processingQueue = new BackgroundProcessingQueue();

        // Configurar callbacks da fila
        this.setupQueueCallbacks();

        // Adicionar botão ao menu de narração
        this.addSelectionButton();

        // Criar controles de seleção (inicialmente ocultos)
        this.createSelectionControls();

        // Criar indicador de modo de seleção
        this.createSelectionIndicator();

        // Criar container para texto extraído
        this.createExtractedTextContainer();

        // Adicionar estilos CSS se necessário
        this.ensureStylesLoaded();
    }

    /**
     * Atualiza o scroll para a seleção atual durante a narração
     * @param {number} index - Índice da seleção atual
     */
    updateScrollForCurrentSelection(index) {
        if (!this.isSelectionModeActive || !this.scrollManager || index < 0 || index >= this.selections.length) {
            return;
        }

        const currentSelection = this.selections[index];
        if (currentSelection && currentSelection.element) {
            // Atualizar o ScrollManager para manter a seleção visível
            this.scrollManager.setCurrentElement(currentSelection.element);
        }
    }

    /**
     * Inicia a narração de um texto extraído
     * @param {string} text - Texto a ser narrado
     */
    startNarrationWithText(text) {
        if (!this.narrator || !text.trim()) return;

        this.isNarrating = true;
        this.currentNarrationIndex++;

        // Atualizar o scroll para a seleção atual
        this.updateScrollForCurrentSelection(this.currentNarrationIndex);

        // Iniciar a narração
        this.narrator.speak(text, () => {
            // Callback chamado quando a narração deste trecho terminar
            if (this.currentNarrationIndex >= this.selections.length - 1) {
                // Se era o último trecho, resetar o estado
                this.isNarrating = false;
                this.currentNarrationIndex = -1;

                // Ativar scroll automático para próxima página se não houver mais narrações
                if (this.scrollManager) {
                    this.scrollManager.activate();
                }
            }
        });
    }

    /**
     * Configura os callbacks da fila de processamento
     */
    setupQueueCallbacks() {
        // Quando um item é processado (um trecho de texto é extraído)
        this.processingQueue.setOnItemProcessed((result, metadata, index) => {
            console.log(`Trecho #${index + 1} processado:`, result.substring(0, 50) + '...');

            // Iniciar narração para todos os itens, não apenas o primeiro
            // A pausa de 1,5 segundos será aplicada automaticamente pelo método startNarrationWithText
            if (result && result.trim()) {
                this.startNarrationWithText(result);
            }

            // Atualizar o progresso visual
            const stats = this.processingQueue.getStats();
            this.updateProgressIndicator(
                `Processando seleções: ${stats.processedItems}/${stats.totalItems} (${Math.round(stats.progress * 100)}%)`
            );

            // Adicionar o texto extraído ao elemento visual
            this.appendExtractedText(result, index);
        });

        // Quando a fila é concluída
        this.processingQueue.setOnQueueCompleted((stats) => {
            console.log('Processamento de todos os trechos concluído:', stats);

            // Ocultar indicador de progresso
            this.hideProgressIndicator();

            // Mostrar notificação de conclusão
            this.showNotification('Todos os trechos foram processados e enviados para narração', 'success');

            // Importante: Garantir que o sistema não tente processar outras imagens automaticamente
            // Isso resolve o problema de narrar imagens inteiras próximas
            if (this.narrator && typeof this.narrator.stopNarration === 'function') {
                this.narrator.stopNarration();
            }
        });

        // Quando ocorre um erro
        this.processingQueue.setOnError((error, metadata, index) => {
            console.error(`Erro ao processar trecho #${index + 1}:`, error);

            // Mostrar notificação de erro
            this.showNotification(`Erro ao processar trecho #${index + 1}: ${error.message}`, 'error');

            // Adicionar mensagem de erro ao elemento visual
            this.appendExtractedText(`[Erro ao processar trecho #${index + 1}]`, index);
        });

        // Quando ocorre um erro
        this.processingQueue.setOnError((error, metadata, index) => {
            console.error(`Erro ao processar trecho #${index + 1}:`, error);

            // Mostrar notificação de erro
            this.showNotification(`Erro ao processar trecho #${index + 1}: ${error.message}`, 'error');

            // Adicionar mensagem de erro ao elemento visual
            this.appendExtractedText(`[Erro ao processar trecho #${index + 1}]`, index);
        });
    }

    /**
     * Adiciona botão de seleção de texto em imagens ao menu de narração
     */
    addSelectionButton() {
        // Verificar se o painel de controles existe
        const narrationControls = document.getElementById('narrationControls');
        if (!narrationControls) {
            // Tentar novamente após um curto período
            setTimeout(() => this.addSelectionButton(), 1000);
            return;
        }

        // Verificar se o botão já existe
        if (document.getElementById('selectRectangularText')) {
            return;
        }

        // Função mantida para compatibilidade, mas sem implementação de botão
    }

    /**
     * Cria os controles de seleção
     */
    createSelectionControls() {
        // Verificar se os controles já existem
        if (document.querySelector('.rectangular-selection-controls')) {
            this.selectionControls = document.querySelector('.rectangular-selection-controls');
            return;
        }

        // Criar container para os controles
        this.selectionControls = document.createElement('div');
        this.selectionControls.className = 'rectangular-selection-controls';
        this.selectionControls.style.display = 'none';

        // Botão para cancelar a seleção atual
        const cancelButton = document.createElement('button');
        cancelButton.className = 'selection-button cancel';
        cancelButton.innerHTML = '<i class="fas fa-times"></i> Cancelar seleção';
        cancelButton.addEventListener('click', () => this.cancelCurrentSelection());
        this.selectionControls.appendChild(cancelButton);

        // Botão para confirmar a seleção atual
        const confirmButton = document.createElement('button');
        confirmButton.className = 'selection-button confirm';
        confirmButton.innerHTML = '<i class="fas fa-check"></i> Confirmar seleção';
        confirmButton.addEventListener('click', () => this.confirmCurrentSelection());
        this.selectionControls.appendChild(confirmButton);

        // Botão para processar todas as seleções
        const processButton = document.createElement('button');
        processButton.className = 'selection-button process';
        processButton.innerHTML = '<i class="fas fa-play"></i> Processar seleções';
        processButton.addEventListener('click', () => this.processSelections());
        this.selectionControls.appendChild(processButton);

        // Botão para limpar todas as seleções
        const clearButton = document.createElement('button');
        clearButton.className = 'selection-button clear';
        clearButton.innerHTML = '<i class="fas fa-trash-alt"></i> Limpar todas';
        clearButton.addEventListener('click', () => this.clearAllSelections());
        this.selectionControls.appendChild(clearButton);

        // Adicionar ao corpo do documento
        document.body.appendChild(this.selectionControls);
    }

    /**
     * Cria o indicador de modo de seleção
     */
    createSelectionIndicator() {
        // Verificar se o indicador já existe
        if (document.querySelector('.rectangular-selection-indicator')) {
            this.selectionIndicator = document.querySelector('.rectangular-selection-indicator');
            return;
        }

        this.selectionIndicator = document.createElement('div');
        this.selectionIndicator.className = 'rectangular-selection-indicator';
        this.selectionIndicator.innerHTML = '<i class="fas fa-object-group"></i> Modo de seleção de trechos de texto ativo';
        this.selectionIndicator.style.display = 'none';
        document.body.appendChild(this.selectionIndicator);
    }

    /**
     * Cria o container para exibir o texto extraído
     */
    createExtractedTextContainer() {
        // Verificar se o container já existe
        if (document.querySelector('.rectangular-extracted-text-container')) {
            this.extractedTextContainer = document.querySelector('.rectangular-extracted-text-container');
            return;
        }

        // Criar container
        this.extractedTextContainer = document.createElement('div');
        this.extractedTextContainer.className = 'rectangular-extracted-text-container';
        this.extractedTextContainer.style.display = 'none';

        // Adicionar título
        const title = document.createElement('h3');
        title.textContent = 'Texto extraído das seleções';
        this.extractedTextContainer.appendChild(title);

        // Adicionar container para itens de texto
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'extracted-text-items';
        this.extractedTextContainer.appendChild(itemsContainer);

        // Adicionar ao corpo do documento
        document.body.appendChild(this.extractedTextContainer);
    }

    /**
     * Garante que os estilos CSS necessários estejam carregados
     */
    ensureStylesLoaded() {
        // Verificar se o estilo já está carregado
        if (document.querySelector('link[href*="rectangular-selection.css"]')) {
            return;
        }

        // Usar os estilos existentes para seleção de imagem
        // Não é necessário adicionar um novo arquivo CSS, pois os estilos existentes já são suficientes
    }

    /**
     * Alterna o modo de seleção de texto em imagens
     */
    toggleSelectionMode() {
        if (this.isSelectionModeActive) {
            this.disableSelectionMode();
        } else {
            this.enableSelectionMode();
        }
    }

    /**
     * Ativa o modo de seleção de texto em imagens
     */
    enableSelectionMode() {
        // Verificar se o narrador está disponível
        if (!this.narrator) {
            console.warn('Narrador não disponível para seleção de texto em imagens');
            alert('Narrador não disponível. Tente novamente após carregar a página completamente.');
            return;
        }

        // Ativar modo de seleção
        this.isSelectionModeActive = true;

        // Atualizar interface
        document.body.classList.add('rectangular-selection-mode');
        this.selectionIndicator.style.display = 'flex';
        this.selectionControls.style.display = 'flex';

        // Adicionar listeners para imagens
        this.addImageListeners();

        // Mostrar notificação
        this.showNotification('Modo de seleção de trechos de texto ativado. Clique e arraste para selecionar áreas de texto nas imagens.', 'info');
    }

    /**
     * Desativa o modo de seleção de texto em imagens
     */
    disableSelectionMode() {
        // Desativar modo de seleção
        this.isSelectionModeActive = false;

        // Atualizar interface
        document.body.classList.remove('rectangular-selection-mode');
        this.selectionIndicator.style.display = 'none';
        this.selectionControls.style.display = 'none';

        // Remover listeners de imagens
        this.removeImageListeners();

        // Cancelar seleção atual se existir
        if (this.currentSelection) {
            this.cancelCurrentSelection();
        }

        // Limpar referência à imagem atual para permitir selecionar em outras imagens
        this.currentImage = null;

        // Resetar o estado da seleção
        this.isMouseDown = false;

        // Resetar o índice de narração
        this.currentNarrationIndex = -1;
    }

    /**
     * Adiciona listeners de eventos às imagens
     */
    addImageListeners() {
        // Obter todas as imagens no container de imagens
        const imagesContainer = document.getElementById('imagesContainer');
        if (!imagesContainer) {
            console.warn('Container de imagens não encontrado');
            return;
        }

        const images = imagesContainer.querySelectorAll('img');

        // Adicionar listeners a cada imagem
        images.forEach(img => {
            // Adicionar classe para indicar que a imagem é selecionável
            img.classList.add('selectable-image');

            // Adicionar listeners de eventos
            img.addEventListener('mousedown', this.handleImageMouseDown.bind(this));
            img.addEventListener('mousemove', this.handleImageMouseMove.bind(this));
            img.addEventListener('mouseup', this.handleImageMouseUp.bind(this));
            img.addEventListener('mouseleave', this.handleImageMouseLeave.bind(this));
        });
    }

    /**
     * Remove listeners de eventos das imagens
     */
    removeImageListeners() {
        // Obter todas as imagens no container de imagens
        const imagesContainer = document.getElementById('imagesContainer');
        if (!imagesContainer) {
            return;
        }

        const images = imagesContainer.querySelectorAll('img');

        // Remover listeners de cada imagem
        images.forEach(img => {
            // Remover classe de imagem selecionável
            img.classList.remove('selectable-image');

            // Remover listeners de eventos
            img.removeEventListener('mousedown', this.handleImageMouseDown.bind(this));
            img.removeEventListener('mousemove', this.handleImageMouseMove.bind(this));
            img.removeEventListener('mouseup', this.handleImageMouseUp.bind(this));
            img.removeEventListener('mouseleave', this.handleImageMouseLeave.bind(this));
        });
    }

    /**
     * Manipula o evento de pressionar o mouse em uma imagem
     * @param {MouseEvent} event - Evento de mouse
     */
    handleImageMouseDown(event) {
        if (!this.isSelectionModeActive) {
            return;
        }

        // Impedir comportamento padrão
        event.preventDefault();

        // Obter a imagem alvo
        const img = event.target;

        // Armazenar a imagem atual
        this.currentImage = img;

        // Obter posição do mouse relativa à imagem
        const rect = img.getBoundingClientRect();
        this.startX = event.clientX - rect.left;
        this.startY = event.clientY - rect.top;

        // Iniciar seleção
        this.isMouseDown = true;

        // Criar elemento de seleção
        this.createSelectionElement(img, this.startX, this.startY, 0, 0);
    }

    /**
     * Manipula o evento de mover o mouse sobre uma imagem
     * @param {MouseEvent} event - Evento de mouse
     */
    handleImageMouseMove(event) {
        if (!this.isSelectionModeActive || !this.isMouseDown || !this.currentSelection) {
            return;
        }

        // Impedir comportamento padrão
        event.preventDefault();

        // Obter posição do mouse relativa à imagem
        const img = this.currentImage;
        const rect = img.getBoundingClientRect();
        const currentX = event.clientX - rect.left;
        const currentY = event.clientY - rect.top;

        // Calcular dimensões da seleção
        const width = Math.abs(currentX - this.startX);
        const height = Math.abs(currentY - this.startY);

        // Calcular posição da seleção
        const left = Math.min(this.startX, currentX);
        const top = Math.min(this.startY, currentY);

        // Atualizar elemento de seleção
        this.updateSelectionElement(left, top, width, height);
    }

    /**
     * Manipula o evento de soltar o mouse sobre uma imagem
     * @param {MouseEvent} event - Evento de mouse
     */
    handleImageMouseUp(event) {
        if (!this.isSelectionModeActive || !this.isMouseDown) {
            return;
        }

        // Impedir comportamento padrão
        event.preventDefault();

        // Finalizar seleção
        this.isMouseDown = false;

        // Verificar se a seleção tem tamanho mínimo
        const selectionRect = this.currentSelection.getBoundingClientRect();
        if (selectionRect.width < 10 || selectionRect.height < 10) {
            // Seleção muito pequena, cancelar
            this.cancelCurrentSelection();
            return;
        }

        // Mostrar controles de seleção
        this.showSelectionControls();
    }

    /**
     * Manipula o evento de sair da imagem com o mouse
     * @param {MouseEvent} event - Evento de mouse
     */
    handleImageMouseLeave(event) {
        if (!this.isSelectionModeActive || !this.isMouseDown) {
            return;
        }

        // Impedir comportamento padrão
        event.preventDefault();

        // Finalizar seleção
        this.isMouseDown = false;

        // Cancelar seleção atual
        this.cancelCurrentSelection();
    }

    /**
     * Cria um elemento de seleção em uma imagem
     * @param {HTMLImageElement} img - Imagem alvo
     * @param {number} x - Posição X inicial
     * @param {number} y - Posição Y inicial
     * @param {number} width - Largura inicial
     * @param {number} height - Altura inicial
     */
    createSelectionElement(img, x, y, width, height) {
        // Criar container de seleção se não existir
        let selectionContainer = img.parentElement.querySelector('.rectangular-selection-container');
        if (!selectionContainer) {
            selectionContainer = document.createElement('div');
            selectionContainer.className = 'rectangular-selection-container';
            selectionContainer.style.position = 'relative';
            selectionContainer.style.display = 'inline-block';

            // Substituir a imagem pelo container
            const parent = img.parentElement;
            parent.insertBefore(selectionContainer, img);
            selectionContainer.appendChild(img);
        }

        // Criar elemento de seleção
        const selectionElement = document.createElement('div');
        selectionElement.className = 'rectangular-selection';
        selectionElement.style.position = 'absolute';
        selectionElement.style.border = '2px dashed #e74c3c';
        selectionElement.style.backgroundColor = 'rgba(231, 76, 60, 0.2)';
        selectionElement.style.pointerEvents = 'none';
        selectionElement.style.zIndex = '100';

        // Definir posição e tamanho
        selectionElement.style.left = `${x}px`;
        selectionElement.style.top = `${y}px`;
        selectionElement.style.width = `${width}px`;
        selectionElement.style.height = `${height}px`;

        // Adicionar ao container
        selectionContainer.appendChild(selectionElement);

        // Armazenar referência à seleção atual
        this.currentSelection = selectionElement;

        // Garantir que a imagem tenha um ID para referência futura
        if (!img.id) {
            img.id = 'img_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        }
    }

    /**
     * Atualiza a posição e tamanho do elemento de seleção
     * @param {number} x - Posição X
     * @param {number} y - Posição Y
     * @param {number} width - Largura
     * @param {number} height - Altura
     */
    updateSelectionElement(x, y, width, height) {
        if (!this.currentSelection) {
            return;
        }

        // Atualizar posição e tamanho
        this.currentSelection.style.left = `${x}px`;
        this.currentSelection.style.top = `${y}px`;
        this.currentSelection.style.width = `${width}px`;
        this.currentSelection.style.height = `${height}px`;
    }

    /**
     * Mostra os controles de seleção
     */
    showSelectionControls() {
        // Posicionar controles próximos à seleção
        if (this.currentSelection) {
            const rect = this.currentSelection.getBoundingClientRect();
            this.selectionControls.style.bottom = 'auto';
            this.selectionControls.style.left = 'auto';
            this.selectionControls.style.top = `${rect.bottom + window.scrollY + 10}px`;
            this.selectionControls.style.left = `${rect.left + window.scrollX}px`;
        }
    }

    /**
     * Cancela a seleção atual
     */
    cancelCurrentSelection() {
        if (this.currentSelection) {
            // Remover elemento de seleção
            this.currentSelection.remove();
            this.currentSelection = null;
        }
    }

    /**
     * Confirma a seleção atual
     */
    confirmCurrentSelection() {
        if (!this.currentSelection) {
            return;
        }

        // Obter informações da seleção
        const rect = this.currentSelection.getBoundingClientRect();
        const imgRect = this.currentImage.getBoundingClientRect();

        // Obter dimensões da seleção a partir do estilo ou do getBoundingClientRect
        // Usar getBoundingClientRect como fallback para garantir valores válidos
        const left = parseFloat(this.currentSelection.style.left) || 0;
        const top = parseFloat(this.currentSelection.style.top) || 0;
        const width = parseFloat(this.currentSelection.style.width) || rect.width;
        const height = parseFloat(this.currentSelection.style.height) || rect.height;

        // Verificar se os valores são válidos
        if (isNaN(width) || width <= 0 || isNaN(height) || height <= 0) {
            console.error('Dimensões de seleção inválidas:', { left, top, width, height });
            this.showNotification('Erro: Dimensões de seleção inválidas. Tente novamente.', 'error');
            this.cancelCurrentSelection();
            return;
        }

        // Garantir que a imagem tenha um ID para referência futura
        if (!this.currentImage.id) {
            this.currentImage.id = 'img_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        }

        // Calcular posição relativa à imagem
        const selection = {
            // Não armazenar a referência direta à imagem, apenas o ID
            imageId: this.currentImage.id,
            imageSrc: this.currentImage.src, // Armazenar também a URL da imagem como referência adicional
            left: left,
            top: top,
            width: width,
            height: height,
            index: this.selections.length
        };

        // Garantir que a imagem tenha um ID para referência futura
        if (!this.currentImage.id) {
            this.currentImage.id = selection.imageId;
        }

        console.log('Seleção confirmada com dimensões:', selection);

        // Adicionar à lista de seleções
        this.selections.push(selection);

        // Atualizar estilo da seleção para confirmada
        this.currentSelection.classList.add('confirmed');
        this.currentSelection.style.border = '2px solid #2ecc71';
        this.currentSelection.style.backgroundColor = 'rgba(46, 204, 113, 0.2)';

        // Adicionar número da seleção
        const numberElement = document.createElement('div');
        numberElement.className = 'selection-number';
        numberElement.textContent = selection.index + 1;
        numberElement.style.position = 'absolute';
        numberElement.style.top = '-12px';
        numberElement.style.left = '-12px';
        numberElement.style.backgroundColor = '#3498db';
        numberElement.style.color = 'white';
        numberElement.style.borderRadius = '50%';
        numberElement.style.width = '24px';
        numberElement.style.height = '24px';
        numberElement.style.display = 'flex';
        numberElement.style.alignItems = 'center';
        numberElement.style.justifyContent = 'center';
        numberElement.style.fontSize = '12px';
        numberElement.style.fontWeight = 'bold';
        numberElement.style.zIndex = '101';
        this.currentSelection.appendChild(numberElement);

        // Limpar seleção atual
        this.currentSelection = null;

        // Mostrar notificação
        this.showNotification(`Seleção #${selection.index + 1} confirmada. Selecione mais áreas ou clique em "Processar seleções".`, 'success');
    }

    /**
     * Limpa todas as seleções
     */
    clearAllSelections() {
        // Limpar a fila de processamento
        this.processingQueue.clearQueue();

        // Remover todos os elementos de seleção
        const selectionElements = document.querySelectorAll('.rectangular-selection');
        selectionElements.forEach(element => element.remove());

        // Limpar array de seleções
        this.selections = [];

        // Ocultar container de texto extraído
        if (this.extractedTextContainer) {
            this.extractedTextContainer.style.display = 'none';
            const itemsContainer = this.extractedTextContainer.querySelector('.extracted-text-items');
            if (itemsContainer) {
                itemsContainer.innerHTML = '';
            }
        }

        // Mostrar notificação
        this.showNotification('Todas as seleções foram removidas', 'info');
    }

    /**
     * Processa as seleções para extrair texto
     */
    async processSelections() {
        if (this.selections.length === 0) {
            this.showNotification('Nenhuma seleção para processar. Selecione áreas de texto nas imagens.', 'warning');
            return;
        }

        // Mostrar container de texto extraído
        this.extractedTextContainer.style.display = 'block';

        // Limpar itens anteriores
        const itemsContainer = this.extractedTextContainer.querySelector('.extracted-text-items');
        itemsContainer.innerHTML = '';

        // Mostrar indicador de progresso
        this.showProgressIndicator('Preparando para processar seleções...');

        // Limpar fila de processamento
        this.processingQueue.clearQueue();

        // Resetar o índice de narração para evitar que continue processando após o término
        this.currentNarrationIndex = -1;

        // Limpar textos extraídos para todas as imagens processadas
        // Isso garante que não haja conflito entre diferentes imagens
        this.extractedTexts.clear();

        // Liberar a referência à imagem atual imediatamente após processar as seleções
        // Isso permitirá selecionar quadros de outras imagens posteriormente
        this.currentImage = null;

        // Criar cópias das seleções para evitar problemas de referência
        const selectionsCopy = this.selections.map(selection => ({
            ...selection,
            // Garantir que todas as propriedades necessárias existam
            imageId: selection.imageId || '',
            imageSrc: selection.imageSrc || '',
            left: selection.left || 0,
            top: selection.top || 0,
            width: selection.width || 100,
            height: selection.height || 100,
            index: selection.index || 0
        }));

        // Adicionar cada seleção à fila de processamento
        selectionsCopy.forEach(selection => {
            // Usar a função de processamento diretamente como item da fila
            this.processingQueue.addItem(async () => {
                try {
                    // Extrair região da imagem
                    const imageRegion = await this.extractImageRegion(selection);

                    // Processar OCR na região
                    const text = await this.ocrProcessor.processImage(imageRegion);

                    // Armazenar o texto extraído para esta imagem
                    if (selection.imageId) {
                        if (!this.extractedTexts.has(selection.imageId)) {
                            this.extractedTexts.set(selection.imageId, []);
                        }

                        const textsForImage = this.extractedTexts.get(selection.imageId);
                        textsForImage[selection.index] = text // Usar o índice da seleção
                        this.extractedTexts.set(selection.imageId, textsForImage);
                    }

                    return text;
                } catch (error) {
                    console.error('Erro ao processar seleção:', error, selection);
                    throw error;
                }
            }, { index: selection.index });
        });

        // Iniciar processamento
        try {
            await this.processingQueue.startProcessing();
        } catch (error) {
            console.error('Erro ao processar seleções:', error);
            this.showNotification(`Erro ao processar seleções: ${error.message}`, 'error');
            this.hideProgressIndicator();
        }
    }

    /**
     * Extrai uma região de uma imagem
     * @param {Object} selection - Informações da seleção
     * @returns {Promise<HTMLCanvasElement>} - Canvas com a região extraída
     */
    async extractImageRegion(selection) {
        return new Promise((resolve, reject) => {
            try {
                // Verificar se a seleção é válida
                if (!selection) {
                    throw new Error('Objeto de seleção não fornecido');
                }

                console.log('Processando seleção:', JSON.stringify(selection));

                // Obter a imagem usando várias estratégias de recuperação
                let imageElement = null;

                // Estratégia 1: Buscar pelo ID (se existir)
                if (selection.imageId && typeof selection.imageId === 'string') {
                    imageElement = document.getElementById(selection.imageId);
                    console.log('Estratégia 1 (ID):', imageElement ? 'Imagem encontrada' : 'Imagem não encontrada');
                }

                // Estratégia 2: Buscar por seletor de classe e ID
                if (!imageElement && selection.imageId && typeof selection.imageId === 'string') {
                    const images = document.querySelectorAll('img.selectable-image');
                    for (const img of images) {
                        if (img.id === selection.imageId) {
                            imageElement = img;
                            console.log('Estratégia 2 (Classe+ID): Imagem encontrada');
                            break;
                        }
                    }
                }

                // Estratégia 3: Buscar por URL da imagem
                if (!imageElement && selection.imageSrc) {
                    const images = document.querySelectorAll('img');
                    for (const img of images) {
                        if (img.src === selection.imageSrc) {
                            imageElement = img;
                            console.log('Estratégia 3 (URL): Imagem encontrada');
                            break;
                        }
                    }
                }

                // Estratégia 4: Buscar qualquer imagem selecionável (último recurso)
                if (!imageElement) {
                    const images = document.querySelectorAll('img.selectable-image');
                    if (images.length > 0) {
                        console.warn('Não foi possível encontrar a imagem específica. Usando a primeira imagem selecionável disponível.');
                        imageElement = images[0];
                    }
                }

                // Estratégia 5: Usar a imagem atual se estiver disponível
                if (!imageElement && this.currentImage) {
                    console.warn('Usando a imagem atual como fallback');
                    imageElement = this.currentImage;
                }

                // Verificar se a imagem foi encontrada
                if (!imageElement) {
                    throw new Error('Seleção inválida: imagem não encontrada');
                }

                // Verificar se as dimensões são válidas e fornecer valores padrão se necessário
                const width = selection.width || 100;
                const height = selection.height || 100;
                const left = selection.left || 0;
                const top = selection.top || 0;

                if (isNaN(width) || width <= 0 || isNaN(height) || height <= 0) {
                    throw new Error('Dimensões de seleção inválidas');
                }

                // Log detalhado das coordenadas para depuração
                console.log('Coordenadas de extração:', {
                    left: left,
                    top: top,
                    width: width,
                    height: height,
                    imageWidth: imageElement.width,
                    imageHeight: imageElement.height,
                    naturalWidth: imageElement.naturalWidth,
                    naturalHeight: imageElement.naturalHeight
                });

                // Criar canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Definir tamanho do canvas
                canvas.width = width;
                canvas.height = height;

                // Calcular a escala entre as dimensões naturais e as dimensões exibidas
                const scaleX = imageElement.naturalWidth / imageElement.width;
                const scaleY = imageElement.naturalHeight / imageElement.height;

                // Ajustar coordenadas para a escala real da imagem
                const scaledLeft = left * scaleX;
                const scaledTop = top * scaleY;
                const scaledWidth = width * scaleX;
                const scaledHeight = height * scaleY;

                // Log das coordenadas ajustadas
                console.log('Coordenadas ajustadas para escala real:', {
                    scaledLeft,
                    scaledTop,
                    scaledWidth,
                    scaledHeight,
                    scaleX,
                    scaleY
                });

                // Desenhar região da imagem no canvas usando as coordenadas ajustadas
                ctx.drawImage(
                    imageElement,
                    scaledLeft, scaledTop, scaledWidth, scaledHeight,
                    0, 0, width, height
                );

                // Criar visualização de depuração se estiver em modo de desenvolvimento
                if (window.DEBUG_OCR_EXTRACTION || true) { // Temporariamente ativado para todos
                    this.showDebugExtraction(imageElement, left, top, width, height, canvas);
                }

                // Resolver com o canvas
                resolve(canvas);
            } catch (error) {
                console.error('Erro ao extrair região da imagem:', error, selection);
                reject(error);
            }
        });
    }

    /**
     * Mostra uma visualização de depuração da extração de imagem
     * @param {HTMLImageElement} originalImage - Imagem original
     * @param {number} left - Posição X da seleção
     * @param {number} top - Posição Y da seleção
     * @param {number} width - Largura da seleção
     * @param {number} height - Altura da seleção
     * @param {HTMLCanvasElement} extractedCanvas - Canvas com a região extraída
     */
    showDebugExtraction(originalImage, left, top, width, height, extractedCanvas) {
        // Calcular a escala entre as dimensões naturais e as dimensões exibidas
        const scaleX = originalImage.naturalWidth / originalImage.width;
        const scaleY = originalImage.naturalHeight / originalImage.height;

        // Ajustar coordenadas para a escala real da imagem
        const scaledLeft = left * scaleX;
        const scaledTop = top * scaleY;
        const scaledWidth = width * scaleX;
        const scaledHeight = height * scaleY;
        // Criar ou obter o container de depuração
        let debugContainer = document.getElementById('ocr-debug-container');
        if (!debugContainer) {
            debugContainer = document.createElement('div');
            debugContainer.id = 'ocr-debug-container';
            debugContainer.style.position = 'fixed';
            debugContainer.style.top = '10px';
            debugContainer.style.right = '10px';
            debugContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            debugContainer.style.padding = '10px';
            debugContainer.style.borderRadius = '5px';
            debugContainer.style.zIndex = '9999';
            debugContainer.style.color = 'white';
            debugContainer.style.maxWidth = '400px';
            debugContainer.style.maxHeight = '80vh';
            debugContainer.style.overflow = 'auto';
            document.body.appendChild(debugContainer);
        }

        // Limpar container
        debugContainer.innerHTML = '';

        // Adicionar título
        const title = document.createElement('h3');
        title.textContent = 'Depuração de Extração OCR';
        title.style.margin = '0 0 10px 0';
        debugContainer.appendChild(title);

        // Adicionar botão para fechar
        const closeButton = document.createElement('button');
        closeButton.textContent = 'X';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '5px';
        closeButton.style.right = '5px';
        closeButton.style.backgroundColor = 'red';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '50%';
        closeButton.style.width = '20px';
        closeButton.style.height = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.addEventListener('click', () => {
            debugContainer.remove();
        });
        debugContainer.appendChild(closeButton);

        // Adicionar informações de coordenadas
        const coordInfo = document.createElement('div');
        coordInfo.innerHTML = `
            <p><strong>Coordenadas na tela:</strong></p>
            <ul>
                <li>Left: ${left}px</li>
                <li>Top: ${top}px</li>
                <li>Width: ${width}px</li>
                <li>Height: ${height}px</li>
            </ul>
            <p><strong>Coordenadas ajustadas para OCR:</strong></p>
            <ul>
                <li>Left: ${scaledLeft.toFixed(2)}px</li>
                <li>Top: ${scaledTop.toFixed(2)}px</li>
                <li>Width: ${scaledWidth.toFixed(2)}px</li>
                <li>Height: ${scaledHeight.toFixed(2)}px</li>
                <li>Escala X: ${scaleX.toFixed(2)}</li>
                <li>Escala Y: ${scaleY.toFixed(2)}</li>
            </ul>
        `;
        debugContainer.appendChild(coordInfo);

        // Adicionar visualização da imagem original com retângulo
        const originalPreview = document.createElement('div');
        originalPreview.innerHTML = '<p><strong>Imagem Original com Seleção:</strong></p>';

        // Criar canvas para mostrar a imagem original com retângulo
        const originalCanvas = document.createElement('canvas');
        const maxPreviewWidth = 350;
        const scale = Math.min(1, maxPreviewWidth / originalImage.width);
        originalCanvas.width = originalImage.width * scale;
        originalCanvas.height = originalImage.height * scale;
        originalCanvas.style.border = '1px solid #ccc';

        const originalCtx = originalCanvas.getContext('2d');
        originalCtx.drawImage(originalImage, 0, 0, originalCanvas.width, originalCanvas.height);

        // Desenhar retângulo na posição da seleção
        originalCtx.strokeStyle = 'red';
        originalCtx.lineWidth = 2;
        originalCtx.strokeRect(
            left * scale,
            top * scale,
            width * scale,
            height * scale
        );

        originalPreview.appendChild(originalCanvas);
        debugContainer.appendChild(originalPreview);

        // Adicionar visualização da região extraída
        const extractedPreview = document.createElement('div');
        extractedPreview.innerHTML = '<p><strong>Região Extraída para OCR:</strong></p>';

        // Criar canvas para mostrar a região extraída
        const extractedImg = document.createElement('img');
        extractedImg.src = extractedCanvas.toDataURL();
        extractedImg.style.maxWidth = '100%';
        extractedImg.style.border = '1px solid #ccc';

        extractedPreview.appendChild(extractedImg);
        debugContainer.appendChild(extractedPreview);
    }

    /**
     * Inicia a narração com o texto extraído
     * @param {string} text - Texto para narrar
     */
    startNarrationWithText(text) {
        if (!this.narrator || !text || !text.trim()) {
            return;
        }
        console.log("Texto: " + text)
        // Processar o texto para remover quebras de linha desnecessárias
        const processedText = this.processTextForNarration(text);

        // Ativar o ScrollManager e definir a seleção atual como elemento a ser mantido visível
        if (this.scrollManager) {
            this.scrollManager.activate();
            const currentSelection = this.currentSelection;
            if (currentSelection) {
                this.scrollManager.setCurrentElement(currentSelection);
            }
        }

        console.log('Iniciando narração com texto processado:', processedText.substring(0, 50) + '...');

        // Manter o índice de narração como -1 até que a narração atual termine
        // Isso evita que o sistema tente reutilizar os mesmos quadros para a próxima imagem
        this.currentNarrationIndex = -1;

        // Verificar se há uma narração em andamento
        if (this.narrator.synth.speaking) {
            console.log('Narração em andamento detectada. Adicionando pausa de 1,5 segundos entre seleções de texto...');

            // Criar uma função para verificar periodicamente se a narração terminou
            const checkAndSpeak = () => {
                if (this.narrator.synth.speaking) {
                    // Ainda falando, verificar novamente após um curto período
                    setTimeout(checkAndSpeak, 100);
                } else {
                    // Narração anterior terminou, adicionar pausa e então falar
                    console.log('Narração anterior concluída, aguardando 1,5 segundos antes da próxima seleção...');
                    setTimeout(() => {
                        console.log('Iniciando próxima narração após pausa...');
                        this.narrator.speakText(processedText);
                    }, 1500); // 1,5 segundos em milissegundos
                }
            };

            // Iniciar a verificação
            checkAndSpeak();
        } else {
            // Se não houver narração em andamento, iniciar imediatamente
            console.log('Nenhuma narração em andamento, iniciando imediatamente...');
            // Garantir que a pausa seja aplicada mesmo na primeira narração
            // para dar tempo ao usuário de se preparar
            setTimeout(() => {
                this.narrator.speakText(processedText);
            }, 500); // Pausa menor para a primeira narração (0,5 segundos)
        }
    }

    /**
     * Processa o texto extraído para melhorar a narração
     * @param {string} text - Texto original extraído do OCR
     * @returns {string} - Texto processado para narração
     */
    processTextForNarration(text) {
        if (!text) return '';

        // Remover quebras de linha desnecessárias, preservando parágrafos
        let processedText = text
            // Substituir múltiplas quebras de linha por um marcador de parágrafo temporário
            .replace(/\n{2,}/g, '§PARAGRAPH§')
            // Remover quebras de linha simples
            .replace(/\n/g, ' ')
            // Restaurar parágrafos com uma única quebra de linha
            .replace(/§PARAGRAPH§/g, '\n')
            // Remover espaços múltiplos
            .replace(/\s+/g, ' ')
            // Remover espaços no início e fim
            .trim();

        return processedText;
    }

    /**
     * Adiciona texto extraído ao container
     * @param {string} text - Texto extraído
     * @param {number} index - Índice da seleção
     */
    appendExtractedText(text, index) {
        if (!this.extractedTextContainer) {
            return;
        }

        const itemsContainer = this.extractedTextContainer.querySelector('.extracted-text-items');
        if (!itemsContainer) {
            return;
        }

        // Criar item de texto
        const textItem = document.createElement('div');
        textItem.className = 'extracted-text-item';

        // Adicionar badge com número da seleção
        const badge = document.createElement('div');
        badge.className = 'selection-badge';
        badge.textContent = index + 1;
        textItem.appendChild(badge);

        // Adicionar conteúdo do texto
        const content = document.createElement('div');
        content.className = 'extracted-text-content';
        content.textContent = text || '[Nenhum texto extraído]';
        textItem.appendChild(content);

        // Adicionar ao container
        itemsContainer.appendChild(textItem);

        // Mostrar container
        this.extractedTextContainer.style.display = 'block';
    }

    /**
     * Mostra um indicador de progresso
     * @param {string} message - Mensagem de progresso
     */
    showProgressIndicator(message) {
        // Verificar se já existe um indicador
        let progressIndicator = document.querySelector('.progress-indicator');

        if (!progressIndicator) {
            // Criar indicador de progresso
            progressIndicator = document.createElement('div');
            progressIndicator.className = 'progress-indicator';

            // Adicionar mensagem
            const messageElement = document.createElement('div');
            messageElement.className = 'progress-message';
            progressIndicator.appendChild(messageElement);

            // Adicionar barra de progresso
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            const progressFill = document.createElement('div');
            progressFill.className = 'progress-fill';
            progressBar.appendChild(progressFill);
            progressIndicator.appendChild(progressBar);

            // Adicionar ao corpo do documento
            document.body.appendChild(progressIndicator);
        }

        // Atualizar mensagem
        const messageElement = progressIndicator.querySelector('.progress-message');
        if (messageElement) {
            messageElement.textContent = message;
        }

        // Mostrar indicador
        progressIndicator.style.display = 'flex';
    }

    /**
     * Oculta o indicador de progresso
     */
    hideProgressIndicator() {
        const progressIndicator = document.querySelector('.progress-indicator');
        if (progressIndicator) {
            progressIndicator.style.display = 'none';
        }
    }

    /**
     * Atualiza o indicador de progresso
     * @param {string} message - Mensagem de progresso
     * @param {number} progress - Progresso (0-1)
     */
    updateProgressIndicator(message, progress) {
        const progressIndicator = document.querySelector('.progress-indicator');
        if (!progressIndicator) {
            return;
        }

        // Atualizar mensagem
        const messageElement = progressIndicator.querySelector('.progress-message');
        if (messageElement && message) {
            messageElement.textContent = message;
        }

        // Atualizar barra de progresso
        if (typeof progress === 'number') {
            const progressFill = progressIndicator.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = `${Math.round(progress * 100)}%`;
            }
        }
    }

    /**
     * Mostra uma notificação
     * @param {string} message - Mensagem da notificação
     * @param {string} type - Tipo da notificação (success, error, warning, info)
     */
    showNotification(message, type = 'info') {
        // Verificar se já existe uma notificação
        let notification = document.querySelector('.rectangular-selection-notification');

        if (!notification) {
            // Criar notificação
            notification = document.createElement('div');
            notification.className = 'rectangular-selection-notification';

            // Adicionar ao corpo do documento
            document.body.appendChild(notification);
        }

        // Definir classe de tipo
        notification.className = 'rectangular-selection-notification';
        notification.classList.add(`notification-${type}`);

        // Definir mensagem
        notification.textContent = message;

        // Mostrar notificação
        notification.style.display = 'block';

        // Ocultar após um tempo
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }

    /**
     * Obtém os textos extraídos para uma imagem específica
     * @param {HTMLImageElement} imgElement - Elemento de imagem
     * @returns {Array<string>} - Array de textos extraídos para a imagem
     */
    getExtractedTextsForImage(imgElement) {
        if (!imgElement) return [];

        const imageId = imgElement.id || imgElement.src;
        return this.extractedTexts.has(imageId) ? this.extractedTexts.get(imageId) : [];
    }

    /**
     * Destaca uma seleção específica durante a narração
     * @param {number} index - Índice da seleção a ser destacada
     */
    highlightSelection(index) {
        // Remover destaque de todas as seleções
        document.querySelectorAll('.rectangular-selection').forEach(sel => {
            sel.style.backgroundColor = 'rgba(46, 204, 113, 0.2)';
            sel.style.borderColor = '#2ecc71';
            sel.style.boxShadow = 'none';
        });

        // Encontrar a seleção pelo número (índice + 1)
        const selectionNumber = index + 1;
        const selectionElement = document.querySelector(`.rectangular-selection:nth-child(${selectionNumber})`);

        if (selectionElement) {
            // Destacar a seleção atual
            selectionElement.style.backgroundColor = 'rgba(52, 152, 219, 0.4)';
            selectionElement.style.borderColor = '#3498db';
            selectionElement.style.boxShadow = '0 0 15px rgba(52, 152, 219, 0.7)';

            // Rolar para a seleção
            this.scrollToSelection(selectionElement);

            // Atualizar o índice atual
            this.currentNarrationIndex = index;
        }
    }

    /**
     * Rola a página para mostrar a seleção
     * @param {HTMLElement} selectionElement - Elemento de seleção
     */
    scrollToSelection(selectionElement) {
        if (!selectionElement) return;

        // Obter a posição da seleção
        const rect = selectionElement.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Calcular a posição de destino (centro da viewport)
        const targetTop = rect.top + scrollTop - (window.innerHeight / 2) + (rect.height / 2);

        // Rolar suavemente para a posição
        window.scrollTo({
            top: targetTop,
            behavior: 'smooth'
        });
    }
}