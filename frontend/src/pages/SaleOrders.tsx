import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { CreateSaleOrderModal } from '@/components/saleOrders/CreateSaleOrderModal';

const SaleOrders: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleSuccess = () => {
    // Aqui você recarregaria a lista de pedidos
    console.log('Pedido criado com sucesso!');
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Pedidos de Venda
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gerencie todos os pedidos de venda da empresa
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowCreateModal(true)}
          >
            Novo Pedido
          </Button>
        </Box>

        {/* Aqui viria a tabela com a lista de pedidos */}
        <Box 
          sx={{ 
            height: 400, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            bgcolor: 'grey.100',
            borderRadius: 1
          }}
        >
          <Typography color="textSecondary">
            Lista de pedidos será implementada aqui
          </Typography>
        </Box>

        {/* Modal de Criação */}
        <CreateSaleOrderModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleSuccess}
        />
      </Box>
    </Container>
  );
};

export default SaleOrders;