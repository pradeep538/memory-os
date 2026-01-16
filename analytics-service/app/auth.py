"""
Firebase Authentication Middleware for Analytics Service
"""
import os
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from functools import lru_cache

# Security scheme
security = HTTPBearer(auto_error=False)

# Demo user for development
DEMO_USER_ID = "00000000-0000-0000-0000-000000000000"

@lru_cache()
def initialize_firebase():
    """Initialize Firebase Admin SDK (cached, runs once)"""
    if firebase_admin._apps:
        return True
    
    try:
        # Check for service account path
        service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
        
        if service_account_path:
            print(f"📂 Loading Firebase from: {service_account_path}")
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase Admin initialized in Python service")
            return True
        else:
            print("⚠️  Firebase not configured in Python service - will use demo mode")
            return False
    except Exception as e:
        print(f"❌ Firebase initialization failed in Python: {e}")
        return False


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> str:
    """
    Verify Firebase token and return user ID
    Falls back to demo user in development if token is invalid
    """
    # Check if running in development mode
    is_dev = os.getenv('ENVIRONMENT', 'development') == 'development'
    
    # No credentials provided
    if not credentials:
        if is_dev:
            print("🔓 No auth header - using demo user (dev mode)")
            return DEMO_USER_ID
        raise HTTPException(
            status_code=401,
            detail="Authorization header required"
        )
    
    token = credentials.credentials
    
    # Initialize Firebase if not already done
    firebase_initialized = initialize_firebase()
    
    if not firebase_initialized:
        if is_dev:
            print("🔓 Firebase not initialized - using demo user (dev mode)")
            return DEMO_USER_ID
        raise HTTPException(
            status_code=500,
            detail="Authentication service not configured"
        )
    
    try:
        # Verify the Firebase ID token
        decoded_token = auth.verify_id_token(token)
        user_id = decoded_token['uid']
        print(f"✅ Authenticated user: {user_id}")
        return user_id
    
    except auth.InvalidIdTokenError:
        if is_dev:
            print("🔓 Invalid token - using demo user (dev mode)")
            return DEMO_USER_ID
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )
    except auth.ExpiredIdTokenError:
        if is_dev:
            print("🔓 Expired token - using demo user (dev mode)")
            return DEMO_USER_ID
        raise HTTPException(
            status_code=401,
            detail="Token expired. Please sign in again."
        )
    except Exception as e:
        if is_dev:
            print(f"🔓 Auth error: {e} - using demo user (dev mode)")
            return DEMO_USER_ID
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}"
        )


def verify_user_access(user_id: str, requested_user_id: str, is_dev: bool = True):
    """
    Verify that the authenticated user can access the requested user's data
    """
    # In dev mode, allow demo user to access any data
    if is_dev and user_id == DEMO_USER_ID:
        return True
    
    # In production or with real users, strict matching
    if user_id != requested_user_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: You can only access your own data"
        )
    
    return True
