class ComicNarrator {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.currentVoice = null;
        this.pitch = 1;
        this.rate = 1;
        this.pauseTime = 2; // seconds
        this.isNarrating = false;
        this.currentPage = 0;
        this.pages = [];
        this.isProcessing = false;
        
        // Add text buffer properties
        this.textBuffer = [];
        this.isBuffering = false;
        this.bufferSize = 3; // Number of pages to buffer ahead
        
        // DOM elements
        this.enableNarration = document.getElementById('enableNarration');
        this.narrationControls = document.getElementById('narrationControls');
        this.voiceSelect = document.getElementById('voiceSelect');
        this.pitchRange = document.getElementById('pitchRange');
        this.pitchValue = document.getElementById('pitchValue');
        this.rateRange = document.getElementById('rateRange');
        this.rateValue = document.getElementById('rateValue');
        this.pauseTimeInput = document.getElementById('pauseTime');
        this.startNarrationBtn = document.getElementById('startNarration');
        
        // Create reading indicator
        this.readingIndicator = document.createElement('div');
        this.readingIndicator.className = 'reading-indicator';
        this.readingIndicator.textContent = 'Processando texto...';
        document.body.appendChild(this.readingIndicator);
        
        this.initVoices();
        this.initEventListeners();
    }
    
    initVoices() {
        // Populate voices when available
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this.loadVoices();
        }
        
        // Try to load voices immediately
        this.loadVoices();
    }
    
    loadVoices() {
        this.voices = this.synth.getVoices();
        
        // Clear existing options
        this.voiceSelect.innerHTML = '';
        
        // Add voices to select
        this.voices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.value = index;
            
            // Prefer Portuguese voices if available
            if (voice.lang.includes('pt-BR') || voice.lang.includes('pt-PT')) {
                option.selected = true;
                this.currentVoice = voice;
            }
            
            this.voiceSelect.appendChild(option);
        });
        
        // If no Portuguese voice was found, select the first one
        if (!this.currentVoice && this.voices.length > 0) {
            this.currentVoice = this.voices[0];
        }
    }
    
    initEventListeners() {
        // Toggle narration controls
        this.enableNarration.addEventListener('change', () => {
            if (this.enableNarration.checked) {
                this.narrationControls.classList.remove('disabled');
            } else {
                this.narrationControls.classList.add('disabled');
                this.stopNarration();
            }
        });
        
        // Voice selection
        this.voiceSelect.addEventListener('change', () => {
            const selectedIndex = this.voiceSelect.value;
            this.currentVoice = this.voices[selectedIndex];
        });
        
        // Pitch control
        this.pitchRange.addEventListener('input', () => {
            this.pitch = parseFloat(this.pitchRange.value);
            this.pitchValue.textContent = this.pitch.toFixed(1);
        });
        
        // Rate control
        this.rateRange.addEventListener('input', () => {
            this.rate = parseFloat(this.rateRange.value);
            this.rateValue.textContent = this.rate.toFixed(1);
        });
        
        // Pause time
        this.pauseTimeInput.addEventListener('change', () => {
            this.pauseTime = parseInt(this.pauseTimeInput.value, 10);
        });
        
        // Start/Stop narration
        this.startNarrationBtn.addEventListener('click', () => {
            if (this.isNarrating) {
                this.stopNarration();
            } else {
                this.startNarration();
            }
        });
    }
    
    // Find which page is currently most visible in the viewport
    findVisiblePageIndex() {
        if (!this.pages.length) return 0;
        
        const viewportHeight = window.innerHeight;
        const viewportTop = window.scrollY;
        const viewportBottom = viewportTop + viewportHeight;
        
        let maxVisibleArea = 0;
        let mostVisiblePageIndex = 0;
        
        this.pages.forEach((page, index) => {
            const rect = page.getBoundingClientRect();
            const pageTop = rect.top + window.scrollY;
            const pageBottom = pageTop + rect.height;
            
            // Calculate how much of the page is visible
            const visibleTop = Math.max(pageTop, viewportTop);
            const visibleBottom = Math.min(pageBottom, viewportBottom);
            const visibleArea = Math.max(0, visibleBottom - visibleTop);
            
            if (visibleArea > maxVisibleArea) {
                maxVisibleArea = visibleArea;
                mostVisiblePageIndex = index;
            }
        });
        
        return mostVisiblePageIndex;
    }

    async startNarration() {
        if (!this.enableNarration.checked || this.isNarrating) return;
        
        // Get the images container element
        const imagesContainer = document.getElementById('imagesContainer');
        if (!imagesContainer) {
            console.error('Images container not found');
            return;
        }
        
        this.isNarrating = true;
        this.startNarrationBtn.innerHTML = '<i class="fas fa-stop"></i> Parar Narração';
        this.startNarrationBtn.classList.add('active');
        
        // Disable other controls
        this.disableOtherControls(true);
        
        // Get all pages/images
        this.pages = Array.from(imagesContainer.children);
        
        // Find the currently visible page
        this.currentPage = this.findVisiblePageIndex();
        
        // Clear any existing buffer
        this.textBuffer = [];
        
        // Start reading if there are pages
        if (this.pages.length > 0) {
            // Start buffering next pages
            this.startBuffering();
            
            // Start reading
            this.readNextPage();
        } else {
            this.readingIndicator.textContent = 'Nenhuma página para ler';
            this.readingIndicator.style.display = 'block';
            setTimeout(() => {
                this.stopNarration();
            }, 2000);
        }
    }
    
    stopNarration() {
        this.isNarrating = false;
        this.isBuffering = false;
        
        // Cancel any ongoing speech
        if (this.synth) {
            this.synth.cancel();
        }
        
        // Clear any active intervals
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
        
        // Cancel any active audio elements from fallback
        if (this.fallbackAudio) {
            this.fallbackAudio.pause();
            this.fallbackAudio.src = '';
            this.fallbackAudio = null;
        }
        
        // Update UI
        this.startNarrationBtn.innerHTML = '<i class="fas fa-book-reader"></i> Iniciar Narração';
        this.startNarrationBtn.classList.remove('active');
        this.readingIndicator.style.display = 'none';
        
        // Clear buffer
        this.textBuffer = [];
        
        // Re-enable other controls
        this.disableOtherControls(false);
        
        console.log('Narration stopped completely');
    }
    
    // New method to start buffering text from upcoming pages
    async startBuffering() {
        if (this.isBuffering) return;
        
        this.isBuffering = true;
        
        // Start buffering in the background
        this.bufferNextPages();
    }
    
    // New method to buffer text from upcoming pages
    async bufferNextPages() {
        if (!this.isNarrating || !this.isBuffering) return;
        
        try {
            // Calculate which pages to buffer
            const startIdx = this.currentPage + 1;
            const endIdx = Math.min(startIdx + this.bufferSize, this.pages.length);
            
            // Buffer each page that isn't already in the buffer
            for (let i = startIdx; i < endIdx; i++) {
                if (this.textBuffer.length > i - this.currentPage - 1) continue; // Skip if already buffered
                
                const page = this.pages[i];
                let text = '';
                
                // Extract text based on content type
                if (page.tagName === 'IMG' || page.dataset.type === 'image') {
                    text = await this.extractTextFromImage(page);
                } else if (page.classList.contains('pdf-page') || page.dataset.type === 'pdf') {
                    text = await this.extractTextFromPdfPage(page);
                } else if (page.classList.contains('epub-page') || page.dataset.type === 'epub') {
                    text = await this.extractTextFromEpubPage(page);
                } else {
                    // Try to determine the type from child elements
                    const img = page.querySelector('img');
                    if (img) {
                        text = await this.extractTextFromImage(img);
                    } else {
                        // Default fallback - try to get any text content
                        text = page.textContent || 'Não foi possível determinar o tipo de conteúdo.';
                    }
                }
                
                // If no text was extracted, use a placeholder
                if (!text || text.trim() === '') {
                    text = 'Não foi possível extrair texto desta página.';
                }
                
                // Add to buffer
                this.textBuffer.push(text);
                
                // Stop if narration has been stopped
                if (!this.isNarrating || !this.isBuffering) return;
            }
        } catch (error) {
            console.error('Error during buffering:', error);
        }
    }
    
    async readNextPage() {
        if (!this.isNarrating || this.currentPage >= this.pages.length) {
            this.stopNarration();
            return;
        }
        
        const page = this.pages[this.currentPage];
        
        // Scroll to the current page
        page.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Extract text from the page or use buffered text
        this.readingIndicator.textContent = 'Processando texto...';
        this.readingIndicator.style.display = 'block';
        
        try {
            let text = '';
            
            // Check if we have this page in the buffer
            if (this.textBuffer.length > 0) {
                // Use the first item in the buffer
                text = this.textBuffer.shift();
                
                // Trigger buffering of more pages
                this.bufferNextPages();
            } else {
                // No buffered text, extract directly
                if (page.tagName === 'IMG' || page.dataset.type === 'image') {
                    text = await this.extractTextFromImage(page);
                } else if (page.classList.contains('pdf-page') || page.dataset.type === 'pdf') {
                    text = await this.extractTextFromPdfPage(page);
                } else if (page.classList.contains('epub-page') || page.dataset.type === 'epub') {
                    text = await this.extractTextFromEpubPage(page);
                } else {
                    // Try to determine the type from child elements
                    const img = page.querySelector('img');
                    if (img) {
                        text = await this.extractTextFromImage(img);
                    } else {
                        // Default fallback - try to get any text content
                        text = page.textContent || 'Não foi possível determinar o tipo de conteúdo.';
                    }
                }
                
                // If no text was extracted, use a placeholder
                if (!text || text.trim() === '') {
                    text = 'Não foi possível extrair texto desta página.';
                }
                
                // Start buffering next pages if not already buffering
                if (!this.isBuffering) {
                    this.startBuffering();
                }
            }
            
            // Read the text
            this.readingIndicator.textContent = 'Lendo...';
            await this.speakText(text);
            
            // Wait for the specified pause time
            await new Promise(resolve => setTimeout(resolve, this.pauseTime * 1000));
            
            // Move to the next page
            this.currentPage++;
            
            // Continue reading if still narrating
            if (this.isNarrating) {
                this.readNextPage();
            }
            
        } catch (error) {
            console.error('Error during narration:', error);
            this.readingIndicator.textContent = 'Erro na narração';
            
            // Try to continue with next page after a short delay
            setTimeout(() => {
                if (this.isNarrating) {
                    this.currentPage++;
                    this.readNextPage();
                } else {
                    this.stopNarration();
                }
            }, 2000);
        }
    }
    
    async extractTextFromPdfPage(pdfContainer) {
        this.isProcessing = true;
        this.readingIndicator.textContent = 'Extraindo texto do PDF...';
        
        try {
            // Instead of trying to extract text directly, we'll capture the rendered page as an image
            // and use OCR on it
            
            // Create a canvas element to capture the PDF page
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Set canvas dimensions to match the PDF container
            const rect = pdfContainer.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            
            // Draw the PDF container content to the canvas
            context.drawImage(pdfContainer, 0, 0, canvas.width, canvas.height);
            
            // Convert canvas to image data URL
            const imageDataUrl = canvas.toDataURL('image/png');
            
            // Use Tesseract OCR on the captured image
            const result = await Tesseract.recognize(
                imageDataUrl,
                'por+eng', // Portuguese and English languages
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            this.readingIndicator.textContent = `Extraindo texto: ${Math.floor(m.progress * 100)}%`;
                        }
                    }
                }
            );
            
            this.isProcessing = false;
            return result.data.text || 'Não foi possível extrair texto desta página do PDF.';
        } catch (error) {
            console.error('PDF text extraction error:', error);
            this.isProcessing = false;
            
            // Fallback: try to use html2canvas to capture the PDF page
            try {
                this.readingIndicator.textContent = 'Tentando método alternativo...';
                
                // Use html2canvas as a fallback (requires html2canvas to be loaded)
                if (typeof html2canvas !== 'undefined') {
                    const canvas = await html2canvas(pdfContainer);
                    const imageDataUrl = canvas.toDataURL('image/png');
                    
                    const result = await Tesseract.recognize(
                        imageDataUrl,
                        'por+eng',
                        {
                            logger: m => {
                                if (m.status === 'recognizing text') {
                                    this.readingIndicator.textContent = `Extraindo texto: ${Math.floor(m.progress * 100)}%`;
                                }
                            }
                        }
                    );
                    
                    return result.data.text || 'Não foi possível extrair texto desta página do PDF.';
                }
            } catch (fallbackError) {
                console.error('Fallback extraction error:', fallbackError);
            }
            
            return 'Erro ao extrair texto do PDF.';
        }
    }
    
    async extractTextFromEpubPage(epubContainer) {
        this.isProcessing = true;
        this.readingIndicator.textContent = 'Extraindo texto do EPUB...';
        
        try {
            // Get the EPUB URL from the container's data attribute
            const epubUrl = epubContainer.dataset.src;
            const cfi = epubContainer.dataset.cfi; // Content Fragment Identifier
            
            if (!epubUrl) {
                throw new Error('EPUB URL not found');
            }
            
            // Create a temporary book object if not already created
            if (!window.epubBook || window.epubBook.url !== epubUrl) {
                window.epubBook = ePub(epubUrl);
                await new Promise(resolve => {
                    window.epubBook.ready.then(resolve);
                });
            }
            
            // Get the content from the current location
            let content;
            if (cfi) {
                content = await window.epubBook.getRange(cfi);
            } else {
                // If no CFI is provided, try to get the current section
                const currentLocation = await window.epubBook.locations.currentLocation();
                content = await window.epubBook.getRange(currentLocation);
            }
            
            // Extract text from HTML content
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            const text = tempDiv.textContent || tempDiv.innerText || '';
            
            this.isProcessing = false;
            return text.trim() || 'Não foi possível extrair texto desta página do EPUB.';
        } catch (error) {
            console.error('EPUB text extraction error:', error);
            this.isProcessing = false;
            return 'Erro ao extrair texto do EPUB.';
        }
    }
    
    speakText(text) {
        return new Promise((resolve) => {
            if (!this.isNarrating) {
                console.log('Not narrating anymore, speech canceled');
                resolve();
                return;
            }
            
            console.log('Attempting to speak:', text);
            
            // Skip the audio test which is causing errors
            // Instead, try direct speech synthesis first
            
            // Force resume the speech synthesis (Chrome sometimes suspends it)
            if (this.synth.paused) {
                this.synth.resume();
            }
            
            // Cancel any ongoing speech
            this.synth.cancel();
            
            // Create a new utterance
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Make sure we have a voice selected
            if (!this.currentVoice) {
                this.voices = this.synth.getVoices();
                if (this.voices.length > 0) {
                    this.currentVoice = this.voices[0];
                    console.log('Selected default voice:', this.currentVoice.name);
                } else {
                    console.error('No voices available');
                }
            }
            
            utterance.voice = this.currentVoice;
            utterance.pitch = this.pitch;
            utterance.rate = this.rate;
            utterance.volume = 1.0;
            utterance.lang = this.currentVoice ? this.currentVoice.lang : 'pt-BR';
            
            utterance.onstart = () => {
                if (!this.isNarrating) {
                    this.synth.cancel();
                    resolve();
                    return;
                }
                
                console.log('Speech started');
                this.readingIndicator.textContent = 'Lendo...';
                
                // Keep speech synthesis active in Chrome
                this.keepAlive();
            };
            
            utterance.onend = () => {
                console.log('Speech ended');
                if (this.isNarrating) {
                    resolve();
                }
            };
            
            utterance.onerror = (event) => {
                console.error('SpeechSynthesis error:', event);
                
                // Only try fallback if still narrating
                if (this.isNarrating) {
                    // Try an alternative approach if speech fails
                    this.fallbackSpeak(text).then(resolve);
                } else {
                    resolve();
                }
            };
            
            // Add the utterance to the queue
            setTimeout(() => {
                if (!this.isNarrating) {
                    resolve();
                    return;
                }
                
                this.synth.speak(utterance);
                
                // Check if speech actually started
                setTimeout(() => {
                    if (!this.isNarrating) {
                        resolve();
                        return;
                    }
                    
                    if (!this.synth.speaking) {
                        console.warn('Speech did not start, trying fallback');
                        this.fallbackSpeak(text).then(resolve);
                    }
                }, 500);
            }, 100);
        });
    }
    
    // Keep speech synthesis active in Chrome
    keepAlive() {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
        }
        
        this.keepAliveInterval = setInterval(() => {
            if (this.synth.speaking) {
                this.synth.pause();
                this.synth.resume();
            } else {
                clearInterval(this.keepAliveInterval);
            }
        }, 5000);
    }
    
    // Fallback speech method using audio elements
    fallbackSpeak(text) {
        return new Promise((resolve) => {
            if (!this.isNarrating) {
                resolve();
                return;
            }
            
            console.log('Using fallback speech method');
            this.readingIndicator.textContent = 'Usando método alternativo de leitura...';
            
            // Try using the ResponsiveVoice API if available
            if (window.responsiveVoice && window.responsiveVoice.speak) {
                const lang = this.currentVoice && this.currentVoice.lang ? this.currentVoice.lang : 'pt-BR';
                const voice = lang.includes('pt') ? 'Brazilian Portuguese Female' : 'UK English Female';
                
                window.responsiveVoice.speak(text, voice, {
                    pitch: this.pitch,
                    rate: this.rate,
                    onend: resolve,
                    onerror: () => {
                        console.error('ResponsiveVoice failed');
                        resolve();
                    }
                });
                return;
            }
            
            // If ResponsiveVoice is not available, try a simpler approach
            // Create a simple beep sound to indicate text is being processed
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
                oscillator.connect(audioContext.destination);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.2);
                
                // Display the text visually since we can't speak it
                this.readingIndicator.innerHTML = `<div style="max-height: 150px; overflow-y: auto; padding: 10px; background: rgba(0,0,0,0.7); color: white; border-radius: 5px;">${text}</div>`;
                
                // Resolve after a delay based on text length
                const readingTime = Math.max(2000, text.length * 50); // ~200 words per minute
                setTimeout(resolve, readingTime);
            } catch (error) {
                console.error('Audio fallback failed:', error);
                resolve();
            }
        });
    }
    
    disableOtherControls(disabled) {
        // Disable other sidebar controls
        const controls = [
            'scrollDirection',
            'spacing',
            'scrollSpeed',
            'startButton',
            'dropZone'
        ];
        
        controls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.disabled = disabled;
            }
        });
    }
    
    // After the findVisiblePageIndex method and before extractTextFromPdfPage method
    
    async extractTextFromImage(imageElement) {
        this.isProcessing = true;
        this.readingIndicator.textContent = 'Extraindo texto da imagem...';
        
        try {
            // Use Tesseract.js for OCR
            const result = await Tesseract.recognize(
                imageElement.src,
                'por+eng', // Portuguese and English languages
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            this.readingIndicator.textContent = `Extraindo texto: ${Math.floor(m.progress * 100)}%`;
                        }
                    }
                }
            );
            
            this.isProcessing = false;
            return result.data.text || 'Não foi possível extrair texto desta imagem.';
        } catch (error) {
            console.error('OCR error:', error);
            this.isProcessing = false;
            return 'Erro ao extrair texto da imagem.';
        }
    }
}

// Initialize the narrator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Make sure all DOM elements are loaded before initializing
    setTimeout(() => {
        try {
            window.narrator = new ComicNarrator();
        } catch (error) {
            console.error('Error initializing narrator:', error);
        }
    }, 500);
});