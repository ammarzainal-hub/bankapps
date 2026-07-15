# Design Reference — Fluent Design × Apple Clean Style

Token dan komponen UI yang digunakan pada **Portal Pelaporan PLC Sekolah** — kad lembut bergaya Microsoft Fluent, whitespace lapang bergaya Apple, dan aksen gradient biru–cyan–ungu. Salin token/kod di bawah terus ke projek lain.

- **Sumber:** Portal Pelaporan PLC Sekolah
- **Rangka:** HTML + CSS + JS biasa
- **Fon:** Sora + Inter (dibenam sebagai data URI)

---

## 1. Warna

Setiap warna ada peranan tunggal — jangan campur guna warna semantik (success/pending/error) sebagai aksen jenama.

### Tema Terang (Light)

| Token | Peranan | Hex |
|---|---|---|
| `--bg` | Latar Utama | `#F8FAFC` |
| `--bg-inset` | Latar Inset | `#F1F5F9` |
| `--card` | Kad | `#FFFFFF` |
| `--border` | Border | `#E2E8F0` |
| `--text` | Teks Utama | `#0F172A` |
| `--muted` | Teks Muted | `#64748B` |
| `--primary` | Primary | `#2563EB` |
| `--primary-dark` | Primary Dark | `#1D4ED8` |
| `--secondary` | Secondary | `#06B6D4` |
| `--accent` | Accent | `#7C3AED` |
| `--success-text` / `--success-bg` | Success | `#166534` / `#DCFCE7` |
| `--pending-text` / `--pending-bg` | Pending | `#92400E` / `#FEF3C7` |
| `--error-text` / `--error-bg` | Error | `#991B1B` / `#FEE2E2` |

### Tema Gelap (Dark)

```css
:root[data-theme="dark"] {
    --bg: #0A0F1C; --bg-inset: #0F172A; --card: #121A2E; --border: #1E293B;
    --text: #E7ECF5; --muted: #93A1B8;
    --primary: #4F8CFF; --primary-dark: #7DA6FF; --secondary: #22D3EE; --accent: #A78BFA;
    --success-bg: #0F2D1C; --success-text: #4ADE80;
    --error-bg: #341418; --error-text: #FB7185;
    --pending-bg: #302008; --pending-text: #FBBF24;
    --shadow-card: 0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.35);
    --shadow-card-hover: 0 4px 10px rgba(0,0,0,.35), 0 16px 36px rgba(79,140,255,.18);
    --code-bg: #060A14; --code-text: #DCE6F5; --code-accent: #7DD3FC;
    color-scheme: dark;
}

:root[data-theme="light"] {
    --bg: #F8FAFC; --bg-inset: #F1F5F9; --card: #FFFFFF; --border: #E2E8F0;
    --text: #0F172A; --muted: #64748B;
    --primary: #2563EB; --primary-dark: #1D4ED8; --secondary: #06B6D4; --accent: #7C3AED;
    --success-bg: #DCFCE7; --success-text: #166534;
    --error-bg: #FEE2E2; --error-text: #991B1B;
    --pending-bg: #FEF3C7; --pending-text: #92400E;
    --shadow-card: 0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.06);
    --shadow-card-hover: 0 4px 10px rgba(15,23,42,.06), 0 16px 36px rgba(37,99,235,.14);
    --code-bg: #0F172A; --code-text: #E2E8F0; --code-accent: #7DD3FC;
    color-scheme: light;
}
```

---

## 2. Tipografi

**Sora** (600–800) untuk heading — bentuk geometrik, tegas, sesuai untuk tajuk pendek.
**Inter** (400–700) untuk body/UI — neutral, sangat mudah dibaca pada saiz kecil.

| Peranan | Spesifikasi | Contoh |
|---|---|---|
| Display / H1 | Sora 800 · 2.4rem | Portal Pelaporan PLC |
| Heading / H2 | Sora 700 · 1.7rem | Senarai Bengkel Guru |
| Subheading / H3 | Sora 600 · 1.2rem | Jumlah Peserta Berdaftar |
| Body | Inter 400 · 1rem | Jejak status penghantaran laporan PLC bagi setiap bengkel pusat, terus dari data pendaftaran guru secara langsung. |
| Body Medium | Inter 500 · 0.92rem | Guna untuk label butang, nilai stat, dan teks yang perlu sedikit penekanan. |
| Label / Eyebrow | Inter 600 · 0.75rem · uppercase | Status Laporan |

---

## 3. Radius & Bayang

Kad besar guna radius 20px (Fluent-style, sangat lembut). Elemen dalaman (input, badge) guna radius lebih kecil supaya hierarki visual kekal jelas.

| Token | Nilai |
|---|---|
| `--radius-lg` | 20px |
| `--radius-md` | 14px |
| `--radius-sm` | 10px |
| `--shadow-card` | rehat (rest state) |
| `--shadow-card-hover` | hover / naik |

---

## 4. Komponen

Setiap komponen: demo hidup di atas, kod ringkas di bawah untuk salin terus.

### Butang

```css
.btn {
  background: var(--gradient-primary);
  color: white;
  border-radius: 999px;
  padding: 10px 18px;
  box-shadow: 0 6px 16px rgba(37,99,235,.24);
  transition: transform .18s ease, box-shadow .18s ease;
}
.btn:hover { transform: translateY(-2px); }
```

### Badge Status

```css
.badge {
  display: inline-flex; gap: 6px;
  padding: 4px 12px; border-radius: 999px;
  font-weight: 600; font-size: .8rem;
}
.badge-ok { background: #DCFCE7; color: #166534; }
```

### Kad Statistik & Kad Kandungan

```css
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg); /* 20px */
  box-shadow: var(--shadow-card);
  transition: transform .2s ease, box-shadow .2s ease;
}
.card:hover { transform: translateY(-4px); box-shadow: var(--shadow-card-hover); }
```

### Jadual

```css
.table th {
  background: var(--bg-inset); color: var(--muted);
  text-transform: uppercase; font-size: .72rem;
}
.table tbody tr:hover { background: var(--bg-inset); }
```

### Medan Borang

```css
.field input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(37,99,235,.10);
}
```

### Hero Gradient

```css
.hero {
  background: linear-gradient(135deg, #2563EB 0%, #06B6D4 55%, #7C3AED 100%);
  border-radius: var(--radius-lg);
  color: white;
  padding: 40px 36px;
}
```

### Mesej Flash

```css
.flash {
  display: flex; gap: 10px; align-items: center;
  padding: 12px 16px; border-radius: var(--radius-sm);
}
```

---

## 5. Sistem Ikon

Ikon garis gaya Lucide, dibenam terus sebagai inline SVG (bukan CDN) — berfungsi luar talian, tiada request luar, warna ikut `currentColor`.

Set ikon yang digunakan: `check-circle`, `clock`, `users`, `upload`, `eye`, `filter`, `arrow-right`, `alert-circle`, `calendar`, `building`, `list`, `file-text`.

```php
// PHP — tapi corak sama untuk mana-mana bahasa
function icon($name) {
  $paths = ['check-circle' => '<path d="..."/>', /* ... */];
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    . $paths[$name] . '</svg>';
}
```

---

## 6. Gerakan

Dua corak sahaja: **fade-in-up** bila kandungan muncul, dan **hover-lift** pada kad/butang. Semua transition dimatikan automatik bila `prefers-reduced-motion` aktif.

```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in-up { animation: fade-in-up .45s ease both; }

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
```

---

## 7. Titik Putus Responsif

| Julat | Perubahan |
|---|---|
| `> 768px` | Grid penuh (2–3 lajur), nav penuh dengan label teks |
| `≤ 768px` | Grid runtuh 1 lajur, nav jadi ikon sahaja, padding dikecilkan |
| `≤ 520px` | Saiz fon tajuk & stat dikecilkan sedikit lagi |

---

## 8. Kod CSS Penuh

Token teras — salin blok ini ke projek lain sebagai titik permulaan, kemudian tambah komponen ikut keperluan.

```css
:root {
  --bg: #F8FAFC;
  --bg-inset: #F1F5F9;
  --card: #FFFFFF;
  --border: #E2E8F0;
  --text: #0F172A;
  --muted: #64748B;
  --primary: #2563EB;
  --primary-dark: #1D4ED8;
  --secondary: #06B6D4;
  --accent: #7C3AED;
  --success-bg: #DCFCE7; --success-text: #166534;
  --error-bg: #FEE2E2; --error-text: #991B1B;
  --pending-bg: #FEF3C7; --pending-text: #92400E;
  --gradient-hero: linear-gradient(135deg, #2563EB 0%, #06B6D4 55%, #7C3AED 100%);
  --gradient-primary: linear-gradient(135deg, #2563EB 0%, #06B6D4 100%);
  --shadow-card: 0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.06);
  --shadow-card-hover: 0 4px 10px rgba(15,23,42,.06), 0 16px 36px rgba(37,99,235,.14);
  --radius-lg: 20px; --radius-md: 14px; --radius-sm: 10px;
  --font-heading: 'Sora', -apple-system, sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Guna @media (prefers-color-scheme: dark) + [data-theme] override kalau perlu tema gelap.
   Lihat bahagian dark/light token di atas untuk contoh penuh token gelap. */

* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font-body); line-height: 1.6; }

h1, h2, h3 { font-family: var(--font-heading); font-weight: 700; letter-spacing: -0.02em; margin: 0 0 8px; }

/* ---------- Kad asas ---------- */
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: 22px;
  transition: transform .2s ease, box-shadow .2s ease;
}
.card:hover { transform: translateY(-4px); box-shadow: var(--shadow-card-hover); }

/* ---------- Butang ---------- */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--gradient-primary); color: white; text-decoration: none;
  padding: 10px 18px; border-radius: 999px; border: none;
  font-family: var(--font-body); font-weight: 600; font-size: .92rem; cursor: pointer;
  box-shadow: 0 6px 16px rgba(37,99,235,.24);
  transition: transform .18s ease, box-shadow .18s ease;
}
.btn:hover { transform: translateY(-2px); box-shadow: 0 10px 22px rgba(37,99,235,.32); }
.btn.ghost { background: transparent; color: var(--primary); box-shadow: none; border: 1.5px solid var(--border); }

/* ---------- Badge / status pill ---------- */
.badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 12px; border-radius: 999px; font-weight: 600; font-size: .8rem;
}
.badge-ok { background: var(--success-bg); color: var(--success-text); }
.badge-pending { background: var(--pending-bg); color: var(--pending-text); }
.badge-error { background: var(--error-bg); color: var(--error-text); }

/* ---------- Jadual ---------- */
.table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.table th, .table td { text-align: left; padding: 12px 16px; border-bottom: 1px solid var(--border); font-size: .9rem; }
.table th { background: var(--bg-inset); color: var(--muted); font-weight: 600; font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; }
.table tbody tr:hover { background: var(--bg-inset); }

/* ---------- Medan borang ---------- */
.field input, .field select {
  padding: 10px 13px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  font-family: var(--font-body); font-size: .92rem; background: var(--card); color: var(--text);
}
.field input:focus, .field select:focus {
  outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px rgba(37,99,235,.10);
}

/* ---------- Hero gradient ---------- */
.hero {
  background: var(--gradient-hero); border-radius: var(--radius-lg);
  padding: 40px 36px; color: white; position: relative; overflow: hidden;
}
.hero::after {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(circle at 85% 0%, rgba(255,255,255,.25), transparent 55%);
}

/* ---------- Flash / alert ---------- */
.flash { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: var(--radius-sm); font-weight: 500; }

/* ---------- Gerakan ---------- */
@keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.fade-in-up { animation: fade-in-up .45s ease both; }

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}

/* ---------- Ikon SVG (contoh inline, tiada CDN) ---------- */
.icon { width: 20px; height: 20px; flex-shrink: 0; }
.icon-sm { width: 16px; height: 16px; }

/* ---------- Responsive ---------- */
@media (max-width: 768px) {
  .nav span { display: none; }
  .grid { grid-template-columns: 1fr; }
}
```

---

*Dijana daripada design system **Portal Pelaporan PLC Sekolah**. Salin token warna/tipografi/komponen di atas untuk mula projek baharu dengan bahasa visual yang sama.*
