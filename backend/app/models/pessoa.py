from sqlalchemy import Column, String, Boolean, Text, Date, Integer, Enum as SQLEnum, ForeignKey, Numeric, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base, BaseModel, GUID
from app.models.client import PersonType
import enum
import uuid
from datetime import datetime


class PapelPessoa(str, enum.Enum):
    CLIENTE = "CLIENTE"
    CLIENTE_FINAL = "CLIENTE_FINAL"
    FUNCIONARIO = "FUNCIONARIO"
    FORNECEDOR = "FORNECEDOR"


class Pessoa(BaseModel):
    __tablename__ = "pessoas"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    nome = Column(String(255), nullable=False)
    pessoa_tipo = Column(SQLEnum(PersonType), nullable=False)
    documento = Column(String(20), unique=True, nullable=False)
    rg = Column(String(20))
    ie = Column(String(20))
    email = Column(String(255))
    observacoes = Column(Text)
    is_active = Column(Boolean, default=True)

    # Relacionamentos
    papeis = relationship("PessoaPapel", back_populates="pessoa", cascade="all, delete-orphan")
    telefones = relationship("Phone", back_populates="pessoa", cascade="all, delete-orphan")
    enderecos = relationship("Address", back_populates="pessoa", cascade="all, delete-orphan")
    
    # Dados específicos
    dados_cliente = relationship("ClienteDados", back_populates="pessoa", uselist=False)
    dados_funcionario = relationship("FuncionarioDados", back_populates="pessoa", uselist=False)
    dados_fornecedor = relationship("FornecedorDados", back_populates="pessoa", uselist=False)

    def __repr__(self):
        return f"<Pessoa(nome='{self.nome}', documento='{self.documento}')>"

    def tem_papel(self, papel: PapelPessoa) -> bool:
        """Verifica se a pessoa tem um papel específico ativo"""
        return any(p.papel == papel and p.is_active for p in self.papeis)

    def get_papeis_ativos(self):
        """Retorna lista de papéis ativos"""
        return [p.papel for p in self.papeis if p.is_active]


class PessoaPapel(BaseModel):
    __tablename__ = "pessoa_papeis"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    pessoa_id = Column(GUID, ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=False)
    papel = Column(SQLEnum(PapelPessoa), nullable=False)
    data_inicio = Column(Date, default=datetime.now().date)
    data_fim = Column(Date)
    is_active = Column(Boolean, default=True)

    # Relacionamentos
    pessoa = relationship("Pessoa", back_populates="papeis")

    def __repr__(self):
        return f"<PessoaPapel(pessoa_id='{self.pessoa_id}', papel='{self.papel}')>"


class ClienteDados(Base):
    __tablename__ = "clientes_dados"

    pessoa_id = Column(GUID, ForeignKey("pessoas.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    limite_credito = Column(Numeric(10, 2), default=0)
    prazo_pagamento = Column(Integer, default=30)
    observacoes_comerciais = Column(Text)

    # Relacionamentos
    pessoa = relationship("Pessoa", back_populates="dados_cliente")

    def __repr__(self):
        return f"<ClienteDados(pessoa_id='{self.pessoa_id}', limite='{self.limite_credito}')>"


class FuncionarioDados(Base):
    __tablename__ = "funcionarios_dados"

    pessoa_id = Column(GUID, ForeignKey("pessoas.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    cargo = Column(String(100))
    salario = Column(Numeric(10, 2))
    data_admissao = Column(Date)
    pis = Column(String(20))
    ctps = Column(String(20))
    departamento = Column(String(100))

    # Relacionamentos
    pessoa = relationship("Pessoa", back_populates="dados_funcionario")

    def __repr__(self):
        return f"<FuncionarioDados(pessoa_id='{self.pessoa_id}', cargo='{self.cargo}')>"


class FornecedorDados(Base):
    __tablename__ = "fornecedores_dados"

    pessoa_id = Column(GUID, ForeignKey("pessoas.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    prazo_entrega = Column(Integer)
    condicoes_pagamento = Column(String(255))
    observacoes_comerciais = Column(Text)

    # Relacionamentos
    pessoa = relationship("Pessoa", back_populates="dados_fornecedor")

    def __repr__(self):
        return f"<FornecedorDados(pessoa_id='{self.pessoa_id}', prazo='{self.prazo_entrega}')>"