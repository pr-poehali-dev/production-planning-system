"""
ВаСАП · files-api — загрузка и получение файлов через S3.

Действия:
  upload  — загрузить файл (base64) → возвращает {url, s3_key}
  delete  — удалить файл по s3_key
  url     — получить presigned URL для скачивания (на 1 час)
"""
import json
import os
import base64
import uuid
import boto3
from botocore.client import Config

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
}

BUCKET = 'files'
CDN_BASE = f"https://cdn.poehali.dev/projects/{os.environ.get('AWS_ACCESS_KEY_ID','')}/bucket"


def get_s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
        config=Config(signature_version='s3v4'),
    )


MIME_MAP = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'txt': 'text/plain', 'csv': 'text/csv',
}


def handler(event: dict, context) -> dict:
    """Загрузка/удаление файлов в S3. Файлы хранятся бессрочно."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', 'upload')
    s3 = get_s3()

    try:
        # ── UPLOAD ────────────────────────────────────────────────────────
        if action == 'upload':
            filename = body.get('filename', 'file')
            data_url = body.get('data', '')  # base64 или data:...;base64,...
            context_type = body.get('context', 'kb')  # kb / order / ai

            # Декодируем base64
            if ',' in data_url:
                data_url = data_url.split(',', 1)[1]
            # padding-safe decode
            padding = 4 - len(data_url) % 4
            if padding != 4:
                data_url += '=' * padding
            file_bytes = base64.b64decode(data_url)

            ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'bin'
            content_type = MIME_MAP.get(ext, 'application/octet-stream')

            # Уникальный ключ: vasap/{context}/{uuid}.{ext}
            s3_key = f"vasap/{context_type}/{uuid.uuid4().hex}.{ext}"

            s3.put_object(
                Bucket=BUCKET,
                Key=s3_key,
                Body=file_bytes,
                ContentType=content_type,
                ContentDisposition=f'attachment; filename="{filename}"',
            )

            cdn_url = f"{CDN_BASE}/{s3_key}"

            return {
                'statusCode': 200,
                'headers': {**CORS, 'Content-Type': 'application/json'},
                'body': json.dumps({
                    'ok': True,
                    's3_key': s3_key,
                    'url': cdn_url,
                    'filename': filename,
                    'size': len(file_bytes),
                }),
            }

        # ── DELETE ────────────────────────────────────────────────────────
        if action == 'delete':
            s3_key = body.get('s3_key', '')
            if not s3_key or not s3_key.startswith('vasap/'):
                return {
                    'statusCode': 400,
                    'headers': {**CORS, 'Content-Type': 'application/json'},
                    'body': json.dumps({'ok': False, 'error': 'Невалидный s3_key'}),
                }
            s3.delete_object(Bucket=BUCKET, Key=s3_key)
            return {
                'statusCode': 200,
                'headers': {**CORS, 'Content-Type': 'application/json'},
                'body': json.dumps({'ok': True}),
            }

        # ── URL (presigned для приватных файлов) ──────────────────────────
        if action == 'url':
            s3_key = body.get('s3_key', '')
            url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': BUCKET, 'Key': s3_key},
                ExpiresIn=3600,
            )
            return {
                'statusCode': 200,
                'headers': {**CORS, 'Content-Type': 'application/json'},
                'body': json.dumps({'ok': True, 'url': url}),
            }

        return {
            'statusCode': 400,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({'ok': False, 'error': f'Неизвестное действие: {action}'}),
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({'ok': False, 'error': str(e)}),
        }
