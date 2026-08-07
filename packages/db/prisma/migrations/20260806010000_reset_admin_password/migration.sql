-- Reseteo de contraseña solicitado explícitamente por el usuario (6/8/2026):
-- quedó bloqueado de su propia cuenta de administrador. Hash bcrypt y valor
-- cifrado (AES-256-GCM con CREDENTIALS_ENCRYPTION_KEY) calculados fuera de
-- este archivo; nunca se guarda la contraseña en texto plano en el repo.
UPDATE "User"
SET "passwordHash" = '$2a$12$1JKu1ISCzjHw6EInjoXyBOaBvcjsHo2QXFVLFu7ROQkZSXExX6C6y',
    "initialPasswordEncrypted" = 'MnLE6s2JPq/89vRU:4gUQvqJV+4Y/KNKuOSapEA==:4h5r+w8WEKzwlWxxkMQ='
WHERE "email" = 'miltondavila@gmail.com';
