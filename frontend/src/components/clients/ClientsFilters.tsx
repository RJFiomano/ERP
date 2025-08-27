import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Paper,
  Collapse,
  IconButton,
  Typography,
} from '@mui/material';
import { Search, Clear, FilterList, ExpandMore, ExpandLess } from '@mui/icons-material';
import { PersonType } from '@/types/client';

export interface ClientFilters {
  search: string;
  personType: PersonType | '';
  status: 'active' | 'inactive' | 'all';
}

interface ClientsFiltersProps {
  filters: ClientFilters;
  onFiltersChange: (filters: ClientFilters) => void;
  onSearch: (customFilters?: ClientFilters) => void;
  loading?: boolean;
}

export const ClientsFilters: React.FC<ClientsFiltersProps> = ({
  filters,
  onFiltersChange,
  onSearch,
  loading = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<ClientFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof ClientFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
    // Aplicar filtros automaticamente para dropdowns
    if (key !== 'search') {
      onSearch(newFilters);
    }
  };

  const handleClear = () => {
    const clearedFilters: ClientFilters = {
      search: '',
      personType: '',
      status: 'active', // Padrão para mostrar apenas ativos
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    onSearch(clearedFilters);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSearch();
    }
  };

  const hasFilters = localFilters.search || localFilters.personType || localFilters.status !== 'active';

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={expanded ? 2 : 0}>
        <Box display="flex" alignItems="center" gap={2} flex={1} mr={4}>
          <TextField
            placeholder="Buscar por nome, documento ou email..."
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            onKeyPress={handleKeyPress}
            size="small"
            sx={{ minWidth: 300, flex: 1 }}
            InputProps={{
              startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />,
            }}
          />
          <Button
            variant="contained"
            onClick={() => onSearch()}
            disabled={loading}
            startIcon={<Search />}
          >
            Buscar
          </Button>
          {hasFilters && (
            <Button
              variant="outlined"
              onClick={handleClear}
              startIcon={<Clear />}
              color="secondary"
            >
              Limpar
            </Button>
          )}
        </Box>
        
        <Box display="flex" alignItems="center">
          <Typography variant="body2" color="text.secondary" mr={1}>
            Filtros
          </Typography>
          <IconButton
            onClick={() => setExpanded(!expanded)}
            size="small"
          >
            <FilterList />
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de Pessoa</InputLabel>
              <Select
                value={localFilters.personType}
                onChange={(e) => handleFilterChange('personType', e.target.value)}
                label="Tipo de Pessoa"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value={PersonType.PF}>Pessoa Física</MenuItem>
                <MenuItem value={PersonType.PJ}>Pessoa Jurídica</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={localFilters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                label="Status"
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="active">Apenas Ativos</MenuItem>
                <MenuItem value="inactive">Apenas Inativos</MenuItem>
              </Select>
            </FormControl>
          </Grid>

        </Grid>
      </Collapse>
    </Paper>
  );
};