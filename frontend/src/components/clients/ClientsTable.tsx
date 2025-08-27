import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Typography,
  Box,
  Tooltip,
  TableSortLabel,
} from '@mui/material';
import { Edit, Delete, Visibility, ToggleOff, ToggleOn } from '@mui/icons-material';
import { Client, PersonType } from '@/types/client';

interface ClientsTableProps {
  clients: Client[];
  total: number;
  page: number;
  rowsPerPage: number;
  loading?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onView: (client: Client) => void;
  onToggleStatus: (client: Client) => void;
  onSort?: (field: string) => void;
}

export const ClientsTable: React.FC<ClientsTableProps> = ({
  clients,
  total,
  page,
  rowsPerPage,
  loading = false,
  sortBy = 'created_at',
  sortOrder = 'desc',
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onDelete,
  onView,
  onToggleStatus,
  onSort,
}) => {
  const formatDocument = (document: string, type: PersonType) => {
    if (type === PersonType.PF) {
      // CPF: 000.000.000-00
      return document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      // CNPJ: 00.000.000/0000-00
      return document.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return '-';
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length <= 10) {
      return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    onPageChange(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    onRowsPerPageChange(parseInt(event.target.value, 10));
    onPageChange(0);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Typography>Carregando clientes...</Typography>
      </Box>
    );
  }

  if (clients.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Typography color="textSecondary">
          Nenhum cliente encontrado
        </Typography>
      </Box>
    );
  }

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'name'}
                  direction={sortBy === 'name' ? sortOrder : 'asc'}
                  onClick={() => onSort?.('name')}
                >
                  Nome
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'person_type'}
                  direction={sortBy === 'person_type' ? sortOrder : 'asc'}
                  onClick={() => onSort?.('person_type')}
                >
                  Tipo
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'document'}
                  direction={sortBy === 'document' ? sortOrder : 'asc'}
                  onClick={() => onSort?.('document')}
                >
                  Documento
                </TableSortLabel>
              </TableCell>
              <TableCell>RG</TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'email'}
                  direction={sortBy === 'email' ? sortOrder : 'asc'}
                  onClick={() => onSort?.('email')}
                >
                  Email
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'phone'}
                  direction={sortBy === 'phone' ? sortOrder : 'asc'}
                  onClick={() => onSort?.('phone')}
                >
                  Telefone
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'is_active'}
                  direction={sortBy === 'is_active' ? sortOrder : 'asc'}
                  onClick={() => onSort?.('is_active')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id} hover>
                <TableCell>
                  <Typography variant="subtitle2">{client.name}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={client.person_type === PersonType.PF ? 'Pessoa Física' : 'Pessoa Jurídica'}
                    color={client.person_type === PersonType.PF ? 'primary' : 'secondary'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {formatDocument(client.document, client.person_type)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {client.rg || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {client.email || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatPhone(client.phone)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title={`Clique para ${client.is_active ? 'desativar' : 'ativar'}`}>
                    <Chip
                      label={client.is_active ? 'Ativo' : 'Inativo'}
                      color={client.is_active ? 'success' : 'error'}
                      size="small"
                      onClick={() => onToggleStatus(client)}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Tooltip>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Visualizar">
                    <IconButton
                      size="small"
                      onClick={() => onView(client)}
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar">
                    <IconButton
                      size="small"
                      onClick={() => onEdit(client)}
                    >
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={client.is_active ? 'Desativar' : 'Ativar'}>
                    <IconButton
                      size="small"
                      onClick={() => onToggleStatus(client)}
                      color={client.is_active ? 'warning' : 'success'}
                    >
                      {client.is_active ? <ToggleOff /> : <ToggleOn />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir">
                    <IconButton
                      size="small"
                      onClick={() => onDelete(client)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={total}
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
  );
};