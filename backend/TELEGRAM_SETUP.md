# Telegram Bot Setup Guide

## Quick Start

### 1. Create Telegram Bot

1. Open Telegram app
2. Search for `@BotFather`
3. Send `/newbot`
4. Choose a name (e.g., "Memory OS Bot")
5. Choose a username (e.g., "memoryos_bot")
6. **Save the API Token** you receive

Example token: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

### 2. Configure Backend

Add to `/Users/geetag/Documents/memory-os/backend/.env`:

```bash
TELEGRAM_BOT_TOKEN=your_token_here
```

### 3. Apply Database Schema

```bash
cd /Users/geetag/Documents/memory-os/backend
psql -U your_user -d memory_os < src/db/messaging_integration.sql
```

### 4. Test Locally with ngrok

```bash
# Install ngrok (if not installed)
brew install ngrok

# Start tunnel
ngrok http 3000

# You'll get: https://abc123.ngrok.io
```

### 5. Set Webhook

Option A: Using curl
```bash
curl -F "url=https://abc123.ngrok.io/webhooks/telegram" \
     https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook
```

Option B: Via test script (create this)
```bash
node test-telegram-setup.js
```

### 6. Test the Bot

1. Open Telegram
2. Search for your bot: `@memoryos_bot`
3. Send `/start`
4. You should get activation code
5. Test commands:
   - `/help` - Show features
   - `/status` - Check settings
   - `/ghost` - Toggle ghost mode
   - Send text: "Spent 500 on coffee"
   - Bot replies with 👻 (ghost mode) or ✅ confirmation

---

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Get activation code |
| `/help` | Show all features |
| `/status` | View current settings |
| `/ghost` | Toggle Ghost Mode on/off |

---

## User Activation Flow

### Step 1: User Messages Bot
```
User: /start
Bot: 👋 Hi John! Welcome to Memory OS.

     Your activation code is: A3F9C2

     Please open the Memory OS app and go to:
     Settings → Integrations → Telegram

     Enter this code to link your account. 🔗
```

### Step 2: User Activates in App
```
POST /api/v1/integrations/activate
{
  "activation_code": "A3F9C2"
}

Response:
{
  "success": true,
  "message": "telegram integration activated!"
}
```

### Step 3: User Can Now Log Memories
```
User: Spent 500 on coffee
Bot: 👻  (if ghost mode)
  OR
Bot: ✅ Logged: Spent 500 on coffee  (if instant mode)
```

---

## API Endpoints

### Integration Management (In App)

**Get Integrations**
```
GET /api/v1/integrations
```

**Activate**
```
POST /api/v1/integrations/activate
{
  "activation_code": "A3F9C2"
}
```

**Update Preferences**
```
PATCH /api/v1/integrations/:id
{
  "ghost_mode_enabled": true,
  "digest_time": "21:00:00",
  "timezone": "Asia/Kolkata"
}
```

**Deactivate**
```
DELETE /api/v1/integrations/:id
```

### Webhook (Telegram Calls This)

```
POST /webhooks/telegram
(Telegram sends updates here automatically)
```

---

## Testing Checklist

- [ ] Bot responds to `/start`
- [ ] Activation code is generated
- [ ] Activation via API works
- [ ] Text messages are logged
- [ ] Ghost mode emoji works (👻)
- [ ] Instant mode confirmations work (✅)
- [ ] `/status` shows settings
- [ ] `/ghost` toggles mode
- [ ] `/help` shows features

---

## Troubleshooting

### Bot doesn't respond
1. Check ngrok tunnel is running
2. Verify webhook is set: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
3. Check server logs for errors

### Database errors
```bash
# Check if tables exist
psql -d memory_os -c "\d user_integrations"

# If not, apply schema
psql -d memory_os < src/db/messaging_integration.sql
```

### Webhook not receiving updates
```bash
# Delete old webhook
curl -X POST https://api.telegram.org/bot<TOKEN>/deleteWebhook

# Set new one
curl -F "url=https://YOUR_DOMAIN/webhooks/telegram" \
     https://api.telegram.org/bot<TOKEN>/setWebhook
```

---

## Production Deployment

### 1. Use Real Domain (not ngrok)
```bash
https://api.memoryos.app/webhooks/telegram
```

### 2. Set Webhook
```bash
curl -F "url=https://api.memoryos.app/webhooks/telegram" \
     https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook
```

### 3. Environment Variables
```
TELEGRAM_BOT_TOKEN=production_token_here
```

### 4. Monitor
```bash
# Check webhook status
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo

# Should show:
# - url: https://api.memoryos.app/webhooks/telegram
# - pending_update_count: 0
# - last_error_date: null
```

---

## Next Steps

1. ✅ Phase 1 Complete: Telegram Bot
2. ⏭️ Phase 2: WhatsApp Integration (Twilio)
3. ⏭️ Phase 3: Daily Digest Service
4. ⏭️ Phase 4: Voice Note Transcription (Gemini STT)

**Current Status**: Telegram bot is functional for text messages with ghost mode!
