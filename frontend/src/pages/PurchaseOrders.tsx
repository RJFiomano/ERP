import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  Grid,
  MenuItem,
  Tooltip,
  TablePagination,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  DragIndicator as DragIndicatorIcon,
  ViewList as ViewListIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { api } from '@/services/api';
import { CreatePurchaseOrderModal } from '@/components/purchase/CreatePurchaseOrderModal';
import { ViewPurchaseOrderModal } from '@/components/purchase/ViewPurchaseOrderModal';
import { EditPurchaseOrderModal } from '@/components/purchase/EditPurchaseOrderModal';

const statusColors = {
  rascunho: 'default',
  enviado: 'info',
  confirmado: 'primary',
  parcial: 'warning',
  recebido: 'success',
  cancelado: 'error',
} as const;

const urgencyColors = {
  baixa: 'default',
  normal: 'info',
  alta: 'warning',
  critica: 'error',
} as const;

export const PurchaseOrders: React.FC = () => {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<{id: string, orderNumber: string} | null>(null);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState({
    supplier_id: '',
    status: '',
    date_from: '',
    date_to: '',
    urgency: '',
    order_number: '',
    min_items: '',
    max_items: '',
  });

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const [draggedOrder, setDraggedOrder] = useState<string | null>(null);
  const [orderedList, setOrderedList] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple');
  const [groupByColumns, setGroupByColumns] = useState<string[]>([]);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  const { data: ordersResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['purchase-orders', page, rowsPerPage, filters, sortConfig],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          limit: rowsPerPage.toString(),
          offset: (page * rowsPerPage).toString(),
          ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
        });
        
        // Adicionar ordenação se configurada
        if (sortConfig) {
          params.append('sort_by', sortConfig.key);
          params.append('sort_direction', sortConfig.direction);
        }
        
        const response = await api.get(`/purchase/orders?${params}`);
        return response.data;
      } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
      }
    },
  });

  const orders = ordersResponse?.data || [];
  const totalCount = ordersResponse?.total || orders.length;

  // Função para ordenar dados
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Atualizar lista ordenada quando dados mudarem
  React.useEffect(() => {
    setOrderedList(orders);
  }, [orders]);

  // Aplicar ordenação local aos dados
  const sortedOrders = React.useMemo(() => {
    const dataToSort = orderedList.length > 0 ? orderedList : orders;
    
    if (!sortConfig) return dataToSort;

    return [...dataToSort].sort((a: any, b: any) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number') {
        const comparison = aValue - bValue;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      // Para datas
      if (sortConfig.key.includes('date')) {
        const dateA = new Date(aValue);
        const dateB = new Date(bValue);
        const comparison = dateA.getTime() - dateB.getTime();
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      return 0;
    });
  }, [orderedList, orders, sortConfig]);

  // Funções de drag and drop
  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    setDraggedOrder(orderId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetOrderId: string) => {
    e.preventDefault();
    
    if (!draggedOrder || draggedOrder === targetOrderId) return;

    const newOrderedList = [...sortedOrders];
    const draggedIndex = newOrderedList.findIndex(order => order.id === draggedOrder);
    const targetIndex = newOrderedList.findIndex(order => order.id === targetOrderId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Remove o item da posição original e insere na nova posição
      const [draggedItem] = newOrderedList.splice(draggedIndex, 1);
      newOrderedList.splice(targetIndex, 0, draggedItem);
      
      setOrderedList(newOrderedList);
      toast.success(`Pedido ${draggedItem.order_number} reordenado!`);
    }

    setDraggedOrder(null);
  };

  const handleDragEnd = () => {
    setDraggedOrder(null);
  };

  // Funções para drag & drop de colunas (agrupamento)
  const handleColumnDragStart = (e: React.DragEvent, columnKey: string) => {
    console.log('🔥 COLUMN DRAG START:', columnKey);
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/column', columnKey);
    e.dataTransfer.setData('text/plain', columnKey);
    
    // Impedir propagação para não interferir com drag de linhas
    e.stopPropagation();
  };

  const handleColumnDragEnd = (e: React.DragEvent) => {
    console.log('🔥 COLUMN DRAG END');
    setDraggedColumn(null);
    e.stopPropagation();
  };

  const handleGroupAreaDragOver = (e: React.DragEvent) => {
    console.log('🔥 GROUP AREA DRAG OVER');
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleGroupAreaDrop = (e: React.DragEvent) => {
    console.log('🔥 GROUP AREA DROP');
    e.preventDefault();
    e.stopPropagation();
    
    const columnKey = e.dataTransfer.getData('application/column') || e.dataTransfer.getData('text/plain');
    console.log('🔥 DROPPED COLUMN:', columnKey);
    
    if (columnKey && !groupByColumns.includes(columnKey)) {
      setGroupByColumns(prev => [...prev, columnKey]);
      toast.success(`Agrupamento por ${getColumnLabel(columnKey)} adicionado!`);
      console.log('🔥 GROUP ADDED:', columnKey);
    } else if (groupByColumns.includes(columnKey)) {
      toast.info(`${getColumnLabel(columnKey)} já está agrupado!`);
    }
    
    setDraggedColumn(null);
  };

  const removeGroupColumn = (columnKey: string) => {
    setGroupByColumns(prev => prev.filter(col => col !== columnKey));
    toast.info(`Agrupamento por ${getColumnLabel(columnKey)} removido!`);
  };

  const getColumnLabel = (columnKey: string) => {
    const labels: Record<string, string> = {
      'supplier_name': 'Fornecedor',
      'status': 'Status', 
      'urgency': 'Urgência',
      'order_date': 'Data'
    };
    return labels[columnKey] || columnKey;
  };

  // Função para agrupar dados
  const groupedOrders = React.useMemo(() => {
    if (groupByColumns.length === 0) {
      return { ungrouped: sortedOrders };
    }

    const grouped: Record<string, any[]> = {};
    
    sortedOrders.forEach((order: any) => {
      let groupKey = '';
      groupByColumns.forEach((column, index) => {
        const value = order[column] || 'N/A';
        if (index > 0) groupKey += ' | ';
        groupKey += `${getColumnLabel(column)}: ${value}`;
      });
      
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(order);
    });

    return grouped;
  }, [sortedOrders, groupByColumns]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleView = (orderId: string) => {
    setSelectedOrderId(orderId);
    setViewModalOpen(true);
  };

  const handleEdit = (orderId: string) => {
    setSelectedOrderId(orderId);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (orderId: string, orderNumber: string) => {
    setOrderToDelete({ id: orderId, orderNumber });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;

    try {
      await api.delete(`/purchase/orders/${orderToDelete.id}`);
      toast.success(`Pedido ${orderToDelete.orderNumber} excluído com sucesso!`);
      refetch(); // Atualizar a lista
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Erro ao excluir pedido';
      toast.error(errorMessage);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  const handleDownload = async (orderId: string, orderNumber: string) => {
    try {
      console.error('🚀 INICIANDO DOWNLOAD PDF');
      console.error('Order ID:', orderId);
      console.error('Order Number:', orderNumber);
      console.error('URL:', `/purchase/orders/${orderId}/pdf`);
      
      console.error('🎯 CHAMANDO ENDPOINT PDF ORIGINAL...');
      const response = await api.get(`/purchase/orders/${orderId}/pdf`, {
        responseType: 'blob',
      });
      
      console.error('✅ RESPOSTA RECEBIDA');
      console.error('Status:', response.status);
      console.error('Headers:', response.headers);
      console.error('Content-Type:', response.headers['content-type']);
      console.error('Data size:', response.data.size);
      console.error('Response completo:', response);
      
      // Criar um link para download (aceita PDF ou texto)
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const isPDF = contentType.includes('application/pdf');
      const isText = contentType.includes('text/plain');
      
      let filename = `pedido-compra-${orderNumber}`;
      let mimeType = 'application/octet-stream';
      
      if (isPDF) {
        filename += '.pdf';
        mimeType = 'application/pdf';
        console.log('Baixando como PDF');
      } else if (isText) {
        filename += '.txt';
        mimeType = 'text/plain';
        console.log('Baixando como texto');
      } else {
        filename += '.dat';
        console.log('Baixando como dados genéricos');
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: mimeType }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(isPDF ? 'PDF do pedido baixado com sucesso!' : 'Arquivo do pedido baixado com sucesso!');
    } catch (error: any) {
      console.error('💥💥💥 ERRO COMPLETO ao baixar PDF:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      console.error('Error config:', error.config);
      
      if (error.response) {
        // Servidor respondeu com erro
        console.error('🚨 ERRO DO SERVIDOR:', error.response.status);
        console.error('🚨 DADOS DO ERRO:', error.response.data);
        
        let errorMessage = 'Erro desconhecido do servidor';
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          } else if (error.response.data.detail) {
            errorMessage = error.response.data.detail;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          }
        }
        toast.error(`Erro ${error.response.status}: ${errorMessage}`);
      } else if (error.request) {
        // Request foi feito mas não houve resposta
        console.error('🚨 SEM RESPOSTA DO SERVIDOR');
        toast.error('Servidor não respondeu. Verifique a conexão.');
      } else {
        // Erro na configuração do request
        console.error('🚨 ERRO DE CONFIGURAÇÃO:', error.message);
        toast.error(`Erro de configuração: ${error.message}`);
      }
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      // Encontrar o pedido atual na lista para mostrar status anterior
      const currentOrder = orders.find((order: any) => order.id === orderId);
      console.log('🔄 INÍCIO handleStatusUpdate:', { orderId, newStatus });
      console.log('🔄 Status ANTERIOR:', currentOrder?.status);
      console.log('🔄 Status NOVO:', newStatus);
      console.log('🔄 URL sendo chamada:', `/purchase/orders/${orderId}/status?new_status=${newStatus}`);
      
      const response = await api.put(`/purchase/orders/${orderId}/status?new_status=${newStatus}`);
      console.log('✅ Resposta do servidor:', response.data);
      
      toast.success('Status atualizado com sucesso!');
      
      console.log('🔄 Invalidando queries e forçando refresh...');
      
      // Invalidar todas as queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['purchase-order-details'] });
      
      // Forçar refresh da página atual
      await refetch();
      
      // Forçar refresh adicional após um pequeno delay
      setTimeout(async () => {
        await refetch();
        console.log('🔄 Refresh adicional concluído');
      }, 500);
      
      console.log('🔄 Queries invalidadas e refetch concluído');
      
      setStatusMenuAnchor(null);
      setSelectedOrderForStatus(null);
      console.log('🔄 Menu fechado e estado limpo');
    } catch (error: any) {
      console.error('❌ ERRO COMPLETO ao atualizar status:', error);
      console.error('❌ Response data:', error.response?.data);
      console.error('❌ Response status:', error.response?.status);
      console.error('❌ Response headers:', error.response?.headers);
      const errorMessage = error.response?.data?.detail || 'Erro ao atualizar status';
      toast.error(errorMessage);
    }
  };

  const handleStatusMenuOpen = (event: React.MouseEvent<HTMLElement>, orderId: string) => {
    console.log('🔵 handleStatusMenuOpen chamado:', { orderId, event });
    setStatusMenuAnchor(event.currentTarget);
    setSelectedOrderForStatus(orderId);
    console.log('🔵 Estado após setar:', { anchor: event.currentTarget, selectedOrder: orderId });
  };

  const handleStatusMenuClose = () => {
    console.log('🔴 handleStatusMenuClose chamado');
    setStatusMenuAnchor(null);
    setSelectedOrderForStatus(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  // Componente para cabeçalhos ordenáveis
  const SortableTableCell = ({ children, sortKey, align = 'left' }: { 
    children: React.ReactNode; 
    sortKey: string; 
    align?: 'left' | 'center' | 'right' 
  }) => (
    <TableCell 
      align={align}
      onClick={() => handleSort(sortKey)}
      sx={{ 
        cursor: 'pointer', 
        userSelect: 'none',
        '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
      }}
    >
      <Box display="flex" alignItems="center" justifyContent={align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'}>
        {children}
        {sortConfig?.key === sortKey && (
          sortConfig.direction === 'asc' ? 
            <ArrowUpwardIcon fontSize="small" sx={{ ml: 1 }} /> : 
            <ArrowDownwardIcon fontSize="small" sx={{ ml: 1 }} />
        )}
      </Box>
    </TableCell>
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    try {
      // Limpar a string da data - pegar apenas YYYY-MM-DD
      let cleanDate = dateString;
      if (dateString.includes('T')) {
        cleanDate = dateString.split('T')[0];
      }
      
      // Criar data no formato local sem problemas de timezone
      const [year, month, day] = cleanDate.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        console.error('Data inválida:', dateString);
        return 'Data inválida';
      }
      
      // Formatar para dd/mm/yyyy
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
    } catch (error) {
      console.error('Erro ao formatar data:', error, 'Data original:', dateString);
      return 'N/A';
    }
  };

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error" variant="h6">
          Erro ao carregar pedidos de compra
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {error instanceof Error ? error.message : 'Erro desconhecido'}
        </Typography>
        <Button onClick={() => refetch()} variant="outlined" sx={{ mt: 2 }}>
          Tentar Novamente
        </Button>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Pedidos de Compra
          </Typography>
        </Box>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={40} />
          <Typography sx={{ ml: 2 }}>🔍 Carregando pedidos...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {orders.length} pedidos de compra encontrados
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie pedidos de compra e fornecedores
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <Box display="flex" border="1px solid" borderColor="divider" borderRadius={1}>
            <Tooltip title="Visão Simples">
              <IconButton
                size="small"
                onClick={() => setViewMode('simple')}
                sx={{ 
                  backgroundColor: viewMode === 'simple' ? 'primary.main' : 'transparent',
                  color: viewMode === 'simple' ? 'primary.contrastText' : 'inherit',
                  '&:hover': {
                    backgroundColor: viewMode === 'simple' ? 'primary.dark' : 'action.hover'
                  }
                }}
              >
                <ViewListIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Visão Avançada (Agrupamento)">
              <IconButton
                size="small"
                onClick={() => setViewMode('advanced')}
                sx={{ 
                  backgroundColor: viewMode === 'advanced' ? 'primary.main' : 'transparent',
                  color: viewMode === 'advanced' ? 'primary.contrastText' : 'inherit',
                  '&:hover': {
                    backgroundColor: viewMode === 'advanced' ? 'primary.dark' : 'action.hover'
                  }
                }}
              >
                <DashboardIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateModalOpen(true)}
          >
            Novo Pedido
          </Button>
        </Box>
      </Box>

      {/* Filtros Simples */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Filtros
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Status"
                select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                size="small"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="rascunho">Rascunho</MenuItem>
                <MenuItem value="enviado">Enviado</MenuItem>
                <MenuItem value="confirmado">Confirmado</MenuItem>
                <MenuItem value="parcial">Parcial</MenuItem>
                <MenuItem value="recebido">Recebido</MenuItem>
                <MenuItem value="cancelado">Cancelado</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Urgência"
                select
                value={filters.urgency}
                onChange={(e) => setFilters(prev => ({ ...prev, urgency: e.target.value }))}
                size="small"
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="baixa">Baixa</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="alta">Alta</MenuItem>
                <MenuItem value="critica">Crítica</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Data Inicial"
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setFilters({ 
                  supplier_id: '', 
                  status: '', 
                  date_from: '', 
                  date_to: '',
                  urgency: '',
                  order_number: '',
                  min_items: '',
                  max_items: ''
                })}
                size="small"
              >
                Limpar Filtros
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Conteúdo da Tabela - Condicional */}
      {viewMode === 'simple' ? (
        /* Tabela Simples */
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width={40}></TableCell>
                  <SortableTableCell sortKey="order_number">Número</SortableTableCell>
                  <SortableTableCell sortKey="supplier_name">Fornecedor</SortableTableCell>
                  <SortableTableCell sortKey="order_date">Data</SortableTableCell>
                  <SortableTableCell sortKey="status">Status</SortableTableCell>
                  <SortableTableCell sortKey="urgency">Urgência</SortableTableCell>
                  <SortableTableCell sortKey="items_count" align="center">Itens</SortableTableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary">
                        Nenhum pedido encontrado
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedOrders.map((order: any) => (
                    <TableRow 
                      key={order.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, order.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, order.id)}
                      onDragEnd={handleDragEnd}
                      sx={{
                        cursor: 'grab',
                        opacity: draggedOrder === order.id ? 0.5 : 1,
                        backgroundColor: draggedOrder === order.id ? 'rgba(0,0,0,0.1)' : 'inherit',
                        '&:active': { cursor: 'grabbing' },
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
                      }}
                    >
                      <TableCell>
                        <DragIndicatorIcon 
                          fontSize="small" 
                          sx={{ 
                            color: 'text.secondary',
                            cursor: 'grab',
                            '&:active': { cursor: 'grabbing' }
                          }} 
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {order.order_number || order.numero_pedido || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {order.supplier_name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(order.order_date)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={order.status || 'N/A'}
                          color={statusColors[order.status as keyof typeof statusColors] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={order.urgency || 'N/A'}
                          color={urgencyColors[order.urgency as keyof typeof urgencyColors] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="medium">
                          {order.items_count || 0} itens
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Visualizar">
                          <IconButton
                            size="small"
                            onClick={() => handleView(order.id)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(order.id)}
                            disabled={order.status === 'recebido' || order.status === 'cancelado'}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download">
                          <IconButton
                            size="small"
                            onClick={() => handleDownload(order.id, order.order_number || order.numero_pedido)}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Status">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              console.log('🔴 IconButton clicado:', { orderId: order.id, event: e });
                              handleStatusMenuOpen(e, order.id);
                            }}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(order.id, order.order_number || order.numero_pedido)}
                            disabled={order.status === 'recebido'}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Linhas por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`}
          />
        </Card>
      ) : (
        /* Grid Avançado com Agrupamento Material-UI */
        <Card>
          <Box>
            {/* Área de Agrupamento Compacta */}
            <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider', backgroundColor: 'grey.25' }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  🎯 Agrupamento:
                </Typography>
                {groupByColumns.length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    Arraste 🏢📅🔄⚡ aqui
                  </Typography>
                )}
              </Box>
              <Box 
                onDragOver={handleGroupAreaDragOver}
                onDrop={handleGroupAreaDrop}
                sx={{ 
                  minHeight: '32px', 
                  border: '1px dashed', 
                  borderColor: draggedColumn ? 'primary.main' : 'grey.300',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: groupByColumns.length > 0 ? 'flex-start' : 'center',
                  backgroundColor: draggedColumn ? 'rgba(25,118,210,0.05)' : 'background.paper',
                  gap: 0.5,
                  px: 1,
                  py: 0.5,
                  flexWrap: 'wrap',
                  transition: 'all 0.2s ease'
                }}
              >
                {groupByColumns.length === 0 ? (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Solte as colunas aqui para agrupar
                  </Typography>
                ) : (
                  groupByColumns.map((column, index) => (
                    <Chip
                      key={column}
                      label={getColumnLabel(column)}
                      onDelete={() => removeGroupColumn(column)}
                      color="primary"
                      variant="filled"
                      size="small"
                      sx={{ height: '24px', fontSize: '0.75rem' }}
                    />
                  ))
                )}
              </Box>
            </Box>

            {/* Tabela com Funcionalidades Avançadas */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={40}></TableCell>
                    <SortableTableCell sortKey="order_number">
                      📋 Número
                    </SortableTableCell>
                    <TableCell 
                      onClick={() => handleSort('supplier_name')}
                      sx={{ 
                        cursor: 'pointer', 
                        userSelect: 'none',
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="flex-start">
                        <Box 
                          draggable
                          onDragStart={(e) => {
                            console.log('🔥 STARTING DRAG SUPPLIER');
                            handleColumnDragStart(e, 'supplier_name');
                          }}
                          onDragEnd={handleColumnDragEnd}
                          sx={{ 
                            cursor: 'grab', 
                            '&:active': { cursor: 'grabbing' },
                            opacity: draggedColumn === 'supplier_name' ? 0.5 : 1,
                            padding: '2px 6px',
                            borderRadius: 1,
                            border: '1px dashed transparent',
                            '&:hover': { 
                              backgroundColor: 'rgba(25,118,210,0.1)',
                              border: '1px dashed #1976d2'
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          🏢 Fornecedor
                        </Box>
                        {sortConfig?.key === 'supplier_name' && (
                          sortConfig.direction === 'asc' ? 
                            <ArrowUpwardIcon fontSize="small" sx={{ ml: 1 }} /> : 
                            <ArrowDownwardIcon fontSize="small" sx={{ ml: 1 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      onClick={() => handleSort('order_date')}
                      sx={{ 
                        cursor: 'pointer', 
                        userSelect: 'none',
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="flex-start">
                        <Box 
                          draggable
                          onDragStart={(e) => {
                            console.log('🔥 STARTING DRAG DATE');
                            handleColumnDragStart(e, 'order_date');
                          }}
                          onDragEnd={handleColumnDragEnd}
                          sx={{ 
                            cursor: 'grab', 
                            '&:active': { cursor: 'grabbing' },
                            opacity: draggedColumn === 'order_date' ? 0.5 : 1,
                            padding: '2px 6px',
                            borderRadius: 1,
                            border: '1px dashed transparent',
                            '&:hover': { 
                              backgroundColor: 'rgba(25,118,210,0.1)',
                              border: '1px dashed #1976d2'
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          📅 Data
                        </Box>
                        {sortConfig?.key === 'order_date' && (
                          sortConfig.direction === 'asc' ? 
                            <ArrowUpwardIcon fontSize="small" sx={{ ml: 1 }} /> : 
                            <ArrowDownwardIcon fontSize="small" sx={{ ml: 1 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      onClick={() => handleSort('status')}
                      sx={{ 
                        cursor: 'pointer', 
                        userSelect: 'none',
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="flex-start">
                        <Box 
                          draggable
                          onDragStart={(e) => {
                            console.log('🔥 STARTING DRAG STATUS');
                            handleColumnDragStart(e, 'status');
                          }}
                          onDragEnd={handleColumnDragEnd}
                          sx={{ 
                            cursor: 'grab', 
                            '&:active': { cursor: 'grabbing' },
                            opacity: draggedColumn === 'status' ? 0.5 : 1,
                            padding: '2px 6px',
                            borderRadius: 1,
                            border: '1px dashed transparent',
                            '&:hover': { 
                              backgroundColor: 'rgba(25,118,210,0.1)',
                              border: '1px dashed #1976d2'
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          🔄 Status
                        </Box>
                        {sortConfig?.key === 'status' && (
                          sortConfig.direction === 'asc' ? 
                            <ArrowUpwardIcon fontSize="small" sx={{ ml: 1 }} /> : 
                            <ArrowDownwardIcon fontSize="small" sx={{ ml: 1 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      onClick={() => handleSort('urgency')}
                      sx={{ 
                        cursor: 'pointer', 
                        userSelect: 'none',
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="flex-start">
                        <Box 
                          draggable
                          onDragStart={(e) => {
                            console.log('🔥 STARTING DRAG URGENCY');
                            handleColumnDragStart(e, 'urgency');
                          }}
                          onDragEnd={handleColumnDragEnd}
                          sx={{ 
                            cursor: 'grab', 
                            '&:active': { cursor: 'grabbing' },
                            opacity: draggedColumn === 'urgency' ? 0.5 : 1,
                            padding: '2px 6px',
                            borderRadius: 1,
                            border: '1px dashed transparent',
                            '&:hover': { 
                              backgroundColor: 'rgba(25,118,210,0.1)',
                              border: '1px dashed #1976d2'
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          ⚡ Urgência
                        </Box>
                        {sortConfig?.key === 'urgency' && (
                          sortConfig.direction === 'asc' ? 
                            <ArrowUpwardIcon fontSize="small" sx={{ ml: 1 }} /> : 
                            <ArrowDownwardIcon fontSize="small" sx={{ ml: 1 }} />
                        )}
                      </Box>
                    </TableCell>
                    <SortableTableCell sortKey="items_count" align="center">📦 Itens</SortableTableCell>
                    <TableCell align="center">⚙️ Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="text.secondary">
                          Nenhum pedido encontrado
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : groupByColumns.length === 0 ? (
                    // Exibição normal sem agrupamento
                    sortedOrders.map((order: any) => (
                      <TableRow 
                        key={order.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, order.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, order.id)}
                        onDragEnd={handleDragEnd}
                        sx={{
                          cursor: 'grab',
                          opacity: draggedOrder === order.id ? 0.5 : 1,
                          backgroundColor: draggedOrder === order.id ? 'rgba(25,118,210,0.1)' : 'inherit',
                          '&:active': { cursor: 'grabbing' },
                          '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
                        }}
                      >
                        <TableCell>
                          <DragIndicatorIcon 
                            fontSize="small" 
                            sx={{ 
                              color: 'primary.main',
                              cursor: 'grab',
                              '&:active': { cursor: 'grabbing' }
                            }} 
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {order.order_number || order.numero_pedido || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {order.supplier_name || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(order.order_date)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={order.status || 'N/A'}
                            color={statusColors[order.status as keyof typeof statusColors] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={order.urgency || 'N/A'}
                            color={urgencyColors[order.urgency as keyof typeof urgencyColors] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight="medium">
                            {order.items_count || 0} itens
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Visualizar">
                            <IconButton size="small" onClick={() => handleView(order.id)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(order.id)}
                              disabled={order.status === 'recebido' || order.status === 'cancelado'}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download">
                            <IconButton
                              size="small"
                              onClick={() => handleDownload(order.id, order.order_number || order.numero_pedido)}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Status">
                            <IconButton
                              size="small"
                              onClick={(e) => handleStatusMenuOpen(e, order.id)}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(order.id, order.order_number || order.numero_pedido)}
                              disabled={order.status === 'recebido'}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    // Exibição com agrupamento
                    Object.entries(groupedOrders).map(([groupKey, groupOrders]) => (
                      <React.Fragment key={groupKey}>
                        {/* Cabeçalho do Grupo */}
                        <TableRow sx={{ backgroundColor: 'primary.50' }}>
                          <TableCell colSpan={8}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                                📁 {groupKey} ({groupOrders.length} pedidos)
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                        {/* Itens do Grupo */}
                        {groupOrders.map((order: any) => (
                          <TableRow 
                            key={order.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, order.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, order.id)}
                            onDragEnd={handleDragEnd}
                            sx={{
                              cursor: 'grab',
                              opacity: draggedOrder === order.id ? 0.5 : 1,
                              backgroundColor: draggedOrder === order.id ? 'rgba(25,118,210,0.1)' : 'inherit',
                              '&:active': { cursor: 'grabbing' },
                              '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                              pl: 2 // Indent para mostrar hierarquia
                            }}
                          >
                            <TableCell>
                              <DragIndicatorIcon 
                                fontSize="small" 
                                sx={{ 
                                  color: 'text.secondary',
                                  cursor: 'grab',
                                  '&:active': { cursor: 'grabbing' }
                                }} 
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {order.order_number || order.numero_pedido || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {order.supplier_name || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(order.order_date)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={order.status || 'N/A'}
                                color={statusColors[order.status as keyof typeof statusColors] || 'default'}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={order.urgency || 'N/A'}
                                color={urgencyColors[order.urgency as keyof typeof urgencyColors] || 'default'}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">
                                {order.items_count || 0}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="Visualizar">
                                <IconButton size="small" onClick={() => handleView(order.id)}>
                                  <ViewIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Editar">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEdit(order.id)}
                                  disabled={order.status === 'recebido' || order.status === 'cancelado'}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Download">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownload(order.id, order.order_number || order.numero_pedido)}
                                >
                                  <DownloadIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Status">
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleStatusMenuOpen(e, order.id)}
                                >
                                  <MoreVertIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Excluir">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteClick(order.id, order.order_number || order.numero_pedido)}
                                  disabled={order.status === 'recebido'}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Paginação */}
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Linhas por página:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`}
                sx={{ px: 2 }}
              />
            </Box>
          </Box>
        </Card>
      )}

      {/* Modals */}
      <CreatePurchaseOrderModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={async () => {
          setCreateModalOpen(false);
          await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
          refetch();
        }}
      />

      {selectedOrderId && (
        <>
          <ViewPurchaseOrderModal
            open={viewModalOpen}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedOrderId(null);
            }}
            orderId={selectedOrderId}
          />

          <EditPurchaseOrderModal
            open={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedOrderId(null);
            }}
            onSuccess={async () => {
              console.error('=== PÁGINA: ON SUCCESS CHAMADO ===');
              setEditModalOpen(false);
              setSelectedOrderId(null);
              
              // Forçar atualização completa
              await queryClient.clear();
              await refetch();
              console.error('=== PÁGINA: REFETCH CONCLUÍDO ===');
            }}
            orderId={selectedOrderId}
          />
        </>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title" color="error">
          Confirmar Exclusão
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Tem certeza que deseja excluir o pedido <strong>{orderToDelete?.orderNumber}</strong>?
            <br />
            <br />
            <Typography variant="body2" color="warning.main">
              ⚠️ Esta ação não pode ser desfeita!
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            autoFocus
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu de Status */}
      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={() => {
          console.log('🔴 Menu onClose chamado - NÃO limpando selectedOrderForStatus ainda');
          setStatusMenuAnchor(null);
          // NÃO limpar selectedOrderForStatus aqui para evitar race condition
        }}
      >
        <MenuItem onClick={() => {
          console.log('🔘🔘🔘 CLICOU EM RASCUNHO 🔘🔘🔘');
          console.log('🔘 selectedOrderForStatus:', selectedOrderForStatus);
          if (!selectedOrderForStatus) {
            console.error('❌ ERRO: selectedOrderForStatus é null!');
            return;
          }
          
          console.log('🔘 Alterando status para RASCUNHO do pedido:', selectedOrderForStatus);
          handleStatusUpdate(selectedOrderForStatus, 'rascunho');
          setStatusMenuAnchor(null);
          setSelectedOrderForStatus(null);
        }}>
          <ListItemIcon>📝</ListItemIcon>
          <ListItemText>Rascunho</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          console.log('🔘🔘🔘 CLICOU EM ENVIADO 🔘🔘🔘');
          console.log('🔘 selectedOrderForStatus:', selectedOrderForStatus);
          if (!selectedOrderForStatus) {
            console.error('❌ ERRO: selectedOrderForStatus é null!');
            return;
          }
          
          console.log('🔘 Alterando status para ENVIADO do pedido:', selectedOrderForStatus);
          handleStatusUpdate(selectedOrderForStatus, 'enviado');
          setStatusMenuAnchor(null);
          setSelectedOrderForStatus(null);
        }}>
          <ListItemIcon>📧</ListItemIcon>
          <ListItemText>Enviado</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          console.log('🔘🔘🔘 CLICOU EM CONFIRMADO 🔘🔘🔘');
          console.log('🔘 selectedOrderForStatus:', selectedOrderForStatus);
          if (!selectedOrderForStatus) {
            console.error('❌ ERRO: selectedOrderForStatus é null!');
            return;
          }
          
          console.log('🔘 Alterando status para CONFIRMADO do pedido:', selectedOrderForStatus);
          handleStatusUpdate(selectedOrderForStatus, 'confirmado');
          setStatusMenuAnchor(null);
          setSelectedOrderForStatus(null);
        }}>
          <ListItemIcon>✅</ListItemIcon>
          <ListItemText>Confirmado</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          console.log('🔘🔘🔘 CLICOU EM PARCIAL 🔘🔘🔘');
          console.log('🔘 selectedOrderForStatus:', selectedOrderForStatus);
          if (!selectedOrderForStatus) {
            console.error('❌ ERRO: selectedOrderForStatus é null!');
            return;
          }
          
          console.log('🔘 Alterando status para PARCIAL do pedido:', selectedOrderForStatus);
          handleStatusUpdate(selectedOrderForStatus, 'parcial');
          setStatusMenuAnchor(null);
          setSelectedOrderForStatus(null);
        }}>
          <ListItemIcon>🔄</ListItemIcon>
          <ListItemText>Parcial</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          console.log('🔘🔘🔘 CLICOU EM RECEBIDO 🔘🔘🔘');
          console.log('🔘 selectedOrderForStatus:', selectedOrderForStatus);
          if (!selectedOrderForStatus) {
            console.error('❌ ERRO: selectedOrderForStatus é null!');
            return;
          }
          
          console.log('🔘 Alterando status para RECEBIDO do pedido:', selectedOrderForStatus);
          handleStatusUpdate(selectedOrderForStatus, 'recebido');
          setStatusMenuAnchor(null);
          setSelectedOrderForStatus(null);
        }}>
          <ListItemIcon>📦</ListItemIcon>
          <ListItemText>Recebido</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          console.log('🔘🔘🔘 CLICOU EM CANCELADO 🔘🔘🔘');
          console.log('🔘 selectedOrderForStatus:', selectedOrderForStatus);
          if (!selectedOrderForStatus) {
            console.error('❌ ERRO: selectedOrderForStatus é null!');
            return;
          }
          
          console.log('🔘 Alterando status para CANCELADO do pedido:', selectedOrderForStatus);
          handleStatusUpdate(selectedOrderForStatus, 'cancelado');
          setStatusMenuAnchor(null);
          setSelectedOrderForStatus(null);
        }}>
          <ListItemIcon>❌</ListItemIcon>
          <ListItemText>Cancelado</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};