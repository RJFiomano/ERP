"""Add pessoa_id to phones and addresses tables

Revision ID: 006_add_pessoa_id_to_contacts
Revises: 005_add_multiple_contacts  
Create Date: 2025-08-17 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006_add_pessoa_id_to_contacts'
down_revision = '005_add_multiple_contacts'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add pessoa_id column to phones table
    op.add_column('phones', sa.Column('pessoa_id', sa.String(), nullable=True))
    op.create_foreign_key('fk_phones_pessoa_id', 'phones', 'pessoas', ['pessoa_id'], ['id'], ondelete='CASCADE')
    op.create_index('ix_phones_pessoa_id', 'phones', ['pessoa_id'], unique=False)
    
    # Add pessoa_id column to addresses table  
    op.add_column('addresses', sa.Column('pessoa_id', sa.String(), nullable=True))
    op.create_foreign_key('fk_addresses_pessoa_id', 'addresses', 'pessoas', ['pessoa_id'], ['id'], ondelete='CASCADE')
    op.create_index('ix_addresses_pessoa_id', 'addresses', ['pessoa_id'], unique=False)


def downgrade() -> None:
    # Remove pessoa_id from addresses table
    op.drop_index('ix_addresses_pessoa_id', table_name='addresses')
    op.drop_constraint('fk_addresses_pessoa_id', 'addresses', type_='foreignkey')
    op.drop_column('addresses', 'pessoa_id')
    
    # Remove pessoa_id from phones table
    op.drop_index('ix_phones_pessoa_id', table_name='phones')
    op.drop_constraint('fk_phones_pessoa_id', 'phones', type_='foreignkey')
    op.drop_column('phones', 'pessoa_id')