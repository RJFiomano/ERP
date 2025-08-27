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
  Grid,
  Autocomplete,
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
  Paper,
  IconButton,
  Chip,
  Divider,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import { Add, Delete, Calculate, Person, LocalShipping, Payment } from '@mui/icons-material';
import { CreateSaleOrderRequest, PaymentMethod, PAYMENT_METHOD_LABELS, SaleOrderItem } from '@/types/saleOrder';
import { Client } from '@/types/client';
import { Product } from '@/types/product';
import { clientsAPI, saleOrdersAPI } from '@/services/api';
import { ProductSelector } from '@/components/common/ProductSelector';

interface CreateSaleOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateSaleOrderModal: React.FC<CreateSaleOrderModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<CreateSaleOrderRequest>({
    client_id: '',
    payment_method: PaymentMethod.CASH,
    items: [],
  });
  
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [items, setItems] = useState<SaleOrderItem[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  
  // Totais calculados
  const [totals, setTotals] = useState({
    subtotal: 0,
    discount: 0,
    icms: 0,
    pis: 0,
    cofins: 0,
    totalTaxes: 0,
    total: 0,
  });

  useEffect(() => {
    if (open) {
      loadClients();
    }
  }, [open]);

  useEffect(() => {
    calculateTotals();
  }, [items, formData.discount_percent, formData.discount_amount]);

  const loadClients = async () => {
    try {
      const data = await clientsAPI.getClients({ limit: 1000, status: 'active' });
      setClients(data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.net_total || 0), 0);
    
    const discountPercent = formData.discount_percent || 0;
    const discountAmount = formData.discount_amount || 0;
    const additionalDiscount = (subtotal * discountPercent / 100) + discountAmount;
    
    const netSubtotal = subtotal - additionalDiscount;
    
    const icms = items.reduce((sum, item) => sum + (item.icms_amount || 0), 0);
    const pis = items.reduce((sum, item) => sum + (item.pis_amount || 0), 0);
    const cofins = items.reduce((sum, item) => sum + (item.cofins_amount || 0), 0);
    const totalTaxes = icms + pis + cofins;
    
    const total = netSubtotal + totalTaxes;

    setTotals({
      subtotal: netSubtotal,
      discount: additionalDiscount,
      icms,
      pis,
      cofins,
      totalTaxes,
      total,
    });
  };

  const handleClientChange = (client: Client | null) => {
    setSelectedClient(client);
    setFormData(prev => ({
      ...prev,
      client_id: client?.id || '',
    }));
  };

  const handleAddProduct = async (product: Product, quantity: number, unitPrice: number) => {
    try {
      // Simular cálculo de impostos
      const taxSimulation = await saleOrdersAPI.simulateTaxes({
        product_id: product.id,
        quantity,
        unit_price: unitPrice,
        client_id: formData.client_id || undefined,
      });

      const grossTotal = quantity * unitPrice;
      const netTotal = grossTotal; // Sem desconto individual por enquanto

      const newItem: SaleOrderItem = {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        product_unit: product.unit,
        quantity,
        unit_price: unitPrice,
        discount_percent: 0,
        discount_amount: 0,
        gross_total: grossTotal,
        net_total: netTotal,
        icms_rate: taxSimulation.taxes.icms.rate,
        pis_rate: taxSimulation.taxes.pis.rate,
        cofins_rate: taxSimulation.taxes.cofins.rate,
        icms_amount: taxSimulation.taxes.icms.amount,
        pis_amount: taxSimulation.taxes.pis.amount,
        cofins_amount: taxSimulation.taxes.cofins.amount,
      };

      setItems(prev => [...prev, newItem]);
    } catch (error) {
      console.error('Erro ao calcular impostos:', error);
      setErrors(['Erro ao calcular impostos para o produto']);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) return;

    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;

      const grossTotal = newQuantity * item.unit_price;
      const netTotal = grossTotal - (item.discount_amount || 0);

      // Recalcular impostos proporcionalmente
      const ratio = newQuantity / item.quantity;
      
      return {
        ...item,
        quantity: newQuantity,
        gross_total: grossTotal,
        net_total: netTotal,
        icms_amount: (item.icms_amount || 0) * ratio,
        pis_amount: (item.pis_amount || 0) * ratio,
        cofins_amount: (item.cofins_amount || 0) * ratio,
      };
    }));
  };

  const handleSubmit = async () => {
    setErrors([]);
    
    // Validações
    const validationErrors: string[] = [];
    
    if (!formData.client_id) {
      validationErrors.push('Selecione um cliente');
    }
    
    if (items.length === 0) {
      validationErrors.push('Adicione pelo menos um produto ao pedido');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const orderData: CreateSaleOrderRequest = {
        ...formData,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent || 0,
          discount_amount: item.discount_amount || 0,
        })),
      };

      await saleOrdersAPI.createSaleOrder(orderData);
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Erro ao criar pedido:', error);
      setErrors([error.response?.data?.detail || 'Erro ao criar pedido']);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      client_id: '',
      payment_method: PaymentMethod.CASH,
      items: [],
    });
    setSelectedClient(null);
    setItems([]);
    setErrors([]);
    onClose();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getSelectedProductIds = () => {
    return items.map(item => item.product_id);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { height: '95vh' } }}
      >
        <DialogTitle>
          <Typography variant="h5">Novo Pedido de Venda</Typography>
        </DialogTitle>

        <DialogContent dividers>
          {/* Erros */}
          {errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Informações do Cliente */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Person sx={{ mr: 1 }} />
                    <Typography variant="h6">Cliente</Typography>
                  </Box>

                  <Autocomplete
                    options={clients}
                    getOptionLabel={(option) => `${option.name} - ${option.document}`}
                    value={selectedClient}
                    onChange={(_, value) => handleClientChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Selecionar Cliente"
                        fullWidth
                        required
                        error={!formData.client_id && errors.length > 0}
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <Box>
                          <Typography variant="body1">{option.name}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {option.document} • {option.email || 'Sem email'}
                          </Typography>
                        </Box>
                      </li>
                    )}
                  />

                  {selectedClient && (
                    <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
                      <Typography variant="body2">
                        <strong>Cliente:</strong> {selectedClient.name}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Documento:</strong> {selectedClient.document}
                      </Typography>
                      {selectedClient.email && (
                        <Typography variant="body2">
                          <strong>Email:</strong> {selectedClient.email}
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Informações de Pagamento e Entrega */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Payment sx={{ mr: 1 }} />
                    <Typography variant="h6">Pagamento & Entrega</Typography>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Forma de Pagamento</InputLabel>
                        <Select
                          value={formData.payment_method}
                          onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value as PaymentMethod }))}
                          label="Forma de Pagamento"
                        >
                          {Object.values(PaymentMethod).map((method) => (
                            <MenuItem key={method} value={method}>
                              {PAYMENT_METHOD_LABELS[method]}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Data de Entrega"
                        type="date"
                        value={formData.delivery_date || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Endereço de Entrega"
                        multiline
                        rows={2}
                        value={formData.delivery_address || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_address: e.target.value }))}
                        placeholder="Deixe vazio para usar endereço cadastrado do cliente"
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Vendedor"
                        value={formData.seller_name || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, seller_name: e.target.value }))}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Itens do Pedido */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">Itens do Pedido</Typography>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setShowProductSelector(true)}
                      disabled={!formData.client_id}
                    >
                      Adicionar Produto
                    </Button>
                  </Box>

                  {items.length === 0 ? (
                    <Box textAlign="center" py={4}>
                      <Typography color="textSecondary">
                        Nenhum produto adicionado ao pedido
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {!formData.client_id ? 'Selecione um cliente primeiro' : 'Clique em "Adicionar Produto" para começar'}
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Produto</TableCell>
                            <TableCell align="center">Qtd</TableCell>
                            <TableCell align="right">Preço Unit.</TableCell>
                            <TableCell align="right">Total Bruto</TableCell>
                            <TableCell align="right">ICMS</TableCell>
                            <TableCell align="right">PIS</TableCell>
                            <TableCell align="right">COFINS</TableCell>
                            <TableCell align="right">Total Líq.</TableCell>
                            <TableCell align="center">Ações</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2" fontWeight="medium">
                                    {item.product_name}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    SKU: {item.product_sku}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <TextField
                                  size="small"
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItemQuantity(index, parseFloat(e.target.value) || 1)}
                                  inputProps={{ min: 1, step: item.product_unit === 'UN' ? 1 : 0.001 }}
                                  sx={{ width: 80 }}
                                />
                              </TableCell>
                              <TableCell align="right">
                                {formatCurrency(item.unit_price)}
                              </TableCell>
                              <TableCell align="right">
                                {formatCurrency(item.gross_total || 0)}
                              </TableCell>
                              <TableCell align="right">
                                <Box textAlign="right">
                                  <Typography variant="body2">
                                    {formatCurrency(item.icms_amount || 0)}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    ({item.icms_rate || 0}%)
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                <Box textAlign="right">
                                  <Typography variant="body2">
                                    {formatCurrency(item.pis_amount || 0)}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    ({item.pis_rate || 0}%)
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                <Box textAlign="right">
                                  <Typography variant="body2">
                                    {formatCurrency(item.cofins_amount || 0)}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    ({item.cofins_rate || 0}%)
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body1" fontWeight="medium">
                                  {formatCurrency(item.net_total || 0)}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  onClick={() => handleRemoveItem(index)}
                                  color="error"
                                >
                                  <Delete />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Desconto e Totais */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Desconto e Totais
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Desconto (%)"
                            type="number"
                            value={formData.discount_percent || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, discount_percent: parseFloat(e.target.value) || undefined }))}
                            inputProps={{ min: 0, max: 100, step: 0.01 }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Desconto (R$)"
                            type="number"
                            value={formData.discount_amount || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: parseFloat(e.target.value) || undefined }))}
                            inputProps={{ min: 0, step: 0.01 }}
                          />
                        </Grid>
                      </Grid>

                      <Box mt={2}>
                        <TextField
                          fullWidth
                          label="Observações"
                          multiline
                          rows={3}
                          value={formData.notes || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        />
                      </Box>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="h6" gutterBottom>
                          Resumo do Pedido
                        </Typography>

                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography>Subtotal:</Typography>
                          <Typography>{formatCurrency(totals.subtotal + totals.discount)}</Typography>
                        </Box>

                        {totals.discount > 0 && (
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography color="error">Desconto:</Typography>
                            <Typography color="error">-{formatCurrency(totals.discount)}</Typography>
                          </Box>
                        )}

                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography>Subtotal Líquido:</Typography>
                          <Typography fontWeight="medium">{formatCurrency(totals.subtotal)}</Typography>
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">ICMS:</Typography>
                          <Typography variant="body2">{formatCurrency(totals.icms)}</Typography>
                        </Box>

                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">PIS:</Typography>
                          <Typography variant="body2">{formatCurrency(totals.pis)}</Typography>
                        </Box>

                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">COFINS:</Typography>
                          <Typography variant="body2">{formatCurrency(totals.cofins)}</Typography>
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        <Box display="flex" justifyContent="space-between" mb={2}>
                          <Typography variant="h6" color="primary">
                            Total Geral:
                          </Typography>
                          <Typography variant="h6" color="primary">
                            {formatCurrency(totals.total)}
                          </Typography>
                        </Box>

                        <Chip
                          icon={<Calculate />}
                          label={`${items.length} item(ns)`}
                          color="info"
                          size="small"
                        />
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || items.length === 0 || !formData.client_id}
          >
            {loading ? 'Criando...' : 'Criar Pedido'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Product Selector Modal */}
      <ProductSelector
        open={showProductSelector}
        onClose={() => setShowProductSelector(false)}
        onSelectProduct={handleAddProduct}
        selectedProductIds={getSelectedProductIds()}
      />
    </>
  );
};