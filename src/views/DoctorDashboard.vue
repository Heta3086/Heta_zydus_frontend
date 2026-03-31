<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Sidebar from '../components/Sidebar.vue';
import Navbar from '../components/Navbar.vue';
import Card from '../components/Card.vue';
import Table from '../components/Table.vue';
import { 
  Users, 
  Calendar, 
  Check, 
  X, 
  Activity, 
  ClipboardList, 
  FlaskConical,
  Pill,
  Save,
  ArrowLeft,
  Plus,
  AlertCircle
} from 'lucide-vue-next';
import * as adminAPI from '../services/admin';

const props = defineProps<{
  userName?: string | null;
}>();

const emit = defineEmits(['logout']);
const activeTab = ref('dashboard');
const selectedPatient = ref<any>(null);
const showHistoryModal = ref(false);
const showLogoutConfirm = ref(false);
const historyPatient = ref<any>(null);
const historyRecords = ref<adminAPI.DoctorPatientHistoryItem[]>([]);
const historyLoading = ref(false);
const recentlyApprovedAppointmentIds = ref<Set<number>>(new Set());
const searchQuery = ref('');
const loading = ref(false);
const error = ref('');
const notice = ref('');
const showAddLabTestModal = ref(false);

// Real API data
const appointments = ref<any[]>([]);
const patients = ref<any[]>([]);
const doctorRequests = ref<any[]>([]);
const labReports = ref<adminAPI.LabReport[]>([]);
const quickMedicines = ref<Array<{ id: number; name: string; category: string; price: number }>>([]);
const labTestsCatalog = ref<adminAPI.LabTest[]>([]);

const newLabTest = ref({
  patient_id: 0,
  test_name: '',
  test_id: 0,
  price: 0,
});

const handleTabChange = (tab: string) => {
  activeTab.value = tab;
  selectedPatient.value = null;
  showHistoryModal.value = false;
  // Reset lab test form when leaving the laboratory tab
  if (tab !== 'laboratory') {
    showAddLabTestModal.value = false;
    newLabTest.value = { patient_id: 0, test_name: '', test_id: 0, price: 0 };
  }
  // Reset manual prescription form when leaving consultation
  if (tab !== 'consultation') {
    manualPrescription.value = {
      name: '',
      category: 'Manual',
      dosage: '1-0-1',
      duration: '5 Days',
      isOtherMedicine: false,
    };
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

const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
  notice.value = message;
  setTimeout(() => {
    notice.value = '';
  }, 2500);
};

const fetchData = async () => {
  loading.value = true;
  error.value = '';
  try {
    const [appointmentsData, patientsData, requestsData, labReportsData, pharmacyItemsData, labTestsData] = await Promise.all([
      adminAPI.getDoctorAppointments().catch(() => []),
      adminAPI.getDoctorPatients().catch(() => []),
      adminAPI.getDoctorRequests().catch(() => []),
      adminAPI.getLabReports().catch(() => []),
      adminAPI.getPharmacyItems().catch(() => []),
      adminAPI.getLabTestsCatalog().catch(() => []),
    ]);
    
    appointments.value = appointmentsData;
    patients.value = patientsData;
    doctorRequests.value = requestsData;
    labReports.value = labReportsData;
    labTestsCatalog.value = labTestsData;
    quickMedicines.value = pharmacyItemsData.map((item) => ({
      id: Number(item.item_id),
      name: String(item.medicine_name || '').trim(),
      category: 'Pharmacy',
      price: Number(item.unit_price || 0),
    })).filter((m) => m.name);
  } catch (err: any) {
    error.value = err.message || 'Failed to load data';
    console.error('Error fetching doctor dashboard data:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});

const filteredAppointments = computed(() => {
  if (!searchQuery.value) return appointments.value;
  const query = searchQuery.value.toLowerCase();
  return appointments.value.filter((a) => {
    const searchBlob = [
      a.patient?.name,
      a.patient?.phone,
      a.patient?.gender,
      a.doctor?.name,
      a.appointment_date,
      a.date,
      a.appointment_time,
      a.time,
      a.status,
      a.reason,
      a.patient_id,
      a.id,
      a.appointment_id,
    ]
      .map((v) => String(v ?? '').toLowerCase())
      .join(' ');
    return searchBlob.includes(query);
  });
});

const activeAppointments = computed(() => appointments.value.filter((a) => ['confirmed', 'in_progress'].includes(String(a.status || '').toLowerCase())));

const getLocalISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeStatusToken = (value: unknown) => {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
};

const normalizeAppointmentDate = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const yyyyMmDdMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (yyyyMmDdMatch) {
    return `${yyyyMmDdMatch[1]}-${yyyyMmDdMatch[2]}-${yyyyMmDdMatch[3]}`;
  }

  const ddMmYyyySlashMatch = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (ddMmYyyySlashMatch) {
    return `${ddMmYyyySlashMatch[3]}-${ddMmYyyySlashMatch[2]}-${ddMmYyyySlashMatch[1]}`;
  }

  const isoDate = raw.split('T')[0].split(' ')[0];
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const dmyMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(isoDate);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return getLocalISODate(parsed);
  }

  return '';
};

const todaysAppointments = computed(() => {
  const today = getLocalISODate(new Date());

  return appointments.value.filter((a) => {
    const appointmentId = Number(a?.id || a?.appointment_id || 0);
    const status = normalizeStatusToken(a.status);
    const isApprovedStatus = ['accepted', 'confirmed', 'in_progress', 'inprogress'].includes(status);
    const isTodaysScheduleStatus = ['scheduled', 'accepted', 'confirmed', 'in_progress', 'inprogress'].includes(status);
    if (!isTodaysScheduleStatus) return false;

    const normalizedDate = normalizeAppointmentDate(a.appointment_date || a.date || '');
    if (normalizedDate === today) return true;

    // UX requirement: once doctor approves from requests, surface it immediately in Today's Schedule.
    if (isApprovedStatus && appointmentId > 0 && recentlyApprovedAppointmentIds.value.has(appointmentId)) {
      return true;
    }

    return false;
  });
});

const filteredPatients = computed(() => {
  if (!searchQuery.value) return patients.value;
  const query = searchQuery.value.toLowerCase();
  return patients.value.filter((p) => {
    const searchBlob = [p.name, p.phone, p.gender, p.blood_type, p.id, p.patient_id]
      .map((v) => String(v ?? '').toLowerCase())
      .join(' ');
    return searchBlob.includes(query);
  });
});

const filteredMedicines = computed(() => {
  if (!searchQuery.value) return quickMedicines.value;
  const query = searchQuery.value.toLowerCase();
  return quickMedicines.value.filter(m => 
    m.name.toLowerCase().includes(query) || 
    m.category.toLowerCase().includes(query)
  );
});

const doctorPatientIds = computed(() => {
  const ids = new Set<number>();

  appointments.value.forEach((a) => {
    const id = Number(a?.patient_id);
    if (Number.isFinite(id) && id > 0) ids.add(id);
  });

  patients.value.forEach((p: any) => {
    const id = Number(p?.id || p?.patient_id);
    if (Number.isFinite(id) && id > 0) ids.add(id);
  });

  return ids;
});

const filteredLabReports = computed(() => {
  const ownedReports = labReports.value.filter((r) => doctorPatientIds.value.has(Number(r.patient_id)));
  if (!searchQuery.value) return ownedReports;

  const query = searchQuery.value.toLowerCase();
  return ownedReports.filter((r) => {
    const searchBlob = [r.patient_name, r.patient_id, r.test_name, r.status, r.result, r.created_at, r.appointment_id]
      .map((v) => String(v ?? '').toLowerCase())
      .join(' ');
    return searchBlob.includes(query);
  });
});

const labPatientOptions = computed(() => {
  const byId = new Map<number, string>();

  appointments.value.forEach((a) => {
    const id = Number(a?.patient_id);
    const name = String(a?.patient?.name || '').trim();
    if (id > 0 && name) byId.set(id, name);
  });

  patients.value.forEach((p: any) => {
    const id = Number(p?.id || p?.patient_id);
    const name = String(p?.name || '').trim();
    if (id > 0 && name && !byId.has(id)) byId.set(id, name);
  });

  return Array.from(byId.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

// Bill calculation for consultation
const billSummary = computed(() => {
  const consultationFee = Number(consultationForm.value.consultation_fee || 500);
  
  // Calculate medicine charges
  const medicineCharges = consultationForm.value.prescription.reduce((total, med) => {
    const medicine = quickMedicines.value.find(m => m.id === med.id || m.name === med.name);
    return total + (medicine?.price || 0);
  }, 0);
  
  // Lab test charges (if any are added)
  const labTestCharge = newLabTest.value.price || 0;
  
  return {
    consultation: consultationFee,
    medicines: medicineCharges,
    labTests: labTestCharge,
    total: consultationFee + medicineCharges + labTestCharge,
  };
});

const selectedLabPatientDetails = computed(() => {
  const patientId = Number(newLabTest.value.patient_id || 0);
  if (!patientId) return null;

  const fromPatients = patients.value.find((p: any) => Number(p?.id || p?.patient_id) === patientId);
  const fromAppointments = appointments.value.find((a: any) => Number(a?.patient_id) === patientId)?.patient;

  return {
    blood_type: String(fromPatients?.blood_type || fromAppointments?.blood_type || '').trim(),
    gender: String(fromPatients?.gender || fromAppointments?.gender || '').trim(),
    phone: String(fromPatients?.phone || fromAppointments?.phone || '').trim(),
  };
});

const addLabTest = async () => {
  if (!newLabTest.value.patient_id || !newLabTest.value.test_name.trim()) {
    showNotice('Please select patient and test name', 'error');
    return;
  }

  const selectedPatientId = Number(newLabTest.value.patient_id);
  const matchingAppointment = appointments.value.find((a) => Number(a?.patient_id) === selectedPatientId);
  const appointmentId = Number(matchingAppointment?.id || matchingAppointment?.appointment_id || 0);

  try {
    await adminAPI.createLabReport({
      patient_id: selectedPatientId,
      appointment_id: appointmentId > 0 ? appointmentId : undefined,
      test_name: newLabTest.value.test_name.trim(),
    });

    showNotice('Lab test ordered successfully', 'success');
    showAddLabTestModal.value = false;
    newLabTest.value = { patient_id: 0, test_name: '', test_id: 0, price: 0 };
    activeTab.value = 'laboratory';
    await fetchData();
  } catch (err: any) {
    showNotice(err.message || 'Failed to create lab test', 'error');
  }
};

const selectLabTest = (test: adminAPI.LabTest) => {
  newLabTest.value.test_name = test.name;
  newLabTest.value.test_id = test.test_id;
  newLabTest.value.price = test.price;
};

const startConsultation = async (patient: any) => {
  const appointment = patient?._original || patient;
  const patientInfo = getPatientDetailsById(Number(appointment?.patient_id));

  let fallbackPatient: any = null;
  if (!patientInfo && appointment?.patient_id) {
    try {
      fallbackPatient = await adminAPI.getPatientById(Number(appointment.patient_id));
    } catch {
      fallbackPatient = null;
    }
  }

  selectedPatient.value = {
    ...appointment,
    patient: {
      ...(appointment?.patient || {}),
      ...(patientInfo || {}),
      ...(fallbackPatient || {}),
      name: patientInfo?.name || fallbackPatient?.name || appointment?.patient?.name || appointment?.name || 'Unknown',
      phone: patientInfo?.phone || fallbackPatient?.phone || appointment?.patient?.phone || appointment?.phone || '',
      gender: patientInfo?.gender || fallbackPatient?.gender || appointment?.patient?.gender || appointment?.gender || '',
    },
  };

  // Pre-fill symptoms with appointment reason
  if (appointment?.reason) {
    consultationForm.value.symptoms = appointment.reason;
  }

  activeTab.value = 'consultation';
};

const viewHistory = (patient: any) => {
  const patientId = Number(patient?.id || patient?.patient_id || 0);
  if (!patientId) {
    showNotice('Patient details not available', 'error');
    return;
  }

  showHistoryModal.value = true;
  historyLoading.value = true;
  historyPatient.value = patient;
  historyRecords.value = [];

  adminAPI
    .getDoctorPatientHistory(patientId)
    .then((data) => {
      historyPatient.value = { ...patient, ...(data.patient || {}) };
      historyRecords.value = data.history || [];
    })
    .catch((err: any) => {
      showNotice(err?.message || 'Failed to load patient history', 'error');
    })
    .finally(() => {
      historyLoading.value = false;
    });
};

const handleRequest = async (id: number, action: 'Accepted' | 'Rejected') => {
  try {
    if (action === 'Accepted') {
      await adminAPI.acceptAppointment(id);
      recentlyApprovedAppointmentIds.value.add(id);
      showNotice('Appointment accepted. Moved to My Appointments.', 'success');
      activeTab.value = 'appointments';
    } else {
      await adminAPI.rejectAppointment(id);
      showNotice('Appointment rejected successfully!', 'success');
    }
    await fetchData();
  } catch (err: any) {
    showNotice(err.message || `Failed to ${action.toLowerCase()} appointment`, 'error');
  }
};

const consultationForm = ref({
  symptoms: '',
  diagnosis: '',
  treatment: '',
  consultation_fee: 500,
  prescription: [] as any[]
});

const manualPrescription = ref({
  name: '',
  category: 'Manual',
  dosage: '1-0-1',
  duration: '5 Days',
  isOtherMedicine: false,
});

const dosageOptions = ref([
  '1-0-1',
  '1-0-0',
  '0-0-1',
  '1-1-1',
  '1-1-0',
  '0-1-1',
  '2-0-1',
  '1-0-2',
  'As needed',
  'Once daily',
  'Twice daily',
  'Thrice daily',
]);

const durationOptions = ref([
  '3 Days',
  '5 Days',
  '7 Days',
  '10 Days',
  '14 Days',
  '15 Days',
  '21 Days',
  '30 Days',
  '45 Days',
  '60 Days',
  'Lifelong',
]);

const getPatientDetailsById = (patientId: number) => {
  return patients.value.find((p: any) => Number(p.id) === Number(patientId)) || null;
};

const addMedicine = (med: any) => {
  consultationForm.value.prescription.push({ ...med, dosage: '1-0-1', duration: '5 Days' });
};

const addManualPrescription = () => {
  if (!manualPrescription.value.name.trim()) {
    showNotice('Please select or enter medicine name', 'error');
    return;
  }

  consultationForm.value.prescription.push({
    id: `manual-${Date.now()}`,
    name: manualPrescription.value.name.trim(),
    category: manualPrescription.value.category.trim() || 'Manual',
    dosage: manualPrescription.value.dosage.trim() || '1-0-1',
    duration: manualPrescription.value.duration.trim() || '5 Days',
  });

  manualPrescription.value = {
    name: '',
    category: 'Manual',
    dosage: '1-0-1',
    duration: '5 Days',
    isOtherMedicine: false,
  };
};

const saveConsultation = async () => {
  const appointmentId = Number(selectedPatient.value?.id || selectedPatient.value?.appointment_id || 0);
  if (!appointmentId) {
    showNotice('No appointment selected for consultation', 'error');
    return;
  }

  if (!consultationForm.value.symptoms.trim()) {
    showNotice('Please fill symptoms before saving consultation', 'error');
    return;
  }
  if (!consultationForm.value.diagnosis.trim()) {
    showNotice('Please fill diagnosis before saving consultation', 'error');
    return;
  }
  if (!consultationForm.value.treatment.trim()) {
    showNotice('Please fill treatment plan before saving consultation', 'error');
    return;
  }
  if (!consultationForm.value.prescription.length) {
    showNotice('Please add at least one medicine before saving consultation', 'error');
    return;
  }

  try {
    await adminAPI.completeAppointment(appointmentId, {
      diagnosis: consultationForm.value.diagnosis.trim(),
      symptoms: consultationForm.value.symptoms.trim(),
      treatment: consultationForm.value.treatment.trim(),
      doctor_notes: consultationForm.value.treatment || consultationForm.value.symptoms || 'Consultation completed',
      prescription: consultationForm.value.prescription || [],
    });

    showNotice('Consultation saved. Patient moved to My Patients.', 'success');
    consultationForm.value = {
      symptoms: '',
      diagnosis: '',
      treatment: '',
      consultation_fee: 500,
      prescription: [],
    };
    manualPrescription.value = {
      name: '',
      category: 'Manual',
      dosage: '1-0-1',
      duration: '5 Days',
      isOtherMedicine: false,
    };
    newLabTest.value = { patient_id: 0, test_name: '', test_id: 0, price: 0 };
    selectedPatient.value = null;
    activeTab.value = 'patients';
    await fetchData();
  } catch (err: any) {
    showNotice(err.message || 'Failed to save consultation', 'error');
  }
};
</script>

<template>
  <div class="flex min-h-screen bg-slate-50">
    <Sidebar role="doctor" :activeTab="activeTab" @change-tab="handleTabChange" @logout="handleLogoutClick" />
    
    <div class="flex-1 flex flex-col min-w-0">
      <Navbar role="doctor" :activeTab="activeTab" @search="handleSearch" />
      
      <!-- Notification Banner -->
      <div v-if="notice" class="fixed top-4 right-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in duration-300">
        {{ notice }}
      </div>

      <!-- Error Banner -->
      <div v-if="error" class="bg-red-50 border-l-4 border-red-500 p-4 m-4">
        <div class="flex">
          <AlertCircle class="w-5 h-5 text-red-500 mr-3" />
          <div>
            <p class="text-red-700 font-bold">Error</p>
            <p class="text-red-600 text-sm">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center h-screen">
        <div class="text-center">
          <div class="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p class="text-slate-600 font-semibold">Loading doctor dashboard...</p>
        </div>
      </div>
      
      <main v-else class="p-8 overflow-y-auto">
        <!-- Dashboard Tab -->
        <div v-if="activeTab === 'dashboard'" class="space-y-8 animate-in fade-in duration-500">
          <div class="bg-gradient-to-r from-sky-600 to-sky-400 p-8 rounded-3xl text-white shadow-xl shadow-sky-500/20">
            <h2 class="text-3xl font-bold tracking-tight">Welcome{{ props.userName ? ` ${props.userName}` : '' }}!</h2>
            <p class="text-white/80 mt-2 max-w-md">Manage patient appointments and consultations efficiently.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                  <Calendar class="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p class="text-slate-400 text-sm font-medium">Pending Requests</p>
                  <h3 class="text-2xl font-bold text-slate-800">{{ doctorRequests.filter(a => a.status === 'scheduled').length }}</h3>
                </div>
              </div>
            </div>
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center">
                  <Users class="w-6 h-6 text-sky-600" />
                </div>
                <div>
                  <p class="text-slate-400 text-sm font-medium">Today's Patients</p>
                  <h3 class="text-2xl font-bold text-slate-800">{{ todaysAppointments.length }}</h3>
                </div>
              </div>
            </div>
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Check class="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p class="text-slate-400 text-sm font-medium">Completed</p>
                  <h3 class="text-2xl font-bold text-slate-800">{{ appointments.filter(a => a.status === 'completed').length }}</h3>
                </div>
              </div>
            </div>
          </div>

          <Card title="Today's Schedule" subtitle="Confirmed appointments for today" :icon="Calendar">
            <div v-if="todaysAppointments.length === 0" class="text-center py-8 text-slate-400">
              No appointments scheduled for today.
            </div>
            <Table 
              v-else
              :headers="['No', 'Patient', 'Date', 'Time', 'Status', 'Actions']" 
              :items="todaysAppointments.map((a, index) => ({ 
                no: index + 1,
                patient: a.patient?.name || 'Unknown', 
                date: a.appointment_date?.split('T')[0] || a.date || '',
                time: a.appointment_time || a.time || '',
                status: a.status,
                actions: '',
                _original: a
              }))"
            >
              <template #cell-status="{ value }">
                <span :class="[
                  'px-3 py-1 rounded-full text-xs font-bold',
                  value === 'confirmed' ? 'bg-amber-50 text-amber-600' :
                  value === 'in_progress' ? 'bg-sky-50 text-sky-600' :
                  value === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                ]">
                  {{ value }}
                </span>
              </template>
              <template #actions="{ item }">
                <button 
                  @click="startConsultation(item)"
                  class="bg-sky-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-sky-600 transition-all"
                >
                  Start Consultation
                </button>
              </template>
            </Table>
          </Card>
        </div>

        <!-- Requests Tab -->
        <div v-else-if="activeTab === 'requests'" class="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <h2 class="text-2xl font-bold text-slate-800">Appointment Requests</h2>
          <Card>
            <div v-if="doctorRequests.length === 0" class="text-center py-8 text-slate-400">
              No pending appointment requests.
            </div>
            <Table 
              v-else
              :headers="['No', 'Patient', 'Date', 'Time', 'Actions']" 
              :items="doctorRequests.map((a, index) => ({ 
                no: index + 1,
                patient: a.patient?.name || 'Unknown',
                date: a.appointment_date?.split('T')[0] || a.date || '',
                time: a.appointment_time || a.time || '',
                actions: '',
                _id: a.id || a.appointment_id
              }))"
            >
              <template #cell-actions="{ item }">
                <div class="flex gap-2">
                  <button 
                    @click="handleRequest(item._id, 'Accepted')"
                    class="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all"
                    title="Accept"
                  >
                    <Check class="w-4 h-4" />
                  </button>
                  <button 
                    @click="handleRequest(item._id, 'Rejected')"
                    class="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
                    title="Reject"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </div>
              </template>
            </Table>
          </Card>
        </div>

        <!-- My Appointments Tab -->
        <div v-else-if="activeTab === 'appointments'" class="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <h2 class="text-2xl font-bold text-slate-800">My Appointments</h2>
          <Card>
            <div v-if="activeAppointments.length === 0" class="text-center py-8 text-slate-400">
              No appointments scheduled.
            </div>
            <Table 
              v-else
              :headers="['No', 'Patient', 'Date', 'Time', 'Status', 'Actions']" 
              :items="activeAppointments.map((a, index) => ({ 
                no: index + 1,
                patient: a.patient?.name || 'Unknown',
                date: a.appointment_date?.split('T')[0] || a.date || '',
                time: a.appointment_time || a.time || '',
                status: a.status,
                actions: '',
                _original: a
              }))"
            >
              <template #cell-status="{ value }">
                <span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600">
                  {{ value }}
                </span>
              </template>
              <template #cell-actions="{ item }">
                <button 
                  @click="startConsultation(item._original)"
                  class="bg-sky-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-sky-600 transition-all"
                >
                  Consult
                </button>
              </template>
            </Table>
          </Card>
        </div>

        <!-- Patients Tab -->
        <div v-else-if="activeTab === 'patients'" class="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <h2 class="text-2xl font-bold text-slate-800">My Patients</h2>
          <Card>
            <div v-if="filteredPatients.length === 0" class="text-center py-8 text-slate-400">
              No patients found.
            </div>
            <Table 
              v-else
              :headers="['No', 'Name', 'Phone', 'Gender', 'Actions']" 
              :items="filteredPatients.map((p, index) => ({ 
                no: index + 1,
                name: p.name || 'Unknown',
                phone: p.phone || 'N/A',
                gender: p.gender || 'N/A',
                actions: '',
                _original: p
              }))"
            >
              <template #actions="{ item }">
                <button 
                  @click="viewHistory(item._original)"
                  class="text-sky-500 text-xs font-bold hover:underline"
                >
                  View History
                </button>
              </template>
            </Table>
          </Card>
        </div>

        <!-- Laboratory Tab -->
        <div v-else-if="activeTab === 'laboratory'" class="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold text-slate-800">Laboratory</h2>
            <button
              @click="showAddLabTestModal = true"
              class="bg-sky-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-sky-500/20 hover:bg-sky-600 transition-all"
            >
              <Plus class="w-5 h-5" />
              Order Lab Test
            </button>
          </div>

          <Card title="My Patient Lab Tests" subtitle="Lab tests requested for your patients" :icon="FlaskConical">
            <div v-if="filteredLabReports.length === 0" class="text-center py-8 text-slate-400">
              No lab reports found for your patients.
            </div>
            <Table
              v-else
              :headers="['No', 'Patient', 'Test Name', 'Status', 'Result', 'Created At']"
              :items="filteredLabReports.map((r, index) => ({ no: index + 1, patient: r.patient_name || `Patient #${r.patient_id}`, test_name: r.test_name, status: r.status || 'ordered', result: r.result || '-', created_at: (r.created_at || '').split('T')[0] || 'N/A' }))"
            >
              <template #cell-status="{ value }">
                <span
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
                    String(value).toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
                  ]"
                >
                  {{ value }}
                </span>
              </template>
            </Table>
          </Card>
        </div>

        <!-- Consultation View -->
        <div v-else-if="activeTab === 'consultation' && selectedPatient" class="space-y-8 animate-in fade-in duration-500">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <button @click="activeTab = 'dashboard'" class="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600">
                <ArrowLeft class="w-5 h-5" />
              </button>
              <div>
                <h2 class="text-2xl font-bold text-slate-800">Consultation</h2>
                <p class="text-slate-400 text-sm">Patient: {{ selectedPatient.patient?.name || selectedPatient.name || 'Unknown' }}</p>
              </div>
            </div>
            <button @click="saveConsultation" class="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all">
              <Save class="w-5 h-5" />
              Save Consultation
            </button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-8">
              <Card title="Clinical Notes" :icon="ClipboardList">
                <div class="space-y-6">
                  <div class="space-y-2">
                    <label class="text-sm font-bold text-slate-700">Symptoms</label>
                    <textarea 
                      v-model="consultationForm.symptoms"
                      rows="3" 
                      placeholder="Enter patient symptoms..."
                      class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                    ></textarea>
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-bold text-slate-700">Diagnosis</label>
                    <textarea 
                      v-model="consultationForm.diagnosis"
                      rows="3" 
                      placeholder="Enter medical diagnosis..."
                      class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                    ></textarea>
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-bold text-slate-700">Treatment Plan</label>
                    <textarea 
                      v-model="consultationForm.treatment"
                      rows="3" 
                      placeholder="Enter treatment details..."
                      class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                    ></textarea>
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-bold text-slate-700">Consultation Fee (₹)</label>
                    <input 
                      v-model.number="consultationForm.consultation_fee"
                      type="number" 
                      min="0"
                      placeholder="Default: 500"
                      class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </Card>

              <Card title="Prescription" :icon="Pill">
                <div class="space-y-4">
                  <div class="p-4 bg-sky-50 border border-sky-100 rounded-xl space-y-3">
                    <p class="text-xs font-bold uppercase tracking-wider text-sky-700">Add Manual Prescription</p>
                    <div class="space-y-3">
                      <div>
                        <label class="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 block">Medicine Name</label>
                        <select
                          v-model="manualPrescription.name"
                          @change="(e: any) => {
                            if (e.target.value === 'Others') {
                              manualPrescription.isOtherMedicine = true;
                              manualPrescription.name = '';
                            } else {
                              manualPrescription.isOtherMedicine = false;
                            }
                          }"
                          class="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                        >
                          <option value="">Select Medicine</option>
                          <option v-for="med in filteredMedicines" :key="med.id" :value="med.name">
                            {{ med.name }} (₹{{ med.price }})
                          </option>
                          <option value="Others">Others (Custom Medicine)</option>
                        </select>
                      </div>
                      <div v-if="manualPrescription.isOtherMedicine" class="animate-in fade-in duration-200">
                        <label class="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 block">Custom Medicine Name</label>
                        <input
                          v-model="manualPrescription.name"
                          type="text"
                          placeholder="Enter medicine name"
                          class="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        />
                      </div>
                      <div>
                        <label class="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 block">Dosage</label>
                        <select
                          v-model="manualPrescription.dosage"
                          class="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                        >
                          <option v-for="dose in dosageOptions" :key="dose" :value="dose">{{ dose }}</option>
                        </select>
                      </div>
                      <div>
                        <label class="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 block">Duration</label>
                        <select
                          v-model="manualPrescription.duration"
                          class="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                        >
                          <option v-for="dur in durationOptions" :key="dur" :value="dur">{{ dur }}</option>
                        </select>
                      </div>
                    </div>
                    <div class="flex justify-end">
                      <button
                        @click="addManualPrescription"
                        class="px-4 py-2 rounded-lg bg-sky-500 text-white text-sm font-bold hover:bg-sky-600"
                      >
                        Add Medicine
                      </button>
                    </div>
                  </div>

                  <div v-if="consultationForm.prescription.length === 0" class="text-center py-8 text-slate-400">
                    No medicines added yet.
                  </div>
                  <div v-else class="space-y-3">
                    <div 
                      v-for="(med, idx) in consultationForm.prescription" 
                      :key="idx"
                      class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200"
                    >
                      <div>
                        <p class="font-bold text-slate-800">{{ med.name }}</p>
                        <p class="text-xs text-slate-400">{{ med.category }}</p>
                      </div>
                      <div class="flex items-center gap-4">
                        <select v-model="med.dosage" class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20">
                          <option v-for="dose in dosageOptions" :key="dose" :value="dose">{{ dose }}</option>
                        </select>
                        <select v-model="med.duration" class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20">
                          <option v-for="dur in durationOptions" :key="dur" :value="dur">{{ dur }}</option>
                        </select>
                        <button @click="consultationForm.prescription.splice(idx, 1)" class="text-red-500 hover:text-red-700"><X class="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div class="space-y-8">
              <Card title="Patient Info" :icon="Activity">
                <div class="space-y-4">
                  <div class="flex justify-between py-2 border-b border-slate-50">
                    <span class="text-slate-400 text-sm">Name</span>
                    <span class="font-bold text-slate-700">{{ selectedPatient.patient?.name || selectedPatient.name || 'Unknown' }}</span>
                  </div>
                  <div class="flex justify-between py-2 border-b border-slate-50">
                    <span class="text-slate-400 text-sm">Phone</span>
                    <span class="font-bold text-slate-700">{{ selectedPatient.patient?.phone || selectedPatient.phone || 'N/A' }}</span>
                  </div>
                  <div class="flex justify-between py-2">
                    <span class="text-slate-400 text-sm">Gender</span>
                    <span class="font-bold text-slate-700">{{ selectedPatient.patient?.gender || selectedPatient.gender || 'N/A' }}</span>
                  </div>
                  <div class="flex justify-between py-2 border-b border-slate-50">
                    <span class="text-slate-400 text-sm">Blood Group</span>
                    <span class="font-bold text-slate-700">{{ selectedPatient.patient?.blood_type || selectedPatient.blood_type || 'N/A' }}</span>
                  </div>
                  <div class="flex justify-between py-2 border-b border-slate-50">
                    <span class="text-slate-400 text-sm">Appointment Date</span>
                    <span class="font-bold text-slate-700">{{ selectedPatient.appointment_date?.split('T')[0] || selectedPatient.date || 'N/A' }}</span>
                  </div>
                  <div class="flex justify-between py-2">
                    <span class="text-slate-400 text-sm">Appointment Time</span>
                    <span class="font-bold text-slate-700">{{ selectedPatient.appointment_time || selectedPatient.time || 'N/A' }}</span>
                  </div>
                </div>
              </Card>

              <Card title="Quick Add Medicine" :icon="Pill">
                <div v-if="!filteredMedicines.length" class="text-sm text-slate-500 py-3">No pharmacy medicines available.</div>
                <div v-else class="space-y-2 max-h-80 overflow-y-auto pr-2">
                  <button 
                    v-for="med in filteredMedicines" 
                    :key="med.id"
                    @click="addMedicine(med)"
                    class="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all text-left group"
                  >
                    <div>
                      <p class="text-sm font-bold text-slate-700">{{ med.name }}</p>
                      <p class="text-xs text-slate-400">{{ med.category }}</p>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="text-sm font-bold text-emerald-600">₹{{ med.price }}</span>
                      <Plus class="w-4 h-4 text-slate-300 group-hover:text-sky-500" />
                    </div>
                  </button>
                </div>
              </Card>

              <Card title="Bill Summary" :icon="ClipboardList">
                <div class="space-y-3">
                  <div class="flex justify-between items-center p-3 bg-sky-50 rounded-lg">
                    <span class="text-sm font-semibold text-slate-700">Consultation Fee</span>
                    <span class="text-sm font-bold text-sky-600">₹{{ billSummary.consultation }}</span>
                  </div>
                  <div class="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                    <span class="text-sm font-semibold text-slate-700">Medicine Charges</span>
                    <span class="text-sm font-bold text-emerald-600">₹{{ billSummary.medicines }}</span>
                  </div>
                  <div v-if="billSummary.labTests > 0" class="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span class="text-sm font-semibold text-slate-700">Lab Test Charges</span>
                    <span class="text-sm font-bold text-purple-600">₹{{ billSummary.labTests }}</span>
                  </div>
                  <div class="border-t-2 border-slate-200 pt-3 flex justify-between items-center">
                    <span class="text-lg font-bold text-slate-800">Total Bill</span>
                    <span class="text-2xl font-bold text-emerald-600">₹{{ billSummary.total }}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>

    <div v-if="showAddLabTestModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-slate-800">Order Lab Test</h3>
          <button @click="showAddLabTestModal = false" class="text-slate-400 hover:text-slate-600"><X class="w-6 h-6" /></button>
        </div>
        <form @submit.prevent="addLabTest" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Patient</label>
            <select v-model.number="newLabTest.patient_id" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none" required>
              <option :value="0" disabled>Select Patient</option>
              <option v-for="p in labPatientOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Select Lab Test</label>
            <div v-if="labTestsCatalog.length === 0" class="text-sm text-slate-500 py-3">No lab tests available.</div>
            <div v-else class="space-y-2 bg-slate-50 rounded-xl p-3 max-h-60 overflow-y-auto">
              <button
                v-for="test in labTestsCatalog"
                :key="test.test_id"
                type="button"
                @click="selectLabTest(test)"
                :class="[
                  'w-full text-left p-3 rounded-lg transition-all',
                  newLabTest.test_id === test.test_id
                    ? 'bg-sky-500 text-white border border-sky-600'
                    : 'bg-white border border-slate-200 hover:border-sky-300 text-slate-700'
                ]"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-bold text-sm">{{ test.name }}</p>
                    <p class="text-xs" :class="newLabTest.test_id === test.test_id ? 'text-sky-100' : 'text-slate-500'">{{ test.category }}</p>
                  </div>
                  <span class="font-bold text-sm">₹{{ test.price }}</span>
                </div>
              </button>
            </div>
          </div>
          <div v-if="newLabTest.price > 0" class="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <div class="flex justify-between items-center">
              <span class="text-sm font-semibold text-slate-700">Test Price:</span>
              <span class="text-lg font-bold text-emerald-600">₹{{ newLabTest.price }}</span>
            </div>
          </div>
          <div v-if="selectedLabPatientDetails" class="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Blood Group</p>
              <p class="text-sm font-semibold text-slate-700">{{ selectedLabPatientDetails.blood_type || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gender</p>
              <p class="text-sm font-semibold text-slate-700">{{ selectedLabPatientDetails.gender || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</p>
              <p class="text-sm font-semibold text-slate-700">{{ selectedLabPatientDetails.phone || 'N/A' }}</p>
            </div>
          </div>
          <button type="submit" class="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none" :disabled="!newLabTest.test_id">Order Lab Test</button>
        </form>
      </div>
    </div>

    <!-- History Modal -->
    <div v-if="showHistoryModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-3xl p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-slate-800">Medical History: {{ historyPatient?.name || 'Unknown' }}</h3>
          <button @click="showHistoryModal = false" class="text-slate-400 hover:text-slate-600"><X class="w-6 h-6" /></button>
        </div>
        <div class="space-y-6">
          <div v-if="historyLoading" class="text-center py-8 text-slate-400">Loading history...</div>
          <div v-else-if="historyPatient" class="p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <div class="flex justify-between items-start mb-4">
              <div>
                <p class="text-xs text-sky-500 font-bold uppercase tracking-widest">Patient: {{ historyPatient.name }}</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-6">
              <div>
                <p class="text-[10px] text-slate-400 uppercase font-bold mb-1">Phone</p>
                <p class="text-sm text-slate-600">{{ historyPatient.phone || 'N/A' }}</p>
              </div>
              <div>
                <p class="text-[10px] text-slate-400 uppercase font-bold mb-1">Gender</p>
                <p class="text-sm text-slate-600">{{ historyPatient.gender || 'N/A' }}</p>
              </div>
              <div>
                <p class="text-[10px] text-slate-400 uppercase font-bold mb-1">Blood Group</p>
                <p class="text-sm text-slate-600">{{ historyPatient.blood_type || 'N/A' }}</p>
              </div>
            </div>

            <div class="mt-6 space-y-4">
              <h4 class="text-sm font-bold text-slate-700">Consultation History</h4>
              <div v-if="historyRecords.length === 0" class="text-sm text-slate-500">No completed consultation history found.</div>
              <div
                v-for="record in historyRecords"
                :key="record.appointment_id"
                class="p-4 bg-white rounded-xl border border-slate-200 space-y-3"
              >
                <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <p class="text-xs text-slate-500">{{ record.appointment_date || 'N/A' }} at {{ record.appointment_time || '-' }}</p>
                    <p class="text-xs text-slate-400 mt-1">Appointment ID: {{ record.appointment_id }}</p>
                  </div>
                  <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">{{ record.status || 'completed' }}</span>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p class="text-[11px] text-slate-400 uppercase font-bold mb-2">Symptoms</p>
                    <p class="text-sm text-slate-700 bg-slate-50 p-2 rounded">{{ record.symptoms || 'N/A' }}</p>
                  </div>
                  <div>
                    <p class="text-[11px] text-slate-400 uppercase font-bold mb-2">Diagnosis</p>
                    <p class="text-sm text-slate-700 bg-slate-50 p-2 rounded">{{ record.diagnosis || 'N/A' }}</p>
                  </div>
                  <div>
                    <p class="text-[11px] text-slate-400 uppercase font-bold mb-2">Treatment Plan</p>
                    <p class="text-sm text-slate-700 bg-slate-50 p-2 rounded">{{ record.treatment || 'N/A' }}</p>
                  </div>
                </div>

                <div>
                  <p class="text-[11px] text-slate-400 uppercase font-bold mb-2">Doctor Notes</p>
                  <p class="text-sm text-slate-700 bg-slate-50 p-2 rounded">{{ record.doctor_notes || 'No additional notes' }}</p>
                </div>

                <div>
                  <p class="text-[11px] text-slate-400 uppercase font-bold mb-2">Prescription</p>
                  <div v-if="!record.prescription || record.prescription.length === 0" class="text-sm text-slate-500 p-3 bg-slate-50 rounded">No medicines prescribed.</div>
                  <div v-else class="space-y-2">
                    <div
                      v-for="(medicine, idx) in record.prescription"
                      :key="`${record.appointment_id}-${idx}`"
                      class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2"
                    >
                      <div class="flex items-start justify-between">
                        <div>
                          <p class="font-semibold text-slate-800">{{ medicine.name || 'Medicine' }}</p>
                          <p class="text-xs text-slate-500">{{ medicine.category || 'N/A' }}</p>
                        </div>
                      </div>
                      <div class="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p class="text-slate-500 font-semibold">Dosage:</p>
                          <p class="text-slate-700">{{ medicine.dosage || '-' }}</p>
                        </div>
                        <div>
                          <p class="text-slate-500 font-semibold">Duration:</p>
                          <p class="text-slate-700">{{ medicine.duration || '-' }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-8 flex justify-end">
          <button @click="showHistoryModal = false" class="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">Close History</button>
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
