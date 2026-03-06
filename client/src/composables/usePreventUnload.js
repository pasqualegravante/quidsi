import { onMounted, onBeforeUnmount } from 'vue';
import { useDssStore } from '../store/dssStore';

export function usePreventUnload() {
  const dssStore = useDssStore();
  
  const preventAccidentalClose = (e) => {
    if (dssStore.isModified) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  onMounted(() => window.addEventListener('beforeunload', preventAccidentalClose));
  onBeforeUnmount(() => window.removeEventListener('beforeunload', preventAccidentalClose));
}