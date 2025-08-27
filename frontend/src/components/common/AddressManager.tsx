import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  Paper,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { Address, AddressCreate, AddressType } from '@/types/contact';
import { validateCEP } from '@/utils/validation';
import { cepService } from '@/services/cep';

interface AddressManagerProps {
  addresses: AddressCreate[];
  onChange: (addresses: AddressCreate[]) => void;
  error?: string;
}

export const AddressManager: React.FC<AddressManagerProps> = ({
  addresses = [],
  onChange,
  error,
}) => {
  const [addressErrors, setAddressErrors] = useState<{ [index: number]: { [field: string]: string } }>({});
  const [cepLoadings, setCepLoadings] = useState<{ [index: number]: boolean }>({});
  
  // Ensure addresses is always an array
  const safeAddresses = Array.isArray(addresses) ? addresses : [];

  const addAddress = () => {
    const newAddress: AddressCreate = {
      type: AddressType.main,
      is_primary: safeAddresses.length === 0, // Primeiro endereço é primary por padrão
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zip_code: '',
      notes: '',
    };
    onChange([...safeAddresses, newAddress]);
  };

  const removeAddress = (index: number) => {
    const updatedAddresses = safeAddresses.filter((_, i) => i !== index);
    
    // Se removemos o endereço primário, definir o primeiro como primário
    if (safeAddresses[index]?.is_primary && updatedAddresses.length > 0) {
      updatedAddresses[0].is_primary = true;
    }
    
    onChange(updatedAddresses);
    
    // Remove erros deste índice
    const { [index]: removedError, ...remainingErrors } = addressErrors;
    setAddressErrors(remainingErrors);
  };

  const updateAddress = (index: number, field: keyof AddressCreate, value: any) => {
    const updatedAddresses = [...safeAddresses];
    
    if (field === 'is_primary' && value) {
      // Apenas um endereço pode ser primário
      updatedAddresses.forEach((address, i) => {
        address.is_primary = i === index;
      });
    } else {
      if (updatedAddresses[index]) {
        (updatedAddresses[index] as any)[field] = value;
      }
    }
    
    onChange(updatedAddresses);
    
    // Remover erro do campo quando alterado
    if (addressErrors[index]?.[field]) {
      setAddressErrors(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          [field]: '',
        }
      }));
    }
  };

  const handleCEPBlur = async (index: number, cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    
    if (cleanCEP.length === 8 && validateCEP(cep)) {
      setCepLoadings(prev => ({ ...prev, [index]: true }));
      try {
        const cepData = await cepService.buscarCEP(cep);
        if (cepData) {
          const updatedAddresses = [...safeAddresses];
          if (updatedAddresses[index]) {
            updatedAddresses[index] = {
              ...updatedAddresses[index],
              street: cepData.logradouro || updatedAddresses[index].street,
              neighborhood: cepData.bairro || updatedAddresses[index].neighborhood,
              city: cepData.localidade || updatedAddresses[index].city,
              state: cepData.uf || updatedAddresses[index].state,
            };
            onChange(updatedAddresses);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      } finally {
        setCepLoadings(prev => ({ ...prev, [index]: false }));
      }
    }
  };

  const validateAddress = (index: number) => {
    const address = safeAddresses[index];
    if (!address) return false;
    
    const errors: { [field: string]: string } = {};

    if (!address.street.trim()) {
      errors.street = 'Logradouro é obrigatório';
    }
    if (!address.city.trim()) {
      errors.city = 'Cidade é obrigatória';
    }
    if (!address.state.trim()) {
      errors.state = 'Estado é obrigatório';
    } else if (address.state.length !== 2) {
      errors.state = 'Estado deve ter 2 caracteres';
    }
    if (!address.zip_code.trim()) {
      errors.zip_code = 'CEP é obrigatório';
    } else if (!validateCEP(address.zip_code)) {
      errors.zip_code = 'CEP inválido';
    }

    setAddressErrors(prev => ({
      ...prev,
      [index]: errors
    }));

    return Object.keys(errors).length === 0;
  };

  const formatZipCode = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  const getAddressTypeLabel = (type: AddressType) => {
    const labels = {
      [AddressType.main]: 'Principal',
      [AddressType.billing]: 'Cobrança',
      [AddressType.delivery]: 'Entrega',
      [AddressType.work]: 'Comercial',
      [AddressType.other]: 'Outro',
    };
    return labels[type];
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Endereços</Typography>
        <Button
          startIcon={<Add />}
          onClick={addAddress}
          variant="outlined"
          size="small"
        >
          Adicionar Endereço
        </Button>
      </Box>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {safeAddresses.length === 0 ? (
        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
          <Typography color="textSecondary">
            Nenhum endereço cadastrado. Clique em "Adicionar Endereço" para começar.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {safeAddresses.map((address, index) => (
            <Paper key={index} sx={{ p: 2, bgcolor: address.is_primary ? 'primary.50' : 'background.paper' }}>
              <Grid container spacing={2}>
                {/* Primeira linha: Tipo, Principal e Remover */}
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tipo</InputLabel>
                    <Select
                      value={address.type}
                      onChange={(e) => updateAddress(index, 'type', e.target.value)}
                      label="Tipo"
                    >
                      {Object.values(AddressType).map((type) => (
                        <MenuItem key={type} value={type}>
                          {getAddressTypeLabel(type)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={address.is_primary}
                        onChange={(e) => updateAddress(index, 'is_primary', e.target.checked)}
                        size="small"
                      />
                    }
                    label="Principal"
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="CEP"
                    value={formatZipCode(address.zip_code)}
                    onChange={(e) => updateAddress(index, 'zip_code', e.target.value.replace(/\D/g, ''))}
                    onBlur={(e) => handleCEPBlur(index, e.target.value)}
                    error={!!addressErrors[index]?.zip_code}
                    helperText={addressErrors[index]?.zip_code || (cepLoadings[index] ? 'Buscando endereço...' : '')}
                    disabled={cepLoadings[index]}
                    required
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} sm={1}>
                  <IconButton
                    onClick={() => removeAddress(index)}
                    color="error"
                    size="small"
                    disabled={safeAddresses.length === 1}
                  >
                    <Delete />
                  </IconButton>
                </Grid>

                {/* Segunda linha: Logradouro e Número */}
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    label="Logradouro"
                    value={address.street}
                    onChange={(e) => updateAddress(index, 'street', e.target.value)}
                    error={!!addressErrors[index]?.street}
                    helperText={addressErrors[index]?.street}
                    required
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Número"
                    value={address.number || ''}
                    onChange={(e) => updateAddress(index, 'number', e.target.value)}
                    error={!!addressErrors[index]?.number}
                    helperText={addressErrors[index]?.number}
                    size="small"
                  />
                </Grid>

                {/* Terceira linha: Complemento e Bairro */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Complemento"
                    value={address.complement || ''}
                    onChange={(e) => updateAddress(index, 'complement', e.target.value)}
                    error={!!addressErrors[index]?.complement}
                    helperText={addressErrors[index]?.complement}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Bairro"
                    value={address.neighborhood || ''}
                    onChange={(e) => updateAddress(index, 'neighborhood', e.target.value)}
                    error={!!addressErrors[index]?.neighborhood}
                    helperText={addressErrors[index]?.neighborhood}
                    size="small"
                  />
                </Grid>

                {/* Quarta linha: Cidade e Estado */}
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    label="Cidade"
                    value={address.city}
                    onChange={(e) => updateAddress(index, 'city', e.target.value)}
                    error={!!addressErrors[index]?.city}
                    helperText={addressErrors[index]?.city}
                    required
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Estado"
                    value={address.state}
                    onChange={(e) => updateAddress(index, 'state', e.target.value.toUpperCase().slice(0, 2))}
                    error={!!addressErrors[index]?.state}
                    helperText={addressErrors[index]?.state}
                    placeholder="Ex: SP"
                    inputProps={{ maxLength: 2 }}
                    required
                    size="small"
                  />
                </Grid>

                {/* Quinta linha: Observações */}
                {address.notes !== undefined && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Observações"
                      value={address.notes || ''}
                      onChange={(e) => updateAddress(index, 'notes', e.target.value)}
                      size="small"
                      multiline
                      rows={2}
                    />
                  </Grid>
                )}
              </Grid>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};