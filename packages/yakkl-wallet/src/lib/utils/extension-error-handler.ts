// Extension-specific error handler for suppressing known issues
export function setupExtensionErrorHandler() {
  if (typeof window === 'undefined') return;

  // Override the global error handler
  const originalOnerror = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    // Convert message to string if it's not already
    const errorMessage = String(message);
    
    // List of errors to suppress
    const suppressedErrors = [
      'node_invalid_placement_ssr',
      'hydration_mismatch',
      'Refused to execute inline script',
      'Content Security Policy',
      'Extension context invalidated',
      'Cannot access a chrome:// URL',
      'bits-ui',
      'floating-layer-anchor'
    ];
    
    // Check if this error should be suppressed
    const shouldSuppress = suppressedErrors.some(pattern => 
      errorMessage.includes(pattern) || 
      (error?.stack && error.stack.includes(pattern))
    );
    
    if (shouldSuppress) {
      // Suppress the error
      return true;
    }
    
    // Otherwise, call the original handler
    if (originalOnerror) {
      return originalOnerror.call(window, message, source, lineno, colno, error);
    }
    
    return false;
  };

  // Also handle unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason;
    const message = reason?.message || String(reason);
    
    const suppressedPatterns = [
      'hydration_mismatch',
      'node_invalid_placement',
      'Extension context invalidated',
      'Content Security Policy'
    ];
    
    const shouldSuppress = suppressedPatterns.some(pattern => 
      message.includes(pattern)
    );
    
    if (shouldSuppress) {
      event.preventDefault();
    }
  });
}

// Special handler for CSP-injected script errors
export function preventCSPScriptInjection() {
  if (typeof window === 'undefined') return;
  
  // Create a MutationObserver to watch for script tags
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        // Check if it's a script tag with inline content
        if (node.nodeName === 'SCRIPT' && node.textContent) {
          // Check if it contains console.error for known issues
          if (node.textContent.includes('node_invalid_placement_ssr') ||
              node.textContent.includes('hydration_mismatch') ||
              node.textContent.includes('bits-ui')) {
            // Remove the script before it executes
            (node as HTMLElement).remove();
          }
        }
      });
    });
  });
  
  // Start observing the document
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  
  // Stop observing after initial page load to avoid performance impact
  setTimeout(() => {
    observer.disconnect();
  }, 5000);
}