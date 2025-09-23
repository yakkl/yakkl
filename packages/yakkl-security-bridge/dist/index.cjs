"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const bridges_authBridge = require("./bridges/auth-bridge.cjs");
const bridges_securityBridge = require("./bridges/security-bridge.cjs");
const bridges_storeBridge = require("./bridges/store-bridge.cjs");
const services_walletIntegration_service = require("./services/wallet-integration.service.cjs");
const services_securitySync_service = require("./services/security-sync.service.cjs");
var SecurityEventType = /* @__PURE__ */ ((SecurityEventType2) => {
  SecurityEventType2["LOGIN_SUCCESS"] = "login_success";
  SecurityEventType2["LOGIN_FAILED"] = "login_failed";
  SecurityEventType2["LOGOUT"] = "logout";
  SecurityEventType2["SESSION_EXPIRED"] = "session_expired";
  SecurityEventType2["SESSION_EXTENDED"] = "session_extended";
  SecurityEventType2["PASSWORD_CHANGED"] = "password_changed";
  SecurityEventType2["REGISTRATION_SUCCESS"] = "registration_success";
  SecurityEventType2["REGISTRATION_FAILED"] = "registration_failed";
  SecurityEventType2["EMERGENCY_KIT_GENERATED"] = "emergency_kit_generated";
  SecurityEventType2["EMERGENCY_KIT_RESTORED"] = "emergency_kit_restored";
  return SecurityEventType2;
})(SecurityEventType || {});
exports.createAuthBridge = bridges_authBridge.createAuthBridge;
exports.createSecurityBridge = bridges_securityBridge.createSecurityBridge;
exports.createStoreBridge = bridges_storeBridge.createStoreBridge;
exports.createSyncedStore = bridges_storeBridge.createSyncedStore;
exports.WalletIntegrationService = services_walletIntegration_service.WalletIntegrationService;
exports.SecuritySyncService = services_securitySync_service.SecuritySyncService;
exports.SecurityEventType = SecurityEventType;
//# sourceMappingURL=index.cjs.map
