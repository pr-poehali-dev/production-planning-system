"""
ВаСАП · Планировщик производства на базе DeepSeek.

Принципы экономии токенов:
1. Фильтрация: только активные приказы + незавершённые операции
2. Компактный формат: данные — таблицами, не JSON-blob
3. Структурированный промпт: правила → данные → задача
4. Валидация ответа: проверяем имена, даты, структуру
5. max_tokens ограничен — AI не тратит лишнее на «рассуждения»
"""
import json
import os
import re
import urllib.request
import urllib.error

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

PRIORITY_RANK = {'Особо важный': 4, 'Срочный': 3, 'Повышенный': 2, 'Обычный': 1}

# ─── Подготовка данных ────────────────────────────────────────────────────────

def build_compact_prompt(body: dict) -> tuple[str, set]:
    """
    Преобразует сырые данные в компактный текстовый промпт.
    Возвращает (user_message, valid_worker_names).
    """
    orders_raw = body.get('orders', [])
    workers_raw = body.get('workers', [])
    equipment_raw = body.get('equipment', [])
    stock_raw = body.get('stock', [])
    plan_days = body.get('planDays', [])
    user_docs = body.get('userDocs', '')

    # ── 1. Фильтрация данных ──────────────────────────────────────────────────

    # Только доступные сотрудники
    workers = [w for w in workers_raw if w.get('available', True)]
    valid_names = {w['name'] for w in workers}

    # Только исправное оборудование
    equipment_ok = [e for e in equipment_raw if e.get('state') == 'Исправно']
    equipment_broken = [e for e in equipment_raw if e.get('state') != 'Исправно']

    # Дефицит материалов на складе
    stock_deficit = {s['name'] for s in stock_raw if s.get('qty', 0) == 0}

    # Только активные приказы с незавершёнными операциями
    active_orders = []
    for o in orders_raw:
        if o.get('status') == 'Завершён':
            continue
        pending_ops = [
            op for op in o.get('operations', [])
            if op.get('status') not in ('Выполнена',)
        ]
        if pending_ops:
            active_orders.append({**o, 'operations': pending_ops})

    # Сортируем по приоритету (важнейшие первыми)
    active_orders.sort(
        key=lambda o: PRIORITY_RANK.get(o.get('priority', 'Обычный'), 1),
        reverse=True,
    )

    # ── 2. Компактный формат данных ───────────────────────────────────────────

    period_str = f"{plan_days[0]}–{plan_days[-1]}" if plan_days else "—"
    days_str = ', '.join(plan_days)

    # Приказы → компактная таблица
    orders_text = []
    for o in active_orders:
        prio = o.get('priority', 'Обычный')
        deadline = o.get('deadline', '—')
        orders_text.append(f"\n[{o['id']}] {o.get('title','')} | {prio} | срок {deadline}")
        for op in o['operations']:
            status = op.get('status', '')
            blocked = ''
            # Проверяем зависимости: если предшественник незавершён — заблокировано
            pred_ids = op.get('predecessors', [])
            if pred_ids:
                all_ops_map = {x['id']: x for x in o.get('operations', [])}
                unfinished_preds = [
                    pid for pid in pred_ids
                    if all_ops_map.get(pid, {}).get('status') not in ('Выполнена',)
                ]
                if unfinished_preds:
                    blocked = ' [ЗАБЛОКИРОВАНА — ждёт пред. операций]'
            # Проверяем дефицит материалов
            mats_needed = [m['name'] for m in o.get('materials', []) if m.get('status') == 'Нет']
            if mats_needed:
                blocked += f' [НЕТ МАТЕРИАЛА: {", ".join(mats_needed[:2])}]'
            assigned = f" назначен={op['worker']}" if op.get('worker') else ''
            orders_text.append(
                f"  ops#{op['id']} «{op['name']}» | {op.get('work','')} | "
                f"{op.get('hours',0)}ч×{op.get('qty',1)}шт | "
                f"статус={status}{assigned}{blocked}"
            )

    # Сотрудники → одна строка каждый
    workers_text = []
    for w in workers:
        skills = ','.join(w.get('skills', [])) or w.get('role', '')
        workers_text.append(
            f"  {w['name']} | {w.get('role','')} | {w.get('qualification','')}разр | "
            f"загрузка={w.get('load',0)}% | умения={skills}"
        )

    # Оборудование
    equip_ok_text = ', '.join(
        f"{e['name']}({e.get('type','')})" for e in equipment_ok
    ) or 'нет данных'
    equip_broken_text = ', '.join(
        f"{e['name']}[{e.get('state','')}]" for e in equipment_broken
    ) if equipment_broken else 'все исправны'

    # Дефицит склада
    deficit_text = ', '.join(stock_deficit) if stock_deficit else 'нет дефицита'

    user_message = f"""ПЕРИОД ПЛАНИРОВАНИЯ: {period_str}
РАБОЧИЕ ДНИ: {days_str}

═══ ПРИКАЗЫ (только активные, незавершённые операции) ═══
{''.join(orders_text) if orders_text else 'Нет активных приказов'}

═══ СОТРУДНИКИ (только доступные) ═══
{chr(10).join(workers_text) if workers_text else 'Нет доступных сотрудников'}

═══ ОБОРУДОВАНИЕ ═══
Исправно: {equip_ok_text}
Не в работе: {equip_broken_text}

═══ ДЕФИЦИТ СКЛАДА ═══
{deficit_text}

{f'═══ ДОКУМЕНТАЦИЯ ═══{chr(10)}{user_docs[:3000]}' if user_docs else ''}

ЗАДАЧА: Составь пооперационный план на указанный период. Каждая строка плана — одна операция для одного сотрудника на один день. Несколько операций в день — несколько строк. Заблокированные операции не планируй. Верни только JSON."""

    return user_message, valid_names


def build_system_prompt(custom_prompt: str | None) -> str:
    base = custom_prompt or ""
    if base.strip():
        return base  # Пользователь задал свой промпт — используем его

    return """Ты — система планирования производства ВаСАП (ТГК). Составляй пооперационные сменные задания.

ЖЁСТКИЕ ПРАВИЛА:
1. Приоритет: Особо важный > Срочный > Повышенный > Обычный — более важные приказы загружай первыми
2. Зависимости: операция «ЗАБЛОКИРОВАНА» — её НЕ планируй
3. Нет материала — помечено [НЕТ МАТЕРИАЛА] — НЕ планируй
4. Не назначай сотрудника на вид работ, которого нет в его умениях
5. Макс. часов в день на сотрудника: 10 ч (с учётом КУЦ 0.75, т.е. 10 ч = 13.3 норм-ч)
6. Имя сотрудника в ответе — точно как в списке сотрудников, без изменений
7. Дата — строго из списка рабочих дней, формат ДД.ММ
8. Если сотрудник не имеет подходящих умений — пропусти операцию (не придумывай)

ФОРМАТ ОТВЕТА — строго JSON, без markdown:
{
  "shifts": [
    {"date":"ДД.ММ","worker":"Фамилия И.О.","order":"П-XXXX","operation":"Название","planQty":1,"hours":6.0}
  ],
  "summary": "2-3 предложения: что запланировано, что заблокировано, критические пути"
}"""


# ─── Валидация ответа ─────────────────────────────────────────────────────────

def validate_plan(plan: dict, valid_names: set, valid_dates: set) -> dict:
    """
    Проверяет и очищает план от невалидных записей.
    Возвращает очищенный план + список предупреждений.
    """
    shifts = plan.get('shifts', [])
    warnings = []
    clean = []

    for s in shifts:
        worker = s.get('worker', '')
        date = s.get('date', '')
        order = s.get('order', '')
        operation = s.get('operation', '')
        hours = s.get('hours', 0)

        # Проверка имени
        if valid_names and worker not in valid_names:
            # Попытка нечёткого совпадения (например, ФИО с опечаткой)
            matched = next((n for n in valid_names if n.split()[0] == worker.split()[0]), None)
            if matched:
                warnings.append(f"Исправлено имя: '{worker}' → '{matched}'")
                worker = matched
            else:
                warnings.append(f"Пропущена запись: неизвестный сотрудник '{worker}'")
                continue

        # Проверка даты
        if valid_dates and date not in valid_dates:
            warnings.append(f"Пропущена запись: невалидная дата '{date}' для {worker}/{order}")
            continue

        # Проверка базовых полей
        if not order or not operation:
            warnings.append(f"Пропущена неполная запись: {s}")
            continue

        # Нормализация часов
        try:
            hours = round(float(hours), 1)
            if hours <= 0:
                hours = 1.0
            if hours > 10:
                hours = 10.0
        except (TypeError, ValueError):
            hours = 4.0

        clean.append({
            'date': date,
            'worker': worker,
            'order': order,
            'operation': str(operation),
            'planQty': max(1, int(s.get('planQty', 1))),
            'hours': hours,
        })

    # Проверка дневной нагрузки: не более 10 ч/день/сотрудник
    day_load: dict[str, float] = {}
    final = []
    for s in clean:
        key = f"{s['date']}_{s['worker']}"
        current = day_load.get(key, 0.0)
        if current + s['hours'] > 10.5:  # небольшой допуск
            remaining = max(0, 10.0 - current)
            if remaining < 0.5:
                warnings.append(f"Пропущено: перегрузка {s['worker']} {s['date']} (уже {current}ч)")
                continue
            s = {**s, 'hours': remaining}
            warnings.append(f"Урезано: {s['worker']} {s['date']} до {remaining}ч")
        day_load[key] = day_load.get(key, 0.0) + s['hours']
        final.append(s)

    return {
        'shifts': final,
        'summary': plan.get('summary', ''),
        'warnings': warnings,
        'stats': {
            'total': len(shifts),
            'valid': len(final),
            'skipped': len(shifts) - len(final),
        },
    }


# ─── Handler ──────────────────────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    """Пересчёт двухнедельного плана через DeepSeek с умной фильтрацией."""
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
    plan_days = body.get('planDays', [])
    custom_prompt = body.get('systemPrompt', '')

    # Строим компактный промпт и получаем валидные имена
    user_message, valid_names = build_compact_prompt(body)
    system_prompt = build_system_prompt(custom_prompt)
    valid_dates = set(plan_days)

    # Оцениваем примерный размер запроса (для логгирования)
    est_tokens = (len(system_prompt) + len(user_message)) // 4

    payload = json.dumps({
        'model': 'deepseek-chat',
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_message},
        ],
        'temperature': 0.1,       # Низкая температура = меньше галлюцинаций
        'max_tokens': 3000,        # Достаточно для 10 дней × 5 человек = ~500 строк
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
        raw_plan = json.loads(content)

        # Валидация и очистка плана
        clean_plan = validate_plan(raw_plan, valid_names, valid_dates)

        # Статистика использования токенов
        usage = result.get('usage', {})

        return {
            'statusCode': 200,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({
                'ok': True,
                'plan': clean_plan,
                'meta': {
                    'est_input_tokens': est_tokens,
                    'actual_tokens': usage,
                    'active_orders': len([o for o in body.get('orders', []) if o.get('status') != 'Завершён']),
                    'warnings': clean_plan.get('warnings', []),
                },
            }),
        }

    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8', errors='replace')
        return {
            'statusCode': 502,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({'ok': False, 'error': f'DeepSeek API: {e.code}', 'detail': err_body}),
        }
    except json.JSONDecodeError as e:
        return {
            'statusCode': 502,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({'ok': False, 'error': f'Невалидный JSON от DeepSeek: {e}'}),
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({'ok': False, 'error': str(e)}),
        }
