import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

interface ViewPurchaseOrderModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
}

export const ViewPurchaseOrderModal: React.FC<ViewPurchaseOrderModalProps> = ({
  open,
  onClose,
  orderId,
}) => {
  const { data: orderResponse, isLoading, error } = useQuery({
    queryKey: ['purchase-order-details', orderId],
    queryFn: async () => {
      const response = await api.get(`/purchase/orders/${orderId}`);
      return response.data;
    },
    enabled: open && !!orderId,
  });

  const order = orderResponse?.data;


  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      rascunho: 'default',
      enviado: 'info',
      confirmado: 'primary',
      parcial: 'warning',
      recebido: 'success',
      cancelado: 'error',
    } as const;
    return colors[status as keyof typeof colors] || 'default';
  };

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      baixa: 'default',
      normal: 'info',
      alta: 'warning',
      critica: 'error',
    } as const;
    return colors[urgency as keyof typeof colors] || 'default';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Detalhes do Pedido {order?.order_number || ''}
          </Typography>
          {order?.status && (
            <Chip
              label={order.status}
              color={getStatusColor(order.status)}
              size="small"
            />
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {isLoading && (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Carregando detalhes...</Typography>
          </Box>
        )}

        {error && (
          <Box py={4}>
            <Typography color="error" align="center">
              Erro ao carregar detalhes do pedido
            </Typography>
          </Box>
        )}

        {order && (
          <Box>
            {/* Informações Gerais */}
            <Typography variant="h6" gutterBottom>
              Informações Gerais
            </Typography>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Número do Pedido
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {order.order_number || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Data do Pedido
                </Typography>
                <Typography variant="body1">
                  {formatDate(order.dates?.order_date)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Data de Entrega Prevista
                </Typography>
                <Typography variant="body1">
                  {formatDate(order.dates?.delivery_expected)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Urgência
                </Typography>
                <Chip
                  label={order.urgency || 'N/A'}
                  color={getUrgencyColor(order.urgency)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Forma de Pagamento
                </Typography>
                <Typography variant="body1">
                  {order.payment_terms || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={order.status || 'N/A'}
                  color={getStatusColor(order.status)}
                  size="small"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Informações do Fornecedor */}
            <Typography variant="h6" gutterBottom>
              Fornecedor
            </Typography>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Nome
                </Typography>
                <Typography variant="body1">
                  {order.supplier?.name || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Documento
                </Typography>
                <Typography variant="body1">
                  {order.supplier?.document || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">
                  {order.supplier?.email || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Telefone
                </Typography>
                <Typography variant="body1">
                  {order.supplier?.phone || 'N/A'}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Local de Entrega e Observações */}
            {(order.delivery_location || order.notes) && (
              <>
                <Typography variant="h6" gutterBottom>
                  Informações Adicionais
                </Typography>
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  {order.delivery_location && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Local de Entrega
                      </Typography>
                      <Typography variant="body1">
                        {order.delivery_location}
                      </Typography>
                    </Grid>
                  )}
                  {order.notes && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Observações
                      </Typography>
                      <Typography variant="body1">
                        {order.notes}
                      </Typography>
                    </Grid>
                  )}
                </Grid>

                <Divider sx={{ my: 3 }} />
              </>
            )}

            {/* Itens do Pedido */}
            <Typography variant="h6" gutterBottom>
              Itens do Pedido
            </Typography>
            {order.items && order.items.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell align="right">Quantidade</TableCell>
                      <TableCell>Observações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items.map((item: any, index: number) => (
                      <TableRow key={item.id || index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {item.product?.name || 'N/A'}
                          </Typography>
                          {item.product?.barcode && (
                            <Typography variant="caption" color="text.secondary">
                              Código: {item.product.barcode}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {item.quantities?.ordered || 0}
                        </TableCell>
                        <TableCell>
                          {item.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nenhum item encontrado
              </Typography>
            )}

            <Divider sx={{ my: 3 }} />

          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};