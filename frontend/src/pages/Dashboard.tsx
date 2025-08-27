import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
} from '@mui/material';
import {
  TrendingUp,
  ShoppingCart,
  People,
  Receipt,
} from '@mui/icons-material';
import { reportsAPI } from '@/services/api';

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, color }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="h6">
            {title}
          </Typography>
          <Typography variant="h4" component="h2">
            {value}
          </Typography>
        </Box>
        <Box color={color}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data = await reportsAPI.getDashboard();
        setDashboardData(data);
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return <Typography>Carregando...</Typography>;
  }

  const kpis = dashboardData?.kpis || {};

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Vendas Totais"
            value={`R$ ${kpis.total_sales?.toLocaleString('pt-BR') || '0'}`}
            icon={<TrendingUp />}
            color="success.main"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Receita Mensal"
            value={`R$ ${kpis.monthly_revenue?.toLocaleString('pt-BR') || '0'}`}
            icon={<ShoppingCart />}
            color="info.main"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Clientes Ativos"
            value={kpis.active_clients?.toString() || '0'}
            icon={<People />}
            color="warning.main"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Pedidos Pendentes"
            value={kpis.pending_orders?.toString() || '0'}
            icon={<Receipt />}
            color="error.main"
          />
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Vendas por Mês (Últimos 6 meses)
            </Typography>
            <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="textSecondary">
                Gráfico de vendas - implementar com biblioteca de gráficos
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Top Produtos
            </Typography>
            <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="textSecondary">
                Lista de produtos mais vendidos
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};