import axios from 'axios';

export interface CEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

class CEPService {
  private readonly baseURL = 'https://viacep.com.br/ws';

  async buscarCEP(cep: string): Promise<CEPResponse | null> {
    const cleanCEP = cep.replace(/\D/g, '');
    
    if (cleanCEP.length !== 8) {
      throw new Error('CEP deve conter 8 dígitos');
    }

    try {
      const response = await axios.get<CEPResponse>(
        `${this.baseURL}/${cleanCEP}/json/`,
        { timeout: 10000 }
      );

      if (response.data.erro) {
        throw new Error('CEP não encontrado');
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ENOTFOUND' || error.code === 'TIMEOUT') {
          throw new Error('Erro de conexão com o serviço de CEP');
        }
        if (error.response?.status === 400) {
          throw new Error('CEP inválido');
        }
      }
      throw new Error('Erro ao buscar CEP');
    }
  }

  formatCEP(cep: string): string {
    const cleanCEP = cep.replace(/\D/g, '');
    return cleanCEP.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
}

export const cepService = new CEPService();