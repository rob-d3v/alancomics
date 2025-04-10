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
                    console.log('OCRProcessor: Tesseract.js carregado com sucesso');
                })
                .catch(error => {
                    console.error('OCRProcessor: Erro ao carregar Tesseract.js', error);
                });
        } else {
            console.log('OCRProcessor: Tesseract.js já está disponível');
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
                console.log('OCRProcessor: Script do Tesseract.js já existe no documento');
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
                console.log('OCRProcessor: Script do Tesseract.js carregado');
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
            
            console.log('Iniciando processamento OCR...');
            
            // Criar um canvas para pré-processamento
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Definir dimensões do canvas
            canvas.width = image.width || image.naturalWidth;
            canvas.height = image.height || image.naturalHeight;
            
            // Desenhar imagem no canvas
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            
            // Aplicar pré-processamento avançado para melhorar qualidade
            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let data = imageData.data;
            
            // Primeiro passo: Redimensionar para melhor qualidade
            const scaleFactor = 2.0; // Aumentar a resolução
            const newWidth = canvas.width * scaleFactor;
            const newHeight = canvas.height * scaleFactor;
            
            // Criar canvas temporário para redimensionamento
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = newWidth;
            tempCanvas.height = newHeight;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Aplicar suavização para melhor qualidade
            tempCtx.imageSmoothingEnabled = true;
            tempCtx.imageSmoothingQuality = 'high';
            
            // Redimensionar imagem
            tempCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
            
            // Atualizar canvas principal
            canvas.width = newWidth;
            canvas.height = newHeight;
            ctx.drawImage(tempCanvas, 0, 0);
            
            // Atualizar dados da imagem
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            data = imageData.data;

            // Variável para contagem de pixels processados
            let count = 0;
            
            // Segundo passo: Ajuste de contraste adaptativo
            const blockSize = 32; // Aumentar tamanho do bloco para análise local
            const contrastFactor = 2.0; // Aumentar contraste
            
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const i = (y * canvas.width + x) * 4;
                    
                    // Calcular média local com kernel gaussiano
                    let localSum = 0;
                    let weightSum = 0;
                    
                    for (let by = Math.max(0, y - blockSize/2); by < Math.min(canvas.height, y + blockSize/2); by++) {
                        for (let bx = Math.max(0, x - blockSize/2); bx < Math.min(canvas.width, x + blockSize/2); bx++) {
                            const bi = (by * canvas.width + bx) * 4;
                            // Peso gaussiano baseado na distância
                            const weight = Math.exp(-((bx-x)**2 + (by-y)**2)/(2*(blockSize/4)**2));
                            localSum += ((data[bi] + data[bi + 1] + data[bi + 2]) / 3) * weight;
                            weightSum += weight;
                        }
                    }
                    
                    const localAvg = localSum / count;
                    const pixelAvg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    
                    // Aplicar contraste adaptativo
                    const diff = pixelAvg - localAvg;
                    const adjustedValue = localAvg + diff * contrastFactor;
                    
                    // Binarização com limiar adaptativo
                    const threshold = localAvg * 0.9; // Limiar baseado na média local
                    const value = adjustedValue > threshold ? 255 : 0;
                    
                    data[i] = data[i + 1] = data[i + 2] = value;
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            // Processar a imagem pré-processada com Tesseract.js
            const result = await Tesseract.recognize(
                canvas,
                this.config.lang,
                {
                    logger: this.config.logger,
                    tessedit_pageseg_mode: '6', // Assume texto uniforme
                    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?-_\'"():;/áàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ ',
                    tessjs_create_pdf: '0',
                    tessjs_create_hocr: '0',
                    tessjs_ocr_engine_mode: '2', // Modo mais preciso (LSTM)
                    tessjs_create_box: '0',
                    tessjs_create_unlv: '0',
                    tessjs_create_osd: '0',
                    tessjs_textord_heavy_nr: '1', // Reduz ruído
                    tessjs_textord_min_linesize: '3.0' // Melhora detecção de linhas
                }
            );
            
            // Extrair o texto
            const text = result.data.text;
            
            console.log('Processamento OCR concluído');
            
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