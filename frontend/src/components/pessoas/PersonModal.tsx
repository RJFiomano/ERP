import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Typography,
  Tabs,
  Tab,
  FormControlLabel,
  Checkbox,
  Chip,
  Divider,
  Switch,
  InputAdornment,
  Paper,
} from '@mui/material';
import { Close, CheckCircle, Error, Visibility, HourglassEmpty } from '@mui/icons-material';
import { PhoneManager } from '@/components/common/PhoneManager';
import { AddressManager } from '@/components/common/AddressManager';
import { DuplicateDocumentDialog } from '@/components/common/DuplicateDocumentDialog';
import { useDocumentValidation } from '@/hooks/useDocumentValidation';
import { validateDocument, validateCEP, validateEmail, validatePhone } from '@/utils/validation';

interface PersonModalProps {
  open: boolean;
  person: any | null;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  onOpenExisting?: (person: any) => void;
}

interface FormData {
  nome: string;
  pessoa_tipo: 'PF' | 'PJ';
  documento: string;
  rg?: string;
  ie?: string;
  email?: string;
  observacoes?: string;
  is_active: boolean;
  papeis: string[];
  dados_cliente?: {
    limite_credito?: number;
    prazo_pagamento?: number;
    observacoes_comerciais?: string;
  };
  dados_funcionario?: {
    cargo?: string;
    salario?: number;
    data_admissao?: string;
    pis?: string;
    ctps?: string;
    departamento?: string;
  };
  dados_fornecedor?: {
    prazo_entrega?: number;
    condicoes_pagamento?: string;
    observacoes_comerciais?: string;
  };
  telefones?: any[];
  enderecos?: any[];
}

const PAPEIS_DISPONIVEIS = [
  { value: 'CLIENTE', label: 'Cliente' },
  { value: 'FORNECEDOR', label: 'Fornecedor' },
  { value: 'FUNCIONARIO', label: 'Funcionário' },
];

export const PersonModal: React.FC<PersonModalProps> = ({
  open,
  person,
  onClose,
  onSubmit,
  onOpenExisting,
}) => {
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    pessoa_tipo: 'PF',
    documento: '',
    is_active: true,
    papeis: ['CLIENTE'],
    telefones: [],
    enderecos: [],
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState(0);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [existingContact, setExistingContact] = useState<any>(null);
  const [duplicateDocument, setDuplicateDocument] = useState('');

  // Validação de documento em tempo real
  const documentValidation = useDocumentValidation(
    formData.documento, 
    formData.pessoa_tipo,
    person?.id // Excluir próprio ID durante edição
  );


  // Abrir modal automaticamente quando documento duplicado for detectado
  useEffect(() => {
    // Só abrir modal se:
    // - Documento tem conteúdo válido (não é inicialização)
    // - Modal não está aberto
    // - Detectou duplicação
    // - Documento é diferente do documento original (para edição)
    if (formData.documento && 
        formData.documento.length >= 11 && // CPF/CNPJ completo
        documentValidation.isExisting && 
        documentValidation.existingContact && 
        !duplicateDialogOpen &&
        // Para novos cadastros OU edição com documento diferente do original
        (!person || (person && person.documento !== formData.documento))) {
      
      setExistingContact(documentValidation.existingContact);
      setDuplicateDocument(formData.documento);
      setDuplicateDialogOpen(true);
    }
  }, [person, documentValidation.isExisting, documentValidation.existingContact, duplicateDialogOpen, formData.documento]);

  useEffect(() => {
    // Limpar estados de duplicação sempre que abrir o modal
    setDuplicateDialogOpen(false);
    setExistingContact(null);
    setDuplicateDocument('');
    setActiveTab(0); // Reset tab to first when modal opens
    
    if (person) {
      setFormData({
        nome: person.nome || '',
        pessoa_tipo: person.pessoa_tipo || 'PF',
        documento: person.documento || '',
        rg: person.rg || '',
        ie: person.ie || '',
        email: person.email || '',
        observacoes: person.observacoes || '',
        is_active: person.is_active !== undefined ? person.is_active : true,
        papeis: person.papeis || ['CLIENTE'],
        telefones: person.telefones || [],
        enderecos: person.enderecos || [],
        dados_cliente: person.dados_cliente || undefined,
        dados_funcionario: person.dados_funcionario || undefined,
        dados_fornecedor: person.dados_fornecedor || undefined,
      });
    } else {
      setFormData({
        nome: '',
        pessoa_tipo: 'PF',
        documento: '',
        is_active: true,
        papeis: ['CLIENTE'],
        telefones: [],
        enderecos: [],
        dados_cliente: undefined,
        dados_funcionario: undefined,
        dados_fornecedor: undefined,
      });
    }
  }, [person, open]); // Adicionar 'open' como dependência

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePapelToggle = (papel: string) => {
    const isRemoving = formData.papeis.includes(papel);
    const newPapeis = isRemoving
      ? formData.papeis.filter(p => p !== papel)
      : [...formData.papeis, papel];
    
    // Pelo menos um papel deve estar selecionado
    if (newPapeis.length === 0) {
      return;
    }

    // Inicializar dados específicos quando papel é selecionado pela primeira vez
    const updatedFormData = { ...formData, papeis: newPapeis };
    
    if (!isRemoving) {
      // Adicionando papel - inicializar dados se não existirem
      if (papel === 'CLIENTE' && !formData.dados_cliente) {
        updatedFormData.dados_cliente = {
          limite_credito: 0,
          prazo_pagamento: 30,
          observacoes_comerciais: ''
        };
      } else if (papel === 'FUNCIONARIO' && !formData.dados_funcionario) {
        updatedFormData.dados_funcionario = {
          cargo: '',
          salario: 0,
          data_admissao: '',
          pis: '',
          ctps: '',
          departamento: ''
        };
      } else if (papel === 'FORNECEDOR' && !formData.dados_fornecedor) {
        updatedFormData.dados_fornecedor = {
          prazo_entrega: 0,
          condicoes_pagamento: '',
          observacoes_comerciais: ''
        };
      }
    } else {
      // Removendo papel - limpar dados específicos
      if (papel === 'CLIENTE') {
        updatedFormData.dados_cliente = undefined;
      } else if (papel === 'FUNCIONARIO') {
        updatedFormData.dados_funcionario = undefined;
      } else if (papel === 'FORNECEDOR') {
        updatedFormData.dados_fornecedor = undefined;
      }
    }
    
    setFormData(updatedFormData);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome?.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.documento?.trim()) {
      newErrors.documento = 'Documento é obrigatório';
    } else if (!validateDocument(formData.documento, formData.pessoa_tipo)) {
      newErrors.documento = formData.pessoa_tipo === 'PF' ? 'CPF inválido' : 'CNPJ inválido';
    } else if (documentValidation.isExisting && (!person || person.documento !== formData.documento)) {
      newErrors.documento = 'Documento já cadastrado';
    }

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (formData.papeis.length === 0) {
      newErrors.papeis = 'Pelo menos um papel deve ser selecionado';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Não permitir submit se documento já existe E não é o mesmo documento da edição
    if (documentValidation.isExisting && (!person || person.documento !== formData.documento)) {
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit(formData);
      handleClose();
    } catch (error: any) {
      console.error('Erro ao salvar pessoa:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExisting = (contact: any) => {
    // Limpar estados do modal de duplicação
    setDuplicateDialogOpen(false);
    setExistingContact(null);
    setDuplicateDocument('');
    
    // Chamar callback imediatamente se disponível
    if (onOpenExisting) {
      onOpenExisting(contact);
    }
    
    // Fechar este modal após o callback
    setTimeout(() => {
      onClose();
    }, 100);
  };

  const handleClose = () => {
    // Limpar todos os estados incluindo os do modal de duplicação
    setFormData({
      nome: '',
      pessoa_tipo: 'PF',
      documento: '',
      is_active: true,
      papeis: ['CLIENTE'],
      telefones: [],
      enderecos: [],
    });
    setErrors({});
    setActiveTab(0);
    setDuplicateDialogOpen(false);
    setExistingContact(null);
    setDuplicateDocument('');
    onClose();
  };

  const formatDocument = (value: string, type: 'PF' | 'PJ') => {
    const cleanValue = value.replace(/\D/g, '');
    
    if (type === 'PF') {
      return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      return cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {person ? 'Editar Contato' : 'Novo Contato'}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, value) => setActiveTab(value)} 
            variant="fullWidth"
            sx={{ mb: 0 }}
          >
            <Tab label="Dados Básicos" />
            <Tab label="Papéis e Dados Específicos" />
            <Tab label={`Telefones (${formData.telefones?.length || 0})`} />
            <Tab label={`Endereços (${formData.enderecos?.length || 0})`} />
          </Tabs>
        </Box>

        {activeTab === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth error={!!errors.pessoa_tipo}>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={formData.pessoa_tipo}
                  onChange={(e) => handleChange('pessoa_tipo', e.target.value)}
                  label="Tipo"
                >
                  <MenuItem value="PF">Pessoa Física</MenuItem>
                  <MenuItem value="PJ">Pessoa Jurídica</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                label={formData.pessoa_tipo === 'PF' ? 'Nome Completo' : 'Razão Social'}
                value={formData.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                error={!!errors.nome}
                helperText={errors.nome}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={formData.pessoa_tipo === 'PF' ? 'CPF' : 'CNPJ'}
                value={formatDocument(formData.documento, formData.pessoa_tipo)}
                onChange={(e) => handleChange('documento', e.target.value.replace(/\D/g, ''))}
                error={!!errors.documento || !!documentValidation.error}
                helperText={
                  errors.documento || 
                  (documentValidation.isExisting ? 
                    `Documento já cadastrado para: ${documentValidation.existingContact?.nome || ''}` : 
                    documentValidation.error || 
                    (documentValidation.isValid && !documentValidation.isExisting ? 'Documento disponível' : '')
                  )
                }
                required
                InputProps={{
                  endAdornment: formData.documento && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {documentValidation.isLoading && (
                        <HourglassEmpty color="action" />
                      )}
                      {!documentValidation.isLoading && documentValidation.isValid && !documentValidation.isExisting && (
                        <CheckCircle color="success" />
                      )}
                      {!documentValidation.isLoading && documentValidation.isExisting && (
                        <Error color="error" />
                      )}
                      {!documentValidation.isLoading && documentValidation.error && !documentValidation.isExisting && (
                        <Error color="error" />
                      )}
                    </Box>
                  )
                }}
              />
            </Grid>

            {formData.pessoa_tipo === 'PF' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="RG"
                  value={formData.rg || ''}
                  onChange={(e) => handleChange('rg', e.target.value)}
                  placeholder="Ex: 12.345.678-9"
                />
              </Grid>
            )}

            {formData.pessoa_tipo === 'PJ' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Inscrição Estadual"
                  value={formData.ie || ''}
                  onChange={(e) => handleChange('ie', e.target.value)}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={3}
                value={formData.observacoes || ''}
                onChange={(e) => handleChange('observacoes', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => handleChange('is_active', e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>
                      Status do Contato
                    </Typography>
                    <Chip
                      label={formData.is_active ? 'Ativo' : 'Inativo'}
                      size="small"
                      color={formData.is_active ? 'success' : 'error'}
                    />
                  </Box>
                }
              />
            </Grid>
          </Grid>
        )}

        {activeTab === 1 && (
          <Box>
            {/* Seção de Seleção de Papéis */}
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  👥 Papéis da Pessoa
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Selecione um ou mais papéis que esta pessoa desempenhará no sistema
              </Typography>
              
              <Grid container spacing={2}>
                {PAPEIS_DISPONIVEIS.map((papel) => (
                  <Grid item xs={12} sm={4} key={papel.value}>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        cursor: 'pointer',
                        border: 2,
                        borderColor: formData.papeis.includes(papel.value) ? 'primary.main' : 'grey.300',
                        bgcolor: formData.papeis.includes(papel.value) ? 'primary.50' : 'background.paper',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          transform: 'translateY(-1px)',
                          boxShadow: 2
                        }
                      }}
                      onClick={() => handlePapelToggle(papel.value)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Checkbox
                          checked={formData.papeis.includes(papel.value)}
                          onChange={() => handlePapelToggle(papel.value)}
                          color="primary"
                        />
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {papel.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {papel.value === 'CLIENTE' && 'Compra produtos/serviços'}
                            {papel.value === 'FORNECEDOR' && 'Fornece produtos/serviços'}
                            {papel.value === 'FUNCIONARIO' && 'Trabalha na empresa'}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              
              {errors.papeis && (
                <Typography color="error" variant="caption" display="block" sx={{ mt: 1 }}>
                  {errors.papeis}
                </Typography>
              )}
            </Paper>

            {formData.papeis.includes('CLIENTE') && (
              <Paper sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'success.300' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: '50%', 
                    bgcolor: 'success.100', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    mr: 2
                  }}>
                    💳
                  </Box>
                  <Box>
                    <Typography variant="h6" color="success.main">
                      Dados do Cliente
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Informações comerciais e de crédito
                    </Typography>
                  </Box>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Limite de Crédito"
                      type="number"
                      value={formData.dados_cliente?.limite_credito || ''}
                      onChange={(e) => handleChange('dados_cliente', {
                        ...formData.dados_cliente,
                        limite_credito: parseFloat(e.target.value) || 0
                      })}
                      InputProps={{ 
                        startAdornment: <Box sx={{ mr: 1, color: 'success.main', fontWeight: 'bold' }}>R$</Box> 
                      }}
                      helperText="Valor máximo de crédito autorizado"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Prazo de Pagamento"
                      type="number"
                      value={formData.dados_cliente?.prazo_pagamento || 30}
                      onChange={(e) => handleChange('dados_cliente', {
                        ...formData.dados_cliente,
                        prazo_pagamento: parseInt(e.target.value) || 30
                      })}
                      InputProps={{ 
                        endAdornment: <Box sx={{ ml: 1, color: 'text.secondary' }}>dias</Box> 
                      }}
                      helperText="Prazo padrão para pagamento"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Observações Comerciais"
                      multiline
                      rows={3}
                      value={formData.dados_cliente?.observacoes_comerciais || ''}
                      onChange={(e) => handleChange('dados_cliente', {
                        ...formData.dados_cliente,
                        observacoes_comerciais: e.target.value
                      })}
                      placeholder="Informações adicionais sobre o relacionamento comercial..."
                      helperText="Notas importantes sobre condições especiais, histórico, etc."
                    />
                  </Grid>
                </Grid>
              </Paper>
            )}

            {formData.papeis.includes('FORNECEDOR') && (
              <Paper sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'warning.300' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: '50%', 
                    bgcolor: 'warning.100', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    mr: 2
                  }}>
                    🏭
                  </Box>
                  <Box>
                    <Typography variant="h6" color="warning.main">
                      Dados do Fornecedor
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Informações de fornecimento e logística
                    </Typography>
                  </Box>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Prazo de Entrega"
                      type="number"
                      value={formData.dados_fornecedor?.prazo_entrega || ''}
                      onChange={(e) => handleChange('dados_fornecedor', {
                        ...formData.dados_fornecedor,
                        prazo_entrega: parseInt(e.target.value) || 0
                      })}
                      InputProps={{ 
                        endAdornment: <Box sx={{ ml: 1, color: 'text.secondary' }}>dias</Box> 
                      }}
                      helperText="Tempo médio para entrega dos produtos"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Condições de Pagamento"
                      value={formData.dados_fornecedor?.condicoes_pagamento || ''}
                      onChange={(e) => handleChange('dados_fornecedor', {
                        ...formData.dados_fornecedor,
                        condicoes_pagamento: e.target.value
                      })}
                      placeholder="Ex: 30 dias, À vista, Parcelado..."
                      helperText="Como preferem receber o pagamento"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Observações Comerciais"
                      multiline
                      rows={3}
                      value={formData.dados_fornecedor?.observacoes_comerciais || ''}
                      onChange={(e) => handleChange('dados_fornecedor', {
                        ...formData.dados_fornecedor,
                        observacoes_comerciais: e.target.value
                      })}
                      placeholder="Informações sobre produtos, qualidade, parcerias..."
                      helperText="Detalhes importantes sobre a relação comercial"
                    />
                  </Grid>
                </Grid>
              </Paper>
            )}

            {formData.papeis.includes('FUNCIONARIO') && (
              <Paper sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'info.300' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: '50%', 
                    bgcolor: 'info.100', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    mr: 2
                  }}>
                    👨‍💼
                  </Box>
                  <Box>
                    <Typography variant="h6" color="info.main">
                      Dados do Funcionário
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Informações trabalhistas e profissionais
                    </Typography>
                  </Box>
                </Box>
                
                <Grid container spacing={3}>
                  {/* Linha 1: Cargo e Departamento */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Cargo"
                      value={formData.dados_funcionario?.cargo || ''}
                      onChange={(e) => handleChange('dados_funcionario', {
                        ...formData.dados_funcionario,
                        cargo: e.target.value
                      })}
                      placeholder="Ex: Desenvolvedor, Gerente, Analista..."
                      helperText="Função exercida na empresa"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Departamento"
                      value={formData.dados_funcionario?.departamento || ''}
                      onChange={(e) => handleChange('dados_funcionario', {
                        ...formData.dados_funcionario,
                        departamento: e.target.value
                      })}
                      placeholder="Ex: TI, RH, Vendas, Financeiro..."
                      helperText="Setor ou área de trabalho"
                    />
                  </Grid>
                  
                  {/* Linha 2: Salário e Data de Admissão */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Salário"
                      type="number"
                      value={formData.dados_funcionario?.salario || ''}
                      onChange={(e) => handleChange('dados_funcionario', {
                        ...formData.dados_funcionario,
                        salario: parseFloat(e.target.value) || 0
                      })}
                      InputProps={{ 
                        startAdornment: <Box sx={{ mr: 1, color: 'info.main', fontWeight: 'bold' }}>R$</Box> 
                      }}
                      helperText="Salário mensal bruto"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Data de Admissão"
                      type="date"
                      value={formData.dados_funcionario?.data_admissao || ''}
                      onChange={(e) => handleChange('dados_funcionario', {
                        ...formData.dados_funcionario,
                        data_admissao: e.target.value
                      })}
                      InputLabelProps={{ shrink: true }}
                      helperText="Data de início na empresa"
                    />
                  </Grid>
                  
                  {/* Linha 3: PIS e CTPS */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="PIS"
                      value={formData.dados_funcionario?.pis || ''}
                      onChange={(e) => handleChange('dados_funcionario', {
                        ...formData.dados_funcionario,
                        pis: e.target.value.replace(/\D/g, '').slice(0, 11)
                      })}
                      placeholder="12345678901"
                      helperText="Programa de Integração Social (11 dígitos)"
                      inputProps={{ maxLength: 11 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="CTPS"
                      value={formData.dados_funcionario?.ctps || ''}
                      onChange={(e) => handleChange('dados_funcionario', {
                        ...formData.dados_funcionario,
                        ctps: e.target.value
                      })}
                      placeholder="Ex: 1234567-89/0001"
                      helperText="Carteira de Trabalho e Previdência Social"
                    />
                  </Grid>
                </Grid>
              </Paper>
            )}
            
            {/* Mensagem quando nenhum papel tem dados específicos */}
            {formData.papeis.length > 0 && 
             !formData.papeis.some(p => ['CLIENTE', 'FUNCIONARIO', 'FORNECEDOR'].includes(p)) && (
              <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  📋 Dados Específicos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selecione um papel (Cliente, Funcionário ou Fornecedor) para configurar dados específicos.
                </Typography>
              </Paper>
            )}
          </Box>
        )}

        {activeTab === 2 && (
          <Box>
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                📞 Seção de Telefones - Adicione e gerencie os telefones de contato
              </Typography>
            </Box>
            <PhoneManager
              phones={formData.telefones || []}
              onChange={(telefones) => handleChange('telefones', telefones)}
            />
          </Box>
        )}

        {activeTab === 3 && (
          <Box>
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                🏠 Seção de Endereços - Adicione e gerencie os endereços de entrega e cobrança
              </Typography>
            </Box>
            <AddressManager
              addresses={formData.enderecos || []}
              onChange={(enderecos) => handleChange('enderecos', enderecos)}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>

      <DuplicateDocumentDialog
        open={duplicateDialogOpen}
        document={duplicateDocument}
        existingContact={existingContact}
        onClose={() => {
          setDuplicateDialogOpen(false);
          setExistingContact(null);
          setDuplicateDocument('');
        }}
        onOpenExisting={handleOpenExisting}
      />
    </Dialog>
  );
};