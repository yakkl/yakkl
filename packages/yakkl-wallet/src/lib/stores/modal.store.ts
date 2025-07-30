/**
 * Modal state management for v2
 * Tracks when modals are open to hide floating elements
 */

import { writable } from 'svelte/store';

interface ModalState {
  isOpen: boolean;
  modalType?: string;
  modalId?: string;
  data?: any;
}

function createModalStore() {
  const { subscribe, set, update } = writable<ModalState>({
    isOpen: false,
    modalType: undefined,
    modalId: undefined,
    data: undefined
  });

  return {
    subscribe,
    
    openModal(type: string, idOrData?: string | any) {
      const isString = typeof idOrData === 'string';
      update(state => ({
        ...state,
        isOpen: true,
        modalType: type,
        modalId: isString ? idOrData : undefined,
        data: !isString ? idOrData : undefined
      }));
    },
    
    closeModal() {
      set({
        isOpen: false,
        modalType: undefined,
        modalId: undefined,
        data: undefined
      });
    },
    
    isModalOpen: () => {
      let isOpen = false;
      subscribe(state => { isOpen = state.isOpen; })();
      return isOpen;
    }
  };
}

export const modalStore = createModalStore();

// Derived store for easy checking
export const isModalOpen = writable(false);

modalStore.subscribe(state => {
  isModalOpen.set(state.isOpen);
});