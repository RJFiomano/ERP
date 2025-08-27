import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Link,
  Alert,
  alpha,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Email as EmailIcon,
  Send as SendIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/services/api';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { darkMode } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await authAPI.forgotPassword(email);
      setMessage('Se o email existir, você receberá instruções para redefinir sua senha.');
      setSent(true);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erro ao enviar email');
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
            width: '100%',
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
          {/* Icon */}
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: sent 
                ? 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)'
                : 'linear-gradient(135deg, #ff7043 0%, #ff5722 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              boxShadow: sent
                ? '0 8px 32px rgba(76, 175, 80, 0.3)'
                : '0 8px 32px rgba(255, 112, 67, 0.3)',
              transition: 'all 0.5s ease',
            }}
          >
            {sent ? (
              <CheckIcon sx={{ fontSize: 40, color: 'white' }} />
            ) : (
              <EmailIcon sx={{ fontSize: 40, color: 'white' }} />
            )}
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
              mb: 1,
              textAlign: 'center'
            }}
          >
            {sent ? 'Email Enviado!' : 'Recuperar Senha'}
          </Typography>
          
          <Typography 
            component="h2" 
            variant="body1" 
            color="text.secondary" 
            sx={{ 
              mb: 3,
              textAlign: 'center',
              lineHeight: 1.6
            }}
          >
            {sent 
              ? 'Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.'
              : 'Digite seu email para receber instruções de recuperação de senha.'
            }
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

          {!sent && (
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <EmailIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
                  ),
                }}
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
                startIcon={<SendIcon />}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  background: 'linear-gradient(45deg, #ff7043 30%, #ff5722 90%)',
                  boxShadow: '0 4px 20px rgba(255, 112, 67, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #f4511e 30%, #d84315 90%)',
                    boxShadow: '0 6px 25px rgba(255, 112, 67, 0.5)',
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
                {loading ? 'Enviando...' : 'Enviar Email'}
              </Button>
            </Box>
          )}
          
          {sent && (
            <Button
              variant="outlined"
              fullWidth
              onClick={() => {
                setSent(false);
                setEmail('');
                setMessage('');
              }}
              sx={{
                mt: 2,
                mb: 2,
                py: 1.5,
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: alpha('#667eea', 0.1),
                },
              }}
            >
              Tentar Novamente
            </Button>
          )}
          
          <Box textAlign="center" sx={{ mt: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/login')}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'primary.main',
                  backgroundColor: 'transparent',
                },
              }}
            >
              Voltar ao login
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};