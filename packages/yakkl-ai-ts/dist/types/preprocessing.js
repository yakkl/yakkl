"use strict";
/**
 * Query preprocessing type definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformationMethod = void 0;
var TransformationMethod;
(function (TransformationMethod) {
    TransformationMethod["TYPO_CORRECTION"] = "typo_correction";
    TransformationMethod["EXPANSION"] = "expansion";
    TransformationMethod["TECHNICAL_TRANSLATION"] = "technical_translation";
    TransformationMethod["CONTEXT_ENRICHMENT"] = "context_enrichment";
    TransformationMethod["INTENT_EXTRACTION"] = "intent_extraction";
    TransformationMethod["HYDE"] = "hyde";
    TransformationMethod["MULTI_QUERY"] = "multi_query";
    TransformationMethod["SEMANTIC_CLARIFICATION"] = "semantic_clarification";
})(TransformationMethod || (exports.TransformationMethod = TransformationMethod = {}));
//# sourceMappingURL=preprocessing.js.map