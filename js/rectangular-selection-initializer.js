/**
 * Inicializador do sistema de seleção retangular de texto em imagens
 * 
 * Este arquivo inicializa o gerenciador de seleção retangular de texto em imagens
 * e o disponibiliza globalmente para uso em outros módulos.
 * Inclui verificação de dependências para garantir que todos os componentes necessários
 * estejam carregados antes da inicialização.
 */

// Função para verificar se todas as dependências estão disponíveis
function checkDependencies() {
    const dependencies = {
        RectangularSelectionManager: typeof RectangularSelectionManager !== 'undefined',
        OCRProcessor: typeof OCRProcessor !== 'undefined',
        BackgroundProcessingQueue: typeof BackgroundProcessingQueue !== 'undefined',
        Tesseract: typeof Tesseract !== 'undefined'
    };
    
    const missingDependencies = Object.entries(dependencies)
        .filter(([_, available]) => !available)
        .map(([name]) => name);
    
    if (missingDependencies.length > 0) {
        console.warn(`Dependências faltando para inicializar o gerenciador de seleção retangular: ${missingDependencies.join(', ')}`);
        return false;
    }
    
    return true;
}

// Função para inicializar o gerenciador
function initializeSelectionManager() {
    // Verificar se o gerenciador já foi inicializado
    if (window.rectangularSelectionManager) {
        console.log('Gerenciador de seleção retangular já inicializado');
        return;
    }
    
    // Verificar dependências
    if (!checkDependencies()) {
        console.log('Aguardando dependências para inicializar o gerenciador de seleção retangular...');
        // Tentar novamente após um curto período
        setTimeout(initializeSelectionManager, 500);
        return;
    }
    
    try {
        console.log('Inicializando gerenciador de seleção retangular de texto em imagens...');
        // Inicializar o gerenciador
        window.rectangularSelectionManager = new RectangularSelectionManager();
        console.log('Gerenciador de seleção retangular inicializado com sucesso');
    } catch (error) {
        console.error('Erro ao inicializar gerenciador de seleção retangular:', error);
    }
}

// Esperar o DOM estar completamente carregado
document.addEventListener('DOMContentLoaded', () => {
    // Iniciar o processo de inicialização
    initializeSelectionManager();
});

// Inicialização alternativa para casos onde o evento DOMContentLoaded já ocorreu
if (document.readyState !== 'loading') {
    // Iniciar o processo de inicialização
    initializeSelectionManager();
}