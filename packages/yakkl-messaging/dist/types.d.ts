/**
 * Core messaging types
 */
export interface Message<T = any> {
    id?: string;
    type: string;
    data?: T;
    error?: string;
    timestamp?: number;
    source?: MessageSource;
    target?: MessageTarget;
}
export interface MessageResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp?: number;
}
export interface MessageHandler<T = any, R = any> {
    (message: Message<T>): Promise<MessageResponse<R>> | MessageResponse<R>;
}
export interface MessageSource {
    context: 'background' | 'content' | 'popup' | 'options' | 'devtools' | 'sidepanel';
    tabId?: number;
    frameId?: number;
    url?: string;
}
export interface MessageTarget {
    context?: 'background' | 'content' | 'popup' | 'options' | 'devtools' | 'sidepanel';
    tabId?: number;
    frameId?: number;
}
export interface Port {
    name: string;
    postMessage: (message: any) => void;
    onMessage: {
        addListener: (callback: (message: any) => void) => void;
        removeListener: (callback: (message: any) => void) => void;
    };
    onDisconnect: {
        addListener: (callback: (port: Port) => void) => void;
        removeListener: (callback: (port: Port) => void) => void;
    };
    disconnect: () => void;
}
export interface MessageRouterOptions {
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
    enableLogging?: boolean;
}
//# sourceMappingURL=types.d.ts.map