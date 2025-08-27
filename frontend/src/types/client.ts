import { ContactInfo, ContactInfoCreate, ContactInfoUpdate } from './contact';

export enum PersonType {
  PF = 'PF', // Pessoa Física
  PJ = 'PJ', // Pessoa Jurídica
}

export interface Client {
  id: string;
  name: string;
  person_type: PersonType;
  document: string; // CPF ou CNPJ
  rg?: string; // RG - Registro Geral
  ie?: string; // Inscrição Estadual
  email?: string;
  phone?: string; // Telefone legado (manter compatibilidade)
  address?: string; // Endereço legado (manter compatibilidade)
  city?: string;
  state?: string;
  zip_code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Novos campos para múltiplos contatos
  phones?: ContactInfo['phones'];
  addresses?: ContactInfo['addresses'];
}

export interface CreateClientRequest {
  name: string;
  person_type: PersonType;
  document: string;
  rg?: string;
  ie?: string;
  email?: string;
  phone?: string; // Telefone legado
  address?: string; // Endereço legado
  city?: string;
  state?: string;
  zip_code?: string;
  // Novos campos para múltiplos contatos
  contacts?: ContactInfoCreate;
}

export interface UpdateClientRequest {
  name?: string;
  person_type?: PersonType;
  document?: string;
  rg?: string;
  ie?: string;
  email?: string;
  phone?: string; // Telefone legado
  address?: string; // Endereço legado
  city?: string;
  state?: string;
  zip_code?: string;
  // Novos campos para múltiplos contatos
  contacts?: ContactInfoUpdate;
}