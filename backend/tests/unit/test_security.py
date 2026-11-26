"""Kiểm thử đơn vị: băm mật khẩu và JWT (không cần CSDL)."""
import datetime as dt

import jwt
import pytest

from app.core import security
from app.core.config import JWT_SECRET


def test_hash_and_verify():
    h = security.hash_password("Matkhau@123")
    assert h != "Matkhau@123" and h.startswith("$2")
    assert security.verify_password("Matkhau@123", h)
    assert not security.verify_password("sai-mat-khau", h)


def test_verify_rejects_malformed_hash():
    assert security.verify_password("x", "$2b$12$demohash1000000000000000000001") is False
    assert security.verify_password("x", "khong-phai-bcrypt") is False


def test_long_password_is_truncated_consistently():
    pw = "a" * 100
    assert security.verify_password(pw, security.hash_password(pw))


def test_token_roundtrip_and_expiry():
    claims = jwt.decode(security.create_token(42), JWT_SECRET, algorithms=["HS256"])
    assert claims["sub"] == "42"
    assert claims["exp"] > dt.datetime.now(dt.timezone.utc).timestamp()


def test_token_with_wrong_secret_is_rejected():
    bad = jwt.encode({"sub": "1"}, "another-secret-key-another-secret!!", algorithm="HS256")
    with pytest.raises(jwt.InvalidSignatureError):
        jwt.decode(bad, JWT_SECRET, algorithms=["HS256"])
