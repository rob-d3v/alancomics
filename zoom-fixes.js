function showZoomIndicator(x, y) {
    const oldIndicator = document.getElementById('zoomIndicator');
    if (oldIndicator) {
        oldIndicator.remove();
    }
    
    const indicator = document.createElement('div');
    indicator.id = 'zoomIndicator';
    indicator.style.position = 'absolute';
    indicator.style.left = `${x - 20}px`;
    indicator.style.top = `${y - 20}px`;
    indicator.style.width = '40px';
    indicator.style.height = '40px';
    indicator.style.borderRadius = '12px';
    indicator.style.border = '2px solid var(--primary-color)';
    indicator.style.boxShadow = '0 0 10px rgba(var(--primary-color-rgb), 0.3)';
    indicator.style.backgroundColor = 'rgba(var(--primary-color-rgb), 0.15)';
    indicator.style.backdropFilter = 'blur(4px)';
    indicator.style.pointerEvents = 'none';
    indicator.style.zIndex = '1000';
    indicator.style.animation = 'alanComicsZoomIndicator 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards';
    
    // Update animation style
    if (!document.getElementById('zoomIndicatorStyle')) {
        const style = document.createElement('style');
        style.id = 'zoomIndicatorStyle';
        style.textContent = `
            @keyframes alanComicsZoomIndicator {
                0% { 
                    transform: scale(0.8) rotate(-5deg); 
                    opacity: 0.8;
                    border-radius: 12px;
                }
                50% {
                    border-radius: 50%;
                }
                100% { 
                    transform: scale(1.8) rotate(0deg); 
                    opacity: 0;
                    border-radius: 8px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(indicator);
    
    setTimeout(() => {
        indicator.remove();
    }, 600);
}