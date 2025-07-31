#!/usr/bin/env python3
"""
Alternative notification system for Claude Code completions.
Run this in a separate terminal to monitor for file changes and play sounds.
"""

import os
import sys
import time
import subprocess
from pathlib import Path
from datetime import datetime

# Configuration
WATCH_DIR = Path.cwd()
SOUND_SUCCESS = "/System/Library/Sounds/Glass.aiff"
SOUND_ERROR = "/System/Library/Sounds/Basso.aiff"
CHECK_INTERVAL = 1  # seconds

def play_sound(sound_file):
    """Play a sound file on macOS"""
    try:
        subprocess.run(["afplay", sound_file], check=True)
    except:
        # Fallback to beep
        print("\a", end="", flush=True)

def show_notification(title, message):
    """Show macOS notification"""
    try:
        script = f'display notification "{message}" with title "{title}"'
        subprocess.run(["osascript", "-e", script])
    except:
        pass

def monitor_changes():
    """Monitor for file changes"""
    print("🔔 Claude Code Notification Monitor Started")
    print(f"Watching: {WATCH_DIR}")
    print("You'll hear a sound when files are created/modified")
    print("Press Ctrl+C to stop\n")
    
    # Track file modification times
    file_times = {}
    
    # Get initial file states
    for root, dirs, files in os.walk(WATCH_DIR):
        # Skip .git and other hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        for file in files:
            if not file.startswith('.'):
                filepath = Path(root) / file
                try:
                    file_times[filepath] = filepath.stat().st_mtime
                except:
                    pass
    
    try:
        while True:
            time.sleep(CHECK_INTERVAL)
            
            # Check for changes
            for root, dirs, files in os.walk(WATCH_DIR):
                dirs[:] = [d for d in dirs if not d.startswith('.')]
                
                for file in files:
                    if not file.startswith('.'):
                        filepath = Path(root) / file
                        try:
                            current_mtime = filepath.stat().st_mtime
                            
                            # New or modified file
                            if filepath not in file_times or file_times[filepath] < current_mtime:
                                file_times[filepath] = current_mtime
                                
                                # Play notification
                                print(f"✅ Change detected: {filepath.name}")
                                play_sound(SOUND_SUCCESS)
                                show_notification("Claude Code", f"Updated: {filepath.name}")
                        except:
                            pass
                            
    except KeyboardInterrupt:
        print("\n\n👋 Notification monitor stopped")

if __name__ == "__main__":
    monitor_changes()