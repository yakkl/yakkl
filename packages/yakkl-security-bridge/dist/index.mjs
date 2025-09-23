import { createAuthBridge } from "./bridges/auth-bridge.mjs";
import { createSecurityBridge } from "./bridges/security-bridge.mjs";
import { createStoreBridge, createSyncedStore } from "./bridges/store-bridge.mjs";
import { WalletIntegrationService } from "./services/wallet-integration.service.mjs";
import { SecuritySyncService } from "./services/security-sync.service.mjs";
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
export {
  SecurityEventType,
  SecuritySyncService,
  WalletIntegrationService,
  createAuthBridge,
  createSecurityBridge,
  createStoreBridge,
  createSyncedStore
};
//# sourceMappingURL=index.mjs.map
