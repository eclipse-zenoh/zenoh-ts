<script setup lang="ts">
import { Config } from '@eclipse-zenoh/zenoh-ts';
onMounted(() => {
  document.body.innerHTML = '';
  const helloDiv = document.createElement('div');
  helloDiv.textContent = 'Hello World';
  document.body.appendChild(helloDiv);
})
</script>