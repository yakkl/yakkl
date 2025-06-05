# Configuration
ENV_FILE = .env
VENV_DIR = venv
PYTHON = $(VENV_DIR)/bin/python
PIP = $(VENV_DIR)/bin/pip
ACTIVATE = source $(VENV_DIR)/bin/activate

.PHONY: all setup install run clean

# 1. Set up virtual environment
setup:
	@echo "🔧 Creating virtual environment..."
	python3 -m venv $(VENV_DIR)

# 2. Install dependencies
install:
	@echo "📦 Installing requirements..."
	$(PIP) install -r requirements.txt

# 3. Run the API server
run:
	@echo "🚀 Starting Gramps API..."
	@$(ACTIVATE) && ./run_gramps_api.zsh

# 4. Clean up the environment
clean:
	@echo "🧹 Cleaning up..."
	rm -rf $(VENV_DIR) __pycache__

# 5. Full bootstrap: setup + install
bootstrap: setup install
