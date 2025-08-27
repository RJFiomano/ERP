import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

export const TestSaleInterface: React.FC = () => {
  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Interface de Vendas - Teste
          </Typography>
          <Typography variant="body1">
            Se você está vendo esta mensagem, o problema não é de carregamento geral.
            O erro específico deve estar no componente ImprovedFastSaleInterface.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Verifique o console do navegador para erros específicos.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};