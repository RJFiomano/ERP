"""Create pessoa system tables

Revision ID: 007_create_pessoa_tables
Revises: 006_add_pessoa_id_to_contacts
Create Date: 2025-08-17 20:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '007_create_pessoa_tables'
down_revision = '006_add_pessoa_id_to_contacts'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create person type enum if not exists
    person_type_enum = sa.Enum('PF', 'PJ', name='persontype')
    person_type_enum.create(op.get_bind(), checkfirst=True)
    
    # Create papel pessoa enum if not exists
    papel_pessoa_enum = sa.Enum('CLIENTE', 'CLIENTE_FINAL', 'FUNCIONARIO', 'FORNECEDOR', name='papelpessoa')
    papel_pessoa_enum.create(op.get_bind(), checkfirst=True)
    
    # Create pessoas table if not exists
    op.create_table('pessoas',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('nome', sa.String(length=255), nullable=False),
        sa.Column('pessoa_tipo', person_type_enum, nullable=False),
        sa.Column('documento', sa.String(length=20), nullable=False),
        sa.Column('rg', sa.String(length=20), nullable=True),
        sa.Column('ie', sa.String(length=20), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('documento')
    )
    
    # Create pessoa_papeis table
    op.create_table('pessoa_papeis',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('pessoa_id', sa.String(), nullable=False),
        sa.Column('papel', papel_pessoa_enum, nullable=False),
        sa.Column('data_inicio', sa.Date(), nullable=True),
        sa.Column('data_fim', sa.Date(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['pessoa_id'], ['pessoas.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create clientes_dados table
    op.create_table('clientes_dados',
        sa.Column('pessoa_id', sa.String(), nullable=False),
        sa.Column('limite_credito', sa.Numeric(precision=10, scale=2), nullable=True, default=0),
        sa.Column('prazo_pagamento', sa.Integer(), nullable=True, default=30),
        sa.Column('observacoes_comerciais', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['pessoa_id'], ['pessoas.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('pessoa_id')
    )
    
    # Create funcionarios_dados table
    op.create_table('funcionarios_dados',
        sa.Column('pessoa_id', sa.String(), nullable=False),
        sa.Column('cargo', sa.String(length=100), nullable=True),
        sa.Column('salario', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('data_admissao', sa.Date(), nullable=True),
        sa.Column('pis', sa.String(length=20), nullable=True),
        sa.Column('ctps', sa.String(length=20), nullable=True),
        sa.Column('departamento', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['pessoa_id'], ['pessoas.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('pessoa_id')
    )
    
    # Create fornecedores_dados table
    op.create_table('fornecedores_dados',
        sa.Column('pessoa_id', sa.String(), nullable=False),
        sa.Column('prazo_entrega', sa.Integer(), nullable=True),
        sa.Column('condicoes_pagamento', sa.String(length=255), nullable=True),
        sa.Column('observacoes_comerciais', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['pessoa_id'], ['pessoas.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('pessoa_id')
    )


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('fornecedores_dados')
    op.drop_table('funcionarios_dados')
    op.drop_table('clientes_dados')
    op.drop_table('pessoa_papeis')
    op.drop_table('pessoas')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS papelpessoa')
    op.execute('DROP TYPE IF EXISTS persontype')