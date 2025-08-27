import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Alert,
  TablePagination,
} from '@mui/material';
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  Person,
  Business,
  Search,
  FilterList,
  ToggleOn,
  ToggleOff,
} from '@mui/icons-material';
import { PersonModal } from '@/components/pessoas/PersonModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

// Types
interface Pessoa {
  id: string;
  nome: string;
  pessoa_tipo: 'PF' | 'PJ';
  documento: string;
  rg?: string;
  ie?: string;
  email?: string;
  observacoes?: string;
  is_active: boolean;
  created_at: string;
  papeis: string[];
  telefones: any[];
  enderecos: any[];
  dados_cliente?: {
    limite_credito?: number;
    prazo_pagamento?: number;
    observacoes_comerciais?: string;
  };
  dados_funcionario?: {
    cargo?: string;
    salario?: number;
    data_admissao?: string;
    pis?: string;
    ctps?: string;
    departamento?: string;
  };
  dados_fornecedor?: {
    prazo_entrega?: number;
    condicoes_pagamento?: string;
    observacoes_comerciais?: string;
  };
}

interface PessoasResponse {
  pessoas: Pessoa[];
  total: number;
  page: number;
  per_page: number;
}

type PapelFiltro = 'TODOS' | 'CLIENTE' | 'FORNECEDOR' | 'FUNCIONARIO';

export const Pessoas: React.FC = () => {
  const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:8000';
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Pessoa | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedPerson, setSelectedPerson] = useState<Pessoa | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [deletingPerson, setDeletingPerson] = useState<Pessoa | null>(null);
  
  // Filtros
  const [papelFiltro, setPapelFiltro] = useState<PapelFiltro>('TODOS');
  const [pessoaTipoFiltro, setPessoaTipoFiltro] = useState<string>('');
  const [statusFiltro, setStatusFiltro] = useState<string>('ativos'); // 'ativos', 'inativos', 'todos'
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const loadPessoas = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append('skip', (page * rowsPerPage).toString());
      params.append('limit', rowsPerPage.toString());
      
      if (papelFiltro !== 'TODOS') {
        params.append('papel', papelFiltro);
      }
      if (pessoaTipoFiltro) {
        params.append('pessoa_tipo', pessoaTipoFiltro);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (statusFiltro) {
        params.append('status', statusFiltro);
      }

      const response = await fetch(`${API_URL}/pessoas/?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar pessoas');
      }
      
      const data: PessoasResponse = await response.json();
      setPessoas(data.pessoas);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPessoas();
  }, [papelFiltro, pessoaTipoFiltro, statusFiltro, searchTerm, page, rowsPerPage]);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, person: Pessoa) => {
    setMenuAnchor(event.currentTarget);
    setSelectedPerson(person);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedPerson(null);
  };

  const handleEdit = () => {
    if (selectedPerson) {
      setEditingPerson(selectedPerson);
      setModalOpen(true);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedPerson) {
      setDeletingPerson(selectedPerson);
      setConfirmDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleToggleStatus = async () => {
    if (selectedPerson) {
      try {
        const response = await fetch(`${API_URL}/pessoas/${selectedPerson.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_active: !selectedPerson.is_active,
            papeis: selectedPerson.papeis
          }),
        });
        if (response.ok) {
          loadPessoas();
        }
      } catch (err) {
        setError('Erro ao alterar status do contato');
      }
    }
    handleMenuClose();
  };

  const handleConfirmDelete = async () => {
    if (deletingPerson) {
      try {
        const response = await fetch(`${API_URL}/pessoas/${deletingPerson.id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          loadPessoas();
        }
      } catch (err) {
        setError('Erro ao excluir contato');
      }
    }
    setConfirmDialogOpen(false);
    setDeletingPerson(null);
  };

  const handleCancelDelete = () => {
    setConfirmDialogOpen(false);
    setDeletingPerson(null);
  };

  const handleSubmit = async (data: any) => {
    console.log('=== PESSOAS HANDLESUBMIT INICIADO ===');
    console.log('Dados recebidos:', data);
    console.log('editingPerson:', editingPerson);
    
    try {
      const url = editingPerson 
        ? `${API_URL}/pessoas/${editingPerson.id}`
        : `${API_URL}/pessoas/`;
      
      const method = editingPerson ? 'PUT' : 'POST';
      
      console.log('URL:', url);
      console.log('Method:', method);
      console.log('Body:', JSON.stringify(data, null, 2));
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('Error response:', errorData);
        throw new Error(errorData.detail || 'Erro ao salvar pessoa');
      }

      const responseData = await response.json();
      console.log('Success response:', responseData);
      
      console.log('Chamando loadPessoas...');
      await loadPessoas();
      console.log('loadPessoas concluído');
      
      console.log('Fechando modal...');
      setModalOpen(false);
      setEditingPerson(null);
      console.log('Modal fechado');
      
    } catch (err) {
      console.error('ERRO em handleSubmit:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar pessoa');
      throw err; // Re-throw para que o PersonModal possa capturar
    }
    console.log('=== PESSOAS HANDLESUBMIT FINALIZADO ===');
  };

  const handleOpenExisting = (existingPerson: any) => {
    // Fechar modal atual primeiro
    setModalOpen(false);
    setEditingPerson(null);
    
    // Aguardar um ciclo de render e então abrir o modal com a pessoa existente
    setTimeout(() => {
      setEditingPerson(existingPerson);
      setModalOpen(true);
    }, 150);
  };

  const formatDocument = (documento: string, tipo: 'PF' | 'PJ') => {
    const clean = documento.replace(/\D/g, '');
    if (tipo === 'PF') {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const getPapelColor = (papel: string) => {
    switch (papel) {
      case 'CLIENTE': return 'primary';
      case 'FORNECEDOR': return 'secondary';
      case 'FUNCIONARIO': return 'success';
      default: return 'default';
    }
  };

  // Aplicar filtro de aba no backend através do papelFiltro
  useEffect(() => {
    if (activeTab === 0) {
      setPapelFiltro('TODOS');
    } else if (activeTab === 1) {
      setPapelFiltro('CLIENTE');
    } else if (activeTab === 2) {
      setPapelFiltro('FORNECEDOR');
    } else if (activeTab === 3) {
      setPapelFiltro('FUNCIONARIO');
    }
    setPage(0); // Reset page when changing tabs
  }, [activeTab]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Cadastro de Contatos
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingPerson(null);
            setModalOpen(true);
          }}
        >
          Novo Contato
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Pesquisar contatos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={pessoaTipoFiltro}
              onChange={(e) => setPessoaTipoFiltro(e.target.value)}
              label="Tipo"
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="PF">Pessoa Física</MenuItem>
              <MenuItem value="PJ">Pessoa Jurídica</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              label="Status"
            >
              <MenuItem value="ativos">Ativos</MenuItem>
              <MenuItem value="inativos">Inativos</MenuItem>
              <MenuItem value="todos">Todos</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <Paper>
        <Tabs 
          value={activeTab} 
          onChange={(_, value) => setActiveTab(value)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Todos (${total})`} />
          <Tab label="Clientes" />
          <Tab label="Fornecedores" />
          <Tab label="Funcionários" />
        </Tabs>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Documento</TableCell>
                <TableCell>RG</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Papéis</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : pessoas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Nenhum contato encontrado
                  </TableCell>
                </TableRow>
              ) : (
                pessoas.map((pessoa) => (
                  <TableRow key={pessoa.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {pessoa.pessoa_tipo === 'PF' ? <Person /> : <Business />}
                        {pessoa.nome}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={pessoa.pessoa_tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                        size="small"
                        color={pessoa.pessoa_tipo === 'PF' ? 'primary' : 'warning'}
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>
                      {formatDocument(pessoa.documento, pessoa.pessoa_tipo)}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>
                      {pessoa.rg || '-'}
                    </TableCell>
                    <TableCell>{pessoa.email || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {pessoa.papeis && pessoa.papeis.length > 0 ? (
                          pessoa.papeis.map((papel) => (
                            <Chip
                              key={papel}
                              label={papel}
                              size="small"
                              color={getPapelColor(papel) as any}
                            />
                          ))
                        ) : (
                          <Chip
                            label="Sem papel definido"
                            size="small"
                            variant="outlined"
                            color="default"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pessoa.is_active ? 'Ativo' : 'Inativo'}
                        size="small"
                        color={pessoa.is_active ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, pessoa)}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100, { label: 'Todos', value: -1 }]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            const value = parseInt(event.target.value, 10);
            setRowsPerPage(value === -1 ? total : value);
            setPage(0);
          }}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
        />
      </Paper>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <Edit />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleToggleStatus}>
          <ListItemIcon>
            {selectedPerson?.is_active ? <ToggleOff /> : <ToggleOn />}
          </ListItemIcon>
          <ListItemText>
            {selectedPerson?.is_active ? 'Desativar' : 'Ativar'}
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <Delete />
          </ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>

      <PersonModal
        open={modalOpen}
        person={editingPerson}
        onClose={() => {
          setModalOpen(false);
          setEditingPerson(null);
        }}
        onSubmit={handleSubmit}
        onOpenExisting={handleOpenExisting}
      />

      <ConfirmDialog
        open={confirmDialogOpen}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o contato "${deletingPerson?.nome}"?\n\nEsta ação não pode ser desfeita. O contato será desativado do sistema.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        confirmColor="error"
        onConfirm={handleConfirmDelete}
        onClose={handleCancelDelete}
      />
    </Box>
  );
};