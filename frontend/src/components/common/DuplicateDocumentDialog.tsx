import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Alert,
  Divider,
} from '@mui/material';
import { Person, Business, Visibility } from '@mui/icons-material';

interface ExistingContact {
  id: string;
  nome: string;
  pessoa_tipo: 'PF' | 'PJ';
  documento: string;
  email?: string;
  is_active: boolean;
  papeis: string[];
}

interface DuplicateDocumentDialogProps {
  open: boolean;
  document: string;
  existingContact: ExistingContact | null;
  onClose: () => void;
  onOpenExisting: (contact: ExistingContact) => void;
}

export const DuplicateDocumentDialog: React.FC<DuplicateDocumentDialogProps> = ({
  open,
  document,
  existingContact,
  onClose,
  onOpenExisting,
}) => {
  const formatDocument = (documento: string, tipo: 'PF' | 'PJ') => {
    const clean = documento.replace(/\D/g, '');
    if (tipo === 'PF') {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const handleOpenExisting = () => {
    if (existingContact) {
      onOpenExisting(existingContact);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Alert severity="warning" sx={{ flexGrow: 1 }}>
            Documento já cadastrado!
          </Alert>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          O documento <strong>{formatDocument(document, existingContact?.pessoa_tipo || 'PF')}</strong> já está cadastrado no sistema.
        </Typography>

        {existingContact && (
          <Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>
              Contato Existente:
            </Typography>
            
            <Box sx={{ 
              p: 2, 
              border: 1, 
              borderColor: 'divider', 
              borderRadius: 1,
              backgroundColor: 'background.paper'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {existingContact.pessoa_tipo === 'PF' ? <Person /> : <Business />}
                <Typography variant="h6">
                  {existingContact.nome}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={existingContact.pessoa_tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  size="small"
                  color={existingContact.pessoa_tipo === 'PF' ? 'primary' : 'warning'}
                />
                <Chip
                  label={existingContact.is_active ? 'Ativo' : 'Inativo'}
                  size="small"
                  color={existingContact.is_active ? 'success' : 'error'}
                />
              </Box>

              {existingContact.email && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Email:</strong> {existingContact.email}
                </Typography>
              )}

              {existingContact.papeis && existingContact.papeis.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ mr: 1 }}>
                    <strong>Papéis:</strong>
                  </Typography>
                  {existingContact.papeis.map((papel) => (
                    <Chip
                      key={papel}
                      label={papel}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Fechar
        </Button>
        {existingContact && (
          <Button
            variant="contained"
            startIcon={<Visibility />}
            onClick={handleOpenExisting}
            disabled={!existingContact}
          >
            Abrir Cadastro Existente
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};