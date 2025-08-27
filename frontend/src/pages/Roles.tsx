import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
  Snackbar,
  Collapse,
  Divider,
  Card,
  CardHeader,
  CardContent,
  ButtonGroup,
  Tooltip,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Security as SecurityIcon,
  SelectAll as SelectAllIcon,
  DeselectOutlined as DeselectIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxBlankIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Person as PersonIcon,
  SupervisorAccount as ManagerIcon,
  Work as OperatorIcon,
  Store as SellerIcon
} from '@mui/icons-material';
import { rolesAPI, permissionsAPI } from '@/services/api';
import { Role, Permission, CreateRoleRequest, UpdateRoleRequest } from '@/types/role';
import { PermissionGuard } from '@/components/PermissionGuard';

interface RoleFilters {
  search: string;
  status: 'all' | 'active' | 'inactive';
}

const Roles: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<RoleFilters>({
    search: '',
    status: 'active'
  });

  // Modal states
  const [openModal, setOpenModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<CreateRoleRequest>({
    name: '',
    description: '',
    permission_ids: []
  });

  // UI states
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [rolesData, permissionsData] = await Promise.all([
        rolesAPI.getRoles({
          search: filters.search || undefined,
          status: filters.status === 'all' ? undefined : filters.status
        }),
        permissionsAPI.getPermissions({ status: 'active' })
      ]);
      
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showSnackbar('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || '',
        permission_ids: role.permissions.map(p => p.id)
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        description: '',
        permission_ids: []
      });
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingRole(null);
    setFormData({ name: '', description: '', permission_ids: [] });
  };

  const handleSubmit = async () => {
    try {
      if (editingRole) {
        await rolesAPI.updateRole(editingRole.id, formData as UpdateRoleRequest);
        showSnackbar('Role atualizado com sucesso!', 'success');
      } else {
        await rolesAPI.createRole(formData);
        showSnackbar('Role criado com sucesso!', 'success');
      }
      
      handleCloseModal();
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar role:', error);
      const message = error.response?.data?.detail || 'Erro ao salvar role';
      showSnackbar(message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja inativar este role?')) {
      try {
        await rolesAPI.deleteRole(id);
        showSnackbar('Role inativado com sucesso!', 'success');
        loadData();
      } catch (error: any) {
        console.error('Erro ao inativar role:', error);
        const message = error.response?.data?.detail || 'Erro ao inativar role';
        showSnackbar(message, 'error');
      }
    }
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permission_ids: checked
        ? [...(prev.permission_ids || []), permissionId]
        : (prev.permission_ids || []).filter(id => id !== permissionId)
    }));
  };

  const toggleRowExpansion = (roleId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  };

  const groupPermissionsByResource = (permissions: Permission[]) => {
    return permissions.reduce((groups, permission) => {
      const resource = permission.resource;
      if (!groups[resource]) {
        groups[resource] = [];
      }
      groups[resource].push(permission);
      return groups;
    }, {} as Record<string, Permission[]>);
  };

  // Mapear nomes de recursos em português
  const resourceNames: Record<string, string> = {
    dashboard: 'Painel',
    users: 'Usuários',
    roles: 'Perfis',
    permissions: 'Permissões',
    products: 'Produtos',
    categories: 'Categorias',
    clients: 'Clientes',
    suppliers: 'Fornecedores',
    pessoas: 'Pessoas',
    sales: 'Vendas',
    purchase_orders: 'Pedidos de Compra',
    inventory: 'Estoque',
    accounts_receivable: 'Contas a Receber',
    accounts_payable: 'Contas a Pagar',
    financial: 'Financeiro',
    reports: 'Relatórios',
    settings: 'Configurações',
    nfe: 'Nota Fiscal Eletrônica'
  };

  // Templates de perfis pré-definidos
  const roleTemplates = {
    administrador: {
      name: 'Administrador',
      description: 'Acesso completo ao sistema',
      icon: <PersonIcon />,
      permissions: permissions.map(p => p.id)
    },
    gerente: {
      name: 'Gerente',
      description: 'Visualizar, criar e editar (sem exclusões críticas)',
      icon: <ManagerIcon />,
      permissions: permissions.filter(p => 
        p.action === 'view' || p.action === 'create' || p.action === 'edit' ||
        p.action === 'export' || p.action === 'import' || p.action === 'settle' ||
        p.action === 'pay' || p.action === 'approve' || p.action === 'receive'
      ).map(p => p.id)
    },
    operador: {
      name: 'Operador',
      description: 'Visualizar e criar registros básicos',
      icon: <OperatorIcon />,
      permissions: permissions.filter(p => 
        p.action === 'view' || p.action === 'create' ||
        (p.resource === 'sales' && p.action === 'edit') ||
        (p.resource === 'inventory' && ['entry', 'exit', 'adjust'].includes(p.action))
      ).map(p => p.id)
    },
    vendedor: {
      name: 'Vendedor',
      description: 'Foco em vendas, clientes e produtos',
      icon: <SellerIcon />,
      permissions: permissions.filter(p => 
        (['sales', 'clients', 'products', 'dashboard'].includes(p.resource) && 
         ['view', 'create', 'edit'].includes(p.action)) ||
        (p.resource === 'reports' && p.action === 'sales')
      ).map(p => p.id)
    }
  };

  const permissionsByResource = groupPermissionsByResource(permissions);

  // Funções para manipulação de permissões
  const handleSelectAllResources = () => {
    setFormData(prev => ({
      ...prev,
      permission_ids: permissions.map(p => p.id)
    }));
  };

  const handleDeselectAllResources = () => {
    setFormData(prev => ({
      ...prev,
      permission_ids: []
    }));
  };

  const handleSelectResourcePermissions = (resource: string, select: boolean) => {
    const resourcePermissions = permissionsByResource[resource] || [];
    const resourcePermissionIds = resourcePermissions.map(p => p.id);
    
    setFormData(prev => ({
      ...prev,
      permission_ids: select
        ? [...new Set([...(prev.permission_ids || []), ...resourcePermissionIds])]
        : (prev.permission_ids || []).filter(id => !resourcePermissionIds.includes(id))
    }));
  };

  const handleApplyTemplate = (templateKey: string) => {
    const template = roleTemplates[templateKey as keyof typeof roleTemplates];
    setFormData(prev => ({
      ...prev,
      name: prev.name || template.name,
      description: prev.description || template.description,
      permission_ids: template.permissions
    }));
  };

  const toggleResourceExpansion = (resource: string) => {
    setExpandedResources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resource)) {
        newSet.delete(resource);
      } else {
        newSet.add(resource);
      }
      return newSet;
    });
  };

  const getSelectedPermissionsCount = (resource: string) => {
    const resourcePermissions = permissionsByResource[resource] || [];
    const selectedIds = formData.permission_ids || [];
    return resourcePermissions.filter(p => selectedIds.includes(p.id)).length;
  };

  const isAllResourceSelected = (resource: string) => {
    const resourcePermissions = permissionsByResource[resource] || [];
    const selectedIds = formData.permission_ids || [];
    return resourcePermissions.length > 0 && resourcePermissions.every(p => selectedIds.includes(p.id));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon color="primary" />
                <Typography variant="h5" component="h1">
                  Gerenciamento de Roles
                </Typography>
              </Box>
              <PermissionGuard resource="roles" action="create">
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenModal()}
                >
                  Novo Role
                </Button>
              </PermissionGuard>
            </Box>

            {/* Filtros */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Buscar"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                    label="Status"
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    <MenuItem value="active">Ativos</MenuItem>
                    <MenuItem value="inactive">Inativos</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Tabela */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width="50px"></TableCell>
                    <TableCell>Nome</TableCell>
                    <TableCell>Descrição</TableCell>
                    <TableCell align="center">Permissões</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : roles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        Nenhum role encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    roles.map((role) => (
                      <React.Fragment key={role.id}>
                        <TableRow>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => toggleRowExpansion(role.id)}
                            >
                              {expandedRows.has(role.id) ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {role.name}
                            </Typography>
                          </TableCell>
                          <TableCell>{role.description || '-'}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${role.permissions.length} permissões`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={role.is_active ? 'Ativo' : 'Inativo'}
                              color={role.is_active ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <PermissionGuard resource="roles" action="edit">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenModal(role)}
                                color="primary"
                              >
                                <EditIcon />
                              </IconButton>
                            </PermissionGuard>
                            <PermissionGuard resource="roles" action="delete">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(role.id)}
                                color="error"
                                disabled={!role.is_active}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </PermissionGuard>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={6} sx={{ py: 0 }}>
                            <Collapse in={expandedRows.has(role.id)} timeout="auto" unmountOnExit>
                              <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Permissões deste role:
                                </Typography>
                                {role.permissions.length === 0 ? (
                                  <Typography variant="body2" color="text.secondary">
                                    Nenhuma permissão atribuída
                                  </Typography>
                                ) : (
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {role.permissions.map((permission) => (
                                      <Chip
                                        key={permission.id}
                                        label={`${permission.resource}:${permission.action}`}
                                        size="small"
                                        variant="outlined"
                                      />
                                    ))}
                                  </Box>
                                )}
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Modal de Criação/Edição */}
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRole ? 'Editar Role' : 'Novo Role'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Descrição"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Permissões
              </Typography>
              
              {/* Templates de Perfis */}
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom color="primary">
                  Templates de Perfil
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {Object.entries(roleTemplates).map(([key, template]) => (
                    <Tooltip key={key} title={template.description}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={template.icon}
                        onClick={() => handleApplyTemplate(key)}
                        sx={{ textTransform: 'none' }}
                      >
                        {template.name}
                      </Button>
                    </Tooltip>
                  ))}
                </Box>
                
                {/* Controles Globais */}
                <ButtonGroup variant="outlined" size="small">
                  <Button
                    startIcon={<SelectAllIcon />}
                    onClick={handleSelectAllResources}
                  >
                    Selecionar Todas
                  </Button>
                  <Button
                    startIcon={<DeselectIcon />}
                    onClick={handleDeselectAllResources}
                  >
                    Desmarcar Todas
                  </Button>
                </ButtonGroup>
                
                <Chip 
                  label={`${formData.permission_ids?.length || 0} de ${permissions.length} permissões selecionadas`}
                  color="primary"
                  variant="outlined"
                  size="small"
                  sx={{ ml: 2 }}
                />
              </Paper>

              {/* Cards de Recursos */}
              <Paper sx={{ maxHeight: 500, overflow: 'auto' }}>
                {Object.entries(permissionsByResource).map(([resource, resourcePermissions]) => {
                  const selectedCount = getSelectedPermissionsCount(resource);
                  const totalCount = resourcePermissions.length;
                  const isExpanded = expandedResources.has(resource);
                  const allSelected = isAllResourceSelected(resource);

                  return (
                    <Card key={resource} sx={{ mb: 1, border: '1px solid', borderColor: 'divider' }}>
                      <CardHeader
                        avatar={
                          <Avatar sx={{ 
                            bgcolor: selectedCount > 0 ? 'primary.main' : 'grey.300',
                            color: 'white',
                            fontSize: '0.875rem'
                          }}>
                            {selectedCount}
                          </Avatar>
                        }
                        action={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Tooltip title={allSelected ? 'Desmarcar todas deste módulo' : 'Selecionar todas deste módulo'}>
                              <IconButton
                                size="small"
                                onClick={() => handleSelectResourcePermissions(resource, !allSelected)}
                                color={allSelected ? 'error' : 'primary'}
                              >
                                {allSelected ? <DeselectIcon /> : <SelectAllIcon />}
                              </IconButton>
                            </Tooltip>
                            <IconButton
                              size="small"
                              onClick={() => toggleResourceExpansion(resource)}
                            >
                              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                          </Box>
                        }
                        title={
                          <Typography variant="subtitle1" component="div">
                            {resourceNames[resource] || resource}
                          </Typography>
                        }
                        subheader={`${selectedCount}/${totalCount} permissões selecionadas`}
                        sx={{ 
                          pb: 1,
                          '& .MuiCardHeader-title': {
                            fontSize: '1rem',
                            fontWeight: 600
                          },
                          '& .MuiCardHeader-subheader': {
                            fontSize: '0.875rem'
                          }
                        }}
                      />
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <CardContent sx={{ pt: 0 }}>
                          <FormGroup>
                            {resourcePermissions.map((permission) => (
                              <FormControlLabel
                                key={permission.id}
                                control={
                                  <Checkbox
                                    checked={(formData.permission_ids || []).includes(permission.id)}
                                    onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                                    size="small"
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography variant="body2" component="div">
                                      <strong>{permission.action}</strong>
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {permission.name}
                                    </Typography>
                                  </Box>
                                }
                                sx={{ 
                                  mb: 0.5,
                                  '& .MuiFormControlLabel-label': {
                                    fontSize: '0.875rem'
                                  }
                                }}
                              />
                            ))}
                          </FormGroup>
                        </CardContent>
                      </Collapse>
                    </Card>
                  );
                })}
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.name.trim()}
          >
            {editingRole ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

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

export default Roles;