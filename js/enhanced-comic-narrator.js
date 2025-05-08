// Aprimoramentos para o ComicNarrator para integrar com coordenadas de seleção
class EnhancedComicNarrator extends ComicNarrator {
    constructor() {
        super();
        
        // Referência à barra de progresso da narração
        this.progressBar = new NarrationProgressBar();
        window.narrationProgressBar = this.progressBar;
        
        // Melhorar o gerenciamento de estado
        this.currentSelectionIndex = -1;
        this.selectionData = [];
    }
    
    // Iniciar narração com melhor integração com seleções
    async startNarration() {
        if (!this.enableNarration.checked || this.isNarrating) return;
        
        // Limpar textos narrados anteriormente ao iniciar uma nova narração
        this.recentlyNarratedTexts = [];
        
        // Gerar um ID único para esta sessão de narração
        this.narrationState.currentNarrationId = Date.now();
        
        // Verificar se o modo de seleção de texto em imagens está ativo
        const rectangularSelectionManager = window.rectangularSelectionManager;
        if (rectangularSelectionManager && rectangularSelectionManager.selections && 
            rectangularSelectionManager.selections.length > 0) {
            
            console.log('Iniciando narração com seleções retangulares...');
            
            // Atualizar o estado da narração
            this.narrationState.isSelectionMode = true;
            this.narrationState.isPageMode = false;
            this.narrationState.lastProcessedSelection = -1;
            
            this.isNarrating = true;
            this.startNarrationBtn.innerHTML = '<i class="fas fa-stop"></i> Parar Narração';
            this.startNarrationBtn.classList.add('active');
            
            // Configurar a barra de progresso
            this.progressBar.setTotalItems(rectangularSelectionManager.selections.length);
            this.progressBar.setCurrentItemIndex(0);
            this.progressBar.show();
            
            // Desabilitar outros controles
            this.disableOtherControls(true);
            
            // NOVA IMPLEMENTAÇÃO: Primeiro, rolar para o topo do visualizador
            const viewer = document.getElementById('viewer');
            if (viewer) {
                console.log("Rolando para o topo do visualizador antes de iniciar a narração");
                
                // Definir posição inicial como 0,0
                viewer.scrollTo({
                    top: 0,
                    left: 0,
                    behavior: 'smooth'
                });
                
                // Aguardar a rolagem terminar antes de iniciar a narração
                setTimeout(() => {
                    // Verificar se já existem textos extraídos para as seleções
                    const hasExtractedTexts = rectangularSelectionManager.extractedTexts && 
                                            rectangularSelectionManager.extractedTexts.size > 0;
                    
                    if (hasExtractedTexts) {
                        console.log('Iniciando narração com textos pré-extraídos após rolagem inicial');
                        // Preparar os textos extraídos para narração
                        this.prepareExtractedTextsForNarration(rectangularSelectionManager);
                    } else {
                        console.log('Processando seleções OCR após rolagem inicial');
                        // Iniciar processamento das seleções apenas se não houver textos extraídos
                        rectangularSelectionManager.processSelections();
                    }
                }, 1000);
            } else {
                // Caso não haja visualizador, prosseguir normalmente
                this.prepareExtractedTextsForNarration(rectangularSelectionManager);
            }
            
            return; // Não continuar com a narração normal
        }
        
        // Se não houver seleções, continuar com a implementação original
        super.startNarration();
    }
    
    // Método aprimorado para narrar múltiplos textos com melhor integração de scroll
    async speakMultipleTexts(multiText) {
        if (!multiText || !multiText.isMultiText || !multiText.texts || multiText.texts.length === 0) {
            console.error('Formato de texto múltiplo inválido');
            return;
        }

        // Atualizar a barra de progresso com o total de itens
        this.progressBar.setTotalItems(multiText.texts.length);
        this.progressBar.show();
        
        // Filtrar textos para remover duplicados ou muito similares
        const uniqueTexts = this.filterDuplicateTexts(multiText.texts);
        console.log(`Narrando ${uniqueTexts.length} textos exclusivos (${multiText.texts.length - uniqueTexts.length} duplicados removidos)`);
        
        // Narrar cada texto em sequência com melhor integração de rolagem
        for (let i = 0; i < uniqueTexts.length; i++) {
            if (!this.isNarrating) break;

            const text = uniqueTexts[i];
            
            // Verificar se esta seleção já foi processada nesta sessão
            if (this.narrationState.isSelectionMode && this.narrationState.lastProcessedSelection === i) {
                console.log(`Seleção ${i} já foi processada nesta sessão, avançando para a próxima`);
                continue;
            }
            
            // Registrar esta seleção como processada
            this.narrationState.lastProcessedSelection = i;
            this.currentSelectionIndex = i;

            // APRIMORADO: Destacar a seleção atual e garantir rolagem adequada
            if (window.rectangularSelectionManager) {
                console.log(`Destacando e rolando para seleção #${i + 1} antes de narrar`);
                window.rectangularSelectionManager.updateScrollForCurrentSelection(i);
                
                // Dar tempo para a rolagem terminar antes de iniciar a narração
                await new Promise(resolve => setTimeout(resolve, 800));
            }
            
            // Atualizar a barra de progresso
            this.progressBar.setCurrentItemIndex(i);
            this.progressBar.setCurrentText(text);
            
            console.log(`Narrando texto ${i + 1} de ${uniqueTexts.length}: ${text.substring(0, 30)}...`);

            // Narrar o texto atual
            await this.speakText(text);

            // Esperar o tempo de pausa entre os textos, exceto após o último
            if (i < uniqueTexts.length - 1 && this.isNarrating) {
                await new Promise(resolve => setTimeout(resolve, this.pauseTime * 1000));
            }
        }

        // Após narrar todos os textos, aguardar o tempo de pausa e esconder a barra de progresso
        if (this.isNarrating) {
            await new Promise(resolve => setTimeout(resolve, this.pauseTime * 1000));
            this.progressBar.hide();
        }
    }
}

// Inicialização aprimorada
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar os componentes aprimorados
    if (document.getElementById('enableNarration')) {
        // Substituir o ComicNarrator padrão pelo aprimorado
        window.comicNarrator = new EnhancedComicNarrator();
        console.log('Sistema de narração aprimorado inicializado');
    }
    
    // Substituir o RectangularSelectionManager padrão pelo aprimorado
    if (window.rectangularSelectionManager) {
        // Preservar qualquer estado existente antes de substituir
        const existingState = window.rectangularSelectionManager;
        const enhancedManager = new EnhancedRectangularSelectionManager();
        
        // Copiar propriedades relevantes se necessário
        if (existingState.selections && existingState.selections.length > 0) {
            enhancedManager.selections = existingState.selections;
        }
        
        // Substituir a instância global
        window.rectangularSelectionManager = enhancedManager;
        console.log('Sistema de seleção retangular aprimorado inicializado');
    }
    
    // Criar uma função de inicialização global para permitir fácil atualização posterior
    window.initEnhancedComicReader = function() {
        window.comicNarrator = new EnhancedComicNarrator();
        window.rectangularSelectionManager = new EnhancedRectangularSelectionManager();
        window.narrationProgressBar = new NarrationProgressBar();
        console.log('Sistema de leitura de quadrinhos aprimorado inicializado com sucesso!');
    };
});