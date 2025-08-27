import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  InputAdornment,
  Grid,
  Autocomplete,
} from '@mui/material';
import { Search, Add, Inventory } from '@mui/icons-material';
import { Product } from '@/types/product';
import { productsAPI } from '@/services/api';

interface ProductSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product, quantity: number, unitPrice: number) => void;
  selectedProductIds?: string[]; // Produtos já selecionados no pedido
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  open,
  onClose,
  onSelectProduct,
  selectedProductIds = [],
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);

  useEffect(() => {
    if (open) {
      loadProducts();
    }
  }, [open]);

  useEffect(() => {
    filterProducts();
  }, [products, search]);

  useEffect(() => {
    if (selectedProduct) {
      setUnitPrice(selectedProduct.sale_price);
    }
  }, [selectedProduct]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await productsAPI.getProducts({
        limit: 1000,
        status: 'active',  // Usar status em vez de is_active
      });
      setProducts(data);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    if (!search.trim()) {
      setFilteredProducts(products);
      return;
    }

    const searchLower = search.toLowerCase();
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchLower) ||
      product.sku.toLowerCase().includes(searchLower) ||
      (product.description && product.description.toLowerCase().includes(searchLower))
    );
    setFilteredProducts(filtered);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setUnitPrice(product.sale_price);
  };

  const handleConfirmSelection = () => {
    if (selectedProduct && quantity > 0 && unitPrice > 0) {
      onSelectProduct(selectedProduct, quantity, unitPrice);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setUnitPrice(0);
    setSearch('');
    onClose();
  };

  const getStockStatus = (product: Product) => {
    const stock = product.stock_quantity || 0;
    const minStock = product.min_stock || 0;

    if (stock === 0) {
      return { color: 'error' as const, label: 'Sem estoque' };
    } else if (stock <= minStock) {
      return { color: 'warning' as const, label: 'Estoque baixo' };
    } else {
      return { color: 'success' as const, label: 'Em estoque' };
    }
  };

  const isProductAlreadySelected = (productId: string) => {
    return selectedProductIds.includes(productId);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: '90vh' } }}
    >
      <DialogTitle>
        <Typography variant="h6">Selecionar Produto</Typography>
      </DialogTitle>

      <DialogContent dividers>
        {/* Busca */}
        <Box mb={3}>
          <TextField
            fullWidth
            label="Buscar produtos"
            placeholder="Digite o nome, SKU ou descrição do produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Grid container spacing={3}>
          {/* Lista de Produtos */}
          <Grid item xs={12} md={selectedProduct ? 6 : 12}>
            <Paper sx={{ height: 400, overflow: 'auto' }}>
              <TableContainer>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>SKU</TableCell>
                      <TableCell>Nome</TableCell>
                      <TableCell align="center">Estoque</TableCell>
                      <TableCell align="right">Preço</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          Carregando produtos...
                        </TableCell>
                      </TableRow>
                    ) : filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          Nenhum produto encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => {
                        const stockStatus = getStockStatus(product);
                        const isSelected = isProductAlreadySelected(product.id);
                        
                        return (
                          <TableRow
                            key={product.id}
                            hover
                            selected={selectedProduct?.id === product.id}
                            sx={{
                              opacity: isSelected ? 0.6 : 1,
                              '&:hover': {
                                cursor: 'pointer'
                              }
                            }}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {product.sku}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {product.name}
                                </Typography>
                                {product.description && (
                                  <Typography variant="caption" color="textSecondary">
                                    {product.description.slice(0, 100)}
                                    {product.description.length > 100 ? '...' : ''}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                                <Inventory fontSize="small" color="action" />
                                <Typography variant="body2">
                                  {product.stock_quantity || 0}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="medium">
                                {formatPrice(product.sale_price)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                size="small"
                                label={stockStatus.label}
                                color={stockStatus.color}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                onClick={() => handleSelectProduct(product)}
                                disabled={isSelected || (product.stock_quantity || 0) === 0}
                                color="primary"
                              >
                                <Add />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Detalhes do Produto Selecionado */}
          {selectedProduct && (
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  Adicionar Item
                </Typography>

                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary">
                    Produto Selecionado:
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedProduct.sku} - {selectedProduct.name}
                  </Typography>
                </Box>

                <Box mb={3}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Estoque Disponível:
                      </Typography>
                      <Typography variant="h6" color="primary">
                        {selectedProduct.stock_quantity || 0} {selectedProduct.unit}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Preço de Venda:
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {formatPrice(selectedProduct.sale_price)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                <Box mb={2}>
                  <TextField
                    fullWidth
                    label="Quantidade"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseFloat(e.target.value) || 1))}
                    inputProps={{
                      min: 1,
                      max: selectedProduct.stock_quantity || 0,
                      step: selectedProduct.unit === 'UN' ? 1 : 0.001,
                    }}
                    helperText={`Máximo: ${selectedProduct.stock_quantity} ${selectedProduct.unit}`}
                  />
                </Box>

                <Box mb={2}>
                  <TextField
                    fullWidth
                    label="Preço Unitário"
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    inputProps={{
                      min: 0,
                      step: 0.01,
                    }}
                    helperText="Você pode alterar o preço se necessário"
                  />
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary">
                    Total do Item:
                  </Typography>
                  <Typography variant="h5" color="primary">
                    {formatPrice(quantity * unitPrice)}
                  </Typography>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleConfirmSelection}
                  disabled={quantity <= 0 || unitPrice <= 0 || quantity > (selectedProduct.stock_quantity || 0)}
                  startIcon={<Add />}
                >
                  Adicionar ao Pedido
                </Button>
              </Paper>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
};