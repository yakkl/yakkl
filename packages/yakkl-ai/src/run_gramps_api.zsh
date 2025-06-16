#!/bin/zsh

# Load environment variables from .env file
if [ -f .env ]; then
  echo "Loading environment variables from .env..."
  export $(grep -v '^#' .env | xargs)
else
  echo ".env file not found! Exiting..."
  exit 1
fi

# Check required environment variables
if [[ -z "$OPENAI_API_KEY" || -z "$GRAMPS_API_PATH" ]]; then
  echo "Missing OPENAI_API_KEY or GRAMPS_API_PATH in .env"
  exit 1
fi

# Navigate to the API script directory
cd "$GRAMPS_API_PATH" || {
  echo "Could not navigate to $GRAMPS_API_PATH"
  exit 1
}

# Run the Python Gramps API server
echo "Starting Gramps API server at $GRAMPS_API_PATH..."
python3 grampsAITemplate.py
