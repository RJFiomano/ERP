import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  TextField,
  Avatar,
  Divider,
  Alert,
  Snackbar,
  Card,
  CardContent,
  CardHeader,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  alpha,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  VpnKey as VpnKeyIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { PasswordField } from '@/components/common/PasswordField';
import { usersAPI } from '@/services/api';

interface ProfileData {
  name: string;
  email: string;
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const Profile: React.FC = () => {
  const { user: contextUser, updateUser } = useAuth();
  const { darkMode } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  
  const [formData, setFormData] = useState<ProfileData>({
    name: '',
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  // Carregar dados do perfil via API
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      const profileData = await usersAPI.getProfile();
      console.log('Dados do perfil carregados:', profileData);
      setUser(profileData);
      setFormData({
        name: profileData.name || '',
        email: profileData.email || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error);
      const message = error.response?.data?.detail || 'Erro ao carregar dados do perfil';
      showSnackbar(message, 'error');
      // Fallback para dados do contexto se API falhar
      if (contextUser) {
        setUser(contextUser);
        setFormData({
          name: contextUser.name || '',
          email: contextUser.email || '',
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleInputChange = (field: keyof ProfileData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Nome é obrigatório';
    }
    if (!formData.email.trim()) {
      return 'Email é obrigatório';
    }
    if (changePassword) {
      if (!formData.current_password) {
        return 'Senha atual é obrigatória';
      }
      if (!formData.new_password) {
        return 'Nova senha é obrigatória';
      }
      if (formData.new_password.length < 6) {
        return 'Nova senha deve ter pelo menos 6 caracteres';
      }
      if (formData.new_password !== formData.confirm_password) {
        return 'Nova senha e confirmação não coincidem';
      }
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      showSnackbar(validationError, 'error');
      return;
    }

    setLoading(true);

    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email
      };

      if (changePassword) {
        updateData.current_password = formData.current_password;
        updateData.new_password = formData.new_password;
        updateData.confirm_password = formData.confirm_password;
      }

      const updatedUser = await usersAPI.updateProfile(updateData);
      updateUser(updatedUser);
      
      setEditMode(false);
      setChangePassword(false);
      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }));

      showSnackbar('Perfil atualizado com sucesso!', 'success');
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      const message = error.response?.data?.detail || 'Erro ao atualizar perfil';
      showSnackbar(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
    setEditMode(false);
    setChangePassword(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loadingProfile) {
    return (
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Typography variant="h6">Carregando perfil...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              background: darkMode 
                ? 'linear-gradient(135deg, #2c2c2c 0%, #1e1e1e 50%, #1a1a1a 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #5a67d8 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '50%',
                height: '100%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                zIndex: 0,
              }
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  backgroundColor: alpha('#ffffff', 0.2),
                  border: `3px solid ${alpha('#ffffff', 0.3)}`,
                  fontSize: '2rem',
                  fontWeight: 'bold'
                }}
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {user?.name || 'Usuário'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Chip
                    icon={<SecurityIcon />}
                    label={user?.role_name || user?.role || 'Usuário'}
                    sx={{
                      backgroundColor: alpha('#ffffff', 0.2),
                      color: 'white',
                      fontWeight: 600,
                      '& .MuiChip-icon': { color: 'white' }
                    }}
                  />
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {user?.email || 'Email não disponível'}
                  </Typography>
                </Box>
              </Box>
              <Box>
                {!editMode ? (
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={() => setEditMode(true)}
                    sx={{
                      backgroundColor: alpha('#ffffff', 0.2),
                      color: 'white',
                      '&:hover': {
                        backgroundColor: alpha('#ffffff', 0.3),
                      }
                    }}
                  >
                    Editar Perfil
                  </Button>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSave}
                      disabled={loading}
                      sx={{
                        backgroundColor: alpha('#ffffff', 0.2),
                        color: 'white',
                        '&:hover': {
                          backgroundColor: alpha('#ffffff', 0.3),
                        }
                      }}
                    >
                      {loading ? 'Salvando...' : 'Salvar'}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={handleCancel}
                      disabled={loading}
                      sx={{
                        borderColor: alpha('#ffffff', 0.7),
                        color: 'white',
                        fontWeight: 600,
                        '&:hover': {
                          borderColor: '#ffffff',
                          backgroundColor: alpha('#ffffff', 0.15),
                        },
                        '&:disabled': {
                          borderColor: alpha('#ffffff', 0.3),
                          color: alpha('#ffffff', 0.5),
                        }
                      }}
                    >
                      Cancelar
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Informações do Perfil */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              avatar={<PersonIcon color="primary" />}
              title="Informações Pessoais"
              subheader={editMode ? "Editando dados pessoais" : "Gerencie seus dados pessoais"}
              action={editMode ? (
                <Tooltip title="Cancelar edição">
                  <IconButton
                    onClick={handleCancel}
                    disabled={loading}
                    size="small"
                    sx={{
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'error.main',
                        backgroundColor: 'action.hover'
                      }
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Tooltip>
              ) : null}
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nome Completo"
                    value={formData.name}
                    onChange={handleInputChange('name')}
                    disabled={!editMode}
                    InputProps={{
                      startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    disabled={!editMode}
                    InputProps={{
                      startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>

                {editMode && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Typography variant="h6" color="primary">
                        Alterar Senha
                      </Typography>
                      <Button
                        variant={changePassword ? "contained" : "outlined"}
                        size="small"
                        startIcon={<VpnKeyIcon />}
                        onClick={() => setChangePassword(!changePassword)}
                      >
                        {changePassword ? 'Cancelar' : 'Alterar Senha'}
                      </Button>
                    </Box>

                    {changePassword && (
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <PasswordField
                            fullWidth
                            label="Senha Atual"
                            value={formData.current_password}
                            onChange={handleInputChange('current_password')}
                            required
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <PasswordField
                            fullWidth
                            label="Nova Senha"
                            value={formData.new_password}
                            onChange={handleInputChange('new_password')}
                            required
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <PasswordField
                            fullWidth
                            label="Confirmar Nova Senha"
                            value={formData.confirm_password}
                            onChange={handleInputChange('confirm_password')}
                            required
                          />
                        </Grid>
                      </Grid>
                    )}
                  </Grid>
                )}
                
                {/* Botões de ação no final do formulário */}
                {editMode && (
                  <Grid item xs={12}>
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 2, 
                      justifyContent: 'flex-end',
                      pt: 2,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      mt: 2
                    }}>
                      <Button
                        variant="outlined"
                        startIcon={<CancelIcon />}
                        onClick={handleCancel}
                        disabled={loading}
                        color="inherit"
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        disabled={loading}
                      >
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Informações do Sistema */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            {/* Informações da Conta */}
            <Grid item xs={12}>
              <Card>
                <CardHeader
                  avatar={<BusinessIcon color="primary" />}
                  title="Informações da Conta"
                  subheader="Detalhes do sistema"
                />
                <CardContent>
                  <List disablePadding>
                    <ListItem disablePadding>
                      <ListItemIcon>
                        <SecurityIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Perfil de Acesso"
                        secondary={user?.role_name || user?.role || 'N/A'}
                      />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemIcon>
                        <ScheduleIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Membro desde"
                        secondary={user?.created_at ? formatDate(user.created_at) : 'N/A'}
                      />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemIcon>
                        <CheckIcon color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Status"
                        secondary={
                          <Chip 
                            label={user?.is_active ? 'Ativo' : 'Inativo'} 
                            color={user?.is_active ? 'success' : 'error'}
                            size="small"
                          />
                        }
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Permissões */}
            <Grid item xs={12}>
              <Card>
                <CardHeader
                  avatar={<VpnKeyIcon color="primary" />}
                  title="Permissões"
                  subheader={user?.permissions && user.permissions.length > 0 
                    ? `${user.permissions.length} permissões ativas` 
                    : 'Nenhuma permissão específica'
                  }
                />
                <CardContent>
                  <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {user?.permissions && user.permissions.length > 0 ? (
                      <>
                        {user.permissions.slice(0, 10).map((permission, index) => (
                          <Chip
                            key={index}
                            label={permission}
                            size="small"
                            variant="outlined"
                            sx={{ m: 0.25 }}
                          />
                        ))}
                        {user.permissions.length > 10 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                            +{user.permissions.length - 10} permissões adicionais
                          </Typography>
                        )}
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        As permissões são baseadas no perfil de acesso: {user?.role_name || user?.role || 'N/A'}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Profile;