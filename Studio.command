#!/bin/zsh
# Double-click in Finder to open the Spanish Mum in Paris studio in the browser.
# Keep this window open while you work; close it to stop the studio.
cd "${0:A:h}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
PORT=4747 # the studio's own port, also used by npm run dev / npm start
URL="http://localhost:$PORT"

if curl -s -o /dev/null "$URL"; then
  open "$URL"
  exit 0
fi

if ! command -v npm >/dev/null; then
  echo "Node.js is needed to run the studio: install it from https://nodejs.org, then double-click again."
  read -k1
  exit 1
fi

[ -d node_modules ] || npm install

# Build on the first run and after any update of the code.
if [ ! -f .next/BUILD_ID ] || [ -n "$(find src drizzle public package.json next.config.ts -newer .next/BUILD_ID -print -quit 2>/dev/null)" ]; then
  echo "Preparing the studio (first time, or after an update)…"
  npm run build || { echo "The build failed. Press a key to close."; read -k1; exit 1; }
fi

(sleep 2 && open "$URL") &
echo "Studio running at $URL. Close this window to stop it."
npm start
