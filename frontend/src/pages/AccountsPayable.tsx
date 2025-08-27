import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
} from '@mui/material';
import { AccountBalance, TrendingDown } from '@mui/icons-material';

export const AccountsPayable: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Contas a Pagar
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <AccountBalance sx={{ mr: 2, color: 'error.main' }} />
                <Typography variant="h6">
                  Lista de Pagáveis
                </Typography>
              </Box>
              <Typography color="textSecondary">
                Funcionalidades a implementar:
              </Typography>
              <Box component="ul" mt={2}>
                <li>Lista de contas a pagar com filtros</li>
                <li>Status: Pendente, Pago, Vencido</li>
                <li>Agendamento de pagamentos</li>
                <li>Integração com bancos</li>
                <li>Aprovação de pagamentos</li>
                <li>Controle de fluxo de caixa</li>
                <li>Relatórios gerenciais</li>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingDown sx={{ mr: 2, color: 'error.main' }} />
                <Typography variant="h6">
                  Resumo de Pagamentos
                </Typography>
              </Box>
              <Box mt={2}>
                <Typography variant="body2" color="textSecondary">
                  A Pagar (30 dias)
                </Typography>
                <Typography variant="h5" color="error.main">
                  R$ 32.000,00
                </Typography>
                
                <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                  Vencendo Hoje
                </Typography>
                <Typography variant="h5" color="warning.main">
                  R$ 5.200,00
                </Typography>
                
                <Box mt={2}>
                  <Chip label="22 títulos pendentes" size="small" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};