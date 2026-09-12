import os
import sqlite3
from datetime import datetime
from flask import Flask, redirect, render_template, request, url_for, abort

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(__file__), "onyx.db")

STATUSES = ["Açık", "Devam Ediyor", "Tamamlandı"]
CATEGORIES = ["Web", "Sosyal Medya", "E-Ticaret", "Mobil", "Diğer"]
PRIORITIES = ["Düşük", "Normal", "Yüksek", "Acil"]


def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def now_str():
    return datetime.now().strftime("%Y-%m-%d %H:%M")


def seed_db(conn):
    """Insert realistic Kara Makine / Arel Tarım demo tickets on first run."""
    if conn.execute("SELECT COUNT(*) FROM tickets").fetchone()[0] > 0:
        return
    tickets = [
        ("İmeceMobil Fiyat Güncellemesi", "E-Ticaret", "Yüksek",
         "Pazarama İmeceMobil Market vitrinindeki 32 ürün için güncel fiyat listesinin hazırlanması ve toplu güncelleme dosyasının yüklenmesi.",
         "Devam Ediyor", "2026-09-08 10:15", "2026-09-11 16:40",
         [(1.5, "Ürün listesi çıkarıldı, kategori eşleştirmesi yapıldı.", "2026-09-08 14:00"),
          (2.0, "Güncel fiyat listesi Excel'e işlendi.", "2026-09-11 16:40")]),
        ("Google Merchant Center Feed Kurulumu", "E-Ticaret", "Normal",
         "İmeceMobil ürünlerinin Google alışveriş reklamlarında görünmesi için Merchant Center feed yapısının kurulması ve doğrulanması.",
         "Açık", "2026-09-10 09:30", "2026-09-10 09:30",
         []),
        ("Instagram Hasat Videosu Kurgusu", "Sosyal Medya", "Normal",
         "Ceviz hasadı sahasından çekilen ham görüntülerin kurgulanması; kısa highlight reels ve tek uzun saha tanıtım videosu olarak yayınlanacak.",
         "Devam Ediyor", "2026-09-09 13:00", "2026-09-12 11:20",
         [(2.5, "Ham görüntüler tarandı, kullanılacak kesitler seçildi.", "2026-09-09 17:30"),
          (1.0, "Reels kurgusunun ilk taslağı tamamlandı.", "2026-09-12 11:20")]),
        ("areltarim.com Tarama Sonrası Temizlik Kontrolü", "Web", "Acil",
         "ClickFix enjeksiyonu temizlendikten sonra tema, eklenti ve çekirdek dosyaların bütünlük kontrolü; tekrar eden enfeksiyonun kök nedeninin belgelenmesi.",
         "Devam Ediyor", "2026-09-08 11:05", "2026-09-12 15:00",
         [(3.0, "Enfekte scriptler tespit edilip temizlendi, zarar gören dosyalar onarıldı.", "2026-09-08 18:00"),
          (1.5, "Wordfence taraması temiz döndü, eklenti güncellemeleri yapıldı.", "2026-09-12 15:00")]),
        ("Kara Makine Ürün Fotoğraf Çekimi Planlaması", "Sosyal Medya", "Düşük",
         "Ceviz hasat makineleri için stüdyo dışı saha çekimi planı; ekipman listesi, çekim noktaları ve tarih alternatifleri.",
         "Açık", "2026-09-11 14:20", "2026-09-11 14:20",
         []),
        ("İmeceMobil Yeni Sezon Ürün Açılışları", "E-Ticaret", "Yüksek",
         "Hasat sonu yeni sezon ceviz makinesi modellerinin İmeceMobil vitrininde açılması; görseller, açıklamalar ve stok bilgileri.",
         "Açık", "2026-09-12 09:00", "2026-09-12 09:00",
         []),
        ("Haftalık Sosyal Medya İçerik Takvimi", "Sosyal Medya", "Normal",
         "Kara Makine ve Arel Tarım hesapları için bir haftalık post takvimi; konu başlıkları, görsel ihtiyaçları ve yayın saatleri.",
         "Tamamlandı", "2026-09-01 10:00", "2026-09-07 12:30",
         [(1.0, "Post konuları belirlendi.", "2026-09-02 15:00"),
          (0.5, "Görsel ihtiyaçları listelendi.", "2026-09-06 10:00"),
          (1.5, "Takvim finalize edildi ve yayınlandı.", "2026-09-07 12:30")]),
        ("Ceviz Hasat Sezonu Saha Koordinasyonu", "Diğer", "Normal",
         "Hasat sezonu boyunca saha ekibi ve depo arasındaki günlük koordinasyon; araç planı, personel dönüşümü ve ürün taşımaları.",
         "Devam Ediyor", "2026-09-05 08:00", "2026-09-12 18:00",
         [(4.0, "Sezon başı saha organizasyonu kuruldu.", "2026-09-05 18:00"),
          (2.0, "Haftalık taşıma planı çıkarıldı.", "2026-09-12 18:00")]),
    ]
    for (title, category, priority, description, status, created, updated, efforts) in tickets:
        cur = conn.execute(
            """INSERT INTO tickets (title, category, priority, description, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (title, category, priority, description, status, created, updated))
        tid = cur.lastrowid
        for (hours, note, logged) in efforts:
            conn.execute(
                "INSERT INTO effort_logs (ticket_id, hours, note, logged_at) VALUES (?, ?, ?, ?)",
                (tid, hours, note, logged))
    conn.commit()


def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                priority TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'Açık',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS effort_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                hours REAL NOT NULL,
                note TEXT,
                logged_at TEXT NOT NULL,
                FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE
            )
        """)
        conn.commit()


@app.route("/")
def index():
    status_filter = request.args.get("status", "")
    category_filter = request.args.get("category", "")
    priority_filter = request.args.get("priority", "")

    with get_db() as conn:
        query = "SELECT * FROM tickets WHERE 1=1"
        params = []
        if status_filter:
            query += " AND status = ?"
            params.append(status_filter)
        if category_filter:
            query += " AND category = ?"
            params.append(category_filter)
        if priority_filter:
            query += " AND priority = ?"
            params.append(priority_filter)
        query += " ORDER BY CASE status WHEN 'Açık' THEN 1 WHEN 'Devam Ediyor' THEN 2 ELSE 3 END, id DESC"
        tickets = conn.execute(query, params).fetchall()

        total_tickets = conn.execute("SELECT COUNT(*) FROM tickets").fetchone()[0]
        open_tickets = conn.execute("SELECT COUNT(*) FROM tickets WHERE status = 'Açık'").fetchone()[0]
        in_progress = conn.execute("SELECT COUNT(*) FROM tickets WHERE status = 'Devam Ediyor'").fetchone()[0]
        completed = conn.execute("SELECT COUNT(*) FROM tickets WHERE status = 'Tamamlandı'").fetchone()[0]
        total_effort = conn.execute("SELECT SUM(hours) FROM effort_logs").fetchone()[0] or 0.0

    return render_template(
        "index.html",
        tickets=tickets,
        total_tickets=total_tickets,
        open_tickets=open_tickets,
        in_progress=in_progress,
        completed=completed,
        total_effort=total_effort,
        status_filter=status_filter,
        category_filter=category_filter,
        priority_filter=priority_filter,
    )


@app.route("/tickets/create", methods=["POST"])
def create_ticket():
    title = (request.form.get("title") or "").strip()
    category = request.form.get("category", "Diğer")
    priority = request.form.get("priority", "Normal")
    description = (request.form.get("description") or "").strip()
    if not title:
        return redirect(url_for("index"))
    if category not in CATEGORIES:
        category = "Diğer"
    if priority not in PRIORITIES:
        priority = "Normal"
    now = now_str()
    with get_db() as conn:
        conn.execute("""
            INSERT INTO tickets (title, category, priority, description, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'Açık', ?, ?)
        """, (title, category, priority, description, now, now))
        conn.commit()
    return redirect(url_for("index"))


@app.route("/tickets/<int:ticket_id>", methods=["GET"])
def ticket_detail(ticket_id):
    with get_db() as conn:
        ticket = conn.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
        if not ticket:
            abort(404)
        logs = conn.execute(
            "SELECT * FROM effort_logs WHERE ticket_id = ? ORDER BY id DESC", (ticket_id,)).fetchall()
        total_ticket_effort = conn.execute(
            "SELECT SUM(hours) FROM effort_logs WHERE ticket_id = ?", (ticket_id,)).fetchone()[0] or 0.0
    return render_template(
        "detail.html",
        ticket=ticket,
        logs=logs,
        total_ticket_effort=total_ticket_effort,
        statuses=STATUSES,
        categories=CATEGORIES,
        priorities=PRIORITIES,
    )


@app.route("/tickets/<int:ticket_id>/update", methods=["POST"])
def update_ticket(ticket_id):
    status = request.form.get("status")
    priority = request.form.get("priority")
    title = (request.form.get("title") or "").strip()
    description = request.form.get("description") or ""
    with get_db() as conn:
        exists = conn.execute("SELECT id FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
        if not exists:
            abort(404)
        if status not in STATUSES:
            status = "Açık"
        if priority not in PRIORITIES:
            priority = "Normal"
        if not title:
            row = conn.execute("SELECT title FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
            title = row["title"]
        conn.execute("""
            UPDATE tickets
            SET status = ?, priority = ?, title = ?, description = ?, updated_at = ?
            WHERE id = ?
        """, (status, priority, title, description, now_str(), ticket_id))
        conn.commit()
    return redirect(url_for("ticket_detail", ticket_id=ticket_id))


@app.route("/tickets/<int:ticket_id>/effort", methods=["POST"])
def add_effort(ticket_id):
    try:
        hours = float(request.form.get("hours", 0))
    except (TypeError, ValueError):
        hours = 0.0
    note = (request.form.get("note") or "").strip()
    with get_db() as conn:
        exists = conn.execute("SELECT id FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
        if not exists:
            abort(404)
        if hours > 0:
            conn.execute("""
                INSERT INTO effort_logs (ticket_id, hours, note, logged_at)
                VALUES (?, ?, ?, ?)
            """, (ticket_id, round(hours, 2), note, now_str()))
            conn.execute("UPDATE tickets SET updated_at = ? WHERE id = ?", (now_str(), ticket_id))
            conn.commit()
    return redirect(url_for("ticket_detail", ticket_id=ticket_id))


@app.route("/tickets/<int:ticket_id>/delete", methods=["POST"])
def delete_ticket(ticket_id):
    with get_db() as conn:
        conn.execute("DELETE FROM effort_logs WHERE ticket_id = ?", (ticket_id,))
        conn.execute("DELETE FROM tickets WHERE id = ?", (ticket_id,))
        conn.commit()
    return redirect(url_for("index"))


@app.errorhandler(404)
def not_found(e):
    return render_template("404.html"), 404


init_db()
with get_db() as _conn:
    seed_db(_conn)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=False)
