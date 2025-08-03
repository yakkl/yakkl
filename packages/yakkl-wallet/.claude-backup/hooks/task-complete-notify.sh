#!/bin/bash
# Task completion notification hook for Claude Code
# Plays a sound when Claude completes a task

# Function to play notification sound based on OS
play_notification() {
    local success=$1
    
    # Detect operating system
    case "$(uname -s)" in
        Darwin*)
            # macOS - use afplay or osascript
            if [ "$success" = "true" ]; then
                # Success sound
                osascript -e 'display notification "Task completed successfully! ✅" with title "Claude Code" sound name "Glass"' 2>/dev/null
                # Alternative: afplay /System/Library/Sounds/Glass.aiff
            else
                # Error sound
                osascript -e 'display notification "Task completed with errors ⚠️" with title "Claude Code" sound name "Basso"' 2>/dev/null
                # Alternative: afplay /System/Library/Sounds/Basso.aiff
            fi
            ;;
        Linux*)
            # Linux - use paplay, aplay, or speaker-test
            if command -v paplay &> /dev/null; then
                if [ "$success" = "true" ]; then
                    paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null
                else
                    paplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null
                fi
            elif command -v aplay &> /dev/null; then
                # Use system beep
                echo -e "\a"
            fi
            
            # Send desktop notification if available
            if command -v notify-send &> /dev/null; then
                if [ "$success" = "true" ]; then
                    notify-send "Claude Code" "Task completed successfully! ✅" -i dialog-information
                else
                    notify-send "Claude Code" "Task completed with errors ⚠️" -i dialog-warning
                fi
            fi
            ;;
        CYGWIN*|MINGW*|MSYS*)
            # Windows - use PowerShell
            if [ "$success" = "true" ]; then
                powershell.exe -c "[System.Media.SystemSounds]::Asterisk.Play()" 2>/dev/null
                powershell.exe -c "New-BurntToastNotification -Text 'Claude Code', 'Task completed successfully!'" 2>/dev/null
            else
                powershell.exe -c "[System.Media.SystemSounds]::Hand.Play()" 2>/dev/null
                powershell.exe -c "New-BurntToastNotification -Text 'Claude Code', 'Task completed with errors'" 2>/dev/null
            fi
            ;;
    esac
}

# Check what type of completion this is
case "$CLAUDE_HOOK_TYPE" in
    "post-write"|"post-multi-edit")
        # File operations completed
        echo "✅ Files updated successfully"
        play_notification "true"
        ;;
    "post-edit")
        # Single edit completed
        echo "✅ Edit completed"
        # Quieter notification for single edits
        case "$(uname -s)" in
            Darwin*)
                osascript -e 'beep' 2>/dev/null
                ;;
            *)
                echo -e "\a"
                ;;
        esac
        ;;
    "error")
        # Task failed
        echo "⚠️  Task encountered an error"
        play_notification "false"
        ;;
    *)
        # Generic completion
        echo "✅ Task completed"
        play_notification "true"
        ;;
esac

# Log completion for debugging
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Task completed: $CLAUDE_HOOK_TYPE" >> .claude/completion.log

exit 0