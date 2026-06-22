"""
Авторизация и управление пользователями системы ВаСАП.
Действия: login, verify, list_users, create_user, update_user, delete_user.
Роли: admin (всё), itr (ИТР), warehouse (кладовщик), viewer (только просмотр).
"""
import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
}

ROLES = {'admin', 'itr', 'warehouse', 'viewer'}


def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def json_resp(status: int, data: dict) -> dict:
    return {
        'statusCode': status,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, default=str),
    }


def get_user_by_token(cur, token: str):
    cur.execute(
        "SELECT u.id, u.login, u.full_name, u.role, u.is_active "
        "FROM user_sessions s JOIN users u ON u.id = s.user_id "
        "WHERE s.token = %s AND s.expires_at > NOW()",
        (token,)
    )
    return cur.fetchone()


def handler(event: dict, context) -> dict:
    """Авторизация и CRUD пользователей ВаСАП."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', '')
    headers = event.get('headers', {})
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token', '')

    conn = get_conn()
    cur = conn.cursor()
    try:
        # ── LOGIN ──
        if action == 'login':
            login = (body.get('login') or '').strip()
            password = body.get('password') or ''
            cur.execute(
                "SELECT id, login, full_name, role, is_active, password_hash FROM users WHERE login = %s",
                (login,)
            )
            row = cur.fetchone()
            if not row or row[5] != hash_pw(password):
                return json_resp(401, {'ok': False, 'error': 'Неверный логин или пароль'})
            if not row[4]:
                return json_resp(403, {'ok': False, 'error': 'Учётная запись отключена'})
            new_token = secrets.token_hex(32)
            expires = datetime.utcnow() + timedelta(days=30)
            cur.execute(
                "INSERT INTO user_sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
                (row[0], new_token, expires)
            )
            conn.commit()
            return json_resp(200, {
                'ok': True, 'token': new_token,
                'user': {'id': row[0], 'login': row[1], 'fullName': row[2], 'role': row[3]},
            })

        # ── VERIFY (по токену) ──
        if action == 'verify':
            user = get_user_by_token(cur, token)
            if not user:
                return json_resp(401, {'ok': False, 'error': 'Сессия истекла'})
            return json_resp(200, {
                'ok': True,
                'user': {'id': user[0], 'login': user[1], 'fullName': user[2], 'role': user[3]},
            })

        # ── LOGOUT ──
        if action == 'logout':
            if token:
                cur.execute("DELETE FROM user_sessions WHERE token = %s", (token,))
                conn.commit()
            return json_resp(200, {'ok': True})

        # Дальше — только для админа
        admin = get_user_by_token(cur, token)
        if not admin or admin[3] != 'admin':
            return json_resp(403, {'ok': False, 'error': 'Доступ только для администратора'})

        # ── LIST USERS ──
        if action == 'list_users':
            cur.execute("SELECT id, login, full_name, role, is_active, created_at FROM users ORDER BY id")
            rows = cur.fetchall()
            users = [{
                'id': r[0], 'login': r[1], 'fullName': r[2], 'role': r[3],
                'isActive': r[4], 'createdAt': r[5].strftime('%d.%m.%Y') if r[5] else '',
            } for r in rows]
            return json_resp(200, {'ok': True, 'users': users})

        # ── CREATE USER ──
        if action == 'create_user':
            login = (body.get('login') or '').strip()
            password = body.get('password') or ''
            full_name = (body.get('fullName') or '').strip()
            role = body.get('role', 'viewer')
            if not login or not password or not full_name:
                return json_resp(400, {'ok': False, 'error': 'Заполните все поля'})
            if role not in ROLES:
                return json_resp(400, {'ok': False, 'error': 'Недопустимая роль'})
            cur.execute("SELECT id FROM users WHERE login = %s", (login,))
            if cur.fetchone():
                return json_resp(409, {'ok': False, 'error': 'Логин уже занят'})
            cur.execute(
                "INSERT INTO users (login, password_hash, full_name, role) VALUES (%s, %s, %s, %s) RETURNING id",
                (login, hash_pw(password), full_name, role)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return json_resp(200, {'ok': True, 'id': new_id})

        # ── UPDATE USER ──
        if action == 'update_user':
            uid = body.get('id')
            fields = []
            params = []
            if body.get('fullName') is not None:
                fields.append("full_name = %s"); params.append(body['fullName'])
            if body.get('role') is not None:
                if body['role'] not in ROLES:
                    return json_resp(400, {'ok': False, 'error': 'Недопустимая роль'})
                fields.append("role = %s"); params.append(body['role'])
            if body.get('isActive') is not None:
                fields.append("is_active = %s"); params.append(bool(body['isActive']))
            if body.get('password'):
                fields.append("password_hash = %s"); params.append(hash_pw(body['password']))
            if not fields:
                return json_resp(400, {'ok': False, 'error': 'Нет данных для обновления'})
            params.append(uid)
            cur.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = %s", params)
            conn.commit()
            return json_resp(200, {'ok': True})

        # ── DELETE USER ──
        if action == 'delete_user':
            uid = body.get('id')
            if uid == admin[0]:
                return json_resp(400, {'ok': False, 'error': 'Нельзя удалить самого себя'})
            cur.execute("DELETE FROM user_sessions WHERE user_id = %s", (uid,))
            cur.execute("DELETE FROM users WHERE id = %s AND role != 'admin' OR id = %s", (uid, uid))
            conn.commit()
            return json_resp(200, {'ok': True})

        return json_resp(400, {'ok': False, 'error': 'Неизвестное действие'})

    except Exception as e:
        conn.rollback()
        return json_resp(500, {'ok': False, 'error': str(e)})
    finally:
        cur.close()
        conn.close()
