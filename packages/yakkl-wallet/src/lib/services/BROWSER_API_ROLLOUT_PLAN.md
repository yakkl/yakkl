# Browser API Rollout Plan

## Current Coverage

### ✅ Implemented APIs
- **Storage**: local.get, local.set, local.remove, local.clear, sync.get, sync.set
- **Tabs**: query, create, update, getCurrent
- **Windows**: create, getCurrent, getAll
- **Runtime**: getManifest, getURL, getPlatformInfo
- **Notifications**: create
- **Idle**: queryState

### ❌ Missing APIs (Commonly Used)
- **Runtime**: sendMessage, connect, onMessage, onConnect, reload, openOptionsPage
- **Storage**: onChanged listener
- **Tabs**: remove, sendMessage, onActivated, onUpdated, onRemoved
- **Permissions**: request, remove, contains, getAll
- **ContextMenus**: create, update, remove
- **Alarms**: create, clear, getAll, onAlarm
- **Action**: setIcon, setBadgeText, setBadgeBackgroundColor
- **Management**: getSelf, getAll
- **WebRequest**: (complex - may need special handling)

## Error Handling Improvements Needed

1. **Retry Logic**: Add exponential backoff for transient failures
2. **Type Guards**: Better type validation for responses
3. **Error Context**: Include more context in error messages
4. **Fallback Strategies**: Graceful degradation when APIs unavailable
5. **Logging**: Structured logging with correlation IDs

## Rollout Strategy

### Phase 1: Login Page (Low Risk)
- **File**: `/routes/(wallet)/login/+page.svelte`
- **APIs Used**: chrome.runtime.getURL
- **Action**: Replace with browserAPI.runtimeGetURL()
- **Risk**: Low - single API call

### Phase 2: Storage Migration (Medium Risk)
- **Files**: Components using browser.storage directly
- **Focus**: Session management, preferences, cached data
- **Action**: Migrate to browserAPI storage methods
- **Risk**: Medium - data persistence critical

### Phase 3: Tab/Window Management (Medium Risk)
- **Files**: Popup components, window management
- **Focus**: Tab creation, window positioning
- **Action**: Use browserAPI tab/window methods
- **Risk**: Medium - UI functionality

### Phase 4: Background Communication (High Risk)
- **Files**: Components using runtime.sendMessage
- **Focus**: Client-background messaging
- **Action**: Careful migration with fallbacks
- **Risk**: High - core functionality

### Phase 5: Home Page (Very High Risk)
- **File**: `/routes/(wallet)/home/+page.svelte`
- **Focus**: Main application functionality
- **Action**: Gradual component-by-component migration
- **Risk**: Very High - critical path

## Implementation Steps

1. **Create deadcode backup directory structure**
2. **Add missing API methods to BrowserAPIService**
3. **Enhance error handling and logging**
4. **Start with Phase 1 (Login page)**
5. **Test thoroughly before moving to next phase**
6. **Monitor for issues in production**
7. **Rollback plan for each phase**

## Success Metrics
- No increase in error rates
- Same or better performance
- Clean separation of concerns
- Improved testability
- SSR compatibility maintained