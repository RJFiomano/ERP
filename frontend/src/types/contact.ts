export enum PhoneType {
  mobile = 'mobile',      // Celular
  home = 'home',          // Residencial
  work = 'work',          // Comercial
  fax = 'fax',            // Fax
  whatsapp = 'whatsapp'   // WhatsApp
}

export enum AddressType {
  main = 'main',          // Principal
  billing = 'billing',    // Cobrança
  delivery = 'delivery',  // Entrega
  work = 'work',          // Comercial
  other = 'other'         // Outro
}

export interface Phone {
  id?: string;
  number: string;
  type: PhoneType;
  is_whatsapp: boolean;
  is_primary: boolean;
  notes?: string;
  client_id?: string;
  supplier_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Address {
  id?: string;
  type: AddressType;
  is_primary: boolean;
  street: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zip_code: string;
  notes?: string;
  client_id?: string;
  supplier_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PhoneCreate {
  number: string;
  type: PhoneType;
  is_whatsapp?: boolean;
  is_primary?: boolean;
  notes?: string;
}

export interface AddressCreate {
  type: AddressType;
  is_primary?: boolean;
  street: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zip_code: string;
  notes?: string;
}

export interface PhoneUpdate extends Partial<PhoneCreate> {}
export interface AddressUpdate extends Partial<AddressCreate> {}

export interface ContactInfo {
  phones: Phone[];
  addresses: Address[];
}

export interface ContactInfoCreate {
  phones: PhoneCreate[];
  addresses: AddressCreate[];
}

export interface ContactInfoUpdate {
  phones?: PhoneCreate[];
  addresses?: AddressCreate[];
}