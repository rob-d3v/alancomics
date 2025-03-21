// diagnostico.js - Ferramentas para diagnosticar e resolver problemas de rolagem

// Adicionar ao site para diagnóstico avançado de problemas
function addDiagnosticTools() {
    // Criar elemento para exibir informações de depuração
    const debugElement = document.createElement('div');
    debugElement.id = 'scrollDebugInfo';
    debugElement.style.position = 'fixed';
    debugElement.style.bottom = '10px';
    debugElement.style.right = '10px';
    debugElement.style.backgroundColor = 'rgba(0,0,0,0.8)';
    debugElement.style.color = 'white';
    debugElement.style.padding = '10px';
    debugElement.style.borderRadius = '5px';
    debugElement.style.fontFamily = 'monospace';
    debugElement.style.fontSize = '12px';
    debugElement.style.zIndex = '10000';
    debugElement.style.maxWidth = '300px';
    debugElement.style.maxHeight = '200px';
    debugElement.style.overflow = 'auto';
    debugElement.style.opacity = '0.7';
    debugElement.style.display = 'none';
    document.body.appendChild(debugElement);
    
    // Adicionar botão para forçar rolagem mesmo se detectar fim prematuro
    const forceContinueBtn = document.createElement('button');
    forceContinueBtn.textContent = 'Forçar Continuação';
    forceContinueBtn.style.display = 'block';
    forceContinueBtn.style.margin = '5px 0';
    forceContinueBtn.style.padding = '5px';
    forceContinueBtn.style.backgroundColor = '#e63946';
    forceContinueBtn.style.color = 'white';
    forceContinueBtn.style.border = 'none';
    forceContinueBtn.style.borderRadius = '3px';
    forceContinueBtn.style.cursor = 'pointer';
    
    forceContinueBtn.onclick = function() {
        forceScrollContinuation();
    };
    
    debugElement.appendChild(forceContinueBtn);
    
    // Adicionar botão para redefinir estado
    const resetStateBtn = document.createElement('button');
    resetStateBtn.textContent = 'Reset Estado';
    resetStateBtn.style.display = 'block';
    resetStateBtn.style.margin = '5px 0';
    resetStateBtn.style.padding = '5px';
    resetStateBtn.style.backgroundColor = '#4a6cf7';
    resetStateBtn.style.color = 'white';
    resetStateBtn.style.border = 'none';
    resetStateBtn.style.borderRadius = '3px';
    resetStateBtn.style.cursor = 'pointer';
    
    resetStateBtn.onclick = function() {
        resetScrollState();
    };
    
    debugElement.appendChild(resetStateBtn);
    
    // Adicionar listener para Alt+S para mostrar/esconder informações
    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.key === 's') {
            if (debugElement.style.display === 'none') {
                debugElement.style.display = 'block';
                window.scrollDebug = true;
                updateDebugInfo();
            } else {
                debugElement.style.display = 'none';
                window.scrollDebug = false;
            }
        }
    });
    
    // Função para forçar continuação da rolagem
    window.forceScrollContinuation = function() {
        // Reiniciar a rolagem ignorando os limites
        window.ignoreScrollLimits = true;
        
        // Parar rolagem atual
        if (window.stopScrolling) window.stopScrolling();
        
        // Atualizar status
        updateDebugInfo("Forçando continuação da rolagem...");
        
        // Reiniciar rolagem com uma pequena margem
        if (window.scrollPosition !== undefined) {
            window.scrollPosition += 5;
        }
        
        // Iniciar rolagem novamente
        setTimeout(() => {
            if (window.startScrolling) window.startScrolling();
            
            // Desativar a flag de ignorar limites após um período
            setTimeout(() => {
                window.ignoreScrollLimits = false;
            }, 5000);
        }, 100);
    };
    
    // Função para resetar estado de rolagem
    window.resetScrollState = function() {
        // Parar rolagem atual
        if (window.stopScrolling) window.stopScrolling();
        
        // Resetar valores
        window.scrollPosition = 0;
        window.autoScrolling = false;
        
        // Recarregar elementos e centralizar
        if (window.adjustImageContainer) window.adjustImageContainer();
        if (window.centerImages) window.centerImages();
        
        updateDebugInfo("Estado resetado");
    };
    
    // Função para atualizar informações de depuração
    function updateDebugInfo(message) {
        if (!window.scrollDebug) return;
        
        const debugInfo = document.getElementById('scrollDebugInfo');
        if (!debugInfo) return;
        
        // Informações gerais
        let infoHTML = `
            <div>Rolagem: ${window.autoScrolling ? 'Ativa' : 'Inativa'}</div>
            <div>Posição: ${window.scrollPosition?.toFixed(2) || 'N/A'}</div>
            <div>Zoom: ${window.currentZoom?.toFixed(2) || 'N/A'}</div>
            <div>Espaçamento: ${window.imageSpacing || 'N/A'}px</div>
            <div>Direção: ${window.isVertical ? 'Vertical' : 'Horizontal'}</div>
            <div>Imagens: ${window.images?.length || 'N/A'}</div>
        `;
        
        // Adicionar mensagem se existir
        if (message) {
            infoHTML = `<div style="color:#ff9f1c;font-weight:bold;">${message}</div>` + infoHTML;
        }
        
        // Elementos existentes no HTML
        const priorButtons = Array.from(debugInfo.querySelectorAll('button'));
        debugInfo.innerHTML = infoHTML;
        
        // Readicionar botões
        priorButtons.forEach(button => {
            debugInfo.appendChild(button);
        });
    }
    
    // Atualizar status periodicamente
    setInterval(updateDebugInfo, 500);
    
    // Sobreescrever função de verificação de limites para integrar com diagnóstico
    const origCheckScrollLimits = window.checkScrollLimits;
    if (origCheckScrollLimits) {
        window.checkScrollLimits = function() {
            // Se estamos forçando a rolagem, ignorar limites
            if (window.ignoreScrollLimits) {
                return false;
            }
            
            const result = origCheckScrollLimits();
            
            if (result && window.scrollDebug) {
                updateDebugInfo("Limite de rolagem atingido!");
            }
            
            return result;
        };
    }
    
    console.log("Ferramentas de diagnóstico instaladas. Pressione Alt+S para exibir.");
}

// Inicializar ferramentas
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addDiagnosticTools);
} else {
    addDiagnosticTools();
}