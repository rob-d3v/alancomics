function showZoomIndicator(x, y) {
    const oldIndicator = document.getElementById('zoomIndicator');
    if (oldIndicator) {
        oldIndicator.remove();
    }
    
    const indicator = document.createElement('div');
    indicator.id = 'zoomIndicator';
    indicator.style.position = 'absolute';
    indicator.style.left = `${x - 25}px`;
    indicator.style.top = `${y - 25}px`;
    indicator.style.width = '50px';
    indicator.style.height = '50px';
    indicator.style.borderRadius = '16px';
    indicator.style.border = '2px solid var(--accent-color, var(--primary-color))';
    indicator.style.boxShadow = `
        0 0 15px rgba(var(--primary-color-rgb), 0.2),
        inset 0 0 8px rgba(var(--accent-color-rgb, var(--primary-color-rgb)), 0.1)
    `;
    indicator.style.backgroundColor = 'rgba(var(--background-color-rgb), 0.1)';
    indicator.style.backdropFilter = 'blur(8px) saturate(180%)';
    indicator.style.pointerEvents = 'none';
    indicator.style.zIndex = '1000';
    indicator.style.animation = 'alanComicsZoomIndicator 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
    
    if (!document.getElementById('zoomIndicatorStyle')) {
        const style = document.createElement('style');
        style.id = 'zoomIndicatorStyle';
        style.textContent = `
            @keyframes alanComicsZoomIndicator {
                0% { 
                    transform: scale(0.8) rotate(-8deg); 
                    opacity: 0.9;
                    border-radius: 16px;
                    filter: hue-rotate(0deg);
                }
                30% {
                    border-radius: 50%;
                    filter: hue-rotate(90deg);
                }
                60% {
                    border-radius: 12px;
                    filter: hue-rotate(180deg);
                }
                100% { 
                    transform: scale(2.2) rotate(0deg); 
                    opacity: 0;
                    border-radius: 24px;
                    filter: hue-rotate(360deg);
                }
            }
            
            @keyframes pulseGlow {
                0%, 100% { box-shadow: 0 0 15px rgba(var(--primary-color-rgb), 0.2); }
                50% { box-shadow: 0 0 25px rgba(var(--accent-color-rgb, var(--primary-color-rgb)), 0.3); }
            }
            
            #zoomIndicator::before {
                content: '';
                position: absolute;
                inset: -4px;
                border-radius: inherit;
                border: 2px solid transparent;
                background: linear-gradient(45deg, 
                    var(--accent-color, var(--primary-color)),
                    transparent,
                    var(--accent-color, var(--primary-color))
                ) border-box;
                -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
                mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
                -webkit-mask-composite: destination-out;
                mask-composite: exclude;
                opacity: 0.5;
                animation: rotateGradient 2s linear infinite;
            }
            
            @keyframes rotateGradient {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(indicator);
    
    setTimeout(() => {
        indicator.remove();
    }, 700);
}