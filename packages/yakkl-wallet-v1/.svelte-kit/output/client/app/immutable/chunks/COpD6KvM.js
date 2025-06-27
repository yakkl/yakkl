import{g as goto}from"./CkqS9PXN.js";import{i as PATH_LOGOUT}from"./Cb2naUpm.js";async function safeNavigate(path,delayMs=0,options={}){if(delayMs>0){setTimeout(()=>goto(path,options),delayMs)}else{goto(path,options)}}async function safeLogout(delayMs=0,options={}){safeNavigate(PATH_LOGOUT,delayMs,options)}export{safeNavigate as a,safeLogout as s};
//# sourceMappingURL=COpD6KvM.js.map
