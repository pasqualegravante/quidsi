import { onMounted, onBeforeUnmount } from 'vue';

export function useClickOutside(elementRef, callback) {
  const listener = (event) => {
    if (!elementRef.value || elementRef.value.contains(event.target)) return;
    callback(event);
  };

  onMounted(() => document.addEventListener('click', listener));
  onBeforeUnmount(() => document.removeEventListener('click', listener));
}