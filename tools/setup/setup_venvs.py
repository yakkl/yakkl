#!/usr/bin/env python3

import os
import sys

YAKKL_PATH = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if YAKKL_PATH not in sys.path:
    sys.path.append(YAKKL_PATH)

from scripts.lib.setup_venv import setup_virtualenv
from scripts.lib.yakkl_tools import overwrite_symlink

VENV_PATH = "/srv/yakkl-py3-venv"

DEV_REQS_FILE = os.path.join(YAKKL_PATH, "requirements", "dev.txt")
THUMBOR_REQS_FILE = os.path.join(YAKKL_PATH, "requirements", "thumbor.txt")

def main() -> None:
    setup_virtualenv("/srv/yakkl-thumbor-venv", THUMBOR_REQS_FILE,
                     patch_activate_script=True, virtualenv_args=['-p', 'python2.7'])
    cached_venv_path = setup_virtualenv(
        VENV_PATH, DEV_REQS_FILE, patch_activate_script=True,
        virtualenv_args=['-p', 'python3'])
    overwrite_symlink(cached_venv_path, os.path.join(YAKKL_PATH, "yakkl-py3-venv"))

if __name__ == "__main__":
    main()
