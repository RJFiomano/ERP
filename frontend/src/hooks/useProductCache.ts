import { useState, useEffect, useRef } from 'react';
import { productsAPI } from '@/services/api';

interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  min_stock?: number;
  category?: string;
}

interface UseProductCacheReturn {
  searchProducts: (term: string) => Promise<Product[]>;
  isWarmedUp: boolean;
  popularProducts: Product[];
  clearCache: () => void;
}

export const useProductCache = (): UseProductCacheReturn => {
  const [cache, setCache] = useState<Map<string, Product[]>>(new Map());
  const [isWarmedUp, setIsWarmedUp] = useState(false);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Warm-up inicial
  useEffect(() => {
    const warmUp = async () => {
      try {
        // Cancelar requisição anterior se existir
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        
        // Carregar produtos populares
        const response = await fetch('/api/products?limit=50', {
          signal: abortControllerRef.current.signal
        });
        
        if (response.ok) {
          const data = await response.json();
          const products = data.products || [];
          
          const mappedProducts: Product[] = products.map((p: any) => ({
            id: p.id || '',
            name: p.name || '',
            barcode: p.barcode || '',
            price: Number(p.sale_price || 0),
            stock: Number(p.stock_quantity || 0),
            category: p.category?.name
          }));
          
          setPopularProducts(mappedProducts);
          
          // Pre-popular cache com termos comuns
          const commonTerms = ['a', 'e', 'i', 'o', 'u', 'prod', 'item'];
          commonTerms.forEach(term => {
            const filtered = mappedProducts.filter(p => 
              p.name.toLowerCase().includes(term)
            );
            if (filtered.length > 0) {
              setCache(prev => new Map(prev.set(term, filtered)));
            }
          });
        }
        
        setIsWarmedUp(true);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('Warm-up falhou:', error);
        }
        setIsWarmedUp(true);
      }
    };

    warmUp();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const searchProducts = async (term: string): Promise<Product[]> => {
    const normalizedTerm = term.toLowerCase().trim();
    
    // Busca local primeiro
    if (normalizedTerm.length <= 3 && popularProducts.length > 0) {
      const localResults = popularProducts.filter(p =>
        p.name.toLowerCase().includes(normalizedTerm) ||
        p.barcode.includes(term)
      );
      if (localResults.length > 0) {
        return localResults;
      }
    }

    // Verificar cache
    if (cache.has(normalizedTerm)) {
      return cache.get(normalizedTerm)!;
    }

    try {
      // Buscar na API
      const results = await productsAPI.searchProducts(term);
      const mappedResults: Product[] = Array.isArray(results) 
        ? results.map(p => ({
            id: p.id || '',
            name: p.name || '',
            barcode: p.barcode || '',
            price: Number(p.sale_price || 0),
            stock: Number(p.stock_quantity || 0),
            category: p.category?.name
          }))
        : [];

      // Armazenar no cache
      setCache(prev => {
        const newCache = new Map(prev);
        newCache.set(normalizedTerm, mappedResults);
        
        // Limitar cache
        if (newCache.size > 100) {
          const firstKey = newCache.keys().next().value;
          newCache.delete(firstKey);
        }
        
        return newCache;
      });

      return mappedResults;
    } catch (error) {
      console.error('Erro na busca:', error);
      return [];
    }
  };

  const clearCache = () => {
    setCache(new Map());
  };

  return {
    searchProducts,
    isWarmedUp,
    popularProducts,
    clearCache
  };
};