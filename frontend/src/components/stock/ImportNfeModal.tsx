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

interface ImportNfeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportNfeModal: React.FC<ImportNfeModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Importar NFe XML
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Funcionalidade de importação de NFe em desenvolvimento...
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={onSuccess} variant="contained">
          Importar
        </Button>
      </DialogActions>
    </Dialog>
  );
};