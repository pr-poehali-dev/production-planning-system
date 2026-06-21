"""
Планировщик производства на базе DeepSeek.
Принимает состояние заказов, ресурсов и настройки,
возвращает пооперационный двухнедельный план в виде сменных заданий.
"""
import json
import os
import urllib.request
import urllib.error

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

DEFAULT_SYSTEM_PROMPT = """Ты — система автоматического планирования производства гидроцилиндров и металлоконструкций.
Твоя задача: получить данные о приказах (заказах), операциях, сотрудниках и оборудовании, 
а затем составить оптимальный двухнедельный пооперационный план в формате сменных заданий.

ПРАВИЛА ПЛАНИРОВАНИЯ:
1. Учитывай приоритеты приказов: Особо важный > Срочный > Повышенный > Обычный
2. Учитывай зависимости операций (predecessors) — операция не может начаться раньше предшественника
3. Учитывай доступность сотрудников (available=false — не назначать)
4. Учитывай состояние оборудования (Сломано/ТО — операции данного типа не планировать)
5. Учитывай наличие материалов — если материала нет на складе, операции зависящие от него помечай заблокированными
6. Коэффициент УЦИ = 0.75 (умножай нормо-часы на него)
7. Максимум 10 часов в день на сотрудника
8. Уже выполненные операции (status=Выполнена) не включай в план
9. Если указана дополнительная документация — учитывай её как контекст

ФОРМАТ ОТВЕТА — строго JSON, без markdown, без пояснений:
{
  "shifts": [
    {
      "date": "ДД.ММ",
      "worker": "Фамилия И.О.",
      "order": "П-ХXXX",
      "operation": "Название операции",
      "planQty": 1,
      "hours": 6.0
    }
  ],
  "summary": "Краткое пояснение логики плана (2-3 предложения на русском)"
}"""


def handler(event: dict, context) -> dict:
    """Пересчёт двухнедельного плана через DeepSeek."""
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
    orders = body.get('orders', [])
    workers = body.get('workers', [])
    equipment = body.get('equipment', [])
    stock = body.get('stock', [])
    plan_days = body.get('planDays', [])
    system_prompt = body.get('systemPrompt') or DEFAULT_SYSTEM_PROMPT
    user_docs = body.get('userDocs', '')

    user_message = f"""ДАННЫЕ ДЛЯ ПЛАНИРОВАНИЯ:

ПЕРИОД: {', '.join(plan_days)}

ПРИКАЗЫ И ОПЕРАЦИИ:
{json.dumps(orders, ensure_ascii=False, indent=2)}

СОТРУДНИКИ:
{json.dumps(workers, ensure_ascii=False, indent=2)}

ОБОРУДОВАНИЕ:
{json.dumps(equipment, ensure_ascii=False, indent=2)}

ОСТАТКИ СКЛАДА:
{json.dumps(stock, ensure_ascii=False, indent=2)}

{f'ДОПОЛНИТЕЛЬНАЯ ДОКУМЕНТАЦИЯ:{chr(10)}{user_docs}' if user_docs else ''}

Составь оптимальный двухнедельный план. Верни только JSON."""

    payload = json.dumps({
        'model': 'deepseek-chat',
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_message},
        ],
        'temperature': 0.2,
        'max_tokens': 4096,
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
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read())
        content = result['choices'][0]['message']['content']
        plan = json.loads(content)
        return {
            'statusCode': 200,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({'ok': True, 'plan': plan}),
        }
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8', errors='replace')
        return {
            'statusCode': 502,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({'ok': False, 'error': f'DeepSeek API: {e.code}', 'detail': err_body}),
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({'ok': False, 'error': str(e)}),
        }
