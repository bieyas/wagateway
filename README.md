# WhatsApp Gateway

WhatsApp Gateway dengan AI Customer Service — **100% kompatibel dengan Wablas API**.

## Fitur

- **Notifikasi Outbound** — Kirim pesan teks, gambar, dokumen, video, audio
- **Wablas Compatible** — Ganti domain saja di aplikasi billing, tidak perlu ubah kode
- **AI Customer Service** — GPT-4o dengan context memory, persona kustom, simulasi mengetik
- **Anti-ban Queue** — Semua pesan dikirim via BullMQ dengan delay otomatis
- **Webhook Reliable** — Forward pesan masuk ke aplikasi existing dengan retry mechanism
- **Human Takeover** — Agen manusia bisa ambil alih dari AI kapan saja
- **Jam Operasional** — AI hanya aktif di jam yang dikonfigurasi

## Tech Stack

- NestJS + TypeScript
- Baileys (WhatsApp Web API)
- PostgreSQL + TypeORM
- Redis + BullMQ
- OpenAI GPT-4o
- Socket.io (WebSocket)

## Quick Start

### 1. Jalankan PostgreSQL dan Redis

```bash
docker-compose up -d
```

### 2. Install dependencies

```bash
cd backend
npm install
```

### 3. Konfigurasi environment

```bash
cp .env.example .env
# Edit .env: isi OPENAI_API_KEY, DB credentials
```

### 4. Jalankan server

```bash
# Development
npm run start:dev

# Production
npm run build
pm2 start ecosystem.config.js
```

### 5. Akses API Docs

```
http://localhost:3000/docs
```

---

## Integrasi dengan Aplikasi Billing (Wablas)

Di aplikasi billing Anda, ubah hanya:

```
Domain API: localhost:3000  (atau domain server Anda)
Token API:  [token dari endpoint POST /api/device]
```

Semua endpoint Wablas yang sudah berjalan **langsung kompatibel**.

---

## API Endpoints

### Device Management
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/device` | Buat device baru |
| GET | `/api/device` | List semua device |
| GET | `/api/device/:id` | Detail device |
| PUT | `/api/device/:id` | Update device |
| DELETE | `/api/device/:id` | Hapus device |
| POST | `/api/device/:id/connect` | Mulai koneksi WA |
| GET | `/api/device/:id/qr` | Get QR code |

### Messaging (Wablas Compatible)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/send-message` | Kirim teks (query string) |
| POST | `/api/send-message` | Kirim teks |
| POST | `/api/send-image` | Kirim gambar |
| POST | `/api/send-document` | Kirim dokumen |
| POST | `/api/send-video` | Kirim video |
| POST | `/api/send-audio` | Kirim audio |
| POST | `/api/v2/send-message` | Bulk kirim |
| GET | `/api/message/status/:id` | Status pengiriman |

### AI Customer Service
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/ai-agent` | Get konfigurasi AI |
| PUT | `/api/ai-agent` | Update konfigurasi AI |
| GET | `/api/ai-agent/conversations` | List percakapan |
| GET | `/api/ai-agent/conversations/:phone` | Riwayat chat |
| DELETE | `/api/ai-agent/conversations/:phone` | Reset percakapan |
| POST | `/api/ai-agent/conversations/:phone/handoff` | Eskalasi ke manusia |
| POST | `/api/ai-agent/conversations/:phone/takeover` | Human ambil alih |
| POST | `/api/ai-agent/conversations/:phone/release` | Kembalikan ke AI |

---

## Konfigurasi AI Agent

```json
PUT /api/ai-agent
Authorization: <token>

{
  "enabled": true,
  "persona": "Sari, CS Toko ABC yang ramah",
  "systemPrompt": "Kamu adalah Sari, CS Toko ABC...",
  "model": "gpt-4o",
  "temperature": 0.7,
  "operatingStart": "08:00",
  "operatingEnd": "22:00",
  "timezone": "Asia/Jakarta",
  "handoffKeywords": ["agen", "manusia", "cs", "operator"],
  "outsideHoursMessage": "Maaf, kami sedang offline. Kami akan balas besok pukul 08.00 ya 😊",
  "simulateTyping": true
}
```
