import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Link,
  Alert,
  alpha
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '@/services/api';
import { PasswordField } from '@/components/common/PasswordField';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';

export const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { darkMode } = useTheme();

  // Verificar validade do token ao carregar
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError('Token inválido ou não encontrado.');
      return;
    }
  }, [token]);

  if (!token || !tokenValid) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: darkMode 
            ? 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 50%, #0f0f0f 100%)'
            : 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 50%, #f0f0f0 100%)',
          position: 'relative'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 24,
            right: 24,
            zIndex: 1000,
          }}
        >
          <ThemeToggle variant="switch" showLabel />
        </Box>
        <Container component="main" maxWidth="sm">
          <Paper
            elevation={darkMode ? 8 : 12}
            sx={{
              padding: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backdropFilter: 'blur(20px)',
              backgroundColor: darkMode 
                ? alpha('#1e1e1e', 0.9)
                : alpha('#ffffff', 0.95),
              border: `1px solid ${
                darkMode ? alpha('#ffffff', 0.1) : alpha('#ffffff', 0.2)
              }`
            }}
          >
            <Typography component="h1" variant="h4" gutterBottom color="error">
              ⚠️ Token Inválido
            </Typography>
            <Alert severity="error" sx={{ width: '100%', mb: 3 }}>
              {error || 'Token inválido ou expirado. Solicite uma nova recuperação de senha.'}
            </Alert>
            <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
              <Button 
                variant="contained"
                onClick={() => navigate('/forgot-password')}
                sx={{ flex: 1 }}
              >
                Solicitar Nova Recuperação
              </Button>
              <Button 
                variant="outlined"
                onClick={() => navigate('/login')}
                sx={{ flex: 1 }}
              >
                Voltar ao Login
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      await authAPI.resetPassword(token, password);
      setMessage('Senha redefinida com sucesso! Você será redirecionado para o login.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: darkMode 
          ? 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 50%, #0f0f0f 100%)'
          : 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 50%, #f0f0f0 100%)',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: darkMode 
            ? 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.02) 0%, transparent 50%)'
            : 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 50%)',
          zIndex: 0,
        }
      }}
    >
      {/* Theme Toggle */}
      <Box
        sx={{
          position: 'absolute',
          top: 24,
          right: 24,
          zIndex: 1000,
        }}
      >
        <ThemeToggle variant="switch" showLabel />
      </Box>

      <Container component="main" maxWidth="sm" sx={{ zIndex: 1 }}>
        <Paper
          elevation={darkMode ? 8 : 12}
          sx={{
            padding: { xs: 3, sm: 4, md: 5 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backdropFilter: 'blur(20px)',
            backgroundColor: darkMode 
              ? alpha('#1e1e1e', 0.9)
              : alpha('#ffffff', 0.95),
            border: `1px solid ${
              darkMode ? alpha('#ffffff', 0.1) : alpha('#ffffff', 0.2)
            }`,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            }
          }}
        >
          {/* Logo/Icon */}
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
            }}
          >
            <Typography sx={{ fontSize: 40 }}>🔒</Typography>
          </Box>
          
          <Typography 
            component="h1" 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              background: darkMode 
                ? 'linear-gradient(45deg, #90caf9, #f48fb1)'
                : 'linear-gradient(45deg, #667eea, #764ba2)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}
          >
            Redefinir Senha
          </Typography>
          <Typography 
            component="h2" 
            variant="h6" 
            color="text.secondary" 
            sx={{ 
              mb: 3,
              fontWeight: 400,
              textAlign: 'center'
            }}
          >
            Digite sua nova senha abaixo
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          {message && (
            <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
              {message}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <PasswordField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Nova Senha"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                }
              }}
            />
            
            <PasswordField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirmar Nova Senha"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                }
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
                  boxShadow: '0 6px 25px rgba(102, 126, 234, 0.5)',
                  transform: 'translateY(-2px)',
                },
                '&:disabled': {
                  background: 'linear-gradient(45deg, #ccc 30%, #999 90%)',
                  boxShadow: 'none',
                  transform: 'none',
                },
                transition: 'all 0.3s ease',
              }}
            >
              {loading ? '🔄 Redefinindo...' : '🔒 Redefinir Senha'}
            </Button>
            
            <Box textAlign="center">
              <Link
                href="#"
                variant="body2"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/login');
                }}
                sx={{
                  color: 'primary.main',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  '&:hover': {
                    textDecoration: 'underline',
                    color: 'primary.dark',
                  },
                }}
              >
                ← Voltar ao Login
              </Link>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};