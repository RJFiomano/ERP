import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Typography,
  Chip,
  IconButton,
  Card,
  CardContent,
} from '@mui/material';
import { Close, Person, Business, Email, LocationOn, CalendarToday } from '@mui/icons-material';
import { Client, PersonType } from '@/types/client';

interface ViewClientModalProps {
  open: boolean;
  client: Client | null;
  onClose: () => void;
  onEdit: (client: Client) => void;
}

export const ViewClientModal: React.FC<ViewClientModalProps> = ({
  open,
  client,
  onClose,
  onEdit,
}) => {
  if (!client) return null;

  const formatDocument = (document: string, type: PersonType) => {
    if (type === PersonType.PF) {
      return document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      return document.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return '-';
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length <= 10) {
      return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  const formatZipCode = (zipCode?: string) => {
    if (!zipCode) return '-';
    return zipCode.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFullAddress = () => {
    const parts = [];
    if (client.address) parts.push(client.address);
    if (client.city) parts.push(client.city);
    if (client.state) parts.push(client.state);
    if (client.zip_code) parts.push(`CEP ${formatZipCode(client.zip_code)}`);
    return parts.length > 0 ? parts.join(', ') : 'Não informado';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            {client.person_type === PersonType.PF ? <Person /> : <Business />}
            <Typography variant="h6">Detalhes do Cliente</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Informações Básicas */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Informações Básicas
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={8}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Nome / Razão Social
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {client.name}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Tipo
                    </Typography>
                    <Chip
                      label={client.person_type === PersonType.PF ? 'Pessoa Física' : 'Pessoa Jurídica'}
                      color={client.person_type === PersonType.PF ? 'primary' : 'secondary'}
                      size="small"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {client.person_type === PersonType.PF ? 'CPF' : 'CNPJ'}
                    </Typography>
                    <Typography variant="body1" fontFamily="monospace">
                      {formatDocument(client.document, client.person_type)}
                    </Typography>
                  </Grid>

                  {client.person_type === PersonType.PJ && client.ie && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Inscrição Estadual
                      </Typography>
                      <Typography variant="body1">
                        {client.ie}
                      </Typography>
                    </Grid>
                  )}

                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      label={client.is_active ? 'Ativo' : 'Inativo'}
                      color={client.is_active ? 'success' : 'error'}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Contato */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  <Email sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Contato
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1">
                      {client.email || 'Não informado'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Telefone
                    </Typography>
                    <Typography variant="body1">
                      {formatPhone(client.phone)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Endereço */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  <LocationOn sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Endereço
                </Typography>
                
                <Typography variant="body1">
                  {getFullAddress()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Informações do Sistema */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  <CalendarToday sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Informações do Sistema
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Criado em
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(client.created_at)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Última atualização
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(client.updated_at)}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      ID do Cliente
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                      {client.id}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Fechar
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            onClose();
            setTimeout(() => onEdit(client), 100);
          }}
        >
          Editar Cliente
        </Button>
      </DialogActions>
    </Dialog>
  );
};