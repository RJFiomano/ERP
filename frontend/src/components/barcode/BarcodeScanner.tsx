import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Typography,
  Card,
  CardContent,
  IconButton,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Chip,
} from '@mui/material';
import {
  QrCodeScanner,
  Add,
  Remove,
  Delete,
  Clear,
  ShoppingCart,
} from '@mui/icons-material';
import { toast } from 'react-toastify';

interface ScannedProduct {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  quantity: number;
}

interface BarcodeScannerProps {
  onProductsScanned?: (products: ScannedProduct[]) => void;
  onAddToCart?: (products: ScannedProduct[]) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onProductsScanned,
  onAddToCart,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scanTimeoutRef = useRef<number>();

  // Auto-focus no campo de entrada quando componente carrega
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Limpa timeout quando componente desmonta
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  const searchProductByBarcode = async (barcode: string): Promise<ScannedProduct | null> => {
    try {
      // Produtos mock para demonstração (dados diretos)
      const mockProducts: { [key: string]: Omit<ScannedProduct, 'quantity'> } = {
        '7891000100103': {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Coca-Cola 350ml',
          barcode: '7891000100103',
          price: 3.50,
          stock: 100,
        },
        '7891000100110': {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Pepsi 350ml',
          barcode: '7891000100110',
          price: 3.25,
          stock: 85,
        },
        '7891000100127': {
          id: '550e8400-e29b-41d4-a716-446655440003',
          name: 'Água Mineral 500ml',
          barcode: '7891000100127',
          price: 2.00,
          stock: 200,
        },
        '7891000100134': {
          id: '550e8400-e29b-41d4-a716-446655440004',
          name: 'Suco de Laranja 1L',
          barcode: '7891000100134',
          price: 4.75,
          stock: 50,
        },
      };

      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 300));

      const mockProduct = mockProducts[barcode];
      if (mockProduct) {
        return { ...mockProduct, quantity: 1 };
      }

      return null;
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      return null;
    }
  };

  const handleBarcodeSubmit = async (barcode: string) => {
    if (!barcode.trim()) return;

    setLoading(true);
    setError('');
    setIsScanning(true);

    try {
      const product = await searchProductByBarcode(barcode.trim());

      if (product) {
        // Verifica se produto já foi escaneado
        const existingIndex = scannedProducts.findIndex(p => p.barcode === barcode);
        
        if (existingIndex >= 0) {
          // Incrementa quantidade se produto já existe
          const updatedProducts = [...scannedProducts];
          const currentQty = updatedProducts[existingIndex].quantity;
          const maxQty = updatedProducts[existingIndex].stock;
          
          if (currentQty < maxQty) {
            updatedProducts[existingIndex].quantity += 1;
            setScannedProducts(updatedProducts);
            toast.success(`${product.name} - Quantidade: ${updatedProducts[existingIndex].quantity}`);
          } else {
            toast.warning(`Estoque insuficiente para ${product.name}`);
          }
        } else {
          // Adiciona novo produto
          const newProducts = [...scannedProducts, product];
          setScannedProducts(newProducts);
          toast.success(`Produto adicionado: ${product.name}`);
        }

        // Notifica componente pai
        onProductsScanned?.(scannedProducts);
      } else {
        setError(`Produto não encontrado para o código: ${barcode}`);
        toast.error('Produto não encontrado');
      }
    } catch (error) {
      setError('Erro ao buscar produto');
      toast.error('Erro ao buscar produto');
    } finally {
      setLoading(false);
      setBarcodeInput('');
      
      // Para o indicador de escaneamento após um breve delay
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      scanTimeoutRef.current = setTimeout(() => {
        setIsScanning(false);
      }, 1000);

      // Retorna foco para o campo
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleBarcodeSubmit(barcodeInput);
    }
  };

  const updateQuantity = (barcode: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeProduct(barcode);
      return;
    }

    const updatedProducts = scannedProducts.map(product => {
      if (product.barcode === barcode) {
        const maxQty = product.stock;
        const qty = Math.min(newQuantity, maxQty);
        return { ...product, quantity: qty };
      }
      return product;
    });
    
    setScannedProducts(updatedProducts);
    onProductsScanned?.(updatedProducts);
  };

  const removeProduct = (barcode: string) => {
    const updatedProducts = scannedProducts.filter(p => p.barcode !== barcode);
    setScannedProducts(updatedProducts);
    onProductsScanned?.(updatedProducts);
    toast.info('Produto removido');
  };

  const clearAll = () => {
    setScannedProducts([]);
    setError('');
    onProductsScanned?.([]);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleAddToCart = () => {
    if (scannedProducts.length === 0) {
      toast.warning('Nenhum produto escaneado');
      return;
    }

    onAddToCart?.(scannedProducts);
    toast.success(`${scannedProducts.length} produtos adicionados ao carrinho`);
    clearAll();
  };

  const getTotalValue = () => {
    return scannedProducts.reduce((total, product) => 
      total + (product.price * product.quantity), 0
    );
  };

  const getTotalItems = () => {
    return scannedProducts.reduce((total, product) => total + product.quantity, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Box>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <QrCodeScanner 
              sx={{ 
                mr: 2, 
                color: isScanning ? 'primary.main' : 'action.active',
                animation: isScanning ? 'pulse 1s infinite' : 'none'
              }} 
            />
            <Typography variant="h6">
              Leitor de Código de Barras
            </Typography>
            {getTotalItems() > 0 && (
              <Chip 
                label={`${getTotalItems()} itens`}
                color="primary"
                size="small"
                sx={{ ml: 2 }}
              />
            )}
          </Box>

          <TextField
            ref={inputRef}
            fullWidth
            label="Escaneie ou digite o código de barras"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            placeholder="Posicione o cursor aqui e escaneie o produto"
            autoFocus
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: barcodeInput && (
                <IconButton onClick={() => handleBarcodeSubmit(barcodeInput)}>
                  <Add />
                </IconButton>
              ),
            }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" color="textSecondary" gutterBottom>
            💡 Dica: Mantenha o foco neste campo e escaneie os produtos. 
            Pressione Enter ou clique em + para adicionar manualmente.
          </Typography>
        </CardContent>
      </Card>

      {scannedProducts.length > 0 && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Produtos Escaneados
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Clear />}
                  onClick={clearAll}
                >
                  Limpar
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<ShoppingCart />}
                  onClick={handleAddToCart}
                >
                  Adicionar ao Carrinho
                </Button>
              </Box>
            </Box>

            <List dense>
              {scannedProducts.map((product) => (
                <ListItem key={product.barcode} divider>
                  <ListItemText
                    primary={product.name}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          Código: {product.barcode}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Preço: {formatCurrency(product.price)} | 
                          Estoque: {product.stock} unidades
                        </Typography>
                        <Typography variant="body2" color="primary">
                          Total: {formatCurrency(product.price * product.quantity)}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box display="flex" alignItems="center" gap={1}>
                      <IconButton
                        size="small"
                        onClick={() => updateQuantity(product.barcode, product.quantity - 1)}
                      >
                        <Remove />
                      </IconButton>
                      
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          minWidth: '20px', 
                          textAlign: 'center',
                          fontWeight: 'bold'
                        }}
                      >
                        {product.quantity}
                      </Typography>
                      
                      <IconButton
                        size="small"
                        onClick={() => updateQuantity(product.barcode, product.quantity + 1)}
                        disabled={product.quantity >= product.stock}
                      >
                        <Add />
                      </IconButton>
                      
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeProduct(product.barcode)}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            <Box 
              display="flex" 
              justifyContent="space-between" 
              alignItems="center"
              sx={{ 
                mt: 2, 
                pt: 2, 
                borderTop: '1px solid',
                borderColor: 'divider' 
              }}
            >
              <Typography variant="h6">
                Total: {formatCurrency(getTotalValue())}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'itens'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Produtos de exemplo para teste */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Códigos de Teste (para demonstração):
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {[
              { code: '7891000100103', name: 'Coca-Cola' },
              { code: '7891000100110', name: 'Pepsi' },
              { code: '7891000100127', name: 'Água' },
              { code: '7891000100134', name: 'Suco' },
            ].map((item) => (
              <Chip
                key={item.code}
                label={`${item.name}: ${item.code}`}
                size="small"
                clickable
                onClick={() => {
                  setBarcodeInput(item.code);
                  handleBarcodeSubmit(item.code);
                }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};