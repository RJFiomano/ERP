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

interface ProcessPaymentModalProps {
  open: boolean;
  onClose: () => void;
  accountId: string;
  onSuccess: () => void;
}

export const ProcessPaymentModal: React.FC<ProcessPaymentModalProps> = ({
  open,
  onClose,
  accountId,
  onSuccess,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Processar Pagamento
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <Typography variant="body1">
            Conta: {accountId}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Formulário de pagamento em desenvolvimento...
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={onSuccess} variant="contained">
          Confirmar Pagamento
        </Button>
      </DialogActions>
    </Dialog>
  );
};