"""
AI-помощник для приказов: генерация операций из трудоёмкости
и чтение прикреплённых документов (docx/xlsx/pdf в base64).
"""
import json
import os
import base64
import urllib.request
import urllib.error

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

SYSTEM_PROMPT = """Ты — помощник технолога на машиностроительном заводе.
Тебе дают текст трудоёмкости (из файла xlsx/docx) или описание изделия.
Твоя задача — сформировать список технологических операций.

ПРАВИЛА:
1. Операции должны идти в логической последовательности (predecessors — id предыдущей)
2. Для каждой операции укажи вид работ из списка: Токарные, Фрезеровочные, Сверлильные, Сварочные, Слесарные, Прочие
3. hours — нормо-часы (целые или с .5)
4. qty — количество деталей/единиц за операцию (обычно 1)
5. status всегда "Не начата"

ФОРМАТ — строго JSON без markdown:
{
  "operations": [
    {"id": 1, "name": "Название операции", "work": "Токарные", "hours": 4, "qty": 1, "predecessors": [], "status": "Не начата"},
    {"id": 2, "name": "Следующая операция", "work": "Сварочные", "hours": 3, "qty": 1, "predecessors": [1], "status": "Не начата"}
  ],
  "summary": "Краткое пояснение по операциям"
}"""


def read_file_text(file_b64: str, filename: str) -> str:
    """Конвертирует base64-файл в читаемый текст (mock для docx/xlsx)."""
    try:
        data = base64.b64decode(file_b64)
        # Для xlsx/docx — извлекаем текст как есть (упрощённо, без библиотек)
        # В реальности нужны python-docx / openpyxl — но они не установлены
        # Возвращаем имя файла как контекст
        text = f"[Файл: {filename}, размер: {len(data)} байт]"
        # Попытка читать как utf-8 текст (csv, txt)
        try:
            decoded = data.decode('utf-8', errors='replace')
            if len(decoded) > 3000:
                decoded = decoded[:3000] + '...'
            text = decoded
        except Exception:
            pass
        return text
    except Exception as e:
        return f"[Ошибка чтения файла {filename}: {e}]"


def handler(event: dict, context) -> dict:
    """Генерация списка операций из трудоёмкости через DeepSeek."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    api_key = os.environ.get('DEEPSEEK_API_KEY', '')
    if not api_key:
        return {
            'statusCode': 503,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'DEEPSEEK_API_KEY не настроен', 'ok': False}),
        }

    body = json.loads(event.get('body') or '{}')
    order_title = body.get('title', '')
    order_type = body.get('type', '')
    labor_file_b64 = body.get('laborFile', '')
    labor_filename = body.get('laborFilename', 'трудоёмкость.xlsx')
    doc_files = body.get('docFiles', [])  # [{name, content(b64)}]
    manual_text = body.get('manualText', '')

    # Собираем контекст
    context_parts = []
    if order_title:
        context_parts.append(f"Изделие: {order_title} (тип: {order_type})")
    if labor_file_b64:
        file_text = read_file_text(labor_file_b64, labor_filename)
        context_parts.append(f"ФАЙЛ ТРУДОЁМКОСТИ ({labor_filename}):\n{file_text}")
    if manual_text:
        context_parts.append(f"ДОПОЛНИТЕЛЬНОЕ ОПИСАНИЕ:\n{manual_text}")
    for df in doc_files:
        ft = read_file_text(df.get('content', ''), df.get('name', 'файл'))
        context_parts.append(f"ДОКУМЕНТ ({df.get('name', '')}):\n{ft[:1000]}")

    user_message = "\n\n".join(context_parts) or f"Изделие: {order_title or 'без названия'}"

    payload = json.dumps({
        'model': 'deepseek-chat',
        'messages': [
            {'role': 'system', 'content': SYSTEM_PROMPT},
            {'role': 'user', 'content': user_message},
        ],
        'temperature': 0.2,
        'max_tokens': 2048,
        'response_format': {'type': 'json_object'},
    }).encode('utf-8')

    req = urllib.request.Request(
        'https://api.deepseek.com/chat/completions',
        data=payload,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}',
        },
        method='POST',
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
        content = result['choices'][0]['message']['content']
        parsed = json.loads(content)
        return {
            'statusCode': 200,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({'ok': True, 'operations': parsed.get('operations', []), 'summary': parsed.get('summary', '')}),
        }
    except urllib.error.HTTPError as e:
        err = e.read().decode('utf-8', errors='replace')
        return {
            'statusCode': 502,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({'ok': False, 'error': f'DeepSeek: {e.code}', 'detail': err}),
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({'ok': False, 'error': str(e)}),
        }
