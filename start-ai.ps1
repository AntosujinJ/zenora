# Starts Ollama in CPU mode for the clinic app.
#
# Ollama is installed on D:\Ollama (the C: drive was too small for its full
# ~3GB install, which left the C: copy corrupted/incomplete). Models live on
# D:\ollama_models. CPU mode is stable; with a small model replies are quick.
#
# If you later free up C: and reinstall there, or the GPU works, adjust the
# path / remove the CUDA_VISIBLE_DEVICES line below.

$OLLAMA = "D:\Ollama\ollama.exe"

Write-Host "Stopping any running Ollama..."
Get-Process ollama, "ollama app" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

$env:CUDA_VISIBLE_DEVICES = "-1"             # hide GPU -> force CPU
$env:OLLAMA_KEEP_ALIVE = "30m"               # keep the model warm
$env:OLLAMA_MODELS = "D:\ollama_models"      # models stored on D:

Write-Host "Starting Ollama (CPU mode) from $OLLAMA ..."
Start-Process -FilePath $OLLAMA -ArgumentList "serve" -WindowStyle Hidden

foreach ($i in 1..30) {
  Start-Sleep -Seconds 1
  try { Invoke-RestMethod "http://localhost:11434/api/tags" -TimeoutSec 3 | Out-Null; break } catch {}
}
Write-Host "Ollama is ready. Warming up gemma2:2b..."
$json = '{"model":"gemma2:2b","messages":[{"role":"user","content":"hi"}],"stream":false,"keep_alive":"30m","options":{"num_predict":1}}'
try { Invoke-RestMethod "http://localhost:11434/api/chat" -Method Post -Body $json -ContentType "application/json" -TimeoutSec 180 | Out-Null } catch {}
Write-Host "Done. Model is loaded and warm." -ForegroundColor Green
