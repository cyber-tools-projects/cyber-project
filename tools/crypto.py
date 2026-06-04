from base64 import b64encode, b64decode
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from hashlib import sha256

def _get_key(password):
    return sha256(password.encode()).digest()

def encrypt_data(data, password):
    key = _get_key(password)
    cipher = AES.new(key, AES.MODE_CBC)
    ct_bytes = cipher.encrypt(pad(data, AES.block_size))
    iv = b64encode(cipher.iv).decode('utf-8')
    ct = b64encode(ct_bytes).decode('utf-8')
    return iv, ct

def decrypt_data(iv, ciphertext, password):
    try:
        key = _get_key(password)
        iv_bytes = b64decode(iv)
        ct_bytes = b64decode(ciphertext)
        cipher = AES.new(key, AES.MODE_CBC, iv_bytes)
        pt = unpad(cipher.decrypt(ct_bytes), AES.block_size)
        return pt
    except Exception as e:
        return None
