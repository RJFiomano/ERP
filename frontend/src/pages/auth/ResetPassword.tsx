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
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '@/services/api';

export const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return (
      <Container component="main" maxWidth="xs">
        <Box sx={{ marginTop: 8, textAlign: 'center' }}>
          <Alert severity="error">
            Token inválido ou não encontrado.
          </Alert>
          <Button onClick={() => navigate('/login')} sx={{ mt: 2 }}>
            Voltar ao login
          </Button>
        </Box>
      </Container>
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
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h4" gutterBottom>
            ERP Sistema
          </Typography>
          <Typography component="h2" variant="h6" color="text.secondary" gutterBottom>
            Nova senha
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

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Nova senha"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirmar nova senha"
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Redefinindo...' : 'Redefinir senha'}
            </Button>
            <Box textAlign="center">
              <Link
                href="#"
                variant="body2"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/login');
                }}
              >
                Voltar ao login
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};