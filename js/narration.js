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

    // Solicitar permissões de áudio do navegador
    async requestAudioPermissions() {
        try {
            // Solicitar acesso ao microfone (isso pode ajudar com permissões de áudio em geral)
            await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("Permissões de áudio concedidas");
            return true;
        } catch (error) {
            console.warn("Não foi possível obter permissões de áudio:", error);
            return false;
        }
    }

    loadVoices() {
        this.voices = this.synth.getVoices();
        console.log("🎭 Descobrindo vozes disponíveis:", this.voices.length);

        // Limpar seletor de vozes
        this.voiceSelect.innerHTML = '';

        // Identificar vozes premium (Ricardo e Antonio)
        const premiumVoices = this.voices.filter(voice =>
            voice.name.includes('Ricardo') ||
            voice.name.includes('Antonio')
        );

        // Log de todas as vozes para debug
        this.voices.forEach((voice, index) => {
            console.log(`🎤 ${index}: ${voice.name} (${voice.lang}) - Local: ${voice.localService ? '✓' : '✗'}`);
        });

        // Criar seção especial para vozes premium
        if (premiumVoices.length > 0) {
            const premiumGroup = document.createElement('optgroup');
            premiumGroup.label = '✨ Vozes Premium';

            premiumVoices.forEach(voice => {
                const option = document.createElement('option');
                option.textContent = `${voice.name} ★★★★★`;
                option.value = this.voices.indexOf(voice);
                premiumGroup.appendChild(option);

                // Selecionar automaticamente a primeira voz premium
                if (!this.currentVoice) {
                    option.selected = true;
                    this.currentVoice = voice;
                    console.log("🏆 Voz premium selecionada:", voice.name);
                }
            });

            this.voiceSelect.appendChild(premiumGroup);
        }

        // Organizar o restante das vozes por idioma e qualidade
        const voicesByLanguage = {};

        this.voices.forEach((voice, index) => {
            // Pular vozes premium (já adicionadas) e vozes de baixa qualidade
            if (premiumVoices.includes(voice) || this.isLowQualityVoice(voice)) {
                return;
            }

            const lang = voice.lang || 'unknown';
            if (!voicesByLanguage[lang]) {
                voicesByLanguage[lang] = [];
            }

            voicesByLanguage[lang].push({
                voice: voice,
                index: index,
                quality: this.assessVoiceQuality(voice)
            });
        });

        // Adicionar vozes por idioma, priorizando português
        const languageOrder = [
            'pt-BR', 'pt-PT',  // Português primeiro
            'en-US', 'en-GB',  // Inglês depois
            ...Object.keys(voicesByLanguage).filter(lang =>
                !['pt-BR', 'pt-PT', 'en-US', 'en-GB'].includes(lang)
            )
        ];

        languageOrder.forEach(lang => {
            if (!voicesByLanguage[lang]) return;

            const optgroup = document.createElement('optgroup');
            optgroup.label = this.getLanguageName(lang);

            // Ordenar por qualidade
            voicesByLanguage[lang].sort((a, b) => b.quality - a.quality);

            voicesByLanguage[lang].forEach(voiceInfo => {
                const option = document.createElement('option');
                const qualityStars = '★'.repeat(voiceInfo.quality);
                option.textContent = `${voiceInfo.voice.name} ${qualityStars}`;
                option.value = voiceInfo.index;

                // Selecionar a melhor voz em português se não houver vozes premium
                if (!this.currentVoice && (lang === 'pt-BR' || lang === 'pt-PT') && voiceInfo.quality >= 3) {
                    option.selected = true;
                    this.currentVoice = voiceInfo.voice;
                    console.log("🇧🇷 Voz em português selecionada:", voiceInfo.voice.name);
                }

                optgroup.appendChild(option);
            });

            this.voiceSelect.appendChild(optgroup);
        });

        // Se ainda não temos uma voz, selecionar a primeira disponível
        if (!this.currentVoice && this.voices.length > 0) {
            this.currentVoice = this.voices[0];
            console.log("⚠️ Fallback para primeira voz:", this.currentVoice.name);
        }

        // Adicionar informações sobre vozes e botão de atualização
        this.addVoiceInfoPanel();
    }

    // Método para avaliar a qualidade das vozes (1-5 estrelas)
    assessVoiceQuality(voice) {
        let quality = 3; // Base de qualidade

        // Vozes premium
        if (voice.name.includes('Ricardo') ||
            voice.name.includes('Antonio')) {
            return 5; // Qualidade máxima
        }

        // Vozes em português recebem bônus
        if (voice.lang === 'pt-BR' || voice.lang === 'pt-PT') {
            quality += 1;
        }

        // Vozes premium/neural geralmente são melhores
        if (voice.name.includes('Premium') ||
            voice.name.includes('Enhanced') ||
            voice.name.includes('Neural')) {
            quality += 1;
        }

        // Google geralmente tem boa qualidade
        if (voice.name.includes('Google')) {
            quality += 1;
        }

        // Vozes da Microsoft padrão são medianas
        if (voice.name.includes('Microsoft') &&
            !voice.name.includes('Neural') &&
            !voice.name.includes('Premium')) {
            quality -= 1;
        }

        // Vozes conhecidas por baixa qualidade
        if (voice.name.includes('espeak') ||
            voice.name.includes('pico')) {
            quality -= 2;
        }

        // Vozes locais geralmente são mais confiáveis
        if (voice.localService === true) {
            quality += 1;
        } else {
            quality -= 1; // Penalidade para vozes que requerem internet
        }

        // Limitar entre 1-5
        return Math.max(1, Math.min(5, quality));
    }

    // Identificar vozes de baixa qualidade para filtrar
    isLowQualityVoice(voice) {
        // Nunca filtrar nossas vozes premium
        if (voice.name.includes('Ricardo') ||
            voice.name.includes('Antonio')) {
            return false;
        }

        // Lista negra de vozes conhecidas por baixa qualidade
        return voice.name.includes('espeak-ng') ||
            voice.name.includes('pico2wave') ||
            (voice.name.toLowerCase().includes('test') && !voice.name.includes('Microsoft')) ||
            voice.name.includes('Microsoft Zira') ||
            voice.name.includes('Microsoft David') ||
            voice.name.includes('Microsoft Mark') ||
            voice.name.includes('Microsoft Heera') ||
            (voice.name.includes('Microsoft') && voice.name.includes('Desktop'));
    }

    // Adicionar painel informativo e botão de atualização
    addVoiceInfoPanel() {
        // Remover painéis existentes para evitar duplicação
        document.querySelectorAll('.voice-info-panel, .refresh-voices').forEach(el => el.remove());

        // Criar painel estilizado
        const panel = document.createElement('div');
        panel.className = 'voice-info-panel';
        panel.innerHTML = `
            <div class="voice-info-header">
                <span class="voice-info-icon">🎙️</span>
                <h3>Biblioteca de Vozes</h3>
            </div>
            <div class="voice-info-content">
                <p>Para uma experiência narrativa sublime:</p>
                <ul>
                    <li><span class="voice-step">1</span> Permita que o navegador acesse suas vozes instaladas</li>
                    <li><span class="voice-step">2</span> Selecione uma voz instalada no computador para melhor qualidade</li>
                    <li><span class="voice-step">3</span> Ajuste o tom e velocidade conforme sua preferência</li>
                </ul>
                <div class="voice-status">
                    ${this.currentVoice ?
                `<p>Voz atual: <span class="current-voice">${this.currentVoice.name}</span></p>` :
                '<p>Nenhuma voz selecionada</p>'}
                </div>
            </div>
        `;

        // Botão de atualização estilizado
        const refreshButton = document.createElement('button');
        refreshButton.className = 'refresh-voices';
        refreshButton.innerHTML = '<span class="refresh-icon">↻</span> Atualizar Vozes';
        refreshButton.addEventListener('click', () => {
            refreshButton.classList.add('refreshing');
            setTimeout(() => {
                this.loadVoices();
                refreshButton.classList.remove('refreshing');
            }, 500);
        });

        // Adicionar elementos ao DOM
        this.voiceSelect.parentNode.insertBefore(panel, this.voiceSelect.nextSibling);
        panel.querySelector('.voice-info-content').appendChild(refreshButton);

        // Adicionar estilos CSS inline para garantir que sejam aplicados
        const style = document.createElement('style');
        style.textContent = `
            .voice-info-panel {
                margin-top: 15px;
                background: rgba(30, 30, 30, 0.9);
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                border: 1px solid rgba(52, 152, 219, 0.3);
            }
            
            .voice-info-header {
                background: var(--accent-color);
                padding: 10px 15px;
                display: flex;
                align-items: center;
            }
            
            .voice-info-icon {
                font-size: 1.5rem;
                margin-right: 10px;
            }
            
            .voice-info-header h3 {
                margin: 0;
                color: white;
                font-size: 1.2rem;
            }
            
            .voice-info-content {
                padding: 15px;
                color: #f0f0f0;
            }
            
            .voice-info-content p {
                margin-top: 0;
                margin-bottom: 10px;
            }
            
            .voice-info-content ul {
                margin: 0;
                padding-left: 5px;
                list-style: none;
            }
            
            .voice-info-content li {
                margin-bottom: 8px;
                display: flex;
                align-items: center;
            }
            
            .voice-step {
                display: inline-block;
                width: 22px;
                height: 22px;
                background: var(--accent-color);
                border-radius: 50%;
                text-align: center;
                line-height: 22px;
                margin-right: 10px;
                font-weight: bold;
                color: white;
            }
            
            .voice-status {
                margin-top: 15px;
                padding-top: 10px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .current-voice {
                font-weight: bold;
                color: #3498db;
            }
            
            .refresh-voices {
                margin-top: 10px;
                padding: 8px 15px;
                background: var(--accent-color);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
            }
            
            .refresh-icon {
                display: inline-block;
                margin-right: 8px;
                font-size: 1.1rem;
                transition: transform 0.5s ease;
            }
            
            .refresh-voices:hover {
                background: #2980b9;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }
            
            .refresh-voices:hover .refresh-icon {
                transform: rotate(180deg);
            }
            
            .refresh-voices.refreshing .refresh-icon {
                animation: spin 1s infinite linear;
            }
            
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            #voiceSelect {
                width: 100%;
                padding: 8px;
                background: #222;
                color: #f0f0f0;
                border: 1px solid rgba(52, 152, 219, 0.5);
                border-radius: 4px;
                max-height: 200px;
                overflow-y: auto;
            }
            
            #voiceSelect optgroup {
                font-weight: bold;
                color: #3498db;
                background: #333;
            }
            
            #voiceSelect option {
                padding: 8px;
                background: #222;
                color: #f0f0f0;
            }
            
            #voiceSelect option:hover, #voiceSelect option:focus {
                background: #444;
            }
        `;

        document.head.appendChild(style);
    }

    // Get human-readable language name
    getLanguageName(langCode) {
        const languageNames = {
            'pt-BR': 'Português (Brasil)',
            'pt-PT': 'Português (Portugal)',
            'en-US': 'English (US)',
            'en-GB': 'English (UK)',
            'es-ES': 'Español',
            'fr-FR': 'Français',
            'de-DE': 'Deutsch',
            'it-IT': 'Italiano',
            'ja-JP': '日本語',
            'ko-KR': '한국어',
            'zh-CN': '中文 (简体)',
            'zh-TW': '中文 (繁體)',
            'ru-RU': 'Русский'
        };

        return languageNames[langCode] || `${langCode}`;
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

        // Solicitar permissões de áudio antes de iniciar
        await this.requestAudioPermissions();

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

    // Disable other controls during narration
    disableOtherControls(disable) {
        this.voiceSelect.disabled = disable;
        this.pitchRange.disabled = disable;
        this.rateRange.disabled = disable;
        this.pauseTimeInput.disabled = disable;
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

    async extractTextFromImage(imgElement) {
        this.isProcessing = true;
        this.readingIndicator.textContent = 'Extraindo texto da imagem...';

        try {
            // Check if Tesseract is available
            if (typeof Tesseract === 'undefined') {
                throw new Error('Tesseract OCR not available');
            }

            // Get image source
            const imgSrc = imgElement.src || imgElement.dataset.src;
            if (!imgSrc) {
                throw new Error('Image source not found');
            }

            // Use Tesseract OCR to extract text
            const result = await Tesseract.recognize(
                imgSrc,
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
            console.error('Image text extraction error:', error);
            this.isProcessing = false;

            // Try to get alt text as fallback
            if (imgElement.alt && imgElement.alt.trim() !== '') {
                return imgElement.alt;
            }

            // Try to get any text from parent element
            if (imgElement.parentElement && imgElement.parentElement.textContent) {
                const parentText = imgElement.parentElement.textContent.trim();
                if (parentText !== '') {
                    return parentText;
                }
            }

            return 'Não foi possível extrair texto desta imagem.';
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

            // Try to get any text content from the PDF container
            const textContent = pdfContainer.textContent || '';
            if (textContent.trim() !== '') {
                return textContent;
            }

            return 'Não foi possível extrair texto desta página do PDF.';
        }
    }

    async extractTextFromEpubPage(epubContainer) {
        this.isProcessing = true;
        this.readingIndicator.textContent = 'Extraindo texto do EPUB...';

        try {
            // Get text content from the EPUB container
            const textContent = epubContainer.textContent || '';

            this.isProcessing = false;

            if (textContent.trim() !== '') {
                return textContent;
            } else {
                return 'Não foi possível extrair texto desta página do EPUB.';
            }
        } catch (error) {
            console.error('EPUB text extraction error:', error);
            this.isProcessing = false;
            return 'Não foi possível extrair texto desta página do EPUB.';
        }
    }

    async speakText(text) {
        return new Promise((resolve, reject) => {
            if (!this.isNarrating) {
                resolve();
                return;
            }

            if (!text || text.trim() === '') {
                resolve();
                return;
            }

            // Create a new utterance
            const utterance = new SpeechSynthesisUtterance(text);

            // Set voice and other properties
            if (this.currentVoice) {
                utterance.voice = this.currentVoice;
            }

            utterance.pitch = this.pitch;
            utterance.rate = this.rate;
            utterance.lang = this.currentVoice ? this.currentVoice.lang : 'pt-BR';

            // Set up event handlers
            utterance.onend = () => {
                console.log('Speech ended');
                resolve();
            };

            utterance.onerror = (event) => {
                console.error('Speech error:', event);
                reject(new Error('Speech synthesis error'));
            };

            // Start speaking
            this.synth.speak(utterance);

            // Keep the speech synthesis active (prevent it from stopping after a while)
            this.keepSpeechSynthesisActive();
        });
    }

    // Keep speech synthesis active to prevent it from stopping
    keepSpeechSynthesisActive() {
        // Clear any existing interval
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
        }

        // Set up a new interval to ping the speech synthesis
        this.keepAliveInterval = setInterval(() => {
            if (!this.isNarrating) {
                clearInterval(this.keepAliveInterval);
                this.keepAliveInterval = null;
                return;
            }

            // If speech synthesis has paused unexpectedly, resume it
            if (this.synth.paused) {
                console.log('Speech synthesis paused unexpectedly, resuming...');
                this.synth.resume();
            }
        }, 5000); // Check every 5 seconds
    }

    // Organize voices by language and quality
    organizeVoicesByLanguage(voices) {
        const voicesByLanguage = {};

        voices.forEach((voice, index) => {
            // Skip low quality voices
            if (this.isLowQualityVoice(voice)) {
                return;
            }

            const lang = voice.lang || 'unknown';
            if (!voicesByLanguage[lang]) {
                voicesByLanguage[lang] = [];
            }

            voicesByLanguage[lang].push({
                voice: voice,
                index: index,
                quality: this.assessVoiceQuality(voice)
            });
        });

        // Sort voices by quality within each language
        Object.keys(voicesByLanguage).forEach(lang => {
            voicesByLanguage[lang].sort((a, b) => b.quality - a.quality);
        });

        return voicesByLanguage;
    }
}

// Initialize the narrator when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if the required elements exist
    if (document.getElementById('enableNarration')) {
        window.comicNarrator = new ComicNarrator();
    } else {
        console.warn('Narration controls not found in the document');
    }
});