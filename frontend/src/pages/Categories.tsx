import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  IconButton,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import { 
  Add, 
  Edit, 
  Delete, 
  Visibility, 
  ToggleOn, 
  ToggleOff,
  Search,
  Clear,
  Close,
} from '@mui/icons-material';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { categoriesAPI } from '@/services/api';
import { CreateCategoryRequest, Category, CategoryFilters } from '@/types/category';
import { usePermissions } from '@/contexts/PermissionsContext';

export const Categories: React.FC = () => {
  const { hasPermission } = usePermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState<CategoryFilters>({
    search: '',
    status: 'active',
  });
  const [sortBy] = useState<string>('created_at');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');

  // Form states
  const [formData, setFormData] = useState<CreateCategoryRequest>({
    name: '',
    description: '',
    default_margin_percentage: undefined,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<CreateCategoryRequest>>({});

  const loadCategories = async (currentPage?: number, customFilters?: CategoryFilters) => {
    setLoading(true);
    try {
      const pageToUse = currentPage !== undefined ? currentPage : page;
      const filtersToUse = customFilters || filters;
      const params: any = {
        skip: pageToUse * rowsPerPage,
        limit: rowsPerPage,
        search: filtersToUse.search || '',
        status: filtersToUse.status,
        sortBy: sortBy,
        sortOrder: sortOrder,
      };
      
      const response = await categoriesAPI.getCategories(params);
      setCategories(response);
      setTotal(response.length);
      setError('');
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erro ao carregar categorias');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [page, rowsPerPage, filters.status, sortBy, sortOrder]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setFormLoading(true);
    try {
      await categoriesAPI.createCategory(formData);
      setSuccess(true);
      setSuccessMessage('Categoria criada com sucesso!');
      setError('');
      setTimeout(() => setSuccess(false), 5000);
      loadCategories();
      handleCloseModal();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erro ao criar categoria');
      setSuccess(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory || !validateForm()) {
      return;
    }

    setFormLoading(true);
    try {
      await categoriesAPI.updateCategory(selectedCategory.id, formData);
      setSuccess(true);
      setSuccessMessage('Categoria atualizada com sucesso!');
      setError('');
      setTimeout(() => setSuccess(false), 5000);
      loadCategories();
      handleCloseEditModal();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erro ao atualizar categoria');
      setSuccess(false);
    } finally {
      setFormLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Partial<CreateCategoryRequest> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = () => {
    setPage(0);
    loadCategories(0, filters);
  };

  const handleClear = () => {
    const clearedFilters: CategoryFilters = {
      search: '',
      status: 'active',
    };
    setFilters(clearedFilters);
    setPage(0);
    loadCategories(0, clearedFilters);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      default_margin_percentage: category.default_margin_percentage,
    });
    setFormErrors({});
    setEditModalOpen(true);
  };

  const handleView = (category: Category) => {
    setSelectedCategory(category);
    setViewModalOpen(true);
  };

  const handleToggleStatus = async (category: Category) => {
    try {
      await categoriesAPI.toggleCategoryStatus(category.id);
      setSuccess(true);
      setSuccessMessage(
        `Categoria ${category.is_active ? 'inativada' : 'ativada'} com sucesso!`
      );
      setError('');
      setTimeout(() => setSuccess(false), 5000);
      loadCategories();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erro ao alterar status da categoria');
      setSuccess(false);
    }
  };

  const handleDelete = (category: Category) => {
    setCategoryToDelete(category);
    setConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    
    setDeleteLoading(true);
    try {
      await categoriesAPI.deleteCategory(categoryToDelete.id);
      setError('');
      setSuccessMessage(`Categoria "${categoryToDelete.name}" foi inativada com sucesso.`);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSuccessMessage('');
      }, 5000);
      
      await loadCategories();
      setConfirmDialogOpen(false);
      setCategoryToDelete(null);
      
    } catch (error: any) {
      if (error.response?.data?.detail?.includes('já está inativa')) {
        setError('Esta categoria já está inativa.');
      } else {
        setError(error.response?.data?.detail || 'Erro ao inativar categoria');
      }
      setSuccess(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDelete = () => {
    setConfirmDialogOpen(false);
    setCategoryToDelete(null);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setFormData({ name: '', description: '', default_margin_percentage: undefined });
    setFormErrors({});
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedCategory(null);
    setFormData({ name: '', description: '', default_margin_percentage: undefined });
    setFormErrors({});
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {total} categorias encontradas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Filtros: {filters.status === 'active' ? 'Ativas' : filters.status === 'inactive' ? 'Inativas' : 'Todas'}
          </Typography>
        </Box>
        {hasPermission('categories', 'create') && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setModalOpen(true)}
          >
            Nova Categoria
          </Button>
        )}
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage || 'Operação realizada com sucesso!'}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Buscar por nome ou descrição..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              size="small"
              InputProps={{
                startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                label="Status"
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="active">Apenas Ativos</MenuItem>
                <MenuItem value="inactive">Apenas Inativos</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                onClick={handleSearch}
                startIcon={<Search />}
                disabled={loading}
              >
                Buscar
              </Button>
              <Button
                variant="outlined"
                onClick={handleClear}
                startIcon={<Clear />}
                color="secondary"
              >
                Limpar
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabela */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>Margem Padrão</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Criado em</TableCell>
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
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Nenhuma categoria encontrada
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {category.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {category.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {category.default_margin_percentage ? `${category.default_margin_percentage}%` : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={category.is_active ? 'Ativo' : 'Inativo'}
                      size="small"
                      color={category.is_active ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(category.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" gap={0.5}>
                      <IconButton
                        size="small"
                        onClick={() => handleView(category)}
                        title="Visualizar categoria"
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                      {hasPermission('categories', 'edit') && (
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(category)}
                          title="Editar categoria"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => handleToggleStatus(category)}
                        title={category.is_active ? 'Inativar categoria' : 'Ativar categoria'}
                        color={category.is_active ? 'warning' : 'success'}
                      >
                        {category.is_active ? <ToggleOff fontSize="small" /> : <ToggleOn fontSize="small" />}
                      </IconButton>
                      {category.is_active && hasPermission('categories', 'delete') && (
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(category)}
                          title="Inativar categoria"
                          color="warning"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => setRowsPerPage(parseInt(event.target.value, 10))}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`}
        />
      </TableContainer>

      {/* Modal Criar */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          component: 'form',
          onSubmit: handleCreateCategory,
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Nova Categoria</Typography>
            <IconButton onClick={handleCloseModal} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                multiline
                rows={3}
                error={!!formErrors.description}
                helperText={formErrors.description}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Margem Padrão (%)"
                type="number"
                value={formData.default_margin_percentage || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  default_margin_percentage: e.target.value ? parseFloat(e.target.value) : undefined 
                }))}
                helperText="Margem de lucro padrão aplicada aos produtos desta categoria"
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} disabled={formLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={formLoading}
          >
            {formLoading ? 'Salvando...' : 'Salvar Categoria'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Editar */}
      <Dialog
        open={editModalOpen}
        onClose={handleCloseEditModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          component: 'form',
          onSubmit: handleUpdateCategory,
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Editar Categoria</Typography>
            <IconButton onClick={handleCloseEditModal} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                multiline
                rows={3}
                error={!!formErrors.description}
                helperText={formErrors.description}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Margem Padrão (%)"
                type="number"
                value={formData.default_margin_percentage || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  default_margin_percentage: e.target.value ? parseFloat(e.target.value) : undefined 
                }))}
                helperText="Margem de lucro padrão aplicada aos produtos desta categoria"
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditModal} disabled={formLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={formLoading}
          >
            {formLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Visualizar */}
      <Dialog
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Detalhes da Categoria</Typography>
            <IconButton onClick={() => setViewModalOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedCategory && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Nome
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {selectedCategory.name}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Descrição
                </Typography>
                <Typography variant="body1">
                  {selectedCategory.description || 'Não informado'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Margem Padrão
                </Typography>
                <Typography variant="body1">
                  {selectedCategory.default_margin_percentage ? `${selectedCategory.default_margin_percentage}%` : 'Não definida'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={selectedCategory.is_active ? 'Ativo' : 'Inativo'}
                  color={selectedCategory.is_active ? 'success' : 'error'}
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Criado em
                </Typography>
                <Typography variant="body2">
                  {formatDate(selectedCategory.created_at)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Atualizado em
                </Typography>
                <Typography variant="body2">
                  {formatDate(selectedCategory.updated_at)}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewModalOpen(false)}>
            Fechar
          </Button>
          {selectedCategory && hasPermission('categories', 'edit') && (
            <Button
              variant="contained"
              onClick={() => {
                setViewModalOpen(false);
                setTimeout(() => handleEdit(selectedCategory), 100);
              }}
            >
              Editar Categoria
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Inativar Categoria"
        message={
          categoryToDelete 
            ? `Tem certeza que deseja inativar a categoria "${categoryToDelete.name}"?\n\nA categoria passará para o status "Inativo" e não aparecerá na listagem padrão. Você pode reativá-la a qualquer momento usando o botão de alternância de status.`
            : ''
        }
        confirmText="Inativar Categoria"
        cancelText="Cancelar"
        confirmColor="warning"
        loading={deleteLoading}
      />
    </Box>
  );
};