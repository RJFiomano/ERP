import React, { useState } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  TextFieldProps,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';

interface PasswordFieldProps extends Omit<TextFieldProps, 'type'> {
  showToggle?: boolean;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  showToggle = true,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <TextField
      {...props}
      type={showPassword ? 'text' : 'password'}
      InputProps={{
        ...props.InputProps,
        endAdornment: showToggle ? (
          <InputAdornment position="end">
            <Tooltip title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
              <IconButton
                aria-label="toggle password visibility"
                onClick={handleTogglePassword}
                onMouseDown={handleMouseDownPassword}
                edge="end"
                size="small"
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'primary.main',
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                {showPassword ? (
                  <VisibilityOffIcon fontSize="small" />
                ) : (
                  <VisibilityIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </InputAdornment>
        ) : props.InputProps?.endAdornment,
      }}
    />
  );
};