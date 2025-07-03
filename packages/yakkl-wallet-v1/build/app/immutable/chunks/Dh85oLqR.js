function stopPropagation(fn){return function(...args){var event=args[0];event.stopPropagation();return fn==null?void 0:fn.apply(this,args)}}function preventDefault(fn){return function(...args){var event=args[0];event.preventDefault();return fn==null?void 0:fn.apply(this,args)}}export{preventDefault as p,stopPropagation as s};
//# sourceMappingURL=Dh85oLqR.js.map
