import React, { useState, useEffect } from 'react';
import { PermissionGuard } from '@/components/PermissionGuard';
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
  TableSortLabel,
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
  Inventory2,
  Warning,
} from '@mui/icons-material';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ProductForm } from '@/components/ProductForm';
import { productsAPI } from '@/services/api';
import { CreateProductRequest, Product, ProductFilters, Category as ProductCategory } from '@/types/product';

export const Products: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    status: 'active',
    stock_status: 'all',
  });
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  // Função para lidar com ordenação
  const handleRequestSort = (property: string) => {
    const isAsc = sortBy === property && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortBy(property);
    setPage(0); // Reset to first page when sorting
  };

  // Form states
  const [formData, setFormData] = useState<CreateProductRequest>({
    sku: '',
    name: '',
    description: '',
    category_id: '',
    
    // Fiscal - NF-e SP
    ncm: '',
    cfop: '',
    cst: '',
    ean_gtin: '',
    unit: 'UN',
    origin: '0',
    
    // ICMS detalhado
    icms_cst: '',
    icms_base_calc: 0,
    icms_reduction: 0,
    
    // IPI
    ipi_cst: '',
    ipi_rate: 0,
    
    // PIS/COFINS detalhado
    pis_cst: '',
    cofins_cst: '',
    
    // Preços e margem
    cost_price: 0,
    sale_price: 0,
    margin_type: 'manual',
    margin_percentage: 0,
    use_category_margin: false,
    
    // Estoque
    stock_quantity: 0,
    min_stock: 0,
    
    // Impostos (compatibilidade)
    icms_rate: 0,
    pis_rate: 0,
    cofins_rate: 0,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<CreateProductRequest>>({});

  const loadCategories = async () => {
    try {
      const response = await productsAPI.getProductCategories();
      setCategories(response);
    } catch (error: any) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadProducts = async (currentPage?: number, customFilters?: ProductFilters) => {
    setLoading(true);
    try {
      const pageToUse = currentPage !== undefined ? currentPage : page;
      const filtersToUse = customFilters || filters;
      const params: any = {
        skip: pageToUse * rowsPerPage,
        limit: rowsPerPage,
        search: filtersToUse.search || '',
        status: filtersToUse.status,
        stock_status: filtersToUse.stock_status !== 'all' ? filtersToUse.stock_status : undefined,
        sortBy: sortBy,
        sortOrder: sortOrder,
      };
      
      const response = await productsAPI.getProducts(params);
      setProducts(response);
      setTotal(response.length);
      setError('');
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erro ao carregar produtos');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [page, rowsPerPage, filters.status, filters.stock_status, sortBy, sortOrder]);

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setFormLoading(true);
    try {
      await productsAPI.createProduct(formData);
      setSuccess(true);
      setSuccessMessage('Produto criado com sucesso!');
      setError('');
      setTimeout(() => setSuccess(false), 5000);
      loadProducts();
      handleCloseModal();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erro ao criar produto');
      setSuccess(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct || !validateForm()) {
      return;
    }

    setFormLoading(true);
    try {
      await productsAPI.updateProduct(selectedProduct.id, formData);
      setSuccess(true);
      setSuccessMessage('Produto atualizado com sucesso!');
      setError('');
      setTimeout(() => setSuccess(false), 5000);
      loadProducts();
      handleCloseEditModal();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erro ao atualizar produto');
      setSuccess(false);
    } finally {
      setFormLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Partial<CreateProductRequest> = {};

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU é obrigatório';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.sale_price || formData.sale_price <= 0) {
      newErrors.sale_price = 'Preço de venda deve ser maior que zero' as any;
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = () => {
    setPage(0);
    loadProducts(0, filters);
  };

  const handleClear = () => {
    const clearedFilters: ProductFilters = {
      search: '',
      status: 'active',
      stock_status: 'all',
    };
    setFilters(clearedFilters);
    setPage(0);
    loadProducts(0, clearedFilters);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      category_id: product.category_id || '',
      
      // Fiscal - NF-e SP
      ncm: product.ncm || '',
      cfop: product.cfop || '',
      cst: product.cst || '',
      ean_gtin: product.ean_gtin || '',
      unit: product.unit || 'UN',
      origin: product.origin || '0',
      
      // ICMS detalhado
      icms_cst: product.icms_cst || '',
      icms_base_calc: product.icms_base_calc || 0,
      icms_reduction: product.icms_reduction || 0,
      
      // IPI
      ipi_cst: product.ipi_cst || '',
      ipi_rate: product.ipi_rate || 0,
      
      // PIS/COFINS detalhado
      pis_cst: product.pis_cst || '',
      cofins_cst: product.cofins_cst || '',
      
      // Preços e margem
      cost_price: product.cost_price || 0,
      sale_price: product.sale_price,
      margin_type: product.margin_type || 'manual',
      margin_percentage: product.margin_percentage || 0,
      use_category_margin: product.use_category_margin || false,
      
      // Estoque
      stock_quantity: product.stock_quantity || 0,
      min_stock: product.min_stock || 0,
      
      // Impostos (compatibilidade)
      icms_rate: product.icms_rate || 0,
      pis_rate: product.pis_rate || 0,
      cofins_rate: product.cofins_rate || 0,
    });
    setFormErrors({});
    setEditModalOpen(true);
  };

  const handleView = (product: Product) => {
    setSelectedProduct(product);
    setViewModalOpen(true);
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      await productsAPI.toggleProductStatus(product.id);
      setSuccess(true);
      setSuccessMessage(
        `Produto ${product.is_active ? 'inativado' : 'ativado'} com sucesso!`
      );
      setError('');
      setTimeout(() => setSuccess(false), 5000);
      loadProducts();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erro ao alterar status do produto');
      setSuccess(false);
    }
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    
    setDeleteLoading(true);
    try {
      await productsAPI.deleteProduct(productToDelete.id);
      setError('');
      setSuccessMessage(`Produto "${productToDelete.name}" foi inativado com sucesso.`);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSuccessMessage('');
      }, 5000);
      
      await loadProducts();
      setConfirmDialogOpen(false);
      setProductToDelete(null);
      
    } catch (error: any) {
      if (error.response?.data?.detail?.includes('já está inativo')) {
        setError('Este produto já está inativo.');
      } else {
        setError(error.response?.data?.detail || 'Erro ao inativar produto');
      }
      setSuccess(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDelete = () => {
    setConfirmDialogOpen(false);
    setProductToDelete(null);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setFormData({
      sku: '',
      name: '',
      description: '',
      category_id: '',
      
      // Fiscal - NF-e SP
      ncm: '',
      cfop: '',
      cst: '',
      ean_gtin: '',
      unit: 'UN',
      origin: '0',
      
      // ICMS detalhado
      icms_cst: '',
      icms_base_calc: 0,
      icms_reduction: 0,
      
      // IPI
      ipi_cst: '',
      ipi_rate: 0,
      
      // PIS/COFINS detalhado
      pis_cst: '',
      cofins_cst: '',
      
      // Preços e margem
      cost_price: 0,
      sale_price: 0,
      margin_type: 'manual',
      margin_percentage: 0,
      use_category_margin: false,
      
      // Estoque
      stock_quantity: 0,
      min_stock: 0,
      
      // Impostos (compatibilidade)
      icms_rate: 0,
      pis_rate: 0,
      cofins_rate: 0,
    });
    setFormErrors({});
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedProduct(null);
    setFormData({
      sku: '',
      name: '',
      description: '',
      category_id: '',
      
      // Fiscal - NF-e SP
      ncm: '',
      cfop: '',
      cst: '',
      ean_gtin: '',
      unit: 'UN',
      origin: '0',
      
      // ICMS detalhado
      icms_cst: '',
      icms_base_calc: 0,
      icms_reduction: 0,
      
      // IPI
      ipi_cst: '',
      ipi_rate: 0,
      
      // PIS/COFINS detalhado
      pis_cst: '',
      cofins_cst: '',
      
      // Preços e margem
      cost_price: 0,
      sale_price: 0,
      margin_type: 'manual',
      margin_percentage: 0,
      use_category_margin: false,
      
      // Estoque
      stock_quantity: 0,
      min_stock: 0,
      
      // Impostos (compatibilidade)
      icms_rate: 0,
      pis_rate: 0,
      cofins_rate: 0,
    });
    setFormErrors({});
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'success';
      case 'baixo': return 'warning';
      case 'zerado': return 'error';
      default: return 'default';
    }
  };

  const getStockStatusLabel = (status: string) => {
    switch (status) {
      case 'normal': return 'Normal';
      case 'baixo': return 'Baixo';
      case 'zerado': return 'Zerado';
      default: return 'N/A';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {total} produtos encontrados
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Filtros: {filters.status === 'active' ? 'Ativos' : filters.status === 'inactive' ? 'Inativos' : 'Todos'}
            {filters.stock_status && ` • Estoque: ${getStockStatusLabel(filters.stock_status)}`}
          </Typography>
        </Box>
        <PermissionGuard resource="products" action="create">
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setModalOpen(true)}
          >
            Novo Produto
          </Button>
        </PermissionGuard>
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
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Buscar por nome, SKU ou descrição..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              size="small"
              InputProps={{
                startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
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
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Estoque</InputLabel>
              <Select
                value={filters.stock_status}
                onChange={(e) => setFilters(prev => ({ ...prev, stock_status: e.target.value as any }))}
                label="Estoque"
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="baixo">Baixo</MenuItem>
                <MenuItem value="zerado">Zerado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
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
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'sku'}
                  direction={sortBy === 'sku' ? sortOrder : 'asc'}
                  onClick={() => handleRequestSort('sku')}
                >
                  SKU
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'name'}
                  direction={sortBy === 'name' ? sortOrder : 'asc'}
                  onClick={() => handleRequestSort('name')}
                >
                  Nome
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'category_name'}
                  direction={sortBy === 'category_name' ? sortOrder : 'asc'}
                  onClick={() => handleRequestSort('category_name')}
                >
                  Categoria
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'sale_price'}
                  direction={sortBy === 'sale_price' ? sortOrder : 'asc'}
                  onClick={() => handleRequestSort('sale_price')}
                >
                  Preço Venda
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'stock_quantity'}
                  direction={sortBy === 'stock_quantity' ? sortOrder : 'asc'}
                  onClick={() => handleRequestSort('stock_quantity')}
                >
                  Estoque
                </TableSortLabel>
              </TableCell>
              <TableCell>Status Estoque</TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'is_active'}
                  direction={sortBy === 'is_active' ? sortOrder : 'asc'}
                  onClick={() => handleRequestSort('is_active')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {product.sku}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {product.name}
                    </Typography>
                    {product.description && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {product.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {product.category_name || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="primary.main" fontWeight="medium">
                      {formatCurrency(product.sale_price)}
                    </Typography>
                    {product.margin_percentage && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Margem: {product.margin_percentage.toFixed(1)}%
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {product.stock_quantity || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Min: {product.min_stock || 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStockStatusLabel(product.stock_status)}
                      size="small"
                      color={getStockStatusColor(product.stock_status) as any}
                      icon={product.stock_status === 'zerado' ? <Warning /> : <Inventory2 />}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={product.is_active ? 'Ativo' : 'Inativo'}
                      size="small"
                      color={product.is_active ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" gap={0.5}>
                      <IconButton
                        size="small"
                        onClick={() => handleView(product)}
                        title="Visualizar produto"
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                      <PermissionGuard resource="products" action="edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(product)}
                          title="Editar produto"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </PermissionGuard>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleStatus(product)}
                        title={product.is_active ? 'Inativar produto' : 'Ativar produto'}
                        color={product.is_active ? 'warning' : 'success'}
                      >
                        {product.is_active ? <ToggleOff fontSize="small" /> : <ToggleOn fontSize="small" />}
                      </IconButton>
                      {product.is_active && (
                        <PermissionGuard resource="products" action="delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(product)}
                            title="Inativar produto"
                            color="warning"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </PermissionGuard>
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
        maxWidth="md"
        fullWidth
        PaperProps={{
          component: 'form',
          onSubmit: handleCreateProduct,
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Novo Produto</Typography>
            <IconButton onClick={handleCloseModal} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <ProductForm
            formData={formData}
            setFormData={setFormData}
            formErrors={formErrors}
            categories={categories}
          />
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
            {formLoading ? 'Salvando...' : 'Salvar Produto'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Editar */}
      <Dialog
        open={editModalOpen}
        onClose={handleCloseEditModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          component: 'form',
          onSubmit: handleUpdateProduct,
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Editar Produto</Typography>
            <IconButton onClick={handleCloseEditModal} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <ProductForm
            formData={formData}
            setFormData={setFormData}
            formErrors={formErrors}
            categories={categories}
          />
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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Detalhes do Produto</Typography>
            <IconButton onClick={() => setViewModalOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedProduct && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  SKU
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {selectedProduct.sku}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Nome
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {selectedProduct.name}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Descrição
                </Typography>
                <Typography variant="body1">
                  {selectedProduct.description || 'Não informado'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Categoria
                </Typography>
                <Typography variant="body1">
                  {selectedProduct.category_name || 'Não informado'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Preço de Custo
                </Typography>
                <Typography variant="body1">
                  {selectedProduct.cost_price ? formatCurrency(selectedProduct.cost_price) : 'Não informado'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Preço de Venda
                </Typography>
                <Typography variant="body1" color="primary.main" fontWeight="medium">
                  {formatCurrency(selectedProduct.sale_price)}
                </Typography>
              </Grid>
              {selectedProduct.margin_percentage && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Margem
                  </Typography>
                  <Typography variant="body1">
                    {selectedProduct.margin_percentage.toFixed(1)}% ({formatCurrency(selectedProduct.margin_value || 0)})
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Estoque Atual
                </Typography>
                <Typography variant="body1">
                  {selectedProduct.stock_quantity || 0}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Estoque Mínimo
                </Typography>
                <Typography variant="body1">
                  {selectedProduct.min_stock || 0}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status do Estoque
                </Typography>
                <Chip
                  label={getStockStatusLabel(selectedProduct.stock_status)}
                  color={getStockStatusColor(selectedProduct.stock_status) as any}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  NCM
                </Typography>
                <Typography variant="body1">
                  {selectedProduct.ncm || 'Não informado'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  CFOP
                </Typography>
                <Typography variant="body1">
                  {selectedProduct.cfop || 'Não informado'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  CST
                </Typography>
                <Typography variant="body1">
                  {selectedProduct.cst || 'Não informado'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  ICMS (%)
                </Typography>
                <Typography variant="body1">
                  {selectedProduct.icms_rate || 0}%
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  PIS (%)
                </Typography>
                <Typography variant="body1">
                  {selectedProduct.pis_rate || 0}%
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  COFINS (%)
                </Typography>
                <Typography variant="body1">
                  {selectedProduct.cofins_rate || 0}%
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={selectedProduct.is_active ? 'Ativo' : 'Inativo'}
                  color={selectedProduct.is_active ? 'success' : 'error'}
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Criado em
                </Typography>
                <Typography variant="body2">
                  {formatDate(selectedProduct.created_at)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Atualizado em
                </Typography>
                <Typography variant="body2">
                  {formatDate(selectedProduct.updated_at)}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewModalOpen(false)}>
            Fechar
          </Button>
          <PermissionGuard resource="products" action="edit">
            {selectedProduct && (
              <Button
                variant="contained"
                onClick={() => {
                  setViewModalOpen(false);
                  setTimeout(() => handleEdit(selectedProduct), 100);
                }}
              >
                Editar Produto
              </Button>
            )}
          </PermissionGuard>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Inativar Produto"
        message={
          productToDelete 
            ? `Tem certeza que deseja inativar o produto "${productToDelete.name}"?\n\nO produto passará para o status "Inativo" e não aparecerá na listagem padrão. Você pode reativá-lo a qualquer momento usando o botão de alternância de status.`
            : ''
        }
        confirmText="Inativar Produto"
        cancelText="Cancelar"
        confirmColor="warning"
        loading={deleteLoading}
      />
    </Box>
  );
};