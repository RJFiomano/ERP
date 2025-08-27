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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Warning as WarningIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { AccountPayable } from '@/types/purchase';
import { api } from '@/services/api';
import { CreateAccountPayableModal } from '@/components/purchase/CreateAccountPayableModal';
import { ViewAccountPayableModal } from '@/components/purchase/ViewAccountPayableModal';
import { ProcessPaymentModal } from '@/components/purchase/ProcessPaymentModal';

const statusColors = {
  em_aberto: 'warning',
  pago_parcial: 'info',
  pago: 'success',
  cancelado: 'error',
  contestado: 'secondary',
} as const;

export const PurchaseAccountsPayable: React.FC = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState({
    supplier_id: '',
    status: '',
    due_date_from: '',
    due_date_to: '',
    overdue_only: false,
  });

  const { data: accountsResponse, isLoading, refetch } = useQuery({
    queryKey: ['accounts-payable', page, rowsPerPage, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: rowsPerPage.toString(),
        offset: (page * rowsPerPage).toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '' && value !== false)),
      });
      
      const response = await api.get(`/accounts-payable?${params}`);
      return response.data;
    },
  });

  // Consulta para dashboard resumo
  const { data: dashboardData } = useQuery({
    queryKey: ['accounts-payable-dashboard'],
    queryFn: async () => {
      const response = await api.get('/accounts-payable/dashboard/summary');
      return response.data;
    },
  });

  const accounts = accountsResponse?.data || [];
  const totalCount = accountsResponse?.total || 0;
  const summary = dashboardData?.data || {};

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleView = (accountId: string) => {
    setSelectedAccountId(accountId);
    setViewModalOpen(true);
  };

  const handlePayment = (accountId: string) => {
    setSelectedAccountId(accountId);
    setPaymentModalOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getDaysOverdue = (dueDateString: string, status: string) => {
    if (status === 'pago') return 0;
    
    const dueDate = new Date(dueDateString);
    const today = new Date();
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Contas a Pagar
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateModalOpen(true)}
        >
          Nova Conta
        </Button>
      </Box>

      {/* Dashboard Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total em Aberto
              </Typography>
              <Typography variant="h6" color="warning.main">
                {formatCurrency(summary.total_balance || 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {summary.total_accounts || 0} contas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Vencidas
              </Typography>
              <Typography variant="h6" color="error.main">
                {formatCurrency(summary.overdue_balance || 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {summary.overdue_accounts || 0} contas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Vencem este Mês
              </Typography>
              <Typography variant="h6" color="info.main">
                {formatCurrency(summary.due_this_month_balance || 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {summary.due_this_month || 0} parcelas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Próximos 30 dias
              </Typography>
              <Typography variant="h6" color="primary.main">
                {formatCurrency(summary.due_next_30_days_balance || 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {summary.due_next_30_days || 0} parcelas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Status"
                select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                size="small"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="em_aberto">Em Aberto</MenuItem>
                <MenuItem value="pago_parcial">Pago Parcial</MenuItem>
                <MenuItem value="pago">Pago</MenuItem>
                <MenuItem value="vencido">Vencido</MenuItem>
                <MenuItem value="cancelado">Cancelado</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Vencimento Início"
                type="date"
                value={filters.due_date_from}
                onChange={(e) => setFilters(prev => ({ ...prev, due_date_from: e.target.value }))}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Vencimento Fim"
                type="date"
                value={filters.due_date_to}
                onChange={(e) => setFilters(prev => ({ ...prev, due_date_to: e.target.value }))}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant={filters.overdue_only ? "contained" : "outlined"}
                color="error"
                onClick={() => setFilters(prev => ({ ...prev, overdue_only: !prev.overdue_only }))}
              >
                Apenas Vencidas
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => refetch()}
              >
                Filtrar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Número</TableCell>
                <TableCell>Fornecedor</TableCell>
                <TableCell>Documento</TableCell>
                <TableCell>Vencimento</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Valor Original</TableCell>
                <TableCell align="right">Saldo</TableCell>
                <TableCell align="center">Atraso</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Nenhuma conta encontrada
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account: AccountPayable) => {
                  const daysOverdue = getDaysOverdue(account.data_vencimento_original, account.status);
                  return (
                    <TableRow key={account.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {account.numero_conta}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {account.supplier_name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {account.documento_numero}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {formatDate(account.data_vencimento_original)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={account.status.replace('_', ' ').charAt(0).toUpperCase() + account.status.replace('_', ' ').slice(1)}
                          color={statusColors[account.status]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(account.valor_original)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium" 
                          color={account.valor_em_aberto > 0 ? 'error.main' : 'success.main'}
                        >
                          {formatCurrency(account.valor_em_aberto)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {daysOverdue > 0 ? (
                          <Chip
                            icon={<WarningIcon />}
                            label={`${daysOverdue} dias`}
                            color="error"
                            size="small"
                          />
                        ) : (
                          <Chip
                            label="Em dia"
                            color="success"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Visualizar">
                          <IconButton
                            size="small"
                            onClick={() => handleView(account.id)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {account.status !== 'pago' && (
                          <Tooltip title="Registrar Pagamento">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handlePayment(account.id)}
                            >
                              <PaymentIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Comprovante">
                          <IconButton size="small">
                            <ReceiptIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
        />
      </Paper>

      {/* Modals */}
      <CreateAccountPayableModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
          refetch();
        }}
      />

      {selectedAccountId && (
        <>
          <ViewAccountPayableModal
            open={viewModalOpen}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedAccountId(null);
            }}
            accountId={selectedAccountId}
          />
          
          <ProcessPaymentModal
            open={paymentModalOpen}
            onClose={() => {
              setPaymentModalOpen(false);
              setSelectedAccountId(null);
            }}
            accountId={selectedAccountId}
            onSuccess={() => {
              setPaymentModalOpen(false);
              setSelectedAccountId(null);
              refetch();
            }}
          />
        </>
      )}
    </Box>
  );
};