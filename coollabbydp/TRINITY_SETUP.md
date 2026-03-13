# Trinity API Integration Setup Guide

## Overview
This project now integrates **Arcee AI Trinity Large Preview** (free tier) for an AI-powered chatbot assistant in the collaborative code editor.

## Prerequisites

### 1. Get Trinity API Key from Replicate
Trinity Large is available through Replicate's free tier.

**Steps:**
1. Go to https://replicate.com/arcee-ai/trinity-large-preview
2. Sign up for a free Replicate account
3. Copy your API token from settings: https://replicate.com/account/api-tokens

### 2. Install Dependencies
```bash
cd server
npm install
```

### 3. Configure Environment Variables
1. Rename `.env.example` to `.env` in the server folder
2. Add your Trinity API key:
```bash
TRINITY_API_KEY=your_replicate_api_token_here
RAPIDAPI_KEY=your_judge0_key_if_using_code_execution
```

## How It Works

### Architecture
- **Frontend (React)**: User sends prompts to the AI chatbot
- **Backend (Express)**: Receives the request, calls Replicate's Trinity API
- **Trinity API**: Processes the request using arcee-ai/trinity-large-preview model
- **Response**: AI answer is streamed back to the user in the chat interface

### API Endpoint: `/ai-suggest`
**Method:** `POST`  
**Request:**
```json
{
  "code": "your code here",
  "language": "javascript|python|cpp",
  "prompt": "your question for the AI"
}
```

**Response:**
```json
{
  "suggestion": "AI response here",
  "type": "ai_suggestion"
}
```

## Features

✅ Context-aware code suggestions  
✅ Works with any programming language  
✅ Free tier available (Replicate)  
✅ Real-time chat interface  
✅ Integrated with collaborative editing  

## Using the Chatbot

1. Start the server:
```bash
cd server
node index.js
```

2. Start the client:
```bash
cd client
npm run dev
```

3. Join a room and click the AI Chat button
4. Ask the AI assistant questions like:
   - "Explain this code"
   - "Optimize this code"
   - "Find bugs in this code"
   - "Refactor this code"

## Model Details

- **Model:** arcee-ai/trinity-large-preview
- **Provider:** Replicate
- **Tier:** Free
- **Max Tokens:** 512 (configurable)
- **Temperature:** 0.7 (configurable)

## Customization

### Change Model Parameters
Edit `server/index.js` in the `/ai-suggest` route:

```javascript
input: {
  prompt: userPrompt,
  system_prompt: systemPrompt,
  max_tokens: 512,    // Change this
  temperature: 0.7    // Change this (0-1)
}
```

- **max_tokens**: Limits response length (higher = longer responses)
- **temperature**: Controls randomness (0 = deterministic, 1 = creative)

### Use Different Prompt Engineering
Modify the system prompt in the `/ai-suggest` route to customize the AI's behavior.

## Troubleshooting

### "API key not configured" Error
- Make sure `.env` file exists in the `server` folder
- Check that `TRINITY_API_KEY` is set correctly
- Verify API key from https://replicate.com/account/api-tokens

### "No response generated"
- Check Replicate service status
- Verify API key has proper permissions
- Check server console logs for detailed errors

### Slow responses
- Trinity Large is a larger model, responses may take 5-10 seconds
- Consider adjusting `max_tokens` to reduce response time

## API Rates & Limits

- **Free Tier:** Limited concurrent requests
- **Replicate Free:** ~20-30 requests per hour
- For production use, consider upgrading your Replicate plan

## Next Steps

1. Test the chatbot with various code snippets
2. Customize system prompts for your use case
3. Monitor API usage on Replicate dashboard
4. Consider adding rate limiting to your backend

---

**Questions?** Check Replicate docs: https://replicate.com/docs
