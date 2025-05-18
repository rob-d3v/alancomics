document.addEventListener('DOMContentLoaded', async () => {
    try {
        const db = new ComicsDB();
        await db.initialize();
        
        const viewer = new ComicsViewer();
        // Expor o visualizador globalmente para outros módulos
        window.comicsViewer = viewer;
        
        const sidebar = new Sidebar(db, viewer);
        const themeManager = new ThemeManager();
        
        themeManager.loadSavedTheme();
    } catch (error) {
        console.error('Initialization error:', error);
    }
});