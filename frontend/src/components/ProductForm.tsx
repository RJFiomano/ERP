import React, { useState } from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  InputAdornment,
  Box,
  Button,
  Collapse,
} from '@mui/material';
import {
  Calculate,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { CreateProductRequest, Category, PriceCalculationRequest } from '@/types/product';
import { productsAPI } from '@/services/api';

interface ProductFormProps {
  formData: CreateProductRequest;
  setFormData: (data: CreateProductRequest | ((prev: CreateProductRequest) => CreateProductRequest)) => void;
  formErrors: Partial<CreateProductRequest>;
  categories: Category[];
}

export const ProductForm: React.FC<ProductFormProps> = ({
  formData,
  setFormData,
  formErrors,
  categories
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const handleCalculatePrice = async () => {
    if (!formData.cost_price || formData.cost_price <= 0) {
      alert('Preço de custo deve ser maior que zero');
      return;
    }

    try {
      setCalculating(true);
      const request: PriceCalculationRequest = {
        cost_price: formData.cost_price,
        margin_type: formData.margin_type || 'manual',
        margin_percentage: formData.margin_percentage,
        category_id: formData.category_id,
      };

      const result = await productsAPI.calculatePrice(request);
      
      setFormData(prev => ({
        ...prev,
        sale_price: result.sale_price,
        margin_percentage: result.margin_percentage,
      }));
    } catch (error) {
      console.error('Erro ao calcular preço:', error);
      alert('Erro ao calcular preço');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <Grid container spacing={2}>
      {/* Informações Básicas */}
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ mb: 1 }}>Informações Básicas</Typography>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="SKU"
          value={formData.sku}
          onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
          error={!!formErrors.sku}
          helperText={formErrors.sku}
          required
          size="small"
        />
      </Grid>
      <Grid item xs={12} md={8}>
        <TextField
          fullWidth
          label="Nome"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          error={!!formErrors.name}
          helperText={formErrors.name}
          required
          size="small"
        />
      </Grid>
      <Grid item xs={12} md={8}>
        <TextField
          fullWidth
          label="Descrição"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          multiline
          rows={2}
          size="small"
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <FormControl fullWidth size="small">
          <InputLabel>Categoria</InputLabel>
          <Select
            value={formData.category_id || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
            label="Categoria"
          >
            <MenuItem value="">
              <em>Nenhuma</em>
            </MenuItem>
            {categories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
                {category.default_margin_percentage && (
                  <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                    (Margem: {category.default_margin_percentage}%)
                  </Typography>
                )}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {/* Preços e Margem - Layout Compacto */}
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ mt: 1, mb: 1 }}>Preços e Margem</Typography>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <TextField
          fullWidth
          label="Preço de Custo"
          type="number"
          value={formData.cost_price}
          onChange={(e) => setFormData(prev => ({ ...prev, cost_price: parseFloat(e.target.value) || 0 }))}
          size="small"
          InputProps={{
            startAdornment: <InputAdornment position="start">R$</InputAdornment>,
          }}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <TextField
          fullWidth
          label="Preço de Venda"
          type="number"
          value={formData.sale_price}
          onChange={(e) => setFormData(prev => ({ ...prev, sale_price: parseFloat(e.target.value) || 0 }))}
          error={!!formErrors.sale_price}
          helperText={formErrors.sale_price}
          required
          size="small"
          InputProps={{
            startAdornment: <InputAdornment position="start">R$</InputAdornment>,
          }}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>Tipo de Margem</InputLabel>
          <Select
            value={formData.margin_type || 'manual'}
            onChange={(e) => setFormData(prev => ({ ...prev, margin_type: e.target.value as any }))}
            label="Tipo de Margem"
          >
            <MenuItem value="manual">Manual</MenuItem>
            <MenuItem value="percentage">Percentual</MenuItem>
            <MenuItem value="category">Por Categoria</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      {formData.margin_type === 'percentage' && (
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="Margem (%)"
            type="number"
            value={formData.margin_percentage || 0}
            onChange={(e) => setFormData(prev => ({ ...prev, margin_percentage: parseFloat(e.target.value) || 0 }))}
            size="small"
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            }}
          />
        </Grid>
      )}
      
      {(formData.margin_type === 'percentage' || formData.margin_type === 'category') && (
        <Grid item xs={12} md={formData.margin_type === 'percentage' ? 12 : 3}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Calculate />}
            onClick={handleCalculatePrice}
            disabled={calculating || !formData.cost_price}
            size="small"
            sx={{ height: '40px' }}
          >
            {calculating ? 'Calculando...' : 'Calcular Preço'}
          </Button>
        </Grid>
      )}

      {/* Estoque - Layout Compacto */}
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ mt: 1, mb: 1 }}>Estoque</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Quantidade em Estoque"
          type="number"
          value={formData.stock_quantity}
          onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))}
          size="small"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Estoque Mínimo"
          type="number"
          value={formData.min_stock}
          onChange={(e) => setFormData(prev => ({ ...prev, min_stock: parseInt(e.target.value) || 0 }))}
          size="small"
        />
      </Grid>

      {/* Campos para NF-e (Avançado) */}
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 0 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Campos para NF-e (São Paulo)
          </Typography>
          <Button
            endIcon={showAdvanced ? <ExpandLess /> : <ExpandMore />}
            onClick={() => setShowAdvanced(!showAdvanced)}
            size="small"
          >
            {showAdvanced ? 'Ocultar' : 'Mostrar'}
          </Button>
        </Box>
      </Grid>

      <Collapse in={showAdvanced} timeout="auto" unmountOnExit>
        <Grid container spacing={2} sx={{ pl: 3, pr: 3 }}>
          {/* Fiscal Básico */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 0.5, fontWeight: 'medium' }}>
              Informações Fiscais Básicas
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="NCM"
              value={formData.ncm}
              onChange={(e) => setFormData(prev => ({ ...prev, ncm: e.target.value }))}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="CFOP"
              value={formData.cfop}
              onChange={(e) => setFormData(prev => ({ ...prev, cfop: e.target.value }))}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="CST"
              value={formData.cst}
              onChange={(e) => setFormData(prev => ({ ...prev, cst: e.target.value }))}
              size="small"
            />
          </Grid>

          {/* Identificação do Produto */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 0.5, fontWeight: 'medium' }}>
              Identificação do Produto
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="EAN/GTIN"
              value={formData.ean_gtin}
              onChange={(e) => setFormData(prev => ({ ...prev, ean_gtin: e.target.value }))}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Unidade</InputLabel>
              <Select
                value={formData.unit || 'UN'}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                label="Unidade"
              >
                <MenuItem value="UN">UN - Unidade</MenuItem>
                <MenuItem value="KG">KG - Quilograma</MenuItem>
                <MenuItem value="L">L - Litro</MenuItem>
                <MenuItem value="M">M - Metro</MenuItem>
                <MenuItem value="M2">M² - Metro Quadrado</MenuItem>
                <MenuItem value="M3">M³ - Metro Cúbico</MenuItem>
                <MenuItem value="CX">CX - Caixa</MenuItem>
                <MenuItem value="PC">PC - Peça</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Origem</InputLabel>
              <Select
                value={formData.origin || '0'}
                onChange={(e) => setFormData(prev => ({ ...prev, origin: e.target.value }))}
                label="Origem"
              >
                <MenuItem value="0">0 - Nacional</MenuItem>
                <MenuItem value="1">1 - Estrangeira - Importação direta</MenuItem>
                <MenuItem value="2">2 - Estrangeira - Adquirida no mercado interno</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* ICMS Detalhado */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 0.5, fontWeight: 'medium' }}>
              ICMS Detalhado
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="CST ICMS"
              value={formData.icms_cst}
              onChange={(e) => setFormData(prev => ({ ...prev, icms_cst: e.target.value }))}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Base de Cálculo ICMS"
              type="number"
              value={formData.icms_base_calc}
              onChange={(e) => setFormData(prev => ({ ...prev, icms_base_calc: parseFloat(e.target.value) || 0 }))}
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Redução Base ICMS (%)"
              type="number"
              value={formData.icms_reduction}
              onChange={(e) => setFormData(prev => ({ ...prev, icms_reduction: parseFloat(e.target.value) || 0 }))}
              size="small"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />
          </Grid>

          {/* IPI */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 0.5, fontWeight: 'medium' }}>
              IPI
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="CST IPI"
              value={formData.ipi_cst}
              onChange={(e) => setFormData(prev => ({ ...prev, ipi_cst: e.target.value }))}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Alíquota IPI (%)"
              type="number"
              value={formData.ipi_rate}
              onChange={(e) => setFormData(prev => ({ ...prev, ipi_rate: parseFloat(e.target.value) || 0 }))}
              size="small"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />
          </Grid>

          {/* PIS/COFINS Detalhado */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 0.5, fontWeight: 'medium' }}>
              PIS/COFINS Detalhado
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="CST PIS"
              value={formData.pis_cst}
              onChange={(e) => setFormData(prev => ({ ...prev, pis_cst: e.target.value }))}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="CST COFINS"
              value={formData.cofins_cst}
              onChange={(e) => setFormData(prev => ({ ...prev, cofins_cst: e.target.value }))}
              size="small"
            />
          </Grid>

          {/* Impostos (Compatibilidade) */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 0.5, fontWeight: 'medium' }}>
              Impostos (Compatibilidade)
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="ICMS (%)"
              type="number"
              value={formData.icms_rate}
              onChange={(e) => setFormData(prev => ({ ...prev, icms_rate: parseFloat(e.target.value) || 0 }))}
              size="small"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="PIS (%)"
              type="number"
              value={formData.pis_rate}
              onChange={(e) => setFormData(prev => ({ ...prev, pis_rate: parseFloat(e.target.value) || 0 }))}
              size="small"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="COFINS (%)"
              type="number"
              value={formData.cofins_rate}
              onChange={(e) => setFormData(prev => ({ ...prev, cofins_rate: parseFloat(e.target.value) || 0 }))}
              size="small"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />
          </Grid>
        </Grid>
      </Collapse>
    </Grid>
  );
};