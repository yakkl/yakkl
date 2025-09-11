"use strict";
/**
 * Provider-related type definitions for YAKKL AI Library
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIProvider = void 0;
var AIProvider;
(function (AIProvider) {
    AIProvider["OPENAI"] = "openai";
    AIProvider["ANTHROPIC"] = "anthropic";
    AIProvider["GOOGLE"] = "google";
    AIProvider["GOOGLE_NANO"] = "google-nano";
    AIProvider["AZURE_OPENAI"] = "azure-openai";
    AIProvider["COHERE"] = "cohere";
    AIProvider["HUGGINGFACE"] = "huggingface";
    AIProvider["CUSTOM"] = "custom";
})(AIProvider || (exports.AIProvider = AIProvider = {}));
//# sourceMappingURL=providers.js.map