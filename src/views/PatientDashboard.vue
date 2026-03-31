<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Sidebar from '../components/Sidebar.vue';
import Navbar from '../components/Navbar.vue';
import Card from '../components/Card.vue';
import Table from '../components/Table.vue';
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Pill,
  ClipboardList,
  ArrowRight,
  UserRound,
  Building2,
  FlaskConical,
  X,
  AlertCircle,
} from 'lucide-vue-next';
import * as adminAPI from '../services/admin';
import type { Department, Doctor, MyAppointment, MyBill, MyLabReport, MyPrescription } from '../services/admin';

const props = defineProps<{
  userName?: string | null;
}>();

const emit = defineEmits(['logout']);
const activeTab = ref('dashboard');
const searchQuery = ref('');
const loading = ref(false);
const notice = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const showLogoutConfirm = ref(false);

const departments = ref<Department[]>([]);
const doctors = ref<Doctor[]>([]);
const appointments = ref<MyAppointment[]>([]);
const bills = ref<MyBill[]>([]);
const labTests = ref<MyLabReport[]>([]);
const prescriptions = ref<MyPrescription[]>([]);

const bookingForm = ref({
  department_id: 0,
  doctor_id: 0,
  date: '',
  time: '',
  reason: '',
});

const formatDate = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
};

const formatTime = (value?: string) => {
  if (!value) return '-';
  const normalized = String(value).slice(0, 8);
  const d = new Date(`1970-01-01T${normalized}`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const showNotice = (type: 'success' | 'error', text: string) => {
  notice.value = { type, text };
  setTimeout(() => {
    notice.value = null;
  }, 2500);
};

const normalizeStatus = (status: string) => {
  const s = String(status || '').trim().toLowerCase();
  if (s === 'confirmed' || s === 'accepted') return 'Accepted';
  if (s === 'scheduled' || s === 'pending') return 'Pending';
  if (s === 'cancelled' || s === 'rejected') return 'Rejected';
  if (s === 'completed') return 'Completed';
  return status || 'Pending';
};

const loadData = async () => {
  loading.value = true;
  try {
    const [appointmentsRes, departmentsRes, doctorsRes, labRes, billsRes, prescriptionsRes] = await Promise.allSettled([
      adminAPI.getMyAppointments(),
      adminAPI.getDepartments(),
      adminAPI.getDoctors(),
      adminAPI.getMyLabReports(),
      adminAPI.getMyBills(),
      adminAPI.getMyPrescriptions(),
    ]);

    if (appointmentsRes.status === 'fulfilled') appointments.value = appointmentsRes.value;
    if (departmentsRes.status === 'fulfilled') departments.value = departmentsRes.value;
    if (doctorsRes.status === 'fulfilled') doctors.value = doctorsRes.value;
    if (labRes.status === 'fulfilled') labTests.value = labRes.value;
    if (billsRes.status === 'fulfilled') bills.value = billsRes.value;
    if (prescriptionsRes.status === 'fulfilled') prescriptions.value = prescriptionsRes.value;

    const failed: string[] = [];
    if (appointmentsRes.status === 'rejected') failed.push('appointments');
    if (departmentsRes.status === 'rejected') failed.push('departments');
    if (doctorsRes.status === 'rejected') failed.push('doctors');
    if (labRes.status === 'rejected') failed.push('lab reports');
    if (billsRes.status === 'rejected') failed.push('bills');
    if (prescriptionsRes.status === 'rejected') failed.push('prescriptions');

    if (failed.length) {
      showNotice('error', `Some data failed to load: ${failed.join(', ')}`);
    }
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to load dashboard data');
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);

const handleTabChange = (tab: string) => {
  activeTab.value = tab;
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

const filteredAppointments = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  const mapped = appointments.value.map((a) => ({
    ...a,
    doctor_name: a.doctor?.name || `Doctor #${a.doctor_id}`,
    status_label: normalizeStatus(a.status),
  }));
  if (!q) return mapped;
  return mapped.filter((a) => a.doctor_name.toLowerCase().includes(q) || a.status_label.toLowerCase().includes(q));
});

const filteredBills = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return bills.value;
  return bills.value.filter((b) => b.status.toLowerCase().includes(q) || formatDate(b.created_at).toLowerCase().includes(q));
});

const filteredLabTests = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return labTests.value;
  return labTests.value.filter((t) => t.test_name.toLowerCase().includes(q) || t.status.toLowerCase().includes(q));
});

const filteredDoctors = computed(() => {
  if (!bookingForm.value.department_id) return [];
  return doctors.value.filter((d) => Number(d.department_id) === Number(bookingForm.value.department_id));
});

const completedAppointments = computed(() => {
  return appointments.value.filter((a) => normalizeStatus(a.status) === 'Completed');
});

const prescriptionRows = computed(() => {
  const rows: Array<{ medicine: string; dosage: string; duration: string; doctor: string }> = [];

  // First, try to use prescriptions from the dedicated endpoint
  if (prescriptions.value && prescriptions.value.length > 0) {
    const validPrescriptions = prescriptions.value.filter((rx: any) => 
      String(rx.medicine_name || '').trim().length > 0
    );
    
    if (validPrescriptions.length > 0) {
      validPrescriptions.forEach((rx: any) => {
        rows.push({
          medicine: String(rx.medicine_name || '').trim(),
          dosage: String(rx.dosage || '').trim() || '-',
          duration: String(rx.duration || '').trim() || '-',
          doctor: String(rx.doctor_name || '').trim() || 'Doctor',
        });
      });
      return rows;
    }
  }

  // Fall back to appointments' prescription data
  completedAppointments.value.forEach((appt: any) => {
    let parsed: any[] = [];
    const raw = appt.prescription;

    if (Array.isArray(raw) && raw.length > 0) {
      parsed = raw;
    } else if (typeof raw === 'string' && raw.trim()) {
      try {
        const asJson = JSON.parse(raw);
        if (Array.isArray(asJson)) {
          parsed = asJson;
        } else if (asJson && typeof asJson === 'object' && Object.keys(asJson).length > 0) {
          parsed = [asJson];
        }
      } catch {
        parsed = [];
      }
    } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      parsed = [raw];
    }

    parsed.forEach((item: any) => {
      if (item && (item.name || item.medicine || item.medicine_name || item.dosage || item.duration)) {
        rows.push({
          medicine: String(item.name || item.medicine || item.medicine_name || 'Prescription').trim(),
          dosage: String(item.dosage || item.frequency || '-').trim(),
          duration: String(item.duration || (item.duration_days ? item.duration_days + ' Days' : '') || '-').trim(),
          doctor: (appt.doctor?.name || `Doctor #${appt.doctor_id}`).trim(),
        });
      }
    });
  });

  return rows;
});

const minDate = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split('T')[0];
});

const submitBooking = async () => {
  if (!bookingForm.value.doctor_id || !bookingForm.value.date || !bookingForm.value.time || !bookingForm.value.reason.trim()) {
    showNotice('error', 'Please fill all booking details');
    return;
  }

  try {
    await adminAPI.createAppointment({
      doctor_id: Number(bookingForm.value.doctor_id),
      appointment_date: bookingForm.value.date,
      appointment_time: bookingForm.value.time,
      reason: bookingForm.value.reason.trim(),
    });

    showNotice('success', 'Appointment booked successfully. Status: Pending');
    bookingForm.value = { department_id: 0, doctor_id: 0, date: '', time: '', reason: '' };
    activeTab.value = 'appointments';
    await loadData();
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to book appointment');
  }
};

const resetForm = () => {
  bookingForm.value = { department_id: 0, doctor_id: 0, date: '', time: '', reason: '' };
};
</script>

<template>
  <div class="flex min-h-screen bg-slate-50">
    <Sidebar role="patient" :activeTab="activeTab" @change-tab="handleTabChange" @logout="handleLogoutClick" />

    <div class="flex-1 flex flex-col min-w-0">
      <Navbar role="patient" :activeTab="activeTab" @search="handleSearch" />

      <main class="p-8 overflow-y-auto">
        <div
          v-if="notice"
          :class="notice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'"
          class="rounded-xl border px-4 py-3 text-sm font-semibold mb-6"
        >
          {{ notice.text }}
        </div>

        <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading patient dashboard...</div>

        <div v-else-if="activeTab === 'dashboard'" class="space-y-8 animate-in fade-in duration-500">
          <div class="bg-gradient-to-r from-sky-600 to-sky-400 p-10 rounded-3xl text-white shadow-xl shadow-sky-500/20 relative overflow-hidden">
            <div class="relative z-10">
              <h2 class="text-3xl font-bold tracking-tight">Welcome{{ props.userName ? ` ${props.userName}` : ' back' }}!</h2>
              <p class="text-white/80 mt-2 max-w-md">Your health is our priority. You can track appointments, lab reports, and bills in real time.</p>
              <button
                @click="activeTab = 'book'"
                class="mt-6 bg-white text-sky-600 px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-sky-50 transition-all shadow-lg"
              >
                <Plus class="w-5 h-5" />
                Book New Appointment
              </button>
            </div>
            <div class="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
            <div class="absolute -left-20 -top-20 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card title="Upcoming Appointments" subtitle="Your scheduled visits" :icon="Calendar" class="lg:col-span-2">
              <Table
                :headers="['Doctor', 'Date', 'Time', 'Status']"
                :items="filteredAppointments.map(a => ({ doctor: a.doctor_name, date: formatDate(a.appointment_date), time: formatTime(a.appointment_time), status: a.status_label }))"
              >
                <template #cell-status="{ value }">
                  <div class="flex items-center gap-2">
                    <CheckCircle2 v-if="value === 'Accepted' || value === 'Completed'" class="w-4 h-4 text-emerald-500" />
                    <Clock v-else-if="value === 'Pending'" class="w-4 h-4 text-amber-500" />
                    <XCircle v-else class="w-4 h-4 text-red-500" />
                    <span
                      :class="[
                        'text-xs font-bold',
                        value === 'Accepted' || value === 'Completed' ? 'text-emerald-600' :
                        value === 'Pending' ? 'text-amber-600' : 'text-red-600'
                      ]"
                    >
                      {{ value }}
                    </span>
                  </div>
                </template>
              </Table>
            </Card>

            <Card title="Recent Prescriptions" subtitle="Latest medical advice" :icon="Pill">
              <div class="space-y-4" v-if="prescriptionRows.length">
                <div
                  v-for="(rx, idx) in prescriptionRows.slice(0, 3)"
                  :key="idx"
                  class="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-sky-200 transition-all cursor-pointer group"
                  @click="activeTab = 'prescriptions'"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm font-bold text-slate-700">{{ rx.medicine }}</p>
                      <p class="text-xs text-slate-400">{{ rx.doctor }} • {{ rx.dosage }} • {{ rx.duration }}</p>
                    </div>
                    <ArrowRight class="w-4 h-4 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
              <p v-else class="text-sm text-slate-500">No prescriptions available yet.</p>
            </Card>
          </div>
        </div>

        <div v-else-if="activeTab === 'book'" class="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div class="text-center">
            <h2 class="text-3xl font-bold text-slate-800">Book Appointment</h2>
            <p class="text-slate-400 mt-2">Choose your preferred doctor and schedule a visit</p>
          </div>

          <Card>
            <form @submit.prevent="submitBooking" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Building2 class="w-4 h-4 text-sky-500" />
                    Select Department
                  </label>
                  <select
                    v-model.number="bookingForm.department_id"
                    class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all appearance-none"
                    required
                  >
                    <option :value="0" disabled>Choose Department</option>
                    <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
                  </select>
                </div>

                <div class="space-y-2">
                  <label class="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <UserRound class="w-4 h-4 text-sky-500" />
                    Select Doctor
                  </label>
                  <select
                    v-model.number="bookingForm.doctor_id"
                    class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all appearance-none"
                    :disabled="!bookingForm.department_id"
                    required
                  >
                    <option :value="0" disabled>Choose Doctor</option>
                    <option v-for="doc in filteredDoctors" :key="doc.id" :value="doc.id">{{ doc.name }}</option>
                  </select>
                </div>

                <div class="space-y-2">
                  <label class="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Calendar class="w-4 h-4 text-sky-500" />
                    Select Date
                  </label>
                  <input
                    v-model="bookingForm.date"
                    type="date"
                    :min="minDate"
                    class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                    required
                  />
                </div>

                <div class="space-y-2">
                  <label class="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Clock class="w-4 h-4 text-sky-500" />
                    Select Time
                  </label>
                  <select
                    v-model="bookingForm.time"
                    class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all appearance-none"
                    required
                  >
                    <option value="" disabled>Choose Time</option>
                    <option value="09:00:00">09:00 AM</option>
                    <option value="10:00:00">10:00 AM</option>
                    <option value="11:00:00">11:00 AM</option>
                    <option value="14:00:00">02:00 PM</option>
                    <option value="15:00:00">03:00 PM</option>
                  </select>
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <ClipboardList class="w-4 h-4 text-sky-500" />
                  Reason for Visit
                </label>
                <textarea
                  v-model="bookingForm.reason"
                  rows="4"
                  placeholder="Tell us about your symptoms or reason for visit..."
                  class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                  required
                ></textarea>
              </div>

              <div class="flex gap-4">
                <button
                  type="submit"
                  class="flex-1 py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20"
                >
                  Confirm Appointment Request
                </button>
                <button
                  type="button"
                  @click="resetForm"
                  class="px-6 py-4 bg-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-300 transition-all flex items-center gap-2"
                  title="Clear form"
                >
                  <X class="w-5 h-5" />
                </button>
              </div>
            </form>
          </Card>
        </div>

        <div v-else-if="activeTab === 'appointments'" class="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <h2 class="text-2xl font-bold text-slate-800">My Appointments</h2>
          <Card>
            <Table
              :headers="['Doctor', 'Date', 'Time', 'Status']"
              :items="filteredAppointments.map(a => ({ doctor: a.doctor_name, date: formatDate(a.appointment_date), time: formatTime(a.appointment_time), status: a.status_label }))"
            >
              <template #cell-status="{ value }">
                <span
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-bold',
                    value === 'Accepted' || value === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                    value === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                  ]"
                >
                  {{ value }}
                </span>
              </template>
            </Table>
          </Card>
        </div>

        <div v-else-if="activeTab === 'history'" class="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <h2 class="text-2xl font-bold text-slate-800">Medical History</h2>
          <div class="space-y-6" v-if="completedAppointments.length">
            <div
              v-for="appt in completedAppointments"
              :key="appt.id"
              class="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 hover:shadow-lg transition-all"
            >
              <div class="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <p class="text-sm text-slate-500">{{ formatDate(appt.appointment_date) }} at {{ formatTime(appt.appointment_time) }}</p>
                  <p class="text-xs text-slate-400 mt-1">Appointment ID: {{ appt.id }}</p>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">{{ normalizeStatus(appt.status) }}</span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p class="text-xs text-slate-400 uppercase font-bold mb-2">Symptoms</p>
                  <p class="text-sm text-slate-700 bg-slate-50 p-3 rounded">{{ appt.symptoms || 'N/A' }}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400 uppercase font-bold mb-2">Diagnosis</p>
                  <p class="text-sm text-slate-700 bg-slate-50 p-3 rounded">{{ appt.diagnosis || 'N/A' }}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400 uppercase font-bold mb-2">Doctor</p>
                  <p class="text-sm font-bold text-slate-800 bg-slate-50 p-3 rounded">{{ appt.doctor?.name || `Doctor #${appt.doctor_id}` }}</p>
                </div>
              </div>

              <div>
                <p class="text-xs text-slate-400 uppercase font-bold mb-2">Treatment Plan</p>
                <p class="text-sm text-slate-700 bg-slate-50 p-3 rounded">{{ appt.treatment || appt.doctor_notes || 'N/A' }}</p>
              </div>

              <div v-if="appt.prescription && appt.prescription.length > 0">
                <p class="text-xs text-slate-400 uppercase font-bold mb-3">Prescribed Medicines</p>
                <div class="space-y-2">
                  <div
                    v-for="(med, idx) in appt.prescription"
                    :key="idx"
                    class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2"
                  >
                    <div class="flex items-start justify-between">
                      <div>
                        <p class="font-semibold text-slate-800">{{ med.name || 'Medicine' }}</p>
                        <p class="text-xs text-slate-500">{{ med.category || 'N/A' }}</p>
                      </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p class="text-slate-500 font-semibold">Dosage:</p>
                        <p class="text-slate-700">{{ med.dosage || '-' }}</p>
                      </div>
                      <div>
                        <p class="text-slate-500 font-semibold">Duration:</p>
                        <p class="text-slate-700">{{ med.duration || '-' }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">No completed medical history yet.</div>
        </div>

        <div v-else-if="activeTab === 'prescriptions'" class="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <h2 class="text-2xl font-bold text-slate-800">My Prescriptions</h2>
          <div v-if="prescriptionRows.length === 0" class="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <Pill class="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p class="text-slate-500 font-medium">No prescriptions yet</p>
            <p class="text-slate-400 text-sm mt-1">Prescriptions will appear here when your doctor provides them</p>
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              v-for="(rx, idx) in prescriptionRows"
              :key="idx"
              class="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all"
            >
              <div class="flex items-start justify-between mb-4 pb-4 border-b border-slate-100">
                <div>
                  <p class="font-bold text-slate-800 text-lg">{{ rx.medicine && rx.medicine !== 'Medicine' ? rx.medicine : 'Prescription' }}</p>
                  <p class="text-xs text-slate-400 mt-1">Prescribed by {{ rx.doctor }}</p>
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex justify-between items-center p-3 bg-sky-50 rounded-lg">
                  <span class="text-sm font-semibold text-slate-700">Dosage</span>
                  <span class="text-sm font-bold text-sky-600">{{ rx.dosage !== '-' ? rx.dosage : 'As advised' }}</span>
                </div>
                <div class="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                  <span class="text-sm font-semibold text-slate-700">Duration</span>
                  <span class="text-sm font-bold text-emerald-600">{{ rx.duration !== '-' ? rx.duration : 'As advised' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'laboratory'" class="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <h2 class="text-2xl font-bold text-slate-800">My Lab Reports</h2>
          <Card title="Diagnostic Results" subtitle="Your recent test reports" :icon="FlaskConical">
            <Table
              :headers="['No', 'Test', 'Date', 'Status', 'Result']"
              :items="filteredLabTests.map((t, index) => ({
                no: index + 1,
                test: t.test_name,
                date: formatDate(t.created_at),
                status: normalizeStatus(t.status),
                result: t.result || '-'
              }))"
            >
              <template #cell-status="{ value }">
                <span
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
                    value === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  ]"
                >
                  {{ value }}
                </span>
              </template>
              <template #cell-result="{ value }">
                <span :class="['font-medium', value === 'High' ? 'text-red-500' : value === 'Normal' ? 'text-emerald-500' : 'text-slate-400']">
                  {{ value }}
                </span>
              </template>
            </Table>
          </Card>
        </div>

        <div v-else-if="activeTab === 'billing'" class="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <h2 class="text-2xl font-bold text-slate-800">My Bills</h2>
          <div v-if="filteredBills.length === 0" class="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <ClipboardList class="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p class="text-slate-500 font-medium">No bills found</p>
            <p class="text-slate-400 text-sm mt-1">Your bills will appear here once consultations are completed</p>
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              v-for="(bill, idx) in filteredBills"
              :key="idx"
              class="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all"
            >
              <div class="flex justify-between items-start mb-4">
                <div>
                  <p class="text-sm text-slate-500">Bill ID: {{ bill.bill_id }}</p>
                  <p class="text-xs text-slate-400 mt-1">{{ formatDate(bill.created_at) }}</p>
                </div>
                <span
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-bold',
                    String(bill.status).toLowerCase() === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  ]"
                >
                  {{ bill.status }}
                </span>
              </div>

              <!-- Charges Breakdown -->
              <div class="space-y-2 py-4 border-y border-slate-100">
                <div v-if="bill.breakdown" class="space-y-2">
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-600">Consultation</span>
                    <span class="text-slate-700 font-semibold">₹{{ bill.breakdown.consultation || 0 }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-600">Medicines</span>
                    <span class="text-slate-700 font-semibold">₹{{ bill.breakdown.medicines || 0 }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-600">Lab Tests</span>
                    <span class="text-slate-700 font-semibold">₹{{ bill.breakdown.lab_tests || 0 }}</span>
                  </div>
                </div>
                <div v-else class="text-xs text-slate-500">{{ bill.description || 'Medical charges' }}</div>
              </div>

              <!-- Total Amount -->
              <div class="mt-4 pt-4 flex justify-between items-center border-t border-slate-100">
                <span class="text-slate-700 font-semibold">Total</span>
                <span class="text-2xl font-bold text-emerald-600">₹{{ bill.amount || 0 }}</span>
              </div>

              <div class="mt-4 text-xs text-slate-400">
                <p>Appointment ID: {{ bill.appointment_id }}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
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
