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

interface ViewStockEntryModalProps {
  open: boolean;
  onClose: () => void;
  entryId: string;
}

export const ViewStockEntryModal: React.FC<ViewStockEntryModalProps> = ({
  open,
  onClose,
  entryId,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Visualizar Entrada de Estoque
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <Typography variant="body1">
            Entrada: {entryId}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Funcionalidade em desenvolvimento...
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};