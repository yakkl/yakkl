import{g as goto}from"./client.js";import{h as PATH_LOGOUT}from"./encryption.js";async function safeNavigate(path,delayMs=0,options={}){if(delayMs>0){setTimeout(()=>goto(path,options),delayMs)}else{goto(path,options)}}async function safeLogout(delayMs=0,options={}){safeNavigate(PATH_LOGOUT,delayMs,options)}export{safeNavigate as a,safeLogout as s};
//# sourceMappingURL=safeNavigate.js.map
