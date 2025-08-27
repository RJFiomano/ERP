from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, text
from typing import Optional, List
from app.core.database import get_db
from app.models.pessoa import Pessoa, PessoaPapel, PapelPessoa, ClienteDados, FuncionarioDados, FornecedorDados
from app.models.contact import Phone, Address
from app.models.client import PersonType
from app.schemas.pessoa import PessoaCreate, PessoaUpdate, PessoaResponse
import uuid

router = APIRouter(prefix="/pessoas", tags=["Contatos"])


@router.get("/")
async def listar_pessoas(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    papel: Optional[str] = Query(None, description="CLIENTE, FUNCIONARIO, FORNECEDOR"),
    pessoa_tipo: Optional[str] = Query(None, description="PF, PJ"),
    status: Optional[str] = Query("ativos", description="ativos, inativos, todos"),
    db: Session = Depends(get_db)
):
    """Lista pessoas com filtros opcionais"""
    
    try:
        # Debug: verificar se tabela existe
        try:
            table_check = db.execute(text("SELECT COUNT(*) FROM pessoas")).fetchone()
            total_registros = table_check[0] if table_check else 0
        except Exception as table_error:
            raise HTTPException(
                status_code=500, 
                detail=f"Erro ao acessar tabela pessoas: {str(table_error)}"
            )
        
        # Se não há registros, retornar vazio
        if total_registros == 0:
            return {
                "pessoas": [],
                "total": 0,
                "page": 0,
                "per_page": limit,
                "debug_info": "Tabela pessoas está vazia"
            }
        
        # Query base para listagem com filtro de status
        base_query = db.query(Pessoa)
        
        # Aplicar filtro de status
        if status == "ativos":
            base_query = base_query.filter(Pessoa.is_active == True)
        elif status == "inativos":
            base_query = base_query.filter(Pessoa.is_active == False)
        # Se status == "todos", não aplica filtro de is_active
        
        # Aplicar filtros
        filtered_query = base_query
        
        # Filtro por tipo de pessoa
        if pessoa_tipo:
            filtered_query = filtered_query.filter(Pessoa.pessoa_tipo == pessoa_tipo)
        
        # Filtro de busca
        if search:
            search_filter = f"%{search}%"
            filtered_query = filtered_query.filter(
                or_(
                    func.lower(Pessoa.nome).contains(search_filter.lower()),
                    Pessoa.documento.contains(search),
                    func.lower(Pessoa.email).contains(search_filter.lower())
                )
            )
        
        # Filtro por papel (aplicado de forma diferente)
        if papel:
            # Para filtro específico, usar subquery para não afetar contagem
            pessoas_com_papel = db.query(PessoaPapel.pessoa_id).filter(
                PessoaPapel.papel == papel,
                PessoaPapel.is_active == True
            ).subquery()
            
            filtered_query = filtered_query.filter(
                Pessoa.id.in_(db.query(pessoas_com_papel.c.pessoa_id))
            )
        
        # Contagem total
        total = filtered_query.count()
        
        # Ordenação e paginação com eager loading
        pessoas = filtered_query.options(
            joinedload(Pessoa.papeis),
            joinedload(Pessoa.telefones),
            joinedload(Pessoa.enderecos),
            joinedload(Pessoa.dados_cliente),
            joinedload(Pessoa.dados_funcionario),
            joinedload(Pessoa.dados_fornecedor)
        ).order_by(Pessoa.nome).offset(skip).limit(limit).all()
        
        # Serializar resultado
        resultado = []
        for pessoa in pessoas:
            pessoa_data = {
                "id": str(pessoa.id),
                "nome": pessoa.nome,
                "pessoa_tipo": pessoa.pessoa_tipo.value,
                "documento": pessoa.documento,
                "rg": pessoa.rg,
                "ie": pessoa.ie,
                "email": pessoa.email,
                "observacoes": pessoa.observacoes,
                "is_active": pessoa.is_active,
                "created_at": pessoa.created_at.isoformat() if pessoa.created_at else None,
                "papeis": [p.papel.value for p in pessoa.papeis if p.is_active] if pessoa.papeis else [],
                "telefones": [{
                    "id": str(tel.id),
                    "number": tel.number,
                    "type": tel.type.value,
                    "is_whatsapp": tel.is_whatsapp,
                    "is_primary": tel.is_primary,
                    "notes": tel.notes
                } for tel in pessoa.telefones],
                "enderecos": [{
                    "id": str(end.id),
                    "type": end.type.value,
                    "street": end.street,
                    "number": end.number,
                    "complement": end.complement,
                    "neighborhood": end.neighborhood,
                    "city": end.city,
                    "state": end.state,
                    "zip_code": end.zip_code,
                    "is_primary": end.is_primary,
                    "notes": end.notes
                } for end in pessoa.enderecos],
                # Dados específicos por papel
                "dados_cliente": {
                    "limite_credito": float(pessoa.dados_cliente.limite_credito) if pessoa.dados_cliente and pessoa.dados_cliente.limite_credito is not None else 0,
                    "prazo_pagamento": pessoa.dados_cliente.prazo_pagamento if pessoa.dados_cliente and pessoa.dados_cliente.prazo_pagamento is not None else 30,
                    "observacoes_comerciais": pessoa.dados_cliente.observacoes_comerciais if pessoa.dados_cliente else ""
                } if pessoa.dados_cliente else None,
                "dados_funcionario": {
                    "cargo": pessoa.dados_funcionario.cargo if pessoa.dados_funcionario else "",
                    "salario": float(pessoa.dados_funcionario.salario) if pessoa.dados_funcionario and pessoa.dados_funcionario.salario is not None else 0,
                    "data_admissao": pessoa.dados_funcionario.data_admissao.isoformat() if pessoa.dados_funcionario and pessoa.dados_funcionario.data_admissao else "",
                    "pis": pessoa.dados_funcionario.pis if pessoa.dados_funcionario else "",
                    "ctps": pessoa.dados_funcionario.ctps if pessoa.dados_funcionario else "",
                    "departamento": pessoa.dados_funcionario.departamento if pessoa.dados_funcionario else ""
                } if pessoa.dados_funcionario else None,
                "dados_fornecedor": {
                    "prazo_entrega": pessoa.dados_fornecedor.prazo_entrega if pessoa.dados_fornecedor and pessoa.dados_fornecedor.prazo_entrega is not None else 0,
                    "condicoes_pagamento": pessoa.dados_fornecedor.condicoes_pagamento if pessoa.dados_fornecedor else "",
                    "observacoes_comerciais": pessoa.dados_fornecedor.observacoes_comerciais if pessoa.dados_fornecedor else ""
                } if pessoa.dados_fornecedor else None
            }
            resultado.append(pessoa_data)
        
        return {
            "pessoas": resultado,
            "total": total,
            "page": skip // limit,
            "per_page": limit,
            "debug_info": f"Total na tabela: {total_registros}, Filtrados: {total}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


@router.post("/")
async def criar_pessoa(
    dados: PessoaCreate,
    db: Session = Depends(get_db)
):
    """Cria uma nova pessoa com papéis específicos"""
    
    try:
        # Verificar se documento já existe
        existing = db.query(Pessoa).filter(Pessoa.documento == dados.documento).first()
        if existing:
            raise HTTPException(status_code=400, detail="Documento já cadastrado")
        
        # Criar pessoa
        pessoa = Pessoa(
            nome=dados.nome,
            pessoa_tipo=dados.pessoa_tipo,
            documento=dados.documento,
            rg=dados.rg,
            ie=dados.ie,
            email=dados.email,
            observacoes=dados.observacoes
        )
        
        db.add(pessoa)
        db.flush()  # Para obter o ID
        
        # Adicionar papéis
        for papel in dados.papeis:
            papel_obj = PessoaPapel(
                pessoa_id=pessoa.id,
                papel=papel
            )
            db.add(papel_obj)
        
        # Dados específicos por papel
        if PapelPessoa.CLIENTE in dados.papeis and dados.dados_cliente:
            cliente_dados = ClienteDados(
                pessoa_id=pessoa.id,
                limite_credito=dados.dados_cliente.limite_credito,
                prazo_pagamento=dados.dados_cliente.prazo_pagamento,
                observacoes_comerciais=dados.dados_cliente.observacoes_comerciais
            )
            db.add(cliente_dados)
        
        if PapelPessoa.FUNCIONARIO in dados.papeis and dados.dados_funcionario:
            func_dados = FuncionarioDados(
                pessoa_id=pessoa.id,
                cargo=dados.dados_funcionario.cargo,
                salario=dados.dados_funcionario.salario,
                data_admissao=dados.dados_funcionario.data_admissao,
                pis=dados.dados_funcionario.pis,
                ctps=dados.dados_funcionario.ctps,
                departamento=dados.dados_funcionario.departamento
            )
            db.add(func_dados)
        
        if PapelPessoa.FORNECEDOR in dados.papeis and dados.dados_fornecedor:
            forn_dados = FornecedorDados(
                pessoa_id=pessoa.id,
                prazo_entrega=dados.dados_fornecedor.prazo_entrega,
                condicoes_pagamento=dados.dados_fornecedor.condicoes_pagamento,
                observacoes_comerciais=dados.dados_fornecedor.observacoes_comerciais
            )
            db.add(forn_dados)
        
        # Adicionar telefones
        if dados.telefones:
            for telefone_data in dados.telefones:
                telefone = Phone(
                    pessoa_id=pessoa.id,
                    number=telefone_data.number,
                    type=telefone_data.type,
                    is_whatsapp=telefone_data.is_whatsapp,
                    is_primary=telefone_data.is_primary,
                    notes=telefone_data.notes
                )
                db.add(telefone)
        
        # Adicionar endereços
        if dados.enderecos:
            for endereco_data in dados.enderecos:
                endereco = Address(
                    pessoa_id=pessoa.id,
                    type=endereco_data.type,
                    is_primary=endereco_data.is_primary,
                    street=endereco_data.street,
                    number=endereco_data.number,
                    complement=endereco_data.complement,
                    neighborhood=endereco_data.neighborhood,
                    city=endereco_data.city,
                    state=endereco_data.state,
                    zip_code=endereco_data.zip_code,
                    notes=endereco_data.notes
                )
                db.add(endereco)
        
        db.commit()
        db.refresh(pessoa)
        
        return {
            "success": True,
            "message": "Pessoa criada com sucesso",
            "pessoa": {
                "id": str(pessoa.id),
                "nome": pessoa.nome,
                "documento": pessoa.documento,
                "papeis": [papel.value for papel in dados.papeis]
            }
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{pessoa_id}")
async def atualizar_pessoa(
    pessoa_id: str,
    dados: PessoaUpdate,
    db: Session = Depends(get_db)
):
    """Atualiza uma pessoa existente"""
    
    try:
        # Buscar pessoa
        pessoa = db.query(Pessoa).filter(Pessoa.id == pessoa_id).first()
        if not pessoa:
            raise HTTPException(status_code=404, detail="Pessoa não encontrada")
        
        # Verificar se documento já existe em outra pessoa
        if dados.documento:
            existing = db.query(Pessoa).filter(
                Pessoa.documento == dados.documento,
                Pessoa.id != pessoa_id
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="Documento já cadastrado")
        
        # Atualizar campos básicos
        for field, value in dados.model_dump(exclude_unset=True).items():
            if field not in ['papeis', 'telefones', 'enderecos', 'dados_cliente', 'dados_funcionario', 'dados_fornecedor'] and value is not None:
                setattr(pessoa, field, value)
        
        # Atualizar papéis se fornecido
        if dados.papeis is not None:
            # Remover papéis existentes
            db.query(PessoaPapel).filter(PessoaPapel.pessoa_id == pessoa_id).delete()
            
            # Adicionar novos papéis
            for papel in dados.papeis:
                papel_obj = PessoaPapel(
                    pessoa_id=pessoa.id,
                    papel=papel
                )
                db.add(papel_obj)
        
        # Atualizar telefones se fornecido
        if dados.telefones is not None:
            # Remover telefones existentes
            db.query(Phone).filter(Phone.pessoa_id == pessoa_id).delete()
            
            # Adicionar novos telefones
            for telefone_data in dados.telefones:
                telefone = Phone(
                    pessoa_id=pessoa.id,
                    number=telefone_data.number,
                    type=telefone_data.type,
                    is_whatsapp=telefone_data.is_whatsapp,
                    is_primary=telefone_data.is_primary,
                    notes=telefone_data.notes
                )
                db.add(telefone)
        
        # Atualizar endereços se fornecido
        if dados.enderecos is not None:
            # Remover endereços existentes
            db.query(Address).filter(Address.pessoa_id == pessoa_id).delete()
            
            # Adicionar novos endereços
            for endereco_data in dados.enderecos:
                endereco = Address(
                    pessoa_id=pessoa.id,
                    type=endereco_data.type,
                    is_primary=endereco_data.is_primary,
                    street=endereco_data.street,
                    number=endereco_data.number,
                    complement=endereco_data.complement,
                    neighborhood=endereco_data.neighborhood,
                    city=endereco_data.city,
                    state=endereco_data.state,
                    zip_code=endereco_data.zip_code,
                    notes=endereco_data.notes
                )
                db.add(endereco)
        
        # Atualizar dados específicos por papel
        if dados.dados_cliente is not None:
            # Remover dados existentes de cliente
            db.query(ClienteDados).filter(ClienteDados.pessoa_id == pessoa_id).delete()
            
            # Adicionar novos dados se a pessoa tem papel de cliente
            if PapelPessoa.CLIENTE in (dados.papeis or [p.papel for p in pessoa.papeis]):
                cliente_dados = ClienteDados(
                    pessoa_id=pessoa.id,
                    limite_credito=dados.dados_cliente.limite_credito,
                    prazo_pagamento=dados.dados_cliente.prazo_pagamento,
                    observacoes_comerciais=dados.dados_cliente.observacoes_comerciais
                )
                db.add(cliente_dados)
        
        if dados.dados_funcionario is not None:
            # Remover dados existentes de funcionário
            db.query(FuncionarioDados).filter(FuncionarioDados.pessoa_id == pessoa_id).delete()
            
            # Adicionar novos dados se a pessoa tem papel de funcionário
            if PapelPessoa.FUNCIONARIO in (dados.papeis or [p.papel for p in pessoa.papeis]):
                func_dados = FuncionarioDados(
                    pessoa_id=pessoa.id,
                    cargo=dados.dados_funcionario.cargo,
                    salario=dados.dados_funcionario.salario,
                    data_admissao=dados.dados_funcionario.data_admissao,
                    pis=dados.dados_funcionario.pis,
                    ctps=dados.dados_funcionario.ctps,
                    departamento=dados.dados_funcionario.departamento
                )
                db.add(func_dados)
        
        if dados.dados_fornecedor is not None:
            # Remover dados existentes de fornecedor
            db.query(FornecedorDados).filter(FornecedorDados.pessoa_id == pessoa_id).delete()
            
            # Adicionar novos dados se a pessoa tem papel de fornecedor
            if PapelPessoa.FORNECEDOR in (dados.papeis or [p.papel for p in pessoa.papeis]):
                forn_dados = FornecedorDados(
                    pessoa_id=pessoa.id,
                    prazo_entrega=dados.dados_fornecedor.prazo_entrega,
                    condicoes_pagamento=dados.dados_fornecedor.condicoes_pagamento,
                    observacoes_comerciais=dados.dados_fornecedor.observacoes_comerciais
                )
                db.add(forn_dados)
        
        db.commit()
        db.refresh(pessoa)
        
        return {
            "success": True,
            "message": "Pessoa atualizada com sucesso",
            "pessoa": {
                "id": str(pessoa.id),
                "nome": pessoa.nome,
                "documento": pessoa.documento
            }
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{pessoa_id}")
async def excluir_pessoa(
    pessoa_id: str,
    db: Session = Depends(get_db)
):
    """Exclui uma pessoa (soft delete)"""
    
    try:
        # Buscar pessoa
        pessoa = db.query(Pessoa).filter(Pessoa.id == pessoa_id).first()
        if not pessoa:
            raise HTTPException(status_code=404, detail="Pessoa não encontrada")
        
        # Soft delete
        pessoa.is_active = False
        
        # Desativar papéis
        db.query(PessoaPapel).filter(PessoaPapel.pessoa_id == pessoa_id).update(
            {"is_active": False}
        )
        
        db.commit()
        
        return {
            "success": True,
            "message": "Pessoa excluída com sucesso"
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/debug")
async def debug_pessoas(db: Session = Depends(get_db)):
    """Debug: Lista todas as pessoas e compara com query principal"""
    try:
        # Todas as pessoas
        todas_pessoas = db.query(Pessoa).all()
        
        # Pessoas ativas (query principal sem outros filtros)
        pessoas_ativas = db.query(Pessoa).filter(Pessoa.is_active == True).all()
        
        resultado_todas = []
        for pessoa in todas_pessoas:
            resultado_todas.append({
                "id": str(pessoa.id),
                "nome": pessoa.nome,
                "is_active": pessoa.is_active,
                "pessoa_tipo": pessoa.pessoa_tipo.value,
                "tem_papeis": len(pessoa.papeis) > 0,
                "papeis": [p.papel.value for p in pessoa.papeis],
                "papeis_ativos": [p.papel.value for p in pessoa.papeis if p.is_active]
            })
        
        resultado_ativas = []
        for pessoa in pessoas_ativas:
            resultado_ativas.append({
                "id": str(pessoa.id),
                "nome": pessoa.nome,
                "tem_papeis": len(pessoa.papeis) > 0,
                "papeis_ativos": [p.papel.value for p in pessoa.papeis if p.is_active]
            })
        
        return {
            "total_todas": len(todas_pessoas),
            "total_ativas": len(pessoas_ativas),
            "todas_pessoas": resultado_todas,
            "pessoas_ativas": resultado_ativas,
            "inativas": [p for p in resultado_todas if not p["is_active"]],
            "sem_papeis": [p for p in resultado_ativas if not p["tem_papeis"]]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all")
async def listar_todas_pessoas(db: Session = Depends(get_db)):
    """Lista TODAS as pessoas ativas sem paginação para debug"""
    try:
        pessoas = db.query(Pessoa).filter(Pessoa.is_active == True).order_by(Pessoa.nome).all()
        
        resultado = []
        for pessoa in pessoas:
            pessoa_data = {
                "id": str(pessoa.id),
                "nome": pessoa.nome,
                "pessoa_tipo": pessoa.pessoa_tipo.value,
                "documento": pessoa.documento,
                "is_active": pessoa.is_active,
                "papeis": [p.papel.value for p in pessoa.papeis if p.is_active] if pessoa.papeis else []
            }
            resultado.append(pessoa_data)
        
        return {
            "total": len(pessoas),
            "pessoas": resultado,
            "nomes": [p.nome for p in pessoas]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/clear-all")
async def clear_all_pessoas(db: Session = Depends(get_db)):
    """CUIDADO: Deleta TODOS os dados da tabela pessoas"""
    try:
        # Deletar papéis primeiro (por causa das foreign keys)
        db.query(PessoaPapel).delete()
        
        # Deletar dados específicos
        db.query(ClienteDados).delete()
        db.query(FuncionarioDados).delete()
        db.query(FornecedorDados).delete()
        
        # Deletar telefones e endereços se existirem
        from app.models.contact import Phone, Address
        db.query(Phone).filter(Phone.pessoa_id.isnot(None)).delete()
        db.query(Address).filter(Address.pessoa_id.isnot(None)).delete()
        
        # Deletar pessoas
        deleted_count = db.query(Pessoa).delete()
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Deletados {deleted_count} registros da tabela pessoas",
            "deleted_count": deleted_count
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/seed-test-data")
async def seed_test_data(db: Session = Depends(get_db)):
    """Insere 5 registros de teste na tabela pessoas"""
    try:
        # Dados de teste
        pessoas_teste = [
            {
                "nome": "Cliente Final",
                "pessoa_tipo": "PF",
                "documento": "12345678901",
                "email": "cliente.final@email.com",
                "papeis": ["CLIENTE"]
            },
            {
                "nome": "João Silva",
                "pessoa_tipo": "PF", 
                "documento": "98765432100",
                "rg": "123456789",
                "email": "joao.silva@email.com",
                "papeis": ["CLIENTE", "FUNCIONARIO"]
            },
            {
                "nome": "Empresa ABC Ltda",
                "pessoa_tipo": "PJ",
                "documento": "12345678000195",
                "ie": "123456789",
                "email": "contato@empresaabc.com",
                "papeis": ["FORNECEDOR"]
            },
            {
                "nome": "Maria Santos",
                "pessoa_tipo": "PF",
                "documento": "11122233344",
                "email": "maria.santos@email.com",
                "papeis": ["FUNCIONARIO"]
            },
            {
                "nome": "Fornecedor XYZ S.A.",
                "pessoa_tipo": "PJ",
                "documento": "98765432000123",
                "ie": "987654321",
                "email": "vendas@fornecedorxyz.com",
                "papeis": ["FORNECEDOR", "CLIENTE"]
            }
        ]
        
        pessoas_criadas = []
        
        for dados in pessoas_teste:
            # Criar pessoa
            pessoa = Pessoa(
                nome=dados["nome"],
                pessoa_tipo=dados["pessoa_tipo"],
                documento=dados["documento"],
                rg=dados.get("rg"),
                ie=dados.get("ie"),
                email=dados.get("email")
            )
            
            db.add(pessoa)
            db.flush()  # Para obter o ID
            
            # Adicionar papéis
            for papel_str in dados["papeis"]:
                papel_obj = PessoaPapel(
                    pessoa_id=pessoa.id,
                    papel=PapelPessoa(papel_str)
                )
                db.add(papel_obj)
            
            pessoas_criadas.append({
                "id": str(pessoa.id),
                "nome": pessoa.nome,
                "documento": pessoa.documento,
                "papeis": dados["papeis"]
            })
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Criados {len(pessoas_criadas)} registros de teste",
            "pessoas_criadas": pessoas_criadas
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check simples sem dependência de banco"""
    return {
        "status": "ok",
        "message": "API está funcionando",
        "timestamp": "2024-01-01T00:00:00Z"
    }


@router.get("/db-info")
async def db_info(db: Session = Depends(get_db)):
    """Mostra informações do banco de dados atual"""
    try:
        from app.config import settings
        
        # Verificar se consegue conectar
        db.execute(text("SELECT 1")).fetchone()
        
        # Executar query para verificar qual banco está sendo usado
        result = db.execute(text("SELECT version()")).fetchone()
        db_version = result[0] if result else "Desconhecido"
        
        # Verificar se é PostgreSQL
        is_postgresql = "PostgreSQL" in db_version
        
        # Verificar se tabela pessoas existe
        table_check = db.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'pessoas'
            )
        """)).fetchone()
        pessoas_table_exists = table_check[0] if table_check else False
        
        # Contar registros na tabela pessoas (se existir)
        pessoas_count = 0
        if pessoas_table_exists:
            count_result = db.execute(text("SELECT COUNT(*) FROM pessoas")).fetchone()
            pessoas_count = count_result[0] if count_result else 0
        
        return {
            "database_url": settings.database_url.replace("password", "***"),  # Ocultar senha
            "database_version": db_version,
            "is_postgresql": is_postgresql,
            "database_type": "PostgreSQL" if is_postgresql else "Outro",
            "pessoas_table_exists": pessoas_table_exists,
            "pessoas_count": pessoas_count,
            "connection_success": True
        }
        
    except Exception as e:
        from app.config import settings
        return {
            "database_url": settings.database_url.replace("password", "***"),
            "error": str(e),
            "database_type": "Erro ao conectar",
            "connection_success": False
        }



@router.get("/by-document/{documento}")
async def buscar_por_documento(
    documento: str,
    db: Session = Depends(get_db)
):
    """Busca pessoa por documento"""
    try:
        # Limpar documento (remover caracteres especiais)
        documento_limpo = documento.replace(".", "").replace("-", "").replace("/", "")
        
        pessoa = db.query(Pessoa).filter(Pessoa.documento == documento_limpo).first()
        if not pessoa:
            raise HTTPException(status_code=404, detail="Pessoa não encontrada")
        
        return {
            "id": str(pessoa.id),
            "nome": pessoa.nome,
            "pessoa_tipo": pessoa.pessoa_tipo.value,
            "documento": pessoa.documento,
            "rg": pessoa.rg,
            "ie": pessoa.ie,
            "email": pessoa.email,
            "observacoes": pessoa.observacoes,
            "is_active": pessoa.is_active,
            "created_at": pessoa.created_at.isoformat() if pessoa.created_at else None,
            "papeis": [p.papel.value for p in pessoa.papeis if p.is_active] if pessoa.papeis else []
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/papeis")
async def listar_papeis():
    """Lista os papéis disponíveis"""
    return {
        "papeis": [papel.value for papel in PapelPessoa]
    }


@router.get("/clientes")
async def listar_clientes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Lista apenas pessoas com papel de CLIENTE (compatibilidade)"""
    
    try:
        query = db.query(Pessoa).join(PessoaPapel).filter(
            PessoaPapel.papel == PapelPessoa.CLIENTE,
            PessoaPapel.is_active == True,
            Pessoa.is_active == True
        )
        
        pessoas = query.order_by(Pessoa.nome).offset(skip).limit(limit).all()
        total = query.count()
        
        # Formato compatível com frontend atual
        clientes = []
        for pessoa in pessoas:
            clientes.append({
                "id": str(pessoa.id),
                "name": pessoa.nome,  # Compatibilidade com frontend
                "person_type": pessoa.pessoa_tipo.value,
                "document": pessoa.documento,
                "rg": pessoa.rg,
                "ie": pessoa.ie,
                "email": pessoa.email,
                "phone": pessoa.telefones[0].number if pessoa.telefones else "",
                "address": pessoa.enderecos[0].street if pessoa.enderecos else "",
                "city": pessoa.enderecos[0].city if pessoa.enderecos else "",
                "state": pessoa.enderecos[0].state if pessoa.enderecos else "",
                "zip_code": pessoa.enderecos[0].zip_code if pessoa.enderecos else "",
                "is_active": pessoa.is_active,
                "created_at": pessoa.created_at.isoformat() if pessoa.created_at else None,
                "updated_at": pessoa.updated_at.isoformat() if pessoa.updated_at else None
            })
        
        return {
            "success": True,
            "data": clientes,
            "total": total
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fornecedores")
async def listar_fornecedores(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Lista apenas pessoas com papel de FORNECEDOR"""
    
    try:
        query = db.query(Pessoa).join(PessoaPapel).filter(
            PessoaPapel.papel == PapelPessoa.FORNECEDOR,
            PessoaPapel.is_active == True,
            Pessoa.is_active == True
        )
        
        pessoas = query.order_by(Pessoa.nome).offset(skip).limit(limit).all()
        
        fornecedores = []
        for pessoa in pessoas:
            fornecedores.append({
                "id": str(pessoa.id),
                "name": pessoa.nome,
                "person_type": pessoa.pessoa_tipo.value,
                "document": pessoa.documento,
                "ie": pessoa.ie,
                "email": pessoa.email,
                "phone": pessoa.telefones[0].number if pessoa.telefones else "",
                "is_active": pessoa.is_active,
                "created_at": pessoa.created_at.isoformat() if pessoa.created_at else None
            })
        
        return fornecedores
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))