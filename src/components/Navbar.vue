<script setup lang="ts">
import { ref, computed } from 'vue';
import { Bell, Search, User, ShieldCheck, X } from 'lucide-vue-next';

const props = defineProps<{
  role: string;
  activeTab: string;
}>();

const showNotifications = ref(false);
const notifications = computed(() => {
  if (props.role === 'admin') {
    return [
      { id: 1, text: 'Pharmacy: Medicine stock low (Atorvastatin)', time: '5m ago' },
      { id: 2, text: 'New department request: Oncology', time: '1h ago' },
      { id: 3, text: 'Billing system maintenance tonight', time: '3h ago' },
    ];
  } else if (props.role === 'doctor') {
    return [
      { id: 1, text: 'New appointment request from Maria Garcia', time: '2m ago' },
      { id: 2, text: 'Patient Robert Johnson uploaded new records', time: '45m ago' },
      { id: 3, text: 'Consultation reminder at 2:00 PM', time: '1h ago' },
    ];
  } else if (props.role === 'patient') {
    return [
      { id: 1, text: 'Your appointment with Dr. John Smith was accepted', time: '10m ago' },
      { id: 2, text: 'New prescription available from Dr. Sarah Wilson', time: '2h ago' },
      { id: 3, text: 'Bill payment reminder: ₹450.00', time: '1d ago' },
    ];
  } else if (props.role === 'pharmacy') {
    return [
      { id: 1, text: 'New prescription order from Dr. John Smith', time: '5m ago' },
      { id: 2, text: 'Stock alert: Paracetamol below 50 units', time: '20m ago' },
      { id: 3, text: 'Delivery confirmed for Order #1234', time: '1h ago' },
    ];
  }
  return [];
});
const emit = defineEmits(['search']);

const searchQuery = ref('');

const clearSearch = () => {
  searchQuery.value = '';
  emit('search', '');
};

const handleSearch = () => {
  emit('search', searchQuery.value);
};
</script>

<template>
  <header class="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm">
    <div class="flex items-center gap-4">
      <div class="md:hidden w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
        <ShieldCheck class="w-5 h-5 text-white" />
      </div>
      <h1 class="text-xl font-bold text-slate-800 capitalize">{{ activeTab }}</h1>
    </div>
    
    <div class="flex items-center gap-6">
      <div class="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-80 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 transition-all relative">
        <Search class="w-4 h-4 text-slate-400 mr-3" />
        <input 
          v-model="searchQuery"
          @input="handleSearch"
          type="text" 
          placeholder="Search records, doctors..." 
          class="bg-transparent border-none outline-none text-sm w-full text-slate-600 placeholder:text-slate-400 pr-8"
        />
        <button 
          v-if="searchQuery" 
          @click="clearSearch"
          class="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
      
      <div class="flex items-center gap-3 relative">
        <button 
          @click="showNotifications = !showNotifications"
          class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100 transition-all relative"
        >
          <Bell class="w-5 h-5" />
          <span class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <!-- Notification Dropdown -->
        <div v-if="showNotifications" class="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 py-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div class="px-4 pb-2 border-b border-slate-50 flex justify-between items-center">
            <h3 class="font-bold text-slate-800">Notifications</h3>
            <span class="text-[10px] bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full font-bold uppercase">3 New</span>
          </div>
          <div class="max-h-80 overflow-y-auto">
            <div v-for="n in notifications" :key="n.id" class="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50 last:border-0">
              <p class="text-sm text-slate-700 leading-tight">{{ n.text }}</p>
              <p class="text-[10px] text-slate-400 mt-1 font-medium">{{ n.time }}</p>
            </div>
          </div>
          <div class="px-4 pt-2 text-center">
            <button class="text-xs font-bold text-sky-500 hover:underline">Mark all as read</button>
          </div>
        </div>
        
        <div class="flex items-center gap-3 pl-4 border-l border-slate-200 ml-2">
          <div class="text-right hidden sm:block">
            <p class="text-sm font-bold text-slate-800">Zydus {{ role }}</p>
            <p class="text-xs text-slate-400 capitalize">{{ role }} Portal</p>
          </div>
          <div class="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
            <User class="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
