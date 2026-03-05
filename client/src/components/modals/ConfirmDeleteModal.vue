<template>
  <div v-if="show" class="dss-modal-overlay">
    <div class="dss-modal">
      <h3>CONFERMA ELIMINAZIONE</h3>
      <p>Vuoi davvero eliminare "{{ label }}"?</p>
      <div class="modal-footer">
        <button class="btn-annulla" @click="$emit('cancel')">ANNULLA</button>
        <button class="btn-elimina" @click="$emit('confirm')">ELIMINA</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConfirmDeleteModal',
  props: {
    show: Boolean,
    label: String
  },
  emits: ['cancel', 'confirm']
}
</script>

<style scoped>
.dss-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15,23,42,0.85); display: flex; justify-content: center; align-items: center; z-index: 5000; }
.dss-modal { background: #0f172a; color: white; padding: 30px; border-radius: 12px; width: 400px; text-align: center; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
.dss-modal h3 { margin-top: 0; font-size: 16px; border-bottom: 1px solid #334155; padding-bottom: 15px; letter-spacing: 1px; }
.modal-footer { margin-top: 30px; display: flex; justify-content: center; gap: 20px; }
.btn-annulla { background: transparent; color: white; border: 1px solid #cbd5e1; padding: 10px 25px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-elimina { background: #ef4444; color: white; border: none; padding: 10px 25px; border-radius: 6px; cursor: pointer; font-weight: bold; }
</style>