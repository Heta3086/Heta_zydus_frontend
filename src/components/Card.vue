<script setup lang="ts">
defineProps<{
  title?: string;
  subtitle?: string;
  icon?: any;
}>();
</script>

<template>
  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div v-if="title || icon" class="p-4 border-b border-slate-100 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div v-if="icon" class="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-500">
          <component :is="icon" class="w-4 h-4" />
        </div>
        <div>
          <h3 v-if="title" class="font-bold text-slate-800">{{ title }}</h3>
          <p v-if="subtitle" class="text-xs text-slate-400">{{ subtitle }}</p>
        </div>
      </div>
      <slot name="header-action"></slot>
    </div>
    <div class="p-4">
      <slot></slot>
    </div>
  </div>
</template>
