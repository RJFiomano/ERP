import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';

interface CreateAccountPayableModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateAccountPayableModal: React.FC<CreateAccountPayableModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Nova Conta a Pagar
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Formulário de criação de conta a pagar em desenvolvimento...
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={onSuccess} variant="contained">
          Criar
        </Button>
      </DialogActions>
    </Dialog>
  );
};