"""
ВаСАП · data-api — единый CRUD для всех данных приложения.
Хранит всё в PostgreSQL, файлы — в S3 (через files-api).

Действия (action):
  orders:    list, upsert, delete, set_shifts
  workers:   list, upsert, delete
  equipment: list, upsert, delete
  stock:     list, upsert, delete, adjust_qty
  kb:        list, upsert, delete
  shifts:    list, replace_all
  plant_tasks: list, upsert, delete
  ai_settings: get, update
  seed:      seed_initial (заполнить дефолтными данными)
"""
import json
import os
import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
}

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p45187164_production_planning_')


def get_conn():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = False
    return conn


def ok(data: dict) -> dict:
    return {
        'statusCode': 200,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, default=str),
    }


def err(status: int, msg: str) -> dict:
    return {
        'statusCode': status,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps({'ok': False, 'error': msg}),
    }


# ─── Маппинг БД → фронтенд ────────────────────────────────────────────────────

def row_to_order(r) -> dict:
    return {
        'id': r[0], 'num1': r[1], 'num2': r[2], 'title': r[3],
        'type': r[4], 'cls': r[5], 'deadline': r[6], 'priority': r[7],
        'status': r[8], 'progress': r[9], 'closedAt': r[10],
        'operations': r[11] or [], 'materials': r[12] or [],
        'files': [],  # файлы хранятся в S3, ссылки — в operations/materials meta
    }


def row_to_worker(r) -> dict:
    return {
        'id': r[0], 'name': r[1], 'role': r[2], 'load': r[3],
        'available': r[4], 'qualification': r[5],
        'skills': r[6] or [], 'description': r[7], 'workplaceNum': r[8],
    }


def row_to_equip(r) -> dict:
    return {
        'id': r[0], 'name': r[1], 'type': r[2], 'count': r[3],
        'busy': r[4], 'state': r[5], 'workplaceNum': r[6],
        'note': r[7], 'hasUci': r[8],
    }


def row_to_stock(r) -> dict:
    return {
        'id': r[0], 'name': r[1], 'steel': r[2], 'spec': r[3],
        'qty': float(r[4]), 'unit': r[5], 'order': r[6],
    }


def row_to_kb(r) -> dict:
    return {
        'id': r[0], 'title': r[1], 'category': r[2], 'description': r[3],
        'photo': r[4], 'tags': r[5] or [], 'files': r[6] or [],
        'createdAt': r[7].strftime('%d.%m.%Y') if r[7] else '',
    }


def row_to_shift(r) -> dict:
    return {
        'date': r[0], 'worker': r[1], 'order': r[2],
        'operation': r[3], 'planQty': r[4], 'hours': float(r[5]),
    }


def row_to_plant_task(r) -> dict:
    return {'id': r[0], 'title': r[1], 'category': r[2], 'estimatedHours': float(r[3])}


# ─── Handler ──────────────────────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    """CRUD для всех данных ВаСАП. Требует валидный X-Auth-Token."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    entity = body.get('entity', '')
    action = body.get('action', 'list')

    conn = get_conn()
    cur = conn.cursor()
    S = SCHEMA

    try:
        # ════════════════════════════════════════════════════════════════════
        # ORDERS
        # ════════════════════════════════════════════════════════════════════
        if entity == 'orders':
            if action == 'list':
                cur.execute(f"""
                    SELECT id,num1,num2,title,type,cls,deadline,priority,
                           status,progress,closed_at,operations,materials
                    FROM {S}.orders ORDER BY created_at DESC
                """)
                return ok({'ok': True, 'data': [row_to_order(r) for r in cur.fetchall()]})

            if action == 'upsert':
                o = body.get('data', {})
                cur.execute(f"""
                    INSERT INTO {S}.orders
                        (id,num1,num2,title,type,cls,deadline,priority,
                         status,progress,closed_at,operations,materials,updated_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())
                    ON CONFLICT (id) DO UPDATE SET
                        num1=EXCLUDED.num1, num2=EXCLUDED.num2,
                        title=EXCLUDED.title, type=EXCLUDED.type,
                        cls=EXCLUDED.cls, deadline=EXCLUDED.deadline,
                        priority=EXCLUDED.priority, status=EXCLUDED.status,
                        progress=EXCLUDED.progress, closed_at=EXCLUDED.closed_at,
                        operations=EXCLUDED.operations, materials=EXCLUDED.materials,
                        updated_at=NOW()
                """, (
                    o['id'], o.get('num1',''), o.get('num2',''), o['title'],
                    o.get('type',''), o.get('cls','МС'),
                    o.get('deadline',''), o.get('priority','Обычный'),
                    o.get('status','Не начат'), o.get('progress',0),
                    o.get('closedAt'), json.dumps(o.get('operations',[]), ensure_ascii=False),
                    json.dumps(o.get('materials',[]), ensure_ascii=False),
                ))
                conn.commit()
                return ok({'ok': True})

            if action == 'delete':
                cur.execute(f"DELETE FROM {S}.orders WHERE id = %s", (body.get('id'),))
                conn.commit()
                return ok({'ok': True})

        # ════════════════════════════════════════════════════════════════════
        # WORKERS
        # ════════════════════════════════════════════════════════════════════
        if entity == 'workers':
            if action == 'list':
                cur.execute(f"""
                    SELECT id,name,role,load,available,qualification,
                           skills,description,workplace_num
                    FROM {S}.workers ORDER BY id
                """)
                return ok({'ok': True, 'data': [row_to_worker(r) for r in cur.fetchall()]})

            if action == 'upsert':
                w = body.get('data', {})
                if w.get('id'):
                    cur.execute(f"""
                        UPDATE {S}.workers SET
                            name=%s,role=%s,load=%s,available=%s,
                            qualification=%s,skills=%s,description=%s,workplace_num=%s
                        WHERE id=%s
                    """, (
                        w['name'], w.get('role',''), w.get('load',0), w.get('available',True),
                        w.get('qualification','III'), json.dumps(w.get('skills',[]), ensure_ascii=False),
                        w.get('description',''), w.get('workplaceNum',''), w['id'],
                    ))
                else:
                    cur.execute(f"""
                        INSERT INTO {S}.workers
                            (name,role,load,available,qualification,skills,description,workplace_num)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                        RETURNING id
                    """, (
                        w['name'], w.get('role',''), w.get('load',0), w.get('available',True),
                        w.get('qualification','III'), json.dumps(w.get('skills',[]), ensure_ascii=False),
                        w.get('description',''), w.get('workplaceNum',''),
                    ))
                    w['id'] = cur.fetchone()[0]
                conn.commit()
                return ok({'ok': True, 'id': w.get('id')})

            if action == 'delete':
                cur.execute(f"DELETE FROM {S}.workers WHERE id=%s", (body.get('id'),))
                conn.commit()
                return ok({'ok': True})

        # ════════════════════════════════════════════════════════════════════
        # EQUIPMENT
        # ════════════════════════════════════════════════════════════════════
        if entity == 'equipment':
            if action == 'list':
                cur.execute(f"""
                    SELECT id,name,type,count,busy,state,workplace_num,note,has_uci
                    FROM {S}.equipment ORDER BY id
                """)
                return ok({'ok': True, 'data': [row_to_equip(r) for r in cur.fetchall()]})

            if action == 'upsert':
                e = body.get('data', {})
                if e.get('id'):
                    cur.execute(f"""
                        UPDATE {S}.equipment SET
                            name=%s,type=%s,count=%s,busy=%s,
                            state=%s,workplace_num=%s,note=%s,has_uci=%s
                        WHERE id=%s
                    """, (
                        e['name'], e.get('type',''), e.get('count',1), e.get('busy',0),
                        e.get('state','Исправно'), e.get('workplaceNum',''),
                        e.get('note',''), e.get('hasUci',False), e['id'],
                    ))
                else:
                    cur.execute(f"""
                        INSERT INTO {S}.equipment
                            (name,type,count,busy,state,workplace_num,note,has_uci)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
                    """, (
                        e['name'], e.get('type',''), e.get('count',1), e.get('busy',0),
                        e.get('state','Исправно'), e.get('workplaceNum',''),
                        e.get('note',''), e.get('hasUci',False),
                    ))
                    e['id'] = cur.fetchone()[0]
                conn.commit()
                return ok({'ok': True, 'id': e.get('id')})

            if action == 'delete':
                cur.execute(f"DELETE FROM {S}.equipment WHERE id=%s", (body.get('id'),))
                conn.commit()
                return ok({'ok': True})

        # ════════════════════════════════════════════════════════════════════
        # STOCK
        # ════════════════════════════════════════════════════════════════════
        if entity == 'stock':
            if action == 'list':
                cur.execute(f"SELECT id,name,steel,spec,qty,unit,ord FROM {S}.stock ORDER BY id")
                return ok({'ok': True, 'data': [row_to_stock(r) for r in cur.fetchall()]})

            if action == 'upsert':
                s = body.get('data', {})
                if s.get('id'):
                    cur.execute(f"""
                        UPDATE {S}.stock SET name=%s,steel=%s,spec=%s,qty=%s,unit=%s,ord=%s
                        WHERE id=%s
                    """, (s['name'], s.get('steel',''), s.get('spec',''),
                          s.get('qty',0), s.get('unit','шт'), s.get('order'), s['id']))
                else:
                    cur.execute(f"""
                        INSERT INTO {S}.stock (name,steel,spec,qty,unit,ord)
                        VALUES (%s,%s,%s,%s,%s,%s) RETURNING id
                    """, (s['name'], s.get('steel',''), s.get('spec',''),
                          s.get('qty',0), s.get('unit','шт'), s.get('order')))
                    s['id'] = cur.fetchone()[0]
                conn.commit()
                return ok({'ok': True, 'id': s.get('id')})

            if action == 'adjust_qty':
                cur.execute(f"""
                    UPDATE {S}.stock SET qty = GREATEST(0, qty + %s) WHERE id=%s
                    RETURNING qty
                """, (body.get('delta', 0), body.get('id')))
                row = cur.fetchone()
                conn.commit()
                return ok({'ok': True, 'qty': float(row[0]) if row else 0})

            if action == 'delete':
                cur.execute(f"DELETE FROM {S}.stock WHERE id=%s", (body.get('id'),))
                conn.commit()
                return ok({'ok': True})

        # ════════════════════════════════════════════════════════════════════
        # KB (БАЗА ЗНАНИЙ)
        # ════════════════════════════════════════════════════════════════════
        if entity == 'kb':
            if action == 'list':
                cur.execute(f"""
                    SELECT id,title,category,description,photo_url,tags,files,created_at
                    FROM {S}.kb_items ORDER BY created_at DESC
                """)
                return ok({'ok': True, 'data': [row_to_kb(r) for r in cur.fetchall()]})

            if action == 'upsert':
                k = body.get('data', {})
                if k.get('id'):
                    cur.execute(f"""
                        UPDATE {S}.kb_items SET
                            title=%s,category=%s,description=%s,
                            photo_url=%s,tags=%s,files=%s
                        WHERE id=%s
                    """, (
                        k['title'], k.get('category','Прочее'), k.get('description',''),
                        k.get('photo'), json.dumps(k.get('tags',[]), ensure_ascii=False),
                        json.dumps(k.get('files',[]), ensure_ascii=False), k['id'],
                    ))
                else:
                    cur.execute(f"""
                        INSERT INTO {S}.kb_items
                            (title,category,description,photo_url,tags,files)
                        VALUES (%s,%s,%s,%s,%s,%s) RETURNING id
                    """, (
                        k['title'], k.get('category','Прочее'), k.get('description',''),
                        k.get('photo'), json.dumps(k.get('tags',[]), ensure_ascii=False),
                        json.dumps(k.get('files',[]), ensure_ascii=False),
                    ))
                    k['id'] = cur.fetchone()[0]
                conn.commit()
                return ok({'ok': True, 'id': k.get('id')})

            if action == 'delete':
                cur.execute(f"DELETE FROM {S}.kb_items WHERE id=%s", (body.get('id'),))
                conn.commit()
                return ok({'ok': True})

        # ════════════════════════════════════════════════════════════════════
        # SHIFTS (план)
        # ════════════════════════════════════════════════════════════════════
        if entity == 'shifts':
            if action == 'list':
                cur.execute(f"SELECT date,worker,ord,operation,plan_qty,hours FROM {S}.shifts ORDER BY date,worker")
                return ok({'ok': True, 'data': [row_to_shift(r) for r in cur.fetchall()]})

            if action == 'replace_all':
                # Полная замена плана (после AI-пересчёта)
                shifts = body.get('data', [])
                cur.execute(f"DELETE FROM {S}.shifts")
                if shifts:
                    psycopg2.extras.execute_values(cur, f"""
                        INSERT INTO {S}.shifts (date,worker,ord,operation,plan_qty,hours)
                        VALUES %s
                    """, [
                        (s['date'], s['worker'], s['order'], s['operation'],
                         s.get('planQty',1), s.get('hours',1))
                        for s in shifts
                    ])
                conn.commit()
                return ok({'ok': True, 'count': len(shifts)})

        # ════════════════════════════════════════════════════════════════════
        # PLANT TASKS
        # ════════════════════════════════════════════════════════════════════
        if entity == 'plant_tasks':
            if action == 'list':
                cur.execute(f"SELECT id,title,category,estimated_hours FROM {S}.plant_tasks ORDER BY id")
                return ok({'ok': True, 'data': [row_to_plant_task(r) for r in cur.fetchall()]})

            if action == 'upsert':
                t = body.get('data', {})
                if t.get('id'):
                    cur.execute(f"""
                        UPDATE {S}.plant_tasks SET title=%s,category=%s,estimated_hours=%s WHERE id=%s
                    """, (t['title'], t.get('category',''), t.get('estimatedHours',1), t['id']))
                else:
                    cur.execute(f"""
                        INSERT INTO {S}.plant_tasks (title,category,estimated_hours)
                        VALUES (%s,%s,%s) RETURNING id
                    """, (t['title'], t.get('category',''), t.get('estimatedHours',1)))
                    t['id'] = cur.fetchone()[0]
                conn.commit()
                return ok({'ok': True, 'id': t.get('id')})

            if action == 'delete':
                cur.execute(f"DELETE FROM {S}.plant_tasks WHERE id=%s", (body.get('id'),))
                conn.commit()
                return ok({'ok': True})

        # ════════════════════════════════════════════════════════════════════
        # AI SETTINGS
        # ════════════════════════════════════════════════════════════════════
        if entity == 'ai_settings':
            if action == 'get':
                cur.execute(f"SELECT system_prompt,user_docs,function_url,doc_files FROM {S}.ai_settings WHERE id=1")
                r = cur.fetchone()
                if not r:
                    return ok({'ok': True, 'data': {'systemPrompt':'','userDocs':'','functionUrl':'','docFiles':[]}})
                return ok({'ok': True, 'data': {
                    'systemPrompt': r[0], 'userDocs': r[1],
                    'functionUrl': r[2], 'docFiles': r[3] or [],
                }})

            if action == 'update':
                s = body.get('data', {})
                cur.execute(f"""
                    INSERT INTO {S}.ai_settings (id,system_prompt,user_docs,function_url,doc_files)
                    VALUES (1,%s,%s,%s,%s)
                    ON CONFLICT (id) DO UPDATE SET
                        system_prompt=EXCLUDED.system_prompt,
                        user_docs=EXCLUDED.user_docs,
                        function_url=EXCLUDED.function_url,
                        doc_files=EXCLUDED.doc_files
                """, (
                    s.get('systemPrompt',''), s.get('userDocs',''),
                    s.get('functionUrl',''), json.dumps(s.get('docFiles',[]), ensure_ascii=False),
                ))
                conn.commit()
                return ok({'ok': True})

        # ════════════════════════════════════════════════════════════════════
        # SEED — заполнить начальными данными (только если таблицы пусты)
        # ════════════════════════════════════════════════════════════════════
        if entity == 'seed':
            cur.execute(f"SELECT COUNT(*) FROM {S}.workers")
            if cur.fetchone()[0] > 0:
                return ok({'ok': True, 'message': 'already seeded'})

            # Сотрудники
            workers_data = [
                ('Петров А.И.', 'Токарь', 78, True, 'IV', '["Токарные","УЦИ"]', 'Ведущий токарь, опыт 18 лет', 'РМ-01'),
                ('Смирнов В.К.', 'Сварщик', 92, True, 'V', '["Сварочные","МИГ/МАГ","Аргон"]', 'Сварщик высшей категории', 'РМ-04'),
                ('Иванова Е.С.', 'Слесарь', 45, True, 'III', '["Слесарные","Сборка"]', 'Слесарь-сборщик', 'РМ-07'),
                ('Козлов Д.М.', 'Фрезеровщик', 100, False, 'IV', '["Фрезеровочные","ЧПУ"]', 'Оператор ЧПУ, в отпуске', 'РМ-02'),
            ]
            cur.executemany(f"""
                INSERT INTO {S}.workers (name,role,load,available,qualification,skills,description,workplace_num)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            """, workers_data)

            # Оборудование
            equip_data = [
                ('Токарный №1–5', 'Токарный', 5, 4, 'Исправно', 'РМ-01', 'Станки 16К20, 1К62', True),
                ('Фрезерный ЧПУ', 'Фрезерный', 1, 1, 'Исправно', 'РМ-02', 'FANUC 0i-MD', False),
                ('Сверлильный', 'Сверлильный', 1, 0, 'ТО', 'РМ-03', 'Плановое ТО до 30.06', False),
                ('Сварочный пост', 'Сварочный', 1, 1, 'Исправно', 'РМ-04', 'Lincoln Electric', False),
                ('Покрасочная', 'Покраска', 1, 0, 'Исправно', 'РМ-05', 'Окрасочная камера', False),
            ]
            cur.executemany(f"""
                INSERT INTO {S}.equipment (name,type,count,busy,state,workplace_num,note,has_uci)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            """, equip_data)

            conn.commit()
            return ok({'ok': True, 'message': 'seeded'})

        return err(400, f'Неизвестный entity/action: {entity}/{action}')

    except Exception as e:
        conn.rollback()
        return err(500, str(e))
    finally:
        cur.close()
        conn.close()
