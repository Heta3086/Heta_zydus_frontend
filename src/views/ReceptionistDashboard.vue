<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Sidebar from '../components/Sidebar.vue';
import Navbar from '../components/Navbar.vue';
import Card from '../components/Card.vue';
import Table from '../components/Table.vue';
import { Users, UserRound, AlertCircle, Calendar, Trash2, Eye, EyeOff } from 'lucide-vue-next';
import * as adminAPI from '../services/admin';

const props = defineProps<{
  userName?: string | null;
}>();

const emit = defineEmits(['logout']);
const activeTab = ref('all-patients');
const searchQuery = ref('');
const loading = ref(false);
const error = ref('');
const notice = ref('');
const showLogoutConfirm = ref(false);

const patients = ref<adminAPI.Patient[]>([]);
const doctors = ref<adminAPI.Doctor[]>([]);
const departments = ref<adminAPI.Department[]>([]);
const rejectedAppointments = ref<adminAPI.Appointment[]>([]);
const rescheduleTarget = ref<adminAPI.Appointment | null>(null);
const rescheduleForm = ref({
  appointment_date: '',
  appointment_time: '',
  reason: '',
});

const patientForm = ref({
  name: '',
  email: '',
  password: '',
  phone: '',
  gender: '',
  blood_type: '',
  address: '',
  department_id: 0,
  doctor_id: 0,
  appointment_date: '',
  appointment_time: '',
  reason: '',
});

const showPassword = ref(false);

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

const showNotice = (message: string) => {
  notice.value = message;
  setTimeout(() => {
    notice.value = '';
  }, 2500);
};

const normalizePhone = (value: string) => value.replace(/\D/g, '').trim();
const onPhoneInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  patientForm.value.phone = normalizePhone(target.value).slice(0, 10);
};

const loadData = async () => {
  loading.value = true;
  error.value = '';
  try {
    const [patientsData, doctorsData, departmentsData, rejectedData] = await Promise.all([
      adminAPI.getPatients(),
      adminAPI.getDoctors(),
      adminAPI.getDepartments(),
      adminAPI.getReceptionistRejectedAppointments(),
    ]);

    patients.value = patientsData;
    doctors.value = doctorsData;
    departments.value = departmentsData;
    rejectedAppointments.value = rejectedData;
  } catch (err: any) {
    error.value = err.message || 'Failed to load receptionist data';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});

const filteredPatients = computed(() => {
  if (!searchQuery.value) return patients.value;
  const query = searchQuery.value.toLowerCase();
  return patients.value.filter(
    (p) => p.name.toLowerCase().includes(query) || p.phone.toLowerCase().includes(query) || p.gender.toLowerCase().includes(query) || String(p.blood_type || '').toLowerCase().includes(query),
  );
});

const filteredDoctors = computed(() => {
  if (!patientForm.value.department_id) return doctors.value;
  return doctors.value.filter((doc) => doc.department_id === patientForm.value.department_id);
});

const filteredRejectedAppointments = computed(() => {
  if (!searchQuery.value) return rejectedAppointments.value;
  const query = searchQuery.value.toLowerCase();
  return rejectedAppointments.value.filter((a: any) => {
    const patientName = (a.patient?.name || '').toLowerCase();
    const doctorName = (a.doctor?.name || '').toLowerCase();
    const reason = (a.reason || '').toLowerCase();
    return patientName.includes(query) || doctorName.includes(query) || reason.includes(query);
  });
});

const minDate = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split('T')[0];
});

const addPatient = async () => {
  if (
    !patientForm.value.name ||
    !patientForm.value.email ||
    !patientForm.value.password ||
    !patientForm.value.phone ||
    !patientForm.value.gender ||
    !patientForm.value.blood_type ||
    !patientForm.value.address ||
    !patientForm.value.department_id ||
    !patientForm.value.doctor_id ||
    !patientForm.value.appointment_date ||
    !patientForm.value.appointment_time ||
    !patientForm.value.reason
  ) {
    showNotice('Please fill all details before adding patient');
    return;
  }

  const normalizedPhone = normalizePhone(patientForm.value.phone);
  if (!/^\d{10}$/.test(normalizedPhone)) {
    showNotice('Phone number must be exactly 10 digits');
    return;
  }

  const duplicatePhone = patients.value.some((p) => normalizePhone(String(p.phone || '')) === normalizedPhone);
  if (duplicatePhone) {
    showNotice('This phone number already exists');
    return;
  }

  try {
    await adminAPI.createPatient({
      name: patientForm.value.name,
      email: patientForm.value.email,
      password: patientForm.value.password,
      phone: patientForm.value.phone,
      gender: patientForm.value.gender,
      blood_type: patientForm.value.blood_type,
      address: patientForm.value.address,
      department_id: patientForm.value.department_id,
      doctor_id: patientForm.value.doctor_id,
      appointment_date: patientForm.value.appointment_date,
      appointment_time: patientForm.value.appointment_time,
      reason: patientForm.value.reason,
    });

    showNotice('Patient registered successfully and assigned to doctor');
    patientForm.value = {
      name: '',
      email: '',
      password: '',
      phone: '',
      gender: '',
      blood_type: '',
      address: '',
      department_id: 0,
      doctor_id: 0,
      appointment_date: '',
      appointment_time: '',
      reason: '',
    };
    activeTab.value = 'all-patients';
    await loadData();
  } catch (err: any) {
    error.value = err.message || 'Failed to add patient';
  }
};

const openRescheduleModal = (appointment: adminAPI.Appointment) => {
  rescheduleTarget.value = appointment;
  rescheduleForm.value = {
    appointment_date: appointment.appointment_date ? appointment.appointment_date.split('T')[0] : '',
    appointment_time: appointment.appointment_time || '',
    reason: appointment.reason || 'Rescheduled by receptionist',
  };
};

const closeRescheduleModal = () => {
  rescheduleTarget.value = null;
};

const submitReschedule = async () => {
  if (!rescheduleTarget.value) return;
  if (!rescheduleForm.value.appointment_date || !rescheduleForm.value.appointment_time) {
    showNotice('Please select date and time');
    return;
  }

  try {
    await adminAPI.rescheduleAppointment(rescheduleTarget.value.id, {
      appointment_date: rescheduleForm.value.appointment_date,
      appointment_time: rescheduleForm.value.appointment_time,
      reason: rescheduleForm.value.reason,
    });
    showNotice('Appointment rescheduled and sent to doctor');
    closeRescheduleModal();
    await loadData();
  } catch (err: any) {
    error.value = err.message || 'Failed to reschedule appointment';
  }
};

const deleteRejected = async (appointment: adminAPI.Appointment) => {
  try {
    await adminAPI.deleteCancelledAppointment(appointment.id);
    showNotice('Rejected appointment deleted');
    await loadData();
  } catch (err: any) {
    error.value = err.message || 'Failed to delete rejected appointment';
  }
};
</script>

<template>
  <div class="flex min-h-screen bg-slate-50">
    <Sidebar role="receptionist" :activeTab="activeTab" @change-tab="handleTabChange" @logout="handleLogoutClick" />

    <div class="flex-1 flex flex-col min-w-0">
      <Navbar role="receptionist" :activeTab="activeTab" @search="handleSearch" />

      <main class="p-8 overflow-y-auto space-y-6">
        <div class="bg-gradient-to-r from-sky-600 to-sky-400 p-8 rounded-3xl text-white shadow-xl shadow-sky-500/20 mb-6">
          <h2 class="text-3xl font-bold tracking-tight">Welcome{{ props.userName ? ` ${props.userName}` : '' }}!</h2>
          <p class="text-white/80 mt-2 max-w-md">Manage patient registrations and appointments.</p>
        </div>

        <div v-if="notice" class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-medium">
          {{ notice }}
        </div>

        <div v-if="error" class="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle class="w-5 h-5 text-red-600" />
          <p class="text-red-700">{{ error }}</p>
        </div>

        <div v-if="loading" class="text-center py-10 text-slate-500">Loading...</div>

        <div v-else-if="activeTab === 'all-patients'" class="space-y-6">
          <h2 class="text-2xl font-bold text-slate-800">All Patients</h2>
          <Card title="Patient List" subtitle="All registered patients" :icon="Users">
            <Table
              :headers="['No', 'Name', 'Phone', 'Gender', 'Blood Group']"
              :items="filteredPatients.map((p, index) => ({ no: index + 1, name: p.name || 'Unknown', phone: p.phone || 'N/A', gender: p.gender || 'N/A', blood_type: p.blood_type || 'N/A' }))"
            />
          </Card>
        </div>

        <div v-else-if="activeTab === 'add-patient'" class="space-y-6">
          <h2 class="text-2xl font-bold text-slate-800">Add Patient</h2>
          <Card title="Patient Registration" subtitle="Create patient and assign doctor" :icon="UserRound">
            <form @submit.prevent="addPatient" class="space-y-4 max-w-3xl">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input v-model="patientForm.name" type="text" placeholder="Patient Name" class="p-3 bg-slate-50 border border-slate-200 rounded-xl" required />
                <input v-model="patientForm.email" type="email" placeholder="Patient Email" class="p-3 bg-slate-50 border border-slate-200 rounded-xl" required />
                <div class="relative">
                  <input v-model="patientForm.password" :type="showPassword ? 'text' : 'password'" placeholder="Patient Password" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl pr-10" required />
                  <button type="button" @click="showPassword = !showPassword" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <Eye v-if="showPassword" class="w-5 h-5" />
                    <EyeOff v-else class="w-5 h-5" />
                  </button>
                </div>
                <input
                  v-model="patientForm.phone"
                  type="text"
                  placeholder="Phone"
                  inputmode="numeric"
                  maxlength="10"
                  pattern="[0-9]{10}"
                  title="Phone number must be exactly 10 digits"
                  class="p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  @input="onPhoneInput"
                  required
                />
                <select v-model="patientForm.gender" class="p-3 bg-slate-50 border border-slate-200 rounded-xl" required>
                  <option value="" disabled>Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <select v-model="patientForm.blood_type" class="p-3 bg-slate-50 border border-slate-200 rounded-xl" required>
                  <option value="" disabled>Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
                <select v-model.number="patientForm.department_id" class="p-3 bg-slate-50 border border-slate-200 rounded-xl" required>
                  <option :value="0" disabled>Select Department</option>
                  <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
                </select>
                <select v-model.number="patientForm.doctor_id" class="p-3 bg-slate-50 border border-slate-200 rounded-xl" required>
                  <option :value="0" disabled>Select Doctor</option>
                  <option v-for="doc in filteredDoctors" :key="doc.id" :value="doc.id">{{ doc.name }} - {{ doc.specialization }}</option>
                </select>
                <input v-model="patientForm.appointment_date" type="date" :min="minDate" class="p-3 bg-slate-50 border border-slate-200 rounded-xl" required />
                <input v-model="patientForm.appointment_time" type="time" class="p-3 bg-slate-50 border border-slate-200 rounded-xl" required />
              </div>
              <textarea v-model="patientForm.address" rows="2" placeholder="Address" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" required></textarea>
              <textarea v-model="patientForm.reason" rows="2" placeholder="Reason" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" required></textarea>
              <button type="submit" class="px-6 py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600">Add Patient</button>
            </form>
          </Card>
        </div>

        <div v-else-if="activeTab === 'rejected-requests'" class="space-y-6">
          <h2 class="text-2xl font-bold text-slate-800">Rejected Appointment Requests</h2>
          <Card title="Rejected Requests" subtitle="Reschedule or delete rejected requests" :icon="Calendar">
            <div v-if="filteredRejectedAppointments.length === 0" class="text-center py-8 text-slate-400">
              No rejected requests found.
            </div>
            <Table
              v-else
              :headers="['No', 'Patient', 'Doctor', 'Date', 'Time', 'Reason', 'Actions']"
              :items="filteredRejectedAppointments.map((a: any, index: number) => ({
                no: index + 1,
                patient: a.patient?.name || 'Unknown',
                doctor: a.doctor?.name || 'Unknown',
                date: a.appointment_date?.split('T')[0] || '',
                time: a.appointment_time || '',
                reason: a.reason || '-',
                actions: '',
                _original: a,
              }))"
            >
              <template #actions="{ item }">
                <button
                  @click="openRescheduleModal(item._original)"
                  class="px-3 py-2 text-xs font-bold rounded-lg bg-sky-500 text-white hover:bg-sky-600"
                >
                  Reschedule
                </button>
                <button
                  @click="deleteRejected(item._original)"
                  class="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                  title="Delete rejected request"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </template>
            </Table>
          </Card>
        </div>
      </main>
    </div>

    <div v-if="rescheduleTarget" class="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
      <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
        <h3 class="text-xl font-bold text-slate-800">Reschedule Appointment</h3>
        <p class="text-sm text-slate-500">
          Patient: <span class="font-semibold text-slate-700">{{ rescheduleTarget.patient?.name || 'Unknown' }}</span>
          | Doctor: <span class="font-semibold text-slate-700">{{ rescheduleTarget.doctor?.name || 'Unknown' }}</span>
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input v-model="rescheduleForm.appointment_date" type="date" :min="minDate" class="p-3 bg-slate-50 border border-slate-200 rounded-xl" />
          <input v-model="rescheduleForm.appointment_time" type="time" class="p-3 bg-slate-50 border border-slate-200 rounded-xl" />
        </div>
        <textarea
          v-model="rescheduleForm.reason"
          rows="2"
          placeholder="Reason"
          class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
        ></textarea>
        <div class="flex items-center justify-end gap-2">
          <button @click="closeRescheduleModal" class="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
          <button @click="submitReschedule" class="px-4 py-2 rounded-lg bg-sky-500 text-white font-semibold hover:bg-sky-600">Reschedule</button>
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
