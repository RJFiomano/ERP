import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { CreateClientRequest, PersonType, Client } from '@/types/client';
import { PhoneCreate, AddressCreate, PhoneType, AddressType } from '@/types/contact';
import { validateDocument, validateCEP, validateEmail, validatePhone } from '@/utils/validation';
import { cepService } from '@/services/cep';
import { clientsAPI } from '@/services/api';
import { PhoneManager } from '@/components/common/PhoneManager';
import { AddressManager } from '@/components/common/AddressManager';

interface CreateClientModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClientRequest) => Promise<void>;
  onDuplicateFound: (client: Client, document: string, documentType: 'CPF' | 'CNPJ') => void;
}

export const CreateClientModal: React.FC<CreateClientModalProps> = ({
  open,
  onClose,
  onSubmit,
  onDuplicateFound,
}) => {
  const [formData, setFormData] = useState<CreateClientRequest>({
    name: '',
    person_type: PersonType.PF,
    document: '',
    rg: '',
    ie: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    contacts: {
      phones: [],
      addresses: [],
    },
  });
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [documentChecking, setDocumentChecking] = useState(false);
  const [errors, setErrors] = useState<Partial<CreateClientRequest>>({});
  const [activeTab, setActiveTab] = useState(0);

  const handleChange = (field: keyof CreateClientRequest, value: string) => {
    let processedValue = value;
    
    // Para documento, salvar apenas números
    if (field === 'document') {
      processedValue = value.replace(/\D/g, '');
    }
    
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const checkDocumentDuplicate = async (document: string, personType: PersonType) => {
    if (!document || document.length < 11) return;
    
    const cleanDoc = document.replace(/\D/g, '');
    if (cleanDoc.length !== (personType === PersonType.PF ? 11 : 14)) return;
    
    setDocumentChecking(true);
    try {
      // Buscar todos os clientes para verificar duplicatas localmente
      const allClients = await clientsAPI.getClients({ limit: 1000 });
      
      const existingClient = allClients.find(client => 
        client.document.replace(/\D/g, '') === cleanDoc
      );
      
      if (existingClient) {
        const docType = personType === PersonType.PF ? 'CPF' : 'CNPJ';
        onDuplicateFound(existingClient, document, docType);
      }
    } catch (error) {
      console.error('Erro ao verificar documento duplicado:', error);
    } finally {
      setDocumentChecking(false);
    }
  };

  const validateForm = () => {
    const newErrors: Partial<CreateClientRequest> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.document.trim()) {
      newErrors.document = 'Documento é obrigatório';
    } else if (!validateDocument(formData.document, formData.person_type)) {
      newErrors.document = formData.person_type === PersonType.PF ? 'CPF inválido' : 'CNPJ inválido';
    }

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Telefone inválido';
    }

    if (formData.zip_code && !validateCEP(formData.zip_code)) {
      newErrors.zip_code = 'CEP inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCEPBlur = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    
    if (cleanCEP.length === 8 && validateCEP(cep)) {
      setCepLoading(true);
      try {
        const cepData = await cepService.buscarCEP(cep);
        if (cepData) {
          setFormData(prev => ({
            ...prev,
            address: cepData.logradouro,
            city: cepData.localidade,
            state: cepData.uf,
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        // Não exibir erro aqui, deixar o usuário preencher manualmente
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      person_type: PersonType.PF,
      document: '',
      ie: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      contacts: {
        phones: [],
        addresses: [],
      },
    });
    setErrors({});
    setActiveTab(0);
    onClose();
  };

  const formatDocument = (value: string, type: PersonType) => {
    const cleanValue = value.replace(/\D/g, '');
    
    if (type === PersonType.PF) {
      // Formato CPF: 000.000.000-00
      return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      // Formato CNPJ: 00.000.000/0000-00
      return cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const formatZipCode = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  const formatPhone = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 10) {
      return cleanValue.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Novo Cliente</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} sx={{ mb: 3 }}>
          <Tab label="Dados Básicos" />
          <Tab label="Telefones" />
          <Tab label="Endereços" />
        </Tabs>

        {activeTab === 0 && (
          <Grid container spacing={3}>
            {/* Tipo de Pessoa e Nome */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth error={!!errors.person_type}>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={formData.person_type}
                  onChange={(e) => handleChange('person_type', e.target.value as PersonType)}
                  label="Tipo"
                >
                  <MenuItem value={PersonType.PF}>Pessoa Física</MenuItem>
                  <MenuItem value={PersonType.PJ}>Pessoa Jurídica</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label={formData.person_type === PersonType.PF ? 'Nome Completo' : 'Razão Social'}
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                required
              />
            </Grid>

            {/* Documento */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={formData.person_type === PersonType.PF ? 'CPF' : 'CNPJ'}
                value={formatDocument(formData.document, formData.person_type)}
                onChange={(e) => handleChange('document', e.target.value)}
                onBlur={() => checkDocumentDuplicate(formData.document, formData.person_type)}
                error={!!errors.document}
                helperText={errors.document || (documentChecking ? 'Verificando documento...' : '')}
                disabled={documentChecking}
                required
              />
            </Grid>

            {/* RG - apenas para PF */}
            {formData.person_type === PersonType.PF && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="RG"
                  value={formData.rg || ''}
                  onChange={(e) => handleChange('rg', e.target.value)}
                  error={!!errors.rg}
                  helperText={errors.rg}
                  placeholder="Ex: 12.345.678-9"
                />
              </Grid>
            )}

            {/* Inscrição Estadual - apenas para PJ */}
            {formData.person_type === PersonType.PJ && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Inscrição Estadual"
                  value={formData.ie || ''}
                  onChange={(e) => handleChange('ie', e.target.value)}
                  error={!!errors.ie}
                  helperText={errors.ie}
                />
              </Grid>
            )}

            {/* Email */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
              />
            </Grid>

            {/* Campos legados para compatibilidade - ocultos */}
            <Grid item xs={12} sm={6} sx={{ display: 'none' }}>
              <TextField
                fullWidth
                label="Telefone (Legado)"
                value={formatPhone(formData.phone || '')}
                onChange={(e) => handleChange('phone', e.target.value)}
                error={!!errors.phone}
                helperText={errors.phone}
              />
            </Grid>

            <Grid item xs={12} sm={4} sx={{ display: 'none' }}>
              <TextField
                fullWidth
                label="CEP (Legado)"
                value={formatZipCode(formData.zip_code || '')}
                onChange={(e) => handleChange('zip_code', e.target.value)}
                onBlur={(e) => handleCEPBlur(e.target.value)}
                error={!!errors.zip_code}
                helperText={errors.zip_code || (cepLoading ? 'Buscando endereço...' : '')}
                disabled={cepLoading}
              />
            </Grid>

            <Grid item xs={12} sm={8} sx={{ display: 'none' }}>
              <TextField
                fullWidth
                label="Endereço (Legado)"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                error={!!errors.address}
                helperText={errors.address}
              />
            </Grid>

            <Grid item xs={12} sm={8} sx={{ display: 'none' }}>
              <TextField
                fullWidth
                label="Cidade (Legado)"
                value={formData.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
                error={!!errors.city}
                helperText={errors.city}
              />
            </Grid>

            <Grid item xs={12} sm={4} sx={{ display: 'none' }}>
              <TextField
                fullWidth
                label="Estado (Legado)"
                value={formData.state || ''}
                onChange={(e) => handleChange('state', e.target.value.toUpperCase().slice(0, 2))}
                error={!!errors.state}
                helperText={errors.state}
                placeholder="Ex: SP"
                inputProps={{ maxLength: 2 }}
              />
            </Grid>
          </Grid>
        )}

        {activeTab === 1 && (
          <PhoneManager
            phones={formData.contacts?.phones || []}
            onChange={(phones) => setFormData(prev => ({
              ...prev,
              contacts: {
                ...prev.contacts,
                phones,
                addresses: prev.contacts?.addresses || [],
              }
            }))}
          />
        )}

        {activeTab === 2 && (
          <AddressManager
            addresses={formData.contacts?.addresses || []}
            onChange={(addresses) => setFormData(prev => ({
              ...prev,
              contacts: {
                ...prev.contacts,
                phones: prev.contacts?.phones || [],
                addresses,
              }
            }))}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Salvando...' : 'Salvar Cliente'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};