# Free AI Chatbot Setup with Ollama (No API Key Required!)

## What is Ollama?
- **Completely free** - runs AI models locally on your machine
- **No API keys** - no external services needed
- **Private** - your code/data never leaves your computer
- **Fast** - models run on your local hardware

## Step 1: Install Ollama

### Windows:
1. Download from: https://ollama.ai/download
2. Run the installer
3. Open Command Prompt or PowerShell and verify:
   ```bash
   ollama --version
   ```

## Step 2: Pull a Free Model

Run one of these commands in PowerShell/Command Prompt:

**Option A: Mistral (Fast & Good Quality) - RECOMMENDED**
```bash
ollama pull mistral
```

**Option B: Neural Chat (Optimized for chat)**
```bash
ollama pull neural-chat
```

**Option C: Orca (Good for code)**
```bash
ollama pull orca-mini
```

This downloads the model (first time takes 5-20 minutes depending on model size).

## Step 3: Start Ollama Service

Simply keep the Ollama window open, or it auto-runs in the background.

Verify it's running:
```bash
curl http://localhost:11434/api/tags
```

You should get a JSON response with your models.

## Step 4: Update Code Editor

The integration is already done! Just restart the server:

```bash
cd server
npm install  # Install axios if not already done
node index.js
```

## Step 5: Use the Chatbot

1. Open http://localhost:5173
2. Join a room
3. Click "AI Chat"
4. Ask any code questions - Ollama will respond locally!

## Features
✅ Completely free  
✅ Works offline  
✅ No rate limits  
✅ Private & secure  
✅ Fast responses (2-10 seconds depending on model)

## Model Sizes & Speed

| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| mistral | 4.1 GB | Fast | Excellent |
| neural-chat | 4.1 GB | Fast | Very Good |
| orca-mini | 1.4 GB | Very Fast | Good |

**Recommendation:** Start with `mistral` - best balance of speed and quality.

## Troubleshooting

### Port 11434 already in use
```bash
# Kill existing Ollama process
taskkill /IM ollama.exe /F

# Restart Ollama
ollama serve
```

### Model won't load
```bash
# Check installed models
ollama list

# Re-pull the model
ollama pull mistral
```

### Slow responses
- Decrease `max_tokens` in server code (from 1024 to 512)
- Use smaller model (orca-mini instead of mistral)
- Check disk space

## Advanced: Use Custom Ollama Port

If you want Ollama on a different port:
```bash
OLLAMA_HOST=0.0.0.0:9999 ollama serve
```

Then update server code URL accordingly.

---

Ready? Install Ollama and run `ollama pull mistral`, then restart the server! 🚀
