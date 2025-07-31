# Sounds Command

Test the notification sounds used by Claude Code for task completion feedback.

## Usage
```
/sounds [type]
```

## Examples
```
# Play all available sounds
/sounds

# Play specific sound type
/sounds success
/sounds error
/sounds beep
/sounds all-mac
```

## Sound Types

### Success Sounds
- **success** - Task completed successfully (Glass sound on macOS)
- **complete** - Alternative completion sound
- **done** - Quick completion beep

### Error Sounds
- **error** - Task failed (Basso sound on macOS)
- **warning** - Warning notification
- **alert** - Critical alert sound

### System Sounds
- **beep** - Simple system beep
- **ping** - Notification ping
- **pop** - Subtle pop sound

## Platform-Specific Options

### macOS (`/sounds all-mac`)
Tests all available macOS system sounds:
- Basso (error/failure)
- Blow
- Bottle
- Frog
- Funk
- Glass (success)
- Hero
- Morse
- Ping
- Pop
- Purr
- Sosumi
- Submarine
- Tink

### Linux (`/sounds all-linux`)
Tests freedesktop sounds:
- complete.oga
- bell.oga
- message.oga

### Windows (`/sounds all-win`)
Tests Windows system sounds:
- Asterisk (info)
- Exclamation (warning)
- Hand (error)
- Question

## Custom Sound Test

You can also test custom sounds:
```
/sounds custom /path/to/sound.aiff
```

## Volume Check

The command will also:
1. Show current volume level
2. Suggest if volume might be muted
3. Provide platform-specific volume control instructions

## Integration with Notifications

These are the same sounds used by the task completion hooks:
- File writes → success sound
- Errors → error sound
- Single edits → beep sound

Use this command to:
- Test your audio setup
- Choose preferred sounds
- Verify notifications are working
- Preview sounds before customizing hooks