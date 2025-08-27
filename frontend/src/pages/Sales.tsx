import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import { Add, ShoppingCart, Receipt, Payment, QrCodeScanner, List } from '@mui/icons-material';
import { NFEModal } from '@/components/nfe/NFEModal';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { ImprovedFastSaleInterface } from '@/components/sales/ImprovedFastSaleInterface';
import { CompleteSaleInterface } from '@/components/sales/CompleteSaleInterface';
import { RecentSales } from '@/components/sales/RecentSales';

export const Sales: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [showNFEModal, setShowNFEModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const fastSaleRef = useRef<any>(null);
  const [savedCartState, setSavedCartState] = useState<any>(null);


  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Salvar estado do carrinho ao sair da aba de venda rápida
    if (currentTab === 0 && fastSaleRef.current) {
      const cartState = fastSaleRef.current.getCartState();
      setSavedCartState(cartState);
    }
    
    setCurrentTab(newValue);
  };

  // Restaurar estado do carrinho ao voltar para venda rápida
  React.useEffect(() => {
    if (currentTab === 0 && fastSaleRef.current && savedCartState) {
      fastSaleRef.current.setCartState(savedCartState);
    }
  }, [currentTab, savedCartState]);

  return (
    <Box>
      {/* Tabs compactas no topo */}
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'divider', 
        mb: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          sx={{ minHeight: 48 }}
        >
          <Tab 
            icon={<QrCodeScanner />} 
            label="PDV" 
            iconPosition="start"
            sx={{ minHeight: 48 }}
          />
          <Tab 
            icon={<List />} 
            label="Completa" 
            iconPosition="start"
            sx={{ minHeight: 48 }}
          />
          <Tab 
            icon={<Receipt />} 
            label="Recentes" 
            iconPosition="start"
            sx={{ minHeight: 48 }}
          />
        </Tabs>
      </Box>

      {/* Conteúdo das Tabs */}
      {currentTab === 0 && (
        <ImprovedFastSaleInterface ref={fastSaleRef} />
      )}
      
      {currentTab === 1 && (
        <CompleteSaleInterface />
      )}


      {currentTab === 2 && <RecentSales />}


      {/* Modal de NF-e */}
      <NFEModal
        open={showNFEModal}
        onClose={() => setShowNFEModal(false)}
        saleOrderId="demo-order-id"
        customerData={{
          name: "Cliente Demonstração",
          document: "123.456.789-00",
          address: {
            street: "Rua Demo, 123",
            city: "São Paulo",
            state: "SP",
            zipcode: "01234-567"
          }
        }}
      />

      {/* Modal de Pagamentos */}
      <PaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={1000.00}
        customerData={{
          name: "Cliente Demonstração",
          document: "123.456.789-00"
        }}
        onPaymentSuccess={(data) => {
          console.log('Pagamento aprovado:', data);
          setShowPaymentModal(false);
        }}
      />
    </Box>
  );
};