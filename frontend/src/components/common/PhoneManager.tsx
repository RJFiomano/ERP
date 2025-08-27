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
  Divider,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { Phone, PhoneCreate, PhoneType } from '@/types/contact';
import { validatePhone } from '@/utils/validation';

interface PhoneManagerProps {
  phones: PhoneCreate[];
  onChange: (phones: PhoneCreate[]) => void;
  error?: string;
}

export const PhoneManager: React.FC<PhoneManagerProps> = ({
  phones = [],
  onChange,
  error,
}) => {
  const [phoneErrors, setPhoneErrors] = useState<{ [index: number]: string }>({});
  
  // Ensure phones is always an array
  const safePhones = Array.isArray(phones) ? phones : [];

  const addPhone = () => {
    const newPhone: PhoneCreate = {
      number: '',
      type: PhoneType.mobile,
      is_whatsapp: false,
      is_primary: safePhones.length === 0, // Primeiro telefone é primary por padrão
      notes: '',
    };
    onChange([...safePhones, newPhone]);
  };

  const removePhone = (index: number) => {
    const updatedPhones = safePhones.filter((_, i) => i !== index);
    
    // Se removemos o telefone primário, definir o primeiro como primário
    if (safePhones[index]?.is_primary && updatedPhones.length > 0) {
      updatedPhones[0].is_primary = true;
    }
    
    onChange(updatedPhones);
    
    // Remove erro deste índice
    const { [index]: removedError, ...remainingErrors } = phoneErrors;
    setPhoneErrors(remainingErrors);
  };

  const updatePhone = (index: number, field: keyof PhoneCreate, value: any) => {
    const updatedPhones = [...safePhones];
    
    if (field === 'is_primary' && value) {
      // Apenas um telefone pode ser primário
      updatedPhones.forEach((phone, i) => {
        phone.is_primary = i === index;
      });
    } else {
      if (updatedPhones[index]) {
        (updatedPhones[index] as any)[field] = value;
      }
    }
    
    onChange(updatedPhones);
    
    // Validar telefone se o campo for 'number'
    if (field === 'number') {
      const cleanNumber = value.replace(/\D/g, '');
      if (cleanNumber && !validatePhone(value)) {
        setPhoneErrors(prev => ({ ...prev, [index]: 'Telefone inválido' }));
      } else {
        const { [index]: removedError, ...remainingErrors } = phoneErrors;
        setPhoneErrors(remainingErrors);
      }
    }
  };

  const formatPhone = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 10) {
      return cleanValue.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  const getPhoneTypeLabel = (type: PhoneType) => {
    const labels = {
      [PhoneType.mobile]: 'Celular',
      [PhoneType.home]: 'Residencial',
      [PhoneType.work]: 'Comercial',
      [PhoneType.fax]: 'Fax',
      [PhoneType.whatsapp]: 'WhatsApp',
    };
    return labels[type];
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Telefones</Typography>
        <Button
          startIcon={<Add />}
          onClick={addPhone}
          variant="outlined"
          size="small"
        >
          Adicionar Telefone
        </Button>
      </Box>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {safePhones.length === 0 ? (
        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
          <Typography color="textSecondary">
            Nenhum telefone cadastrado. Clique em "Adicionar Telefone" para começar.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {safePhones.map((phone, index) => (
            <Paper key={index} sx={{ p: 2, bgcolor: phone.is_primary ? 'primary.50' : 'background.paper' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Número"
                    value={formatPhone(phone.number)}
                    onChange={(e) => updatePhone(index, 'number', e.target.value.replace(/\D/g, ''))}
                    error={!!phoneErrors[index]}
                    helperText={phoneErrors[index]}
                    required
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tipo</InputLabel>
                    <Select
                      value={phone.type}
                      onChange={(e) => updatePhone(index, 'type', e.target.value)}
                      label="Tipo"
                    >
                      {Object.values(PhoneType).map((type) => (
                        <MenuItem key={type} value={type}>
                          {getPhoneTypeLabel(type)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={phone.is_whatsapp}
                        onChange={(e) => updatePhone(index, 'is_whatsapp', e.target.checked)}
                        size="small"
                      />
                    }
                    label="WhatsApp"
                  />
                </Grid>

                <Grid item xs={12} sm={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={phone.is_primary}
                        onChange={(e) => updatePhone(index, 'is_primary', e.target.checked)}
                        size="small"
                      />
                    }
                    label="Principal"
                  />
                </Grid>

                <Grid item xs={12} sm={1}>
                  <IconButton
                    onClick={() => removePhone(index)}
                    color="error"
                    size="small"
                    disabled={safePhones.length === 1}
                  >
                    <Delete />
                  </IconButton>
                </Grid>

                {phone.notes !== undefined && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Observações"
                      value={phone.notes || ''}
                      onChange={(e) => updatePhone(index, 'notes', e.target.value)}
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