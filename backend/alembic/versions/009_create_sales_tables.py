"""create sales tables

Revision ID: 009_create_sales_tables
Revises: 008_create_sale_orders_tables
Create Date: 2025-01-18 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '009_create_sales_tables'
down_revision = '008_create_sale_orders_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Create enum for sale status
    sale_status_enum = postgresql.ENUM('draft', 'confirmed', 'invoiced', 'cancelled', name='salestatus')
    sale_status_enum.create(op.get_bind())

    # Create sales table
    op.create_table('sales',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('number', sa.String(length=50), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sale_date', sa.DateTime(), nullable=True),
        sa.Column('status', sale_status_enum, nullable=True),
        sa.Column('subtotal', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('tax_total', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('total', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('notes', sa.String(length=1000), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('number')
    )
    
    op.create_index(op.f('ix_sales_id'), 'sales', ['id'], unique=False)

    # Create sale_items table
    op.create_table('sale_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sale_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('subtotal', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('icms_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('pis_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('cofins_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index(op.f('ix_sale_items_id'), 'sale_items', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_sale_items_id'), table_name='sale_items')
    op.drop_table('sale_items')
    op.drop_index(op.f('ix_sales_id'), table_name='sales')
    op.drop_table('sales')
    
    # Drop enum
    sale_status_enum = postgresql.ENUM('draft', 'confirmed', 'invoiced', 'cancelled', name='salestatus')
    sale_status_enum.drop(op.get_bind())