export function portal(node: HTMLElement) {
  // Guard against SSR execution
  if (typeof document === 'undefined') {
    return {
      destroy() {}
    };
  }
  
  const portalTarget = document.body;
  
  // Move the node to body
  portalTarget.appendChild(node);
  
  return {
    destroy() {
      // Move back or remove when destroyed
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
  };
}