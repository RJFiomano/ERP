import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Divider,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import {
  Receipt,
  Download,
  Print,
  Cancel,
  CheckCircle,
  Error,
  ContentCopy,
} from '@mui/icons-material';
import { toast } from 'react-toastify';

interface NFEModalProps {
  open: boolean;
  onClose: () => void;
  saleOrderId?: string;
  saleId?: string;  // Alias para compatibilidade
  customerData?: any;
}

interface NFEData {
  numero: string;
  serie: string;
  data_emissao: string;
  chave_acesso: string;
  status: string;
  protocolo: string;
  totais: {
    valor_total_nota: number;
    valor_icms: number;
    valor_pis: number;
    valor_cofins: number;
  };
  emitente: {
    razao_social: string;
    cnpj: string;
  };
  destinatario: {
    nome: string;
    cpf_cnpj: string;
  };
}

export const NFEModal: React.FC<NFEModalProps> = ({
  open,
  onClose,
  saleOrderId,
  saleId,
  customerData,
}) => {
  // Usar saleId ou saleOrderId (compatibilidade)
  const finalSaleId = saleId || saleOrderId;
  const [loading, setLoading] = useState(false);
  const [nfeData, setNfeData] = useState<NFEData | null>(null);
  const [error, setError] = useState<string>('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);

  const handleGenerateNFE = async () => {
    if (!saleOrderId || !customerData) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/nfe/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          sale_order_id: saleOrderId,
          customer_data: customerData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setNfeData(result.data);
        toast.success('NF-e gerada com sucesso!');
      } else {
        setError(result.detail || 'Erro ao gerar NF-e');
      }
    } catch (error) {
      setError('Erro de conexão ao gerar NF-e');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelNFE = async () => {
    if (!nfeData || !cancelReason.trim()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/nfe/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          nfe_number: nfeData.numero,
          reason: cancelReason,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setNfeData(prev => prev ? { ...prev, status: 'cancelada' } : null);
        setShowCancelForm(false);
        toast.success('NF-e cancelada com sucesso!');
      } else {
        setError(result.detail || 'Erro ao cancelar NF-e');
      }
    } catch (error) {
      setError('Erro de conexão ao cancelar NF-e');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'autorizada': return 'success';
      case 'cancelada': return 'error';
      case 'processando': return 'warning';
      default: return 'default';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { minHeight: '500px' } }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <Receipt sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6">
            {nfeData ? `NF-e Nº ${nfeData.numero}/${nfeData.serie}` : 'Emissão de NF-e'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!nfeData && !loading && (
          <Box textAlign="center" py={4}>
            <Receipt sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Gerar Nota Fiscal Eletrônica
            </Typography>
            <Typography variant="body2" color="textSecondary" mb={3}>
              Clique no botão abaixo para emitir a NF-e do pedido de venda
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleGenerateNFE}
              startIcon={<Receipt />}
            >
              Gerar NF-e
            </Button>
          </Box>
        )}

        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Processando NF-e...
            </Typography>
          </Box>
        )}

        {nfeData && (
          <Box>
            {/* Status */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">Status da NF-e</Typography>
                  <Chip 
                    label={nfeData.status.toUpperCase()}
                    color={getStatusColor(nfeData.status)}
                    icon={nfeData.status === 'autorizada' ? <CheckCircle /> : <Error />}
                  />
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      Data de Emissão
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(nfeData.data_emissao)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      Protocolo
                    </Typography>
                    <Typography variant="body1">{nfeData.protocolo}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Chave de Acesso */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Chave de Acesso
                </Typography>
                <Box display="flex" alignItems="center">
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace', 
                      fontSize: '0.9rem',
                      wordBreak: 'break-all',
                      flex: 1 
                    }}
                  >
                    {nfeData.chave_acesso}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => copyToClipboard(nfeData.chave_acesso)}
                  >
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>

            {/* Dados das Empresas */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Emitente
                    </Typography>
                    <Typography variant="body2">
                      {nfeData.emitente.razao_social}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      CNPJ: {nfeData.emitente.cnpj}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Destinatário
                    </Typography>
                    <Typography variant="body2">
                      {nfeData.destinatario.nome}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      CPF/CNPJ: {nfeData.destinatario.cpf_cnpj}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Totais */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Valores da NF-e
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Valor Total da Nota"
                      secondary={formatCurrency(nfeData.totais.valor_total_nota)}
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText 
                      primary="ICMS"
                      secondary={formatCurrency(nfeData.totais.valor_icms)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="PIS"
                      secondary={formatCurrency(nfeData.totais.valor_pis)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="COFINS"
                      secondary={formatCurrency(nfeData.totais.valor_cofins)}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            {/* Cancelamento */}
            {nfeData.status === 'autorizada' && !showCancelForm && (
              <Box textAlign="center" mb={2}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Cancel />}
                  onClick={() => setShowCancelForm(true)}
                >
                  Cancelar NF-e
                </Button>
              </Box>
            )}

            {showCancelForm && (
              <Card sx={{ mb: 2, border: '1px solid', borderColor: 'error.main' }}>
                <CardContent>
                  <Typography variant="subtitle2" color="error" gutterBottom>
                    Cancelamento de NF-e
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Motivo do Cancelamento"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Digite o motivo do cancelamento..."
                    sx={{ mb: 2 }}
                  />
                  <Box display="flex" gap={1}>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={handleCancelNFE}
                      disabled={!cancelReason.trim() || loading}
                    >
                      Confirmar Cancelamento
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => setShowCancelForm(false)}
                    >
                      Cancelar
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {nfeData && nfeData.status === 'autorizada' && (
          <>
            <Button startIcon={<Download />} onClick={() => toast.info('Download em desenvolvimento')}>
              Download XML
            </Button>
            <Button startIcon={<Print />} onClick={() => toast.info('Impressão em desenvolvimento')}>
              Imprimir DANFE
            </Button>
          </>
        )}
        <Button onClick={onClose}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};