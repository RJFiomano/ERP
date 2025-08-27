import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Chip,
} from '@mui/material';
import { Warning, Visibility } from '@mui/icons-material';
import { Client } from '@/types/client';

interface DuplicateClientModalProps {
  open: boolean;
  onClose: () => void;
  onViewExisting: () => void;
  existingClient: Client | null;
  document: string;
  documentType: 'CPF' | 'CNPJ';
}

export const DuplicateClientModal: React.FC<DuplicateClientModalProps> = ({
  open,
  onClose,
  onViewExisting,
  existingClient,
  document,
  documentType,
}) => {
  const formatDocument = (doc: string, type: 'CPF' | 'CNPJ') => {
    const cleanDoc = doc.replace(/\D/g, '');
    if (type === 'CPF' && cleanDoc.length === 11) {
      return `${cleanDoc.slice(0, 3)}.${cleanDoc.slice(3, 6)}.${cleanDoc.slice(6, 9)}-${cleanDoc.slice(9)}`;
    }
    if (type === 'CNPJ' && cleanDoc.length === 14) {
      return `${cleanDoc.slice(0, 2)}.${cleanDoc.slice(2, 5)}.${cleanDoc.slice(5, 8)}/${cleanDoc.slice(8, 12)}-${cleanDoc.slice(12)}`;
    }
    return doc;
  };

  if (!existingClient) return null;

  const formattedDocument = formatDocument(document, documentType);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Warning color="warning" />
          <Typography variant="h6">Documento Já Cadastrado</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Typography variant="body1" paragraph>
          Já existe um cliente cadastrado com este {documentType}: <strong>{formattedDocument}</strong>
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" gutterBottom>
          <strong>Cliente Existente:</strong>
        </Typography>

        <Box sx={{ pl: 2 }}>
          <Typography variant="body2">
            <strong>Nome:</strong> {existingClient.name}
          </Typography>
          <Typography variant="body2">
            <strong>Tipo:</strong> {existingClient.person_type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
          </Typography>
          <Typography variant="body2">
            <strong>Email:</strong> {existingClient.email || 'Não informado'}
          </Typography>
          <Typography variant="body2">
            <strong>Telefone:</strong> {existingClient.phone || 'Não informado'}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Chip
              label={existingClient.is_active ? 'Ativo' : 'Inativo'}
              color={existingClient.is_active ? 'success' : 'default'}
              size="small"
            />
          </Box>
        </Box>

        {/* Mensagem de alerta sobre documento duplicado */}
        <Box sx={{ mt: 2, p: 2, borderRadius: 1 }}>
          <Typography variant="body2" color="error">
            <strong>Atenção:</strong> Não é possível cadastrar dois clientes com o mesmo documento.
            Você pode visualizar os detalhes completos do cliente existente ou fechar essa mensagem!
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Fechar
        </Button>
        {existingClient?.id !== 'temp' && (
          <Button
            onClick={onViewExisting}
            variant="outlined"
            startIcon={<Visibility />}
          >
            Ver Cliente Existente
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};