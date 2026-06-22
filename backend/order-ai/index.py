"""
ВаСАП · AI-генерация операций из трудоёмкости.

Принципы:
- docx читается как ZIP (xml) — извлекаем текст без сторонних библиотек
- xlsx читается как ZIP (xml) — извлекаем строки из sharedStrings
- Промпт сжатый, температура низкая → меньше токенов, точнее результат
- Вызывается ТОЛЬКО при загрузке файла трудоёмкости (не автоматически)
"""
import json
import os
import base64
import io
import re
import zipfile
import urllib.request
import urllib.error

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

# ─── Чтение файлов ────────────────────────────────────────────────────────────

def extract_docx_text(data: bytes) -> str:
    """Читает .docx (ZIP с XML) и возвращает plain text."""
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            if 'word/document.xml' not in z.namelist():
                return '[docx: структура не распознана]'
            xml = z.read('word/document.xml').decode('utf-8', errors='replace')
            # Удаляем XML-теги, оставляем текст
            text = re.sub(r'<w:br[^/]*/>', '\n', xml)
            text = re.sub(r'<w:p[ />]', '\n', text)
            text = re.sub(r'<[^>]+>', '', text)
            text = re.sub(r'\n{3,}', '\n\n', text).strip()
            return text[:4000] if len(text) > 4000 else text
    except Exception as e:
        return f'[docx: ошибка чтения — {e}]'


def extract_xlsx_text(data: bytes) -> str:
    """Читает .xlsx (ZIP с XML) и возвращает строки таблицы."""
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            names = z.namelist()
            # Shared strings — словарь текстовых значений
            shared = []
            if 'xl/sharedStrings.xml' in names:
                ss_xml = z.read('xl/sharedStrings.xml').decode('utf-8', errors='replace')
                shared = re.findall(r'<t[^>]*>([^<]*)</t>', ss_xml)

            # Читаем первый лист
            sheet_path = next((n for n in names if re.match(r'xl/worksheets/sheet\d+\.xml', n)), None)
            if not sheet_path:
                return '[xlsx: листы не найдены]'

            sheet_xml = z.read(sheet_path).decode('utf-8', errors='replace')
            rows = re.findall(r'<row[^>]*>(.*?)</row>', sheet_xml, re.DOTALL)

            lines = []
            for row in rows[:80]:  # первые 80 строк достаточно
                cells = re.findall(r'<c[^>]*>(.*?)</c>', row, re.DOTALL)
                values = []
                for cell in cells:
                    v_match = re.search(r'<v>([^<]*)</v>', cell)
                    t_attr = re.search(r't="([^"]*)"', cell)
                    if v_match:
                        raw = v_match.group(1)
                        if t_attr and t_attr.group(1) == 's':
                            try:
                                values.append(shared[int(raw)])
                            except (IndexError, ValueError):
                                values.append(raw)
                        else:
                            values.append(raw)
                if any(v.strip() for v in values):
                    lines.append('\t'.join(values))

            text = '\n'.join(lines)
            return text[:4000] if len(text) > 4000 else text
    except Exception as e:
        return f'[xlsx: ошибка чтения — {e}]'


def extract_file_text(b64: str, filename: str) -> str:
    """Универсальный экстрактор текста из base64-файла."""
    try:
        # Убираем data URL prefix если есть
        if ',' in b64:
            b64 = b64.split(',', 1)[1]
        data = base64.b64decode(b64 + '==')  # padding-safe
    except Exception:
        return f'[Ошибка декодирования {filename}]'

    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

    if ext == 'docx':
        return extract_docx_text(data)
    elif ext in ('xlsx', 'xls'):
        return extract_xlsx_text(data)
    elif ext in ('txt', 'csv'):
        try:
            text = data.decode('utf-8', errors='replace')
            return text[:4000]
        except Exception:
            return f'[Ошибка чтения текстового файла {filename}]'
    else:
        # Последняя попытка — UTF-8
        try:
            text = data.decode('utf-8', errors='replace')
            if len(text) > 200:  # Если читается как текст
                return text[:3000]
        except Exception:
            pass
        return f'[Файл {filename}: формат не поддерживается для извлечения текста]'


# ─── Handler ──────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Ты — технолог-нормировщик на машиностроительном заводе (ТГК).
Изучи данные о трудоёмкости и составь список технологических операций.

ПРАВИЛА:
1. Операции — в логической последовательности производства
2. work — строго из: Токарные, Фрезеровочные, Сверлильные, Сварочные, Слесарные, Прочие
3. hours — нормо-часы (число с точностью до 0.5)
4. predecessors — список id предыдущих операций (соблюдай последовательность)
5. status всегда "Не начата"
6. Не придумывай операций, которых нет в данных. Если данных мало — используй типовой цикл для данного типа изделия.

ФОРМАТ — строго JSON без markdown:
{"operations":[{"id":1,"name":"...","work":"Токарные","hours":4,"qty":1,"predecessors":[],"status":"Не начата"}],"summary":"..."}"""


def handler(event: dict, context) -> dict:
    """Генерация операций из трудоёмкости через DeepSeek. Вызывается только при загрузке файла."""
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
    order_title = body.get('title', 'Изделие')
    order_type = body.get('type', '')
    labor_file_b64 = body.get('laborFile', '')
    labor_filename = body.get('laborFilename', 'трудоёмкость.xlsx')
    manual_text = body.get('manualText', '')
    doc_files = body.get('docFiles', [])  # [{name, content(b64)}] из настроек

    # Строим контекст
    parts = [f"Изделие: {order_title}" + (f" (тип: {order_type})" if order_type else '')]

    if labor_file_b64:
        file_text = extract_file_text(labor_file_b64, labor_filename)
        parts.append(f"ФАЙЛ ТРУДОЁМКОСТИ «{labor_filename}»:\n{file_text}")

    if manual_text:
        parts.append(f"ОПИСАНИЕ:\n{manual_text[:1000]}")

    # Документация из настроек (только первые 2 файла, ограничим объём)
    for df in doc_files[:2]:
        ft = extract_file_text(df.get('content', ''), df.get('name', 'файл'))
        parts.append(f"ДОП. ДОКУМЕНТ «{df.get('name','')}»:\n{ft[:800]}")

    user_message = '\n\n'.join(parts)

    payload = json.dumps({
        'model': 'deepseek-chat',
        'messages': [
            {'role': 'system', 'content': SYSTEM_PROMPT},
            {'role': 'user', 'content': user_message},
        ],
        'temperature': 0.15,
        'max_tokens': 1500,  # Достаточно для 10-15 операций
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
        ops = parsed.get('operations', [])

        # Минимальная валидация
        valid_works = {'Токарные', 'Фрезеровочные', 'Сверлильные', 'Сварочные', 'Слесарные', 'Прочие'}
        clean_ops = []
        for op in ops:
            if not op.get('name'):
                continue
            if op.get('work') not in valid_works:
                op['work'] = 'Прочие'
            op['status'] = 'Не начата'
            op['hours'] = max(0.5, min(24, float(op.get('hours', 2))))
            op['qty'] = max(1, int(op.get('qty', 1)))
            clean_ops.append(op)

        return {
            'statusCode': 200,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({
                'ok': True,
                'operations': clean_ops,
                'summary': parsed.get('summary', ''),
                'tokens': result.get('usage', {}).get('total_tokens', 0),
            }),
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
