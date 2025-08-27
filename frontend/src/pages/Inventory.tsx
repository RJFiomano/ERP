import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
} from '@mui/material';
import { 
  Inventory2, 
  Warning, 
  TrendingUp,
  Add,
  Assessment 
} from '@mui/icons-material';

export const Inventory: React.FC = () => {
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Estoque
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => alert('Implementar entrada de estoque')}
        >
          Nova Movimentação
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Inventory2 sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">
                  Total em Estoque
                </Typography>
              </Box>
              <Typography variant="h4" color="primary.main">
                1.250
              </Typography>
              <Typography variant="body2" color="textSecondary">
                produtos diferentes
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Warning sx={{ mr: 2, color: 'warning.main' }} />
                <Typography variant="h6">
                  Estoque Baixo
                </Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                15
              </Typography>
              <Typography variant="body2" color="textSecondary">
                produtos abaixo do mínimo
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingUp sx={{ mr: 2, color: 'success.main' }} />
                <Typography variant="h6">
                  Valor Total
                </Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                R$ 85.000
              </Typography>
              <Typography variant="body2" color="textSecondary">
                valor do estoque
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Assessment sx={{ mr: 2, color: 'info.main' }} />
                <Typography variant="h6">
                  Movimentações de Estoque
                </Typography>
              </Box>
              <Typography color="textSecondary">
                Funcionalidades a implementar:
              </Typography>
              <Box component="ul" mt={2}>
                <li>Controle de entradas e saídas</li>
                <li>Ajustes de inventário</li>
                <li>Histórico de movimentações</li>
                <li>Relatório de giro de estoque</li>
                <li>Contagem cíclica</li>
                <li>Integração com compras e vendas</li>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Alertas
              </Typography>
              <Box>
                <Chip 
                  label="Produto A - Estoque: 2"
                  color="error" 
                  size="small"
                  sx={{ mb: 1, width: '100%' }}
                />
                <Chip 
                  label="Produto B - Estoque: 1"
                  color="warning" 
                  size="small"
                  sx={{ mb: 1, width: '100%' }}
                />
                <Chip 
                  label="Produto C - Estoque: 0"
                  color="error" 
                  size="small"
                  sx={{ width: '100%' }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};