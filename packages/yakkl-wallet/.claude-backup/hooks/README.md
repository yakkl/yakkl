# Claude Code Notification Hooks

This directory contains hooks that provide audio and visual notifications when Claude Code completes tasks.

## 🔔 Task Completion Notifications

The `task-complete-notify.sh` script provides:

### Audio Notifications
- **macOS**: Uses system sounds (Glass for success, Basso for errors)
- **Linux**: Uses freedesktop sounds or system beep
- **Windows**: Uses PowerShell system sounds

### Visual Notifications
- **macOS**: Native notifications with sound
- **Linux**: Desktop notifications via notify-send
- **Windows**: Toast notifications via PowerShell

## Configuration

Edit `.claude/settings.json` to customize:

```json
{
  "notifications": {
    "enabled": true,           // Master switch
    "soundEnabled": true,      // Audio notifications
    "desktopNotifications": true, // Visual notifications
    "notifyOnSuccess": true,   // Notify on successful completion
    "notifyOnError": true,     // Notify on errors
    "quietMode": false         // Temporarily disable all notifications
  }
}
```

## Usage

Notifications trigger automatically when:
- ✅ Files are written or edited successfully
- ✅ Multi-file edits complete
- ⚠️ Operations encounter errors
- ✅ Major tasks finish

### Quick Toggle

To temporarily disable notifications:
```bash
# Edit settings.json
"quietMode": true
```

### Different Notification Levels

1. **Major Operations** (Write/Multi-edit): Full notification with sound
2. **Minor Operations** (Single edit): Subtle beep only
3. **Errors**: Distinct error sound and notification

## Customization

### Custom Sounds (macOS)
```bash
# Edit task-complete-notify.sh to use different sounds:
# Available: Basso, Blow, Bottle, Frog, Funk, Glass, Hero, Morse, Ping, Pop, Purr, Sosumi, Submarine, Tink
osascript -e 'display notification "..." sound name "Hero"'
```

### Custom Sounds (Linux)
Place custom .oga files in `~/.local/share/sounds/` and update the script paths.

### Volume Control
- **macOS**: System Preferences → Sound → Sound Effects
- **Linux**: System Settings → Sound → System Sounds
- **Windows**: System Settings → Sound → App volume

## Troubleshooting

### No Sound on macOS
1. Check System Preferences → Sound → Sound Effects
2. Ensure "Play sound effects through" is set correctly
3. Check Do Not Disturb is off

### No Sound on Linux
1. Install required packages:
   ```bash
   sudo apt-get install pulseaudio-utils libnotify-bin
   ```
2. Check volume: `pactl list sinks`

### No Notifications on Windows
1. Ensure notifications are enabled in Windows Settings
2. Install BurntToast if needed:
   ```powershell
   Install-Module -Name BurntToast
   ```

## Log File

All completions are logged to `.claude/completion.log` for debugging:
```
[2024-01-27 15:30:45] Task completed: post-write
[2024-01-27 15:31:02] Task completed: post-multi-edit
```