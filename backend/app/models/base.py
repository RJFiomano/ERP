import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, DateTime, String, TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.engine import Dialect
from app.core.database import Base

# Timezone do Brasil (UTC-3)
BR_TIMEZONE = timezone(timedelta(hours=-3))

def br_now():
    """Retorna datetime atual no fuso horário do Brasil"""
    return datetime.now(BR_TIMEZONE)


class GUID(TypeDecorator):
    """Platform-independent GUID type.
    
    Uses PostgreSQL's UUID type, otherwise uses CHAR(32), storing as stringified hex values.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect: Dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PostgresUUID())
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect: Dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                return str(value)
            else:
                return str(value)

    def process_result_value(self, value, dialect: Dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return uuid.UUID(value)
            return value


class BaseModel(Base):
    __abstract__ = True
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=br_now)
    updated_at = Column(DateTime, default=br_now, onupdate=br_now)
    deleted_at = Column(DateTime, nullable=True)