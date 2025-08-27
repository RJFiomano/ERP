"""Add multiple contacts support

Revision ID: 005_add_multiple_contacts
Revises: 004_add_nfe_and_margin_fields
Create Date: 2025-08-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005_add_multiple_contacts'
down_revision = '004_add_nfe_and_margin_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create phone types enum
    phone_type_enum = sa.Enum(
        'mobile', 'home', 'work', 'fax', 'whatsapp',
        name='phonetype'
    )
    phone_type_enum.create(op.get_bind())
    
    # Create address types enum
    address_type_enum = sa.Enum(
        'main', 'billing', 'delivery', 'work', 'other',
        name='addresstype'
    )
    address_type_enum.create(op.get_bind())
    
    # Create phones table
    op.create_table('phones',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('number', sa.String(length=20), nullable=False),
        sa.Column('type', phone_type_enum, nullable=True),
        sa.Column('is_whatsapp', sa.Boolean(), nullable=True),
        sa.Column('is_primary', sa.Boolean(), nullable=True),
        sa.Column('notes', sa.String(length=255), nullable=True),
        sa.Column('client_id', sa.String(), nullable=True),
        sa.Column('supplier_id', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ),
        sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_phones_client_id'), 'phones', ['client_id'], unique=False)
    op.create_index(op.f('ix_phones_supplier_id'), 'phones', ['supplier_id'], unique=False)
    
    # Create addresses table
    op.create_table('addresses',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('type', address_type_enum, nullable=True),
        sa.Column('is_primary', sa.Boolean(), nullable=True),
        sa.Column('street', sa.String(length=500), nullable=False),
        sa.Column('number', sa.String(length=20), nullable=True),
        sa.Column('complement', sa.String(length=255), nullable=True),
        sa.Column('neighborhood', sa.String(length=100), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=False),
        sa.Column('state', sa.String(length=2), nullable=False),
        sa.Column('zip_code', sa.String(length=10), nullable=False),
        sa.Column('notes', sa.String(length=255), nullable=True),
        sa.Column('client_id', sa.String(), nullable=True),
        sa.Column('supplier_id', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ),
        sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_addresses_client_id'), 'addresses', ['client_id'], unique=False)
    op.create_index(op.f('ix_addresses_supplier_id'), 'addresses', ['supplier_id'], unique=False)


def downgrade() -> None:
    # Drop tables
    op.drop_index(op.f('ix_addresses_supplier_id'), table_name='addresses')
    op.drop_index(op.f('ix_addresses_client_id'), table_name='addresses')
    op.drop_table('addresses')
    
    op.drop_index(op.f('ix_phones_supplier_id'), table_name='phones')
    op.drop_index(op.f('ix_phones_client_id'), table_name='phones')
    op.drop_table('phones')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS addresstype')
    op.execute('DROP TYPE IF EXISTS phonetype')