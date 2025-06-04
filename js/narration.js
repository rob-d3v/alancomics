class ComicNarrator {
    constructor() {
        if (!window.speechSynthesis) {
            console.error("SpeechSynthesis não disponível neste navegador!");
            alert("Seu navegador não suporta síntese de voz. Por favor, tente usar um navegador mais recente como Chrome, Firefox ou Edge.");
            return;
        }

        console.log("Inicializando ComicNarrator");
        this.synth = window.speechSynthesis;

        // Verificar o estado atual do sintetizador
        console.log("Estado inicial do sintetizador - falando:", this.synth.speaking, "- pendente:", this.synth.pending, "- pausado:", this.synth.paused);

        // Forçar um reset no sintetizador para limpar qualquer estado inconsistente
        this.synth.cancel();
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

        // Sistema de controle para evitar repetição de textos
        this.recentlyNarratedTexts = [];
        this.maxRecentTexts = 10; // Número máximo de textos recentes a armazenar
        this.textSimilarityThreshold = 0.8; // Limiar de similaridade para considerar textos como iguais

        // Controle para evitar múltiplas inicializações de vozes
        this.voicesInitialized = false;

        // Controle de estado da narração
        this.narrationState = {
            lastProcessedPage: -1,
            lastProcessedSelection: -1,
            isPageMode: false,
            isSelectionMode: false,
            currentNarrationId: null
        };

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
        this.keydownHandler = (event) => {
            // Verificar se a tecla pressionada é espaço
            if (event.code === 'Space' && this.isNarrating) {
                // Evitar o comportamento padrão do navegador (rolar página)
                event.preventDefault();

                // Alternar entre pausar e retomar narração
                this.togglePauseNarration();
            } else if (event.key === 'Escape' && this.isNarrating) {
                this.stopNarration();
            }
        };

        document.body.appendChild(this.readingIndicator);

        this.initVoices();
        this.initEventListeners();
        this.keydownHandler = null;
    }

    initVoices() {
        // Verificar se as vozes já foram inicializadas para evitar múltiplas inicializações
        if (this.voicesInitialized) {
            console.log('ComicNarrator: Lista de vozes já foi inicializada anteriormente');
            return;
        }

        console.log('ComicNarrator: Inicializando lista de vozes (primeira vez)');
        this.voicesInitialized = true;

        // Populate voices when available
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => {
                // Verificar novamente para evitar múltiplas chamadas do evento onvoiceschanged
                if (this.voices.length > 0) {
                    console.log('ComicNarrator: Evento onvoiceschanged ignorado, vozes já carregadas');
                    return;
                }

                this.loadVoices();
                // Registrar detalhes das vozes após carregamento
                this.logVoiceDetails();
                // Tentar acessar vozes do narrador após o evento onvoiceschanged
                this.tryAccessNarratorVoices();
            };
        }

        // Try to load voices immediately
        this.loadVoices();

        // Tentar forçar carregamento de vozes SAPI do Windows
        this.forceWindowsVoicesDetection();

        // Tentar acessar vozes do narrador do Windows
        this.tryAccessNarratorVoices();
    }

    // Método específico para tentar acessar as vozes do narrador do Windows
    tryAccessNarratorVoices() {
        // Verificar se já temos vozes suficientes carregadas
        if (this.voices.length > 5) {
            console.log("🔍 Verificando vozes do Narrador entre as", this.voices.length, "vozes já carregadas");
        } else {
            console.log("🔍 Tentando acessar especificamente as vozes do Narrador do Windows (Antonio e Francisca)...");
        }

        // Verificar se já temos as vozes do narrador
        const hasAntonioVoice = this.voices.some(voice => voice.name.includes('Antonio'));
        const hasFranciscaVoice = this.voices.some(voice => voice.name.includes('Francisca'));

        if (hasAntonioVoice && hasFranciscaVoice) {
            console.log("✅ Vozes Antonio e Francisca já estão disponíveis!");
            return;
        }

        // Se já temos muitas vozes mas não as do narrador, provavelmente não estão disponíveis
        if (this.voices.length > 10 && !hasAntonioVoice && !hasFranciscaVoice) {
            console.log("⚠️ Muitas vozes disponíveis, mas Antonio e Francisca não foram encontradas. Provavelmente não estão instaladas no sistema.");
            return;
        }

        // Tentar forçar a inicialização do serviço de voz com uma fala vazia
        try {
            console.log("🔄 Tentando inicializar o serviço de voz para detectar vozes do Narrador...");

            // Criar um utterance vazio e falar para inicializar o serviço
            const initUtterance = new SpeechSynthesisUtterance('');
            // Definir propriedades que podem ajudar a inicializar o serviço completo
            initUtterance.lang = 'pt-BR';
            initUtterance.volume = 0; // Sem som

            // Falar e cancelar imediatamente
            window.speechSynthesis.speak(initUtterance);
            window.speechSynthesis.cancel();

            // Tentar carregar as vozes novamente após um breve intervalo
            setTimeout(() => {
                // Verificar se já temos vozes suficientes antes de tentar novamente
                if (this.voices.length > 0) {
                    // Verificar novamente por Antonio e Francisca
                    const antonioVoice = this.voices.find(voice => voice.name.includes('Antonio'));
                    const franciscaVoice = this.voices.find(voice => voice.name.includes('Francisca'));

                    if (antonioVoice || franciscaVoice) {
                        console.log("🎉 SUCESSO! Vozes do Narrador detectadas após inicialização forçada!");
                        if (antonioVoice) console.log("   - Antonio detectado!", antonioVoice.name);
                        if (franciscaVoice) console.log("   - Francisca detectada!", franciscaVoice.name);
                        return;
                    }
                }

                // Tentar obter as vozes novamente apenas se necessário
                const currentVoices = this.synth.getVoices();
                if (currentVoices.length > this.voices.length) {
                    this.voices = currentVoices;

                    // Verificar novamente por Antonio e Francisca
                    const antonioVoice = this.voices.find(voice => voice.name.includes('Antonio'));
                    const franciscaVoice = this.voices.find(voice => voice.name.includes('Francisca'));

                    if (antonioVoice || franciscaVoice) {
                        console.log("🎉 SUCESSO! Vozes do Narrador detectadas após inicialização forçada!");
                        if (antonioVoice) console.log("   - Antonio detectado!", antonioVoice.name);
                        if (franciscaVoice) console.log("   - Francisca detectada!", franciscaVoice.name);

                        // Recarregar a interface com as novas vozes apenas se necessário
                        if (this.voiceSelect && this.voiceSelect.options.length === 0) {
                            this.loadVoices();
                        }
                    } else {
                        console.log("⚠️ Vozes do Narrador ainda não detectadas após inicialização forçada.");
                    }
                }
            }, 500);

        } catch (e) {
            console.warn("⚠️ Erro ao tentar acessar vozes do Narrador:", e);
        }
    }

    // Método para registrar detalhes completos de todas as vozes disponíveis
    logVoiceDetails() {
        console.log("📊 DETALHES COMPLETOS DE TODAS AS VOZES DISPONÍVEIS:");
        console.log("==================================================");

        if (this.voices.length === 0) {
            console.warn("⚠️ Nenhuma voz detectada! Verifique as permissões do navegador.");
            return;
        }

        // Agrupar vozes por tipo (sistema vs navegador)
        const systemVoices = this.voices.filter(v => v.localService);
        const browserVoices = this.voices.filter(v => !v.localService);

        console.log(`🪟 VOZES DO SISTEMA (${systemVoices.length}):`);
        systemVoices.forEach((voice, i) => {
            console.log(`${i + 1}. ${voice.name}`);
            console.log(`   - Idioma: ${voice.lang}`);
            console.log(`   - Local: ${voice.localService ? 'Sim ✓' : 'Não ✗'}`);
            console.log(`   - Default: ${voice.default ? 'Sim ✓' : 'Não ✗'}`);
            console.log(`   - URI: ${voice.voiceURI || 'N/A'}`);
            // Listar todas as propriedades disponíveis
            console.log(`   - Todas as propriedades:`, Object.getOwnPropertyNames(voice));
        });

        console.log(`🌐 VOZES DO NAVEGADOR (${browserVoices.length}):`);
        browserVoices.forEach((voice, i) => {
            console.log(`${i + 1}. ${voice.name}`);
            console.log(`   - Idioma: ${voice.lang}`);
            console.log(`   - URI: ${voice.voiceURI || 'N/A'}`);
        });

        console.log("==================================================");
    }

    // Método para forçar a detecção de vozes SAPI do Windows e do Narrador
    forceWindowsVoicesDetection() {
        // Verificar se já temos vozes suficientes antes de tentar forçar a detecção
        if (this.voices.length > 5) {
            // Verificar se já temos vozes do Windows ou do Narrador
            const hasWindowsVoices = this.voices.some(voice =>
                voice.localService && (
                    voice.name.includes('Desktop') ||
                    voice.name.includes('SAPI') ||
                    voice.name.includes('Microsoft')
                )
            );

            const hasNarratorVoices = this.voices.some(voice =>
                voice.name.includes('Antonio') || voice.name.includes('Francisca')
            );

            if (hasWindowsVoices || hasNarratorVoices) {
                console.log("✅ Já existem vozes do Windows ou do Narrador carregadas. Ignorando detecção forçada.");
                this.readingIndicator.style.display = 'none';
                return;
            }
        }

        console.log("🔄 Tentando forçar detecção de vozes do Windows e do Narrador...");

        // Mostrar indicador de carregamento
        this.readingIndicator.textContent = 'Detectando vozes do Windows e do Narrador...';
        this.readingIndicator.style.display = 'block';

        // Reduzir o número de tentativas para evitar sobrecarga
        const attempts = [500, 2000, 5000];

        // Tentar forçar a inicialização do serviço de voz do Windows
        try {
            // Criar um utterance vazio e falar para inicializar o serviço
            const initUtterance = new SpeechSynthesisUtterance('');
            window.speechSynthesis.speak(initUtterance);
            window.speechSynthesis.cancel(); // Cancelar imediatamente
            console.log("🔄 Inicialização do serviço de voz realizada");
        } catch (e) {
            console.warn("⚠️ Não foi possível inicializar o serviço de voz:", e);
        }

        // Variável para controlar se já encontramos vozes suficientes
        let voicesFound = false;

        attempts.forEach((delay, index) => {
            setTimeout(() => {
                // Verificar se já encontramos vozes em tentativas anteriores
                if (voicesFound) {
                    console.log(`🛑 Ignorando tentativa ${index + 1} pois vozes já foram encontradas`);
                    return;
                }

                console.log(`🔍 Tentativa ${index + 1} de detectar vozes do Windows e do Narrador...`);

                // Verificar se já temos vozes suficientes antes de tentar carregar novamente
                if (this.voices.length === 0) {
                    this.loadVoices();
                }

                // Verificar se encontramos vozes suficientes
                if (this.voices.length > 0) {
                    // Buscar vozes do Windows de forma mais abrangente
                    const windowsVoices = this.voices.filter(voice =>
                        voice.localService && (
                            voice.name.includes('Desktop') ||
                            voice.name.includes('SAPI') ||
                            voice.name.includes('Microsoft') ||
                            // Tentar detectar vozes do narrador mesmo sem os prefixos comuns
                            voice.name.includes('Antonio') ||
                            voice.name.includes('Francisca')
                        ));

                    // Verificar especificamente por Antonio e Francisca
                    const antonioVoice = this.voices.find(voice => voice.name.includes('Antonio'));
                    const franciscaVoice = this.voices.find(voice => voice.name.includes('Francisca'));

                    if (windowsVoices.length > 0 || antonioVoice || franciscaVoice) {
                        voicesFound = true;

                        if (antonioVoice || franciscaVoice) {
                            let vozesDetetadas = [];
                            if (antonioVoice) vozesDetetadas.push('Antonio');
                            if (franciscaVoice) vozesDetetadas.push('Francisca');

                            this.readingIndicator.textContent = `✅ Vozes do Narrador detectadas: ${vozesDetetadas.join(', ')}!`;
                            console.log(`🎉 SUCESSO! Vozes do Narrador detectadas: ${vozesDetetadas.join(', ')}`);
                        } else {
                            this.readingIndicator.textContent = `✅ ${windowsVoices.length} vozes do Windows detectadas!`;
                            console.log(`✅ ${windowsVoices.length} vozes do Windows detectadas!`);
                        }
                    }
                }

                // Na última tentativa, atualizar a mensagem e ocultar o indicador
                if (index === attempts.length - 1) {
                    // Verificar novamente por Antonio e Francisca no escopo correto
                    const finalAntonioVoice = this.voices.find(voice => voice.name.includes('Antonio'));
                    const finalFranciscaVoice = this.voices.find(voice => voice.name.includes('Francisca'));

                    if (finalAntonioVoice || finalFranciscaVoice) {
                        // Destacar essas vozes no console para debug
                        if (finalAntonioVoice) console.log("🔍 Detalhes da voz Antonio:", finalAntonioVoice);
                        if (finalFranciscaVoice) console.log("🔍 Detalhes da voz Francisca:", finalFranciscaVoice);

                        setTimeout(() => {
                            this.readingIndicator.style.display = 'none';
                        }, 5000);
                    } else {
                        // Verificar vozes do Windows no escopo correto
                        const finalWindowsVoices = this.voices.filter(voice =>
                            voice.localService && (
                                voice.name.includes('Desktop') ||
                                voice.name.includes('SAPI') ||
                                voice.name.includes('Microsoft')
                            ));

                        if (finalWindowsVoices.length > 0) {
                            this.readingIndicator.textContent = `✅ Detectadas ${finalWindowsVoices.length} vozes do Windows!`;
                            console.log(`✅ Detectadas ${finalWindowsVoices.length} vozes do Windows, mas Antonio e Francisca não foram encontrados.`);
                            setTimeout(() => {
                                this.readingIndicator.style.display = 'none';
                            }, 3000);
                        } else {
                            this.readingIndicator.textContent = '⚠️ Nenhuma voz do Windows ou do Narrador detectada. Tente recarregar a página.';
                            console.warn("⚠️ Nenhuma voz do Windows ou do Narrador detectada após múltiplas tentativas.");
                            setTimeout(() => {
                                this.readingIndicator.style.display = 'none';
                            }, 5000);
                        }
                    }
                }
            }, delay);
        });
    }

    // Método modificado para não solicitar permissões de microfone desnecessárias
    async requestAudioPermissions() {
        try {
            // Não solicitar mais acesso ao microfone, apenas tentar carregar as vozes
            console.log("Carregando vozes do sistema sem solicitar permissões de microfone");

            // Tentar carregar as vozes diretamente
            setTimeout(() => {
                this.loadVoices();
                console.log("Tentativa adicional de carregar vozes do sistema");
            }, 1000);

            return true;
        } catch (error) {
            console.warn("Erro ao carregar vozes do sistema:", error);
            return false;
        }
    }

    loadVoices() {
        // Verificar se já temos vozes carregadas e se o seletor já foi preenchido
        if (this.voices.length > 0 && this.voiceSelect && this.voiceSelect.options.length > 0) {
            console.log("🔄 Ignorando carregamento de vozes, já existem", this.voices.length, "vozes carregadas");
            return;
        }

        this.voices = this.synth.getVoices();
        console.log("🎭 Descobrindo vozes disponíveis:", this.voices.length);

        // Verificar se o seletor de vozes existe antes de tentar limpar
        if (!this.voiceSelect) {
            console.warn("⚠️ Seletor de vozes não encontrado no DOM");
            return;
        }

        // Limpar seletor de vozes
        this.voiceSelect.innerHTML = '';

        // Verificar especificamente por Antonio e Francisca (vozes do Narrador)
        const antonioVoice = this.voices.find(voice => voice.name.includes('Antonio'));
        const franciscaVoice = this.voices.find(voice => voice.name.includes('Francisca'));

        if (antonioVoice || franciscaVoice) {
            console.log("🎉 VOZES DO NARRADOR ENCONTRADAS!");
            if (antonioVoice) console.log("   - Antonio: ", antonioVoice.name, "(", antonioVoice.lang, ")");
            if (franciscaVoice) console.log("   - Francisca: ", franciscaVoice.name, "(", franciscaVoice.lang, ")");
        }

        // Identificar vozes premium do Windows (incluindo mais vozes brasileiras)
        // Dando prioridade às vozes do Narrador (Antonio e Francisca)
        const premiumVoices = this.voices.filter(voice =>
            voice.name.includes('Antonio') || // Prioridade para vozes do Narrador
            voice.name.includes('Francisca') || // Prioridade para vozes do Narrador
            voice.name.includes('Ricardo') ||
            voice.name.includes('Maria') ||
            voice.name.includes('Daniel') ||
            (voice.name.includes('Microsoft') && voice.name.includes('Neural') && (voice.lang === 'pt-BR' || voice.lang === 'pt-PT')) ||
            // Vozes SAPI do Windows (geralmente são as instaladas no sistema)
            (voice.localService === true && (voice.name.includes('Desktop') || voice.name.includes('SAPI')))
        );

        // Forçar detecção de vozes SAPI do Windows e do Narrador
        console.log("🔍 Procurando por vozes SAPI do Windows, Microsoft e do Narrador...");
        const windowsVoices = this.voices.filter(voice =>
            // Vozes do sistema Windows
            (voice.localService === true &&
                (voice.name.includes('Desktop') || voice.name.includes('SAPI') || voice.name.includes('Microsoft'))) ||
            // Ou vozes do Narrador (mesmo que não sejam detectadas como localService)
            voice.name.includes('Antonio') || voice.name.includes('Francisca')
        );

        if (windowsVoices.length > 0) {
            console.log(`✅ Encontradas ${windowsVoices.length} vozes do sistema Windows/Narrador:`);
            windowsVoices.forEach(voice => console.log(`   - ${voice.name} (${voice.lang}) - Local: ${voice.localService ? 'Sim' : 'Não'}`));

            // Adicionar vozes do Windows à lista de premium se ainda não estiverem lá
            windowsVoices.forEach(voice => {
                if (!premiumVoices.includes(voice)) {
                    premiumVoices.push(voice);
                }
            });
        } else {
            console.log("⚠️ Nenhuma voz SAPI do Windows ou do Narrador encontrada");
        }

        // Log de todas as vozes para debug
        this.voices.forEach((voice, index) => {
            console.log(`🎤 ${index}: ${voice.name} (${voice.lang}) - Local: ${voice.localService ? '✓' : '✗'}`);
        });

        // Separar vozes premium em categorias
        const windowsVoicesPremium = premiumVoices.filter(voice =>
            voice.localService && (voice.name.includes('Desktop') || voice.name.includes('SAPI')));
        const otherPremiumVoices = premiumVoices.filter(voice =>
            !windowsVoicesPremium.includes(voice));

        // Criar seção especial para vozes do Windows (SAPI)
        if (windowsVoicesPremium.length > 0) {
            const windowsGroup = document.createElement('optgroup');
            windowsGroup.label = '🪟 Vozes do Sistema Windows';

            windowsVoicesPremium.forEach(voice => {
                const option = document.createElement('option');
                option.textContent = `${voice.name} ★★★★★`;
                option.value = this.voices.indexOf(voice);
                option.setAttribute('data-local', 'true');
                windowsGroup.appendChild(option);

                // Selecionar automaticamente a primeira voz do Windows
                if (!this.currentVoice) {
                    option.selected = true;
                    this.currentVoice = voice;
                    console.log("🪟 Voz do Windows selecionada:", voice.name);
                }
            });

            this.voiceSelect.appendChild(windowsGroup);
        }

        // Criar seção para outras vozes premium
        if (otherPremiumVoices.length > 0) {
            const premiumGroup = document.createElement('optgroup');
            premiumGroup.label = '✨ Vozes Básicas';

            otherPremiumVoices.forEach(voice => {
                const option = document.createElement('option');
                option.textContent = `${voice.name} ★★★★★`;
                option.value = this.voices.indexOf(voice);
                premiumGroup.appendChild(option);

                // Selecionar automaticamente a primeira voz premium se não tiver voz do Windows
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
                const isWindowsVoice = voiceInfo.voice.localService &&
                    (voiceInfo.voice.name.includes('Desktop') || voiceInfo.voice.name.includes('SAPI'));

                // Adicionar ícone para vozes do Windows
                const voiceIcon = isWindowsVoice ? '🪟 ' : '';
                option.textContent = `${voiceIcon}${voiceInfo.voice.name} ${qualityStars}`;
                option.value = voiceInfo.index;

                // Adicionar atributo data para estilização
                if (voiceInfo.voice.localService) {
                    option.setAttribute('data-local', 'true');
                }

                // Adicionar informação sobre ser voz do Windows
                if (isWindowsVoice) {
                    option.style.fontWeight = 'bold';
                    option.style.color = '#3498db';
                }

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

        // Prioridade máxima para vozes do Narrador do Windows
        if (voice.name.includes('Antonio') || voice.name.includes('Francisca')) {
            return 5; // Qualidade máxima absoluta para vozes do Narrador
        }

        // Outras vozes premium brasileiras
        if (voice.name.includes('Ricardo') ||
            voice.name.includes('Maria') ||
            voice.name.includes('Daniel')) {
            return 5; // Qualidade máxima
        }

        // Vozes SAPI do Windows (instaladas no sistema)
        if (voice.localService === true &&
            (voice.name.includes('Desktop') || voice.name.includes('SAPI'))) {
            quality += 2; // Bônus maior para vozes do sistema Windows
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
            !voice.name.includes('Premium') &&
            !voice.name.includes('Desktop')) {
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
            voice.name.includes('Antonio') ||
            voice.name.includes('Maria') ||
            voice.name.includes('Daniel') ||
            voice.name.includes('Francisca')) {
            return false;
        }

        // Nunca filtrar vozes SAPI do Windows (instaladas no sistema)
        if (voice.localService === true &&
            (voice.name.includes('Desktop') || voice.name.includes('SAPI'))) {
            return false;
        }

        // Lista negra de vozes conhecidas por baixa qualidade
        return voice.name.includes('espeak-ng') ||
            voice.name.includes('pico2wave') ||
            (voice.name.toLowerCase().includes('test') && !voice.name.includes('Microsoft')) ||
            // Removemos as vozes Desktop da lista negra, pois são vozes do sistema Windows
            voice.name.includes('Microsoft Zira') ||
            voice.name.includes('Microsoft David') ||
            voice.name.includes('Microsoft Mark') ||
            voice.name.includes('Microsoft Heera');
    }

    // Adicionar painel informativo e botão de atualização
    addVoiceInfoPanel() {
        // Remover painéis existentes para evitar duplicação
        document.querySelectorAll('.voice-info-panel, .refresh-voices').forEach(el => el.remove());

        // Criar painel estilizado
        const panel = document.createElement('div');
        panel.className = 'voice-info-panel';
        panel.innerHTML = `
            <div class="voice-info-content">
                <ul>
                    <li><span class="voice-step">1</span> Para uma experiência narrativa melhor, utilize o navegador: Firefox</li>
                    <li><span class="voice-step">2</span> Instale narradores de nível superior em sua máquina</li>
                    <li><span class="voice-step">3</span> Ajuste o tom e velocidade conforme sua preferência</li>
                </ul>
            </div>
        `;

        // Botão de atualização estilizado
        // const refreshButton = document.createElement('button');
        // refreshButton.className = 'refresh-voices';
        // refreshButton.innerHTML = '<span class="refresh-icon">↻</span> Atualizar Vozes';
        // refreshButton.addEventListener('click', () => {
        //     refreshButton.classList.add('refreshing');
        //     setTimeout(() => {
        //         this.loadVoices();
        //         refreshButton.classList.remove('refreshing');
        //     }, 500);
        // });

        // // Botão específico para forçar detecção de vozes do Windows
        // const windowsVoicesButton = document.createElement('button');
        // windowsVoicesButton.className = 'windows-voices-button';
        // windowsVoicesButton.innerHTML = '<span class="windows-icon">🪟</span> Detectar Vozes do Windows';
        // windowsVoicesButton.addEventListener('click', () => {
        //     windowsVoicesButton.classList.add('refreshing');
        //     // Não solicitar mais permissões de microfone
        //     this.forceWindowsVoicesDetection();
        //     setTimeout(() => {
        //         windowsVoicesButton.classList.remove('refreshing');
        //     }, 3000);
        // });

        // Botão específico para tentar detectar as vozes do Narrador (Antonio e Francisca)
        const narratorVoicesButton = document.createElement('button');
        narratorVoicesButton.className = 'narrator-voices-button';
        narratorVoicesButton.innerHTML = '<span class="narrator-icon">🎙️</span> Detectar Vozes do Narrador';
        narratorVoicesButton.title = 'Tenta detectar as vozes Antonio e Francisca do Narrador do Windows';
        narratorVoicesButton.addEventListener('click', () => {
            narratorVoicesButton.classList.add('refreshing');
            this.readingIndicator.textContent = 'Tentando acessar vozes do Narrador (Antonio e Francisca)...';
            this.readingIndicator.style.display = 'block';

            // Tentar métodos específicos para o narrador sem solicitar permissões de microfone
            this.tryAccessNarratorVoices();

            // Tentar várias vezes com intervalos diferentes
            setTimeout(() => this.tryAccessNarratorVoices(), 1000);
            setTimeout(() => this.tryAccessNarratorVoices(), 2000);

            setTimeout(() => {
                // Verificar se encontramos as vozes do narrador
                const hasAntonioVoice = this.voices.some(voice => voice.name.includes('Antonio'));
                const hasFranciscaVoice = this.voices.some(voice => voice.name.includes('Francisca'));

                if (hasAntonioVoice || hasFranciscaVoice) {
                    this.readingIndicator.textContent = `✅ Vozes do Narrador detectadas!`;
                    this.loadVoices(); // Recarregar a interface
                } else {
                    this.readingIndicator.textContent = '⚠️ Não foi possível detectar as vozes do Narrador.';
                }

                narratorVoicesButton.classList.remove('refreshing');

                setTimeout(() => {
                    this.readingIndicator.style.display = 'none';
                }, 3000);
            }, 3000);
        });

        // Adicionar elementos ao DOM
        this.voiceSelect.parentNode.insertBefore(panel, this.voiceSelect.nextSibling);
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'voice-buttons';
        // buttonContainer.appendChild(refreshButton);
        // buttonContainer.appendChild(windowsVoicesButton);
        panel.querySelector('.voice-info-content').appendChild(buttonContainer);

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
            
            .voice-buttons {
                display: flex;
                gap: 10px;
                margin-top: 10px;
            }
            
            .refresh-voices, .windows-voices-button {
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
                flex: 1;
            }
            
            .windows-voices-button {
                background: #0078d7; /* Cor do Windows */
            }
            
            .windows-voices-button:hover {
                background: #005a9e;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
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
            
            #voiceSelect option[data-local="true"] {
                background: rgba(52, 152, 219, 0.2);
                border-left: 3px solid var(--accent-color);
                font-weight: bold;
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
        console.log("Inicializando event listeners");

        // Toggle narration controls
        if (this.enableNarration) {
            this.enableNarration.addEventListener('change', () => {
                if (this.enableNarration.checked) {
                    this.narrationControls.classList.remove('disabled');
                } else {
                    this.narrationControls.classList.add('disabled');
                    this.stopNarration();
                }
            });
        } else {
            console.warn("Elemento enableNarration não encontrado");
        }

        // Voice selection
        if (this.voiceSelect) {
            this.voiceSelect.addEventListener('change', () => {
                const selectedIndex = this.voiceSelect.value;
                this.currentVoice = this.voices[selectedIndex];
                console.log("Voz alterada para:", this.currentVoice.name);
            });
        } else {
            console.warn("Elemento voiceSelect não encontrado");
        }

        // Pitch control
        if (this.pitchRange && this.pitchValue) {
            this.pitchRange.addEventListener('input', () => {
                this.pitch = parseFloat(this.pitchRange.value);
                this.pitchValue.textContent = this.pitch.toFixed(1);
            });
        } else {
            console.warn("Elementos de controle de pitch não encontrados");
        }

        // Rate control
        if (this.rateRange && this.rateValue) {
            this.rateRange.addEventListener('input', () => {
                this.rate = parseFloat(this.rateRange.value);
                this.rateValue.textContent = this.rate.toFixed(1);
            });
        } else {
            console.warn("Elementos de controle de rate não encontrados");
        }

        // Pause time
        if (this.pauseTimeInput) {
            this.pauseTimeInput.addEventListener('change', () => {
                this.pauseTime = parseInt(this.pauseTimeInput.value, 10);
            });
        } else {
            console.warn("Elemento pauseTimeInput não encontrado");
        }

        // Start/Stop narration
        if (this.startNarrationBtn) {
            this.startNarrationBtn.addEventListener('click', () => {
                if (this.isNarrating) {
                    console.log("Botão pressionado: Parar narração");
                    this.stopNarration();
                    document.dispatchEvent(new CustomEvent('narrationStopped'));
                } else {
                    console.log("Botão pressionado: Iniciar narração");
                    this.startNarration();
                    document.dispatchEvent(new CustomEvent('narrationStarted'));
                }
            });
        } else {
            console.warn("Elemento startNarrationBtn não encontrado");
        }

        // Verificar existência do botão pauseNarration e registrar listener
        const pauseNarrationBtn = document.getElementById('pauseNarration');
        if (pauseNarrationBtn) {
            console.log("Botão pauseNarration encontrado, registrando listener");
            pauseNarrationBtn.addEventListener('click', () => {
                this.togglePauseNarration();
            });
        }

        console.log("Event listeners inicializados com sucesso");
    }
    pauseNarration() {
        console.log("Tentando pausar narração...");

        // Verificar se a narração está em andamento e não está pausada
        if (this.isNarrating && this.synth) {
            if (this.synth.paused) {
                console.log("A narração já está pausada");
                return;
            }

            console.log("Pausando síntese de voz");

            // Pausar a síntese de voz
            try {
                this.synth.pause();
                console.log("Síntese de voz pausada com sucesso");

                // Atualizar o estado
                this.narrationState.isPaused = true;

                // Atualizar o botão de início/pausa de narração
                if (this.startNarrationBtn) {
                    this.startNarrationBtn.innerHTML = '<i class="fas fa-play"></i> Continuar Narração';
                    this.startNarrationBtn.classList.add('paused');
                }

                // Atualizar controles flutuantes
                const pausePlayBtn = document.querySelector('.narration-play-pause');
                if (pausePlayBtn) {
                    pausePlayBtn.classList.add('paused');
                    const icon = pausePlayBtn.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-pause');
                        icon.classList.add('fa-play');
                    }
                }

                // Atualizar indicador de leitura
                this.readingIndicator.textContent = 'Narração pausada';
                this.readingIndicator.style.display = 'block';

                // Pausar a barra de progresso, se existir
                if (window.narrationProgressBar) {
                    window.narrationProgressBar.pause();
                }

                // Pausar rastreador de narração de texto, se estiver ativo
                if (this.narrationTracker && this.narrationTracker.isActive) {
                    this.narrationTracker.pause();
                }

                // Disparar evento personalizado de narração pausada
                document.dispatchEvent(new CustomEvent('narrationPaused', {
                    detail: {
                        timestamp: Date.now(),
                        narrationId: this.narrationState.currentNarrationId
                    }
                }));

                console.log('Narração pausada com sucesso');
            } catch (e) {
                console.error("Erro ao pausar narração:", e);
            }
        } else {
            console.log("Não é possível pausar: narração não está ativa ou sintetizador não está disponível");
        }
    }


    resumeNarration() {
        console.log("Tentando retomar narração...");

        // Verificar se a narração está pausada
        if (this.isNarrating && this.synth) {
            if (!this.synth.paused) {
                console.log("A narração não está pausada");
                return;
            }

            console.log("Retomando síntese de voz");

            // Retomar a síntese de voz
            try {
                this.synth.resume();
                console.log("Síntese de voz retomada com sucesso");

                // Atualizar o estado
                this.narrationState.isPaused = false;

                // Atualizar o botão de início/pausa de narração
                if (this.startNarrationBtn) {
                    this.startNarrationBtn.innerHTML = '<i class="fas fa-stop"></i> Parar Narração';
                    this.startNarrationBtn.classList.remove('paused');
                }

                // Atualizar controles flutuantes
                const pausePlayBtn = document.querySelector('.narration-play-pause');
                if (pausePlayBtn) {
                    pausePlayBtn.classList.remove('paused');
                    const icon = pausePlayBtn.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-play');
                        icon.classList.add('fa-pause');
                    }
                }

                // Ocultar o indicador de leitura
                this.readingIndicator.style.display = 'none';

                // Retomar a barra de progresso, se existir
                if (window.narrationProgressBar) {
                    window.narrationProgressBar.resume();
                }

                // Retomar rastreador de narração de texto, se estiver ativo
                if (this.narrationTracker && this.narrationTracker.isActive) {
                    this.narrationTracker.resume();
                }

                // Disparar evento personalizado de narração retomada
                document.dispatchEvent(new CustomEvent('narrationResumed', {
                    detail: {
                        timestamp: Date.now(),
                        narrationId: this.narrationState.currentNarrationId
                    }
                }));

                console.log('Narração retomada com sucesso');
            } catch (e) {
                console.error("Erro ao retomar narração:", e);
            }
        } else {
            console.log("Não é possível retomar: narração não está ativa ou sintetizador não está disponível");
        }
    }

    togglePauseNarration() {
        console.log("Alternando estado de pausa da narração");

        if (this.synth && this.isNarrating) {
            if (this.synth.paused) {
                console.log("Narração está pausada, retomando...");
                this.resumeNarration();
            } else {
                console.log("Narração está ativa, pausando...");
                this.pauseNarration();
            }
        } else {
            console.log("Não é possível alternar estado: narração não está ativa ou sintetizador não está disponível");
        }
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

    /**
     * Prepara os textos extraídos pelo OCR para narração
     * @param {Object} rectangularSelectionManager - Instância do gerenciador de seleção retangular
     */
    prepareExtractedTextsForNarration(rectangularSelectionManager) {
        if (!rectangularSelectionManager || !rectangularSelectionManager.extractedTexts) {
            console.error('Gerenciador de seleção ou textos extraídos não disponíveis');
            return;
        }

        // Coletar todos os textos extraídos de todas as imagens
        let allTexts = [];

        // Ordenar as seleções por índice para garantir a ordem correta
        const orderedSelections = [...rectangularSelectionManager.selections].sort((a, b) => a.index - b.index);

        // Para cada seleção, obter o texto extraído correspondente
        orderedSelections.forEach(selection => {
            const imageId = selection.imageId;
            const selectionIndex = selection.index;

            if (imageId && rectangularSelectionManager.extractedTexts.has(imageId)) {
                const textsForImage = rectangularSelectionManager.extractedTexts.get(imageId);
                if (textsForImage && textsForImage[selectionIndex]) {
                    // Processar o texto para melhorar a narração
                    let processedText = textsForImage[selectionIndex];
                    if (rectangularSelectionManager.processTextForNarration) {
                        processedText = rectangularSelectionManager.processTextForNarration(processedText);
                    }
                    allTexts.push(processedText);
                }
            }
        });

        if (allTexts.length === 0) {
            this.readingIndicator.textContent = 'Nenhum texto extraído encontrado. Tente processar as seleções novamente.';
            this.readingIndicator.style.display = 'block';
            setTimeout(() => {
                this.readingIndicator.style.display = 'none';
            }, 3000);
            return;
        }

        console.log(`Narrando ${allTexts.length} textos extraídos`);

        // Criar um objeto com múltiplos textos para narração
        const multiText = {
            isMultiText: true,
            texts: allTexts
        };

        // Iniciar narração dos textos
        this.speakMultipleTexts(multiText);
    }

    /**
     * Narra múltiplos textos em sequência
     * @param {Object} multiText - Objeto contendo array de textos para narrar
     */
    async speakMultipleTexts(multiText) {
        if (!multiText || !multiText.isMultiText || !multiText.texts || multiText.texts.length === 0) {
            console.error('Formato de texto múltiplo inválido');
            return;
        }

        // Destacar a primeira seleção
        if (window.rectangularSelectionManager) {
            window.rectangularSelectionManager.highlightSelection(0);
        }

        // Filtrar textos para remover duplicados ou muito similares
        const uniqueTexts = this.filterDuplicateTexts(multiText.texts);
        console.log(`Filtrados ${multiText.texts.length - uniqueTexts.length} textos duplicados ou similares`);

        // Atualizar a barra de progresso com o total de itens
        if (window.narrationProgressBar) {
            window.narrationProgressBar.totalItems = uniqueTexts.length;
            window.narrationProgressBar.updateProgressBar();
        }
        console.log(`Filtrados ${multiText.texts.length - uniqueTexts.length} textos duplicados ou similares`);

        // Atualizar a barra de progresso com o total de itens
        if (window.narrationProgressBar) {
            window.narrationProgressBar.totalItems = uniqueTexts.length;
            window.narrationProgressBar.updateProgressBar();
        }

        // Narrar cada texto em sequência
        for (let i = 0; i < uniqueTexts.length; i++) {
            if (!this.isNarrating) break; // Verificar se a narração foi interrompida

            const text = uniqueTexts[i];

            // Verificar se esta seleção já foi processada nesta sessão
            if (this.narrationState.isSelectionMode && this.narrationState.lastProcessedSelection === i) {
                console.log(`Seleção ${i} já foi processada nesta sessão, avançando para a próxima`);
                continue;
            }

            // Registrar esta seleção como processada
            this.narrationState.lastProcessedSelection = i;

            // Destacar a seleção atual no gerenciador
            if (window.rectangularSelectionManager) {
                window.rectangularSelectionManager.highlightSelection(i);
            }

            // Atualizar a barra de progresso
            if (window.narrationProgressBar) {
                window.narrationProgressBar.setCurrentItemIndex(i);
                window.narrationProgressBar.setCurrentText(text);
                window.narrationProgressBar.updateProgressBar();
            }

            console.log(`Narrando texto ${i + 1} de ${uniqueTexts.length}: ${text.substring(0, 30)}...`);

            // Narrar o texto atual
            await this.speakText(text);

            // Esperar o tempo de pausa entre os textos, exceto após o último
            if (i < uniqueTexts.length - 1 && this.isNarrating) {
                await new Promise(resolve => setTimeout(resolve, this.pauseTime * 1000));
            }
        }

        // Após narrar todos os textos, aguardar o tempo de pausa
        if (this.isNarrating) {
            await new Promise(resolve => setTimeout(resolve, this.pauseTime * 1000));
        }
    }

    async startNarration() {
        if (!this.enableNarration.checked || this.isNarrating) return;

        // Limpar textos narrados anteriormente ao iniciar uma nova narração
        this.recentlyNarratedTexts = [];

        // Gerar um ID único para esta sessão de narração
        this.narrationState.currentNarrationId = Date.now();

        // Iniciar contagem regressiva antes de começar a narração
        const countdown = document.getElementById('countdown');
        countdown.style.display = 'block';

        for (let i = 5; i > 0; i--) {
            countdown.textContent = i;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        countdown.style.display = 'none';

        // Ativar o ScrollManager global para rolagem automática durante a narração
        if (window.scrollManager) {
            window.scrollManager.activate();
            window.scrollManagerActive = true;
            console.log('ScrollManager global ativado para narração');
        }

        // Verificar se o modo de seleção de texto em imagens está ativo
        const rectangularSelectionManager = window.rectangularSelectionManager;
        if (rectangularSelectionManager && rectangularSelectionManager.isSelectionModeActive) {
            // Se o modo de seleção estiver ativo, verificar se há seleções
            if (rectangularSelectionManager.selections && rectangularSelectionManager.selections.length > 0) {
                console.log('Modo de seleção de texto em imagens ativo. Lendo apenas o texto das seleções OCR.');

                // Atualizar o estado da narração
                this.narrationState.isSelectionMode = true;
                this.narrationState.isPageMode = false;
                this.narrationState.lastProcessedSelection = -1;

                this.isNarrating = true;
                this.startNarrationBtn.innerHTML = '<i class="fas fa-stop"></i> Parar Narração';
                this.startNarrationBtn.classList.add('active');

                // Disable other controls
                this.disableOtherControls(true);

                // Verificar se já existem textos extraídos para as seleções
                const hasExtractedTexts = rectangularSelectionManager.extractedTexts &&
                    rectangularSelectionManager.extractedTexts.size > 0;

                if (hasExtractedTexts) {
                    console.log('Textos já extraídos encontrados. Iniciando narração sem reprocessar OCR.');

                    // Preparar os textos extraídos para narração
                    this.prepareExtractedTextsForNarration(rectangularSelectionManager);
                } else {
                    console.log('Nenhum texto extraído encontrado. Processando seleções OCR primeiro.');
                    // Iniciar processamento das seleções apenas se não houver textos extraídos
                    rectangularSelectionManager.processSelections();
                }

                return; // Não continuar com a narração normal
            } else {
                // Se não houver seleções, mostrar mensagem
                this.readingIndicator.textContent = 'Não há seleções de texto para narrar. Faça seleções nas imagens primeiro.';
                this.readingIndicator.style.display = 'block';
                setTimeout(() => {
                    this.readingIndicator.style.display = 'none';
                }, 3000);
                return;
            }
        }

        // Comportamento normal quando o modo de seleção não está ativo
        // Get the images container element
        const imagesContainer = document.getElementById('imagesContainer');
        if (!imagesContainer) {
            console.error('Images container not found');
            return;
        }

        // Atualizar o estado da narração
        this.narrationState.isPageMode = true;
        this.narrationState.isSelectionMode = false;
        this.narrationState.lastProcessedPage = -1;

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
        console.log("Parando narração...");

        if (!this.isNarrating) {
            console.log("Não há narração ativa para parar");
            return;
        }

        this.isNarrating = false;
        this.isBuffering = false;

        // Cancel any ongoing speech
        if (this.synth) {
            console.log("Cancelando síntese de voz");
            this.synth.cancel();
        }

        // Clear any active intervals
        if (this.keepAliveInterval) {
            console.log("Limpando intervalos de verificação");
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }

        // Cancel any active audio elements from fallback
        if (this.fallbackAudio) {
            this.fallbackAudio.pause();
            this.fallbackAudio.src = '';
            this.fallbackAudio = null;
        }

        // Desativar o rastreador de narração se estiver ativo
        if (this.narrationTracker && this.narrationTracker.isActive) {
            console.log("Desativando rastreador de narração");
            this.narrationTracker.deactivate();
        }

        // Desativar o ScrollManager global se estiver disponível
        if (window.scrollManager) {
            window.scrollManager.deactivate();
            console.log('ScrollManager global desativado após fim da narração');
        }

        // Remover manipulador de teclas
        console.log("Removendo manipulador de teclas");
        document.removeEventListener('keydown', this.keydownHandler);

        // Resetar o estado da narração
        this.narrationState = {
            lastProcessedPage: -1,
            lastProcessedSelection: -1,
            isPageMode: false,
            isSelectionMode: false,
            currentNarrationId: null,
            isPaused: false
        };

        // Limpar textos narrados recentemente
        this.recentlyNarratedTexts = [];

        // Update UI
        this.startNarrationBtn.innerHTML = '<i class="fas fa-book-reader"></i> Iniciar Narração';
        this.startNarrationBtn.classList.remove('active');
        this.readingIndicator.style.display = 'none';

        // Clear buffer
        this.textBuffer = [];

        // Re-enable other controls
        this.disableOtherControls(false);

        // Remover controles flutuantes se existirem
        const floatingControls = document.querySelector('.floating-narration-controls');
        if (floatingControls) {
            floatingControls.remove();
        }

        // Disparar evento de parada de narração
        document.dispatchEvent(new CustomEvent('narrationStopped'));

        console.log('Narração completamente parada');
    }
    // Adicione este novo método à classe ComicNarrator
    createFloatingNarrationControls() {
        // Remover controles existentes para evitar duplicação
        const existingControls = document.querySelector('.floating-narration-controls');
        if (existingControls) {
            existingControls.remove();
        }

        // Criar container para controles flutuantes
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'floating-narration-controls';

        // Botão de pausa/play
        const pausePlayBtn = document.createElement('button');
        pausePlayBtn.className = 'narration-play-pause';
        pausePlayBtn.innerHTML = '<i class="fas fa-pause"></i>';
        pausePlayBtn.title = 'Pausar/Retomar narração (Espaço)';

        // Botão para parar narração
        const stopBtn = document.createElement('button');
        stopBtn.className = 'narration-stop';
        stopBtn.innerHTML = '<i class="fas fa-stop"></i>';
        stopBtn.title = 'Parar narração (Esc)';

        // Adicionar eventos aos botões
        pausePlayBtn.addEventListener('click', () => {
            this.togglePauseNarration();
            pausePlayBtn.classList.toggle('paused');

            // Atualizar ícone
            const icon = pausePlayBtn.querySelector('i');
            if (icon.classList.contains('fa-pause')) {
                icon.classList.remove('fa-pause');
                icon.classList.add('fa-play');
            } else {
                icon.classList.remove('fa-play');
                icon.classList.add('fa-pause');
            }
        });

        stopBtn.addEventListener('click', () => {
            this.stopNarration();
        });

        // Adicionar tecla de atalho para parar narração (Esc)
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isNarrating) {
                this.stopNarration();
            }
        });

        // Adicionar botões ao container
        controlsContainer.appendChild(pausePlayBtn);
        controlsContainer.appendChild(stopBtn);

        // Adicionar estilos para os controles flutuantes
        const style = document.createElement('style');
        style.textContent = `
        .floating-narration-controls {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(30, 30, 30, 0.9);
            border-radius: 8px;
            padding: 10px;
            display: flex;
            gap: 10px;
            z-index: 9999;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(52, 152, 219, 0.5);
        }
        
        .floating-narration-controls button {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            background: var(--accent-color, #3498db);
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }
        
        .floating-narration-controls button:hover {
            transform: scale(1.1);
            background: #2980b9;
        }
        
        .narration-play-pause.paused {
            background: #27ae60 !important;
        }
        
        .narration-stop {
            background: #e74c3c !important;
        }
        
        .narration-stop:hover {
            background: #c0392b !important;
        }
    `;

        document.head.appendChild(style);
        document.body.appendChild(controlsContainer);
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
                let textContent = '';

                // Extract text based on content type
                if (page.tagName === 'IMG' || page.dataset.type === 'image') {
                    textContent = await this.extractTextFromImage(page);
                } else if (page.classList.contains('pdf-page') || page.dataset.type === 'pdf') {
                    textContent = await this.extractTextFromPdfPage(page);
                } else if (page.classList.contains('epub-page') || page.dataset.type === 'epub') {
                    textContent = await this.extractTextFromEpubPage(page);
                } else {
                    // Try to determine the type from child elements
                    const img = page.querySelector('img');
                    if (img) {
                        textContent = await this.extractTextFromImage(img);
                    } else {
                        // Default fallback - try to get any text content
                        textContent = page.textContent || 'Não foi possível determinar o tipo de conteúdo.';
                    }
                }

                // Add to buffer
                this.textBuffer.push(textContent);

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

        // Verificar se esta página já foi processada nesta sessão de narração
        if (this.narrationState.lastProcessedPage === this.currentPage) {
            console.log(`Página ${this.currentPage} já foi processada nesta sessão, avançando para a próxima`);
            this.currentPage++;
            if (this.currentPage >= this.pages.length) {
                this.stopNarration();
                return;
            }
        }

        // Registrar esta página como processada
        this.narrationState.lastProcessedPage = this.currentPage;

        const page = this.pages[this.currentPage];

        // Scroll to the current page
        page.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Não exibir mensagem de status durante a narração normal
        this.readingIndicator.style.display = 'none';

        // Atualizar a barra de progresso com o índice atual
        if (window.narrationProgressBar) {
            window.narrationProgressBar.setCurrentItemIndex(this.currentPage);
            window.narrationProgressBar.updateProgressBar();
        }

        try {
            let textContent = '';

            // Check if we have this page in the buffer
            if (this.textBuffer.length > 0) {
                // Use the first item in the buffer
                textContent = this.textBuffer.shift();

                // Trigger buffering of more pages
                this.bufferNextPages();
            } else {
                // No buffered text, extract directly
                if (page.tagName === 'IMG' || page.dataset.type === 'image') {
                    textContent = await this.extractTextFromImage(page);
                } else if (page.classList.contains('pdf-page') || page.dataset.type === 'pdf') {
                    textContent = await this.extractTextFromPdfPage(page);
                } else if (page.classList.contains('epub-page') || page.dataset.type === 'epub') {
                    textContent = await this.extractTextFromEpubPage(page);
                } else {
                    // Try to determine the type from child elements
                    const img = page.querySelector('img');
                    if (img) {
                        textContent = await this.extractTextFromImage(img);
                    } else {
                        // Default fallback - try to get any text content
                        textContent = page.textContent || 'Não foi possível determinar o tipo de conteúdo.';
                    }
                }

                // Start buffering next pages if not already buffering
                if (!this.isBuffering) {
                    this.startBuffering();
                }
            }

            // Verificar se temos múltiplos textos do OCR para narrar
            if (textContent && typeof textContent === 'object' && textContent.isMultiText) {
                // Vamos narrar cada texto individualmente
                for (let i = 0; i < textContent.texts.length; i++) {
                    if (!this.isNarrating) break; // Verificar se a narração foi interrompida

                    const text = textContent.texts[i];

                    // Destacar a seleção atual no gerenciador
                    if (window.rectangularSelectionManager) {
                        window.rectangularSelectionManager.highlightSelection(i);
                    }

                    // Atualizar a barra de progresso com o texto atual
                    if (window.narrationProgressBar) {
                        window.narrationProgressBar.setCurrentText(text);
                    }

                    console.log(`Narrando texto ${i + 1} de ${textContent.texts.length}: ${text.substring(0, 30)}...`);

                    // Narrar o texto atual
                    await this.speakText(text);

                    // Esperar o tempo de pausa entre os textos, exceto após o último
                    if (i < textContent.texts.length - 1 && this.isNarrating) {
                        await new Promise(resolve => setTimeout(resolve, this.pauseTime * 1000));
                    }
                }

                // Após narrar todos os textos, aguardar o tempo de pausa e ir para a próxima página
                if (this.isNarrating) {
                    await new Promise(resolve => setTimeout(resolve, this.pauseTime * 1000));
                    this.currentPage++;
                    this.readNextPage();
                }
            } else {
                // Caso padrão: texto único
                const text = typeof textContent === 'string' ? textContent :
                    (textContent ? JSON.stringify(textContent) : 'Não foi possível extrair texto.');

                // Verificar se há texto para narrar
                if (!text || text.trim() === '') {
                    console.log('Texto vazio, pulando para próxima página');
                    this.currentPage++;
                    this.readNextPage();
                    return;
                }

                // Atualizar a barra de progresso com o texto atual
                if (window.narrationProgressBar) {
                    window.narrationProgressBar.setCurrentText(text);
                }

                // Narrar o texto e continuar para a próxima página
                await this.speakText(text);

                // Wait for the specified pause time
                if (this.isNarrating) {
                    await new Promise(resolve => setTimeout(resolve, this.pauseTime * 1000));
                }

                // Move to the next page
                this.currentPage++;

                // Continue reading if still narrating
                if (this.isNarrating) {
                    this.readNextPage();
                }
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
        // Só exibir o indicador se não estiver em processo de narração normal
        if (!this.isNarrating) {
            this.readingIndicator.textContent = 'Extraindo texto da imagem...';
            this.readingIndicator.style.display = 'block';
        }

        try {
            // Verificar se o OCR está ativado e se existem seleções retangulares para esta imagem
            const ocrEnabled = document.getElementById('enableOCR') && document.getElementById('enableOCR').checked;

            if (ocrEnabled && window.rectangularSelectionManager) {
                // Buscar textos já extraídos para esta imagem
                const extractedTexts = window.rectangularSelectionManager.getExtractedTextsForImage(imgElement);

                if (extractedTexts && extractedTexts.length > 0) {
                    console.log(`Encontrados ${extractedTexts.length} textos extraídos para narração.`);

                    // Retornar os textos separados para processamento individual
                    this.isProcessing = false;

                    // Indicar que existem múltiplos textos para narrar com um prefixo especial
                    return {
                        isMultiText: true,
                        texts: extractedTexts.map((text, index) => {
                            // Processar cada texto individualmente
                            if (window.rectangularSelectionManager.processTextForNarration) {
                                return window.rectangularSelectionManager.processTextForNarration(text);
                            } else {
                                return text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                            }
                        })
                    };
                }
            }

            // Se não houver OCR ativado ou não houver seleções, usar o método padrão
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
                        if (m.status === 'recognizing text' && !this.isNarrating) {
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
        // Só exibir o indicador se não estiver em processo de narração normal
        if (!this.isNarrating) {
            this.readingIndicator.textContent = 'Extraindo texto do PDF...';
            this.readingIndicator.style.display = 'block';
        }

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
                        if (m.status === 'recognizing text' && !this.isNarrating) {
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
        // Só exibir o indicador se não estiver em processo de narração normal
        if (!this.isNarrating) {
            this.readingIndicator.textContent = 'Extraindo texto do EPUB...';
            this.readingIndicator.style.display = 'block';
        }

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

    isElementInViewport(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Definir limites da área "segura" da viewport (20% a 80% da altura)
        const minVisibleY = viewportHeight * 0.2;
        const maxVisibleY = viewportHeight * 0.8;
        
        // Verificar se o elemento está dentro da área "segura"
        const elementCenter = rect.top + (rect.height / 2);
        const isInSafeArea = elementCenter >= minVisibleY && elementCenter <= maxVisibleY;
        
        console.log(">>> 2: Verificando visibilidade do elemento:", {
            elementCenter,
            minVisibleY,
            maxVisibleY,
            isInSafeArea
        });
        
        return isInSafeArea;
    }

    async scrollToElement(element) {
        return new Promise((resolve) => {
            if (!element) {
                resolve();
                return;
            }

            const rect = element.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const targetY = window.pageYOffset + rect.top - (viewportHeight * 0.4); // Posicionar em 40% da viewport

            console.log(">>> 3: Iniciando rolagem para o elemento");

            window.scrollTo({
                top: targetY,
                behavior: 'smooth'
            });

            // Aguardar a rolagem terminar
            const checkScroll = setInterval(() => {
                if (this.isElementInViewport(element)) {
                    clearInterval(checkScroll);
                    resolve();
                }
            }, 100);

            // Timeout de segurança após 2 segundos
            setTimeout(() => {
                clearInterval(checkScroll);
                resolve();
            }, 2000);
        });
    }

    async speakText(text) {
        return new Promise((resolve, reject) => {
            if (!this.isNarrating) {
                console.log("Narração não está ativa, abortando speakText");
                resolve();
                return;
            }

            if (!text || text.trim() === '') {
                console.log("Texto vazio, abortando speakText");
                resolve();
                return;
            }

            // Verificar se o elemento atual está visível na viewport
            if (this.currentElement && !this.isElementInViewport(this.currentElement)) {
                console.log(">>> 1: Elemento não está visível na viewport, ativando auto-scroll");
                // Aguardar a rolagem terminar antes de continuar com a narração
                this.scrollToElement(this.currentElement).then(() => {
                    // Aumentar a pausa entre trechos para dar tempo de ler
                    setTimeout(() => {
                        this.continueWithNarration(text, resolve, reject);
                    }, this.pauseTime * 1000);
                });
                return;
            }

            // Se o elemento já estiver visível, continuar com a narração normalmente
            this.continueWithNarration(text, resolve, reject);
        });
    }

    // Método para continuar com a narração após verificar a visibilidade
    continueWithNarration(text, resolve, reject) {
        // Processar o texto para melhorar a qualidade da narração
        const processedText = this.processTextForNarration(text);
        console.log(">>> 4: Iniciando narração com texto processado:", processedText.substring(0, 50) + "...");

        // Verificar se este texto já foi narrado recentemente (evitar repetições)
            if (this.hasTextBeenNarratedRecently(processedText)) {
                console.log('Texto já narrado recentemente, pulando para evitar repetição:', processedText.substring(0, 30) + '...');
                resolve();
                return;
            }

            // Registrar este texto como narrado recentemente
            this.addToNarratedTexts(processedText);

            // Create a new utterance
            const utterance = new SpeechSynthesisUtterance(processedText);
            console.log("Utterance criado com sucesso");

            // Set voice and other properties
            if (this.currentVoice) {
                utterance.voice = this.currentVoice;
                console.log("Usando voz:", this.currentVoice.name);
            } else {
                console.warn("Nenhuma voz atual definida!");
            }

            utterance.pitch = this.pitch;
            utterance.rate = this.rate;
            utterance.lang = this.currentVoice ? this.currentVoice.lang : 'pt-BR';
            utterance.volume = 1; // Garantir volume máximo

            // Set up event handlers
            utterance.onstart = () => {
                console.log('Narração iniciada');
                // Disparar evento para pausar a rolagem automática quando a narração começar
                document.dispatchEvent(new CustomEvent('textNarrationStarted'));
            };

            utterance.onend = () => {
                console.log('Narração finalizada');
                // Disparar evento para retomar a rolagem automática quando a narração terminar
                document.dispatchEvent(new CustomEvent('textNarrationEnded'));
                resolve();
            };

            utterance.onerror = (event) => {
                console.error('Erro na síntese de voz:', event);
                // Garantir que a rolagem seja retomada mesmo em caso de erro
                document.dispatchEvent(new CustomEvent('textNarrationEnded'));
                reject(new Error(`Erro na síntese de voz: ${event.error}`));
            };

            // Verificar se estamos em um arquivo de texto para ativar o destaque
            const isTextFile = this.isTextFile();

            // Se for um arquivo de texto, ativar o rastreador de narração
            if (isTextFile) {
                // Inicializar o rastreador de narração se ainda não existe
                if (!this.narrationTracker) {
                    this.narrationTracker = new TextNarrationTracker();
                }

                // Encontrar o elemento de texto atual
                const textElement = this.findTextElement();

                if (textElement) {
                    // Ativar o rastreador
                    this.narrationTracker.activate(textElement);

                    // Garantir que o ScrollManager global também esteja ativado
                    if (window.scrollManager) {
                        window.scrollManager.activate();
                        console.log('ScrollManager global ativado para acompanhar a narração');
                    }

                    // Configurar evento onboundary ANTES de iniciar a narração com destaque
                    utterance.onboundary = (event) => {
                        if (event.name === 'word') {
                            // Atualizar o ScrollManager global para manter o texto visível
                            if (window.scrollManager && this.narrationTracker.highlightedElement) {
                                window.scrollManager.setCurrentElement(this.narrationTracker.highlightedElement);
                            }
                        }
                    };

                    // Iniciar narração com destaque
                    this.narrationTracker.startNarration(text, utterance);
                }
            }

            // Verificar se a síntese de voz está disponível
            if (!this.synth) {
                console.error("O objeto de síntese de voz não está disponível!");
                reject(new Error("Síntese de voz não disponível"));
                return;
            }

            // Garantir que o sintetizador esteja ativo
            if (this.synth.paused) {
                console.log("Sintetizador estava pausado, retomando...");
                this.synth.resume();
            }

            // Iniciar a narração
            console.log("Inciando narração via speechSynthesis.speak");
            try {
                this.synth.speak(utterance);

                // Verificação para garantir que a narração começou
                setTimeout(() => {
                    if (!this.synth.speaking && !this.synth.pending) {
                        console.warn("A narração não iniciou corretamente, tentando novamente...");
                        this.synth.cancel(); // Limpar qualquer estado inconsistente
                        this.synth.speak(utterance);
                    }
                }, 250);

                // Keep the speech synthesis active
                this.keepSpeechSynthesisActive();
            } catch (e) {
                console.error("Erro ao iniciar narração:", e);
                reject(e);
            }
        };
    


    // Verifica se um elemento está visível na viewport
    isElementInViewport(element) {
        if (!element) return false;

        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;

        // Elemento está parcialmente visível na viewport
        return (
            rect.top <= windowHeight * 0.8 && // 80% da altura da viewport
            rect.bottom >= windowHeight * 0.2  // 20% da altura da viewport
        );
    }

    // Rola a página até que o elemento esteja no centro da viewport
    scrollToElement(element) {
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const targetScroll = window.scrollY + rect.top - (windowHeight / 2);

        console.log(">>> 2: Rolando para posicionar elemento no centro da viewport");

        window.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
        });

        // Aguarda a rolagem terminar antes de continuar
        return new Promise(resolve => {
            const checkScroll = setInterval(() => {
                const currentRect = element.getBoundingClientRect();
                if (this.isElementInViewport(element)) {
                    console.log(">>> 3: Elemento agora está visível na viewport");
                    clearInterval(checkScroll);
                    resolve();
                }
            }, 100);

            // Timeout de segurança após 5 segundos
            setTimeout(() => {
                clearInterval(checkScroll);
                resolve();
            }, 5000);
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

            // Adicionando uma verificação para não retomar a narração se foi pausada manualmente
            // Verificamos se algum dos botões de pausa está no estado pausado
            const mainPauseButton = document.querySelector('.narration-play-pause');
            const viewerPauseButton = document.getElementById('pauseNarration');

            // Verificamos se o botão principal está com a classe 'paused' ou se o botão do visualizador
            // está mostrando o ícone de play (o que indica que está pausado)
            const mainButtonPaused = mainPauseButton && mainPauseButton.classList.contains('paused');
            const viewerButtonPaused = viewerPauseButton && viewerPauseButton.innerHTML.includes('fa-play');

            // Se qualquer um dos botões indicar que a narração foi pausada manualmente
            const manuallyPaused = mainButtonPaused || viewerButtonPaused;

            // Se estiver pausado mas NÃO foi pausado manualmente, então retoma
            if (this.synth.paused && !manuallyPaused) {
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

    /**
     * Processa o texto para melhorar a qualidade da narração
     * @param {string} text - Texto original a ser processado
     * @returns {string} - Texto processado
     */
    processTextForNarration(text) {
        if (!text || typeof text !== 'string') return text;

        // Remover espaços extras e quebras de linha desnecessárias
        let processed = text.replace(/\s+/g, ' ').trim();

        // Remover caracteres especiais que podem atrapalhar a narração
        processed = processed.replace(/[\*\|\~\`\#\_\{\}\<\>]/g, '');

        // Normalizar pontuação para melhorar as pausas na narração
        processed = processed.replace(/\.{2,}/g, '.'); // Substituir múltiplos pontos por um único
        processed = processed.replace(/\,{2,}/g, ','); // Substituir múltiplas vírgulas por uma única

        // Adicionar espaço após pontuação se não houver
        processed = processed.replace(/([.!?;:,])([^\s])/g, '$1 $2');

        // Remover caracteres não imprimíveis
        processed = processed.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

        return processed;
    }

    /**
     * Verifica se um texto já foi narrado recentemente
     * @param {string} text - Texto a verificar
     * @returns {boolean} - Verdadeiro se o texto já foi narrado recentemente
     */
    hasTextBeenNarratedRecently(text) {
        if (!text || text.trim().length < 10) return false;

        // Verificar se o texto exato já existe na lista
        if (this.recentlyNarratedTexts.includes(text)) {
            return true;
        }

        // Verificar similaridade com textos recentes
        for (const recentText of this.recentlyNarratedTexts) {
            if (this.calculateTextSimilarity(text, recentText) > this.textSimilarityThreshold) {
                return true;
            }
        }

        return false;
    }

    /**
     * Adiciona um texto à lista de textos narrados recentemente
     * @param {string} text - Texto a adicionar
     */
    addToNarratedTexts(text) {
        if (!text || text.trim().length < 10) return;

        // Adicionar o texto à lista
        this.recentlyNarratedTexts.push(text);

        // Limitar o tamanho da lista
        if (this.recentlyNarratedTexts.length > this.maxRecentTexts) {
            this.recentlyNarratedTexts.shift(); // Remover o texto mais antigo
        }
    }

    /**
     * Calcula a similaridade entre dois textos (0-1)
     * @param {string} text1 - Primeiro texto
     * @param {string} text2 - Segundo texto
     * @returns {number} - Valor de similaridade entre 0 e 1
     */
    calculateTextSimilarity(text1, text2) {
        if (!text1 || !text2) return 0;

        // Normalizar os textos para comparação
        const normalizedText1 = text1.toLowerCase().trim();
        const normalizedText2 = text2.toLowerCase().trim();

        // Se os textos são idênticos após normalização
        if (normalizedText1 === normalizedText2) return 1;

        // Se um texto está contido no outro
        if (normalizedText1.includes(normalizedText2) || normalizedText2.includes(normalizedText1)) {
            const ratio = Math.min(normalizedText1.length, normalizedText2.length) /
                Math.max(normalizedText1.length, normalizedText2.length);
            return 0.8 + (ratio * 0.2); // Valor entre 0.8 e 1.0 dependendo da proporção de tamanho
        }

        // Método simples de similaridade baseado em palavras comuns
        const words1 = normalizedText1.split(/\s+/);
        const words2 = normalizedText2.split(/\s+/);

        // Contar palavras comuns
        let commonWords = 0;
        for (const word of words1) {
            if (word.length > 3 && words2.includes(word)) { // Ignorar palavras muito curtas
                commonWords++;
            }
        }

        // Calcular similaridade baseada em palavras comuns
        const totalUniqueWords = new Set([...words1, ...words2]).size;
        return totalUniqueWords > 0 ? commonWords / totalUniqueWords : 0;
    }

    /**
     * Filtra textos duplicados ou muito similares de um array
     * @param {Array<string>} texts - Array de textos a filtrar
     * @returns {Array<string>} - Array de textos únicos
     */
    filterDuplicateTexts(texts) {
        if (!texts || !Array.isArray(texts)) return texts;

        const uniqueTexts = [];

        for (const text of texts) {
            // Processar o texto para melhorar a qualidade
            const processedText = this.processTextForNarration(text);

            // Verificar se é um texto válido
            if (!processedText || processedText.trim().length < 5) continue;

            // Verificar se já temos um texto similar
            let isDuplicate = false;
            for (const uniqueText of uniqueTexts) {
                if (this.calculateTextSimilarity(processedText, uniqueText) > this.textSimilarityThreshold) {
                    isDuplicate = true;
                    break;
                }
            }

            // Adicionar apenas se não for duplicado
            if (!isDuplicate) {
                uniqueTexts.push(processedText);
            }
        }

        return uniqueTexts;
    }


    /**
     * Verifica se o conteúdo atual é um arquivo de texto
     * @returns {boolean} - Verdadeiro se for um arquivo de texto
     */
    isTextFile() {
        const imagesContainer = document.getElementById('imagesContainer');
        if (!imagesContainer) return false;

        // Verificar se há um elemento txt-container
        return !!imagesContainer.querySelector('.txt-container');
    }


    /**
     * Encontra o elemento de texto atual
     * @returns {HTMLElement|null} - Elemento de texto ou null se não encontrado
     */
    findTextElement() {
        const imagesContainer = document.getElementById('imagesContainer');
        if (!imagesContainer) return null;

        // Encontrar o container de texto
        const txtContainer = imagesContainer.querySelector('.txt-container');
        if (!txtContainer) return null;

        // Encontrar o elemento de conteúdo de texto
        return txtContainer.querySelector('.txt-content');
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