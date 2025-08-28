import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { CreateSupplierModal } from '@/components/suppliers/CreateSupplierModal';
import { EditSupplierModal } from '@/components/suppliers/EditSupplierModal';
import { ViewSupplierModal } from '@/components/suppliers/ViewSupplierModal';
import { DuplicateSupplierModal } from '@/components/suppliers/DuplicateSupplierModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { SuppliersTable } from '@/components/suppliers/SuppliersTable';
import { SuppliersFilters, SupplierFilters } from '@/components/suppliers/SuppliersFilters';
import { suppliersAPI } from '@/services/api';
import { CreateSupplierRequest, UpdateSupplierRequest, Supplier, PersonType } from '@/types/supplier';

export const Suppliers: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [duplicateSupplier, setDuplicateSupplier] = useState<Supplier | null>(null);
  const [duplicateDocument, setDuplicateDocument] = useState('');
  const [duplicateDocumentType, setDuplicateDocumentType] = useState<'CPF' | 'CNPJ'>('CPF');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState<SupplierFilters>({
    search: '',
    personType: '',
    status: 'active', // Mostrar apenas ativos por padrão
  });
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadSuppliers = async (currentPage?: number, customFilters?: SupplierFilters) => {
    setLoading(true);
    try {
      const pageToUse = currentPage !== undefined ? currentPage : page;
      const filtersToUse = customFilters || filters;
      const params: any = {
        skip: pageToUse * rowsPerPage,
        limit: rowsPerPage,
      };
      
      // Sempre incluir os parâmetros
      params.search = filtersToUse.search || '';
      params.personType = filtersToUse.personType || '';
      params.status = filtersToUse.status;
      
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;
      
      const response = await suppliersAPI.getSuppliers(params);
      setSuppliers(response);
      setTotal(response.length); // Temporário até implementar contagem no backend
      setError('');
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erro ao carregar fornecedores');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [page, rowsPerPage, filters.status, filters.personType, sortBy, sortOrder]);

  const handleCreateSupplier = async (data: CreateSupplierRequest) => {
    try {
      await suppliersAPI.createSupplier(data);
      setSuccess(true);
      setSuccessMessage('');
      setError('');
      setTimeout(() => setSuccess(false), 5000);
      loadSuppliers(); // Recarregar lista após criação
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail || 'Erro ao criar fornecedor';
      
      // Verificar se é erro de documento duplicado
      console.log('Erro recebido:', errorDetail);
      if (errorDetail.includes('Já existe um fornecedor com este')) {
        console.log('Detectado erro de documento duplicado');
        // Extrair informações do erro
        const documentMatch = errorDetail.match(/(CPF|CNPJ): ([0-9.-\/]+)/);
        const nameMatch = errorDetail.match(/Fornecedor: ([^(]+)/);
        
        console.log('Document match:', documentMatch);
        console.log('Name match:', nameMatch);
        
        if (documentMatch && nameMatch) {
          const docType = documentMatch[1] as 'CPF' | 'CNPJ';
          const formattedDoc = documentMatch[2];
          const supplierName = nameMatch[1].trim();
          
          console.log('Extracted info:', { docType, formattedDoc, supplierName });
          
          // Buscar o fornecedor existente na lista para mostrar detalhes completos
          const cleanInputDoc = data.document.replace(/\D/g, '');
          const existingSupplier = suppliers.find(supplier => 
            supplier.document.replace(/\D/g, '') === cleanInputDoc
          );
          
          console.log('Procurando fornecedor existente para documento:', cleanInputDoc);
          console.log('Fornecedores na lista:', suppliers.map(s => ({
            name: s.name, 
            document: s.document, 
            cleanDoc: s.document.replace(/\D/g, '')
          })));
          console.log('Fornecedor existente encontrado:', existingSupplier);
          
          if (existingSupplier) {
            setDuplicateSupplier(existingSupplier);
            setDuplicateDocument(data.document);
            setDuplicateDocumentType(docType);
            setDuplicateModalOpen(true);
            return; // Não mostrar erro genérico
          } else {
            // Se não encontrou na lista atual, criar um fornecedor temporário com as informações extraídas
            console.log('Fornecedor não encontrado na lista atual, criando dados temporários');
            const tempSupplier: Supplier = {
              id: 'temp',
              name: supplierName,
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
            
            setDuplicateSupplier(tempSupplier);
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

  const handleSearch = (customFilters?: SupplierFilters) => {
    setPage(0);
    loadSuppliers(0, customFilters); // Passar page=0 e filtros personalizados
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(0);
    loadSuppliers(0); // Carregar imediatamente com página 0
  };

  const handleUpdateSupplier = async (id: string, data: UpdateSupplierRequest) => {
    try {
      await suppliersAPI.updateSupplier(id, data);
      setSuccess(true);
      setSuccessMessage('');
      setError('');
      setTimeout(() => setSuccess(false), 5000);
      loadSuppliers();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erro ao atualizar fornecedor');
      setSuccess(false);
      throw error;
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setEditModalOpen(true);
  };

  const handleToggleStatus = async (supplier: Supplier) => {
    try {
      await suppliersAPI.toggleSupplierStatus(supplier.id);
      setSuccess(true);
      setSuccessMessage('');
      setError('');
      setTimeout(() => setSuccess(false), 5000);
      loadSuppliers();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erro ao alterar status do fornecedor');
      setSuccess(false);
    }
  };

  const handleDelete = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!supplierToDelete) return;
    
    setDeleteLoading(true);
    try {
      console.log('Inativando fornecedor:', supplierToDelete.id);
      await suppliersAPI.deleteSupplier(supplierToDelete.id);
      console.log('Fornecedor inativado com sucesso, recarregando lista...');
      
      // Mensagem específica sobre inativação
      setError('');
      
      // Usar uma mensagem customizada para inativação
      const message = `Fornecedor "${supplierToDelete.name}" foi inativado com sucesso. Para visualizar fornecedores inativos, use os filtros.`;
      
      // Mostrar mensagem de sucesso customizada
      setSuccessMessage(message);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSuccessMessage('');
      }, 7000); // Mais tempo para ler a mensagem
      
      await loadSuppliers(); // Aguardar o carregamento
      console.log('Lista recarregada após inativação');
      
      // Fechar modal
      setConfirmDialogOpen(false);
      setSupplierToDelete(null);
      
    } catch (error: any) {
      console.error('Erro ao inativar fornecedor:', error);
      if (error.response?.data?.detail?.includes('já está inativo')) {
        setError('Este fornecedor já está inativo.');
      } else {
        setError(error.response?.data?.detail || 'Erro ao inativar fornecedor');
      }
      setSuccess(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDelete = () => {
    setConfirmDialogOpen(false);
    setSupplierToDelete(null);
  };

  const handleView = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setViewModalOpen(true);
  };

  const handleViewDuplicateSupplier = () => {
    if (duplicateSupplier) {
      setSelectedSupplier(duplicateSupplier);
      setDuplicateModalOpen(false);
      setViewModalOpen(true);
    }
  };

  const handleCloseDuplicateModal = () => {
    setDuplicateModalOpen(false);
    setDuplicateSupplier(null);
    setDuplicateDocument('');
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {total} fornecedores encontrados
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Filtros: {filters.status === 'active' ? 'Ativos' : filters.status === 'inactive' ? 'Inativos' : 'Todos'}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setModalOpen(true)}
        >
          Novo Fornecedor
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

      <SuppliersFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={handleSearch}
        loading={loading}
      />

      <SuppliersTable
        suppliers={suppliers}
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

      <CreateSupplierModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateSupplier}
        onDuplicateFound={(supplier, document, documentType) => {
          setDuplicateSupplier(supplier);
          setDuplicateDocument(document);
          setDuplicateDocumentType(documentType);
          setDuplicateModalOpen(true);
        }}
      />

      <EditSupplierModal
        open={editModalOpen}
        supplier={selectedSupplier}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedSupplier(null);
        }}
        onSubmit={handleUpdateSupplier}
      />

      <ViewSupplierModal
        open={viewModalOpen}
        supplier={selectedSupplier}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedSupplier(null);
        }}
        onEdit={handleEdit}
      />

      <DuplicateSupplierModal
        open={duplicateModalOpen}
        onClose={handleCloseDuplicateModal}
        onViewExisting={handleViewDuplicateSupplier}
        existingSupplier={duplicateSupplier}
        document={duplicateDocument}
        documentType={duplicateDocumentType}
      />

      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Inativar Fornecedor"
        message={
          supplierToDelete 
            ? `Tem certeza que deseja inativar o fornecedor "${supplierToDelete.name}"?\n\nO fornecedor passará para o status "Inativo" e não aparecerá na listagem padrão. Você pode reativá-lo a qualquer momento usando o botão de alternância de status.`
            : ''
        }
        confirmText="Inativar Fornecedor"
        cancelText="Cancelar"
        confirmColor="warning"
        loading={deleteLoading}
      />
    </Box>
  );
};