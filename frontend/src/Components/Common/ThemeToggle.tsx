import React, { useContext } from 'react';
import { Button } from 'react-bootstrap';
import { ThemeContext } from '../../Theme/ThemeContext';

const ThemeToggle: React.FC = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) return null;
  return (
    <Button
      variant="primary"
      size="sm"
      onClick={ctx.toggleTheme}
      aria-label="Toggle light or dark theme"
      className="theme-toggle-btn"
    >
      {ctx.theme === 'dark' ? '🌤 Light' : '🌙 Dark'}
    </Button>
  );
};

export default ThemeToggle;
