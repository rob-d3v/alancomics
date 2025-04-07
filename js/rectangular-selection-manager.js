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
        this.currentSelection = null;
        this.startX = 0;
        this.startY = 0;
        this.isMouseDown = false;
        
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
     * Configura os callbacks da fila de processamento
     */
    setupQueueCallbacks() {
        // Quando um item é processado (um trecho de texto é extraído)
        this.processingQueue.setOnItemProcessed((result, metadata, index) => {
            console.log(`Trecho #${index + 1} processado:`, result.substring(0, 50) + '...');
            
            // Se for o primeiro item, iniciar narração imediatamente
            if (index === 0 && result && result.trim()) {
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
        // Remover elementos de seleção
        const containers = document.querySelectorAll('.rectangular-selection-container');
        containers.forEach(container => {
            const selections = container.querySelectorAll('.rectangular-selection');
            selections.forEach(selection => selection.remove());
        });
        
        // Limpar lista de seleções
        this.selections = [];
        this.currentSelection = null;
        
        // Mostrar notificação
        this.showNotification('Todas as seleções foram removidas.', 'info');
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
                
                // Criar canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Definir tamanho do canvas
                canvas.width = width;
                canvas.height = height;
                
                // Desenhar região da imagem no canvas
                ctx.drawImage(
                    imageElement,
                    left, top, width, height,
                    0, 0, width, height
                );
                
                // Resolver com o canvas
                resolve(canvas);
            } catch (error) {
                console.error('Erro ao extrair região da imagem:', error, selection);
                reject(error);
            }
        });
    }
    
    /**
     * Inicia a narração com o texto extraído
     * @param {string} text - Texto para narrar
     */
    startNarrationWithText(text) {
        if (!this.narrator || !text || !text.trim()) {
            return;
        }
        
        console.log('Iniciando narração com texto:', text.substring(0, 50) + '...');
        
        // Enviar texto para o narrador
        this.narrator.speakText(text);
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
}