class ExtensionMessageHandler {
  constructor(context) {
    this.handlers = /* @__PURE__ */ new Map();
    this.context = context;
    this.setupListener();
  }
  /**
   * Register a message handler
   */
  register(type, handler) {
    this.handlers.set(type, handler);
  }
  /**
   * Unregister a message handler
   */
  unregister(type) {
    this.handlers.delete(type);
  }
  /**
   * Send a message to another context
   */
  async send(type, payload, tabId) {
    const message = {
      id: this.generateId(),
      type,
      payload,
      timestamp: Date.now(),
      context: this.context
    };
    try {
      const browser2 = await this.getBrowser();
      if (tabId !== void 0) {
        return await browser2.tabs.sendMessage(tabId, message);
      } else {
        return await browser2.runtime.sendMessage(message);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Broadcast a message to all tabs
   */
  async broadcast(type, payload) {
    try {
      const browser2 = await this.getBrowser();
      const tabs = await browser2.tabs.query({});
      const message = {
        id: this.generateId(),
        type,
        payload,
        timestamp: Date.now(),
        context: this.context
      };
      await Promise.all(
        tabs.map((tab) => {
          if (tab.id) {
            return browser2.tabs.sendMessage(tab.id, message).catch(() => {
            });
          }
        })
      );
    } catch (error) {
      console.error("Failed to broadcast message:", error);
    }
  }
  /**
   * Setup message listener
   */
  setupListener() {
    this.getBrowser().then((browser2) => {
      browser2.runtime.onMessage.addListener(
        (message, sender) => {
          if (!this.isValidMessage(message)) {
            return;
          }
          const handler = this.handlers.get(message.type);
          if (!handler) {
            return;
          }
          const response = handler(message, sender);
          if (response instanceof Promise) {
            return response;
          } else {
            return Promise.resolve(response);
          }
        }
      );
    });
  }
  /**
   * Validate message structure
   */
  isValidMessage(message) {
    return message && typeof message === "object" && typeof message.type === "string" && typeof message.timestamp === "number";
  }
  /**
   * Generate unique message ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * Get browser API (dynamic import for environment compatibility)
   */
  async getBrowser() {
    if (typeof browser !== "undefined") {
      return browser;
    }
    return await import("webextension-polyfill");
  }
}
function createMessageHandler(handler) {
  return async (message, sender) => {
    try {
      const result = await handler(message.payload, sender);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Handler error"
      };
    }
  };
}
export {
  ExtensionMessageHandler,
  createMessageHandler
};
//# sourceMappingURL=messaging.js.map
