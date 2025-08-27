import React, { useState, useEffect } from 'react';
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
import { Supplier, UpdateSupplierRequest, PersonType } from '@/types/supplier';
import { PhoneCreate, AddressCreate, PhoneType, AddressType } from '@/types/contact';
import { validateDocument, validateCEP, validateEmail, validatePhone } from '@/utils/validation';
import { cepService } from '@/services/cep';
import { PhoneManager } from '@/components/common/PhoneManager';
import { AddressManager } from '@/components/common/AddressManager';

interface EditSupplierModalProps {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onSubmit: (id: string, data: UpdateSupplierRequest) => Promise<void>;
}

export const EditSupplierModal: React.FC<EditSupplierModalProps> = ({
  open,
  supplier,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<UpdateSupplierRequest>({});
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<UpdateSupplierRequest>>({});
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        person_type: supplier.person_type,
        document: supplier.document,
        ie: supplier.ie || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        city: supplier.city || '',
        state: supplier.state || '',
        zip_code: supplier.zip_code || '',
        contacts: {
          phones: supplier.phones ? supplier.phones.map(phone => ({
            number: phone.number,
            type: phone.type,
            is_whatsapp: phone.is_whatsapp,
            is_primary: phone.is_primary,
            notes: phone.notes || '',
          })) : [],
          addresses: supplier.addresses ? supplier.addresses.map(address => ({
            type: address.type,
            is_primary: address.is_primary,
            street: address.street,
            number: address.number || '',
            complement: address.complement || '',
            neighborhood: address.neighborhood || '',
            city: address.city,
            state: address.state,
            zip_code: address.zip_code,
            notes: address.notes || '',
          })) : [],
        },
      });
    }
  }, [supplier]);

  const handleChange = (field: keyof UpdateSupplierRequest, value: string | PersonType) => {
    let processedValue = value;
    
    // Para documento, salvar apenas números
    if (field === 'document' && typeof value === 'string') {
      processedValue = value.replace(/\D/g, '');
    }
    
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<UpdateSupplierRequest> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.document?.trim()) {
      newErrors.document = 'Documento é obrigatório';
    } else if (formData.person_type && !validateDocument(formData.document, formData.person_type)) {
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
    
    if (!supplier || !validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(supplier.id, formData);
      handleClose();
    } catch (error) {
      console.error('Erro ao atualizar fornecedor:', error);
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
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleClose = () => {
    setFormData({});
    setErrors({});
    setActiveTab(0);
    onClose();
  };

  const formatDocument = (value: string, type?: PersonType) => {
    if (!type) return value;
    const cleanValue = value.replace(/\D/g, '');
    
    if (type === PersonType.PF) {
      return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
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

  if (!supplier) return null;

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
          <Typography variant="h6">Editar Fornecedor</Typography>
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
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth error={!!errors.person_type}>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={formData.person_type || ''}
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
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={formData.person_type === PersonType.PF ? 'CPF' : 'CNPJ'}
                value={formatDocument(formData.document || '', formData.person_type)}
                onChange={(e) => handleChange('document', e.target.value)}
                error={!!errors.document}
                helperText={errors.document}
                required
              />
            </Grid>

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

            <Grid item xs={12}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Fornecedor ativo: {supplier.is_active ? 'Sim' : 'Não'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Use o botão na listagem para alterar o status
                </Typography>
              </Box>
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
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};