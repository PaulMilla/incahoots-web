# Console Error Toast Notifications

**Date:** 2025-12-29
**Status:** Approved

## Overview

Add toast notifications for console errors in development mode to improve error visibility during development.

## Requirements

- **Environment:** Development only (`import.meta.env.DEV`)
- **Console Methods:** Intercept `console.error` only (not warnings or other methods)
- **Display:** Show truncated error message (max 150 characters) as error toast
- **Logging:** Preserve original console.error behavior (log to console AND show toast)
- **Toast Style:** Use `toast.error()` with error styling
- **Duplicate Prevention:** Debounce identical errors within 1 second

## Architecture

### Approach

Override the native `console.error` method with a wrapper that:
1. Calls the original console.error (preserving stack traces and devtools integration)
2. Formats and truncates the error message
3. Displays it via `toast.error()`

### Location

Implement in `src/main.tsx` after imports, before `ReactDOM.createRoot()` call. This ensures:
- Runs before any component code executes
- Global initialization at app entry point
- Access to environment variables and toast library

## Implementation Details

### Message Formatting

```typescript
const formatErrorMessage = (args: any[]): string => {
  // Convert all arguments to strings and join with spaces
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');

  // Truncate if longer than 150 characters
  return message.length > 150
    ? message.substring(0, 150) + '...'
    : message;
};
```

### Console Override

```typescript
if (import.meta.env.DEV) {
  const originalError = console.error;
  let lastErrorMessage = '';
  let lastErrorTime = 0;

  console.error = (...args: any[]) => {
    // Always call original console.error first
    originalError(...args);

    // Format message
    const message = formatErrorMessage(args);
    const now = Date.now();

    // Only show toast if different message or >1 second since last
    if (message !== lastErrorMessage || now - lastErrorTime > 1000) {
      toast.error(message, {
        autoClose: 5000, // 5 seconds
        position: 'bottom-right'
      });
      lastErrorMessage = message;
      lastErrorTime = now;
    }
  };
}
```

## Edge Cases

### Duplicate Prevention

Debounce mechanism prevents toast spam:
- Track last error message and timestamp
- Only show new toast if message differs OR >1 second has passed
- Prevents flooding from errors in loops or rapid repeated errors

### React StrictMode

App uses `<React.StrictMode>` which double-invokes effects in development. This doesn't affect our implementation since console.error override is global, not a component effect.

### Toast Configuration

Position: `bottom-right` - keeps toasts out of the way of main content
Auto-close: 5 seconds - enough time to read truncated message
Type: `error` - red styling indicates severity

## Testing

Manual test: Add `console.error('Test error message')` anywhere in code and verify:
1. Toast appears with error styling
2. Console logs the full error
3. Both behaviors occur simultaneously
4. Duplicate errors within 1 second are debounced

## Benefits

1. **Improved visibility:** Errors are harder to miss with toast notifications
2. **Preserves debugging:** Full console.error output still available
3. **Development-only:** No impact on production users
4. **Simple implementation:** Minimal code, no new dependencies
5. **Non-invasive:** Doesn't modify existing error handling code
