/**
 * OCRProcessor - Processa imagens para extrair texto usando OCR
 * 
 * Este módulo utiliza a biblioteca Tesseract.js para realizar OCR (Optical Character Recognition)
 * em imagens ou regiões de imagens.
 */
class OCRProcessor {
    constructor() {
        // Configurações do OCR
        this.config = {
            lang: 'por+eng', // Idioma padrão: português e inglês
            logger: message => {
                if (message.status === 'recognizing text') {
                    this.updateProgress(message.progress);
                }
            }
        };
        
        // Estado do processamento
        this.isProcessing = false;
        this.progress = 0;
        
        // Inicializar
        this.initialize();
    }
    
    /**
     * Inicializa o processador OCR
     */
    initialize() {
        // Verificar se a biblioteca Tesseract.js está disponível
        if (typeof Tesseract === 'undefined') {
            // Carregar a biblioteca Tesseract.js dinamicamente
            this.loadTesseractLibrary()
                .then(() => {
                    // console.log('OCRProcessor: Tesseract.js carregado com sucesso');
                })
                .catch(error => {
                    console.error('OCRProcessor: Erro ao carregar Tesseract.js', error);
                });
        } else {
            // console.log('OCRProcessor: Tesseract.js já está disponível');
        }
    }
    
    /**
     * Carrega a biblioteca Tesseract.js dinamicamente
     * @returns {Promise} - Promessa que resolve quando a biblioteca é carregada
     */
    loadTesseractLibrary() {
        return new Promise((resolve, reject) => {
            // Verificar se já existe um script para Tesseract
            if (document.querySelector('script[src*="tesseract.min.js"]')) {
                // console.log('OCRProcessor: Script do Tesseract.js já existe no documento');
                // Verificar periodicamente se o objeto Tesseract está disponível
                const checkTesseract = setInterval(() => {
                    if (typeof Tesseract !== 'undefined') {
                        clearInterval(checkTesseract);
                        resolve();
                    }
                }, 100);
                return;
            }
            
            // Criar elemento de script
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js';
            script.async = true;
            
            // Configurar eventos
            script.onload = () => {
                // console.log('OCRProcessor: Script do Tesseract.js carregado');
                // Verificar periodicamente se o objeto Tesseract está disponível
                const checkTesseract = setInterval(() => {
                    if (typeof Tesseract !== 'undefined') {
                        clearInterval(checkTesseract);
                        resolve();
                    }
                }, 100);
            };
            script.onerror = () => reject(new Error('Falha ao carregar Tesseract.js'));
            
            // Adicionar ao documento
            document.head.appendChild(script);
        });
    }
    
    /**
     * Processa uma imagem para extrair texto
     * @param {HTMLImageElement|HTMLCanvasElement} image - Imagem ou canvas para processar
     * @returns {Promise<string>} - Texto extraído da imagem
     */
    async processImage(image) {
        // Verificar se a biblioteca está disponível
        if (typeof Tesseract === 'undefined') {
            await this.loadTesseractLibrary();
            
            // Verificar novamente após tentar carregar
            if (typeof Tesseract === 'undefined') {
                throw new Error('Tesseract.js não está disponível mesmo após tentativa de carregamento');
            }
        }
        
        // Verificar se já está processando
        if (this.isProcessing) {
            throw new Error('Já existe um processamento OCR em andamento');
        }
        
        try {
            // Atualizar estado
            this.isProcessing = true;
            this.progress = 0;
            
            // console.log('Iniciando processamento OCR...');
            
            // Processar a imagem com Tesseract.js
            const result = await Tesseract.recognize(
                image,
                this.config.lang,
                {
                    logger: this.config.logger
                }
            );
            
            // Extrair o texto
            const text = result.data.text;
            
            // console.log('Processamento OCR concluído');
            
            return text;
        } catch (error) {
            console.error('Erro no processamento OCR:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * Atualiza o progresso do processamento OCR
     * @param {number} progress - Progresso (0-1)
     */
    updateProgress(progress) {
        this.progress = progress;
        
        // Atualizar indicador de progresso, se existir
        const progressIndicator = document.querySelector('.progress-indicator .progress-message');
        if (progressIndicator) {
            progressIndicator.textContent = `Processando OCR: ${Math.round(progress * 100)}%`;
        }
    }
    
    /**
     * Define o idioma para o OCR
     * @param {string} lang - Código do idioma (por, eng, etc.)
     */
    setLanguage(lang) {
        this.config.lang = lang;
    }
}