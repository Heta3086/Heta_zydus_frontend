<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Sidebar from '../components/Sidebar.vue';
import Navbar from '../components/Navbar.vue';
import Card from '../components/Card.vue';
import Table from '../components/Table.vue';
import {
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  ArrowRight,
  FlaskConical,
  PackageCheck,
  Plus,
  X,
  Edit,
  Trash2,
} from 'lucide-vue-next';
import * as adminAPI from '../services/admin';
import type { LabReport, PharmacyItem } from '../services/admin';

const props = defineProps<{
  userName?: string | null;
}>();

const emit = defineEmits(['logout']);
const activeTab = ref('dashboard');
const searchQuery = ref('');
const loading = ref(false);
const notice = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const showAddMedicineModal = ref(false);
const showEditMedicineModal = ref(false);
const showEditLabTestDrawer = ref(false);
const showLogoutConfirm = ref(false);

const medicines = ref<PharmacyItem[]>([]);
const labReports = ref<LabReport[]>([]);
const selectedReport = ref<LabReport | null>(null);
const selectedResult = ref('');
const selectedStatus = ref('pending');
const newMedicine = ref({ name: '', stock: '', price: '' });
const editingMedicine = ref<{ id: number; name: string; stock: number; price: number } | null>(null);
const addMedicineErrors = ref({ name: '', stock: '', price: '' });
const editMedicineErrors = ref({ name: '', stock: '', price: '' });

const showNotice = (type: 'success' | 'error', text: string) => {
  notice.value = { type, text };
  setTimeout(() => {
    notice.value = null;
  }, 2500);
};

const handleTabChange = (tab: string) => {
  activeTab.value = tab;
  if (tab !== 'laboratory') {
    selectedReport.value = null;
  }
};

const handleSearch = (query: string) => {
  searchQuery.value = query;
};

const handleLogoutClick = () => {
  showLogoutConfirm.value = true;
};

const confirmLogout = () => {
  showLogoutConfirm.value = false;
  emit('logout');
};

const cancelLogout = () => {
  showLogoutConfirm.value = false;
};

const loadData = async () => {
  try {
    loading.value = true;
    const [pharmacyItems, reports] = await Promise.all([
      adminAPI.getPharmacyItems(),
      adminAPI.getLabReports(),
    ]);
    medicines.value = pharmacyItems;
    labReports.value = reports;
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to load pharmacist dashboard');
  } finally {
    loading.value = false;
  }
};

const filteredMedicines = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return medicines.value;
  return medicines.value.filter((m) => {
    return m.medicine_name.toLowerCase().includes(q);
  });
});

const filteredReports = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return labReports.value;
  return labReports.value.filter((r) => {
    return (
      (r.patient_name || '').toLowerCase().includes(q) ||
      r.test_name.toLowerCase().includes(q) ||
      (r.status || '').toLowerCase().includes(q)
    );
  });
});

const lowStockMedicines = computed(() => filteredMedicines.value.filter((m) => Number(m.quantity || 0) < 200));
const lowStockCriticalCount = computed(() => medicines.value.filter((m) => Number(m.quantity || 0) < 100).length);
const outOfStockCount = computed(() => medicines.value.filter((m) => Number(m.quantity || 0) === 0).length);
const pendingReports = computed(() => {
  return filteredReports.value.filter((r) => {
    const s = (r.status || '').toLowerCase();
    return s === 'pending' || s === 'in_progress' || s === 'in progress';
  });
});

const medicineRows = computed(() => {
  return filteredMedicines.value.map((m) => ({
    _id: m.item_id,
    name: m.medicine_name,
    category: 'General',
    price: Number(m.unit_price || 0).toFixed(2),
    stock: m.quantity,
    actions: '',
    _original: m,
  }));
});

const reportRows = computed(() => {
  return filteredReports.value.map((r) => ({
    patient: r.patient_name || `Patient #${r.patient_id}`,
    test: r.test_name,
    result: r.result || '-',
    status: r.status || 'pending',
    actions: 'edit',
    _is_locked: String(r.status || '').toLowerCase() === 'completed' && String(r.result || '').trim() !== '',
    _raw: r,
  }));
});

const viewReport = (report: LabReport) => {
  const isLocked = String(report.status || '').toLowerCase() === 'completed' && String(report.result || '').trim() !== '';
  if (isLocked) {
    showNotice('error', 'Completed report cannot be updated again');
    return;
  }

  selectedReport.value = report;
  selectedResult.value = report.result || '';
  selectedStatus.value = report.status || 'pending';
  showEditLabTestDrawer.value = true;
};

const saveLabReport = async () => {
  if (!selectedReport.value) return;

  const isLocked = String(selectedReport.value.status || '').toLowerCase() === 'completed' && String(selectedReport.value.result || '').trim() !== '';
  if (isLocked) {
    showNotice('error', 'Completed report cannot be updated again');
    selectedReport.value = null;
    return;
  }

  if (String(selectedStatus.value || '').toLowerCase() === 'completed' && !String(selectedResult.value || '').trim()) {
    showNotice('error', 'Please fill result before marking as completed');
    return;
  }

  try {
    await adminAPI.updateLabTest(selectedReport.value.lab_report_id, {
      result: selectedResult.value,
      status: selectedStatus.value,
    });

    selectedReport.value.result = selectedResult.value;
    selectedReport.value.status = selectedStatus.value;

    const idx = labReports.value.findIndex((r) => r.lab_report_id === selectedReport.value?.lab_report_id);
    if (idx >= 0) {
      labReports.value[idx] = {
        ...labReports.value[idx],
        result: selectedResult.value,
        status: selectedStatus.value,
      };
    }

    showNotice('success', 'Lab report updated successfully');
    selectedReport.value = null;
    showEditLabTestDrawer.value = false;
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to update lab report');
  }
};

const addMedicine = async () => {
  addMedicineErrors.value = { name: '', stock: '', price: '' };

  const name = newMedicine.value.name.trim();
  const stock = Number(newMedicine.value.stock);
  const price = Number(newMedicine.value.price);

  if (!name) {
    addMedicineErrors.value.name = 'Please fill medicine name';
  }
  if (String(newMedicine.value.stock).trim() === '') {
    addMedicineErrors.value.stock = 'Please fill stock';
  } else if (!Number.isFinite(stock) || stock <= 0) {
    addMedicineErrors.value.stock = 'Stock must be greater than 0';
  }
  if (String(newMedicine.value.price).trim() === '') {
    addMedicineErrors.value.price = 'Please fill price';
  } else if (!Number.isFinite(price) || price <= 0) {
    addMedicineErrors.value.price = 'Price must be greater than 0';
  }

  if (addMedicineErrors.value.name || addMedicineErrors.value.stock || addMedicineErrors.value.price) {
    showNotice('error', 'Please fill all medicine details correctly');
    return;
  }

  try {
    await adminAPI.createPharmacyItem({
      medicine_name: name,
      quantity: stock,
      unit_price: price,
    });

    showNotice('success', 'Medicine added to inventory');
    showAddMedicineModal.value = false;
    newMedicine.value = { name: '', stock: '', price: '' };
    addMedicineErrors.value = { name: '', stock: '', price: '' };
    await loadData();
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to add medicine');
  }
};

const openEditMedicine = (item: PharmacyItem) => {
  editingMedicine.value = {
    id: item.item_id,
    name: item.medicine_name,
    stock: Number(item.quantity || 0),
    price: Number(item.unit_price || 0),
  };
  editMedicineErrors.value = { name: '', stock: '', price: '' };
  showEditMedicineModal.value = true;
};

const saveEditedMedicine = async () => {
  if (!editingMedicine.value) return;

  editMedicineErrors.value = { name: '', stock: '', price: '' };

  const name = editingMedicine.value.name.trim();
  const stock = Number(editingMedicine.value.stock);
  const price = Number(editingMedicine.value.price);

  if (!name) {
    editMedicineErrors.value.name = 'Please fill medicine name';
  }
  if (!Number.isFinite(stock) || stock <= 0) {
    editMedicineErrors.value.stock = 'Stock must be greater than 0';
  }
  if (!Number.isFinite(price) || price <= 0) {
    editMedicineErrors.value.price = 'Price must be greater than 0';
  }

  if (editMedicineErrors.value.name || editMedicineErrors.value.stock || editMedicineErrors.value.price) {
    showNotice('error', 'Please fill all medicine details correctly');
    return;
  }

  try {
    await adminAPI.updatePharmacyItem(editingMedicine.value.id, {
      medicine_name: name,
      quantity: stock,
      unit_price: price,
    });
    showNotice('success', 'Medicine updated successfully');
    showEditMedicineModal.value = false;
    editingMedicine.value = null;
    await loadData();
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to update medicine');
  }
};

const deleteMedicine = async (item: PharmacyItem) => {
  try {
    await adminAPI.deletePharmacyItem(item.item_id);
    showNotice('success', `${item.medicine_name} deleted successfully`);
    await loadData();
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to delete medicine');
  }
};

onMounted(loadData);
</script>

<template>
  <div class="flex min-h-screen bg-slate-50">
    <Sidebar role="pharmacy" :activeTab="activeTab" @change-tab="handleTabChange" @logout="handleLogoutClick" />

    <div class="flex-1 flex flex-col min-w-0">
      <Navbar role="pharmacy" :activeTab="activeTab" @search="handleSearch" />

      <main class="p-8 overflow-y-auto space-y-6">
        <div
          v-if="notice"
          :class="notice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'"
          class="rounded-xl border px-4 py-3 text-sm font-semibold"
        >
          {{ notice.text }}
        </div>

        <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Loading pharmacist dashboard...
        </div>

        <div v-else-if="activeTab === 'dashboard'" class="space-y-8 animate-in fade-in duration-500">
          <div class="bg-gradient-to-r from-sky-600 to-sky-400 p-8 rounded-3xl text-white shadow-xl shadow-sky-500/20">
            <h2 class="text-3xl font-bold tracking-tight">Welcome{{ props.userName ? ` ${props.userName}` : '' }}!</h2>
            <p class="text-white/80 mt-2 max-w-md">Manage inventory and lab reports.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div class="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                <Clock class="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p class="text-slate-400 text-sm font-medium">Pending Lab Reports</p>
                <h3 class="text-2xl font-bold text-slate-800">{{ pendingReports.length }}</h3>
              </div>
            </div>
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div class="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                <AlertTriangle class="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p class="text-slate-400 text-sm font-medium">Low Stock Alerts</p>
                <h3 class="text-2xl font-bold text-slate-800">{{ lowStockMedicines.length }}</h3>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card title="Recent Lab Reports" subtitle="Latest tests ordered by doctors" :icon="FlaskConical">
              <div class="space-y-4">
                <div
                  v-for="report in filteredReports.slice(0, 5)"
                  :key="report.lab_report_id"
                  class="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group hover:border-sky-200 transition-all cursor-pointer"
                  @click="viewReport(report)"
                >
                  <div>
                    <p class="font-bold text-slate-800">{{ report.patient_name || `Patient #${report.patient_id}` }}</p>
                    <p class="text-xs text-slate-400">{{ report.test_name }}</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <span
                      :class="[
                        'px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider',
                        (report.status || '').toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      ]"
                    >
                      {{ report.status || 'pending' }}
                    </span>
                    <ArrowRight class="w-4 h-4 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Low Stock Inventory" subtitle="Items requiring immediate restock" :icon="AlertTriangle">
              <div class="space-y-4">
                <div
                  v-for="med in lowStockMedicines"
                  :key="med.item_id"
                  class="p-4 bg-red-50/30 rounded-xl border border-red-100 flex items-center justify-between"
                >
                  <div>
                    <p class="font-bold text-slate-800">{{ med.medicine_name }}</p>
                    <p class="text-xs text-slate-400">Pharmacy Item</p>
                  </div>
                  <div class="text-right">
                    <p class="text-lg font-bold text-red-600">{{ med.quantity }}</p>
                    <p class="text-[10px] text-red-400 font-bold uppercase">Units Left</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div v-else-if="activeTab === 'laboratory'" class="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <h2 class="text-2xl font-bold text-slate-800">Laboratory Reports</h2>
          <Card>
            <Table :headers="['Patient', 'Test', 'Result', 'Status', 'Actions']" :items="reportRows">
              <template #cell-status="{ value }">
                <span
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-bold uppercase',
                    String(value).toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  ]"
                >
                  {{ value }}
                </span>
              </template>
              <template #actions="{ item }">
                <button
                  :disabled="item._is_locked"
                  @click="viewReport(item._raw)"
                  :class="item._is_locked
                    ? 'bg-slate-200 text-slate-500 px-4 py-2 rounded-lg text-xs font-bold cursor-not-allowed'
                    : 'bg-sky-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-sky-600 transition-all'"
                >
                  {{ item._is_locked ? 'Locked' : 'Update' }}
                </button>
              </template>
            </Table>
          </Card>
        </div>

        <div v-else-if="activeTab === 'pharmacy'" class="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold text-slate-800">Medicine Inventory</h2>
            <button
              @click="showAddMedicineModal = true"
              class="bg-sky-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-sky-500/20 hover:bg-sky-600 transition-all"
            >
              <Plus class="w-5 h-5" />
              Add Medicine
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Medicines</p>
              <h3 class="text-2xl font-bold text-slate-800">{{ medicines.length }}</h3>
            </div>
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Low Stock Alert</p>
              <h3 class="text-2xl font-bold text-red-500">{{ lowStockCriticalCount }} Items</h3>
            </div>
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Out of Stock</p>
              <h3 class="text-2xl font-bold text-amber-500">{{ outOfStockCount }} Items</h3>
            </div>
          </div>

          <Card>
            <Table :headers="['Name', 'Category', 'Price', 'Stock', 'Actions']" :items="medicineRows">
              <template #cell-price="{ value }">
                Rs. {{ value }}
              </template>
              <template #cell-stock="{ value }">
                <div class="flex items-center gap-2">
                  <span :class="['font-bold', Number(value) < 200 ? 'text-red-500' : 'text-slate-600']">
                    {{ value }}
                  </span>
                  <AlertTriangle v-if="Number(value) < 200" class="w-4 h-4 text-red-500" />
                </div>
              </template>
              <template #cell-actions="{ item }">
                <div class="flex items-center gap-2">
                  <button @click="openEditMedicine(item._original)" class="p-2 text-slate-400 hover:text-sky-600 transition-all">
                    <Edit class="w-4 h-4" />
                  </button>
                  <button @click="deleteMedicine(item._original)" class="p-2 text-slate-400 hover:text-red-600 transition-all">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </template>
            </Table>
          </Card>
        </div>

        <div v-else class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          <div class="inline-flex items-center gap-2 text-slate-700 font-bold">
            <CheckCircle2 class="w-5 h-5 text-emerald-500" />
            Open Dashboard, Laboratory, or Pharmacy from the left menu.
          </div>
        </div>

        <div v-if="showAddMedicineModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-xl font-bold text-slate-800">Add New Medicine</h3>
              <button @click="showAddMedicineModal = false" class="text-slate-400 hover:text-slate-600"><X class="w-6 h-6" /></button>
            </div>
            <form @submit.prevent="addMedicine" class="space-y-4">
              <div class="space-y-2">
                <label class="text-sm font-bold text-slate-700">Medicine Name</label>
                <input
                  v-model="newMedicine.name"
                  type="text"
                  placeholder="e.g. Paracetamol"
                  class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
                  required
                />
                <p v-if="addMedicineErrors.name" class="text-xs text-red-500 font-semibold">{{ addMedicineErrors.name }}</p>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-sm font-bold text-slate-700">Stock</label>
                  <input v-model="newMedicine.stock" type="number" min="1" step="1" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none" required />
                  <p v-if="addMedicineErrors.stock" class="text-xs text-red-500 font-semibold">{{ addMedicineErrors.stock }}</p>
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-bold text-slate-700">Price (Rs.)</label>
                  <input v-model="newMedicine.price" type="number" min="1" step="1" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none" required />
                  <p v-if="addMedicineErrors.price" class="text-xs text-red-500 font-semibold">{{ addMedicineErrors.price }}</p>
                </div>
              </div>
              <button type="submit" class="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20">Add to Inventory</button>
            </form>
          </div>
        </div>

        <div v-if="showEditMedicineModal && editingMedicine" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-xl font-bold text-slate-800">Edit Medicine</h3>
              <button @click="showEditMedicineModal = false" class="text-slate-400 hover:text-slate-600"><X class="w-6 h-6" /></button>
            </div>
            <form @submit.prevent="saveEditedMedicine" class="space-y-4">
              <div class="space-y-2">
                <label class="text-sm font-bold text-slate-700">Medicine Name</label>
                <input
                  v-model="editingMedicine.name"
                  type="text"
                  class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
                  required
                />
                <p v-if="editMedicineErrors.name" class="text-xs text-red-500 font-semibold">{{ editMedicineErrors.name }}</p>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-sm font-bold text-slate-700">Stock</label>
                  <input v-model.number="editingMedicine.stock" type="number" min="1" step="1" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none" required />
                  <p v-if="editMedicineErrors.stock" class="text-xs text-red-500 font-semibold">{{ editMedicineErrors.stock }}</p>
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-bold text-slate-700">Price (Rs.)</label>
                  <input v-model.number="editingMedicine.price" type="number" min="1" step="1" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none" required />
                  <p v-if="editMedicineErrors.price" class="text-xs text-red-500 font-semibold">{{ editMedicineErrors.price }}</p>
                </div>
              </div>
              <button type="submit" class="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20">Save Changes</button>
            </form>
          </div>
        </div>
      </main>
    </div>

    <!-- Edit Lab Test Side Drawer -->
    <div v-if="showEditLabTestDrawer && selectedReport" class="fixed inset-0 z-50">
      <!-- Backdrop -->
      <div @click="showEditLabTestDrawer = false" class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <!-- Side Drawer -->
      <div class="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-sky-50 to-sky-100">
          <div>
            <h3 class="text-xl font-bold text-slate-800">Edit Lab Test</h3>
            <p class="text-xs text-slate-500 mt-1">{{ selectedReport?.test_name }}</p>
          </div>
          <button @click="showEditLabTestDrawer = false" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
            <X class="w-6 h-6" />
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6">
          <form @submit.prevent="saveLabReport" class="space-y-6">
            <!-- Test Info -->
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p class="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Test Details</p>
              <div class="space-y-2">
                <div>
                  <p class="text-xs text-slate-400">Test Name</p>
                  <p class="font-semibold text-slate-800">{{ selectedReport?.test_name }}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400">Patient ID</p>
                  <p class="font-semibold text-slate-800">#{{ selectedReport?.patient_id }}</p>
                </div>
                <div v-if="selectedReport?.created_at">
                  <p class="text-xs text-slate-400">Ordered Date</p>
                  <p class="font-semibold text-slate-800">{{ new Date(selectedReport.created_at).toLocaleDateString() }}</p>
                </div>
              </div>
            </div>

            <!-- Status -->
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700">Status</label>
              <select v-model="selectedStatus" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none font-medium" required>
                <option value="pending">🟡 Pending</option>
                <option value="in_progress">🔵 In Progress</option>
                <option value="completed">✅ Completed</option>
              </select>
            </div>

            <!-- Result -->
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700">Test Result</label>
              <textarea v-model="selectedResult" placeholder="Enter test result (e.g., High, Normal, Low, or detailed findings)" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none resize-none" rows="4"></textarea>
              <p class="text-xs text-slate-400">Describe the test findings or result values</p>
            </div>

            <!-- Submit Button -->
            <button type="submit" class="w-full py-4 px-6 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold rounded-xl hover:from-sky-600 hover:to-sky-700 transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2">
              <Edit class="w-4 h-4" />
              Update Lab Test
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- Logout Confirmation Modal -->
    <div v-if="showLogoutConfirm" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in duration-300">
        <h3 class="text-xl font-bold text-slate-800 mb-2">Sign Out?</h3>
        <p class="text-slate-600 mb-6">Are you sure you want to sign out? You'll need to log in again to access your account.</p>
        <div class="flex gap-3">
          <button
            @click="cancelLogout"
            class="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            @click="confirmLogout"
            class="flex-1 px-4 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
