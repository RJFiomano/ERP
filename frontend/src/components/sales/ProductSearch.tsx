import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Chip,
  Paper,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import { Search, Add, Inventory } from '@mui/icons-material';

interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  category?: string;
  image?: string;
}

interface ProductSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onProductSelect: (product: Product) => void;
  placeholder?: string;
  maxResults?: number;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({
  searchTerm,
  onSearchChange,
  onProductSelect,
  placeholder = "Buscar produto por nome, código ou código de barras",
  maxResults = 10
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Mock products - em produção viria de uma API
  useEffect(() => {
    const mockProducts: Product[] = [
      {
        id: '1',
        name: 'Coca-Cola 2L',
        barcode: '7894900011517',
        price: 8.50,
        stock: 45,
        category: 'Bebidas',
      },
      {
        id: '2',
        name: 'Pão de Açúcar Integral 500g',
        barcode: '7891234567890',
        price: 12.90,
        stock: 23,
        category: 'Padaria',
      },
      {
        id: '3',
        name: 'Sabonete Dove 90g',
        barcode: '7891150056749',
        price: 3.75,
        stock: 67,
        category: 'Higiene',
      },
      {
        id: '4',
        name: 'Arroz Tio João 5kg',
        barcode: '7891234098765',
        price: 28.90,
        stock: 12,
        category: 'Mercearia',
      },
      {
        id: '5',
        name: 'Leite Parmalat 1L',
        barcode: '7891122334455',
        price: 4.25,
        stock: 31,
        category: 'Laticínios',
      },
      {
        id: '6',
        name: 'Detergente Ypê 500ml',
        barcode: '7891098765432',
        price: 2.15,
        stock: 89,
        category: 'Limpeza',
      },
      {
        id: '7',
        name: 'Biscoito Oreo 144g',
        barcode: '7622210951359',
        price: 5.99,
        stock: 54,
        category: 'Biscoitos',
      },
      {
        id: '8',
        name: 'Shampoo Seda 325ml',
        barcode: '7891150033947',
        price: 15.90,
        stock: 28,
        category: 'Higiene',
      },
    ];
    setProducts(mockProducts);
  }, []);

  // Filtrar produtos baseado na busca
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setFilteredProducts([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    // Simular delay da API
    const searchTimeout = setTimeout(() => {
      const filtered = products
        .filter(product =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.barcode.includes(searchTerm) ||
          product.category?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, maxResults);
      
      setFilteredProducts(filtered);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchTerm, products, maxResults]);

  const handleProductClick = (product: Product) => {
    if (product.stock === 0) return;
    
    onProductSelect(product);
    onSearchChange(''); // Limpar busca após seleção
    
    // Feedback visual imediato
    const element = document.querySelector(`[data-product-id="${product.id}"]`);
    if (element) {
      element.classList.add('product-added-animation');
      setTimeout(() => {
        element.classList.remove('product-added-animation');
      }, 600);
    }
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      'Bebidas': 'primary',
      'Padaria': 'warning',
      'Higiene': 'info',
      'Mercearia': 'success',
      'Laticínios': 'secondary',
      'Limpeza': 'error',
      'Biscoitos': 'default',
    };
    return colors[category || ''] || 'default';
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Sem estoque', color: 'error' as const };
    if (stock < 10) return { label: 'Estoque baixo', color: 'warning' as const };
    return { label: `${stock} em estoque`, color: 'success' as const };
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <TextField
        fullWidth
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search color="action" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 1 }}
      />

      {/* Resultados da busca */}
      {searchTerm && (
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: 400,
            overflow: 'auto',
          }}
        >
          {isSearching ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">Buscando...</Typography>
            </Box>
          ) : filteredProducts.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Nenhum produto encontrado
              </Typography>
            </Box>
          ) : (
            <List dense>
              {filteredProducts.map((product, index) => {
                const stockStatus = getStockStatus(product.stock);
                
                return (
                  <React.Fragment key={product.id}>
                    <ListItem
                      button
                      onClick={() => handleProductClick(product)}
                      disabled={product.stock === 0}
                      data-product-id={product.id}
                      sx={{
                        '&:hover': {
                          bgcolor: product.stock === 0 ? 'inherit' : 'success.50',
                        },
                        cursor: product.stock === 0 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        '&.product-added-animation': {
                          bgcolor: 'success.main',
                          color: 'white',
                          transform: 'scale(1.02)',
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'grey.300' }}>
                          <Inventory />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle2" noWrap>
                              {product.name}
                            </Typography>
                            {product.category && (
                              <Chip
                                label={product.category}
                                size="small"
                                color={getCategoryColor(product.category) as any}
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Código: {product.barcode}
                            </Typography>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mt={0.5}>
                              <Typography variant="body2" fontWeight="bold">
                                R$ {product.price.toFixed(2)}
                              </Typography>
                              <Chip
                                label={stockStatus.label}
                                size="small"
                                color={stockStatus.color}
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        }
                      />
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        color: product.stock === 0 ? 'text.disabled' : 'success.main',
                        fontSize: 12,
                        fontWeight: 'bold',
                        ml: 2
                      }}>
                        {product.stock === 0 ? 'INDISPONÍVEL' : '+ ADICIONAR'}
                      </Box>
                    </ListItem>
                    {index < filteredProducts.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </Paper>
      )}
    </Box>
  );
};