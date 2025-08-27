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
  Autocomplete,
  InputLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  Home,
  Business,
  Email,
  Phone,
  Calculate,
} from '@mui/icons-material';
import { UnifiedProductSearch } from '@/components/sales/UnifiedProductSearch';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { NFEModal } from '@/components/nfe/NFEModal';
import { quickSalesAPI, setupAPI, clientsAPI, productsAPI } from '@/services/api';
import { toast } from 'react-toastify';

interface SaleProduct {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  quantity: number;
  subtotal: number;
  icms: number;
  pis: number;
  cofins: number;
  category?: string;
}

interface Customer {
  id: string;
  name: string;
  document: string;
  phone?: string;
  email?: string;
  address?: {
    street: string;
    number: string;
    city: string;
    state: string;
    zipcode: string;
  };
}

export const CompleteSaleInterface: React.FC = () => {
  const [saleItems, setSaleItems] = useState<SaleProduct[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showNFEModal, setShowNFEModal] = useState(false);
  
  // Detalhes da venda
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'value'>('percentage');
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<string>('cash');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  
  // Estados de controle
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSaleId, setCurrentSaleId] = useState<string>('');
  const [saleStatus, setSaleStatus] = useState<'draft' | 'confirmed' | 'invoiced'>('draft');

  // Refs
  const discountRef = useRef<HTMLInputElement>(null);

  // Carregar clientes
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const clientsData = await clientsAPI.getClients({
          status: 'active',
          limit: 100
        });
        
        const mappedCustomers: Customer[] = clientsData.map(client => ({
          id: client.id,
          name: client.name,
          document: client.document,
          phone: client.phones?.[0]?.number || undefined,
          email: client.email || undefined,
          address: client.addresses?.[0] ? {
            street: client.addresses[0].street,
            number: client.addresses[0].number,
            city: client.addresses[0].city,
            state: client.addresses[0].state,
            zipcode: client.addresses[0].zipcode
          } : undefined
        }));
        
        setCustomers(mappedCustomers);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        toast.error('Erro ao carregar lista de clientes');
        setCustomers([]);
      }
    };
    
    loadCustomers();
  }, []);

  // Atalhos de teclado para venda completa
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInModal = target.closest('[role="dialog"]') !== null;
      
      if (!isInModal || e.key === 'F3') {
        // F2 - Adicionar produto
        if (e.key === 'F2') {
          e.preventDefault();
          e.stopPropagation();
          setShowProductDialog(true);
        }
        
        // F3 - Aplicar desconto
        if (e.key === 'F3') {
          e.preventDefault();
          e.stopPropagation();
          if (discountRef.current) {
            const realInput = discountRef.current.querySelector('input') as HTMLInputElement;
            if (realInput) {
              realInput.focus();
              realInput.select();
            }
          }
        }
        
        // F4 - Finalizar venda
        if (e.key === 'F4' && saleItems.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          handleFinalizeSale();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyPress, { capture: true });
  }, [saleItems]);

  // Cálculos
  const subtotal = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
  const totalTaxes = saleItems.reduce((sum, item) => sum + item.icms + item.pis + item.cofins, 0);
  const discountAmount = discountType === 'percentage' 
    ? (subtotal * discount) / 100 
    : discount;
  const total = subtotal + shippingCost + totalTaxes - discountAmount;
  const totalItems = saleItems.reduce((sum, item) => sum + item.quantity, 0);

  // Adicionar produto à venda
  const handleAddProduct = (product: any) => {
    const existingItem = saleItems.find(item => item.id === product.id);
    
    if (existingItem) {
      setSaleItems(items => items.map(item => 
        item.id === product.id 
          ? { 
              ...item, 
              quantity: item.quantity + 1,
              subtotal: (item.quantity + 1) * item.price
            }
          : item
      ));
    } else {
      const newItem: SaleProduct = {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        price: product.price,
        stock: product.stock,
        quantity: 1,
        subtotal: product.price,
        icms: product.price * 0.18, // 18% exemplo
        pis: product.price * 0.0165, // 1.65% exemplo
        cofins: product.price * 0.076, // 7.6% exemplo
        category: product.category
      };
      setSaleItems([...saleItems, newItem]);
    }
    setShowProductDialog(false);
  };

  // Alterar quantidade
  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setSaleItems(items => items.filter(item => item.id !== productId));
    } else {
      setSaleItems(items => items.map(item => 
        item.id === productId 
          ? { 
              ...item, 
              quantity: newQuantity,
              subtotal: newQuantity * item.price,
              icms: newQuantity * item.price * 0.18,
              pis: newQuantity * item.price * 0.0165,
              cofins: newQuantity * item.price * 0.076
            }
          : item
      ));
    }
  };

  // Remover item
  const handleRemoveItem = (productId: string) => {
    setSaleItems(items => items.filter(item => item.id !== productId));
  };

  // Limpar venda
  const handleClearSale = () => {
    setSaleItems([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setShippingCost(0);
    setNotes('');
    setDeliveryDate('');
    setSaleStatus('draft');
  };

  // Finalizar venda
  const handleFinalizeSale = () => {
    if (saleItems.length === 0) {
      toast.error('Adicione pelo menos um produto à venda');
      return;
    }
    
    setShowPaymentModal(true);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 120px)' }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* Coluna Esquerda - Seleção de Produtos */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
            {/* Scanner & Busca Unificada */}
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
                
                <UnifiedProductSearch 
                  onProductSelect={handleAddProduct}
                  placeholder="Código de barras ou nome do produto"
                  maxResults={8}
                  autoFocus={true}
                  showPopularOnMount={false}
                />
              </CardContent>
            </Card>

            {/* Seleção de Cliente */}
            <Card sx={{ flexShrink: 0 }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Person sx={{ mr: 1, color: 'secondary.main' }} />
                  <Typography variant="h6">Cliente</Typography>
                </Box>
                
                <Autocomplete
                  options={customers}
                  getOptionLabel={(option) => `${option.name} - ${option.document}`}
                  value={selectedCustomer}
                  onChange={(_, newValue) => setSelectedCustomer(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Selecionar Cliente"
                      variant="outlined"
                      size="small"
                    />
                  )}
                />
                
                {selectedCustomer && (
                  <Box mt={2} p={1} bgcolor="grey.100" borderRadius={1}>
                    <Typography variant="subtitle2">{selectedCustomer.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {selectedCustomer.document}
                    </Typography>
                    {selectedCustomer.phone && (
                      <Typography variant="caption" display="block">
                        <Phone sx={{ fontSize: 12, mr: 0.5 }} />
                        {selectedCustomer.phone}
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Detalhes da Venda */}
            <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" mb={2}>Detalhes da Venda</Typography>
                
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
                        if (value >= 0) setDiscount(value);
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
                </Box>

                {/* Frete */}
                <Box mb={2}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <LocalAtm sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="subtitle2">Frete</Typography>
                  </Box>
                  <TextField
                    size="small"
                    type="number"
                    value={shippingCost}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (value >= 0) setShippingCost(value);
                    }}
                    inputProps={{ min: 0, step: "any" }}
                    InputProps={{
                      startAdornment: 'R$'
                    }}
                    fullWidth
                  />
                </Box>

                {/* Condições de Pagamento */}
                <Box mb={2}>
                  <Typography variant="subtitle2" mb={1}>Condições</Typography>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                    >
                      <MenuItem value="cash">À Vista</MenuItem>
                      <MenuItem value="30days">30 Dias</MenuItem>
                      <MenuItem value="60days">60 Dias</MenuItem>
                      <MenuItem value="installments">Parcelado</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Observações */}
                <Box mb={2}>
                  <Typography variant="subtitle2" mb={1}>Observações</Typography>
                  <TextField
                    multiline
                    rows={2}
                    size="small"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observações da venda..."
                    fullWidth
                  />
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* Coluna Direita - Carrinho e Totais */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Cabeçalho do Carrinho */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center">
                  <ShoppingCart sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    Itens da Venda ({totalItems})
                  </Typography>
                </Box>
                <Box>
                  <Chip 
                    label={`Status: ${saleStatus === 'draft' ? 'Rascunho' : saleStatus === 'confirmed' ? 'Confirmada' : 'Faturada'}`}
                    color={saleStatus === 'draft' ? 'default' : saleStatus === 'confirmed' ? 'primary' : 'success'}
                    size="small"
                  />
                </Box>
              </Box>

              {/* Lista de Produtos */}
              <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                {saleItems.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Produto</TableCell>
                          <TableCell align="center">Qtd</TableCell>
                          <TableCell align="right">Unit.</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell align="right">Impostos</TableCell>
                          <TableCell align="center">Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {saleItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {item.name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {item.barcode}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Box display="flex" alignItems="center" justifyContent="center">
                                <IconButton 
                                  size="small"
                                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                >
                                  <Remove fontSize="small" />
                                </IconButton>
                                <Typography variant="body2" sx={{ mx: 1, minWidth: 20, textAlign: 'center' }}>
                                  {item.quantity}
                                </Typography>
                                <IconButton 
                                  size="small"
                                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                >
                                  <Add fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              R$ {item.price.toFixed(2)}
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="medium">
                                R$ {item.subtotal.toFixed(2)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="caption" color="textSecondary">
                                R$ {(item.icms + item.pis + item.cofins).toFixed(2)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box 
                    display="flex" 
                    flexDirection="column" 
                    alignItems="center" 
                    justifyContent="center"
                    sx={{ height: 200, color: 'text.secondary' }}
                  >
                    <ShoppingCart sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                    <Typography variant="body1">
                      Nenhum produto adicionado
                    </Typography>
                    <Typography variant="caption">
                      Use F2 ou clique em "Buscar Produto" para adicionar
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Resumo Financeiro - Sempre visível */}
              <Box 
                sx={{ 
                  position: 'sticky',
                  bottom: 0,
                  backgroundColor: 'background.paper',
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  pt: 2,
                  mt: 2,
                  zIndex: 1
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Subtotal: R$ {subtotal.toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Impostos: R$ {totalTaxes.toFixed(2)}
                      </Typography>
                      {discount > 0 && (
                        <Typography variant="body2" color="error.main">
                          Desconto: -R$ {discountAmount.toFixed(2)}
                        </Typography>
                      )}
                      {shippingCost > 0 && (
                        <Typography variant="body2" color="textSecondary">
                          Frete: R$ {shippingCost.toFixed(2)}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box textAlign="right">
                      <Typography variant="h5" fontWeight="bold" color="primary.main">
                        Total: R$ {total.toFixed(2)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Botões de Ação */}
                <Box display="flex" gap={2} mt={2}>
                  <Button
                    variant="outlined"
                    onClick={handleClearSale}
                    disabled={saleItems.length === 0}
                    startIcon={<Clear />}
                  >
                    Limpar
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleFinalizeSale}
                    disabled={saleItems.length === 0 || isProcessing}
                    startIcon={<Payment />}
                    sx={{ flexGrow: 1 }}
                  >
                    Finalizar Venda (F4)
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Modal de Busca de Produtos */}
      <Dialog 
        open={showProductDialog} 
        onClose={() => setShowProductDialog(false)}
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
      >
        <DialogTitle>Selecionar Produto</DialogTitle>
        <DialogContent>
          <UnifiedProductSearch 
            onProductSelect={handleAddProduct}
            showPopularOnMount={true}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowProductDialog(false)}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Pagamento */}
      {showPaymentModal && (
        <PaymentModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          amount={total}
          customerData={selectedCustomer}
          onPaymentSuccess={async (paymentData: any) => {
            try {
              setIsProcessing(true);
              
              // Preparar dados da venda completa
              const saleData = {
                client_id: selectedCustomer?.id,
                items: saleItems.map(item => ({
                  product_id: item.id,
                  quantity: item.quantity,
                  unit_price: item.price,
                  icms_amount: item.icms,
                  pis_amount: item.pis,
                  cofins_amount: item.cofins
                })),
                discount_type: discountType,
                discount_value: discount,
                shipping_cost: shippingCost,
                payment_terms: paymentTerms,
                delivery_date: deliveryDate || undefined,
                notes: notes || undefined,
                payment: {
                  method: paymentData.method,
                  amount: paymentData.amount,
                  installments: paymentData.installments || 1,
                  authorization_code: paymentData.authorization_code,
                  transaction_id: paymentData.payment_id,
                  card_brand: paymentData.card_brand,
                  card_last_digits: paymentData.card_last_digits
                }
              };
              
              // Salvar venda completa
              const result = await quickSalesAPI.processCompleteSale(saleData);
              
              if (result.success) {
                setCurrentSaleId(result.data.sale_id);
                setShowPaymentModal(false);
                setSaleStatus('confirmed');
                toast.success('Venda criada e salva no banco de dados!');
                
                // Limpar formulário após sucesso
                setTimeout(() => {
                  handleClearSale();
                }, 2000);
              } else {
                throw new Error(result.message || 'Erro ao salvar venda');
              }
            } catch (error) {
              console.error('Erro ao processar venda completa:', error);
              toast.error('Erro ao salvar venda no banco de dados');
            } finally {
              setIsProcessing(false);
            }
          }}
        />
      )}
    </Box>
  );
};