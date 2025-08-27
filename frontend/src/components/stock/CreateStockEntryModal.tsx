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

interface CreateStockEntryModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateStockEntryModal: React.FC<CreateStockEntryModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Nova Entrada de Estoque
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Formulário de entrada de estoque em desenvolvimento...
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={onSuccess} variant="contained">
          Criar Entrada
        </Button>
      </DialogActions>
    </Dialog>
  );
};