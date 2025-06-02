<template>
  <div id="app">
    <!-- Content will be dynamically added by the script -->
  </div>
</template>

<script setup lang="ts">
import { Config, Session, KeyExpr } from '@eclipse-zenoh/zenoh-ts';

onMounted(() => {
  const appDiv = document.getElementById('app');
  if (!appDiv) return;
  
  // Test that zenoh-ts imports work correctly
  try {
    const config = Config.default();
    const keyExpr = KeyExpr.tryFrom('test/key');
    
    appDiv.innerHTML = `
      <h1>Zenoh-TS Import Test ✅</h1>
      <p>Config: ${config ? 'Created successfully' : 'Failed'}</p>
      <p>KeyExpr: ${keyExpr ? keyExpr.toString() : 'Failed'}</p>
      <p>All zenoh-ts imports are working correctly!</p>
    `;
  } catch (error) {
    appDiv.innerHTML = `
      <h1>Zenoh-TS Import Test ❌</h1>
      <p>Error: ${error}</p>
    `;
  }
})
</script>