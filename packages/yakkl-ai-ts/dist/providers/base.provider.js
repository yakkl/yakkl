"use strict";
/**
 * Base AI Provider class
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAIProvider = void 0;
class BaseAIProvider {
    config;
    modelConfig;
    headers = {};
    tokenizer;
    constructor(config) {
        this.config = config;
        this.modelConfig = { model: "default" };
        this.initializeAuth();
    }
    /**
     * Set the model to use
     */
    setModel(model) {
        if (!this.validateModel(model)) {
            throw new Error(`Invalid model ${model} for provider ${this.config.provider}`);
        }
        this.modelConfig.model = model;
    }
    /**
     * Update model configuration
     */
    updateConfig(config) {
        this.modelConfig = { ...this.modelConfig, ...config };
    }
    /**
     * Refresh OAuth token if needed
     */
    async refreshOAuthToken() {
        if (!this.config.oauth)
            return;
        const response = await fetch(this.config.oauth.tokenEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: this.config.oauth.refreshToken,
                client_id: this.config.oauth.clientId,
                client_secret: this.config.oauth.clientSecret,
            }),
        });
        const data = await response.json();
        this.config.oauth.accessToken = data.access_token;
        if (data.refresh_token) {
            this.config.oauth.refreshToken = data.refresh_token;
        }
    }
    /**
     * Handle API errors consistently
     */
    handleError(error) {
        return {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message || 'An unknown error occurred',
            provider: this.config.provider,
            retryable: this.isRetryableError(error),
            details: error
        };
    }
    /**
     * Determine if an error is retryable
     */
    isRetryableError(error) {
        const retryableCodes = ['RATE_LIMIT', 'TIMEOUT', 'SERVICE_UNAVAILABLE'];
        return retryableCodes.includes(error.code) || error.status >= 500;
    }
}
exports.BaseAIProvider = BaseAIProvider;
//# sourceMappingURL=base.provider.js.map