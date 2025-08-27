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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  CheckCircle as ProcessIcon,
  Upload as ImportIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { StockEntry } from '@/types/purchase';
import { api } from '@/services/api';
import { CreateStockEntryModal } from '@/components/stock/CreateStockEntryModal';
import { ViewStockEntryModal } from '@/components/stock/ViewStockEntryModal';
import { ImportNfeModal } from '@/components/stock/ImportNfeModal';

const statusColors = {
  pendente: 'default',
  conferido: 'info',
  lancado: 'success',
  cancelado: 'error',
} as const;

export const StockEntries: React.FC = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState({
    supplier_id: '',
    status: '',
    date_from: '',
    date_to: '',
  });

  const { data: entriesResponse, isLoading, refetch } = useQuery({
    queryKey: ['stock-entries', page, rowsPerPage, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: rowsPerPage.toString(),
        offset: (page * rowsPerPage).toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
      });
      
      const response = await api.get(`/stock/entries?${params}`);
      return response.data;
    },
  });

  const entries = entriesResponse?.data || [];
  const totalCount = entriesResponse?.total || 0;

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleView = (entryId: string) => {
    setSelectedEntryId(entryId);
    setViewModalOpen(true);
  };

  const handleProcessEntry = async (entryId: string) => {
    try {
      await api.post(`/stock/entries/${entryId}/process`);
      toast.success('Entrada processada com sucesso!');
      refetch();
    } catch (error) {
      toast.error('Erro ao processar entrada');
    }
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Entrada de Estoque
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={() => setImportModalOpen(true)}
          >
            Importar NFe
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateModalOpen(true)}
          >
            Nova Entrada
          </Button>
        </Box>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Status"
                select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                size="small"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="pendente">Pendente</MenuItem>
                <MenuItem value="conferido">Conferido</MenuItem>
                <MenuItem value="lancado">Lançado</MenuItem>
                <MenuItem value="cancelado">Cancelado</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Data Início"
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Data Fim"
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
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
                <TableCell>NFe</TableCell>
                <TableCell>Data Recebimento</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Nenhuma entrada encontrada
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry: StockEntry) => (
                  <TableRow key={entry.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {entry.numero_entrada}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {entry.supplier_name || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {entry.nfe_numero ? (
                        <Typography variant="body2">
                          {entry.nfe_numero}
                          {entry.nfe_serie && `/${entry.nfe_serie}`}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Sem NFe
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDateTime(entry.data_recebimento)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                        color={statusColors[entry.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(entry.total_produtos)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Visualizar">
                        <IconButton
                          size="small"
                          onClick={() => handleView(entry.id)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {entry.status === 'pendente' && (
                        <Tooltip title="Processar Entrada">
                          <IconButton 
                            size="small" 
                            onClick={() => handleProcessEntry(entry.id)}
                            color="success"
                          >
                            <ProcessIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Editar">
                        <IconButton size="small">
                          <EditIcon />
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
      <CreateStockEntryModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
          refetch();
        }}
      />

      <ImportNfeModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          setImportModalOpen(false);
          refetch();
        }}
      />

      {selectedEntryId && (
        <ViewStockEntryModal
          open={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedEntryId(null);
          }}
          entryId={selectedEntryId}
        />
      )}
    </Box>
  );
};