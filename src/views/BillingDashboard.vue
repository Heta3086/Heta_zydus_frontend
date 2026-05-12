<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { 
  Plus, 
  TrendingUp, 
  CreditCard, 
  Search, 
  Download, 
  Filter, 
  CheckCircle2, 
  X,
  User,
  Activity,
  Calculator,
  Calendar,
  IndianRupee,
  Menu,
  Bell,
  LogOut,
  Pill,
  FlaskConical,
  Trash2
} from 'lucide-vue-next';
import Card from '../components/Card.vue';
import Table from '../components/Table.vue';
import Sidebar from '../components/Sidebar.vue';
import Navbar from '../components/Navbar.vue';
import * as adminAPI from '../services/admin';

const emit = defineEmits(['logout']);
const activeTab = ref('invoices');
const showAddBillModal = ref(false);
const searchQuery = ref('');
const loading = ref(false);
const notice = ref<{ type: 'success' | 'error'; text: string } | null>(null);

// Real data from backend
const billsData = ref<adminAPI.BillingStaffBill[]>([]);
const summary = ref<any>({});

const filteredBills = computed(() => {
  if (!searchQuery.value) return billsData.value;
  const query = searchQuery.value.toLowerCase();
  return billsData.value.filter(b => 
    b.patient_name.toLowerCase().includes(query) || 
    b.status.toLowerCase().includes(query)
  );
});

const totalRevenue = computed(() => summary.value.total_amount || 0);
const pendingRevenue = computed(() => summary.value.pending_amount || 0);
const completedRevenue = computed(() => summary.value.paid_amount || 0);
const totalBills = computed(() => summary.value.total_bills || 0);

const showNotice = (type: 'success' | 'error', text: string) => {
  notice.value = { type, text };
  setTimeout(() => {
    notice.value = null;
  }, 2500);
};

const loadBills = async () => {
  loading.value = true;
  try {
    const data = await adminAPI.getAllBillsForBillingStaff();
    billsData.value = data.bills || [];
    summary.value = data.summary || {};
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to load bills');
  } finally {
    loading.value = false;
  }
};

const markAsPaid = async (billId: number) => {
  if (!confirm('Mark this bill as paid?')) return;
  try {
    await adminAPI.markBillAsPaid(billId);
    showNotice('success', 'Bill marked as paid');
    await loadBills();
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to mark bill as paid');
  }
};

onMounted(() => {
  loadBills();
});
</script>

<template>
  <div class="flex h-screen bg-slate-50 overflow-hidden">
    <Sidebar :role="'billing'" :activeTab="activeTab" @change-tab="activeTab = $event" @logout="emit('logout')" />
    
    <main class="flex-1 overflow-y-auto">
      <Navbar :role="'billing'" :activeTab="activeTab" @logout="emit('logout')" />
      
      <div class="p-8 space-y-8 max-w-7xl mx-auto">
        <!-- Success/Error Notice -->
        <div v-if="notice" :class="[
          'p-4 rounded-xl border-l-4 font-medium',
          notice.type === 'success' 
            ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
            : 'bg-red-50 border-red-500 text-red-700'
        ]">
          {{ notice.text }}
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-slate-800 tracking-tight">Billing Dashboard</h1>
            <p class="text-slate-500 font-medium mt-1">Manage and process patient invoices</p>
          </div>
        </div>

        <!-- Stats Overview -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card class="ring-1 ring-slate-200">
            <div class="flex items-center gap-4">
              <div class="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <TrendingUp class="w-6 h-6" />
              </div>
              <div>
                <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Income</p>
                <h3 class="text-2xl font-bold text-slate-800">₹{{ (totalRevenue / 100).toLocaleString() }}</h3>
              </div>
            </div>
          </Card>
          
          <Card class="ring-1 ring-slate-200">
            <div class="flex items-center gap-4">
              <div class="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <CheckCircle2 class="w-6 h-6" />
              </div>
              <div>
                <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Collected</p>
                <h3 class="text-2xl font-bold text-emerald-600">₹{{ (completedRevenue / 100).toLocaleString() }}</h3>
              </div>
            </div>
          </Card>
          
          <Card class="ring-1 ring-slate-200">
            <div class="flex items-center gap-4">
              <div class="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <Activity class="w-6 h-6" />
              </div>
              <div>
                <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Pending</p>
                <h3 class="text-2xl font-bold text-amber-600">₹{{ (pendingRevenue / 100).toLocaleString() }}</h3>
              </div>
            </div>
          </Card>

          <Card class="ring-1 ring-slate-200">
            <div class="flex items-center gap-4">
              <div class="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                <CreditCard class="w-6 h-6" />
              </div>
              <div>
                <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Bills</p>
                <h3 class="text-2xl font-bold text-purple-600">{{ totalBills }}</h3>
              </div>
            </div>
          </Card>
        </div>

        <!-- Main Content -->
        <Card title="All Invoices" subtitle="View and manage patient bills" :icon="CreditCard">
          <template #header-action>
            <div class="relative w-64">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                v-model="searchQuery"
                type="text" 
                placeholder="Search by patient name..." 
                class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>
          </template>

          <div v-if="loading" class="text-center py-8 text-slate-500">Loading bills...</div>
          
          <Table 
            v-else
            :headers="['ID', 'Patient', 'Amount', 'Status', 'Date', 'Actions']" 
            :items="filteredBills.map((b, index) => ({ 
              id: b.bill_id,
              patient: b.patient_name,
              amount: '₹' + (b.amount / 100).toLocaleString(),
              status: b.status,
              date: new Date(b.created_at).toLocaleDateString(),
              _id: b.bill_id
            }))"
          >
            <template #cell-status="{ value }">
              <span :class="[
                'px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase',
                value === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              ]">
                {{ value }}
              </span>
            </template>
            <template #cell-actions="{ item }">
              <div class="flex gap-2">
                <button 
                  v-if="item.status !== 'paid'"
                  @click="markAsPaid(item._id)"
                  class="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all text-xs font-bold"
                  title="Mark as Paid"
                >
                  Mark Paid
                </button>
                <span v-else class="text-xs text-emerald-600 font-bold">✓ Paid</span>
              </div>
            </template>
          </Table>
        </Card>
      </div>
    </main>
  </div>
</template>
