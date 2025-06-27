import{w as writable}from"./index.js";let warningTimeSecondsExt=30;const securityWarningStore=writable({show:false,warningTime:warningTimeSecondsExt,onComplete:void 0});function hideSecurityWarning(){securityWarningStore.set({show:false,warningTime:warningTimeSecondsExt,onComplete:void 0})}export{hideSecurityWarning,securityWarningStore};
//# sourceMappingURL=securityWarning.js.map
