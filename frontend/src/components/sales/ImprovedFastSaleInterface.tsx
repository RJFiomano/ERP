import React, { useState, useEffect, useRef, useImperativeHandle } from 'react';
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
  Select,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Badge,
  Fab,
  LinearProgress,
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
  QrCodeScanner,
  Search,
  Speed,
  Savings,
  AttachMoney,
  CreditCard,
} from '@mui/icons-material';
import { UnifiedProductSearch } from '@/components/sales/UnifiedProductSearch';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { NFEModal } from '@/components/nfe/NFEModal';
import { quickSalesAPI, setupAPI, clientsAPI } from '@/services/api';
import { toast } from 'react-toastify';

interface ScannedProduct {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  quantity: number;
  image?: string;
  category?: string;
}

interface Customer {
  id: string;
  name: string;
  document: string;
  phone?: string;
  email?: string;
  totalPurchases?: number;
  lastPurchase?: string;
}

export const ImprovedFastSaleInterface = React.forwardRef<any, {}>((props, ref) => {
  const [cartItems, setCartItems] = useState<ScannedProduct[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showNFEModal, setShowNFEModal] = useState(false);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'value'>('percentage');
  const [saleCompleted, setSaleCompleted] = useState(false);
  const [currentSaleId, setCurrentSaleId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClienteAvulso, setIsClienteAvulso] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogProps, setConfirmDialogProps] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  // Refs para atalhos de teclado
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const productSearchRef = useRef<HTMLInputElement>(null);
  const discountRef = useRef<HTMLInputElement>(null);
  const mainBoxRef = useRef<HTMLDivElement>(null);

  // Expor métodos para componente pai
  useImperativeHandle(ref, () => ({
    getCartState: () => ({
      cartItems,
      selectedCustomer,
      discount,
      discountType,
      isClienteAvulso
    }),
    setCartState: (state: {
      cartItems?: ScannedProduct[];
      selectedCustomer?: Customer | null;
      discount?: number;
      discountType?: 'percentage' | 'value';
      isClienteAvulso?: boolean;
    }) => {
      if (state.cartItems !== undefined) setCartItems(state.cartItems);
      if (state.selectedCustomer !== undefined) setSelectedCustomer(state.selectedCustomer);
      if (state.discount !== undefined) setDiscount(state.discount);
      if (state.discountType !== undefined) setDiscountType(state.discountType);
      if (state.isClienteAvulso !== undefined) setIsClienteAvulso(state.isClienteAvulso);
    },
    clearCart: () => {
      setCartItems([]);
      setSelectedCustomer(null);
      setDiscount(0);
      setDiscountType('percentage');
      setIsClienteAvulso(false);
    }
  }));

  // Carregar clientes reais do banco de dados
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const clientsData = await clientsAPI.getClients({
          status: 'active',
          limit: 100
        });
        
        // Mapear dados da API para formato do componente
        const mappedCustomers: Customer[] = clientsData.map(client => ({
          id: client.id,
          name: client.name,
          document: client.document,
          phone: client.phones?.[0]?.number || undefined,
          email: client.email || undefined,
          totalPurchases: 0, // Será calculado futuramente
          lastPurchase: undefined // Será calculado futuramente
        }));
        
        setCustomers(mappedCustomers);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        toast.error('Erro ao carregar lista de clientes');
        // Em caso de erro, definir lista vazia ao invés de dados mock
        setCustomers([]);
      }
    };
    
    loadCustomers();
    
    // Focar no Box principal para capturar eventos de teclado
    setTimeout(() => {
      if (mainBoxRef.current) {
        mainBoxRef.current.focus();
        console.log('Box principal focado para capturar F3');
      }
    }, 500);
  }, []);

  // Atalhos de teclado - captura global
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignorar eventos se estiver em input que não seja o nosso sistema
      const target = e.target as HTMLElement;
      const isInModal = target.closest('[role="dialog"]') !== null;
      const isOurInput = target.closest('.MuiTextField-root') !== null;
      
      // Só processar se não estiver em modal externo ou se for F3
      if (!isInModal || e.key === 'F3') {
        console.log('Tecla capturada globalmente:', e.key, 'Target:', target.tagName);
        
        // F1 - Selecionar cliente
        if (e.key === 'F1') {
          e.preventDefault();
          e.stopPropagation();
          console.log('F1 acionado globalmente');
          setShowCustomerDialog(true);
        }
        // F2 - Selecionar produto  
        if (e.key === 'F2') {
          e.preventDefault();
          e.stopPropagation();
          console.log('F2 acionado globalmente');
          setShowProductDialog(true);
        }
        // F3 - Aplicar desconto (sempre funciona)
        if (e.key === 'F3') {
          e.preventDefault();
          e.stopPropagation();
          console.log('F3 global - forçando foco no desconto');
          
          if (discountRef.current) {
            const realInput = discountRef.current.querySelector('input') as HTMLInputElement;
            if (realInput) {
              realInput.focus();
              realInput.select();
              console.log('F3: Foco forçado com sucesso');
            }
          }
        }
        // F4 - Finalizar venda
        if (e.key === 'F4' && cartItems.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          console.log('F4 acionado globalmente');
          handleFinalizeSale();
        }
        // ESC - Limpar carrinho
        if (e.key === 'Escape' && !isInModal) {
          e.preventDefault();
          e.stopPropagation();
          console.log('ESC acionado globalmente');
          if (cartItems.length > 0) {
            handleClearCart();
          }
        }
      }
    };

    // Capturar na fase de captura (antes de outros elementos)
    document.addEventListener('keydown', handleKeyPress, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyPress, { capture: true });
  }, [cartItems]);

  // Cálculos da venda
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = discountType === 'percentage' 
    ? (subtotal * discount) / 100 
    : discount;
  const total = subtotal - discountAmount;
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddToCart = (products: ScannedProduct[]) => {
    const updatedCart = [...cartItems];
    let addedCount = 0;
    
    products.forEach(newProduct => {
      // Usar ID do produto como identificador principal, fallback para barcode
      const existingIndex = updatedCart.findIndex(item => 
        (item.id === newProduct.id && item.id) || 
        (item.barcode === newProduct.barcode && item.barcode)
      );
      
      if (existingIndex >= 0) {
        // Produto já existe no carrinho, aumentar quantidade
        updatedCart[existingIndex].quantity += newProduct.quantity;
        addedCount++;
      } else {
        // Novo produto, adicionar ao carrinho
        updatedCart.push({ ...newProduct });
        addedCount++;
      }
    });
    
    setCartItems(updatedCart);
    
    if (addedCount === 1) {
      toast.success(`${products[0].name} adicionado ao carrinho!`);
    } else {
      toast.success(`${addedCount} produtos adicionados ao carrinho!`);
    }
  };

  const handleUpdateQuantity = (productId: string, barcode: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId, barcode);
      return;
    }
    
    setCartItems(prev => 
      prev.map(item => 
        (item.id === productId && item.id) || (item.barcode === barcode && item.barcode)
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string, barcode: string) => {
    setCartItems(prev => prev.filter(item => 
      !((item.id === productId && item.id) || (item.barcode === barcode && item.barcode))
    ));
    toast.info('Produto removido do carrinho');
  };

  const handleClearCart = () => {
    showConfirmation(
      'Limpar Carrinho',
      'Deseja limpar todo o carrinho? Esta ação não pode ser desfeita.',
      () => {
        setCartItems([]);
        setSelectedCustomer(null);
        setIsClienteAvulso(false);
        setDiscount(0);
        toast.info('Carrinho limpo');
      }
    );
  };

  const handleFinalizeSale = () => {
    if (cartItems.length === 0) {
      toast.error('Carrinho vazio');
      return;
    }
    setShowPaymentModal(true);
  };

  const handleQuickPayment = async (_paymentType: 'cash' | 'card' | 'pix') => {
    setIsProcessing(true);
    
    try {
      // Preparar dados para venda completa (salvamento no banco)
      const saleData = {
        client_id: selectedCustomer?.id,
        items: cartItems.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          icms_amount: item.price * item.quantity * 0.18, // 18% ICMS
          pis_amount: item.price * item.quantity * 0.0165, // 1.65% PIS
          cofins_amount: item.price * item.quantity * 0.076, // 7.6% COFINS
        })),
        discount_type: discountType,
        discount_value: discount,
        shipping_cost: 0,
        payment_terms: "cash",
        notes: `Venda rápida PDV - ${_paymentType.toUpperCase()}`,
        payment: {
          method: _paymentType,
          amount: total,
          installments: 1,
          authorization_code: `PDV${Date.now().toString().slice(-6)}`
        }
      };

      // Processa venda completa via API
      const responseData = await quickSalesAPI.processCompleteSale(saleData);
      
      if (responseData.success) {
        setIsProcessing(false);
        setSaleCompleted(true);
        setCurrentSaleId(responseData.data.sale_id);
        toast.success(`Venda ${responseData.data.order_number} salva no banco de dados!`);
      } else {
        throw new Error(responseData.detail || responseData.message || 'Erro ao processar venda');
      }
    } catch (error: any) {
      setIsProcessing(false);
      
      const errorMessage = error.message || 'Erro ao processar venda';
      toast.error(errorMessage);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.document.includes(customerSearch) ||
    customer.phone?.includes(customerSearch)
  );

  // Função para mostrar modal de confirmação personalizado
  const showConfirmation = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    setConfirmDialogProps({
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setShowConfirmDialog(false);
        setConfirmDialogProps(null);
      },
      onCancel: onCancel ? () => {
        onCancel();
        setShowConfirmDialog(false);
        setConfirmDialogProps(null);
      } : () => {
        setShowConfirmDialog(false);
        setConfirmDialogProps(null);
      }
    });
    setShowConfirmDialog(true);
  };

  const handleClienteAvulso = () => {
    setSelectedCustomer(null);
    setIsClienteAvulso(true);
    setShowCustomerDialog(false);
    setCustomerSearch('');
    toast.success('Venda para consumidor final selecionada');
    // Garantir que o foco retorne ao scanner após fechar o modal
    setTimeout(() => {
      productSearchRef.current?.focus();
    }, 100);
  };

  const handleCancelarModal = () => {
    setShowCustomerDialog(false);
    setCustomerSearch('');
    // Garantir que o foco retorne ao scanner após fechar o modal
    setTimeout(() => {
      productSearchRef.current?.focus();
    }, 100);
  };

  const handleCancelarProductModal = () => {
    setShowProductDialog(false);
  };

  const handleProductSelect = (product: any) => {
    const cartProduct: ScannedProduct = {
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      price: product.price,
      stock: product.stock,
      quantity: 1,
      category: product.category
    };
    handleAddToCart([cartProduct]);
    setShowProductDialog(false);
  };

  return (
    <Box 
      ref={mainBoxRef}
      sx={{ height: 'calc(100vh - 200px)', outline: 'none' }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'F3') {
          e.preventDefault();
          e.stopPropagation();
          console.log('F3 capturado no Box principal da venda');
          if (discountRef.current) {
            discountRef.current.focus();
            discountRef.current.select();
            console.log('Foco aplicado via Box listener');
          }
        }
      }}
    >
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* Coluna Esquerda - Scanner e Busca */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
            {/* Busca Unificada - Scanner + Texto */}
            <Card sx={{ flexShrink: 0 }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Box display="flex" alignItems="center" sx={{ mr: 2 }}>
                    <QrCodeScanner sx={{ mr: 1, color: 'primary.main' }} />
                    <Search sx={{ color: 'secondary.main' }} />
                  </Box>
                  <Typography variant="h6">Scanner & Busca</Typography>
                  <Chip label="F2" size="small" sx={{ ml: 'auto' }} />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Escaneie o código de barras ou digite o nome do produto
                </Typography>
                <UnifiedProductSearch
                  ref={productSearchRef}
                  autoFocus={false}
                  onProductSelect={(product) => {
                    const cartProduct: ScannedProduct = {
                      id: product.id,
                      name: product.name,
                      barcode: product.barcode,
                      price: product.price,
                      stock: product.stock,
                      quantity: 1,
                      category: product.category
                    };
                    handleAddToCart([cartProduct]);
                  }}
                />
              </CardContent>
            </Card>

            {/* Seleção de Cliente */}
            <Card sx={{ flexShrink: 0 }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Person sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6">Cliente</Typography>
                  <Chip label="F1" size="small" sx={{ ml: 'auto' }} />
                </Box>
                
                {selectedCustomer ? (
                  <Box>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Avatar sx={{ mr: 2, bgcolor: 'success.main' }}>
                        {selectedCustomer.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">{selectedCustomer.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {selectedCustomer.document}
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      size="small"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setIsClienteAvulso(false);
                      }}
                      startIcon={<Clear />}
                    >
                      Remover
                    </Button>
                  </Box>
                ) : isClienteAvulso ? (
                  <Box>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Avatar sx={{ mr: 2, bgcolor: 'info.main' }}>
                        CF
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">Consumidor Final</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Venda sem identificação do cliente
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      size="small"
                      onClick={() => setIsClienteAvulso(false)}
                      startIcon={<Clear />}
                    >
                      Remover
                    </Button>
                  </Box>
                ) : (
                  <TextField
                    fullWidth
                    size="small"
                    ref={customerSearchRef}
                    placeholder="Clique para selecionar cliente..."
                    value="Cliente não selecionado"
                    readOnly
                    onClick={(e) => {
                      e.stopPropagation();
                      // Remove foco do scanner antes de abrir modal
                      productSearchRef.current?.blur();
                      setShowCustomerDialog(true);
                    }}
                    onKeyDown={(e) => {
                      // Só abre o modal se o usuário pressionar Enter ou espaço, não no Tab
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        productSearchRef.current?.blur();
                        setShowCustomerDialog(true);
                      }
                    }}
                    sx={{
                      cursor: 'pointer',
                      '& .MuiInputBase-input': {
                        cursor: 'pointer'
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Ações Rápidas */}
            <Card sx={{ flexGrow: 1 }}>
              <CardContent>
                <Typography variant="h6" mb={2}>Ações Rápidas</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<Speed />}
                      disabled={cartItems.length === 0}
                      onClick={handleFinalizeSale}
                    >
                      F4 - Finalizar
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<Clear />}
                      onClick={handleClearCart}
                      disabled={cartItems.length === 0}
                    >
                      ESC - Limpar
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* Coluna Central - Carrinho */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center">
                  <ShoppingCart sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6">Carrinho</Typography>
                  <Badge badgeContent={totalItems} color="primary" sx={{ ml: 2 }} />
                </Box>
                
                {cartItems.length > 0 && (
                  <IconButton onClick={handleClearCart} color="error" size="small">
                    <Delete />
                  </IconButton>
                )}
              </Box>

              {cartItems.length === 0 ? (
                <Box 
                  sx={{ 
                    flexGrow: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'text.secondary' 
                  }}
                >
                  <ShoppingCart sx={{ fontSize: 64, mb: 2 }} />
                  <Typography variant="h6">Carrinho Vazio</Typography>
                  <Typography variant="body2">
                    Escaneie ou busque produtos para começar
                  </Typography>
                </Box>
              ) : (
                <List sx={{ flexGrow: 1, overflow: 'auto' }}>
                  {cartItems.map((item, index) => (
                    <ListItem key={`${item.id}-${item.barcode}-${index}`} divider>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1" noWrap>
                            {item.name}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Código: {item.barcode}
                            </Typography>
                            <Box display="flex" alignItems="center" mt={1}>
                              <IconButton 
                                size="small"
                                onClick={() => handleUpdateQuantity(item.id, item.barcode, item.quantity - 1)}
                              >
                                <Remove />
                              </IconButton>
                              <Typography variant="body1" sx={{ mx: 2, minWidth: 40, textAlign: 'center' }}>
                                {item.quantity}
                              </Typography>
                              <IconButton 
                                size="small"
                                onClick={() => handleUpdateQuantity(item.id, item.barcode, item.quantity + 1)}
                              >
                                <Add />
                              </IconButton>
                              <Typography variant="body1" sx={{ ml: 2, fontWeight: 'bold' }}>
                                R$ {(item.price * item.quantity).toFixed(2)}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          onClick={() => handleRemoveFromCart(item.id, item.barcode)}
                          color="error"
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Coluna Direita - Resumo e Pagamento */}
        <Grid item xs={12} lg={3}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
            {/* Resumo da Venda */}
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>Resumo</Typography>
                
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Subtotal ({totalItems} itens):</Typography>
                  <Typography>R$ {subtotal.toFixed(2)}</Typography>
                </Box>
                
                {/* Desconto */}
                <Box mb={2}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Savings sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="subtitle2">Desconto</Typography>
                    <Chip label="F3" size="small" sx={{ ml: 'auto' }} />
                  </Box>
                  <Box display="flex" gap={1}>
                    <TextField
                      ref={discountRef}
                      size="small"
                      type="number"
                      value={discount}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (value >= 0) {
                          setDiscount(value);
                        }
                      }}
                      inputProps={{ min: 0, step: "any" }}
                      sx={{ width: 80 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 70 }}>
                      <Select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'value')}
                      >
                        <MenuItem value="percentage">%</MenuItem>
                        <MenuItem value="value">R$</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  {discountAmount > 0 && (
                    <Typography variant="caption" color="success.main">
                      Economia: R$ {discountAmount.toFixed(2)}
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />
                
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" color="primary.main">
                    R$ {total.toFixed(2)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Métodos de Pagamento Rápido */}
            {cartItems.length > 0 && (
              <Card sx={{ flexGrow: 1 }}>
                <CardContent>
                  <Typography variant="h6" mb={2}>Pagamento Rápido</Typography>
                  
                  {isProcessing && (
                    <Box mb={2}>
                      <Typography variant="body2" mb={1}>Processando venda...</Typography>
                      <LinearProgress />
                    </Box>
                  )}

                  <Box display="flex" flexDirection="column" gap={2}>
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={<LocalAtm />}
                      onClick={() => handleQuickPayment('cash')}
                      disabled={isProcessing}
                      sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
                    >
                      Dinheiro
                    </Button>
                    
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={<CreditCard />}
                      onClick={() => handleQuickPayment('card')}
                      disabled={isProcessing}
                      sx={{ bgcolor: 'info.main', '&:hover': { bgcolor: 'info.dark' } }}
                    >
                      Cartão
                    </Button>
                    
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={<Payment />}
                      onClick={() => handleQuickPayment('pix')}
                      disabled={isProcessing}
                      sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
                    >
                      PIX
                    </Button>
                    
                    <Divider />
                    
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      startIcon={<AttachMoney />}
                      onClick={handleFinalizeSale}
                      disabled={isProcessing}
                    >
                      Mais Opções
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Floating Action Button para vendas em dispositivos móveis */}
      {cartItems.length > 0 && (
        <Fab
          color="primary"
          size="large"
          onClick={handleFinalizeSale}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            display: { xs: 'flex', lg: 'none' }
          }}
        >
          <Payment />
        </Fab>
      )}

      {/* Dialog de Seleção de Cliente */}
      <Dialog 
        open={showCustomerDialog} 
        onClose={handleCancelarModal}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={false}
        sx={{ 
          zIndex: 1400,
          '& .MuiDialog-paper': {
            zIndex: 1401
          }
        }}
      >
        <DialogTitle>Selecionar Cliente</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Buscar cliente por nome, CPF ou telefone"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            margin="normal"
            autoFocus
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
          
          <List>
            {filteredCustomers.map((customer) => (
              <ListItem
                key={customer.id}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => {
                  setSelectedCustomer(customer);
                  setShowCustomerDialog(false);
                  setCustomerSearch('');
                  // Retornar foco ao scanner
                  setTimeout(() => {
                    productSearchRef.current?.focus();
                  }, 100);
                }}
              >
                <Avatar sx={{ mr: 2 }}>
                  {customer.name.charAt(0)}
                </Avatar>
                <ListItemText
                  primary={customer.name}
                  secondary={`${customer.document} • ${customer.phone}`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              handleCancelarModal();
            }}
            color="inherit"
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              handleClienteAvulso();
            }}
            variant="contained"
            color="primary"
          >
            Cliente Avulso
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Seleção de Produto */}
      <Dialog 
        open={showProductDialog} 
        onClose={handleCancelarProductModal}
        maxWidth="md"
        fullWidth
        onTransitionEnd={() => {
          // Força foco no input após o modal abrir completamente
          if (showProductDialog) {
            setTimeout(() => {
              const input = document.querySelector('#product-search-input') as HTMLInputElement;
              if (input) {
                input.focus();
              }
            }, 100);
          }
        }}
        sx={{ 
          zIndex: 1400,
          '& .MuiDialog-paper': {
            zIndex: 1401
          }
        }}
      >
        <DialogTitle>Selecionar Produto</DialogTitle>
        <DialogContent>
          <UnifiedProductSearch
            placeholder="Digite o nome ou código do produto..."
            autoFocus={true}
            showPopularOnMount={true}
            onProductSelect={handleProductSelect}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCancelarProductModal}
            color="inherit"
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modais */}
      {showPaymentModal && (
        <PaymentModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          amount={total}
          customerData={selectedCustomer}
          onPaymentSuccess={(paymentData: any) => {
            setSaleCompleted(true);
            setCurrentSaleId(paymentData.saleId || 'unknown');
            setShowPaymentModal(false);
            toast.success('Pagamento processado com sucesso!');
          }}
        />
      )}

      {showNFEModal && (
        <NFEModal
          open={showNFEModal}
          onClose={() => setShowNFEModal(false)}
          saleId={currentSaleId}
          customerData={selectedCustomer}
        />
      )}

      {/* Sucesso da Venda */}
      {saleCompleted && (
        <Dialog open={saleCompleted} onClose={() => setSaleCompleted(false)}>
          <DialogContent sx={{ textAlign: 'center', py: 4 }}>
            <Receipt sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" mb={2}>
              Venda Finalizada!
            </Typography>
            <Typography variant="body1" mb={3}>
              Venda #{currentSaleId} processada com sucesso
            </Typography>
            <Box display="flex" gap={2} justifyContent="center">
              <Button 
                variant="outlined" 
                onClick={() => setShowNFEModal(true)}
              >
                Imprimir NFE
              </Button>
              <Button 
                variant="contained"
                onClick={() => {
                  setSaleCompleted(false);
                  setCartItems([]);
                  setSelectedCustomer(null);
                  setIsClienteAvulso(false);
                  setDiscount(0);
                  setCurrentSaleId('');
                }}
              >
                Nova Venda
              </Button>
            </Box>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Confirmação Personalizado */}
      {showConfirmDialog && confirmDialogProps && (
        <Dialog 
          open={showConfirmDialog} 
          onClose={confirmDialogProps.onCancel}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{confirmDialogProps.title}</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              {confirmDialogProps.message}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={confirmDialogProps.onCancel}
              color="inherit"
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmDialogProps.onConfirm}
              variant="contained"
              color="error"
            >
              Confirmar
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
});