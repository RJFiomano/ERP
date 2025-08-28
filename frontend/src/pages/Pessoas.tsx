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
  TableSortLabel,
  Popover,
  List,
  ListItem,
} from '@mui/material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  
  // Estados para ordenação
  const [orderBy, setOrderBy] = useState<string>('nome');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  // Definição das colunas
  interface ColumnConfig {
    id: string;
    label: string;
    sortable: boolean;
    filterable: boolean;
    width?: number | string;
    align?: 'left' | 'center' | 'right';
  }

  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: 'nome', label: 'Nome', sortable: true, filterable: true, width: 200 },
    { id: 'pessoa_tipo', label: 'Tipo', sortable: true, filterable: true, width: 80, align: 'center' },
    { id: 'documento', label: 'Documento', sortable: true, filterable: true, width: 150 },
    { id: 'rg', label: 'RG', sortable: false, filterable: true, width: 120 },
    { id: 'email', label: 'Email', sortable: true, filterable: true, width: 200 },
    { id: 'papeis', label: 'Papéis', sortable: false, filterable: true, width: 150 },
    { id: 'is_active', label: 'Status', sortable: true, filterable: true, width: 100, align: 'center' },
    { id: 'actions', label: 'Ações', sortable: false, filterable: false, width: 80, align: 'center' },
  ]);

  // Estados para filtros por coluna
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [filterAnchor, setFilterAnchor] = useState<{ [key: string]: HTMLElement | null }>({});

  // Sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Função para lidar com ordenação
  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Função para reordenar colunas
  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Função para lidar com filtros por coluna
  const handleColumnFilter = (columnId: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnId]: value
    }));
    setPage(0); // Reset to first page when filtering
  };

  // Função para abrir/fechar popover de filtro
  const handleFilterClick = (event: React.MouseEvent<HTMLElement>, columnId: string) => {
    setFilterAnchor(prev => ({
      ...prev,
      [columnId]: event.currentTarget
    }));
  };

  const handleFilterClose = (columnId: string) => {
    setFilterAnchor(prev => ({
      ...prev,
      [columnId]: null
    }));
  };

  // Função para atualizar largura da coluna
  const handleResize = (columnId: string, width: number) => {
    setColumns(prevColumns => 
      prevColumns.map(col => 
        col.id === columnId 
          ? { ...col, width: Math.max(50, width) }
          : col
      )
    );
  };

  // Estados para redimensionamento
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  // Componente para célula arrastável e redimensionável
  const SortableResizableTableCell: React.FC<{ 
    column: ColumnConfig; 
    children: React.ReactNode; 
  }> = ({ column, children }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: column.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      width: typeof column.width === 'number' ? `${column.width}px` : column.width,
      position: 'relative' as const,
    };

    // Função separada para iniciar o redimensionamento no handle
    const handleResizeMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      setResizingColumn(column.id);
      setStartX(e.clientX);
      const currentWidth = typeof column.width === 'number' ? column.width : parseInt(String(column.width || '150').replace('px', ''));
      setStartWidth(currentWidth);
    };

    return (
      <TableCell
        ref={setNodeRef}
        style={style}
        {...(isResizing ? {} : attributes)}
        {...(isResizing ? {} : listeners)}
        align={column.align || 'left'}
        sx={{ 
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          position: 'relative',
        }}
      >
        <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
          {children}
          
          {/* Handle dedicado para redimensionamento */}
          <Box
            onMouseDown={handleResizeMouseDown}
            sx={{
              position: 'absolute',
              right: '-3px',
              top: 0,
              bottom: 0,
              width: '6px',
              cursor: 'col-resize',
              zIndex: 15,
              backgroundColor: 'transparent',
              borderRight: '2px solid transparent',
              '&:hover': {
                borderRight: '2px solid',
                borderColor: 'primary.main',
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
              },
              // Sobrepor o cursor do drag
              '&:hover ~ *': {
                cursor: 'col-resize !important',
              }
            }}
            title="Redimensionar coluna"
          />
        </Box>
      </TableCell>
    );
  };

  // Event listeners para redimensionamento global
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && resizingColumn) {
        const diff = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + diff);
        handleResize(resizingColumn, newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizingColumn(null);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, resizingColumn, startX, startWidth]);

  // Função para renderizar o conteúdo da célula baseado na coluna
  const renderCellContent = (column: ColumnConfig, pessoa: Pessoa) => {
    switch (column.id) {
      case 'nome':
        return pessoa.nome;
      case 'pessoa_tipo':
        return (
          <Chip
            size="small"
            icon={pessoa.pessoa_tipo === 'PF' ? <Person /> : <Business />}
            label={pessoa.pessoa_tipo}
            color={pessoa.pessoa_tipo === 'PF' ? 'primary' : 'secondary'}
          />
        );
      case 'documento':
        return pessoa.documento ? formatDocument(pessoa.documento, pessoa.pessoa_tipo) : '-';
      case 'rg':
        return pessoa.rg || '-';
      case 'email':
        return pessoa.email || '-';
      case 'papeis':
        return (
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
        );
      case 'is_active':
        return (
          <Chip
            label={pessoa.is_active ? 'Ativo' : 'Inativo'}
            size="small"
            color={pessoa.is_active ? 'success' : 'error'}
          />
        );
      case 'actions':
        return (
          <IconButton
            size="small"
            onClick={(e) => handleMenuClick(e, pessoa)}
          >
            <MoreVert />
          </IconButton>
        );
      default:
        return '';
    }
  };

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
      
      // Adicionar parâmetros de ordenação
      params.append('order_by', orderBy);
      params.append('order', order);

      // Adicionar filtros por coluna
      Object.keys(columnFilters).forEach(columnId => {
        if (columnFilters[columnId]) {
          params.append(`filter_${columnId}`, columnFilters[columnId]);
        }
      });

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
  }, [papelFiltro, pessoaTipoFiltro, statusFiltro, searchTerm, page, rowsPerPage, orderBy, order, columnFilters]);

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
        <Box>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {total} contatos encontrados
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {pessoas.filter(p => p.is_active).length} ativos, {pessoas.filter(p => !p.is_active).length} inativos
          </Typography>
        </Box>
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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <SortableContext
                    items={columns.map(col => col.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {columns.map((column) => (
                      <SortableResizableTableCell key={column.id} column={column}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {/* Cabeçalho com ordenação e filtro */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {column.sortable ? (
                              <TableSortLabel
                                active={orderBy === column.id}
                                direction={orderBy === column.id ? order : 'asc'}
                                onClick={() => handleRequestSort(column.id)}
                              >
                                {column.label}
                              </TableSortLabel>
                            ) : (
                              <Typography variant="subtitle2">{column.label}</Typography>
                            )}
                            {column.filterable && (
                              <IconButton
                                size="small"
                                onClick={(e) => handleFilterClick(e, column.id)}
                              >
                                <FilterList fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                          
                          {/* Filtro rápido se houver valor */}
                          {columnFilters[column.id] && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="caption" color="primary">
                                Filtro: {columnFilters[column.id]}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => handleColumnFilter(column.id, '')}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                          )}
                        </Box>
                      </SortableResizableTableCell>
                    ))}
                  </SortableContext>
                </TableRow>
              </TableHead>
              
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : pessoas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center">
                      Nenhum contato encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  pessoas.map((pessoa, index) => (
                    <TableRow 
                      key={pessoa.id} 
                      hover
                      sx={{
                        '&:nth-of-type(even)': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      {columns.map((column) => (
                        <TableCell
                          key={column.id}
                          align={column.align || 'left'}
                          sx={{ width: column.width }}
                        >
                          {renderCellContent(column, pessoa)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Popovers de filtro por coluna */}
          {columns.map((column) => (
            column.filterable && (
              <Popover
                key={`filter-${column.id}`}
                open={Boolean(filterAnchor[column.id])}
                anchorEl={filterAnchor[column.id]}
                onClose={() => handleFilterClose(column.id)}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
              >
                <Box sx={{ p: 2, minWidth: 200 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Filtrar {column.label}
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={`Buscar ${column.label.toLowerCase()}...`}
                    value={columnFilters[column.id] || ''}
                    onChange={(e) => handleColumnFilter(column.id, e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  {column.id === 'is_active' && (
                    <List dense sx={{ mt: 1 }}>
                      <ListItem button onClick={() => handleColumnFilter(column.id, 'ativo')}>
                        <ListItemText primary="Apenas Ativos" />
                      </ListItem>
                      <ListItem button onClick={() => handleColumnFilter(column.id, 'inativo')}>
                        <ListItemText primary="Apenas Inativos" />
                      </ListItem>
                      <ListItem button onClick={() => handleColumnFilter(column.id, '')}>
                        <ListItemText primary="Todos" />
                      </ListItem>
                    </List>
                  )}
                </Box>
              </Popover>
            )
          ))}
        </DndContext>
        
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