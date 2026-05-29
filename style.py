"""
╔══════════════════════════════════════════════════════════╗
║    XUẤT DANH SÁCH TÀI KHOẢN — YN CHESS 🌸               ║
║    Script này đọc dữ liệu users từ file JSON             ║
║    và xuất ra 2 file text.                               ║
╚══════════════════════════════════════════════════════════╝

Cách dùng:
  1. Xuất dữ liệu từ trình duyệt:
       - Mở DevTools (F12) > Console
       - Gõ: copy(localStorage.getItem('kc_users2'))
       - Dán vào file 'users_data.json' cùng thư mục
  2. Chạy: python xuat_tai_khoan.py
"""

import json
import os
from datetime import datetime

# ── Cấu hình ──────────────────────────────────────────────
INPUT_FILE   = 'users_data.json'   # file JSON dữ liệu users
OUTPUT_FILE1 = 'danh_sach_tai_khoan.txt'   # File 1: tên + SĐT
OUTPUT_FILE2 = 'chi_tiet_tai_khoan.txt'    # File 2: đầy đủ
# ──────────────────────────────────────────────────────────

def get_rank(elo):
    elo = elo or 1200
    if elo >= 2000: return 'Grandmaster 👑'
    if elo >= 1700: return 'Master 💎'
    if elo >= 1400: return 'Expert ⭐'
    if elo >= 1200: return 'Intermediate 🌸'
    return 'Beginner 🌱'

def load_users():
    if not os.path.exists(INPUT_FILE):
        print(f'❌ Không tìm thấy file "{INPUT_FILE}"')
        print('   Hãy xuất dữ liệu từ trình duyệt trước (xem hướng dẫn ở đầu file)')
        return {}
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        raw = f.read().strip()
    # Hỗ trợ cả dạng string lồng JSON (từ localStorage)
    try:
        data = json.loads(raw)
        if isinstance(data, str):
            data = json.loads(data)
        return data
    except json.JSONDecodeError as e:
        print(f'❌ Lỗi đọc JSON: {e}')
        return {}

def export_file1(users, now_str):
    """File 1: Danh sách gọn — tên tài khoản + SĐT"""
    lines = []
    lines.append('DANH SÁCH TÀI KHOẢN — YN CHESS 🌸')
    lines.append(f'Xuất lúc: {now_str}')
    lines.append(f'Tổng số tài khoản: {len(users)}')
    lines.append('─' * 50)
    lines.append(f'{"STT":<5} {"Tên tài khoản":<22} {"Số điện thoại":<15}')
    lines.append('─' * 50)
    for i, (name, u) in enumerate(sorted(users.items()), 1):
        phone = u.get('phone', '(chưa có)')
        lines.append(f'{str(i).zfill(3):<5} {name:<22} {phone:<15}')
    lines.append('─' * 50)
    lines.append(f'Tổng cộng: {len(users)} tài khoản')

    with open(OUTPUT_FILE1, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'✅ Đã xuất File 1: {OUTPUT_FILE1}  ({len(users)} tài khoản)')

def export_file2(users, now_str):
    """File 2: Chi tiết đầy đủ từng tài khoản"""
    lines = []
    lines.append('DANH SÁCH CHI TIẾT TÀI KHOẢN — YN CHESS 🌸')
    lines.append(f'Xuất lúc: {now_str}')
    lines.append('═' * 65)

    for i, (name, u) in enumerate(sorted(users.items()), 1):
        elo     = u.get('elo', 1200)
        phone   = u.get('phone', '(chưa có)')
        wins    = u.get('wins', 0)
        losses  = u.get('losses', 0)
        draws   = u.get('draws', 0)
        games   = u.get('games', 0)
        reg     = u.get('regDate', '(không rõ)')
        rank    = get_rank(elo)

        lines.append(f'[{str(i).zfill(3)}] {name}')
        lines.append(f'      Số ĐT      : {phone}')
        lines.append(f'      ELO        : {elo}')
        lines.append(f'      Xếp hạng   : {rank}')
        lines.append(f'      Ván đã chơi: {games}  (Thắng: {wins} / Thua: {losses} / Hòa: {draws})')
        lines.append(f'      Ngày đăng ký: {reg}')
        lines.append('─' * 65)

    lines.append(f'\nTổng cộng: {len(users)} tài khoản')

    with open(OUTPUT_FILE2, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'✅ Đã xuất File 2: {OUTPUT_FILE2}  (chi tiết)')

def main():
    print('╔══════════════════════════════════════════╗')
    print('║   YN CHESS — Xuất danh sách tài khoản   ║')
    print('╚══════════════════════════════════════════╝')
    users = load_users()
    if not users:
        return
    now_str = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    print(f'📂 Đọc được {len(users)} tài khoản từ {INPUT_FILE}\n')
    export_file1(users, now_str)
    export_file2(users, now_str)
    print('\n🎀 Hoàn tất! 2 file đã được tạo cùng thư mục.')

if __name__ == '__main__':
    main()