import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
} from '@mui/material';
import { 
  BarChart, 
  PictureAsPdf,
  FileDownload,
  Assessment 
} from '@mui/icons-material';

export const Reports: React.FC = () => {
  const handleExportCSV = () => {
    alert('Exportar relatório em CSV - implementar');
  };

  const handleExportPDF = () => {
    alert('Exportar relatório em PDF - implementar');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Relatórios
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <BarChart sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">
                  Relatório de Vendas
                </Typography>
              </Box>
              <Typography color="textSecondary" gutterBottom>
                Análise de vendas por período, cliente, produto
              </Typography>
              <Box mt={2}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<FileDownload />}
                  onClick={handleExportCSV}
                  sx={{ mr: 1 }}
                >
                  CSV
                </Button>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<PictureAsPdf />}
                  onClick={handleExportPDF}
                >
                  PDF
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Assessment sx={{ mr: 2, color: 'success.main' }} />
                <Typography variant="h6">
                  Relatório Financeiro
                </Typography>
              </Box>
              <Typography color="textSecondary" gutterBottom>
                DRE, fluxo de caixa, contas a pagar/receber
              </Typography>
              <Box mt={2}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<FileDownload />}
                  onClick={handleExportCSV}
                  sx={{ mr: 1 }}
                >
                  CSV
                </Button>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<PictureAsPdf />}
                  onClick={handleExportPDF}
                >
                  PDF
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <BarChart sx={{ mr: 2, color: 'info.main' }} />
                <Typography variant="h6">
                  Relatório de Estoque
                </Typography>
              </Box>
              <Typography color="textSecondary" gutterBottom>
                Posição de estoque, giro, produtos em falta
              </Typography>
              <Box mt={2}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<FileDownload />}
                  onClick={handleExportCSV}
                  sx={{ mr: 1 }}
                >
                  CSV
                </Button>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<PictureAsPdf />}
                  onClick={handleExportPDF}
                >
                  PDF
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Assessment sx={{ mr: 2, color: 'warning.main' }} />
                <Typography variant="h6">
                  Relatório de Clientes
                </Typography>
              </Box>
              <Typography color="textSecondary" gutterBottom>
                Análise de clientes, ranking, histórico
              </Typography>
              <Box mt={2}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<FileDownload />}
                  onClick={handleExportCSV}
                  sx={{ mr: 1 }}
                >
                  CSV
                </Button>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<PictureAsPdf />}
                  onClick={handleExportPDF}
                >
                  PDF
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Filtros Avançados
              </Typography>
              <Typography color="textSecondary">
                Implementar filtros por:
              </Typography>
              <Box component="ul" mt={1}>
                <li>Período (data início/fim)</li>
                <li>Cliente/Fornecedor específico</li>
                <li>Produto/Categoria</li>
                <li>Status (ativo, inativo, cancelado)</li>
                <li>Valor mínimo/máximo</li>
                <li>Região geográfica</li>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};