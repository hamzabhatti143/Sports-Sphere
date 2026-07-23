#!/usr/bin/env python3
import jwt
from datetime import datetime, timedelta, timezone
import os

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

print(f"SECRET_KEY: {SECRET_KEY}")
print(f"ALGORITHM: {ALGORITHM}")
print()

# Test 1: Create a token
print("=== TEST 1: Creating Token ===")
data = {"sub": 1, "role": "venue_owner"}
expire = datetime.now(timezone.utc) + timedelta(minutes=60)
to_encode = data.copy()
to_encode.update({"exp": expire})

try:
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    print(f"Token created successfully:")
    print(f"  {token[:50]}...")
    print()
except Exception as e:
    print(f"ERROR creating token: {e}")
    exit(1)

# Test 2: Decode the token
print("=== TEST 2: Decoding Token ===")
try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    print(f"Token decoded successfully:")
    print(f"  Payload: {payload}")
    print()
except jwt.JWTError as e:
    print(f"JWT Error: {e}")
    exit(1)
except Exception as e:
    print(f"Unexpected error: {e}")
    exit(1)

print("=== SUCCESS: JWT operations work correctly ===")
