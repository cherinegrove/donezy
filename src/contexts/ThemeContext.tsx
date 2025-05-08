
import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeColors = {
  buttonColor: string;
  sidebarColor: string;
};

type ThemeContextType = {
  colors: ThemeColors;
  updateColors: (colors: ThemeColors) => void;
};

const defaultThemeColors: ThemeColors = {
  buttonColor: "#000000",
  sidebarColor: "#1A1F2C",
};

const ThemeContext = createContext<ThemeContextType>({
  colors: defaultThemeColors,
  updateColors: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colors, setColors] = useState<ThemeColors>(defaultThemeColors);

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
  }, []);

  const updateColors = (newColors: ThemeColors) => {
    setColors(newColors);
    localStorage.setItem('companyTheme', JSON.stringify(newColors));

    // Update CSS variables
    document.documentElement.style.setProperty('--button-primary-color', newColors.buttonColor);
    document.documentElement.style.setProperty('--sidebar-background-color', newColors.sidebarColor);
  };

  // Set CSS variables on initial load too
  useEffect(() => {
    document.documentElement.style.setProperty('--button-primary-color', colors.buttonColor);
    document.documentElement.style.setProperty('--sidebar-background-color', colors.sidebarColor);
  }, [colors]);

  return (
    <ThemeContext.Provider value={{ colors, updateColors }}>
      {children}
    </ThemeContext.Provider>
  );
};
