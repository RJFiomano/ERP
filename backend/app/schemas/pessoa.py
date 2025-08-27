from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.client import PersonType
from app.models.pessoa import PapelPessoa
from app.schemas.contact import Phone, Address, PhoneCreate, AddressCreate


class ClienteDadosCreate(BaseModel):
    limite_credito: Optional[float] = 0
    prazo_pagamento: Optional[int] = 30
    observacoes_comerciais: Optional[str] = None


class FuncionarioDadosCreate(BaseModel):
    cargo: Optional[str] = None
    salario: Optional[float] = None
    data_admissao: Optional[str] = None
    pis: Optional[str] = None
    ctps: Optional[str] = None
    departamento: Optional[str] = None


class FornecedorDadosCreate(BaseModel):
    prazo_entrega: Optional[int] = None
    condicoes_pagamento: Optional[str] = None
    observacoes_comerciais: Optional[str] = None


class PessoaBase(BaseModel):
    nome: str
    pessoa_tipo: PersonType
    documento: str
    rg: Optional[str] = None
    ie: Optional[str] = None
    email: Optional[str] = None
    observacoes: Optional[str] = None


class PessoaCreate(PessoaBase):
    papeis: List[PapelPessoa] = [PapelPessoa.CLIENTE]
    telefones: Optional[List[PhoneCreate]] = []
    enderecos: Optional[List[AddressCreate]] = []
    dados_cliente: Optional[ClienteDadosCreate] = None
    dados_funcionario: Optional[FuncionarioDadosCreate] = None
    dados_fornecedor: Optional[FornecedorDadosCreate] = None


class PessoaUpdate(BaseModel):
    nome: Optional[str] = None
    pessoa_tipo: Optional[PersonType] = None
    documento: Optional[str] = None
    rg: Optional[str] = None
    ie: Optional[str] = None
    email: Optional[str] = None
    observacoes: Optional[str] = None
    is_active: Optional[bool] = None
    papeis: Optional[List[PapelPessoa]] = None
    telefones: Optional[List[PhoneCreate]] = None
    enderecos: Optional[List[AddressCreate]] = None
    dados_cliente: Optional[ClienteDadosCreate] = None
    dados_funcionario: Optional[FuncionarioDadosCreate] = None
    dados_fornecedor: Optional[FornecedorDadosCreate] = None


class Pessoa(PessoaBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    papeis: List[str] = []
    telefones: List[Phone] = []
    enderecos: List[Address] = []

    class Config:
        from_attributes = True


class PessoaResponse(BaseModel):
    pessoas: List[Pessoa]
    total: int
    page: int
    per_page: int