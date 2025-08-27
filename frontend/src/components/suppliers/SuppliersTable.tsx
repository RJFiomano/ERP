import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  IconButton,
  Chip,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import {
  Edit,
  Delete,
  Visibility,
  ToggleOn,
  ToggleOff,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { Supplier } from '@/types/supplier';

interface SuppliersTableProps {
  suppliers: Supplier[];
  total: number;
  page: number;
  rowsPerPage: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
  onView: (supplier: Supplier) => void;
  onToggleStatus: (supplier: Supplier) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
}

export const SuppliersTable: React.FC<SuppliersTableProps> = ({
  suppliers,
  total,
  page,
  rowsPerPage,
  loading = false,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onDelete,
  onView,
  onToggleStatus,
  sortBy,
  sortOrder,
  onSort,
}) => {
  const formatDocument = (document: string, personType: string) => {
    const cleanDoc = document.replace(/\D/g, '');
    
    if (personType === 'PF' && cleanDoc.length === 11) {
      // Formato CPF: 000.000.000-00
      return `${cleanDoc.slice(0, 3)}.${cleanDoc.slice(3, 6)}.${cleanDoc.slice(6, 9)}-${cleanDoc.slice(9)}`;
    }
    
    if (personType === 'PJ' && cleanDoc.length === 14) {
      // Formato CNPJ: 00.000.000/0000-00
      return `${cleanDoc.slice(0, 2)}.${cleanDoc.slice(2, 5)}.${cleanDoc.slice(5, 8)}/${cleanDoc.slice(8, 12)}-${cleanDoc.slice(12)}`;
    }
    
    return document;
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length === 10) {
      return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 6)}-${cleanPhone.slice(6)}`;
    }
    
    if (cleanPhone.length === 11) {
      return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7)}`;
    }
    
    return phone;
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableCell
      onClick={() => onSort(field)}
      sx={{ cursor: 'pointer', userSelect: 'none' }}
    >
      <Box display="flex" alignItems="center">
        {children}
        {sortBy === field && (
          sortOrder === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
        )}
      </Box>
    </TableCell>
  );

  if (loading) {
    return (
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box display="flex" justifyContent="center" alignItems="center" p={4}>
          <CircularProgress />
          <Typography variant="body2" sx={{ ml: 2 }}>
            Carregando fornecedores...
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ width: '100%', mb: 2 }}>
      <TableContainer>
        <Table sx={{ minWidth: 750 }}>
          <TableHead>
            <TableRow>
              <SortableHeader field="name">Nome</SortableHeader>
              <SortableHeader field="person_type">Tipo</SortableHeader>
              <SortableHeader field="document">Documento</SortableHeader>
              <SortableHeader field="email">Email</SortableHeader>
              <SortableHeader field="phone">Telefone</SortableHeader>
              <SortableHeader field="is_active">Status</SortableHeader>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="textSecondary" py={4}>
                    Nenhum fornecedor encontrado
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow
                  key={supplier.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    <Typography variant="body2" fontWeight="medium">
                      {supplier.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={supplier.person_type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                      size="small"
                      color={supplier.person_type === 'PF' ? 'primary' : 'secondary'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDocument(supplier.document, supplier.person_type)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {supplier.email || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatPhone(supplier.phone) || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={supplier.is_active ? 'Ativo' : 'Inativo'}
                      size="small"
                      color={supplier.is_active ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" gap={0.5}>
                      <IconButton
                        size="small"
                        onClick={() => onView(supplier)}
                        title="Visualizar fornecedor"
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => onEdit(supplier)}
                        title="Editar fornecedor"
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => onToggleStatus(supplier)}
                        title={supplier.is_active ? 'Inativar fornecedor' : 'Ativar fornecedor'}
                        color={supplier.is_active ? 'warning' : 'success'}
                      >
                        {supplier.is_active ? <ToggleOff fontSize="small" /> : <ToggleOn fontSize="small" />}
                      </IconButton>
                      {supplier.is_active && (
                        <IconButton
                          size="small"
                          onClick={() => onDelete(supplier)}
                          title="Inativar fornecedor"
                          color="warning"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
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
        count={total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        onRowsPerPageChange={(event) => onRowsPerPageChange(parseInt(event.target.value, 10))}
        labelRowsPerPage="Linhas por página:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`}
      />
    </Paper>
  );
};