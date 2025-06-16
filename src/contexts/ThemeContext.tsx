
import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeColors = {
  buttonColor: string;
  buttonTextColor: string;
  sidebarColor: string;
  sidebarTextColor: string;
};

type ThemeContextType = {
  colors: ThemeColors;
  updateColors: (colors: ThemeColors) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
};

const defaultThemeColors: ThemeColors = {
  buttonColor: "#8E44AD",
  buttonTextColor: "#100b47",
  sidebarColor: "#1A1F2C",
  sidebarTextColor: "#FFFFFF",
};

const ThemeContext = createContext<ThemeContextType>({
  colors: defaultThemeColors,
  updateColors: () => {},
  theme: 'light',
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colors, setColors] = useState<ThemeColors>(defaultThemeColors);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load theme colors from localStorage on component mount
    const savedTheme = localStorage.getItem('companyTheme');
    if (savedTheme) {
      try {
        setColors(JSON.parse(savedTheme));
      } catch (e) {
        console.error('Error parsing theme from localStorage', e);
      }
    }

    // Load theme preference from localStorage
    const savedThemeMode = localStorage.getItem('themeMode');
    if (savedThemeMode && (savedThemeMode === 'light' || savedThemeMode === 'dark')) {
      setTheme(savedThemeMode);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('themeMode', theme);
  }, [theme]);

  const updateColors = (newColors: ThemeColors) => {
    setColors(newColors);
    localStorage.setItem('companyTheme', JSON.stringify(newColors));

    // Update CSS variables
    document.documentElement.style.setProperty('--button-primary-color', newColors.buttonColor);
    document.documentElement.style.setProperty('--button-text-color', newColors.buttonTextColor);
    document.documentElement.style.setProperty('--sidebar-background-color', newColors.sidebarColor);
    document.documentElement.style.setProperty('--sidebar-text-color', newColors.sidebarTextColor);
  };

  // Set CSS variables on initial load too
  useEffect(() => {
    document.documentElement.style.setProperty('--button-primary-color', colors.buttonColor);
    document.documentElement.style.setProperty('--button-text-color', colors.buttonTextColor);
    document.documentElement.style.setProperty('--sidebar-background-color', colors.sidebarColor);
    document.documentElement.style.setProperty('--sidebar-text-color', colors.sidebarTextColor);
  }, [colors]);

  return (
    <ThemeContext.Provider value={{ colors, updateColors, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
