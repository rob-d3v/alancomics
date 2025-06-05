/**
 * BackgroundProcessingQueue - Gerencia o processamento em segundo plano de tarefas
 * 
 * Este módulo implementa uma fila de processamento que permite executar tarefas
 * em segundo plano enquanto retorna resultados parciais assim que disponíveis.
 */
class BackgroundProcessingQueue {
    constructor() {
        // Estado da fila
        this.queue = [];
        this.isProcessing = false;
        this.currentIndex = 0;
        
        // Callbacks
        this.onItemProcessed = null;
        this.onQueueCompleted = null;
        this.onQueueStarted = null;
        this.onError = null;
        
        // Estatísticas
        this.stats = {
            totalItems: 0,
            processedItems: 0,
            successfulItems: 0,
            failedItems: 0,
            progress: 0
        };
    }
    
    /**
     * Adiciona um item à fila de processamento
     * @param {Function} processingFunction - Função assíncrona que processa o item
     * @param {Object} metadata - Metadados associados ao item
     */
    addItem(processingFunction, metadata = {}) {
        this.queue.push({
            process: processingFunction,
            metadata: metadata,
            status: 'pending'
        });
        
        this.stats.totalItems = this.queue.length;
        this.updateProgress();
        
        return this.queue.length - 1; // Retorna o índice do item adicionado
    }
    
    /**
     * Inicia o processamento da fila
     */
    startProcessing() {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        this.currentIndex = 0;
        this.resetStats();
        
        // Notificar início do processamento
        if (this.onQueueStarted) {
            this.onQueueStarted(this.stats);
        }
        
        this.processNextItem();
    }
    
    /**
     * Processa o próximo item na fila
     */
    async processNextItem() {
        if (!this.isProcessing || this.currentIndex >= this.queue.length) {
            this.completeProcessing();
            return;
        }
        
        const item = this.queue[this.currentIndex];
        
        try {
            // Marcar como em processamento
            item.status = 'processing';
            
            // Executar a função de processamento
            const result = await item.process();
            
            // Marcar como concluído com sucesso
            item.status = 'completed';
            item.result = result;
            
            // Atualizar estatísticas
            this.stats.processedItems++;
            this.stats.successfulItems++;
            this.updateProgress();
            
            // Chamar callback de item processado
            if (typeof this.onItemProcessed === 'function') {
                this.onItemProcessed(result, item.metadata, this.currentIndex);
            }
        } catch (error) {
            // Marcar como falha
            item.status = 'failed';
            item.error = error;
            
            // Atualizar estatísticas
            this.stats.processedItems++;
            this.stats.failedItems++;
            this.updateProgress();
            
            // Chamar callback de erro
            if (typeof this.onError === 'function') {
                this.onError(error, item.metadata, this.currentIndex);
            } else {
                console.error('BackgroundProcessingQueue: Erro ao processar item', error);
            }
        }
        
        // Avançar para o próximo item
        this.currentIndex++;
        
        // Processar o próximo item após um pequeno atraso
        setTimeout(() => this.processNextItem(), 100);
    }
    
    /**
     * Finaliza o processamento da fila
     */
    completeProcessing() {
        this.isProcessing = false;
        
        // Chamar callback de fila concluída
        if (typeof this.onQueueCompleted === 'function') {
            this.onQueueCompleted(this.stats);
        }
    }
    
    /**
     * Pausa o processamento da fila
     */
    pauseProcessing() {
        this.isProcessing = false;
    }
    
    /**
     * Retoma o processamento da fila
     */
    resumeProcessing() {
        if (!this.isProcessing && this.currentIndex < this.queue.length) {
            this.isProcessing = true;
            this.processNextItem();
        }
    }
    
    /**
     * Limpa a fila de processamento
     */
    clearQueue() {
        this.pauseProcessing();
        this.queue = [];
        this.currentIndex = 0;
        this.resetStats();
    }
    
    /**
     * Redefine as estatísticas de processamento
     */
    resetStats() {
        this.stats = {
            totalItems: this.queue.length,
            processedItems: 0,
            successfulItems: 0,
            failedItems: 0,
            progress: 0
        };
    }
    
    /**
     * Atualiza o progresso do processamento
     */
    updateProgress() {
        if (this.stats.totalItems > 0) {
            this.stats.progress = this.stats.processedItems / this.stats.totalItems;
        } else {
            this.stats.progress = 0;
        }
    }
    
    /**
     * Obtém as estatísticas atuais de processamento
     * @returns {Object} - Estatísticas de processamento
     */
    getStats() {
        // Calcular duração
        let duration = 0;
        if (this.stats.startTime) {
            const endTime = this.stats.endTime || Date.now();
            duration = endTime - this.stats.startTime;
        }
        
        return { 
            ...this.stats,
            duration,
            isComplete: this.stats.processedItems === this.stats.totalItems,
            progress: this.stats.totalItems > 0 
                ? this.stats.processedItems / this.stats.totalItems 
                : 0
        };
    }
    
    /**
     * Obtém os resultados do processamento
     * @returns {Array} - Array com os resultados dos itens processados
     */
    getResults() {
        return this.queue
            .filter(item => item.status === 'completed')
            .map(item => item.result);
    }
    
    /**
     * Define o callback para quando um item é processado
     * @param {Function} callback - Função de callback
     */
    setOnItemProcessed(callback) {
        if (typeof callback === 'function') {
            this.onItemProcessed = callback;
        }
    }
    
    /**
     * Define o callback para quando a fila é concluída
     * @param {Function} callback - Função de callback
     */
    setOnQueueCompleted(callback) {
        if (typeof callback === 'function') {
            this.onQueueCompleted = callback;
        }
    }
    
    /**
     * Define o callback para quando a fila é iniciada
     * @param {Function} callback - Função de callback
     */
    setOnQueueStarted(callback) {
        if (typeof callback === 'function') {
            this.onQueueStarted = callback;
        }
    }
    
    /**
     * Define o callback para quando ocorre um erro
     * @param {Function} callback - Função de callback
     */
    setOnError(callback) {
        if (typeof callback === 'function') {
            this.onError = callback;
        }
    }
    
    /**
     * Inicia o processamento da fila com uma função de processamento específica
     * @param {Function} processorFn - Função que processa cada item (deve retornar uma Promise)
     * @returns {Promise} - Promessa que resolve quando toda a fila for processada
     */
    async start(processorFn) {
        if (this.isProcessing) {
            console.warn('BackgroundProcessingQueue: Já existe um processamento em andamento');
            return;
        }
        
        if (!processorFn || typeof processorFn !== 'function') {
            throw new Error('BackgroundProcessingQueue: É necessário fornecer uma função de processamento');
        }
        
        if (this.queue.length === 0) {
            console.warn('BackgroundProcessingQueue: Fila vazia, nada para processar');
            return;
        }
        
        // Iniciar processamento
        this.isProcessing = true;
        this.currentIndex = 0;
        this.stats.startTime = Date.now();
        this.resetStats();
        
        // Notificar início do processamento
        if (this.onQueueStarted) {
            this.onQueueStarted(this.stats);
        }
        
        // Processar itens em sequência
        while (this.currentIndex < this.queue.length && this.isProcessing) {
            const queueItem = this.queue[this.currentIndex];
            
            try {
                // Atualizar status
                queueItem.status = 'processing';
                
                // Processar item
                const result = await processorFn(queueItem.item, queueItem.metadata, this.currentIndex);
                
                // Atualizar resultado
                queueItem.status = 'completed';
                queueItem.result = result;
                this.stats.processedItems++;
                this.stats.successfulItems++;
                
                // Notificar item processado
                if (this.onItemProcessed) {
                    this.onItemProcessed(result, queueItem.metadata, this.currentIndex);
                }
            } catch (error) {
                // Atualizar erro
                queueItem.status = 'error';
                queueItem.error = error;
                this.stats.failedItems++;
                
                // Notificar erro
                if (this.onError) {
                    this.onError(error, queueItem.metadata, this.currentIndex);
                } else {
                    console.error('BackgroundProcessingQueue: Erro ao processar item', error);
                }
            }
            
            // Avançar para o próximo item
            this.currentIndex++;
        }
        
        // Finalizar processamento
        this.isProcessing = false;
        this.stats.endTime = Date.now();
        
        // Notificar conclusão da fila
        if (this.onQueueCompleted) {
            this.onQueueCompleted(this.stats);
        }
        
        return this.getResults();
    }
    
    /**
     * Interrompe o processamento da fila
     */
    stop() {
        if (!this.isProcessing) {
            return;
        }
        
        this.isProcessing = false;
        // console.log('BackgroundProcessingQueue: Processamento interrompido');
    }
}