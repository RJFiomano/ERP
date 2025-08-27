import React, { useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions } from 'ag-grid-community';
import { Box, Chip, IconButton, Tooltip } from '@mui/material';
import { 
  Edit as EditIcon, 
  Visibility as ViewIcon, 
  Download as DownloadIcon, 
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon 
} from '@mui/icons-material';

// Importar estilos do AG-Grid
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface AdvancedPurchaseGridProps {
  data: any[];
  onView: (orderId: string) => void;
  onEdit: (orderId: string) => void;
  onDownload: (orderId: string, orderNumber: string) => void;
  onDelete: (orderId: string, orderNumber: string) => void;
  onStatusMenuOpen: (event: React.MouseEvent<HTMLElement>, orderId: string) => void;
}

export const AdvancedPurchaseGrid: React.FC<AdvancedPurchaseGridProps> = ({
  data,
  onView,
  onEdit,
  onDownload,
  onDelete,
  onStatusMenuOpen
}) => {
  const [gridApi, setGridApi] = useState<any>(null);

  // Componente para Status
  const StatusRenderer = (params: any) => {
    const statusColors: any = {
      rascunho: 'default',
      enviado: 'info',
      confirmado: 'primary',
      parcial: 'warning',
      recebido: 'success',
      cancelado: 'error',
    };

    return (
      <Chip
        label={params.value || 'N/A'}
        color={statusColors[params.value] || 'default'}
        size="small"
      />
    );
  };

  // Componente para Urgência
  const UrgencyRenderer = (params: any) => {
    const urgencyColors: any = {
      baixa: 'default',
      normal: 'info',
      alta: 'warning',
      critica: 'error',
    };

    return (
      <Chip
        label={params.value || 'N/A'}
        color={urgencyColors[params.value] || 'default'}
        size="small"
      />
    );
  };

  // Componente para Ações
  const ActionsRenderer = (params: any) => (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <Tooltip title="Visualizar">
        <IconButton size="small" onClick={() => onView(params.data.id)}>
          <ViewIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Editar">
        <IconButton
          size="small"
          onClick={() => onEdit(params.data.id)}
          disabled={params.data.status === 'recebido' || params.data.status === 'cancelado'}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Download">
        <IconButton
          size="small"
          onClick={() => onDownload(params.data.id, params.data.order_number)}
        >
          <DownloadIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Status">
        <IconButton
          size="small"
          onClick={(e) => onStatusMenuOpen(e, params.data.id)}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Excluir">
        <IconButton
          size="small"
          onClick={() => onDelete(params.data.id, params.data.order_number)}
          disabled={params.data.status === 'recebido'}
          color="error"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  // Definição das colunas
  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'Número',
      field: 'order_number',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 120,
      pinned: 'left',
      rowGroup: false,
      enableRowGroup: true,
    },
    {
      headerName: 'Fornecedor',
      field: 'supplier_name',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 200,
      rowGroup: false,
      enableRowGroup: true,
    },
    {
      headerName: 'Data',
      field: 'order_date',
      sortable: true,
      filter: 'agDateColumnFilter',
      width: 120,
      valueFormatter: (params) => {
        if (!params.value) return 'N/A';
        return new Date(params.value).toLocaleDateString('pt-BR');
      },
      rowGroup: false,
      enableRowGroup: true,
    },
    {
      headerName: 'Status',
      field: 'status',
      sortable: true,
      filter: 'agSetColumnFilter',
      width: 120,
      cellRenderer: StatusRenderer,
      rowGroup: false,
      enableRowGroup: true,
    },
    {
      headerName: 'Urgência',
      field: 'urgency',
      sortable: true,
      filter: 'agSetColumnFilter',
      width: 120,
      cellRenderer: UrgencyRenderer,
      rowGroup: false,
      enableRowGroup: true,
    },
    {
      headerName: 'Itens',
      field: 'items_count',
      sortable: true,
      filter: 'agNumberColumnFilter',
      width: 100,
      cellStyle: { textAlign: 'center' },
      valueFormatter: (params) => `${params.value || 0} itens`,
      aggFunc: 'sum',
    },
    {
      headerName: 'Ações',
      field: 'actions',
      cellRenderer: ActionsRenderer,
      width: 250,
      sortable: false,
      filter: false,
      resizable: false,
      pinned: 'right',
    },
  ], []);

  // Configurações do grid simplificadas
  const gridOptions: GridOptions = {
    columnDefs,
    rowData: data,
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true,
      flex: 1,
      minWidth: 100,
    },
    // Habilitar agrupamento
    rowGroupPanelShow: 'always',
    groupDefaultExpanded: 1,
    suppressAggFuncInHeader: true,
    
    // Habilitar seleção
    rowSelection: 'multiple',
    
    // Sidebar para configurações
    sideBar: true,
    
    // Configurações de agrupamento
    autoGroupColumnDef: {
      headerName: 'Grupos',
      minWidth: 250,
      cellRendererParams: {
        suppressCount: false,
      },
    },
    
    // Configurações visuais
    animateRows: true,
    
    // Paginação
    pagination: true,
    paginationPageSize: 25,
    paginationPageSizeSelector: [10, 25, 50],
  };

  const onGridReady = (params: any) => {
    setGridApi(params.api);
  };

  return (
    <Box 
      className="ag-theme-alpine" 
      sx={{ 
        height: 600, 
        width: '100%',
        '& .ag-root-wrapper': {
          borderRadius: 1,
        },
        '& .ag-header': {
          backgroundColor: 'background.paper',
        },
      }}
    >
      <AgGridReact
        {...gridOptions}
        onGridReady={onGridReady}
        localeText={{
          // Traduzir textos para português
          page: 'Página',
          more: 'Mais',
          to: 'até',
          of: 'de',
          next: 'Próxima',
          last: 'Última',
          first: 'Primeira',
          previous: 'Anterior',
          loadingOoo: 'Carregando...',
          selectAll: 'Selecionar Todos',
          searchOoo: 'Buscar...',
          blanks: '(Vazios)',
          noRowsToShow: 'Nenhum pedido encontrado',
          // Agrupamento
          group: 'Grupo',
          rowGroupColumnsEmptyMessage: 'Arraste colunas aqui para agrupar',
          valueColumnsEmptyMessage: 'Arraste colunas aqui para agregar',
          pivotColumnsEmptyMessage: 'Arraste colunas aqui para pivotar',
          // Filtros
          filterOoo: 'Filtrar...',
          equals: 'Igual a',
          notEqual: 'Diferente de',
          contains: 'Contém',
          notContains: 'Não contém',
          startsWith: 'Inicia com',
          endsWith: 'Termina com',
          lessThan: 'Menor que',
          lessThanOrEqual: 'Menor ou igual a',
          greaterThan: 'Maior que',
          greaterThanOrEqual: 'Maior ou igual a',
          inRange: 'No intervalo',
        }}
      />
    </Box>
  );
};