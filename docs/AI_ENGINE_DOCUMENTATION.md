# AI Engine Documentation: SalonFlow Platform

This guide describes the AI receptionist's core components: intent classification, function calling, prompts architecture, audio transcription, Hinglish keywords fallbacks, and error boundaries.

---

## 1. System Prompt Architecture

The system prompt is dynamically assembled for each salon (injecting `name`, `address`, and customizable instructions):
```
You are the AI Receptionist for "<Salon Name>".
Salon Phone: <WhatsApp Number>
Address: <Address>

Instructions:
<Salon AI Prompt Custom Instructions>

CORE RULES:
1. Always maintain the requested tone.
2. If a user asks for prices, answer them accurately based on the provided services.
3. Keep responses strictly under 3 sentences for WhatsApp readability.
4. If they want to book, ask them for the preferred date and time.
5. If the request is complex or they want to speak to a human, apologize and say you will notify the manager.

MULTILINGUAL / INDIAN MARKET RULES:
- Detect the language used by the customer.
- If they write in Hinglish (Hindi written in Latin characters, e.g. "Kal haircut kitne ka hai?"), reply in natural Hinglish.
- If they write in Hindi (Devanagari, e.g. "कल हेयरकट कितने का है?"), reply in Hindi.
- If they write in English, reply in English.
- The AI must understand slang, mixed sentences (Hindi + English), and relative dates in Hindi/Hinglish (like "kal", "parso", "sunday ko", "shaam ko").
- Respond to the customer in the same language and script they used.
```

---

## 2. Intent Classification Categories

All inbound WhatsApp messages are evaluated and classified into one of the following four intents:
1.  **`BOOKING`**: Customer wants to schedule, modify, or verify an appointment.
2.  **`FAQ`**: User queries about pricing, address location, contact number, or list of services.
3.  **`HUMAN_TAKEOVER`**: Explicit request to chat with staff (e.g. *"bhai baat karwao"*, *"speak to manager"*).
4.  **`OTHER`**: Miscellaneous greetings or non-actionable chat messages.

---

## 3. Function Calling & Extraction API

If intent is `BOOKING`, OpenAI Tool Calling triggers the `bookAppointment` function to extract structured fields:
*   **Function Name**: `bookAppointment`
*   **Parameters**:
    *   `date`: Strict `YYYY-MM-DD` format (resolving relative keywords like *"tomorrow"*, *"next Tuesday"* based on today's calendar state).
    *   `time`: Strict `HH:MM` 24h format (resolving relative indicators like *"shaam ko"*, *"afternoon"*).
    *   `serviceName`: Target service name (e.g. *"haircut"*, *"beard trim"*).

---

## 4. Local Smart Fallback Engine

If the OpenAI API is offline or credentials are not provided during development, the local fallback engine uses keyword mapping:

### Hinglish & Hindi Keyword Parsers

*   **Booking Intents**: Matches `book`, `schedul`, `appoint`, `haircut`, `facial`, `massage`, `shave`, `spa`, `katna` (haircutting), `cutting`, `karwana`, `slot`, `बुक` (Hindi), `अपॉइंटमेंट` (Hindi).
*   **FAQ / Pricing Intents**: Matches `price`, `cost`, `rate`, `service`, `address`, `location`, `phone`, `contact`, `rupay`, `kitna`, `kitne ka`, `paisay`, `charges`, `दाम` (Hindi), `कीमत` (Hindi).
*   **Human Takeover**: Matches `human`, `agent`, `manager`, `speak to`, `bhai` (Hinglish), `talk`, `call`, `बात` (Hindi).

---

## 5. Whisper Audio Note Transcription Pipeline

For WhatsApp Voice attachments, the backend extracts the audio file:
1.  **Fetch Metadata**: Resolves audio payload ID via WhatsApp Graph URL: `https://graph.facebook.com/v17.0/<media_id>`
2.  **Download Binary**: Downloads attachment array buffer.
3.  **Local Buffering**: Saves binary locally into `scratch/voice-<media_id>.ogg` (or `.mp3`).
4.  **Whisper API call**: Submits file stream to OpenAI `whisper-1` model with optimize parameter `language: 'hi'` (guaranteeing precise Hinglish/Hindi transcription).
5.  **Cleanup**: Unlinks local temporary scratch file.
6.  **Booking Pipeline**: Syncs transcript string into `parsed.text` for NLP intent processing.
