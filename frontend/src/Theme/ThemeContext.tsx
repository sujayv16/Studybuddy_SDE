import React, { createContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  fontSize: number;
  setFontSize: (v: number) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
  showImageAlt: boolean;
  setShowImageAlt: (v: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const [highContrast, setHighContrast] = useState<boolean>(() => localStorage.getItem('highContrast') === 'true');
  const [fontSize, setFontSize] = useState<number>(() => Number(localStorage.getItem('fontSize')) || 16);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => localStorage.getItem('reducedMotion') === 'true');
  const [showImageAlt, setShowImageAlt] = useState<boolean>(() => localStorage.getItem('showImageAlt') === 'true');

  useEffect(() => {
    // Apply theme class; CSS (index.css) defines semantic tokens for light/dark
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
    document.documentElement.classList.toggle('theme-light', theme === 'light');
    // Set the font size token used by CSS
    document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`);
    // Accessibility options map to classes handled by CSS
    document.documentElement.classList.toggle('high-contrast', highContrast);
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
    document.documentElement.classList.toggle('show-image-alt', showImageAlt);
    // Let the UA know preferred color scheme for form controls / scrollbars
    try {
      // set color-scheme inline so form controls/scrollbars can adapt
      document.documentElement.style.setProperty('color-scheme', theme);
    } catch (e) {
      // ignore on older browsers
    }

    localStorage.setItem('theme', theme);
    localStorage.setItem('highContrast', String(highContrast));
    localStorage.setItem('fontSize', String(fontSize));
    localStorage.setItem('reducedMotion', String(reducedMotion));
    localStorage.setItem('showImageAlt', String(showImageAlt));
  }, [theme, highContrast, fontSize, reducedMotion, showImageAlt]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, highContrast, setHighContrast, fontSize, setFontSize, reducedMotion, setReducedMotion, showImageAlt, setShowImageAlt }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
