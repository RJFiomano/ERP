import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
} from '@mui/material';
import { Receipt, TrendingUp } from '@mui/icons-material';

export const AccountsReceivable: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Contas a Receber
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Receipt sx={{ mr: 2, color: 'success.main' }} />
                <Typography variant="h6">
                  Lista de Recebíveis
                </Typography>
              </Box>
              <Typography color="textSecondary">
                Funcionalidades a implementar:
              </Typography>
              <Box component="ul" mt={2}>
                <li>Lista de contas a receber com filtros</li>
                <li>Status: Pendente, Pago, Vencido</li>
                <li>Baixa manual de pagamentos</li>
                <li>Relatório de inadimplência</li>
                <li>Envio de lembretes por email</li>
                <li>Conciliação bancária</li>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingUp sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">
                  Resumo Financeiro
                </Typography>
              </Box>
              <Box mt={2}>
                <Typography variant="body2" color="textSecondary">
                  A Receber (30 dias)
                </Typography>
                <Typography variant="h5" color="success.main">
                  R$ 45.000,00
                </Typography>
                
                <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                  Vencidos
                </Typography>
                <Typography variant="h5" color="error.main">
                  R$ 8.500,00
                </Typography>
                
                <Box mt={2}>
                  <Chip label="15 títulos pendentes" size="small" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};