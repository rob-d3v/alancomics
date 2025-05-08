// Extensão para o ComicsViewer
class EnhancedComicsViewer extends ComicsViewer {
    constructor() {
        super();

        // Adicionar integração com o sistema de seleção e narração
        this.initNarrationIntegration();
    }

    initNarrationIntegration() {
        // Garantir que o ScrollManager global esteja configurado corretamente
        if (window.scrollManager) {
            // Configurar o comportamento de scroll para ser mais suave durante a narração
            window.scrollManager.settings.behavior = 'smooth';
            window.scrollManager.settings.verticalAlignment = 0.35; // Centralizar o conteúdo verticamente
            window.scrollManager.settings.margin = 150; // Margem maior para melhor visibilidade
            window.scrollManager.settings.scrollDelay = 30; // Resposta mais rápida

            console.log('ComicsViewer: ScrollManager configurado para experiência de narração aprimorada');
        }

        // Adicionar evento para reiniciar a narração quando chegar ao final
        document.addEventListener('autoScrollComplete', () => {
            console.log('Rolagem automática completa, verificando estado da narração...');

            // Se o narrador estiver ativo e houver seleções a serem narradas
            if (window.comicNarrator && window.comicNarrator.isNarrating &&
                window.rectangularSelectionManager &&
                window.rectangularSelectionManager.selections.length > 0) {

                // Rolar para o topo e reiniciar a narração
                this.scrollToTop();

                // Pequeno atraso antes de reiniciar a narração
                setTimeout(() => {
                    console.log('Reiniciando narração do início após completar a rolagem...');

                    // Resetar o índice de narração
                    if (window.comicNarrator.narrationState) {
                        window.comicNarrator.narrationState.lastProcessedSelection = -1;
                    }

                    // Iniciar a narração novamente
                    window.rectangularSelectionManager.currentNarrationIndex = -1;
                    window.comicNarrator.startNarration();
                }, 1500);
            }
        });

        // Obter uma referência ao container de imagens
        const imagesContainer = document.getElementById('imagesContainer');
        if (imagesContainer) {
            // Adicionar observer para detectar novas imagens e atualizá-las automaticamente
            this.setupImageObserver(imagesContainer);
        }
    }

    setupImageObserver(container) {
        // Observer para detectar quando novas imagens são adicionadas
        const observer = new MutationObserver((mutations) => {
            let imagesAdded = false;

            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Verificar se alguma imagem foi adicionada
                    for (const node of mutation.addedNodes) {
                        if (node.tagName === 'IMG' || node.querySelector('img')) {
                            imagesAdded = true;
                            break;
                        }
                    }
                }
            }

            // Se imagens foram adicionadas, atualizar o sistema de seleção
            if (imagesAdded && window.rectangularSelectionManager &&
                window.rectangularSelectionManager.isSelectionModeActive) {

                console.log('Novas imagens detectadas, atualizando listeners...');
                window.rectangularSelectionManager.addImageListeners();
            }
        });

        // Iniciar observação
        observer.observe(container, { childList: true, subtree: true });
    }

    // Sobrescrever o método setScrollDirection para melhor integração com narração
    setScrollDirection(direction) {
        super.setScrollDirection(direction);

        // Notificar o sistema de narração sobre a mudança de direção
        if (window.comicNarrator && window.rectangularSelectionManager) {
            console.log(`Direção de rolagem alterada para: ${direction}`);

            // Se a narração estiver ativa, pausar temporariamente
            const wasNarrating = window.comicNarrator.isNarrating;
            if (wasNarrating) {
                window.comicNarrator.synth.pause();
            }

            // Atualizar coordenadas de seleção após mudança de layout
            setTimeout(() => {
                // Recalcular coordenadas para todas as seleções
                if (window.rectangularSelectionManager.updateSelectionCoordinates) {
                    window.rectangularSelectionManager.updateSelectionCoordinates();
                }

                // Retomar narração se estava ativa
                if (wasNarrating) {
                    window.comicNarrator.synth.resume();
                }
            }, 500);
        }
    }
}
/**
 * Melhoria para identificar visualmente cada seleção com números claros
 */
RectangularSelectionManager.prototype.enhanceSelectionVisibility = function () {
    if (!this.selections || this.selections.length === 0) return;

    console.log('Aprimorando visibilidade das seleções...');

    this.selections.forEach((selection, index) => {
        if (!selection.element) return;

        // Remover identificadores existentes para evitar duplicação
        const existingLabels = selection.element.querySelectorAll('.selection-enhanced-label');
        existingLabels.forEach(label => label.remove());

        // Criar novo elemento de rótulo com design melhorado
        const label = document.createElement('div');
        label.className = 'selection-enhanced-label';
        label.textContent = index + 1;

        // Estilizar o rótulo
        label.style.position = 'absolute';
        label.style.top = '-12px';
        label.style.left = '-12px';
        label.style.backgroundColor = '#3498db';
        label.style.color = 'white';
        label.style.borderRadius = '50%';
        label.style.width = '24px';
        label.style.height = '24px';
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.justifyContent = 'center';
        label.style.fontSize = '14px';
        label.style.fontWeight = 'bold';
        label.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
        label.style.border = '2px solid white';
        label.style.zIndex = '9999';

        // Adicionar o rótulo ao elemento de seleção
        selection.element.appendChild(label);
    });

    // Adicionar estilos globais para a animação de destaque de seleção atual
    const highlightStyle = document.createElement('style');
    highlightStyle.textContent = `
        .current-selection-enhanced {
            background-color: rgba(52, 152, 219, 0.4) !important;
            border: 2px solid rgba(52, 152, 219, 0.8) !important;
            box-shadow: 0 0 20px rgba(52, 152, 219, 0.6);
            z-index: 100;
            transition: all 0.3s ease-in-out;
        }
        
        .selection-enhanced-label.current {
            transform: scale(1.3);
            background-color: #2ecc71;
            box-shadow: 0 0 10px rgba(46, 204, 113, 0.7);
            transition: all 0.3s ease-in-out;
        }
    `;
    document.head.appendChild(highlightStyle);
};

/**
 * Método avançado para destacar a seleção atual durante a narração
 */
RectangularSelectionManager.prototype.highlightCurrentSelection = function (index) {
    // Remover destaque de todas as seleções primeiro
    this.selections.forEach(selection => {
        if (selection.element) {
            selection.element.classList.remove('current-selection-enhanced');
            const label = selection.element.querySelector('.selection-enhanced-label');
            if (label) label.classList.remove('current');
        }
    });

    // Verificar se o índice é válido
    if (index < 0 || index >= this.selections.length) {
        return;
    }

    // Obter a seleção atual
    const selection = this.selections[index];
    if (!selection || !selection.element) return;

    // Aplicar destaque
    selection.element.classList.add('current-selection-enhanced');

    // Animar o número da seleção
    const label = selection.element.querySelector('.selection-enhanced-label');
    if (label) {
        label.classList.add('current');
    }

    // Log detalhado
    console.log(`Destacando seleção #${index + 1} para narração atual`);

    // Rolar para a seleção de forma suave usando o scrollManager aprimorado
    if (window.scrollManager && window.scrollManager.followSelectionSmoothly) {
        window.scrollManager.followSelectionSmoothly(selection.element, {
            offsetTop: 150,  // Maior deslocamento para melhor visualização
            highlightDuration: 0  // Não remover o destaque automaticamente
        });
    } else {
        // Fallback para o método básico se o aprimorado não estiver disponível
        this.updateScrollForCurrentSelection(index);
    }
};

// Estender o método de processamento de textos extraídos para o gerenciador de seleções
RectangularSelectionManager.prototype.processExtractedTextsForBetterNarration = function () {
    if (!this.extractedTexts || this.extractedTexts.size === 0) {
        console.warn('Não há textos extraídos para processar');
        return [];
    }

    console.log('Processando textos extraídos para melhorar a narração...');

    // Coletar todos os textos extraídos de todas as seleções em ordem
    const orderedTexts = [];

    // Organizar seleções por índice para garantir a ordem correta
    const orderedSelections = [...this.selections].sort((a, b) => a.index - b.index);

    // Para cada seleção, obter o texto extraído correspondente
    orderedSelections.forEach(selection => {
        const imageId = selection.imageId;
        const selectionIndex = selection.index;

        if (imageId && this.extractedTexts.has(imageId)) {
            const textsForImage = this.extractedTexts.get(imageId);
            if (textsForImage && textsForImage[selectionIndex]) {
                // Obter o texto bruto
                let extractedText = textsForImage[selectionIndex];

                // Processar o texto para melhorar a narração
                if (this.processTextForNarration) {
                    extractedText = this.processTextForNarration(extractedText);
                }

                // Adicionar metadados para uso posterior
                orderedTexts.push({
                    text: extractedText,
                    selectionIndex: selectionIndex,
                    imageId: imageId,
                    // Adicionar informações de coordenadas se disponíveis
                    coordinates: this.absoluteCoordinates ?
                        this.absoluteCoordinates.find(c => c.index === selectionIndex) : null
                });
            }
        }
    });

    // Log de resultados
    console.log(`Processados ${orderedTexts.length} textos extraídos para narração`);

    return orderedTexts;
};

// Inicializar o sistema aprimorado quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se os componentes necessários estão presentes
    if (document.getElementById('imagesContainer') &&
        document.getElementById('viewer')) {

        // Atrasar levemente a inicialização para garantir que outros scripts terminem
        setTimeout(initEnhancedComicReader, 500);
    }
});

// Adicionar hook para inicialização manual, se necessário
window.initEnhancedComicReader = initEnhancedComicReader;
// Estender o protótipo do RectangularSelectionManager para adicionar o método de atualização de coordenadas
RectangularSelectionManager.prototype.updateSelectionCoordinates = function () {
    // Atualizar coordenadas para todas as seleções existentes
    this.absoluteCoordinates = [];

    this.selections.forEach((selection, index) => {
        if (!selection.element || !selection.imageId) return;

        const img = document.getElementById(selection.imageId);
        if (!img) return;

        const imgRect = img.getBoundingClientRect();
        const selectionRect = selection.element.getBoundingClientRect();

        // Calcular novas coordenadas absolutas
        const absoluteY = window.pageYOffset + selectionRect.top;
        const absoluteX = window.pageXOffset + selectionRect.left;

        // Obter índice da imagem
        let imgIndex = '?';
        if (this.imageIndices && this.imageIndices.has(selection.imageId)) {
            imgIndex = this.imageIndices.get(selection.imageId);
        } else {
            const allImages = Array.from(document.querySelectorAll('#imagesContainer img'));
            const index = allImages.findIndex(image => image.id === selection.imageId);
            imgIndex = index >= 0 ? index + 1 : '?';

            if (!this.imageIndices) this.imageIndices = new Map();
            this.imageIndices.set(selection.imageId, imgIndex);
        }

        // Armazenar novas coordenadas
        this.absoluteCoordinates.push({
            index,
            imageId: selection.imageId,
            imageIndex: imgIndex,
            absoluteX,
            absoluteY,
            width: selectionRect.width,
            height: selectionRect.height
        });

        console.log(`Coordenadas atualizadas para seleção #${index + 1}: (${absoluteX.toFixed(0)}, ${absoluteY.toFixed(0)})`);
    });

    return this.absoluteCoordinates;
};

// Substituir a instância do ComicsViewer global pela versão aprimorada
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se já existe uma instância
    if (window.comicsViewer) {
        console.log('Substituindo ComicsViewer existente pela versão aprimorada...');

        // Preservar configurações existentes
        const existingZoomLevel = window.comicsViewer.zoomLevel;

        // Criar nova instância
        window.comicsViewer = new EnhancedComicsViewer();

        // Restaurar configurações
        window.comicsViewer.zoomLevel = existingZoomLevel;
    } else {
        window.comicsViewer = new EnhancedComicsViewer();
        console.log('ComicsViewer aprimorado inicializado');
    }
});