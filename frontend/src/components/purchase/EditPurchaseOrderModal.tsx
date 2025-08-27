import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { api } from '@/services/api';
import { PurchaseOrderCreate, PurchaseOrderItemCreate } from '@/types/purchase';

interface EditPurchaseOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orderId: string;
}

export const EditPurchaseOrderModal: React.FC<EditPurchaseOrderModalProps> = ({
  open,
  onClose,
  onSuccess,
  orderId,
}) => {
  const [formData, setFormData] = useState<PurchaseOrderCreate>({
    supplier_id: '',
    delivery_date: '',
    payment_terms: 'a_vista',
    delivery_location: '',
    notes: '',
    urgency: 'normal',
    status: 'rascunho',
    items: [],
  });

  const [newItem, setNewItem] = useState<PurchaseOrderItemCreate & { product_name?: string }>({
    product_id: '',
    quantity: 0,
    notes: '',
  });

  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const queryClient = useQueryClient();
  const productSelectRef = useRef<HTMLInputElement>(null);

  // Buscar dados do pedido
  const { data: orderResponse, isLoading: orderLoading } = useQuery({
    queryKey: ['purchase-order-details', orderId],
    queryFn: async () => {
      const response = await api.get(`/purchase/orders/${orderId}`);
      return response.data;
    },
    enabled: open && !!orderId,
  });

  // Buscar fornecedores
  const { data: suppliersResponse } = useQuery({
    queryKey: ['purchase-suppliers'],
    queryFn: async () => {
      const response = await api.get('/purchase/suppliers');
      return response.data;
    },
    enabled: open,
  });

  // Buscar produtos
  const { data: productsResponse } = useQuery({
    queryKey: ['purchase-products'],
    queryFn: async () => {
      const response = await api.get('/purchase/products');
      return response.data;
    },
    enabled: open,
  });

  const suppliers = suppliersResponse?.data || [];
  const products = productsResponse?.data || [];
  const order = orderResponse?.data;

  // Preencher formulário quando os dados do pedido carregarem
  useEffect(() => {
    if (order) {
      console.log('Dados do pedido recebidos para edição:', order);
      
      const formattedItems = order.items?.map((item: any) => {
        console.log('Item sendo processado:', item);
        return {
          product_id: item.product?.id || '',
          quantity: Number(item.quantities?.ordered || 0),
          notes: item.notes || '',
          product_name: item.product?.name || '',
        };
      }) || [];

      const newFormData = {
        supplier_id: order.supplier?.id || '',
        delivery_date: order.dates?.delivery_expected ? order.dates.delivery_expected.split('T')[0] : '',
        payment_terms: order.payment_terms || 'a_vista',
        delivery_location: order.delivery_location || '',
        notes: order.notes || '',
        urgency: order.urgency || 'normal',
        status: order.status || 'rascunho',
        items: formattedItems,
      };

      console.log('Dados formatados para o formulário:', newFormData);
      setFormData(newFormData);
    }
  }, [order]);

  // Resetar formulário quando modal fechar
  useEffect(() => {
    if (!open) {
      setFormData({
        supplier_id: '',
        delivery_date: '',
        payment_terms: 'a_vista',
        delivery_location: '',
        notes: '',
        urgency: 'normal',
        items: [],
      });
      setNewItem({
        product_id: '',
        quantity: 0,
        notes: '',
      });
    }
  }, [open]);

  const handleAddItem = () => {
    if (!selectedProduct || newItem.quantity <= 0) {
      toast.error('Preencha todos os campos obrigatórios do item');
      return;
    }

    const item = {
      product_id: selectedProduct.id,
      quantity: newItem.quantity,
      notes: newItem.notes,
      product_name: selectedProduct.name,
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item],
    }));

    setNewItem({
      product_id: '',
      quantity: 0,
      notes: '',
    });
    setSelectedProduct(null);

    // Focar no autocomplete de produtos após adicionar item
    setTimeout(() => {
      if (productSelectRef.current) {
        productSelectRef.current.focus();
      }
    }, 100);
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.error('=== FRONTEND: INICIANDO SUBMISSÃO DO FORMULÁRIO ===');
    console.error('FRONTEND: FormData atual:', JSON.stringify(formData, null, 2));
    console.error('FRONTEND: Order ID:', orderId);
    console.error('FRONTEND: Número de items:', formData.items.length);
    
    // Log detalhado de cada item
    formData.items.forEach((item, index) => {
      console.error(`FRONTEND: Item ${index}:`, JSON.stringify(item, null, 2));
    });

    if (!formData.supplier_id || formData.items.length === 0) {
      toast.error('Preencha todos os campos obrigatórios');
      console.error('FRONTEND: Validação falhou - supplier_id ou items vazio');
      return;
    }

    try {
      console.error('🚀 ENVIANDO DADOS PARA O BACKEND:');
      console.error('Order ID:', orderId);
      console.error('Supplier ID:', formData.supplier_id);
      console.error('Items:', formData.items.length);
      
      // Preparar dados limpos
      const cleanData = {
        supplier_id: formData.supplier_id,
        delivery_date: formData.delivery_date,
        payment_terms: formData.payment_terms,
        delivery_location: formData.delivery_location,
        notes: formData.notes,
        urgency: formData.urgency,
        status: formData.status,
        items: formData.items.map(item => ({
          product_id: item.product_id,
          quantity: Number(item.quantity),
          notes: item.notes || ''
        }))
      };
      
      console.error('Dados limpos:', cleanData);
      
      const response = await api.put(`/purchase/orders/${orderId}`, cleanData);
      
      console.error('✅ SUCESSO! Resposta:', response.data);
      
      if (response.data.success) {
        toast.success('Solicitação atualizada com sucesso!');
        
        // Invalidar queries específicas para atualizar dados
        await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
        await queryClient.invalidateQueries({ queryKey: ['purchase-order-details', orderId] });
        
        onSuccess();
      } else {
        throw new Error(response.data.message || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('ERRO COMPLETO ao atualizar pedido:', error);
      console.error('Response data:', error.response?.data);
      console.error('Status:', error.response?.status);
      
      const errorMessage = error.response?.data?.detail || 'Erro ao atualizar pedido de compra';
      toast.error(errorMessage);
    }
  };


  if (orderLoading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm">
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Carregando dados do pedido...</Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          Editar Pedido de Compra #{order?.order_number || ''}
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Fornecedor *"
                select
                value={formData.supplier_id}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_id: e.target.value }))}
                required
              >
                {suppliers.map((supplier: any) => (
                  <MenuItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data de Entrega"
                type="date"
                value={formData.delivery_date}
                onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Forma de Pagamento"
                select
                value={formData.payment_terms}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
              >
                <MenuItem value="a_vista">À Vista</MenuItem>
                <MenuItem value="30_dias">30 dias</MenuItem>
                <MenuItem value="60_dias">60 dias</MenuItem>
                <MenuItem value="90_dias">90 dias</MenuItem>
                <MenuItem value="boleto">Boleto</MenuItem>
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Urgência"
                select
                value={formData.urgency}
                onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value as any }))}
              >
                <MenuItem value="baixa">Baixa</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="alta">Alta</MenuItem>
                <MenuItem value="critica">Crítica</MenuItem>
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Status"
                select
                value={formData.status || 'rascunho'}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              >
                <MenuItem value="rascunho">📝 Rascunho</MenuItem>
                <MenuItem value="enviado">📧 Enviado</MenuItem>
                <MenuItem value="confirmado">✅ Confirmado</MenuItem>
                <MenuItem value="parcial">🔄 Parcial</MenuItem>
                <MenuItem value="recebido">📦 Recebido</MenuItem>
                <MenuItem value="cancelado">❌ Cancelado</MenuItem>
              </TextField>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Local de Entrega"
                value={formData.delivery_location}
                onChange={(e) => setFormData(prev => ({ ...prev, delivery_location: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
          </Grid>

          {/* Seção de Itens */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Itens do Pedido
            </Typography>
            
            {/* Adicionar Item */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    fullWidth
                    size="small"
                    options={products || []}
                    getOptionLabel={(option: any) => option.name || ''}
                    value={selectedProduct}
                    onChange={(event, newValue) => {
                      setSelectedProduct(newValue);
                      setNewItem(prev => ({ ...prev, product_id: newValue?.id || '' }));
                    }}
                    filterOptions={(options, { inputValue }) => {
                      return options.filter((option: any) => 
                        option.name?.toLowerCase().includes(inputValue.toLowerCase()) ||
                        option.sku?.toLowerCase().includes(inputValue.toLowerCase())
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Produto"
                        placeholder="Digite para buscar..."
                        inputRef={productSelectRef}
                      />
                    )}
                    renderOption={(props, option: any) => (
                      <Box component="li" {...props}>
                        <Box>
                          <Typography variant="body2">{option.name}</Typography>
                          {option.sku && (
                            <Typography variant="caption" color="text.secondary">
                              Código: {option.sku}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                    noOptionsText="Nenhum produto encontrado"
                  />
                </Grid>
                
                <Grid item xs={6} md={2}>
                  <TextField
                    fullWidth
                    label="Quantidade"
                    type="number"
                    value={newItem.quantity || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    size="small"
                  />
                </Grid>
                
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Observações"
                    value={newItem.notes || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={6} md={2}>
                  <Button
                    variant="contained"
                    onClick={handleAddItem}
                    startIcon={<AddIcon />}
                    size="small"
                    fullWidth
                  >
                    Adicionar
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* Lista de Itens */}
            {formData.items.length > 0 && (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell align="right">Qtd</TableCell>
                      <TableCell>Observações</TableCell>
                      <TableCell align="center">Ação</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.items.map((item, index) => {
                      return (
                        <TableRow key={index}>
                          <TableCell>{(item as any).product_name}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell>{item.notes || '-'}</TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained">
            Salvar Alterações
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};