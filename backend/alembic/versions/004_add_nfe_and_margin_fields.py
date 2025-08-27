"""Add NF-e and margin fields

Revision ID: 004
Revises: 003
Create Date: 2025-08-15 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new NF-e fields to products
    op.add_column('products', sa.Column('ean_gtin', sa.String(length=14), nullable=True))
    op.add_column('products', sa.Column('unit', sa.String(length=10), nullable=True, default='UN'))
    op.add_column('products', sa.Column('origin', sa.String(length=1), nullable=True, default='0'))
    
    # Add detailed ICMS fields
    op.add_column('products', sa.Column('icms_cst', sa.String(length=3), nullable=True))
    op.add_column('products', sa.Column('icms_base_calc', sa.Numeric(precision=10, scale=2), nullable=True, default=0))
    op.add_column('products', sa.Column('icms_reduction', sa.Numeric(precision=5, scale=2), nullable=True, default=0))
    
    # Add IPI fields
    op.add_column('products', sa.Column('ipi_cst', sa.String(length=3), nullable=True))
    op.add_column('products', sa.Column('ipi_rate', sa.Numeric(precision=5, scale=2), nullable=True, default=0))
    
    # Add detailed PIS/COFINS fields
    op.add_column('products', sa.Column('pis_cst', sa.String(length=3), nullable=True))
    op.add_column('products', sa.Column('cofins_cst', sa.String(length=3), nullable=True))
    
    # Add margin system fields to products
    op.add_column('products', sa.Column('margin_type', sa.String(length=20), nullable=True, default='manual'))
    op.add_column('products', sa.Column('margin_percentage', sa.Numeric(precision=5, scale=2), nullable=True))
    op.add_column('products', sa.Column('use_category_margin', sa.Boolean(), nullable=True, default=False))
    
    # Add margin field to categories
    op.add_column('categories', sa.Column('default_margin_percentage', sa.Numeric(precision=5, scale=2), nullable=True))
    
    # Update existing records with default values
    op.execute("UPDATE products SET unit = 'UN' WHERE unit IS NULL")
    op.execute("UPDATE products SET origin = '0' WHERE origin IS NULL")
    op.execute("UPDATE products SET margin_type = 'manual' WHERE margin_type IS NULL")
    op.execute("UPDATE products SET use_category_margin = false WHERE use_category_margin IS NULL")


def downgrade() -> None:
    # Remove margin field from categories
    op.drop_column('categories', 'default_margin_percentage')
    
    # Remove margin system fields from products
    op.drop_column('products', 'use_category_margin')
    op.drop_column('products', 'margin_percentage')
    op.drop_column('products', 'margin_type')
    
    # Remove detailed PIS/COFINS fields
    op.drop_column('products', 'cofins_cst')
    op.drop_column('products', 'pis_cst')
    
    # Remove IPI fields
    op.drop_column('products', 'ipi_rate')
    op.drop_column('products', 'ipi_cst')
    
    # Remove detailed ICMS fields
    op.drop_column('products', 'icms_reduction')
    op.drop_column('products', 'icms_base_calc')
    op.drop_column('products', 'icms_cst')
    
    # Remove NF-e fields from products
    op.drop_column('products', 'origin')
    op.drop_column('products', 'unit')
    op.drop_column('products', 'ean_gtin')