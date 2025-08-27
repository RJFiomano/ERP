import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ShoppingCart,
  Payment,
  Receipt,
  Add,
  Remove,
  Delete,
  Clear,
  Person,
  LocalAtm,
} from '@mui/icons-material';
import { BarcodeScanner } from '@/components/barcode/BarcodeScanner';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { NFEModal } from '@/components/nfe/NFEModal';
import { toast } from 'react-toastify';

interface ScannedProduct {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
  document: string;
  phone?: string;
}

export const FastSaleInterface: React.FC = () => {
  const [cartItems, setCartItems] = useState<ScannedProduct[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showNFEModal, setShowNFEModal] = useState(false);
  const [discount, setDiscount] = useState<number>(0);
  const [saleCompleted, setSaleCompleted] = useState(false);
  const [currentSaleId, setCurrentSaleId] = useState<string>('');

  // Refs para controle de foco
  const customerSearchRef = useRef<HTMLInputElement>(null);

  // Carrega clientes mock
  useEffect(() => {
    const mockCustomers: Customer[] = [
      { id: '1', name: 'João Silva', document: '123.456.789-00', phone: '(11) 99999-9999' },
      { id: '2', name: 'Maria Santos', document: '987.654.321-00', phone: '(11) 88888-8888' },
      { id: '3', name: 'Pedro Oliveira', document: '456.789.123-00', phone: '(11) 77777-7777' },
      { id: '4', name: 'Ana Costa', document: '789.123.456-00', phone: '(11) 66666-6666' },
    ];
    setCustomers(mockCustomers);
  }, []);

  const handleProductsScanned = (products: ScannedProduct[]) => {
    // Atualização automática conforme produtos são escaneados
  };

  const handleAddToCart = (products: ScannedProduct[]) => {
    const updatedCart = [...cartItems];
    
    products.forEach(newProduct => {
      const existingIndex = updatedCart.findIndex(item => item.barcode === newProduct.barcode);
      
      if (existingIndex >= 0) {
        // Adiciona à quantidade existente
        updatedCart[existingIndex].quantity += newProduct.quantity;
      } else {
        // Adiciona novo produto
        updatedCart.push({ ...newProduct });
      }
    });
    
    setCartItems(updatedCart);
  };

  const updateCartItemQuantity = (barcode: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeCartItem(barcode);
      return;
    }

    const updatedCart = cartItems.map(item => {
      if (item.barcode === barcode) {
        const maxQty = item.stock;
        const qty = Math.min(newQuantity, maxQty);
        return { ...item, quantity: qty };
      }
      return item;
    });
    
    setCartItems(updatedCart);
  };

  const removeCartItem = (barcode: string) => {
    const updatedCart = cartItems.filter(item => item.barcode !== barcode);
    setCartItems(updatedCart);
    toast.info('Produto removido do carrinho');
  };

  const clearCart = () => {
    setCartItems([]);
    setSelectedCustomer(null);
    setDiscount(0);
    toast.info('Carrinho limpo');
  };

  const getSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getDiscountAmount = () => {
    return getSubtotal() * (discount / 100);
  };

  const getTotalAmount = () => {
    return getSubtotal() - getDiscountAmount();
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.document.includes(customerSearch) ||
    (customer.phone && customer.phone.includes(customerSearch))
  );

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDialog(false);
    setCustomerSearch('');
  };

  const handleProcessSale = async () => {
    if (cartItems.length === 0) {
      toast.error('Carrinho vazio');
      return;
    }

    // Simula processamento da venda
    const saleData = {
      customer: selectedCustomer,
      items: cartItems,
      subtotal: getSubtotal(),
      discount: getDiscountAmount(),
      total: getTotalAmount(),
    };

    try {
      // Aqui seria a chamada para a API real
      const response = await fetch('/api/sales/quick-sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(saleData),
      });

      // Mock de resposta bem-sucedida
      const mockSaleId = `SALE-${Date.now()}`;
      setCurrentSaleId(mockSaleId);
      setSaleCompleted(true);
      
      toast.success('Venda processada com sucesso!');
      setShowPaymentModal(true);
    } catch (error) {
      toast.error('Erro ao processar venda');
    }
  };

  const handlePaymentSuccess = (paymentData: any) => {
    toast.success('Pagamento aprovado! Venda finalizada.');
    setShowPaymentModal(false);
    
    // Opção para gerar NF-e
    setTimeout(() => {
      if (window.confirm('Deseja gerar a NF-e?')) {
        setShowNFEModal(true);
      } else {
        // Finaliza e limpa tudo
        clearCart();
        setSaleCompleted(false);
        setCurrentSaleId('');
      }
    }, 1000);
  };

  const handleNFEComplete = () => {
    setShowNFEModal(false);
    clearCart();
    setSaleCompleted(false);
    setCurrentSaleId('');
    toast.success('Venda finalizada com sucesso!');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Venda Rápida - Leitor de Código de Barras
      </Typography>

      <Grid container spacing={3}>
        {/* Leitor de Código de Barras */}
        <Grid item xs={12} md={6}>
          <BarcodeScanner
            onProductsScanned={handleProductsScanned}
            onAddToCart={handleAddToCart}
          />
        </Grid>

        {/* Carrinho de Compras */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center">
                  <ShoppingCart sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6">
                    Carrinho de Compras
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
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Clear />}
                  onClick={clearCart}
                  disabled={cartItems.length === 0}
                >
                  Limpar
                </Button>
              </Box>

              {cartItems.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <ShoppingCart sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                  <Typography color="textSecondary">
                    Carrinho vazio. Escaneie produtos para adicionar.
                  </Typography>
                </Box>
              ) : (
                <>
                  <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {cartItems.map((item) => (
                      <ListItem key={item.barcode} divider>
                        <ListItemText
                          primary={item.name}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                {formatCurrency(item.price)} × {item.quantity}
                              </Typography>
                              <Typography variant="body2" color="primary">
                                {formatCurrency(item.price * item.quantity)}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box display="flex" alignItems="center" gap={1}>
                            <IconButton
                              size="small"
                              onClick={() => updateCartItemQuantity(item.barcode, item.quantity - 1)}
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
                              {item.quantity}
                            </Typography>
                            
                            <IconButton
                              size="small"
                              onClick={() => updateCartItemQuantity(item.barcode, item.quantity + 1)}
                              disabled={item.quantity >= item.stock}
                            >
                              <Add />
                            </IconButton>
                            
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeCartItem(item.barcode)}
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>

                  <Divider sx={{ my: 2 }} />

                  {/* Cliente */}
                  <Box mb={2}>
                    <Button
                      variant="outlined"
                      startIcon={<Person />}
                      onClick={() => setShowCustomerDialog(true)}
                      fullWidth
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      {selectedCustomer ? selectedCustomer.name : 'Selecionar Cliente (Opcional)'}
                    </Button>
                  </Box>

                  {/* Desconto */}
                  <Box mb={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Desconto (%)"
                      value={discount}
                      onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                      size="small"
                    />
                  </Box>

                  {/* Totais */}
                  <Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Subtotal:</Typography>
                      <Typography>{formatCurrency(getSubtotal())}</Typography>
                    </Box>
                    
                    {discount > 0 && (
                      <Box display="flex" justifyContent="space-between" color="text.secondary">
                        <Typography>Desconto ({discount}%):</Typography>
                        <Typography>-{formatCurrency(getDiscountAmount())}</Typography>
                      </Box>
                    )}
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="h6">Total:</Typography>
                      <Typography variant="h6" color="primary">
                        {formatCurrency(getTotalAmount())}
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<Payment />}
                    onClick={handleProcessSale}
                    sx={{ mt: 2 }}
                    disabled={cartItems.length === 0}
                  >
                    Processar Venda
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Modal de Seleção de Cliente */}
      <Dialog 
        open={showCustomerDialog} 
        onClose={() => setShowCustomerDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Selecionar Cliente</DialogTitle>
        <DialogContent>
          <TextField
            ref={customerSearchRef}
            fullWidth
            label="Buscar cliente"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="Nome, CPF ou telefone"
            autoFocus
            sx={{ mb: 2 }}
          />
          
          <List>
            {filteredCustomers.map((customer) => (
              <ListItem 
                key={customer.id} 
                button 
                onClick={() => handleSelectCustomer(customer)}
              >
                <ListItemText
                  primary={customer.name}
                  secondary={`${customer.document} ${customer.phone ? `• ${customer.phone}` : ''}`}
                />
              </ListItem>
            ))}
          </List>
          
          {filteredCustomers.length === 0 && customerSearch && (
            <Alert severity="info">
              Nenhum cliente encontrado. A venda pode prosseguir sem cliente.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCustomerDialog(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => {
              setSelectedCustomer(null);
              setShowCustomerDialog(false);
            }}
            variant="outlined"
          >
            Venda sem Cliente
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Pagamento */}
      <PaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={getTotalAmount()}
        customerData={selectedCustomer}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Modal de NF-e */}
      <NFEModal
        open={showNFEModal}
        onClose={handleNFEComplete}
        saleOrderId={currentSaleId}
        customerData={selectedCustomer}
      />
    </Box>
  );
};