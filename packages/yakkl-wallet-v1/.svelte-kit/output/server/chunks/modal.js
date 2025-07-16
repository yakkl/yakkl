import{w as writable}from"./index.js";const modal=writable(false);const modalName=writable(null);function openModal(name){modal.set(true);modalName.set(name)}function closeModal(){modal.set(false);modalName.set(null);setTimeout(()=>{modal.set(false);modalName.set(null)},10)}export{modalName as a,closeModal as c,modal as m,openModal as o};
//# sourceMappingURL=modal.js.map
