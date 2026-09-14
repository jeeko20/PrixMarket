#!/bin/bash
# Lance le bot Telegram en arrière-plan, complètement détaché du shell courant.
# Utilise un double-fork pour éviter que le process ne soit tué quand le shell parent se termine.

cd /home/z/my-project

# Tue l'ancien process si existant
pkill -f "bun.*run-bot" 2>/dev/null
sleep 1

# Trouve le bon binaire bun
BUN_BIN=$(which bun)
echo "Bun binaire: $BUN_BIN"

# Lance le bot dans un sous-shell détaché avec setsid
setsid bash -c "
  cd /home/z/my-project
  # Détache stdin/stdout/stderr du parent
  exec </dev/null >>/home/z/my-project/bot.log 2>&1
  # Le exec remplace le shell par bun, mais setsid a déjà détaché le process
  exec $BUN_BIN run scripts/run-bot.ts
" &

# Récupère le PID du setsid-leader
PID=$!
echo "Bot lancé, PID initial: $PID"

# Attend un peu pour vérifier qu'il démarre
sleep 8

# Vérifie qu'il tourne encore
BOT_PID=$(pgrep -f "bun.*run-bot" | head -1)
if [ -n "$BOT_PID" ]; then
  echo "✅ Bot en cours d'exécution: PID $BOT_PID"
else
  echo "❌ Bot arrêté — vérifier bot.log"
  tail -10 /home/z/my-project/bot.log
fi

