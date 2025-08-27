import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { CreateClientModal } from '@/components/clients/CreateClientModal';
import { EditClientModal } from '@/components/clients/EditClientModal';
import { ViewClientModal } from '@/components/clients/ViewClientModal';
import { DuplicateClientModal } from '@/components/clients/DuplicateClientModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ClientsFilters, ClientFilters } from '@/components/clients/ClientsFilters';
import { clientsAPI } from '@/services/api';
import { CreateClientRequest, UpdateClientRequest, Client, PersonType } from '@/types/client';

export const Clients: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [duplicateClient, setDuplicateClient] = useState<Client | null>(null);
  const [duplicateDocument, setDuplicateDocument] = useState('');
  const [duplicateDocumentType, setDuplicateDocumentType] = useState<'CPF' | 'CNPJ'>('CPF');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState<ClientFilters>({
    search: '',
    personType: '',
    status: 'active', // Mostrar apenas ativos por padrão
  });
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadClients = async (currentPage?: number, customFilters?: ClientFilters) => {
    setLoading(true);
    try {
      // Usar endpoint mock que funciona independente do banco
      const pageToUse = currentPage !== undefined ? currentPage : page;
      const filtersToUse = customFilters || filters;
      
      const params = new URLSearchParams({
        skip: (pageToUse * rowsPerPage).toString(),
        limit: rowsPerPage.toString(),
        search: filtersToUse.search || '',
        personType: filtersToUse.personType || '',
        status: filtersToUse.status || 'active'
      });

      // SEMPRE usar endpoint real (PostgreSQL)
      console.log('🔄 Carregando clientes do PostgreSQL...');
      const response = await fetch(`http://localhost:8000/test/clients`);
      
      if (!response.ok) {
        throw new Error('Falha ao conectar com PostgreSQL');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erro no PostgreSQL');
      }
      
      console.log('✅ Dados carregados do PostgreSQL:');
      console.log('📊 Total de clientes:', data.data.length);
      console.log('🔍 Clientes com RG:', data.data.filter(c => c.rg).length);
      console.log('📝 Últimos clientes:', data.data.slice(0, 3).map(c => `${c.name} (RG: ${c.rg || 'sem RG'})`));
      
      setClients(data.data);
      setTotal(data.total);
      setError('');
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erro ao carregar clientes');
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [page, rowsPerPage, filters.status, filters.personType, sortBy, sortOrder]);

  const handleCreateClient = async (data: CreateClientRequest) => {
    try {
      // Tentar criar cliente via API real
      const response = await fetch('http://localhost:8000/test/create-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess(true);
        setSuccessMessage('Cliente criado com sucesso no PostgreSQL');
        setError('');
        setTimeout(() => setSuccess(false), 5000);
        loadClients(); // Recarregar lista após criação
        return;
      } else {
        throw new Error(result.error || 'Erro ao criar cliente');
      }
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail || 'Erro ao criar cliente';
      
      // Verificar se é erro de documento duplicado
      console.log('Erro recebido:', errorDetail);
      if (errorDetail.includes('Já existe um cliente com este')) {
        console.log('Detectado erro de documento duplicado');
        // Extrair informações do erro
        const documentMatch = errorDetail.match(/(CPF|CNPJ): ([0-9.-\/]+)/);
        const nameMatch = errorDetail.match(/Cliente: ([^(]+)/);
        
        console.log('Document match:', documentMatch);
        console.log('Name match:', nameMatch);
        
        if (documentMatch && nameMatch) {
          const docType = documentMatch[1] as 'CPF' | 'CNPJ';
          const formattedDoc = documentMatch[2];
          const clientName = nameMatch[1].trim();
          
          console.log('Extracted info:', { docType, formattedDoc, clientName });
          
          // Buscar o cliente existente na lista para mostrar detalhes completos
          const cleanInputDoc = data.document.replace(/\D/g, '');
          const existingClient = clients.find(c => 
            c.document.replace(/\D/g, '') === cleanInputDoc
          );
          
          console.log('Procurando cliente existente para documento:', cleanInputDoc);
          console.log('Clientes na lista:', clients.map(c => ({
            name: c.name, 
            document: c.document, 
            cleanDoc: c.document.replace(/\D/g, '')
          })));
          console.log('Cliente existente encontrado:', existingClient);
          
          if (existingClient) {
            setDuplicateClient(existingClient);
            setDuplicateDocument(data.document);
            setDuplicateDocumentType(docType);
            setDuplicateModalOpen(true);
            return; // Não mostrar erro genérico
          } else {
            // Se não encontrou na lista atual, criar um cliente temporário com as informações extraídas
            console.log('Cliente não encontrado na lista atual, criando dados temporários');
            const tempClient: Client = {
              id: 'temp',
              name: clientName,
              person_type: docType === 'CPF' ? PersonType.PF : PersonType.PJ,
              document: formattedDoc,
              email: '',
              phone: '',
              address: '',
              city: '',
              state: '',
              zip_code: '',
              is_active: true, // Assumimos que está ativo se permitiu a consulta
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            setDuplicateClient(tempClient);
            setDuplicateDocument(data.document);
            setDuplicateDocumentType(docType);
            setDuplicateModalOpen(true);
            return; // Não mostrar erro genérico
          }
        }
      }
      
      setError(errorDetail);
      setSuccess(false);
      throw error;
    }
  };

  const handleSearch = (customFilters?: ClientFilters) => {
    setPage(0);
    loadClients(0, customFilters); // Passar page=0 e filtros personalizados
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(0);
    loadClients(0); // Carregar imediatamente com página 0
  };

  const handleUpdateClient = async (id: string, data: UpdateClientRequest) => {
    try {
      await clientsAPI.updateClient(id, data);
      setSuccess(true);
      setSuccessMessage('');
      setError('');
      setTimeout(() => setSuccess(false), 5000);
      loadClients();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erro ao atualizar cliente');
      setSuccess(false);
      throw error;
    }
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setEditModalOpen(true);
  };

  const handleToggleStatus = async (client: Client) => {
    try {
      await clientsAPI.toggleClientStatus(client.id);
      setSuccess(true);
      setSuccessMessage('');
      setError('');
      setTimeout(() => setSuccess(false), 5000);
      loadClients();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erro ao alterar status do cliente');
      setSuccess(false);
    }
  };

  const handleDelete = (client: Client) => {
    setClientToDelete(client);
    setConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    
    setDeleteLoading(true);
    try {
      console.log('Inativando cliente:', clientToDelete.id);
      await clientsAPI.deleteClient(clientToDelete.id);
      console.log('Cliente inativado com sucesso, recarregando lista...');
      
      // Mensagem específica sobre inativação
      setError('');
      
      // Usar uma mensagem customizada para inativação
      const message = `Cliente "${clientToDelete.name}" foi inativado com sucesso. Para visualizar clientes inativos, use os filtros.`;
      
      // Mostrar mensagem de sucesso customizada
      setSuccessMessage(message);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSuccessMessage('');
      }, 7000); // Mais tempo para ler a mensagem
      
      await loadClients(); // Aguardar o carregamento
      console.log('Lista recarregada após inativação');
      
      // Fechar modal
      setConfirmDialogOpen(false);
      setClientToDelete(null);
      
    } catch (error: any) {
      console.error('Erro ao inativar cliente:', error);
      if (error.response?.data?.detail?.includes('já está inativo')) {
        setError('Este cliente já está inativo.');
      } else {
        setError(error.response?.data?.detail || 'Erro ao inativar cliente');
      }
      setSuccess(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDelete = () => {
    setConfirmDialogOpen(false);
    setClientToDelete(null);
  };

  const handleView = (client: Client) => {
    setSelectedClient(client);
    setViewModalOpen(true);
  };

  const handleViewDuplicateClient = () => {
    if (duplicateClient) {
      setSelectedClient(duplicateClient);
      setDuplicateModalOpen(false);
      setViewModalOpen(true);
    }
  };

  const handleCloseDuplicateModal = () => {
    setDuplicateModalOpen(false);
    setDuplicateClient(null);
    setDuplicateDocument('');
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Clientes
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setModalOpen(true)}
        >
          Novo Cliente
        </Button>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage || 'Operação realizada com sucesso!'}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <ClientsFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={handleSearch}
        loading={loading}
      />

      <ClientsTable
        clients={clients}
        total={total}
        page={page}
        rowsPerPage={rowsPerPage}
        loading={loading}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        onToggleStatus={handleToggleStatus}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

      <CreateClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateClient}
        onDuplicateFound={(client, document, documentType) => {
          setDuplicateClient(client);
          setDuplicateDocument(document);
          setDuplicateDocumentType(documentType);
          setDuplicateModalOpen(true);
        }}
      />

      <EditClientModal
        open={editModalOpen}
        client={selectedClient}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedClient(null);
        }}
        onSubmit={handleUpdateClient}
      />

      <ViewClientModal
        open={viewModalOpen}
        client={selectedClient}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedClient(null);
        }}
        onEdit={handleEdit}
      />

      <DuplicateClientModal
        open={duplicateModalOpen}
        onClose={handleCloseDuplicateModal}
        onViewExisting={handleViewDuplicateClient}
        existingClient={duplicateClient}
        document={duplicateDocument}
        documentType={duplicateDocumentType}
      />

      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Inativar Cliente"
        message={
          clientToDelete 
            ? `Tem certeza que deseja inativar o cliente "${clientToDelete.name}"?\n\nO cliente passará para o status "Inativo" e não aparecerá na listagem padrão. Você pode reativá-lo a qualquer momento usando o botão de alternância de status.`
            : ''
        }
        confirmText="Inativar Cliente"
        cancelText="Cancelar"
        confirmColor="warning"
        loading={deleteLoading}
      />
    </Box>
  );
};