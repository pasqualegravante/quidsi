<template>
  <div>
    <button @click="$emit('deselect')">Deseleziona</button>
    <button @click="alert('Funzione futura')">Altra funzione</button>
  </div>
</template>

<script>
export default {};
</script>

<style scoped>
button {
  padding: 10px 15px;
  margin-right: 10px;
  cursor: pointer;
  background-color: #4CAF50;
  border: none;
  color: white;
  font-weight: bold;
  border-radius: 5px;
}
button:hover {
  background-color: #45a049;
}
</style>
