class ThemeManager {
    constructor() {
        this.themeSelect = document.getElementById('themeSelect');
        this.initializeThemes();
    }

    initializeThemes() {
        this.themeSelect.addEventListener('change', (e) => {
            this.setTheme(e.target.value);
        });
    }

    setTheme(themeName) {
        document.body.className = `theme-${themeName}`;
        localStorage.setItem('selectedTheme', themeName);
    }

    loadSavedTheme() {
        const savedTheme = localStorage.getItem('selectedTheme') || 'default';
        this.setTheme(savedTheme);
        this.themeSelect.value = savedTheme;
    }
}