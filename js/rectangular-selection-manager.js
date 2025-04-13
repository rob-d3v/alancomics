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
        // this.extractedTextContainer = null;

        // Referências a outros módulos
        this.narrator = null;
        this.ocrProcessor = null;
        this.processingQueue = null;
        
        // Vincular métodos de manipulação de eventos para preservar o contexto 'this'
        // e permitir a remoção correta dos event listeners
        this.boundHandleImageMouseDown = this.handleImageMouseDown.bind(this);
        this.boundHandleImageMouseMove = this.handleImageMouseMove.bind(this);
        this.boundHandleImageMouseUp = this.handleImageMouseUp.bind(this);
        this.boundHandleImageMouseLeave = this.handleImageMouseLeave.bind(this);

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
        // this.createExtractedTextContainer();

        // Adicionar estilos CSS se necessário
        this.ensureStylesLoaded();
    }

    /**
     * Atualiza o scroll para a seleção atual durante a narração
     * @param {number} index - Índice da seleção atual
     */
    updateScrollForCurrentSelection(index) {
        // Verificar se o índice é válido e se temos um ScrollManager
        if (!this.scrollManager || index < 0 || index >= this.selections.length) {
            return;
        }

        const currentSelection = this.selections[index];
        if (currentSelection && currentSelection.element) {
            // Forçar desativação do scroll automático durante a narração das seleções
            this.scrollManager.deactivate();

            // Configurar o ScrollManager para um comportamento mais preciso
            this.scrollManager.settings.behavior = 'smooth';
            this.scrollManager.settings.verticalAlignment = 0.35; // Posicionar mais ao centro
            this.scrollManager.settings.margin = 120; // Aumentar margem de segurança
            this.scrollManager.settings.scrollDelay = 50; // Reduzir atraso para resposta mais rápida

            // Atualizar o ScrollManager para manter a seleção visível
            this.scrollManager.setCurrentElement(currentSelection.element);

            // Adicionar destaque visual temporário
            currentSelection.element.classList.add('current-selection-highlight');
            setTimeout(() => {
                currentSelection.element.classList.remove('current-selection-highlight');
            }, 1500);
            
            // Garantir que a imagem que contém a seleção esteja visível
            if (currentSelection.imageId) {
                const img = document.getElementById(currentSelection.imageId);
                if (img) {
                    // Rolar para a imagem com um pequeno offset para melhor visualização
                    const rect = img.getBoundingClientRect();
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const targetTop = rect.top + scrollTop - 100; // 100px acima da imagem
                    
                    window.scrollTo({
                        top: targetTop,
                        behavior: 'smooth'
                    });
                }
            }
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

        // Garantir que o scroll automático esteja desativado antes de iniciar a narração
        if (this.scrollManager) {
            this.scrollManager.deactivate();
            console.log('RectangularSelectionManager: Scroll automático desativado para narração de seleção');
        }

        // Garantir que os elementos de seleção estejam ocultos durante a narração
        this.hideSelectionElementsDuringNarration();

        // Atualizar o scroll para a seleção atual
        this.updateScrollForCurrentSelection(this.currentNarrationIndex);

        // Processar o texto para melhorar a narração
        const processedText = this.processTextForNarration(text);

        // Iniciar a narração
        this.narrator.speak(processedText, () => {
            // Callback chamado quando a narração deste trecho terminar
            if (this.currentNarrationIndex >= this.selections.length - 1) {
                // Se era o último trecho, resetar o estado
                this.isNarrating = false;
                this.currentNarrationIndex = -1;

                // Reativar scroll automático apenas se não houver mais narrações
                if (this.scrollManager && !this.isNarrating) {
                    console.log('RectangularSelectionManager: Reativando scroll automático após última seleção');
                    this.scrollManager.activate();
                    // Restaurar configurações padrão do ScrollManager
                    this.scrollManager.settings.behavior = 'smooth';
                    this.scrollManager.settings.verticalAlignment = 0.3;
                    this.scrollManager.settings.margin = 50;
                    this.scrollManager.settings.scrollDelay = 100;
                    
                    // Rolar até o final da página após a última narração
                    setTimeout(() => {
                        window.scrollTo({
                            top: document.body.scrollHeight,
                            behavior: 'smooth'
                        });
                    }, 1000);
                }
                
                // Restaurar a visibilidade dos elementos de seleção
                setTimeout(() => {
                    this.restoreSelectionElementsVisibility();
                }, 1500);
            } else {
                // Preparar para a próxima seleção
                setTimeout(() => {
                    if (this.isNarrating) {
                        this.updateScrollForCurrentSelection(this.currentNarrationIndex + 1);
                    }
                }, 800); // Aumentar o atraso para uma transição mais suave
            }
        });

        console.log(`RectangularSelectionManager: Iniciando narração da seleção #${this.currentNarrationIndex + 1}`);
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

            // NÃO interromper a narração aqui para permitir que todas as seleções sejam narradas
            // Apenas verificar se a narração está em andamento
            if (this.narrator && this.narrator.synth && this.narrator.synth.speaking) {
                console.log('Narração em andamento após processamento de todas as seleções. Permitindo que continue...');
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
    // createExtractedTextContainer() {
        // Verificar se o container já existe
        // if (document.querySelector('.rectangular-extracted-text-container')) {
            // this.extractedTextContainer = document.querySelector('.rectangular-extracted-text-container');
            // return;
        // }

        // Criar container
        // this.extractedTextContainer = document.createElement('div');
        // this.extractedTextContainer.className = 'rectangular-extracted-text-container';
        // this.extractedTextContainer.style.display = 'none';

        // Adicionar título
        // const title = document.createElement('h3');
        // title.textContent = 'Texto extraído das seleções';
        // this.extractedTextContainer.appendChild(title);

        // Adicionar container para itens de texto
        // const itemsContainer = document.createElement('div');
        // itemsContainer.className = 'extracted-text-items';
        // this.extractedTextContainer.appendChild(itemsContainer);

        // Adicionar ao corpo do documento
        // document.body.appendChild(this.extractedTextContainer);
    // }

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
        
        // Restaurar tamanho original das imagens que foram modificadas
        const selectionContainers = document.querySelectorAll('.rectangular-selection-container');
        console.log(`Restaurando ${selectionContainers.length} containers de seleção`);
        
        selectionContainers.forEach((container, index) => {
            const img = container.querySelector('img');
            if (img) {
                console.log(`Restaurando imagem #${index + 1}: ${img.id || 'sem ID'}`);
                
                // Remover estilos aplicados à imagem
                img.style.width = '';
                img.style.height = '';
                img.style.maxWidth = '';
                
                // Mover a imagem de volta para seu pai original se possível
                if (container.parentElement) {
                    container.parentElement.insertBefore(img, container);
                    // Remover o container vazio
                    container.remove();
                }
            }
        });
        
        // Remover qualquer container de depuração OCR
        const debugContainer = document.getElementById('ocr-debug-container');
        if (debugContainer) {
            debugContainer.remove();
        }
        
        // Limpar todas as seleções
        this.clearAllSelections();
        
        // Mostrar notificação
        this.showNotification('Modo de seleção de texto desativado', 'info');
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

            // Adicionar listeners de eventos usando as funções vinculadas
            img.addEventListener('mousedown', this.boundHandleImageMouseDown);
            img.addEventListener('mousemove', this.boundHandleImageMouseMove);
            img.addEventListener('mouseup', this.boundHandleImageMouseUp);
            img.addEventListener('mouseleave', this.boundHandleImageMouseLeave);
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

            // Remover listeners de eventos usando as funções vinculadas
            img.removeEventListener('mousedown', this.boundHandleImageMouseDown);
            img.removeEventListener('mousemove', this.boundHandleImageMouseMove);
            img.removeEventListener('mouseup', this.boundHandleImageMouseUp);
            img.removeEventListener('mouseleave', this.boundHandleImageMouseLeave);
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
        
        // Verificar se é uma imagem válida
        if (!(img instanceof HTMLImageElement)) {
            console.warn('O elemento clicado não é uma imagem válida');
            return;
        }

        // Cancelar qualquer seleção atual antes de iniciar uma nova
        if (this.currentSelection) {
            this.cancelCurrentSelection();
        }

        // Armazenar a imagem atual temporariamente apenas para esta seleção
        this.currentImage = img;
        
        // Garantir que a imagem tenha um ID para referência futura
        if (!img.id) {
            img.id = 'img_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        }

        // Obter posição do mouse relativa à imagem
        const rect = img.getBoundingClientRect();
        this.startX = event.clientX - rect.left;
        this.startY = event.clientY - rect.top;

        // Iniciar seleção
        this.isMouseDown = true;

        // Criar elemento de seleção
        this.createSelectionElement(img, this.startX, this.startY, 0, 0);
        
        console.log(`Iniciando seleção na imagem: ${img.id}`);
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

        // Verificar se temos uma imagem atual válida
        if (!this.currentImage) {
            console.warn('Imagem atual não definida durante o movimento do mouse');
            return;
        }
        
        // Verificar se o evento ocorreu na imagem atual
        // Isso evita problemas quando o mouse sai da imagem durante a seleção
        if (event.target !== this.currentImage) {
            // Se o mouse saiu da imagem, não atualizar a seleção
            // mas também não cancelar, permitindo que o usuário continue a seleção
            // quando o mouse voltar para a imagem
            return;
        }

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

        // Confirmar automaticamente a seleção em vez de mostrar controles
        this.confirmCurrentSelection();
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
        // Verificar se a imagem já está em um container de seleção
        let selectionContainer = img.closest('.rectangular-selection-container');
        
        // Se não estiver, criar um novo container
        if (!selectionContainer) {
            // Obter as dimensões originais da imagem antes de qualquer modificação
            const originalWidth = img.width || img.naturalWidth;
            const originalHeight = img.height || img.naturalHeight;
            
            selectionContainer = document.createElement('div');
            selectionContainer.className = 'rectangular-selection-container';
            selectionContainer.style.position = 'relative';
            selectionContainer.style.display = 'inline-block';
            selectionContainer.style.width = originalWidth + 'px'; // Usar dimensões originais
            selectionContainer.style.height = originalHeight + 'px';
            
            // Armazenar referência à imagem original no container
            selectionContainer.dataset.originalImageId = img.id || '';

            // Substituir a imagem pelo container
            const parent = img.parentElement;
            parent.insertBefore(selectionContainer, img);
            selectionContainer.appendChild(img);
            
            // Garantir que a imagem mantenha seu tamanho original
            // mas não modificar o estilo se já estiver definido
            if (!img.style.width) {
                img.style.width = '100%';
                img.style.height = 'auto';
                img.style.maxWidth = 'none';
            }
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
        if (!this.currentSelection || !this.currentImage) {
            console.warn('Não é possível confirmar a seleção: seleção ou imagem atual não definida');
            return;
        }

        // Obter informações da seleção diretamente do estilo para maior precisão
        // Isso evita problemas com getBoundingClientRect que pode ser afetado pelo scroll
        const left = parseFloat(this.currentSelection.style.left) || 0;
        const top = parseFloat(this.currentSelection.style.top) || 0;
        const width = parseFloat(this.currentSelection.style.width) || 0;
        const height = parseFloat(this.currentSelection.style.height) || 0;
        
        // Verificar se as dimensões são válidas
        if (width < 10 || height < 10) {
            console.warn('Seleção muito pequena, cancelando');
            this.cancelCurrentSelection();
            return;
        }
        
        // Obter informações da imagem
        const imgRect = this.currentImage.getBoundingClientRect();

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
            console.log(`ID gerado para a imagem: ${this.currentImage.id}`);
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
            index: this.selections.length,
            // Armazenar informações adicionais sobre a imagem para facilitar a recuperação
            imageRect: {
                width: this.currentImage.width,
                height: this.currentImage.height,
                naturalWidth: this.currentImage.naturalWidth,
                naturalHeight: this.currentImage.naturalHeight
            }
        };

        console.log('Seleção confirmada com dimensões:', selection);

        // Adicionar à lista de seleções
        this.selections.push(selection);

        // Atualizar estilo da seleção para confirmada
        this.currentSelection.classList.add('confirmed');
        this.currentSelection.style.border = '2px solid #2ecc71';
        this.currentSelection.style.backgroundColor = 'rgba(46, 204, 113, 0.2)';
        // Habilitar interações com o mouse para permitir clicar no botão de exclusão
        this.currentSelection.style.pointerEvents = 'auto';
        
        // Armazenar referência ao elemento de seleção no objeto selection
        selection.element = this.currentSelection;

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
        
        // Adicionar botão de exclusão flutuante
        const deleteButton = document.createElement('button');
        deleteButton.className = 'selection-delete-button';
        deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteButton.style.position = 'absolute';
        deleteButton.style.top = '-12px';
        deleteButton.style.right = '-12px';
        deleteButton.style.backgroundColor = '#e74c3c';
        deleteButton.style.color = 'white';
        deleteButton.style.border = 'none';
        deleteButton.style.borderRadius = '50%';
        deleteButton.style.width = '24px';
        deleteButton.style.height = '24px';
        deleteButton.style.display = 'flex';
        deleteButton.style.alignItems = 'center';
        deleteButton.style.justifyContent = 'center';
        deleteButton.style.fontSize = '12px';
        deleteButton.style.cursor = 'pointer';
        deleteButton.style.zIndex = '101';
        deleteButton.title = 'Excluir seleção';
        
        // Adicionar evento de clique para excluir a seleção
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar propagação do evento
            this.deleteSelection(selection.index);
        });
        
        this.currentSelection.appendChild(deleteButton);

        // Limpar seleção atual
        this.currentSelection = null;

        // Mostrar notificação
        this.showNotification(`Seleção #${selection.index + 1} confirmada. Selecione mais áreas ou clique em "Processar seleções".`, 'success');
    }

    /**
     * Exclui uma seleção específica pelo índice
     * @param {number} index - Índice da seleção a ser excluída
     */
    deleteSelection(index) {
        // Verificar se o índice é válido
        if (index < 0 || index >= this.selections.length) {
            console.error('Índice de seleção inválido:', index);
            return;
        }
        
        // Obter a seleção a ser excluída
        const selection = this.selections[index];
        
        // Remover o elemento visual da seleção, se existir
        if (selection.element) {
            selection.element.remove();
        }
        
        // Remover a seleção do array
        this.selections.splice(index, 1);
        
        // Atualizar os índices das seleções restantes
        this.selections.forEach((sel, i) => {
            sel.index = i;
            
            // Atualizar o número exibido, se o elemento existir
            if (sel.element) {
                const numberElement = sel.element.querySelector('.selection-number');
                if (numberElement) {
                    numberElement.textContent = i + 1;
                }
            }
        });
        
        // Remover o texto extraído para esta seleção, se existir
        if (selection.imageId && this.extractedTexts.has(selection.imageId)) {
            const textsForImage = this.extractedTexts.get(selection.imageId);
            if (textsForImage[index]) {
                textsForImage.splice(index, 1);
                this.extractedTexts.set(selection.imageId, textsForImage);
            }
        }
        
        // Mostrar notificação
        this.showNotification(`Seleção #${index + 1} excluída`, 'info');
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
        // if (this.extractedTextContainer) {
            // this.extractedTextContainer.style.display = 'none';
            // const itemsContainer = this.extractedTextContainer.querySelector('.extracted-text-items');
            // if (itemsContainer) {
        //         itemsContainer.innerHTML = '';
        //     }
        // }

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
        
        // Ocultar elementos de seleção durante a narração
        this.hideSelectionElementsDuringNarration();

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
            index: selection.index || 0,
            // Preservar informações da imagem
            imageRect: selection.imageRect || null
        }));

        // Ordenar seleções por índice para garantir a ordem correta de processamento
        selectionsCopy.sort((a, b) => a.index - b.index);

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
                        textsForImage[selection.index] = text; // Usar o índice da seleção
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
            // Restaurar a visibilidade dos elementos de seleção em caso de erro
            this.restoreSelectionElementsVisibility();
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
                let scaleX, scaleY;
                
                // Se temos informações armazenadas sobre a imagem na seleção, use-as
                if (selection.imageRect) {
                    scaleX = selection.imageRect.naturalWidth / selection.imageRect.width;
                    scaleY = selection.imageRect.naturalHeight / selection.imageRect.height;
                    console.log('Usando escala armazenada na seleção');
                } else {
                    // Caso contrário, calcule a partir da imagem atual
                    scaleX = imageElement.naturalWidth / imageElement.width;
                    scaleY = imageElement.naturalHeight / imageElement.height;
                    console.log('Calculando escala a partir da imagem atual');
                }

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
            debugContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
            debugContainer.style.color = 'white';
            debugContainer.style.padding = '10px';
            debugContainer.style.borderRadius = '5px';
            debugContainer.style.zIndex = '9999';
            debugContainer.style.maxWidth = '300px';
            debugContainer.style.maxHeight = '80vh';
            debugContainer.style.overflowY = 'auto';
            debugContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
            document.body.appendChild(debugContainer);
        }
        
        // Limpar conteúdo anterior
        debugContainer.innerHTML = '';
        
        // Adicionar título
        const title = document.createElement('h3');
        title.textContent = 'Depuração OCR';
        title.style.margin = '0 0 10px 0';
        debugContainer.appendChild(title);
        
        // Adicionar visualização da imagem original
        const originalPreview = document.createElement('div');
        originalPreview.innerHTML = '<p><strong>Imagem Original com Seleção:</strong></p>';
        
        // Criar canvas para mostrar a imagem original com a seleção
        const originalCanvas = document.createElement('canvas');
        originalCanvas.width = originalImage.width;
        originalCanvas.height = originalImage.height;
        originalCanvas.style.maxWidth = '100%';
        originalCanvas.style.border = '1px solid #ccc';
        
        const ctx = originalCanvas.getContext('2d');
        ctx.drawImage(originalImage, 0, 0, originalImage.width, originalImage.height);
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.strokeRect(left, top, width, height);

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
        // if (!this.extractedTextContainer) {
            // return;
        // }

        // const itemsContainer = this.extractedTextContainer.querySelector('.extracted-text-items');
        // if (!itemsContainer) {
        //     return;
        // }

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
        // itemsContainer.appendChild(textItem);

        // Mostrar container
        // this.extractedTextContainer.style.display = 'block';
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
    
    /**
     * Oculta os elementos de seleção durante a narração
     */
    hideSelectionElementsDuringNarration() {
        // Armazenar o estado atual de visibilidade para restaurar depois
        this._selectionElementsVisible = false;
        
        // Ocultar todos os elementos de seleção
        const selectionElements = document.querySelectorAll('.rectangular-selection');
        selectionElements.forEach(element => {
            // Guardar o estado original de visibilidade
            element._originalDisplay = element.style.display;
            // Ocultar o elemento
            element.style.display = 'none';
        });
        
        // Ocultar números de seleção
        const numberElements = document.querySelectorAll('.selection-number');
        numberElements.forEach(element => {
            element._originalDisplay = element.style.display;
            element.style.display = 'none';
        });
        
        // Ocultar botões de exclusão
        const deleteButtons = document.querySelectorAll('.selection-delete-button');
        deleteButtons.forEach(element => {
            element._originalDisplay = element.style.display;
            element.style.display = 'none';
        });
        
        // Ocultar controles de seleção
        if (this.selectionControls) {
            this.selectionControls._originalDisplay = this.selectionControls.style.display;
            this.selectionControls.style.display = 'none';
        }
        
        // Ocultar indicador de modo de seleção
        if (this.selectionIndicator) {
            this.selectionIndicator._originalDisplay = this.selectionIndicator.style.display;
            this.selectionIndicator.style.display = 'none';
        }
        
        // Ocultar container de depuração OCR
        const debugContainer = document.getElementById('ocr-debug-container');
        if (debugContainer) {
            debugContainer._originalDisplay = debugContainer.style.display;
            debugContainer.style.display = 'none';
        }
        
        // Ocultar notificações
        const notifications = document.querySelectorAll('.rectangular-selection-notification, .ocr-notification');
        notifications.forEach(element => {
            element._originalDisplay = element.style.display;
            element.style.display = 'none';
        });
        
        console.log('Elementos de seleção e depuração ocultados durante a narração');
    }
    
    /**
     * Restaura a visibilidade dos elementos de seleção após a narração
     */
    restoreSelectionElementsVisibility() {
        if (this._selectionElementsVisible) return; // Já estão visíveis
        
        // Restaurar visibilidade dos elementos de seleção
        const selectionElements = document.querySelectorAll('.rectangular-selection');
        selectionElements.forEach(element => {
            if (element._originalDisplay !== undefined) {
                element.style.display = element._originalDisplay;
            }
        });
        
        // Restaurar números de seleção
        const numberElements = document.querySelectorAll('.selection-number');
        numberElements.forEach(element => {
            if (element._originalDisplay !== undefined) {
                element.style.display = element._originalDisplay;
            }
        });
        
        // Restaurar botões de exclusão
        const deleteButtons = document.querySelectorAll('.selection-delete-button');
        deleteButtons.forEach(element => {
            if (element._originalDisplay !== undefined) {
                element.style.display = element._originalDisplay;
            }
        });
        
        // Restaurar controles de seleção
        if (this.selectionControls && this.selectionControls._originalDisplay !== undefined) {
            this.selectionControls.style.display = this.selectionControls._originalDisplay;
        }
        
        // Restaurar indicador de modo de seleção
        if (this.selectionIndicator && this.selectionIndicator._originalDisplay !== undefined) {
            this.selectionIndicator.style.display = this.selectionIndicator._originalDisplay;
        }
        
        // Restaurar container de depuração OCR
        const debugContainer = document.getElementById('ocr-debug-container');
        if (debugContainer && debugContainer._originalDisplay !== undefined) {
            debugContainer.style.display = debugContainer._originalDisplay;
        }
        
        // Restaurar notificações
        const notifications = document.querySelectorAll('.rectangular-selection-notification, .ocr-notification');
        notifications.forEach(element => {
            if (element._originalDisplay !== undefined) {
                element.style.display = element._originalDisplay;
            }
        });
        
        this._selectionElementsVisible = true;
        console.log('Visibilidade dos elementos de seleção e depuração restaurada');
    }
}