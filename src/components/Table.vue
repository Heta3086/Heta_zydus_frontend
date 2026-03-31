<script setup lang="ts">
defineProps<{
  headers: string[];
  items: any[];
}>();
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-slate-200">
    <table class="w-full text-left border-collapse bg-white">
      <thead class="bg-slate-50 border-b border-slate-200">
        <tr>
          <th 
            v-for="header in headers" 
            :key="header" 
            class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
          >
            {{ header }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr 
          v-for="(item, index) in items" 
          :key="index" 
          class="hover:bg-slate-50 transition-colors group"
        >
          <template v-for="(value, key) in item" :key="key">
            <td 
              v-if="!key.toString().startsWith('_')"
              class="px-6 py-4 text-sm text-slate-600 font-medium whitespace-nowrap"
            >
              <slot :name="`cell-${key}`" :value="value" :item="item">
                <template v-if="key === 'actions'">
                  <div class="flex items-center gap-2">
                    <slot name="actions" :item="item"></slot>
                  </div>
                </template>
                <template v-else>
                  {{ value }}
                </template>
              </slot>
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>
