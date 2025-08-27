"""create sale_orders tables

Revision ID: 008_create_sale_orders_tables
Revises: 007_create_pessoa_tables
Create Date: 2025-01-18 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '008_create_sale_orders_tables'
down_revision = '007_create_pessoa_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Create sale_orders table
    op.create_table(
        'sale_orders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('number', sa.String(20), nullable=False, unique=True),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('clients.id'), nullable=True),
        sa.Column('order_date', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('delivery_date', sa.DateTime, nullable=True),
        sa.Column('status', sa.String(20), nullable=False, default='draft'),
        sa.Column('payment_method', sa.String(30), nullable=False, default='cash'),
        sa.Column('subtotal', sa.Numeric(10, 2), nullable=False, default=0),
        sa.Column('discount_percent', sa.Numeric(5, 2), default=0),
        sa.Column('discount_amount', sa.Numeric(10, 2), default=0),
        sa.Column('icms_total', sa.Numeric(10, 2), default=0),
        sa.Column('pis_total', sa.Numeric(10, 2), default=0),
        sa.Column('cofins_total', sa.Numeric(10, 2), default=0),
        sa.Column('tax_total', sa.Numeric(10, 2), default=0),
        sa.Column('total_amount', sa.Numeric(10, 2), nullable=False, default=0),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('internal_notes', sa.Text, nullable=True),
        sa.Column('delivery_address', sa.Text, nullable=True),
        sa.Column('seller_name', sa.String(100), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # Create sale_order_items table
    op.create_table(
        'sale_order_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('sale_order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sale_orders.id'), nullable=False),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('products.id'), nullable=False),
        sa.Column('quantity', sa.Numeric(10, 3), nullable=False),
        sa.Column('unit_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('discount_percent', sa.Numeric(5, 2), default=0),
        sa.Column('discount_amount', sa.Numeric(10, 2), default=0),
        sa.Column('gross_total', sa.Numeric(10, 2), nullable=False),
        sa.Column('net_total', sa.Numeric(10, 2), nullable=False),
        sa.Column('icms_rate', sa.Numeric(5, 2), default=0),
        sa.Column('pis_rate', sa.Numeric(5, 2), default=0),
        sa.Column('cofins_rate', sa.Numeric(5, 2), default=0),
        sa.Column('icms_amount', sa.Numeric(10, 2), default=0),
        sa.Column('pis_amount', sa.Numeric(10, 2), default=0),
        sa.Column('cofins_amount', sa.Numeric(10, 2), default=0),
        sa.Column('created_at', sa.DateTime, default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # Create indexes for better performance
    op.create_index('idx_sale_orders_number', 'sale_orders', ['number'])
    op.create_index('idx_sale_orders_client_id', 'sale_orders', ['client_id'])
    op.create_index('idx_sale_orders_status', 'sale_orders', ['status'])
    op.create_index('idx_sale_orders_order_date', 'sale_orders', ['order_date'])
    op.create_index('idx_sale_order_items_sale_order_id', 'sale_order_items', ['sale_order_id'])
    op.create_index('idx_sale_order_items_product_id', 'sale_order_items', ['product_id'])


def downgrade():
    # Drop indexes
    op.drop_index('idx_sale_order_items_product_id', table_name='sale_order_items')
    op.drop_index('idx_sale_order_items_sale_order_id', table_name='sale_order_items')
    op.drop_index('idx_sale_orders_order_date', table_name='sale_orders')
    op.drop_index('idx_sale_orders_status', table_name='sale_orders')
    op.drop_index('idx_sale_orders_client_id', table_name='sale_orders')
    op.drop_index('idx_sale_orders_number', table_name='sale_orders')
    
    # Drop tables
    op.drop_table('sale_order_items')
    op.drop_table('sale_orders')