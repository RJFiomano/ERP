import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { 
  Settings as SettingsIcon, 
  Business,
  Security,
  Notifications,
  Api 
} from '@mui/icons-material';

export const Settings: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Configurações
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Business sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">
                  Dados da Empresa
                </Typography>
              </Box>
              <Typography color="textSecondary">
                Configurações da empresa:
              </Typography>
              <Box component="ul" mt={2}>
                <li>Razão social e nome fantasia</li>
                <li>CNPJ e Inscrição Estadual</li>
                <li>Endereço completo</li>
                <li>Logotipo e cores da marca</li>
                <li>Certificado digital A1/A3</li>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Security sx={{ mr: 2, color: 'error.main' }} />
                <Typography variant="h6">
                  Segurança
                </Typography>
              </Box>
              <Typography color="textSecondary">
                Configurações de segurança:
              </Typography>
              <Box component="ul" mt={2}>
                <li>Gerenciamento de usuários</li>
                <li>Perfis e permissões (RBAC)</li>
                <li>Log de auditoria</li>
                <li>Política de senhas</li>
                <li>Autenticação 2FA</li>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Api sx={{ mr: 2, color: 'info.main' }} />
                <Typography variant="h6">
                  Integrações
                </Typography>
              </Box>
              <Typography color="textSecondary">
                Integrações externas:
              </Typography>
              <Box component="ul" mt={2}>
                <li>API NF-e (SEFAZ SP)</li>
                <li>Gateway de pagamentos</li>
                <li>Serviços de email (SMTP)</li>
                <li>API de CEP</li>
                <li>Bancos (OFX/API)</li>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Notifications sx={{ mr: 2, color: 'warning.main' }} />
                <Typography variant="h6">
                  Notificações
                </Typography>
              </Box>
              <Typography color="textSecondary">
                Configurações de notificações:
              </Typography>
              <Box component="ul" mt={2}>
                <li>Alertas de estoque baixo</li>
                <li>Vencimento de contas</li>
                <li>Novos pedidos</li>
                <li>Backup automático</li>
                <li>Relatórios periódicos</li>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <SettingsIcon sx={{ mr: 2, color: 'success.main' }} />
                <Typography variant="h6">
                  Configurações Fiscais
                </Typography>
              </Box>
              <Typography color="textSecondary">
                Parâmetros fiscais específicos:
              </Typography>
              <Box component="ul" mt={2}>
                <li>Regime tributário (Simples, Lucro Real, etc.)</li>
                <li>Alíquotas padrão de impostos</li>
                <li>CST/CSOSN por produto</li>
                <li>Configurações de CFOP</li>
                <li>Séries de numeração de NF-e</li>
                <li>Ambiente (Homologação/Produção)</li>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};