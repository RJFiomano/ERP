import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Alert,
  CircularProgress,
  Divider,
  Tooltip,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Pagination,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
} from '@mui/material';
import {
  Cancel,
  Receipt,
  Refresh,
  Warning,
  CheckCircle,
  Block,
  Person,
  ShoppingCart,
  Search,
  FilterList,
  Edit,
  Visibility,
  Delete,
  GetApp,
} from '@mui/icons-material';
import { quickSalesAPI } from '@/services/api';
import { toast } from 'react-toastify';

interface Sale {
  id: string;
  number: string;
  total_amount: number;
  status: string;
  created_at: string;
  seller_name: string;
  items_count: number;
  customer_name: string;
}

export const RecentSales: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    saleId: string;
    saleNumber: string;
  }>({ open: false, saleId: '', saleNumber: '' });
  const [cancelling, setCancelling] = useState(false);
  
  // Estados para filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<'table' | 'list'>('table');
  
  // Estado para modal de detalhes
  const [detailsDialog, setDetailsDialog] = useState<{
    open: boolean;
    sale: Sale | null;
    loading: boolean;
  }>({ open: false, sale: null, loading: false });

  // Estado para modal de edição
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    sale: Sale | null;
    loading: boolean;
    saving: boolean;
  }>({ open: false, sale: null, loading: false, saving: false });

  const loadRecentSales = async () => {
    try {
      setLoading(true);
      const response = await quickSalesAPI.getRecentSales(50); // Carregar mais vendas para filtrar
      if (response.success) {
        setSales(response.data);
        setFilteredSales(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar vendas recentes:', error);
      toast.error('Erro ao carregar vendas recentes');
    } finally {
      setLoading(false);
    }
  };

  // Função para filtrar vendas
  const filterSales = () => {
    let filtered = [...sales];

    // Filtro por busca (número da venda, cliente, vendedor)
    if (searchTerm) {
      filtered = filtered.filter(sale =>
        sale.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.seller_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sale => sale.status === statusFilter);
    }

    // Filtro por data
    if (dateFilter !== 'all') {
      const today = new Date();
      const saleDate = new Date(sale => sale.created_at);
      
      switch (dateFilter) {
        case 'today':
          filtered = filtered.filter(sale => {
            const saleDate = new Date(sale.created_at);
            return saleDate.toDateString() === today.toDateString();
          });
          break;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          filtered = filtered.filter(sale => new Date(sale.created_at) >= weekAgo);
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          filtered = filtered.filter(sale => new Date(sale.created_at) >= monthAgo);
          break;
      }
    }

    setFilteredSales(filtered);
    setCurrentPage(1); // Reset para primeira página ao filtrar
  };

  useEffect(() => {
    loadRecentSales();
  }, []);

  useEffect(() => {
    filterSales();
  }, [searchTerm, statusFilter, dateFilter, sales]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'confirmed':
        return 'success';
      case 'invoiced':
        return 'primary';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Rascunho';
      case 'confirmed':
        return 'Confirmada';
      case 'invoiced':
        return 'Faturada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle fontSize="small" />;
      case 'invoiced':
        return <Receipt fontSize="small" />;
      case 'cancelled':
        return <Block fontSize="small" />;
      default:
        return null;
    }
  };

  const handleCancelSale = async () => {
    if (!cancelDialog.saleId) return;

    try {
      setCancelling(true);
      const response = await quickSalesAPI.cancelQuickSale(cancelDialog.saleId);
      
      if (response.success) {
        toast.success(`Venda ${cancelDialog.saleNumber} cancelada com sucesso!`);
        setCancelDialog({ open: false, saleId: '', saleNumber: '' });
        loadRecentSales(); // Recarregar lista
      } else {
        throw new Error(response.message || 'Erro ao cancelar venda');
      }
    } catch (error: any) {
      console.error('Erro ao cancelar venda:', error);
      toast.error(error.response?.data?.detail || error.message || 'Erro ao cancelar venda');
    } finally {
      setCancelling(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  // Função para visualizar detalhes da venda
  const handleViewDetails = async (sale: Sale) => {
    setDetailsDialog({ open: true, sale: sale, loading: true });
    
    try {
      // Aqui você pode fazer uma chamada para buscar mais detalhes da venda se necessário
      // const response = await salesAPI.getSaleDetails(sale.id);
      // Por enquanto, vamos usar os dados que já temos
      setDetailsDialog({ open: true, sale: sale, loading: false });
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      toast.error('Erro ao carregar detalhes da venda');
      setDetailsDialog({ open: false, sale: null, loading: false });
    }
  };

  // Função para editar venda
  const handleEditSale = (sale: Sale) => {
    if (sale.status !== 'draft') {
      toast.error('Apenas vendas em rascunho podem ser editadas');
      return;
    }
    
    setEditDialog({ open: true, sale: sale, loading: false, saving: false });
  };

  // Função para salvar edições da venda
  const handleSaveEdit = async () => {
    if (!editDialog.sale) return;
    
    setEditDialog(prev => ({ ...prev, saving: true }));
    
    try {
      // Simular salvamento (na implementação real, chamaria API)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Venda ${editDialog.sale.number} atualizada com sucesso!`);
      setEditDialog({ open: false, sale: null, loading: false, saving: false });
      
      // Recarregar lista de vendas
      loadRecentSales();
    } catch (error) {
      toast.error('Erro ao salvar alterações');
      setEditDialog(prev => ({ ...prev, saving: false }));
    }
  };

  // Função para exportar dados
  const handleExportSale = (sale: Sale) => {
    // Criar dados para exportação
    const exportData = {
      numero_venda: sale.number,
      cliente: sale.customer_name,
      vendedor: sale.seller_name,
      data_hora: formatDateTime(sale.created_at),
      status: getStatusLabel(sale.status),
      quantidade_itens: sale.items_count,
      valor_total: formatCurrency(sale.total_amount)
    };

    // Converter para CSV e fazer download
    const csvContent = Object.entries(exportData)
      .map(([key, value]) => `${key},${value}`)
      .join('\n');
    
    const blob = new Blob([`Campo,Valor\n${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `venda_${sale.number}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Venda ${sale.number} exportada com sucesso!`);
  };

  // Calcular paginação
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSales = filteredSales.slice(startIndex, endIndex);

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Carregando vendas recentes...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header com título e controles */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h5">
              Vendas Recentes
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                variant={viewMode === 'table' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setViewMode('table')}
              >
                Tabela
              </Button>
              <Button
                variant={viewMode === 'list' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setViewMode('list')}
              >
                Lista
              </Button>
              <Button
                startIcon={<Refresh />}
                onClick={loadRecentSales}
                disabled={loading}
                size="small"
                variant="outlined"
              >
                Atualizar
              </Button>
            </Box>
          </Box>

          {/* Filtros e Busca */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar por número, cliente ou vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="draft">Rascunho</MenuItem>
                  <MenuItem value="confirmed">Confirmada</MenuItem>
                  <MenuItem value="invoiced">Faturada</MenuItem>
                  <MenuItem value="cancelled">Cancelada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Período</InputLabel>
                <Select
                  value={dateFilter}
                  label="Período"
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="today">Hoje</MenuItem>
                  <MenuItem value="week">Últimos 7 dias</MenuItem>
                  <MenuItem value="month">Último mês</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Box display="flex" alignItems="center" sx={{ height: '100%' }}>
                <Typography variant="body2" color="text.secondary">
                  {filteredSales.length} vendas encontradas
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Conteúdo - Tabela ou Lista */}
      <Card>
        <CardContent>
          {currentSales.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <ShoppingCart sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h6">
                {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                  ? 'Nenhuma venda encontrada com os filtros aplicados' 
                  : 'Nenhuma venda encontrada'
                }
              </Typography>
              <Typography variant="body2">
                {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'As vendas realizadas aparecerão aqui'
                }
              </Typography>
            </Box>
          ) : viewMode === 'table' ? (
            // Visualização em Tabela
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Número</strong></TableCell>
                    <TableCell><strong>Cliente</strong></TableCell>
                    <TableCell><strong>Data/Hora</strong></TableCell>
                    <TableCell><strong>Itens</strong></TableCell>
                    <TableCell><strong>Valor</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Vendedor</strong></TableCell>
                    <TableCell align="center"><strong>Ações</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentSales.map((sale) => (
                    <TableRow key={sale.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {sale.number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Person fontSize="small" color="action" />
                          {sale.customer_name}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDateTime(sale.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {sale.items_count} {sale.items_count === 1 ? 'item' : 'itens'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold" color="primary.main">
                          {formatCurrency(sale.total_amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(sale.status) || undefined}
                          label={getStatusLabel(sale.status)}
                          color={getStatusColor(sale.status)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{sale.seller_name}</TableCell>
                      <TableCell align="center">
                        <Box display="flex" gap={0.5} justifyContent="center">
                          <Tooltip title="Ver detalhes">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleViewDetails(sale)}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {sale.status === 'draft' && (
                            <Tooltip title="Editar venda">
                              <IconButton 
                                size="small" 
                                color="secondary"
                                onClick={() => handleEditSale(sale)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {(sale.status === 'confirmed' || sale.status === 'draft') && (
                            <Tooltip title="Cancelar venda">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setCancelDialog({
                                  open: true,
                                  saleId: sale.id,
                                  saleNumber: sale.number
                                })}
                              >
                                <Cancel fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Exportar CSV">
                            <IconButton 
                              size="small"
                              onClick={() => handleExportSale(sale)}
                            >
                              <GetApp fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            // Visualização em Lista (original melhorada)
            <List>
              {currentSales.map((sale, index) => (
                <React.Fragment key={sale.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {sale.number}
                          </Typography>
                          <Chip
                            icon={getStatusIcon(sale.status) || undefined}
                            label={getStatusLabel(sale.status)}
                            color={getStatusColor(sale.status)}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Box display="flex" alignItems="center" gap={2} mt={1}>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Person fontSize="small" color="action" />
                              <Typography variant="caption">
                                {sale.customer_name}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {sale.items_count} {sale.items_count === 1 ? 'item' : 'itens'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDateTime(sale.created_at)}
                            </Typography>
                          </Box>
                          <Typography variant="body2" fontWeight="bold" color="primary.main" sx={{ mt: 0.5 }}>
                            {formatCurrency(sale.total_amount)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Vendedor: {sale.seller_name}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="Ver detalhes">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleViewDetails(sale)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Exportar CSV">
                          <IconButton 
                            size="small"
                            onClick={() => handleExportSale(sale)}
                          >
                            <GetApp fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {(sale.status === 'confirmed' || sale.status === 'draft') && (
                          <Tooltip title="Cancelar venda">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setCancelDialog({
                                open: true,
                                saleId: sale.id,
                                saleNumber: sale.number
                              })}
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < currentSales.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Cancelamento */}
      <Dialog
        open={cancelDialog.open}
        onClose={() => !cancelling && setCancelDialog({ open: false, saleId: '', saleNumber: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Warning color="warning" />
            Cancelar Venda
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja cancelar a venda <strong>{cancelDialog.saleNumber}</strong>?
          </DialogContentText>
          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>Esta ação irá:</strong>
            <ul>
              <li>Marcar a venda como cancelada</li>
              <li>Devolver todos os produtos ao estoque automaticamente</li>
              <li>Esta ação não pode ser desfeita</li>
            </ul>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setCancelDialog({ open: false, saleId: '', saleNumber: '' })}
            disabled={cancelling}
          >
            Não, manter venda
          </Button>
          <Button
            onClick={handleCancelSale}
            color="error"
            variant="contained"
            disabled={cancelling}
            startIcon={cancelling ? <CircularProgress size={16} /> : <Cancel />}
          >
            {cancelling ? 'Cancelando...' : 'Sim, cancelar venda'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Detalhes da Venda */}
      <Dialog
        open={detailsDialog.open}
        onClose={() => setDetailsDialog({ open: false, sale: null, loading: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Receipt color="primary" />
            Detalhes da Venda
            {detailsDialog.sale && (
              <Chip
                label={detailsDialog.sale.number}
                color="primary"
                variant="outlined"
                size="small"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {detailsDialog.loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : detailsDialog.sale ? (
            <Grid container spacing={3}>
              {/* Informações da Venda */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      📋 Informações da Venda
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Número:</Typography>
                        <Typography variant="body2" fontWeight="bold">{detailsDialog.sale.number}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Data/Hora:</Typography>
                        <Typography variant="body2">{formatDateTime(detailsDialog.sale.created_at)}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">Status:</Typography>
                        <Chip
                          icon={getStatusIcon(detailsDialog.sale.status) || undefined}
                          label={getStatusLabel(detailsDialog.sale.status)}
                          color={getStatusColor(detailsDialog.sale.status)}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Vendedor:</Typography>
                        <Typography variant="body2">{detailsDialog.sale.seller_name}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Informações do Cliente */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      👤 Cliente
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Nome:</Typography>
                        <Typography variant="body2" fontWeight="bold">{detailsDialog.sale.customer_name}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Tipo:</Typography>
                        <Typography variant="body2">
                          {detailsDialog.sale.customer_name === 'Cliente Avulso' ? 'Consumidor Final' : 'Cliente Cadastrado'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Resumo Financeiro */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      💰 Resumo Financeiro
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Box textAlign="center" p={2} bgcolor="grey.50" borderRadius={1}>
                          <Typography variant="h4" color="info.main">
                            {detailsDialog.sale.items_count}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {detailsDialog.sale.items_count === 1 ? 'Item' : 'Itens'}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box textAlign="center" p={2} bgcolor="grey.50" borderRadius={1}>
                          <Typography variant="h6" color="success.main">
                            {formatCurrency(detailsDialog.sale.total_amount)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Subtotal
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box textAlign="center" p={2} bgcolor="grey.50" borderRadius={1}>
                          <Typography variant="h6" color="warning.main">
                            R$ 0,00
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Desconto
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box textAlign="center" p={2} bgcolor="primary.main" borderRadius={1}>
                          <Typography variant="h6" color="white">
                            {formatCurrency(detailsDialog.sale.total_amount)}
                          </Typography>
                          <Typography variant="caption" color="primary.contrastText">
                            Total Final
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Observações/Ações */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      📝 Observações
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {detailsDialog.sale.status === 'draft' 
                        ? 'Venda manual em rascunho. Aguardando confirmação para baixar estoque.'
                        : detailsDialog.sale.status === 'confirmed'
                        ? 'Venda confirmada. Produtos baixados do estoque. Pronta para faturamento.'
                        : detailsDialog.sale.status === 'cancelled'
                        ? 'Venda cancelada. Produtos devolvidos ao estoque automaticamente.'
                        : 'Venda faturada. Nota fiscal emitida. Processo completo.'
                      }
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog({ open: false, sale: null, loading: false })}>
            Fechar
          </Button>
          {detailsDialog.sale && (
            <>
              <Button
                startIcon={<GetApp />}
                onClick={() => handleExportSale(detailsDialog.sale!)}
                color="primary"
              >
                Exportar
              </Button>
              {(detailsDialog.sale.status === 'confirmed' || detailsDialog.sale.status === 'draft') && (
                <Button
                  startIcon={<Cancel />}
                  onClick={() => {
                    setCancelDialog({
                      open: true,
                      saleId: detailsDialog.sale!.id,
                      saleNumber: detailsDialog.sale!.number
                    });
                    setDetailsDialog({ open: false, sale: null, loading: false });
                  }}
                  color="error"
                  variant="outlined"
                >
                  Cancelar Venda
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Modal de Edição da Venda */}
      <Dialog
        open={editDialog.open}
        onClose={() => !editDialog.saving && setEditDialog({ open: false, sale: null, loading: false, saving: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Edit color="secondary" />
            Editar Venda
            {editDialog.sale && (
              <Chip
                label={editDialog.sale.number}
                color="secondary"
                variant="outlined"
                size="small"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {editDialog.loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : editDialog.sale ? (
            <Box sx={{ py: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <strong>Modo de Edição Ativo</strong><br />
                Você pode alterar informações básicas desta venda em rascunho. 
                Para modificar produtos e quantidades, recomendamos cancelar esta venda e criar uma nova.
              </Alert>

              <Grid container spacing={3}>
                {/* Status da Venda */}
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="secondary">
                        📋 Status da Venda
                      </Typography>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Esta venda está em rascunho e pode ser editada
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Criada em: {formatDateTime(editDialog.sale.created_at)}
                          </Typography>
                        </Box>
                        <Chip
                          icon={getStatusIcon(editDialog.sale.status) || undefined}
                          label={getStatusLabel(editDialog.sale.status)}
                          color={getStatusColor(editDialog.sale.status)}
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Informações Editáveis */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="secondary">
                        👤 Cliente
                      </Typography>
                      <TextField
                        fullWidth
                        label="Nome do Cliente"
                        value={editDialog.sale.customer_name}
                        disabled
                        helperText="Para alterar o cliente, cancele esta venda e crie uma nova"
                        size="small"
                      />
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="secondary">
                        🏪 Vendedor
                      </Typography>
                      <TextField
                        fullWidth
                        label="Vendedor Responsável"
                        value={editDialog.sale.seller_name}
                        disabled
                        helperText="Vendedor não pode ser alterado após criação"
                        size="small"
                      />
                    </CardContent>
                  </Card>
                </Grid>

                {/* Resumo da Venda */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="secondary">
                        💰 Resumo da Venda
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} md={3}>
                          <Box textAlign="center" p={2} bgcolor="info.light" borderRadius={1}>
                            <Typography variant="h5" color="info.contrastText">
                              {editDialog.sale.items_count}
                            </Typography>
                            <Typography variant="caption" color="info.contrastText">
                              {editDialog.sale.items_count === 1 ? 'Item' : 'Itens'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} md={9}>
                          <Box textAlign="center" p={2} bgcolor="secondary.light" borderRadius={1}>
                            <Typography variant="h5" color="secondary.contrastText">
                              {formatCurrency(editDialog.sale.total_amount)}
                            </Typography>
                            <Typography variant="caption" color="secondary.contrastText">
                              Valor Total da Venda
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Ações Disponíveis */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="secondary">
                        ⚙️ Ações Disponíveis
                      </Typography>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <strong>Sobre Vendas em Rascunho:</strong><br />
                        • Vendas rápidas são automaticamente confirmadas<br />
                        • Apenas vendas manuais ficam em rascunho<br />
                        • Para alterações complexas, cancele e crie nova venda
                      </Alert>
                      
                      <Box display="flex" gap={2} justifyContent="center" mt={2}>
                        <Button
                          variant="outlined"
                          startIcon={<Cancel />}
                          onClick={() => {
                            setCancelDialog({
                              open: true,
                              saleId: editDialog.sale!.id,
                              saleNumber: editDialog.sale!.number
                            });
                            setEditDialog({ open: false, sale: null, loading: false, saving: false });
                          }}
                          color="error"
                        >
                          Cancelar Venda
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setEditDialog({ open: false, sale: null, loading: false, saving: false })}
            disabled={editDialog.saving}
          >
            Fechar
          </Button>
          <Button
            startIcon={editDialog.saving ? <CircularProgress size={16} /> : <GetApp />}
            onClick={() => editDialog.sale && handleExportSale(editDialog.sale)}
            disabled={editDialog.saving}
            color="primary"
          >
            Exportar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};