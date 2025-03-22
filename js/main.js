document.addEventListener('DOMContentLoaded', async () => {
    const comicsDB = new ComicsDB();
    await comicsDB.init();
    
    const viewer = new ComicsViewer();
    const sidebar = new Sidebar(comicsDB, viewer);

    // Initialize theme selector
    const themeSelect = document.getElementById('themeSelect');
    themeSelect.addEventListener('change', (e) => {
        document.body.className = `theme-${e.target.value}`;
    });

    // Set default theme
    document.body.className = 'theme-default';
});