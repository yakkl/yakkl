#!/bin/bash
# Sound testing script for Claude Code notifications

play_sound() {
    local sound_type=$1
    local custom_path=$2
    
    echo "🔊 Playing $sound_type sound..."
    
    case "$(uname -s)" in
        Darwin*)
            # macOS
            case "$sound_type" in
                "success")
                    echo "✅ Success notification (Glass)"
                    afplay /System/Library/Sounds/Glass.aiff
                    ;;
                "error")
                    echo "❌ Error notification (Basso)"
                    afplay /System/Library/Sounds/Basso.aiff
                    ;;
                "beep")
                    echo "🔔 Simple beep"
                    osascript -e 'beep'
                    ;;
                "ping")
                    echo "📍 Ping sound"
                    afplay /System/Library/Sounds/Ping.aiff
                    ;;
                "pop")
                    echo "💫 Pop sound"
                    afplay /System/Library/Sounds/Pop.aiff
                    ;;
                "hero")
                    echo "🦸 Hero sound"
                    afplay /System/Library/Sounds/Hero.aiff
                    ;;
                "all-mac")
                    echo "🎵 Playing all macOS system sounds..."
                    for sound in Basso Blow Bottle Frog Funk Glass Hero Morse Ping Pop Purr Sosumi Submarine Tink; do
                        echo "  → $sound"
                        afplay "/System/Library/Sounds/$sound.aiff"
                        sleep 1
                    done
                    ;;
                "custom")
                    if [ -f "$custom_path" ]; then
                        echo "🎵 Playing custom sound: $custom_path"
                        afplay "$custom_path"
                    else
                        echo "❌ Custom sound file not found: $custom_path"
                    fi
                    ;;
                *)
                    echo "✅ Default success sound"
                    afplay /System/Library/Sounds/Glass.aiff
                    ;;
            esac
            ;;
            
        Linux*)
            # Linux
            case "$sound_type" in
                "success")
                    echo "✅ Success notification"
                    paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null || echo -e "\a"
                    ;;
                "error")
                    echo "❌ Error notification"
                    paplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null || echo -e "\a"
                    ;;
                "beep")
                    echo "🔔 System beep"
                    echo -e "\a"
                    ;;
                *)
                    echo -e "\a"
                    ;;
            esac
            ;;
            
        CYGWIN*|MINGW*|MSYS*)
            # Windows
            case "$sound_type" in
                "success")
                    echo "✅ Success notification"
                    powershell.exe -c "[System.Media.SystemSounds]::Asterisk.Play()"
                    ;;
                "error")
                    echo "❌ Error notification"
                    powershell.exe -c "[System.Media.SystemSounds]::Hand.Play()"
                    ;;
                "beep")
                    echo "🔔 System beep"
                    powershell.exe -c "[console]::beep()"
                    ;;
                *)
                    powershell.exe -c "[System.Media.SystemSounds]::Asterisk.Play()"
                    ;;
            esac
            ;;
    esac
}

# Check volume status
check_volume() {
    case "$(uname -s)" in
        Darwin*)
            echo "🔊 Volume Check:"
            echo "  Current volume: $(osascript -e 'output volume of (get volume settings)')%"
            echo "  Muted: $(osascript -e 'output muted of (get volume settings)')"
            echo ""
            echo "To adjust volume:"
            echo "  • System Preferences → Sound → Output"
            echo "  • Or use keyboard volume keys"
            ;;
        Linux*)
            echo "🔊 Volume Check:"
            pactl list sinks | grep -E "Volume:|Mute:" | head -2
            echo ""
            echo "To adjust volume:"
            echo "  • Use: pactl set-sink-volume @DEFAULT_SINK@ +10%"
            echo "  • Or system sound settings"
            ;;
    esac
    echo ""
}

# Main execution
echo "🎵 Claude Code Sound Tester"
echo "=========================="
echo ""

# Check volume first
check_volume

# Play requested sound
if [ -z "$1" ]; then
    echo "Testing default success sound..."
    play_sound "success"
    echo ""
    echo "Available options:"
    echo "  /sounds success - Success notification"
    echo "  /sounds error   - Error notification"
    echo "  /sounds beep    - Simple beep"
    echo "  /sounds all-mac - All macOS sounds"
    echo "  /sounds custom /path/to/sound"
else
    play_sound "$1" "$2"
fi

echo ""
echo "✅ Sound test complete!"