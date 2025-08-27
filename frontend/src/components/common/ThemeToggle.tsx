import React from 'react';
import {
  IconButton,
  Tooltip,
  Box,
  Switch,
  FormControlLabel,
  useTheme as useMuiTheme,
} from '@mui/material';
import {
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Brightness4 as Brightness4Icon,
} from '@mui/icons-material';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  variant?: 'icon' | 'switch';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = 'icon', 
  size = 'medium',
  showLabel = false 
}) => {
  const { darkMode, toggleDarkMode } = useTheme();
  const muiTheme = useMuiTheme();

  if (variant === 'switch') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {showLabel && (
          <LightModeIcon 
            sx={{ 
              color: !darkMode ? muiTheme.palette.primary.main : muiTheme.palette.text.secondary,
              fontSize: size === 'small' ? 16 : size === 'large' ? 24 : 20,
            }} 
          />
        )}
        <FormControlLabel
          control={
            <Switch
              checked={darkMode}
              onChange={toggleDarkMode}
              size={size}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: muiTheme.palette.primary.main,
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: muiTheme.palette.primary.main,
                },
              }}
            />
          }
          label={showLabel ? (darkMode ? 'Modo Escuro' : 'Modo Claro') : ''}
          sx={{ 
            margin: 0,
            '& .MuiFormControlLabel-label': {
              fontSize: size === 'small' ? '0.85rem' : size === 'large' ? '1.1rem' : '1rem',
            },
          }}
        />
        {showLabel && (
          <DarkModeIcon 
            sx={{ 
              color: darkMode ? muiTheme.palette.primary.main : muiTheme.palette.text.secondary,
              fontSize: size === 'small' ? 16 : size === 'large' ? 24 : 20,
            }} 
          />
        )}
      </Box>
    );
  }

  return (
    <Tooltip title={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}>
      <IconButton
        onClick={toggleDarkMode}
        size={size}
        sx={{
          color: muiTheme.palette.text.primary,
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
          '&:hover': {
            backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            transform: 'scale(1.05)',
          },
          transition: 'all 0.2s ease-in-out',
          border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'}`,
        }}
      >
        {darkMode ? (
          <LightModeIcon fontSize="inherit" />
        ) : (
          <DarkModeIcon fontSize="inherit" />
        )}
      </IconButton>
    </Tooltip>
  );
};