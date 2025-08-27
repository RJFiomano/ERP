import { useState, useEffect, useCallback } from 'react';
import { validateDocument } from '@/utils/validation';

interface DocumentValidationResult {
  isValid: boolean;
  isExisting: boolean;
  isLoading: boolean;
  existingContact: any | null;
  error: string | null;
}

export const useDocumentValidation = (
  documento: string, 
  pessoaTipo: 'PF' | 'PJ',
  excludeId?: string // Para edição, excluir o próprio registro
) => {
  const [validationResult, setValidationResult] = useState<DocumentValidationResult>({
    isValid: false,
    isExisting: false,
    isLoading: false,
    existingContact: null,
    error: null,
  });

  const validateDocumentExists = useCallback(
    async (doc: string) => {
      if (!doc || doc.length < 10) {
        setValidationResult({
          isValid: false,
          isExisting: false,
          isLoading: false,
          existingContact: null,
          error: null,
        });
        return;
      }

      // Validar formato primeiro
      const isValidFormat = validateDocument(doc, pessoaTipo);
      if (!isValidFormat) {
        setValidationResult({
          isValid: false,
          isExisting: false,
          isLoading: false,
          existingContact: null,
          error: pessoaTipo === 'PF' ? 'CPF inválido' : 'CNPJ inválido',
        });
        return;
      }

      setValidationResult(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const cleanDoc = doc.replace(/\D/g, '');
        const response = await fetch(`http://localhost:8000/pessoas/by-document/${cleanDoc}`);
        
        if (response.ok) {
          const existingContact = await response.json();
          
          // Se estamos editando e o contato encontrado é o mesmo que estamos editando
          const isSameContact = excludeId && existingContact.id === excludeId;
          
          setValidationResult({
            isValid: true,
            isExisting: !isSameContact,
            isLoading: false,
            existingContact: isSameContact ? null : existingContact,
            error: isSameContact ? null : `Documento já cadastrado para: ${existingContact.nome}`,
          });
        } else if (response.status === 404) {
          // Documento não existe - disponível
          setValidationResult({
            isValid: true,
            isExisting: false,
            isLoading: false,
            existingContact: null,
            error: null,
          });
        } else {
          throw new Error('Erro ao verificar documento');
        }
      } catch (error) {
        setValidationResult({
          isValid: false,
          isExisting: false,
          isLoading: false,
          existingContact: null,
          error: 'Erro ao verificar documento',
        });
      }
    },
    [pessoaTipo, excludeId]
  );

  // Debounce da validação
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateDocumentExists(documento);
    }, 500); // 500ms de delay

    return () => clearTimeout(timeoutId);
  }, [documento, validateDocumentExists]);

  return validationResult;
};