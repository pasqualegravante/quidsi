<template>
  <div class="global-modals-wrapper screen-only">
    <SavePromptModal v-if="dssStore.pendingAction" />
    
    <ConfirmDeleteModal 
      :show="uiStore.activeModal === 'deleteScenario'"
      :label="uiStore.modalData?.label"
      @cancel="uiStore.closeModal()"
      @confirm="dssStore.executeGlobalDelete()"
    />
    
    </div>
</template>

<script>
import SavePromptModal from './SavePromptModal.vue';
import ConfirmDeleteModal from './ConfirmDeleteModal.vue';
import { useDssStore } from '../../store/dssStore';
import { useUiStore } from '../../store/uiStore';

export default {
  name: 'GlobalModals',
  components: { SavePromptModal, ConfirmDeleteModal },
  setup() {
    const dssStore = useDssStore();
    const uiStore = useUiStore();
    return { dssStore, uiStore };
  }
}
</script>