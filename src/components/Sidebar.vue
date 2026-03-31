<script setup lang="ts">
import { 
  LayoutDashboard, 
  Building2, 
  UserRound, 
  Users, 
  Calendar, 
  Pill, 
  CreditCard, 
  LogOut,
  ShieldCheck,
  ClipboardList
} from 'lucide-vue-next';

const props = defineProps<{
  role: string;
  activeTab: string;
}>();

const emit = defineEmits(['change-tab', 'logout']);

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'departments', label: 'Departments', icon: Building2 },
  { id: 'doctors', label: 'Medical Staff', icon: UserRound },
  { id: 'laboratory', label: 'Laboratory', icon: ClipboardList },
  { id: 'pharmacy', label: 'Pharmacy', icon: Pill },
];

const doctorMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'requests', label: 'Requests', icon: Calendar },
  { id: 'appointments', label: 'My Appointments', icon: Calendar },
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'laboratory', label: 'Laboratory', icon: ClipboardList },
];

const receptionistMenuItems = [
  { id: 'all-patients', label: 'All Patients', icon: Users },
  { id: 'add-patient', label: 'Add Patient', icon: UserRound },
  { id: 'rejected-requests', label: 'Rejected Requests', icon: Calendar },
];

const pharmacyMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'laboratory', label: 'Laboratory', icon: ClipboardList },
  { id: 'pharmacy', label: 'Pharmacy', icon: Pill },
];

const patientMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'book', label: 'Book Appointment', icon: Calendar },
  { id: 'appointments', label: 'My Appointments', icon: Calendar },
  { id: 'history', label: 'Medical History', icon: ClipboardList },
  { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
  { id: 'laboratory', label: 'Laboratory', icon: ClipboardList },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

const items = computed(() => {
  if (props.role === 'admin') return menuItems;
  if (props.role === 'doctor') return doctorMenuItems;
  if (props.role === 'pharmacy') return pharmacyMenuItems;
  if (props.role === 'patient') return patientMenuItems;
  if (props.role === 'receptionist' || props.role === 'receptioniest') return receptionistMenuItems;
  return [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }];
});
</script>

<script lang="ts">
import { computed } from 'vue';
</script>

<template>
  <aside class="w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col h-screen sticky top-0">
    <div class="p-6 border-b border-white/10 flex items-center gap-3">
      <div class="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
        <ShieldCheck class="w-5 h-5 text-white" />
      </div>
      <h2 class="text-xl font-bold tracking-tight">Zydus Health</h2>
    </div>
    
    <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
      <button 
        v-for="item in items"
        :key="item.id"
        @click="emit('change-tab', item.id)"
        :class="[
          'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm',
          activeTab === item.id 
            ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' 
            : 'text-slate-400 hover:bg-white/5 hover:text-white'
        ]"
      >
        <component :is="item.icon" class="w-5 h-5" />
        {{ item.label }}
      </button>
    </nav>
    
    <div class="p-4 border-t border-white/10">
      <button 
        @click="emit('logout')"
        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all font-medium text-sm"
      >
        <LogOut class="w-5 h-5" />
        Sign Out
      </button>
    </div>
  </aside>
</template>
