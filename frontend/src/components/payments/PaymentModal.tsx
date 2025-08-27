import React, { useState, useEffect } from 'react';
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Payment,
  Pix,
  CreditCard,
  Receipt as BoletoIcon,
  QrCode,
  ContentCopy,
  CheckCircle,
  Error,
  Refresh,
  LocalAtm,
} from '@mui/icons-material';
import { toast } from 'react-toastify';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  customerData?: any;
  onPaymentSuccess?: (paymentData: any) => void;
}

interface PaymentMethod {
  method: string;
  name: string;
  description: string;
  fee_percentage: number;
  max_installments: number;
}

interface PaymentData {
  payment_id: string;
  method: string;
  amount: number;
  status: string;
  qr_code?: string;
  barcode?: string;
  digitable_line?: string;
  authorization_code?: string;
  installments?: number;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  open,
  onClose,
  amount,
  customerData,
  onPaymentSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [error, setError] = useState<string>('');
  
  // Card data
  const [cardData, setCardData] = useState({
    number: '',
    holder_name: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
  });
  const [installments, setInstallments] = useState<number>(1);

  // Status checking
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    if (open) {
      loadPaymentMethods();
      setSelectedMethod('');
      setPaymentData(null);
      setError('');
    }
  }, [open]);

  const loadPaymentMethods = async () => {
    // Definir métodos de pagamento padrão
    const defaultMethods: PaymentMethod[] = [
      {
        method: 'cash',
        name: 'Dinheiro',
        description: 'Pagamento em dinheiro',
        fee_percentage: 0,
        max_installments: 1
      },
      {
        method: 'pix',
        name: 'PIX',
        description: 'Pagamento instantâneo',
        fee_percentage: 0,
        max_installments: 1
      },
      {
        method: 'debit_card',
        name: 'Cartão de Débito',
        description: 'Débito à vista',
        fee_percentage: 2.5,
        max_installments: 1
      },
      {
        method: 'credit_card',
        name: 'Cartão de Crédito',
        description: 'Crédito parcelado',
        fee_percentage: 3.5,
        max_installments: 12
      }
    ];
    
    setMethods(defaultMethods);
  };

  const handlePixPayment = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payments/pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          amount,
          customer_data: customerData || {},
        }),
      });

      const result = await response.json();

      if (result.success) {
        setPaymentData(result.data);
        toast.success('PIX gerado com sucesso!');
        startStatusCheck(result.data.payment_id);
      } else {
        setError(result.detail || 'Erro ao processar PIX');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleCardPayment = async () => {
    if (!cardData.number || !cardData.holder_name || !cardData.cvv) {
      setError('Preencha todos os campos do cartão');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payments/card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          amount,
          card_data: cardData,
          installments,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setPaymentData(result.data);
        if (result.data.status === 'approved') {
          toast.success('Pagamento aprovado!');
          onPaymentSuccess?.(result.data);
        } else {
          toast.error('Pagamento recusado');
        }
      } else {
        setError(result.detail || 'Erro ao processar pagamento');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleBoletoPayment = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payments/boleto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          amount,
          customer_data: customerData || {},
        }),
      });

      const result = await response.json();

      if (result.success) {
        setPaymentData(result.data);
        toast.success('Boleto gerado com sucesso!');
        startStatusCheck(result.data.payment_id);
      } else {
        setError(result.detail || 'Erro ao gerar boleto');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const startStatusCheck = (paymentId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payments/${paymentId}/status`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const result = await response.json();
        
        if (result.success && result.data.status === 'approved') {
          setPaymentData(result.data);
          toast.success('Pagamento aprovado!');
          onPaymentSuccess?.(result.data);
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    }, 3000);

    // Para após 5 minutos
    setTimeout(() => clearInterval(interval), 300000);
  };

  const checkPaymentStatus = async () => {
    if (!paymentData) return;

    setCheckingStatus(true);
    try {
      const response = await fetch(`/api/payments/${paymentData.payment_id}/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const result = await response.json();
      
      if (result.success) {
        setPaymentData(result.data);
        if (result.data.status === 'approved') {
          toast.success('Pagamento aprovado!');
          onPaymentSuccess?.(result.data);
        }
      }
    } catch (error) {
      toast.error('Erro ao verificar status');
    } finally {
      setCheckingStatus(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'refused': return 'error';
      case 'pending': return 'warning';
      case 'processing': return 'info';
      default: return 'default';
    }
  };

  const handleCashPayment = () => {
    const paymentResult = {
      payment_id: `CASH_${Date.now()}`,
      method: 'cash',
      amount: amount,
      status: 'approved',
      authorization_code: `CASH${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    };
    
    setPaymentData(paymentResult);
    toast.success('Pagamento em dinheiro confirmado!');
    
    if (onPaymentSuccess) {
      onPaymentSuccess(paymentResult);
    }
  };

  const processPayment = () => {
    if (!selectedMethod) {
      setError('Selecione um método de pagamento');
      return;
    }

    switch (selectedMethod) {
      case 'cash':
        handleCashPayment();
        break;
      case 'pix':
        handlePixPayment();
        break;
      case 'credit_card':
      case 'debit_card':
        handleCardPayment();
        break;
      case 'boleto':
        handleBoletoPayment();
        break;
      default:
        setError('Método de pagamento não implementado');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <Payment sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6">
            Pagamento - {formatCurrency(amount)}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!paymentData && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Selecione o método de pagamento
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {methods.map((method) => (
                <Grid item xs={12} sm={6} md={4} key={method.method}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      border: selectedMethod === method.method ? 2 : 1,
                      borderColor: selectedMethod === method.method ? 'primary.main' : 'divider',
                    }}
                    onClick={() => setSelectedMethod(method.method)}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={1}>
                        {method.method === 'cash' && <LocalAtm />}
                        {method.method === 'pix' && <Pix />}
                        {method.method.includes('card') && <CreditCard />}
                        {method.method === 'boleto' && <BoletoIcon />}
                        <Typography variant="subtitle1" sx={{ ml: 1 }}>
                          {method.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="textSecondary">
                        {method.description}
                      </Typography>
                      {method.fee_percentage > 0 && (
                        <Chip 
                          label={`Taxa: ${method.fee_percentage}%`}
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Formulário de Cartão */}
            {(selectedMethod === 'credit_card' || selectedMethod === 'debit_card') && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Dados do Cartão
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Número do Cartão"
                        value={cardData.number}
                        onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                        placeholder="1234 5678 9012 3456"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Nome do Titular"
                        value={cardData.holder_name}
                        onChange={(e) => setCardData({ ...cardData, holder_name: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Mês"
                        value={cardData.expiry_month}
                        onChange={(e) => setCardData({ ...cardData, expiry_month: e.target.value })}
                        placeholder="MM"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Ano"
                        value={cardData.expiry_year}
                        onChange={(e) => setCardData({ ...cardData, expiry_year: e.target.value })}
                        placeholder="YYYY"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="CVV"
                        value={cardData.cvv}
                        onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                        placeholder="123"
                      />
                    </Grid>
                    {selectedMethod === 'credit_card' && (
                      <Grid item xs={6}>
                        <FormControl fullWidth>
                          <InputLabel>Parcelas</InputLabel>
                          <Select
                            value={installments}
                            onChange={(e) => setInstallments(Number(e.target.value))}
                            label="Parcelas"
                          >
                            {[...Array(12)].map((_, i) => (
                              <MenuItem key={i + 1} value={i + 1}>
                                {i + 1}x de {formatCurrency(amount / (i + 1))}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            )}
          </Box>
        )}

        {paymentData && (
          <Box>
            {/* Status */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">Status do Pagamento</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip 
                      label={paymentData.status.toUpperCase()}
                      color={getStatusColor(paymentData.status)}
                      icon={paymentData.status === 'approved' ? <CheckCircle /> : <Error />}
                    />
                    {paymentData.status === 'pending' && (
                      <IconButton 
                        size="small" 
                        onClick={checkPaymentStatus}
                        disabled={checkingStatus}
                      >
                        <Refresh />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* PIX QR Code */}
            {paymentData.method === 'pix' && paymentData.qr_code && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <QrCode sx={{ mr: 1 }} />
                    <Typography variant="h6">PIX</Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Escaneie o QR Code ou copie o código PIX
                  </Typography>
                  <Box 
                    sx={{ 
                      bgcolor: 'grey.100',
                      p: 2,
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      wordBreak: 'break-all'
                    }}
                  >
                    {paymentData.qr_code}
                  </Box>
                  <Box display="flex" justifyContent="center" mt={2}>
                    <Button
                      startIcon={<ContentCopy />}
                      onClick={() => copyToClipboard(paymentData.qr_code!)}
                    >
                      Copiar Código PIX
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Boleto */}
            {paymentData.method === 'boleto' && paymentData.digitable_line && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <BoletoIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">Boleto Bancário</Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Linha Digitável
                  </Typography>
                  <TextField
                    fullWidth
                    value={paymentData.digitable_line}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => copyToClipboard(paymentData.digitable_line!)}>
                            <ContentCopy />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Cartão Aprovado */}
            {paymentData.method.includes('card') && paymentData.authorization_code && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="h6">Pagamento Aprovado</Typography>
                  </Box>
                  <Typography variant="body2">
                    Código de Autorização: {paymentData.authorization_code}
                  </Typography>
                  {paymentData.installments && paymentData.installments > 1 && (
                    <Typography variant="body2">
                      Parcelado em {paymentData.installments}x
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        )}

        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Processando pagamento...
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {!paymentData && selectedMethod && (
          <Button
            variant="contained"
            onClick={processPayment}
            disabled={loading}
          >
            Processar Pagamento
          </Button>
        )}
        <Button onClick={onClose}>
          {paymentData?.status === 'approved' ? 'Concluir' : 'Cancelar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};