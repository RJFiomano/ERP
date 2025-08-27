import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper,
  InputAdornment,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Button,
} from '@mui/material';
import { 
  Search, 
  QrCodeScanner, 
  Inventory,
  ShoppingCart,
} from '@mui/icons-material';
import { productsAPI } from '@/services/api';

// Cache global persistente para todos os componentes de busca
class GlobalProductCache {
  private static instance: GlobalProductCache;
  private cache = new Map<string, Product[]>();
  private popularProducts: Product[] = [];
  private isWarmedUp = false;
  private warmupPromise: Promise<void> | null = null;

  static getInstance(): GlobalProductCache {
    if (!GlobalProductCache.instance) {
      GlobalProductCache.instance = new GlobalProductCache();
    }
    return GlobalProductCache.instance;
  }

  async warmUp(): Promise<void> {
    if (this.isWarmedUp || this.warmupPromise) {
      return this.warmupPromise || Promise.resolve();
    }

    this.warmupPromise = this.performWarmup();
    return this.warmupPromise;
  }

  private async performWarmup(): Promise<void> {
    try {
      const popularResults = await productsAPI.searchProducts('');
      if (Array.isArray(popularResults) && popularResults.length > 0) {
        this.popularProducts = popularResults.slice(0, 30).map(product => ({
          id: product.id || '',
          name: product.name || 'Produto sem nome',
          barcode: product.barcode || '',
          price: Number(product.sale_price || product.price || 0),
          stock: Number(product.stock_quantity || 0),
          min_stock: Number(product.min_stock || 0),
          category: product.category?.name || undefined
        }));
        
        this.cache.set('text-', this.popularProducts);
      }
      this.isWarmedUp = true;
    } catch (error) {
      console.log('Cache warm-up failed:', error);
      this.isWarmedUp = true;
    }
  }

  getPopularProducts(): Product[] {
    return this.popularProducts;
  }

  getCachedResults(key: string): Product[] | undefined {
    return this.cache.get(key);
  }

  setCachedResults(key: string, results: Product[]): void {
    this.cache.set(key, results);
  }

  isApiWarmedUp(): boolean {
    return this.isWarmedUp;
  }
}

const globalCache = GlobalProductCache.getInstance();

interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  min_stock?: number;
  category?: string;
  image?: string;
}

interface UnifiedProductSearchProps {
  onProductSelect: (product: Product) => void;
  placeholder?: string;
  maxResults?: number;
  autoFocus?: boolean;
  showPopularOnMount?: boolean;
}

const UnifiedProductSearchComponent = React.forwardRef<HTMLInputElement, UnifiedProductSearchProps>(({
  onProductSelect,
  placeholder = "Código de barras ou nome do produto",
  maxResults = 10,
  autoFocus = true,
  showPopularOnMount = false
}, ref) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<'barcode' | 'text'>('barcode');
  const [scanningState, setScanningState] = useState<'idle' | 'scanning' | 'found' | 'not-found'>('idle');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isMouseInList, setIsMouseInList] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scanTimeoutRef = useRef<number>();
  const listRef = useRef<HTMLDivElement>(null);

  // Warm-up do cache global e carregamento inicial
  useEffect(() => {
    const initializeCache = async () => {
      await globalCache.warmUp();
      
      // Mostrar produtos populares se solicitado
      if (showPopularOnMount) {
        const popularProducts = globalCache.getPopularProducts();
        if (popularProducts.length > 0) {
          setFilteredProducts(popularProducts.slice(0, maxResults));
        }
      }
    };

    initializeCache();
  }, [showPopularOnMount, maxResults]);

  // Auto-focus APENAS quando necessário
  useEffect(() => {
    if (autoFocus) {
      console.log('🚀 Auto-focus inicial apenas');
      
      const focusOnce = () => {
        const currentRef = ref && typeof ref === 'object' ? ref.current : inputRef.current;
        const element = currentRef || document.querySelector('#product-search-input') as HTMLInputElement;
        
        if (element) {
          console.log('🎯 Focando input inicial');
          element.focus();
          setIsFocused(true);
          return true;
        }
        return false;
      };

      // Tentar focar apenas algumas vezes no início
      const initialAttempts = [0, 100, 300];
      const timeoutIds: number[] = [];
      
      initialAttempts.forEach(delay => {
        const id = setTimeout(() => {
          const element = document.querySelector('#product-search-input') as HTMLInputElement;
          if (element && document.activeElement !== element) {
            console.log(`🎯 Tentativa inicial de foco em ${delay}ms`);
            focusOnce();
          }
        }, delay);
        timeoutIds.push(id);
      });
      
      // Cleanup
      return () => {
        timeoutIds.forEach(id => clearTimeout(id));
      };
    }
  }, [autoFocus, ref]); // Removida dependência de isNavigating

  // Foco simples no mount
  useEffect(() => {
    if (autoFocus) {
      console.log('🎯 Componente montado - foco inicial');
      const element = document.querySelector('#product-search-input') as HTMLInputElement;
      if (element) {
        element.focus();
        setIsFocused(true);
      }
    }
  }, []); // Roda apenas no mount

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  // Detectar se entrada é código de barras (só números, 8+ dígitos)
  const isBarcodeFormat = (input: string): boolean => {
    return /^\d{8,}$/.test(input);
  };

  // Buscar produtos na API
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 1) {
      // Mostrar produtos populares quando não há busca
      const popularProducts = globalCache.getPopularProducts();
      if (popularProducts.length > 0) {
        const results = popularProducts.slice(0, maxResults);
        setFilteredProducts(results);
        setSelectedIndex(results.length > 0 ? 0 : -1); // Auto-selecionar primeiro
      } else {
        setFilteredProducts([]);
        setSelectedIndex(-1);
      }
      setIsSearching(false);
      setScanningState('idle');
      return;
    }

    const isBarcode = isBarcodeFormat(searchTerm);
    setSearchMode(isBarcode ? 'barcode' : 'text');
    
    if (isBarcode) {
      setScanningState('scanning');
    }

    setIsSearching(true);

    // Busca local primeiro nos produtos populares (instantânea)
    if (!isBarcode) {
      const popularProducts = globalCache.getPopularProducts();
      if (popularProducts.length > 0) {
        const localResults = popularProducts.filter(product =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.barcode.includes(searchTerm)
        );
        
        if (localResults.length > 0) {
          const results = localResults.slice(0, maxResults);
          setFilteredProducts(results);
          setSelectedIndex(0); // Auto-selecionar primeiro item
          setIsSearching(false);
          setScanningState('idle');
          
          // Para busca de 1 caractere, mostrar só resultados locais (instantâneo)
          if (searchTerm.length === 1) {
            return;
          }
        }
      }
    }

    // Verificar cache global depois
    const cacheKey = `${searchMode}-${searchTerm.toLowerCase()}`;
    const cachedResults = globalCache.getCachedResults(cacheKey);
    
    if (cachedResults && !isBarcode) {
      // Usar resultados do cache para busca textual
      setFilteredProducts(cachedResults);
      setSelectedIndex(cachedResults.length > 0 ? 0 : -1); // Auto-selecionar primeiro
      setIsSearching(false);
      setScanningState('idle');
      return;
    }

    // Delay ultra-agressivo - quase instantâneo
    let dynamicDelay;
    if (globalCache.isApiWarmedUp()) {
      // API aquecida - delays praticamente zero
      if (searchTerm.length === 1) {
        dynamicDelay = 0; // Primeira letra instantânea
      } else {
        dynamicDelay = !isBarcode && searchTerm.length >= 2 ? 1 : (isBarcode ? 150 : 5);
      }
    } else {
      // API fria - ainda assim bem rápido
      dynamicDelay = !isBarcode && searchTerm.length >= 2 ? 20 : (isBarcode ? 200 : 50);
    }

    // Busca na API com delay otimizado
    const searchTimeout = setTimeout(async () => {
      try {
        let filtered: Product[] = [];

        if (isBarcode) {
          // Busca exata por código de barras (não fazer cache)
          const exactMatch = await productsAPI.searchByBarcode(searchTerm);
          if (exactMatch) {
            const mappedProduct: Product = {
              id: exactMatch.id || '',
              name: exactMatch.name || 'Produto sem nome',
              barcode: exactMatch.barcode || '',
              price: Number(exactMatch.sale_price || exactMatch.price || 0),
              stock: Number(exactMatch.stock_quantity || 0),
              min_stock: Number(exactMatch.min_stock || 0),
              category: exactMatch.category?.name || undefined
            };
            filtered = [mappedProduct];
            setScanningState('found');
          } else {
            setScanningState('not-found');
          }
        } else {
          // Busca textual com cache
          const searchResults = await productsAPI.searchProducts(searchTerm);
          if (Array.isArray(searchResults)) {
            filtered = searchResults.slice(0, maxResults).map(product => ({
              id: product.id || '',
              name: product.name || 'Produto sem nome',
              barcode: product.barcode || '',
              price: Number(product.sale_price || product.price || 0),
              stock: Number(product.stock_quantity || 0),
              min_stock: Number(product.min_stock || 0),
              category: product.category?.name || undefined
            }));
            
            // Armazenar no cache global
            globalCache.setCachedResults(cacheKey, filtered);
          } else {
            console.warn('Resultado da busca não é um array:', searchResults);
            filtered = [];
          }
        }

        setFilteredProducts(filtered);
        setScanningState(isBarcode ? (filtered.length > 0 ? 'found' : 'not-found') : 'idle');
        // Auto-selecionar primeiro item quando há resultados
        setSelectedIndex(filtered.length > 0 ? 0 : -1);
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        setFilteredProducts([]);
        setScanningState('not-found');
        setSelectedIndex(-1);
      } finally {
        setIsSearching(false);
      }
    }, dynamicDelay); // Delay dinâmico baseado no tipo e tamanho da busca

    return () => clearTimeout(searchTimeout);
  }, [searchTerm, maxResults]);

  const handleProductClick = (product: Product) => {
    console.log('🎯 handleProductClick called for:', product.name, 'stock:', product.stock);
    
    if (product.stock === 0) {
      console.log('❌ Product out of stock');
      return;
    }
    
    console.log('✅ Calling onProductSelect');
    onProductSelect(product);
    
    // Limpar estados
    setSearchTerm('');
    setScanningState('idle');
    setSelectedIndex(-1);
    setIsFocused(false);
    setIsMouseInList(false);
    
    // Re-focus no input para próxima busca
    setTimeout(() => {
      const currentRef = ref && typeof ref === 'object' ? ref.current : inputRef.current;
      if (currentRef) {
        console.log('🎯 Re-focusing input for next search');
        currentRef.focus();
      }
    }, 100);
  };

  // Scroll automático para item selecionado
  useEffect(() => {
    if (selectedIndex >= 0 && filteredProducts.length > 0) {
      console.log('📜 Auto-scroll para índice:', selectedIndex);
      
      // Buscar elemento por data-attribute
      const selectedElement = document.querySelector(`[data-product-index="${selectedIndex}"]`) as HTMLElement;
      
      if (selectedElement) {
        console.log('📜 Fazendo scroll suave para item selecionado');
        
        // Scroll suave para o elemento
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
        
        // Garantir que o elemento fique visível dentro do container
        const container = selectedElement.closest('[style*="overflow"]') as HTMLElement;
        if (container) {
          const elementTop = selectedElement.offsetTop;
          const elementHeight = selectedElement.offsetHeight;
          const containerScrollTop = container.scrollTop;
          const containerHeight = container.clientHeight;
          
          // Se elemento está fora da view, ajustar scroll
          if (elementTop < containerScrollTop) {
            container.scrollTop = elementTop - 10; // Margem superior
          } else if (elementTop + elementHeight > containerScrollTop + containerHeight) {
            container.scrollTop = elementTop + elementHeight - containerHeight + 10; // Margem inferior
          }
        }
      }
    }
  }, [selectedIndex, filteredProducts.length]);

  // Navegação por teclado ULTRA simples
  const handleKeyDown = (e: React.KeyboardEvent) => {
    console.log('🔥🔥🔥 TECLA PRESSIONADA:', e.key);
    console.log('🔥 Estado atual - isFocused:', isFocused, 'products:', filteredProducts.length, 'selectedIndex:', selectedIndex);
    console.log('🔥 Elemento ativo:', document.activeElement?.tagName, document.activeElement?.id);
    console.log('🔥 isNavigating:', isNavigating);
    
    // Se não há produtos, não faz nada
    if (filteredProducts.length === 0) {
      console.log('❌ Sem produtos para navegar');
      return;
    }

    console.log('✅ Processando tecla:', e.key);

    // Processar teclas SEMPRE que há produtos
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = selectedIndex < filteredProducts.length - 1 ? selectedIndex + 1 : 0;
      console.log('📍 Arrow Down: mudando de', selectedIndex, 'para', nextIndex);
      setSelectedIndex(nextIndex);
      setIsNavigating(true);
      
      // Garantir que input mantenha foco
      setTimeout(() => {
        const input = document.querySelector('#product-search-input') as HTMLInputElement;
        if (input && document.activeElement !== input) {
          console.log('🎯 Refocando input após Arrow Down');
          input.focus();
        }
        setIsNavigating(false);
      }, 100);
      return;
    }
    
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : filteredProducts.length - 1;
      console.log('📍 Arrow Up: mudando de', selectedIndex, 'para', prevIndex);
      setSelectedIndex(prevIndex);
      setIsNavigating(true);
      
      // Garantir que input mantenha foco
      setTimeout(() => {
        const input = document.querySelector('#product-search-input') as HTMLInputElement;
        if (input && document.activeElement !== input) {
          console.log('🎯 Refocando input após Arrow Up');
          input.focus();
        }
        setIsNavigating(false);
      }, 100);
      return;
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      console.log('✅ Enter - selectedIndex:', selectedIndex);
      if (selectedIndex >= 0 && selectedIndex < filteredProducts.length) {
        const product = filteredProducts[selectedIndex];
        console.log('✅ Selecionando produto:', product?.name);
        if (product && product.stock > 0) {
          handleProductClick(product);
        }
      }
      return;
    }
    
    if (e.key === 'Escape') {
      e.preventDefault();
      console.log('🚪 Escape - fechando');
      setSearchTerm('');
      setIsFocused(false);
      setSelectedIndex(-1);
      return;
    }
  };

  // Listener global para garantir que setas sempre funcionem
  useEffect(() => {
    const globalKeyHandler = (e: KeyboardEvent) => {
      // Só processar se há busca ativa e produtos
      if (!searchTerm || filteredProducts.length === 0) return;
      
      console.log('🌍 Global listener capturou:', e.key);
      
      if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
        e.preventDefault();
        
        // Garantir que input tenha foco
        const input = document.querySelector('#product-search-input') as HTMLInputElement;
        if (input && document.activeElement !== input) {
          console.log('🎯 Refocando input via global listener');
          input.focus();
        }
        
        // Simular evento no handleKeyDown
        const fakeEvent = {
          key: e.key,
          preventDefault: () => {},
          stopPropagation: () => {}
        } as React.KeyboardEvent;
        
        handleKeyDown(fakeEvent);
      }
    };

    // Adicionar listener
    document.addEventListener('keydown', globalKeyHandler, true);
    
    return () => {
      document.removeEventListener('keydown', globalKeyHandler, true);
    };
  }, [searchTerm, filteredProducts.length, selectedIndex]);

  const handleInputChange = async (value: string) => {
    setSearchTerm(value);
    
    // Auto-submit para códigos de barras completos (12+ dígitos) - mais agressivo
    if (isBarcodeFormat(value) && value.length >= 12) {
      try {
        setScanningState('scanning');
        const exactMatch = await productsAPI.searchByBarcode(value);
        if (exactMatch) {
          const mappedProduct: Product = {
            id: exactMatch.id || '',
            name: exactMatch.name || 'Produto sem nome',
            barcode: exactMatch.barcode || '',
            price: Number(exactMatch.sale_price || exactMatch.price || 0),
            stock: Number(exactMatch.stock_quantity || 0),
            min_stock: Number(exactMatch.min_stock || 0),
            category: exactMatch.category?.name || undefined
          };
          handleProductClick(mappedProduct);
          return;
        } else {
          setScanningState('not-found');
        }
      } catch (error) {
        console.error('Erro ao buscar produto por código de barras:', error);
        setScanningState('not-found');
      }
    }
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      'Bebidas': 'primary',
      'Padaria': 'warning', 
      'Higiene': 'info',
      'Mercearia': 'success',
      'Laticínios': 'secondary',
      'Limpeza': 'error',
      'Biscoitos': 'default',
      'Doces': 'secondary',
    };
    return colors[category || ''] || 'default';
  };

  const getStockStatus = (stock: number, minStock?: number) => {
    try {
      const stockNumber = Number(stock) || 0;
      const minStockNumber = Number(minStock) || 10;
      
      if (stockNumber === 0) return { label: 'Sem estoque', color: 'error' as const };
      
      if (stockNumber <= minStockNumber) {
        return { 
          label: `Estoque baixo (${stockNumber})`, 
          color: 'warning' as const 
        };
      }
      
      return { label: `${stockNumber} em estoque`, color: 'success' as const };
    } catch (error) {
      console.error('Erro ao calcular status do estoque:', error);
      return { label: 'Estoque indefinido', color: 'default' as const };
    }
  };

  const getScanningMessage = () => {
    switch (scanningState) {
      case 'scanning':
        return { message: 'Buscando produto...', color: 'info' as const };
      case 'found':
        return { message: 'Produto encontrado!', color: 'success' as const };
      case 'not-found':
        return { message: 'Produto não encontrado', color: 'error' as const };
      default:
        return null;
    }
  };

  const scanMessage = getScanningMessage();

  // Função para limpar estado em caso de erro
  const resetSearchState = () => {
    setFilteredProducts([]);
    setIsSearching(false);
    setScanningState('idle');
    setSearchTerm('');
    setIsFocused(false);
    setSelectedIndex(-1);
    setIsMouseInList(false);
    setIsNavigating(false);
  };

  return (
    <Box sx={{ position: 'relative', zIndex: 1 }} data-search-area="true">
      {/* Input Principal */}
      <TextField
        fullWidth
        id="product-search-input"
        inputRef={ref || inputRef}
        value={searchTerm}
        onChange={(e) => {
          try {
            handleInputChange(e.target.value);
          } catch (error) {
            console.error('Erro no input change:', error);
            resetSearchState();
          }
        }}
        onKeyDown={(e) => {
          console.log('🎹 onKeyDown chamado no input:', e.key);
          handleKeyDown(e);
        }}
        onFocus={() => {
          console.log('🎯 Input recebeu foco');
          setIsFocused(true);
        }}
        onBlur={(e) => {
          console.log('❌ Input blur, related target:', e.relatedTarget);
          // Só fechar se realmente saiu para fora da área de busca
          const relatedTarget = e.relatedTarget as HTMLElement;
          const isInsideSearchArea = relatedTarget?.closest('[data-search-area]');
          
          if (!isInsideSearchArea && !isMouseInList) {
            setTimeout(() => {
              console.log('🔐 Closing search area');
              setIsFocused(false);
              setSelectedIndex(-1);
            }, 300);
          }
        }}
        placeholder={placeholder}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              {searchMode === 'barcode' ? (
                <QrCodeScanner color={scanningState === 'scanning' ? 'primary' : 'action'} />
              ) : (
                <Search color="action" />
              )}
              {isSearching && (
                <CircularProgress size={16} sx={{ ml: 1 }} />
              )}
            </InputAdornment>
          ),
          endAdornment: searchTerm && (
            <InputAdornment position="end">
              <Chip 
                label={searchMode === 'barcode' ? 'Código' : 'Texto'} 
                size="small" 
                color={searchMode === 'barcode' ? 'primary' : 'default'}
                variant="outlined"
              />
            </InputAdornment>
          ),
        }}
        sx={{ 
          mb: 1,
          '& .MuiOutlinedInput-root': {
            bgcolor: searchMode === 'barcode' && scanningState === 'scanning' 
              ? 'primary.50' 
              : 'background.paper'
          }
        }}
      />

      {/* Mensagem de Status do Scanner */}
      {scanMessage && (
        <Alert severity={scanMessage.color} sx={{ mb: 1, py: 0 }}>
          {scanMessage.message}
        </Alert>
      )}

      {/* Resultados da Busca */}
      {searchTerm && searchTerm.length > 0 && (isFocused || filteredProducts.length > 0) && (
        <Paper
          elevation={8}
          data-search-area="true"
          onMouseEnter={() => setIsMouseInList(true)}
          onMouseLeave={() => setIsMouseInList(false)}
          sx={{
            position: 'fixed',
            top: 'auto',
            left: 'auto',
            right: 'auto',
            zIndex: 1300,
            maxHeight: 400,
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            backgroundColor: 'background.paper',
            minWidth: '300px',
            transform: 'translateY(8px)',
          }}
        >
          {/* Dica de navegação por teclado */}
          {filteredProducts.length > 0 && (
            <Box sx={{ 
              px: 2, 
              py: 1, 
              bgcolor: 'grey.50', 
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}>
              <Typography variant="caption" color="text.secondary">
                Use ↑↓ para navegar • Enter para selecionar • ESC para fechar
              </Typography>
            </Box>
          )}
          <div ref={listRef}>
          {filteredProducts.length === 0 && !isSearching ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {searchMode === 'barcode' 
                  ? 'Código de barras não encontrado' 
                  : 'Nenhum produto encontrado'
                }
              </Typography>
              {searchMode === 'text' && (
                <Typography variant="caption" color="text.secondary">
                  Tente buscar por: nome, categoria ou código
                </Typography>
              )}
            </Box>
          ) : (
            <List dense>
              {filteredProducts.map((product, index) => {
                if (!product || !product.id) {
                  console.warn('Produto inválido encontrado:', product);
                  return null;
                }
                
                const stockStatus = getStockStatus(product.stock, product.min_stock);
                
                return (
                  <React.Fragment key={`${product.id}-${index}`}>
                    <ListItem
                      button
                      data-product-item="true"
                      data-product-index={index}
                      onClick={() => {
                        try {
                          handleProductClick(product);
                        } catch (error) {
                          console.error('Erro ao clicar no produto:', error);
                        }
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      disabled={Number(product.stock || 0) === 0}
                      sx={{
                        '&:hover': {
                          bgcolor: Number(product.stock || 0) === 0 ? 'inherit' : 'success.50',
                        },
                        cursor: Number(product.stock || 0) === 0 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        bgcolor: selectedIndex === index 
                          ? 'primary.100' 
                          : searchMode === 'barcode' ? 'primary.50' : 'inherit',
                        border: selectedIndex === index ? '2px solid' : 'none',
                        borderColor: selectedIndex === index ? 'primary.main' : 'transparent',
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ 
                          bgcolor: searchMode === 'barcode' ? 'primary.main' : 'grey.300',
                          color: searchMode === 'barcode' ? 'white' : 'text.primary'
                        }}>
                          {searchMode === 'barcode' ? <QrCodeScanner /> : <Inventory />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle2" noWrap>
                              {product.name}
                            </Typography>
                            {product.category && (
                              <Chip
                                label={product.category}
                                size="small"
                                color={getCategoryColor(product.category)}
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Código: {product.barcode}
                            </Typography>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mt={0.5}>
                              <Typography variant="body2" fontWeight="bold">
                                R$ {product.price.toFixed(2)}
                              </Typography>
                              <Chip
                                label={stockStatus.label}
                                size="small"
                                color={stockStatus.color}
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        }
                      />
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        color: Number(product.stock || 0) === 0 ? 'text.disabled' : 'success.main',
                        fontSize: 12,
                        fontWeight: 'bold',
                        ml: 1
                      }}>
                        <ShoppingCart fontSize="small" />
                        <Typography variant="caption">
                          {Number(product.stock || 0) === 0 ? 'INDISPONÍVEL' : 'CLIQUE'}
                        </Typography>
                      </Box>
                    </ListItem>
                    {index < filteredProducts.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
          </div>
        </Paper>
      )}
    </Box>
  );
});

UnifiedProductSearchComponent.displayName = 'UnifiedProductSearchComponent';

// Error Boundary Wrapper
class ProductSearchErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Erro no UnifiedProductSearch:', error, errorInfo);
    // Log error for debugging
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">
            <Typography variant="h6">Erro na busca de produtos</Typography>
            <Typography variant="body2">
              Ocorreu um erro ao carregar a busca de produtos. Recarregue a página.
            </Typography>
            <Button 
              variant="contained" 
              size="small" 
              sx={{ mt: 1 }}
              onClick={() => window.location.reload()}
            >
              Recarregar Página
            </Button>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Componente exportado com Error Boundary
export const UnifiedProductSearch = React.forwardRef<HTMLInputElement, UnifiedProductSearchProps>((props, ref) => (
  <ProductSearchErrorBoundary>
    <UnifiedProductSearchComponent {...props} ref={ref} />
  </ProductSearchErrorBoundary>
));

UnifiedProductSearch.displayName = 'UnifiedProductSearch';