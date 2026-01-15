# Input Capture - Testing Guide

## Flow Diagram

```
┌─────────────┐
│   Flutter   │
│  Frontend   │
└──────┬──────┘
       │
       │ Text Input or Voice Recording
       ▼
┌─────────────────────────────────────┐
│     Fastify Backend (Node.js)      │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Input Controller            │ │
│  │  - /api/v1/input/text        │ │
│  │  - /api/v1/input/voice       │ │
│  └───────────────┬───────────────┘ │
│                  │                  │
│  ┌───────────────▼───────────────┐ │
│  │    Input Service              │ │
│  │  - Validate input             │ │
│  │  - Check usage limits (free)  │ │
│  └┬──────────────┬────────────────┘ │
│   │              │                  │
│   │ Text         │ Voice (Buffer)   │
│   │              │                  │
│   │    ┌─────────▼───────────────┐ │
│   │    │  Voice Service           │ │
│   │    │  Google Speech-to-Text   │ │
│   │    └─────────┬───────────────┘ │
│   │              │                  │
│   │              │ Transcribed Text │
│   └──────────────┴─────────────┐   │
│                  │               │   │
│   ┌──────────────▼─────────────┐ │
│   │   LLM Service (Gemini)     │ │
│   │  - Intent classification   │ │
│   │  - Entity extraction       │ │
│   └──────────────┬─────────────┘ │
│                  │               │
│                  │ Understanding │
│   ┌──────────────▼──────────────┐ │
│   │   Memory Service            │ │
│   │  - Store in PostgreSQL      │ │
│   └──────────────┬──────────────┘ │
│                  │               │
└──────────────────┼─────────────────┘
                   │
                   ▼
              Memory Stored
         + Confirmation Response
```

## Text Input API

### Endpoint
```
POST /api/v1/input/text
```

### Request
```json
{
  "text": "Did chest workout for 45 minutes"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "memory": {
      "id": "uuid",
      "raw_input": "Did chest workout for 45 minutes",
      "category": "fitness",
      "event_type": "activity",
      "normalized_data": {
        "activity": "chest workout",
        "duration": 45
      },
      "confidence_score": 0.95,
      "status": "validated"
    },
    "understanding": {
      "eventType": "activity",
      "category": "fitness",
      "confidence": 0.95
    },
    "confirmation": "Got it! Logged your chest workout session."
  }
}
```

### Test with cURL
```bash
curl -X POST http://localhost:3000/api/v1/input/text \
  -H "Content-Type: application/json" \
  -d '{"text": "Did chest workout for 45 minutes"}'
```

---

## Voice Input API

### Endpoint
```
POST /api/v1/input/voice
```

### Request (multipart/form-data)
- **file**: Audio file (WebM, WAV, MP3, etc.)
- **encoding** (optional): Audio encoding (default: WEBM_OPUS)
- **sampleRate** (optional): Sample rate in Hz (default: 48000)
- **language** (optional): Language code (default: en-US)

### Response
```json
{
  "success": true,
  "data": {
    "transcription": {
      "text": "Did chest workout for 45 minutes",
      "confidence": 0.92,
      "language": "en-US"
    },
    "memory": { /* ... */ },
    "understanding": { /* ... */ },
    "confirmation": "Heard you! Logged chest workout."
  }
}
```

### Test with cURL
```bash
# Record 6-second audio first, then:
curl -X POST http://localhost:3000/api/v1/input/voice \
  -F "file=@recording.webm" \
  -F "language=en-US"
```

---

## Voice Quota API (Free Tier)

### Endpoint
```
GET /api/v1/input/voice/quota
```

### Response (Free Tier)
```json
{
  "success": true,
  "data": {
    "tier": "free",
    "used": 3,
    "remaining": 2,
    "limit": 5,
    "resetsAt": "2026-01-15T00:00:00.000Z"
  }
}
```

### Response (Pro Tier)
```json
{
  "success": true,
  "data": {
    "tier": "pro",
    "remaining": "unlimited",
    "used": null,
    "limit": null
  }
}
```

---

## Flutter Integration (Pseudo-code)

### Text Input
```dart
Future<void> submitText(String text) async {
  final response = await dio.post(
    '$baseUrl/api/v1/input/text',
    data: {'text': text},
  );
  
  if (response.data['success']) {
    showConfirmation(response.data['data']['confirmation']);
  }
}
```

### Voice Input
```dart
Future<void> submitVoice(File audioFile) async {
  // Check quota first
  final quota = await dio.get('$baseUrl/api/v1/input/voice/quota');
  
  if (quota.data['data']['tier'] == 'free' && 
      quota.data['data']['remaining'] == 0) {
    showUpgradeDialog();
    return;
  }
  
  // Upload audio
  FormData formData = FormData.fromMap({
    'file': await MultipartFile.fromFile(audioFile.path),
    'language': 'en-US',
  });
  
  final response = await dio.post(
    '$baseUrl/api/v1/input/voice',
    data: formData,
  );
  
  if (response.data['success']) {
    showConfirmation(response.data['data']['confirmation']);
  }
}
```

---

## Testing Locally

1. **Setup Google Cloud**:
   ```bash
   # Download service account JSON
   # Set in .env:
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
   ```

2. **Setup Gemini**:
   ```bash
   # Get API key from https://makersuite.google.com/app/apikey
   # Set in .env:
   GEMINI_API_KEY=your_key_here
   ```

3. **Test Text Input**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/input/text \
     -H "Content-Type: application/json" \
     -d '{"text": "Paid 500 rupees for groceries"}'
   ```

4. **Test Voice** (record audio first):
   ```bash
   # On Mac, record 6-second audio:
   sox -d -r 48000 recording.wav trim 0 6
   
   # Convert to WebM if needed:
   ffmpeg -i recording.wav -c:a libopus recording.webm
   
   # Upload:
   curl -X POST http://localhost:3000/api/v1/input/voice \
     -F "file=@recording.webm"
   ```

---

## Usage Limits (Freemium)

| Feature | Free Tier | Pro Tier |
|---------|-----------|----------|
| Text Input | ✅ Unlimited | ✅ Unlimited |
| Voice Input | ⚠️ 5/day (6 sec max) | ✅ Unlimited |
| Transcription | Google Speech-to-Text | Google Speech-to-Text |
| LLM Understanding | Gemini Flash | Gemini Flash |

---

## Error Handling

### 429 - Rate Limit Exceeded
```json
{
  "success": false,
  "error": "Daily voice input limit reached (5/day). Upgrade to Pro for unlimited voice input."
}
```

### 400 - Invalid Input
```json
{
  "success": false,
  "error": "Invalid input: text cannot be empty"
}
```

### 500 - Transcription Failed
```json
{
  "success": false,
  "error": "Could not transcribe audio. Please try again."
}
```
