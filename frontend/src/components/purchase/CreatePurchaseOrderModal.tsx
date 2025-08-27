import React, { useState, useRef } from 'react';
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
  Checkbox,
  FormControlLabel,
  Divider,
  Autocomplete,
  DialogContentText,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { api } from '@/services/api';
import { PurchaseOrderCreate, PurchaseOrderItemCreate } from '@/types/purchase';

interface CreatePurchaseOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreatePurchaseOrderModal: React.FC<CreatePurchaseOrderModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<PurchaseOrderCreate>({
    supplier_id: '',
    delivery_date: '',
    payment_terms: 'a_vista',
    delivery_location: '',
    notes: '',
    urgency: 'normal',
    items: [],
  });

  const [sendOptions, setSendOptions] = useState({
    sendEmail: false,
    emailAddress: '',
  });

  const productSelectRef = useRef<HTMLInputElement>(null);

  const [newItem, setNewItem] = useState<PurchaseOrderItemCreate & { product_name?: string }>({
    product_id: '',
    quantity: 0,
    notes: '',
  });

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Função para resetar todos os dados do formulário
  const resetForm = () => {
    setFormData({
      supplier_id: '',
      delivery_date: '',
      payment_terms: 'a_vista',
      delivery_location: '',
      notes: '',
      urgency: 'normal',
      items: [],
    });
    
    setSendOptions({
      sendEmail: false,
      emailAddress: '',
    });
    
    setNewItem({
      product_id: '',
      quantity: 0,
      notes: '',
    });
  };

  // Buscar fornecedores
  const { data: suppliersResponse } = useQuery({
    queryKey: ['purchase-suppliers'],
    queryFn: async () => {
      const response = await api.get('/purchase/suppliers');
      return response.data;
    },
  });

  // Buscar produtos
  const { data: productsResponse } = useQuery({
    queryKey: ['purchase-products'],
    queryFn: async () => {
      const response = await api.get('/purchase/products');
      return response.data;
    },
  });

  const suppliers = suppliersResponse?.data || [];
  const products = productsResponse?.data || [];

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

    if (!formData.supplier_id || formData.items.length === 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      console.log('🚀 Criando solicitação de cotação...');
      const response = await api.post('/purchase/orders', formData);
      const orderId = response.data.data?.id;
      
      if (!orderId) {
        throw new Error('ID da solicitação não retornado');
      }

      console.log('✅ Solicitação criada:', orderId);
      toast.success('Solicitação de cotação criada com sucesso!');
      
      setCreatedOrderId(orderId);
      setConfirmDialogOpen(true);
      
    } catch (error: any) {
      console.error('💥 Erro ao criar solicitação:', error);
      const errorMessage = error.response?.data?.detail || 'Erro ao criar solicitação de cotação';
      toast.error(errorMessage);
    }
  };

  const handleSendEmail = async () => {
    if (!createdOrderId || !sendOptions.emailAddress) {
      toast.error('Informe o email do fornecedor');
      return;
    }

    try {
      console.log('📧 ENVIANDO EMAIL...');
      const emailResponse = await api.post(`/purchase/orders/${createdOrderId}/send-email`, {
        email: sendOptions.emailAddress
      });
      
      console.log('✅ Email enviado:', emailResponse.data);
      
      // Atualizar status para "enviado" após email
      try {
        await api.put(`/purchase/orders/${createdOrderId}/status?new_status=enviado`);
        console.log('✅ Status atualizado para "enviado"');
        
        // Invalidar cache para atualizar listagem
        await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
        await queryClient.invalidateQueries({ queryKey: ['purchase-order-details'] });
      } catch (statusError) {
        console.error('❌ Erro ao atualizar status:', statusError);
        // Não bloqueia o fluxo se falhar
      }
      
      toast.success('Email enviado com sucesso!');
      
      setConfirmDialogOpen(false);
      resetForm();
      onSuccess();
    } catch (emailError: any) {
      console.error('❌ ERRO no email:', emailError);
      const errorMessage = emailError.response?.data?.detail || 'Erro ao enviar email';
      toast.error(errorMessage);
    }
  };

  const handleDownloadPDF = async () => {
    if (!createdOrderId) return;

    try {
      console.log('📄 BAIXANDO PDF...');
      const response = await api.get(`/purchase/orders/${createdOrderId}/pdf`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `solicitacao-cotacao-${createdOrderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF baixado com sucesso!');
      
      setConfirmDialogOpen(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error('❌ ERRO no download:', error);
      toast.error('Erro ao baixar PDF');
    }
  };

  const handleSkipActions = () => {
    setConfirmDialogOpen(false);
    resetForm();
    onSuccess();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };


  // Resetar formulário quando o modal for fechado
  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          Novo Pedido de Compra
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
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Local de Entrega"
                value={formData.delivery_location}
                onChange={(e) => setFormData(prev => ({ ...prev, delivery_location: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="📧 Email do Fornecedor"
                type="email"
                value={sendOptions.emailAddress}
                onChange={(e) => setSendOptions(prev => ({ ...prev, emailAddress: e.target.value }))}
                size="small"
                placeholder="email@fornecedor.com"
                helperText="Opcional - será perguntado se enviar"
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
                      <TableCell align="right">Quantidade</TableCell>
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
          <Button onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained">
            Criar Solicitação
          </Button>
        </DialogActions>
      </form>

      {/* Dialog de Confirmação */}
      <Dialog open={confirmDialogOpen} onClose={() => {}} maxWidth="sm" fullWidth>
        <DialogTitle>
          Solicitação de Cotação Criada!
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sua solicitação de cotação foi criada com sucesso. O que você gostaria de fazer agora?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', gap: 1, p: 3 }}>
          {sendOptions.emailAddress && (
            <Button 
              onClick={handleSendEmail} 
              variant="contained" 
              fullWidth
              startIcon={<span>📧</span>}
            >
              Enviar por Email para {sendOptions.emailAddress}
            </Button>
          )}
          
          <Button 
            onClick={handleDownloadPDF} 
            variant="outlined" 
            fullWidth
            startIcon={<span>📄</span>}
          >
            Baixar PDF
          </Button>
          
          <Button 
            onClick={handleSkipActions} 
            color="inherit"
            fullWidth
          >
            Pular - Finalizar
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};