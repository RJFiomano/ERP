import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token, get_current_user
from app.models.user import User
from app.models.password_reset import PasswordResetToken
from app.schemas.auth import LoginRequest, LoginResponse, RefreshTokenRequest, RefreshTokenResponse, ForgotPasswordRequest, ResetPasswordRequest, MessageResponse
from app.services.email_service import email_service
from app.config import settings

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário inativo"
        )
    
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    )


@router.post("/refresh", response_model=RefreshTokenResponse)
def refresh_token(token_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(token_data.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido"
            )
        
        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuário não encontrado"
            )
        
        new_access_token = create_access_token(subject=str(user.id))
        
        return RefreshTokenResponse(access_token=new_access_token)
        
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )


@router.get("/me")
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role
    }


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(forgot_data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == forgot_data.email).first()
    
    if not user:
        # Retorna sucesso mesmo se usuário não existe (segurança)
        return MessageResponse(message="Se o email existir, você receberá instruções para redefinir sua senha.")
    
    # Gera token de reset
    reset_token = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(hours=1)
    
    # Remove tokens antigos do usuário
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete()
    
    # Cria novo token
    password_reset = PasswordResetToken(
        user_id=user.id,
        token=reset_token,
        expires_at=expires_at
    )
    db.add(password_reset)
    db.commit()
    
    # Envia email
    reset_link = f"{settings.frontend_url}/reset-password?token={reset_token}"
    email_service.send_password_reset_email(user.email, reset_link)
    
    return MessageResponse(message="Se o email existir, você receberá instruções para redefinir sua senha.")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(reset_data: ResetPasswordRequest, db: Session = Depends(get_db)):
    # Busca token válido
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == reset_data.token,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > datetime.utcnow()
    ).first()
    
    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido ou expirado"
        )
    
    # Busca usuário
    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    # Atualiza senha
    user.password_hash = get_password_hash(reset_data.new_password)
    
    # Marca token como usado
    reset_token.used = True
    
    db.commit()
    
    return MessageResponse(message="Senha redefinida com sucesso")


@router.post("/logout", response_model=MessageResponse)
def logout():
    # No JWT stateless, logout é handled no frontend
    return MessageResponse(message="Logout realizado com sucesso")