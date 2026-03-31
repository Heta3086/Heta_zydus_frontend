<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Sidebar from '../components/Sidebar.vue';
import Navbar from '../components/Navbar.vue';
import Card from '../components/Card.vue';
import Table from '../components/Table.vue';
import {
  Users,
  UserRound,
  Calendar,
  Plus,
  TrendingUp,
  Activity,
  Building2,
  Pill,
  X,
  ChevronLeft,
  ShoppingBag,
  FlaskConical,
  ClipboardList,
  Edit,
  Trash2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-vue-next';
import * as adminAPI from '../services/admin';

const props = withDefaults(
  defineProps<{
    role: string;
    userName?: string | null;
  }>(),
  {
    role: 'admin',
  },
);

const emit = defineEmits(['logout']);
const activeTab = ref('dashboard');
const showLogoutConfirm = ref(false);
const showAddDeptModal = ref(false);
const showAddDoctorModal = ref(false);
const showAddReceptionistModal = ref(false);
const showAddPharmacistModal = ref(false);
const showAddMedicalStaffModal = ref(false);
const showAddPatientModal = ref(false);
const showEditPatientModal = ref(false);
const showEditReceptionistModal = ref(false);
const showEditPharmacistModal = ref(false);
const showPassword = ref({ doctor: false, receptionist: false, pharmacist: false, patient: false });
const showEditDoctorModal = ref(false);
const showEditDeptModal = ref(false);
const editingDoctor = ref<any>(null);
const editingPatient = ref<any>(null);
const editingDepartment = ref<adminAPI.Department | null>(null);
const editingReceptionist = ref<any>(null);
const editingPharmacist = ref<any>(null);
const searchQuery = ref('');
const selectedDepartment = ref<any>(null);
const selectedMedicalStaffRole = ref<'doctor' | 'receptionist' | 'pharmacist' | null>(null);

// Real data from backend
const doctorsData = ref<adminAPI.Doctor[]>([]);
const receptionistsData = ref<adminAPI.Receptionist[]>([]);
const pharmacistsData = ref<adminAPI.Pharmacist[]>([]);
const patientsData = ref<adminAPI.Patient[]>([]);
const appointmentsData = ref<adminAPI.Appointment[]>([]);
const departmentsData = ref<adminAPI.Department[]>([]);
const departmentOverviewData = ref<adminAPI.DepartmentOverview[]>([]);
const pharmacyItemsData = ref<adminAPI.PharmacyItem[]>([]);
const labReportsData = ref<adminAPI.LabReport[]>([]);
const floorsData = ref<string[]>([]);

const newReceptionist = ref({ name: '', email: '', password: '' });
const newPharmacist = ref({ name: '', email: '', password: '' });
const newPatient = ref({ name: '', email: '', password: '', phone: '', gender: '', blood_type: '', address: '' });
const newMedicalStaff = ref({ 
  name: '', 
  email: '', 
  password: '', 
  department_id: 0, 
  specialization: '', 
  qualification: '', 
  experience_yrs: 0 
});

// Loading and error states
const loading = ref(true);
const error = ref('');
const notice = ref<{ type: 'success' | 'error'; text: string } | null>(null);

const showNotice = (type: 'success' | 'error', text: string) => {
  notice.value = { type, text };
  setTimeout(() => {
    notice.value = null;
  }, 2500);
};

// Load data from backend
const loadData = async () => {
  try {
    loading.value = true;
    error.value = '';
    const results = await Promise.allSettled([
      adminAPI.getDoctors(),
      adminAPI.getReceptionists(),
      adminAPI.getPharmacists(),
      adminAPI.getPatients(),
      adminAPI.getAppointments(),
      adminAPI.getDepartments(),
      adminAPI.getDepartmentOverview(),
      adminAPI.getPharmacyItems(),
      adminAPI.getLabReports(),
      adminAPI.getFloorNumbers(),
    ]);

    const [doctorsRes, receptionistsRes, pharmacistsRes, patientsRes, appointmentsRes, deptsRes, deptOverviewRes, pharmacyRes, labRes, floorsRes] = results;
    const failedSections: string[] = [];

    if (doctorsRes.status === 'fulfilled') doctorsData.value = doctorsRes.value;
    else failedSections.push('Doctors');

    if (receptionistsRes.status === 'fulfilled') receptionistsData.value = receptionistsRes.value;
    else failedSections.push('Receptionists');

    if (pharmacistsRes.status === 'fulfilled') pharmacistsData.value = pharmacistsRes.value;
    else failedSections.push('Pharmacists');

    if (patientsRes.status === 'fulfilled') patientsData.value = patientsRes.value;
    else failedSections.push('Patients');

    if (appointmentsRes.status === 'fulfilled') appointmentsData.value = appointmentsRes.value;
    else failedSections.push('Appointments');

    if (deptsRes.status === 'fulfilled') departmentsData.value = deptsRes.value;
    else failedSections.push('Departments');

    if (deptOverviewRes.status === 'fulfilled') departmentOverviewData.value = deptOverviewRes.value;
    else failedSections.push('Department Overview');

    if (pharmacyRes.status === 'fulfilled') pharmacyItemsData.value = pharmacyRes.value;
    else failedSections.push('Pharmacy');

    if (labRes.status === 'fulfilled') labReportsData.value = labRes.value;
    else failedSections.push('Laboratory');

    if (floorsRes.status === 'fulfilled') floorsData.value = floorsRes.value;
    else failedSections.push('Floors');

    if (failedSections.length > 0) {
      error.value = `Some sections failed to load: ${failedSections.join(', ')}`;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load data';
    console.error('Error loading data:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});

const handleSearch = (query: string) => {
  searchQuery.value = query;
};

const openEditDoctor = (doctor: adminAPI.Doctor) => {
  editingDoctor.value = {
    ...doctor,
    qualification: doctor.qualification || doctor.experience || '',
  };
  showEditDoctorModal.value = true;
};

const updateDoctor = async () => {
  if (editingDoctor.value) {
    try {
      await adminAPI.updateDoctor(editingDoctor.value.id, {
        name: editingDoctor.value.name,
        email: editingDoctor.value.email,
        department_id: Number(editingDoctor.value.department_id),
        specialization: editingDoctor.value.specialization,
        experience_yrs: Number(editingDoctor.value.experience_yrs) || 0,
        qualification: editingDoctor.value.qualification,
      });
      await loadData();
      showNotice('success', `Doctor ${editingDoctor.value.name} updated successfully`);
      showEditDoctorModal.value = false;
      editingDoctor.value = null;
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to update doctor');
    }
  }
};

const deleteDoctor = async (doctor: adminAPI.Doctor) => {
  try {
    await adminAPI.deleteDoctor(doctor.id);
    await loadData();
    showNotice('success', `Doctor ${doctor.name} deleted successfully`);
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to delete doctor');
  }
};

const deleteReceptionist = async (receptionist: adminAPI.Receptionist) => {
  try {
    await adminAPI.deleteReceptionist(receptionist.id);
    await loadData();
    showNotice('success', `Receptionist ${receptionist.name} deleted successfully`);
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to delete receptionist');
  }
};

const deletePharmacist = async (pharmacist: adminAPI.Pharmacist) => {
  try {
    await adminAPI.deletePharmacist(pharmacist.id);
    await loadData();
    showNotice('success', `Pharmacist ${pharmacist.name} deleted successfully`);
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to delete pharmacist');
  }
};

const filteredDepartments = computed(() => {
  if (!searchQuery.value) return departmentsData.value;
  const query = searchQuery.value.toLowerCase();
  return departmentsData.value.filter((d) => d.name.toLowerCase().includes(query));
});

const filteredDepartmentOverview = computed(() => {
  if (!searchQuery.value) return departmentOverviewData.value;
  const query = searchQuery.value.toLowerCase();
  return departmentOverviewData.value.filter((d) => d.name.toLowerCase().includes(query));
});

const filteredDoctors = computed(() => {
  if (!searchQuery.value) return doctorsData.value;
  const query = searchQuery.value.toLowerCase();
  return doctorsData.value.filter(
    (d) =>
      d.name.toLowerCase().includes(query) ||
      d.email.toLowerCase().includes(query) ||
      d.specialization.toLowerCase().includes(query),
  );
});

const getDepartmentName = (departmentId: number) => departmentsData.value.find((d) => d.id === departmentId)?.name || 'N/A';

const filteredPatients = computed(() => {
  if (!searchQuery.value) return patientsData.value;
  const query = searchQuery.value.toLowerCase();
  return patientsData.value.filter(
    (p) => p.name.toLowerCase().includes(query) || p.phone.toLowerCase().includes(query) || p.gender.toLowerCase().includes(query),
  );
});

const filteredAppointments = computed(() => {
  if (!searchQuery.value) return appointmentsData.value;
  const query = searchQuery.value.toLowerCase();
  return appointmentsData.value.filter(
    (a) =>
      a.patient?.name.toLowerCase().includes(query) ||
      a.doctor?.name.toLowerCase().includes(query) ||
      a.status.toLowerCase().includes(query),
  );
});

const filteredMedicines = computed(() => {
  if (!searchQuery.value) return pharmacyItemsData.value;
  const query = searchQuery.value.toLowerCase();
  return pharmacyItemsData.value.filter((m) => m.medicine_name.toLowerCase().includes(query));
});

const filteredLabTests = computed(() => {
  if (!searchQuery.value) return labReportsData.value;
  const query = searchQuery.value.toLowerCase();
  return labReportsData.value.filter(
    (t) =>
      (t.patient_name || '').toLowerCase().includes(query) ||
      t.test_name.toLowerCase().includes(query) ||
      t.status.toLowerCase().includes(query),
  );
});

const departmentDoctors = computed(() => {
  if (!selectedDepartment.value) return [];
  return doctorsData.value.filter((d) => d.department_id === selectedDepartment.value.id);
});

const patientCountByDoctor = computed<Record<number, number>>(() => {
  const patientsByDoctor = new Map<number, Set<number>>();
  const approvedStatuses = new Set(['confirmed', 'accepted', 'approved', 'in_progress', 'in progress', 'completed']);

  appointmentsData.value.forEach((appointment) => {
    const status = String(appointment.status || '').trim().toLowerCase();
    if (!approvedStatuses.has(status)) return;

    const doctorId = Number(appointment.doctor_id);
    const patientId = Number(appointment.patient_id);
    if (!Number.isFinite(doctorId) || doctorId <= 0) return;
    if (!Number.isFinite(patientId) || patientId <= 0) return;

    if (!patientsByDoctor.has(doctorId)) {
      patientsByDoctor.set(doctorId, new Set<number>());
    }
    patientsByDoctor.get(doctorId)?.add(patientId);
  });

  const counts: Record<number, number> = {};
  patientsByDoctor.forEach((patientIds, doctorId) => {
    counts[doctorId] = patientIds.size;
  });

  return counts;
});

const departmentDoctorsWithPatients = computed(() => {
  if (!selectedDepartment.value) return [];

  return doctorsData.value
    .filter((doctor) => doctor.department_id === selectedDepartment.value.id)
    .map((doctor) => ({
      ...doctor,
      total_patients: patientCountByDoctor.value[Number(doctor.id)] || 0,
    }));
});

const departmentPatients = computed(() => {
  if (!selectedDepartment.value) return [];
  // Get patients who have appointments with doctors in this department
  const deptDoctorIds = new Set(
    doctorsData.value
      .filter(d => d.department_id === selectedDepartment.value.id)
      .map(d => d.id)
  );
  return patientsData.value.filter(p => {
    return appointmentsData.value.some(
      a => a.patient_id === p.id && deptDoctorIds.has(a.doctor_id)
    );
  });
});

// Calculate real percentages based on data
const calculatePercentages = computed(() => {
  // Patient percentage: percentage of patients with appointments
  const patientsWithAppointments = new Set(appointmentsData.value.map(a => a.patient_id)).size;
  const patientPercentage = patientsData.value.length > 0 ? Math.round((patientsWithAppointments / patientsData.value.length) * 100) : 0;

  // Doctor percentage: percentage of doctors with appointments
  const doctorsWithAppointments = new Set(appointmentsData.value.map(a => a.doctor_id)).size;
  const doctorPercentage = doctorsData.value.length > 0 ? Math.round((doctorsWithAppointments / doctorsData.value.length) * 100) : 0;

  // Department percentage: percentage of departments with assignments
  const deptsWithAssignments = new Set(departmentOverviewData.value.map(d => d.id)).size;
  const departmentPercentage = departmentsData.value.length > 0 ? Math.round((deptsWithAssignments / departmentsData.value.length) * 100) : 0;

  return {
    patients: patientPercentage,
    doctors: doctorPercentage,
    departments: departmentPercentage,
  };
});

const stats = computed(() => [
  { label: 'Total Patients', value: patientsData.value.length.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', percentage: calculatePercentages.value.patients },
  { label: 'Total Doctors', value: doctorsData.value.length.toString(), icon: UserRound, color: 'text-purple-600', bg: 'bg-purple-50', percentage: calculatePercentages.value.doctors },
  { label: 'Total Departments', value: departmentsData.value.length.toString(), icon: Building2, color: 'text-green-600', bg: 'bg-green-50', percentage: calculatePercentages.value.departments },
]);

const allMedicalStaff = computed(() => {
  const staffList: Array<{
    id: string | number;
    name: string;
    email: string;
    role: 'doctor' | 'receptionist' | 'pharmacist';
    department?: string;
    specialization?: string;
    qualification?: string;
    experience_yrs?: number;
    _original?: any;
  }> = [];

  // Add doctors
  doctorsData.value.forEach((doc) => {
    staffList.push({
      id: `doctor-${doc.id}`,
      name: doc.name,
      email: doc.email || 'N/A',
      role: 'doctor',
      department: getDepartmentName(doc.department_id),
      specialization: doc.specialization || 'N/A',
      qualification: doc.qualification || 'N/A',
      experience_yrs: doc.experience_yrs || 0,
      _original: doc,
    });
  });

  // Add receptionists
  receptionistsData.value.forEach((rec) => {
    staffList.push({
      id: `receptionist-${rec.id}`,
      name: rec.name,
      email: rec.email || 'N/A',
      role: 'receptionist',
      _original: rec,
    });
  });

  // Add pharmacists
  pharmacistsData.value.forEach((pharm) => {
    staffList.push({
      id: `pharmacist-${pharm.id}`,
      name: pharm.name,
      email: pharm.email || 'N/A',
      role: 'pharmacist',
      _original: pharm,
    });
  });

  return staffList.sort((a, b) => a.name.localeCompare(b.name));
});

const handleTabChange = (tab: string) => {
  activeTab.value = tab;
  selectedDepartment.value = null;
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

const newDept = ref({ name: '', description: '', floor_number: '' });
const addDepartment = async () => {
  if (newDept.value.name && newDept.value.description) {
    try {
      await adminAPI.createDepartment({
        name: newDept.value.name,
        description: newDept.value.description,
        floor_number: newDept.value.floor_number,
      });
      await loadData();
      showNotice('success', `Department ${newDept.value.name} added successfully`);
      showAddDeptModal.value = false;
      newDept.value = { name: '', description: '', floor_number: '' };
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to add department');
    }
  }
};

const openEditDepartment = (department: adminAPI.Department) => {
  editingDepartment.value = {
    id: department.id,
    name: department.name || '',
    description: department.description || '',
    floor_number: department.floor_number || '',
  };
  showEditDeptModal.value = true;
};

const updateDepartmentDetails = async () => {
  if (!editingDepartment.value?.id) {
    return;
  }

  const name = String(editingDepartment.value.name || '').trim();
  const description = String(editingDepartment.value.description || '').trim();
  const floorNumber = String(editingDepartment.value.floor_number || '').trim();

  if (!name || !description || !floorNumber) {
    showNotice('error', 'Please fill department name, description, and floor number');
    return;
  }

  try {
    await adminAPI.updateDepartment(editingDepartment.value.id, {
      name,
      description,
      floor_number: floorNumber,
    });

    await loadData();

    const refreshedDepartment = departmentsData.value.find((d) => d.id === editingDepartment.value?.id);
    if (refreshedDepartment) {
      selectedDepartment.value = refreshedDepartment;
    } else if (selectedDepartment.value?.id === editingDepartment.value.id) {
      selectedDepartment.value = {
        ...selectedDepartment.value,
        name,
        description,
        floor_number: floorNumber,
      };
    }

    showNotice('success', `Department ${name} updated successfully`);
    showEditDeptModal.value = false;
    editingDepartment.value = null;
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to update department');
  }
};

const newDoctor = ref({ name: '', email: '', password: '', department_id: 0, specialization: '', qualification: '', experience_yrs: 0 });
const addDoctor = async () => {
  if (newDoctor.value.name && newDoctor.value.department_id && newDoctor.value.password) {
    try {
      await adminAPI.createDoctor({
        name: newDoctor.value.name,
        email: newDoctor.value.email,
        password: newDoctor.value.password,
        department_id: newDoctor.value.department_id,
        specialization: newDoctor.value.specialization,
        qualification: newDoctor.value.qualification,
        experience_yrs: Number(newDoctor.value.experience_yrs) || 0,
      });
      await loadData();
      localStorage.setItem(
        'heta_last_created_user_login',
        JSON.stringify({
          email: newDoctor.value.email,
          password: newDoctor.value.password,
          role: 'doctor',
        }),
      );
      showNotice('success', `Doctor ${newDoctor.value.name} added successfully`);
      showAddDoctorModal.value = false;
      newDoctor.value = { name: '', email: '', password: '', department_id: 0, specialization: '', qualification: '', experience_yrs: 0 };
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to add doctor');
    }
  }
};

const addReceptionist = async () => {
  if (!newReceptionist.value.name || !newReceptionist.value.email || !newReceptionist.value.password) {
    showNotice('error', 'Please fill all receptionist details');
    return;
  }

  try {
    await adminAPI.createReceptionist({
      name: newReceptionist.value.name,
      email: newReceptionist.value.email,
      password: newReceptionist.value.password,
    });
    localStorage.setItem(
      'heta_last_created_user_login',
      JSON.stringify({
        email: newReceptionist.value.email,
        password: newReceptionist.value.password,
        role: 'receptionist',
      }),
    );
    showNotice('success', `Receptionist ${newReceptionist.value.name} created successfully`);
    showAddReceptionistModal.value = false;
    newReceptionist.value = { name: '', email: '', password: '' };
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to create receptionist');
  }
};

const addPharmacist = async () => {
  if (!newPharmacist.value.name || !newPharmacist.value.email || !newPharmacist.value.password) {
    showNotice('error', 'Please fill all pharmacist details');
    return;
  }

  try {
    await adminAPI.createPharmacist({
      name: newPharmacist.value.name,
      email: newPharmacist.value.email,
      password: newPharmacist.value.password,
    });
    localStorage.setItem(
      'heta_last_created_user_login',
      JSON.stringify({
        email: newPharmacist.value.email,
        password: newPharmacist.value.password,
        role: 'pharmacy',
      }),
    );
    showNotice('success', `Pharmacist ${newPharmacist.value.name} created successfully`);
    showAddPharmacistModal.value = false;
    newPharmacist.value = { name: '', email: '', password: '' };
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to create pharmacist');
  }
};

const addMedicalStaff = async () => {
  if (!selectedMedicalStaffRole.value) {
    showNotice('error', 'Please select a role');
    return;
  }

  if (!newMedicalStaff.value.name || !newMedicalStaff.value.email || !newMedicalStaff.value.password) {
    showNotice('error', 'Please fill all required fields');
    return;
  }

  try {
    if (selectedMedicalStaffRole.value === 'doctor') {
      if (!newMedicalStaff.value.department_id) {
        showNotice('error', 'Please select a department for the doctor');
        return;
      }
      await adminAPI.createDoctor({
        name: newMedicalStaff.value.name,
        email: newMedicalStaff.value.email,
        password: newMedicalStaff.value.password,
        department_id: newMedicalStaff.value.department_id,
        specialization: newMedicalStaff.value.specialization,
        qualification: newMedicalStaff.value.qualification,
        experience_yrs: Number(newMedicalStaff.value.experience_yrs) || 0,
      });
      localStorage.setItem(
        'heta_last_created_user_login',
        JSON.stringify({
          email: newMedicalStaff.value.email,
          password: newMedicalStaff.value.password,
          role: 'doctor',
        }),
      );
      showNotice('success', `Doctor ${newMedicalStaff.value.name} added successfully`);
    } else if (selectedMedicalStaffRole.value === 'receptionist') {
      await adminAPI.createReceptionist({
        name: newMedicalStaff.value.name,
        email: newMedicalStaff.value.email,
        password: newMedicalStaff.value.password,
      });
      localStorage.setItem(
        'heta_last_created_user_login',
        JSON.stringify({
          email: newMedicalStaff.value.email,
          password: newMedicalStaff.value.password,
          role: 'receptionist',
        }),
      );
      showNotice('success', `Receptionist ${newMedicalStaff.value.name} created successfully`);
    } else if (selectedMedicalStaffRole.value === 'pharmacist') {
      await adminAPI.createPharmacist({
        name: newMedicalStaff.value.name,
        email: newMedicalStaff.value.email,
        password: newMedicalStaff.value.password,
      });
      localStorage.setItem(
        'heta_last_created_user_login',
        JSON.stringify({
          email: newMedicalStaff.value.email,
          password: newMedicalStaff.value.password,
          role: 'pharmacy',
        }),
      );
      showNotice('success', `Pharmacist ${newMedicalStaff.value.name} created successfully`);
    }

    await loadData();
    closeMedicalStaffModal();
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to add medical staff');
  }
};

const closeMedicalStaffModal = () => {
  showAddMedicalStaffModal.value = false;
  selectedMedicalStaffRole.value = null;
  newMedicalStaff.value = { 
    name: '', 
    email: '', 
    password: '', 
    department_id: 0, 
    specialization: '', 
    qualification: '', 
    experience_yrs: 0 
  };
  showPassword.value.doctor = false;
};

const addPatient = async () => {
  if (!newPatient.value.name || !newPatient.value.email || !newPatient.value.password || !newPatient.value.phone || !newPatient.value.gender || !newPatient.value.blood_type) {
    showNotice('error', 'Please fill all required patient details');
    return;
  }

  const normalizedPhone = String(newPatient.value.phone || '').replace(/\D/g, '');
  if (!/^\d{10}$/.test(normalizedPhone)) {
    showNotice('error', 'Phone number must be exactly 10 digits');
    return;
  }

  try {
    await adminAPI.createPatient({
      name: newPatient.value.name,
      email: newPatient.value.email,
      password: newPatient.value.password,
      phone: normalizedPhone,
      gender: newPatient.value.gender,
      blood_type: newPatient.value.blood_type,
      address: newPatient.value.address,
    });
    await loadData();
    showNotice('success', `Patient ${newPatient.value.name} added successfully`);
    showAddPatientModal.value = false;
    newPatient.value = { name: '', email: '', password: '', phone: '', gender: '', blood_type: '', address: '' };
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to add patient');
  }
};

const openEditPatient = (patient: adminAPI.Patient) => {
  editingPatient.value = { ...patient, address: '' };
  showEditPatientModal.value = true;
};

const updatePatient = async () => {
  if (!editingPatient.value?.id) {
    return;
  }

  const normalizedPhone = String(editingPatient.value.phone || '').replace(/\D/g, '');
  if (!/^\d{10}$/.test(normalizedPhone)) {
    showNotice('error', 'Phone number must be exactly 10 digits');
    return;
  }

  try {
    await adminAPI.updatePatient(editingPatient.value.id, {
      name: editingPatient.value.name,
      email: '',
      phone: normalizedPhone,
      gender: editingPatient.value.gender,
      blood_type: editingPatient.value.blood_type || '',
      address: editingPatient.value.address || '',
    });
    await loadData();
    showNotice('success', `Patient ${editingPatient.value.name} updated successfully`);
    showEditPatientModal.value = false;
    editingPatient.value = null;
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to update patient');
  }
};

const openEditReceptionist = (receptionist: adminAPI.Receptionist) => {
  editingReceptionist.value = { ...receptionist };
  showEditReceptionistModal.value = true;
};

const updateReceptionist = async () => {
  if (!editingReceptionist.value?.id) {
    return;
  }

  if (!editingReceptionist.value.name || !editingReceptionist.value.email) {
    showNotice('error', 'Please fill all fields');
    return;
  }

  try {
    await adminAPI.updateReceptionist(editingReceptionist.value.id, {
      name: editingReceptionist.value.name,
      email: editingReceptionist.value.email,
    });
    await loadData();
    showNotice('success', `Receptionist ${editingReceptionist.value.name} updated successfully`);
    showEditReceptionistModal.value = false;
    editingReceptionist.value = null;
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to update receptionist');
  }
};

const deleteReceptionistConfirm = async (receptionist: adminAPI.Receptionist) => {
  if (confirm(`Are you sure you want to delete receptionist ${receptionist.name}?`)) {
    try {
      await adminAPI.deleteReceptionist(receptionist.id);
      await loadData();
      showNotice('success', `Receptionist ${receptionist.name} deleted successfully`);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to delete receptionist');
    }
  }
};

const openEditPharmacist = (pharmacist: adminAPI.Pharmacist) => {
  editingPharmacist.value = { ...pharmacist };
  showEditPharmacistModal.value = true;
};

const updatePharmacist = async () => {
  if (!editingPharmacist.value?.id) {
    return;
  }

  if (!editingPharmacist.value.name || !editingPharmacist.value.email) {
    showNotice('error', 'Please fill all fields');
    return;
  }

  try {
    await adminAPI.updatePharmacist(editingPharmacist.value.id, {
      name: editingPharmacist.value.name,
      email: editingPharmacist.value.email,
    });
    await loadData();
    showNotice('success', `Pharmacist ${editingPharmacist.value.name} updated successfully`);
    showEditPharmacistModal.value = false;
    editingPharmacist.value = null;
  } catch (err) {
    showNotice('error', err instanceof Error ? err.message : 'Failed to update pharmacist');
  }
};

const deletePharmacistConfirm = async (pharmacist: adminAPI.Pharmacist) => {
  if (confirm(`Are you sure you want to delete pharmacist ${pharmacist.name}?`)) {
    try {
      await adminAPI.deletePharmacist(pharmacist.id);
      await loadData();
      showNotice('success', `Pharmacist ${pharmacist.name} deleted successfully`);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to delete pharmacist');
    }
  }
};

</script>

<template>
  <div class="flex min-h-screen bg-slate-50">
    <Sidebar :role="props.role" :activeTab="activeTab" @change-tab="handleTabChange" @logout="handleLogoutClick" />

    <div class="flex-1 flex flex-col min-w-0">
      <Navbar :role="props.role" :activeTab="activeTab" @search="handleSearch" />

      <main class="p-8 overflow-y-auto">
        <div
          v-if="notice"
          :class="[
            'mb-6 p-4 rounded-xl border font-medium',
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700',
          ]"
        >
          {{ notice.text }}
        </div>

        <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle class="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p class="font-bold text-red-800">Error loading data</p>
            <p class="text-sm text-red-700">{{ error }}</p>
          </div>
          <button @click="loadData()" class="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Retry</button>
        </div>

        <div v-if="activeTab === 'dashboard'" class="space-y-8 animate-in fade-in duration-500">
          <div class="bg-gradient-to-r from-sky-600 to-sky-400 p-8 rounded-3xl text-white shadow-xl shadow-sky-500/20">
            <h2 class="text-3xl font-bold tracking-tight">Welcome{{ props.userName ? ` ${props.userName}` : '' }}!</h2>
            <p class="text-white/80 mt-2 max-w-md">Manage hospital operations and staff.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div
              v-for="stat in stats"
              :key="stat.label"
              class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div class="flex items-center justify-between mb-4">
                <div :class="['w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110', stat.bg]">
                  <component :is="stat.icon" :class="['w-6 h-6', stat.color]" />
                </div>
                <div class="flex items-center gap-1 text-emerald-500 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                  <TrendingUp class="w-3 h-3" />
                  +{{ stat.percentage }}%
                </div>
              </div>
              <p class="text-slate-400 text-sm font-medium">{{ stat.label }}</p>
              <h3 class="text-2xl font-bold text-slate-800 mt-1">{{ stat.value }}</h3>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-8">
            <Card title="Department Overview" subtitle="Staff and patient distribution" :icon="Activity">
              <div v-if="loading" class="text-center py-8">
                <p class="text-slate-400">Loading departments...</p>
              </div>
              <Table
                v-else
                :headers="['No', 'Department', 'Floor', 'Doctors', 'Patients']"
                :items="filteredDepartmentOverview.map((d, index) => ({ no: index + 1, name: d.name, floor: d.floor_number, doctors: d.doctors_count, patients: d.patients_count }))"
              />
            </Card>
          </div>
        </div>

        <div v-else-if="activeTab === 'departments'" class="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div v-if="!selectedDepartment">
            <div class="flex items-center justify-between mb-8">
              <div>
                <h2 class="text-2xl font-bold text-slate-800">Hospital Departments</h2>
                <p class="text-slate-400 text-sm">Manage and monitor medical departments</p>
              </div>
              <button
                v-if="props.role === 'admin'"
                @click="showAddDeptModal = true"
                class="bg-sky-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-sky-500/20 hover:bg-sky-600 transition-all"
              >
                <Plus class="w-5 h-5" />
                Add Department
              </button>
            </div>

            <div v-if="loading" class="text-center py-12">
              <p class="text-slate-400">Loading departments...</p>
            </div>
            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card
                v-for="dept in filteredDepartments"
                :key="dept.id"
                :title="dept.name"
                :subtitle="'Floor: ' + (dept.floor_number || 'N/A')"
                :icon="Building2"
                class="cursor-pointer hover:border-sky-500 transition-all group"
                @click="selectedDepartment = dept"
              >
                <div class="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-50">
                  <div class="text-center">
                    <p class="text-xs text-slate-400 uppercase font-bold tracking-wider">Doctors</p>
                    <p class="text-lg font-bold text-slate-800">{{ doctorsData.filter(d => d.department_id === dept.id).length }}</p>
                  </div>
                  <div class="text-center">
                    <p class="text-xs text-slate-400 uppercase font-bold tracking-wider">Patients</p>
                    <p class="text-lg font-bold text-slate-800">{{ patientsData.filter(p => appointmentsData.some(a => a.patient_id === p.id && doctorsData.filter(d => d.department_id === dept.id).map(d => d.id).includes(a.doctor_id))).length }}</p>
                  </div>
                </div>
                <div class="mt-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span class="text-xs font-bold text-sky-500">View Details</span>
                </div>
              </Card>
            </div>
          </div>

          <div v-else class="space-y-8">
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <button
                  @click="selectedDepartment = null"
                  class="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-all"
                >
                  <ChevronLeft class="w-6 h-6" />
                </button>
                <div>
                  <h2 class="text-2xl font-bold text-slate-800">{{ selectedDepartment.name }} Department</h2>
                  <p class="text-slate-400 text-sm">Floor: {{ selectedDepartment.floor_number }}</p>
                </div>
              </div>
              <button
                v-if="props.role === 'admin'"
                @click="openEditDepartment(selectedDepartment)"
                class="bg-sky-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-sky-500/20 hover:bg-sky-600 transition-all"
              >
                <Edit class="w-4 h-4" />
                Edit Department
              </button>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card title="Department Doctors" :subtitle="'Medical staff in ' + selectedDepartment.name" :icon="UserRound">
                <div v-if="loading" class="text-center py-8">
                  <p class="text-slate-400">Loading...</p>
                </div>
                <Table
                  v-else
                  :headers="['Name', 'Specialization', 'Total Patients']"
                  :items="departmentDoctorsWithPatients.map((d) => ({ name: d.name, specialization: d.specialization, total_patients: d.total_patients }))"
                />
              </Card>
              <Card title="Description" :subtitle="selectedDepartment.name" :icon="Users">
                <div class="space-y-4">
                  <p class="text-slate-700">{{ selectedDepartment.description || 'No description available' }}</p>
                  <div class="grid grid-cols-3 gap-4">
                    <div class="p-4 bg-slate-50 rounded-lg">
                      <p class="text-xs text-slate-400 font-bold uppercase">Total Doctors</p>
                      <p class="text-2xl font-bold text-slate-800">{{ departmentDoctors.filter(d => d.department_id === selectedDepartment.id).length }}</p>
                    </div>
                    <div class="p-4 bg-slate-50 rounded-lg">
                      <p class="text-xs text-slate-400 font-bold uppercase">Total Patients</p>
                      <p class="text-2xl font-bold text-slate-800">{{ departmentPatients.length }}</p>
                    </div>
                    <div class="p-4 bg-slate-50 rounded-lg">
                      <p class="text-xs text-slate-400 font-bold uppercase">Floor Number</p>
                      <p class="text-2xl font-bold text-slate-800">{{ selectedDepartment.floor_number }}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'doctors'" class="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold text-slate-800">Medical Staff</h2>
              <p class="text-slate-400 text-sm">Manage doctors, receptionists, and pharmacists</p>
            </div>
            <div v-if="props.role === 'admin'" class="flex items-center gap-3">
              <button
                @click="showAddMedicalStaffModal = true"
                class="bg-sky-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-sky-500/20 hover:bg-sky-600 transition-all"
              >
                <Plus class="w-5 h-5" />
                Add Medical Staff
              </button>
            </div>
          </div>

          <!-- Doctors Section -->
          <div class="space-y-4">
            <div class="flex items-center gap-3 pb-3 border-b-2 border-sky-200">
              <div class="w-10 h-10 bg-sky-50 rounded-lg flex items-center justify-center">
                <UserRound class="w-6 h-6 text-sky-600" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-800">Doctors</h3>
                <p class="text-xs text-slate-400">{{ doctorsData.length }} doctors</p>
              </div>
            </div>
            <Card>
              <div v-if="loading" class="text-center py-8">
                <p class="text-slate-400">Loading doctors...</p>
              </div>
              <div v-else-if="doctorsData.length === 0" class="text-center py-8">
                <p class="text-slate-400">No doctors added yet</p>
              </div>
              <Table
                v-else
                :items="doctorsData.map((d, index) => ({ 
                  no: index + 1, 
                  name: d.name, 
                  email: d.email,
                  department: getDepartmentName(d.department_id),
                  specialization: d.specialization || '-',
                  qualification: d.qualification || '-',
                  experience: d.experience_yrs || '-',
                  actions: '', 
                  _original: d 
                }))"
                :headers="['No', 'Name', 'Email', 'Department', 'Specialization', 'Qualification', 'Experience (Yrs)', 'Actions']"
              >
                <template #cell-actions="{ item }">
                  <div class="flex items-center gap-2">
                    <button
                      @click="openEditDoctor(item._original)"
                      class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-600 hover:bg-sky-100 transition-all flex items-center gap-1"
                    >
                      <Edit class="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      @click="deleteDoctor(item._original)"
                      class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center gap-1"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </template>
              </Table>
            </Card>
          </div>

          <!-- Receptionists Section -->
          <div class="space-y-4">
            <div class="flex items-center gap-3 pb-3 border-b-2 border-emerald-200">
              <div class="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Users class="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-800">Receptionists</h3>
                <p class="text-xs text-slate-400">{{ receptionistsData.length }} receptionists</p>
              </div>
            </div>
            <Card>
              <div v-if="loading" class="text-center py-8">
                <p class="text-slate-400">Loading receptionists...</p>
              </div>
              <div v-else-if="receptionistsData.length === 0" class="text-center py-8">
                <p class="text-slate-400">No receptionists added yet</p>
              </div>
              <Table
                v-else
                :items="receptionistsData.map((r, index) => ({ 
                  no: index + 1, 
                  name: r.name, 
                  email: r.email,
                  actions: '',
                  _original: r
                }))"
                :headers="['No', 'Name', 'Email', 'Actions']"
              >
                <template #cell-actions="{ item }">
                  <div class="flex items-center gap-2">
                    <button
                      @click="openEditReceptionist(item._original)"
                      class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-600 hover:bg-sky-100 transition-all flex items-center gap-1"
                    >
                      <Edit class="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      @click="deleteReceptionistConfirm(item._original)"
                      class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center gap-1"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </template>
              </Table>
            </Card>
          </div>

          <!-- Pharmacists Section -->
          <div class="space-y-4">
            <div class="flex items-center gap-3 pb-3 border-b-2 border-amber-200">
              <div class="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <Pill class="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-800">Pharmacists</h3>
                <p class="text-xs text-slate-400">{{ pharmacistsData.length }} pharmacists</p>
              </div>
            </div>
            <Card>
              <div v-if="loading" class="text-center py-8">
                <p class="text-slate-400">Loading pharmacists...</p>
              </div>
              <div v-else-if="pharmacistsData.length === 0" class="text-center py-8">
                <p class="text-slate-400">No pharmacists added yet</p>
              </div>
              <Table
                v-else
                :items="pharmacistsData.map((p, index) => ({ 
                  no: index + 1, 
                  name: p.name, 
                  email: p.email,
                  actions: '',
                  _original: p
                }))"
                :headers="['No', 'Name', 'Email', 'Actions']"
              >
                <template #cell-actions="{ item }">
                  <div class="flex items-center gap-2">
                    <button
                      @click="openEditPharmacist(item._original)"
                      class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-600 hover:bg-sky-100 transition-all flex items-center gap-1"
                    >
                      <Edit class="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      @click="deletePharmacistConfirm(item._original)"
                      class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center gap-1"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </template>
              </Table>
            </Card>
          </div>
        </div>

        <div v-else-if="activeTab === 'receptionist' || activeTab === 'patients'" class="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold text-slate-800">Patient Management</h2>
              <p class="text-slate-400 text-sm">Receptionist can add and update patient details</p>
            </div>
            <button
              @click="showAddPatientModal = true"
              class="bg-sky-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-sky-500/20 hover:bg-sky-600 transition-all"
            >
              <Plus class="w-5 h-5" />
              Add Patient
            </button>
          </div>

          <Card>
            <div v-if="loading" class="text-center py-8">
              <p class="text-slate-400">Loading patients...</p>
            </div>
            <Table
              v-else
              :headers="['No', 'Name', 'Phone', 'Gender', 'Blood Group', 'Actions']"
              :items="filteredPatients.map((p, index) => ({ no: index + 1, name: p.name, phone: p.phone, gender: p.gender, blood_type: p.blood_type || 'N/A', actions: '', _original: p }))"
            >
              <template #cell-actions="{ item }">
                <button @click="openEditPatient(item._original)" class="p-2 text-slate-400 hover:text-sky-500 transition-all">
                  <Edit class="w-4 h-4" />
                </button>
              </template>
            </Table>
          </Card>
        </div>

        <div v-else-if="activeTab === 'pharmacy'" class="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold text-slate-800">Pharmacy Management</h2>
              <p class="text-slate-400 text-sm">Manage inventory and track medical orders</p>
            </div>
            <div class="inline-flex items-center px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold">
              Inventory updates are managed by Pharmacist role
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Medicines</p>
              <h3 class="text-2xl font-bold text-slate-800">{{ pharmacyItemsData.length }}</h3>
            </div>
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Low Stock Alert</p>
              <h3 class="text-2xl font-bold text-red-500">{{ pharmacyItemsData.filter((m) => m.quantity < 100).length }} Items</h3>
            </div>
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Out of Stock</p>
              <h3 class="text-2xl font-bold text-amber-500">{{ pharmacyItemsData.filter((m) => m.quantity === 0).length }} Items</h3>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card id="pharmacy-inventory" title="Inventory" subtitle="Current stock levels" :icon="Pill" class="lg:col-span-2">
              <Table
                :headers="['No', 'Name', 'Stock', 'Price']"
                :items="filteredMedicines.map((m, index) => ({ no: index + 1, name: m.medicine_name, stock: m.quantity, price: m.unit_price }))"
              >
                <template #cell-stock="{ value }">
                  <span :class="['font-bold', value < 100 ? 'text-red-500' : 'text-slate-600']">{{ value }}</span>
                </template>
                <template #cell-price="{ value }"> ₹{{ value }} </template>
              </Table>
            </Card>

            <Card title="Recent Inventory" subtitle="Latest medicines added" :icon="ShoppingBag">
              <div class="space-y-4">
                <div v-for="item in pharmacyItemsData.slice(0, 4)" :key="item.item_id" class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div class="flex justify-between items-start">
                    <div>
                      <p class="font-bold text-slate-800 text-sm">{{ item.medicine_name }}</p>
                      <p class="text-xs text-slate-400">Stock: {{ item.quantity }}</p>
                    </div>
                    <p class="text-sm font-bold text-slate-700">₹{{ item.unit_price }}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div v-else-if="activeTab === 'laboratory'" class="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div>
            <h2 class="text-2xl font-bold text-slate-800">Laboratory Management</h2>
            <p class="text-slate-400 text-sm">Track and manage diagnostic tests</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Tests</p>
              <h3 class="text-2xl font-bold text-slate-800">{{ labReportsData.length }}</h3>
            </div>
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Pending Tests</p>
              <h3 class="text-2xl font-bold text-amber-500">{{ labReportsData.filter((t) => t.status.toLowerCase() === 'pending' || t.status.toLowerCase() === 'ordered').length }} Tests</h3>
            </div>
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Completed Today</p>
              <h3 class="text-2xl font-bold text-emerald-500">{{ labReportsData.filter((t) => t.status.toLowerCase() === 'completed').length }} Tests</h3>
            </div>
          </div>

          <Card title="Lab Test Records" subtitle="All diagnostic test requests" :icon="FlaskConical">
            <Table
              :headers="['No', 'Patient', 'Test Name', 'Date', 'Status', 'Result']"
              :items="labReportsData.map((t, index) => ({ 
                no: index + 1, 
                patient: t.patient_name || `Patient #${t.patient_id}`, 
                test: t.test_name, 
                date: new Date(t.created_at).toLocaleDateString(), 
                status: t.status, 
                result: t.result || '-'
              }))"
            >
              <template #cell-status="{ value }">
                <span
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
                    value.toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
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
      </main>
    </div>

    <div v-if="showEditDoctorModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6 sticky top-0 bg-white">
          <h3 class="text-xl font-bold text-slate-800">Edit Doctor Profile</h3>
          <button @click="showEditDoctorModal = false" class="text-slate-400 hover:text-slate-600"><X class="w-6 h-6" /></button>
        </div>
        <form @submit.prevent="updateDoctor" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Full Name</label>
            <input v-model="editingDoctor.name" type="text" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none" required />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Email</label>
            <input v-model="editingDoctor.email" type="email" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none" required />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Specialization</label>
            <input
              v-model="editingDoctor.specialization"
              type="text"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
              required
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Qualification</label>
            <input
              v-model="editingDoctor.qualification"
              type="text"
              placeholder="e.g. MBBS, MD"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Years of Experience</label>
            <input
              v-model.number="editingDoctor.experience_yrs"
              type="number"
              placeholder="e.g. 5"
              min="0"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Department</label>
            <select
              v-model.number="editingDoctor.department_id"
              type="number"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
              required
            >
              <option v-for="dept in departmentsData" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
            </select>
          </div>
          <button type="submit" class="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20">Update Profile</button>
        </form>
      </div>
    </div>

    <div v-if="showAddDeptModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-slate-800">Add New Department</h3>
          <button @click="showAddDeptModal = false" class="text-slate-400 hover:text-slate-600"><X class="w-6 h-6" /></button>
        </div>
        <form @submit.prevent="addDepartment" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Department Name</label>
            <input
              v-model="newDept.name"
              type="text"
              placeholder="e.g. Cardiology"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
              required
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Description</label>
            <textarea
              v-model="newDept.description"
              placeholder="e.g. Cardiology department"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
              required
            ></textarea>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Floor Number</label>
            <select
              v-model="newDept.floor_number"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
              required
            >
              <option :value="''" disabled>Select Floor</option>
              <option v-for="floor in floorsData" :key="floor" :value="floor">{{ floor }}</option>
            </select>
          </div>
          <button type="submit" class="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20">Create Department</button>
        </form>
      </div>
    </div>

    <div v-if="showEditDeptModal && editingDepartment" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6 sticky top-0 bg-white">
          <h3 class="text-xl font-bold text-slate-800">Edit Department</h3>
          <button
            @click="showEditDeptModal = false; editingDepartment = null"
            class="text-slate-400 hover:text-slate-600"
          >
            <X class="w-6 h-6" />
          </button>
        </div>
        <form @submit.prevent="updateDepartmentDetails" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Department Name</label>
            <input
              v-model="editingDepartment.name"
              type="text"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
              required
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Description</label>
            <textarea
              v-model="editingDepartment.description"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
              required
            ></textarea>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Floor Number</label>
            <select
              v-model="editingDepartment.floor_number"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
              required
            >
              <option :value="''" disabled>Select Floor</option>
              <option v-for="floor in floorsData" :key="floor" :value="floor">{{ floor }}</option>
            </select>
          </div>
          <button type="submit" class="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20">Update Department</button>
        </form>
      </div>
    </div>

    <div v-if="showAddPharmacistModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-slate-800">Add New Pharmacist</h3>
          <button @click="showAddPharmacistModal = false" class="text-slate-400 hover:text-slate-600"><X class="w-6 h-6" /></button>
        </div>
        <form @submit.prevent="addPharmacist" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Full Name</label>
            <input v-model="newPharmacist.name" type="text" placeholder="Pharmacist Name" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" required />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Email</label>
            <input v-model="newPharmacist.email" type="email" placeholder="pharmacy@zydus.com" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" required />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Password</label>
            <div class="relative">
              <input
                v-model="newPharmacist.password"
                :type="showPassword.pharmacist ? 'text' : 'password'"
                placeholder="••••••••"
                class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none pr-10"
                required
              />
              <button type="button" @click="showPassword.pharmacist = !showPassword.pharmacist" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <Eye v-if="showPassword.pharmacist" class="w-5 h-5" />
                <EyeOff v-else class="w-5 h-5" />
              </button>
            </div>
          </div>
          <button type="submit" class="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">Add Pharmacist</button>
        </form>
      </div>
    </div>

    <!-- Unified Add Medical Staff Modal -->
    <div v-if="showAddMedicalStaffModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6 sticky top-0 bg-white">
          <h3 class="text-xl font-bold text-slate-800">Add Medical Staff</h3>
          <button @click="closeMedicalStaffModal" class="text-slate-400 hover:text-slate-600"><X class="w-6 h-6" /></button>
        </div>
        <form @submit.prevent="addMedicalStaff" class="space-y-4">
          <!-- Step 1: Name -->
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Full Name</label>
            <input
              v-model="newMedicalStaff.name"
              type="text"
              placeholder="Enter full name"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
              required
            />
          </div>

          <!-- Step 2: Role Selection -->
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Select Role</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                @click="selectedMedicalStaffRole = 'doctor'"
                :class="[
                  'p-3 rounded-xl border-2 font-semibold text-sm transition-all',
                  selectedMedicalStaffRole === 'doctor'
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-sky-300'
                ]"
              >
                Doctor
              </button>
              <button
                type="button"
                @click="selectedMedicalStaffRole = 'receptionist'"
                :class="[
                  'p-3 rounded-xl border-2 font-semibold text-sm transition-all',
                  selectedMedicalStaffRole === 'receptionist'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300'
                ]"
              >
                Receptionist
              </button>
              <button
                type="button"
                @click="selectedMedicalStaffRole = 'pharmacist'"
                :class="[
                  'p-3 rounded-xl border-2 font-semibold text-sm transition-all',
                  selectedMedicalStaffRole === 'pharmacist'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-amber-300'
                ]"
              >
                Pharmacist
              </button>
            </div>
          </div>

          <!-- Email -->
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Email</label>
            <input
              v-model="newMedicalStaff.email"
              type="email"
              placeholder="staff@zydus.com"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
              required
            />
          </div>

          <!-- Password -->
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Password</label>
            <div class="relative">
              <input
                v-model="newMedicalStaff.password"
                :type="showPassword.doctor ? 'text' : 'password'"
                placeholder="••••••••"
                class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none pr-10"
                required
              />
              <button type="button" @click="showPassword.doctor = !showPassword.doctor" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <Eye v-if="showPassword.doctor" class="w-5 h-5" />
                <EyeOff v-else class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Role-specific Fields: Doctor -->
          <div v-if="selectedMedicalStaffRole === 'doctor'" class="space-y-4 pt-4 border-t border-slate-200">
            <p class="text-xs font-bold text-slate-500 uppercase">Doctor Details</p>
            
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700">Department</label>
              <select
                v-model.number="newMedicalStaff.department_id"
                class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
                required
              >
                <option value="" disabled>Select Department</option>
                <option v-for="dept in departmentsData" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700">Specialization</label>
              <input
                v-model="newMedicalStaff.specialization"
                type="text"
                placeholder="e.g. Cardiologist"
                class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
                required
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700">Qualification</label>
              <input
                v-model="newMedicalStaff.qualification"
                type="text"
                placeholder="e.g. MBBS, MD"
                class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
                required
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700">Years of Experience</label>
              <input
                v-model.number="newMedicalStaff.experience_yrs"
                type="number"
                placeholder="e.g. 5"
                min="0"
                class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
              />
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="!selectedMedicalStaffRole"
            :class="[
              'w-full py-4 font-bold rounded-xl transition-all shadow-lg',
              selectedMedicalStaffRole === 'doctor'
                ? 'bg-sky-500 text-white hover:bg-sky-600 shadow-sky-500/20 disabled:bg-slate-300'
                : selectedMedicalStaffRole === 'receptionist'
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20 disabled:bg-slate-300'
                : selectedMedicalStaffRole === 'pharmacist'
                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20 disabled:bg-slate-300'
                : 'bg-slate-300 text-white cursor-not-allowed'
            ]"
          >
            {{ selectedMedicalStaffRole ? `Add ${selectedMedicalStaffRole.charAt(0).toUpperCase() + selectedMedicalStaffRole.slice(1)}` : 'Select a Role First' }}
          </button>
        </form>
      </div>
    </div>

    <div v-if="showAddDoctorModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6 sticky top-0 bg-white">
          <h3 class="text-xl font-bold text-slate-800">Add New Doctor</h3>
          <button @click="showAddDoctorModal = false" class="text-slate-400 hover:text-slate-600"><X class="w-6 h-6" /></button>
        </div>
        <form @submit.prevent="addDoctor" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Full Name</label>
            <input
              v-model="newDoctor.name"
              type="text"
              placeholder="Dr. Jane Smith"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
              required
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Email</label>
            <input
              v-model="newDoctor.email"
              type="email"
              placeholder="jane@zydus.com"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
              required
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Password</label>
            <div class="relative">
              <input
                v-model="newDoctor.password"
                :type="showPassword.doctor ? 'text' : 'password'"
                placeholder="••••••••"
                class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none pr-10"
                required
              />
              <button type="button" @click="showPassword.doctor = !showPassword.doctor" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <Eye v-if="showPassword.doctor" class="w-5 h-5" />
                <EyeOff v-else class="w-5 h-5" />
              </button>
            </div>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Department</label>
            <select v-model.number="newDoctor.department_id" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none" required>
              <option value="" disabled>Select Department</option>
              <option v-for="dept in departmentsData" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Specialization</label>
            <input
              v-model="newDoctor.specialization"
              type="text"
              placeholder="e.g. Cardiologist"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
              required
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Qualification</label>
            <input
              v-model="newDoctor.qualification"
              type="text"
              placeholder="e.g. MBBS, MD"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
              required
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Years of Experience</label>
            <input
              v-model.number="newDoctor.experience_yrs"
              type="number"
              placeholder="e.g. 5"
              min="0"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"
            />
          </div>
          <button type="submit" class="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20">Add Doctor</button>
        </form>
      </div>
    </div>

    <div v-if="showAddReceptionistModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-slate-800">Add New Receptionist</h3>
          <button @click="showAddReceptionistModal = false" class="text-slate-400 hover:text-slate-600"><X class="w-6 h-6" /></button>
        </div>
        <form @submit.prevent="addReceptionist" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Full Name</label>
            <input
              v-model="newReceptionist.name"
              type="text"
              placeholder="Receptionist Name"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
              required
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Email</label>
            <input
              v-model="newReceptionist.email"
              type="email"
              placeholder="reception@zydus.com"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
              required
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Password</label>
            <div class="relative">
              <input
                v-model="newReceptionist.password"
                :type="showPassword.receptionist ? 'text' : 'password'"
                placeholder="••••••••"
                class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none pr-10"
                required
              />
              <button type="button" @click="showPassword.receptionist = !showPassword.receptionist" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <Eye v-if="showPassword.receptionist" class="w-5 h-5" />
                <EyeOff v-else class="w-5 h-5" />
              </button>
            </div>
          </div>
          <button type="submit" class="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">Add Receptionist</button>
        </form>
      </div>
    </div>

    <div v-if="showAddPatientModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-slate-800">Add New Patient</h3>
          <button @click="showAddPatientModal = false" class="text-slate-400 hover:text-slate-600"><X class="w-6 h-6" /></button>
        </div>
        <form @submit.prevent="addPatient" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Full Name</label>
            <input v-model="newPatient.name" type="text" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none" required />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Email</label>
            <input v-model="newPatient.email" type="email" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none" required />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Password</label>
            <div class="relative">
              <input
                v-model="newPatient.password"
                :type="showPassword.patient ? 'text' : 'password'"
                class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none pr-10"
                required
              />
              <button type="button" @click="showPassword.patient = !showPassword.patient" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <Eye v-if="showPassword.patient" class="w-5 h-5" />
                <EyeOff v-else class="w-5 h-5" />
              </button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700">Phone</label>
              <input v-model="newPatient.phone" type="text" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none" required />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700">Gender</label>
              <select v-model="newPatient.gender" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none" required>
                <option value="" disabled>Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Blood Group</label>
            <select v-model="newPatient.blood_type" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none" required>
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
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Address</label>
            <textarea v-model="newPatient.address" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"></textarea>
          </div>
          <button type="submit" class="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20">Add Patient</button>
        </form>
      </div>
    </div>

    <div v-if="showEditPatientModal && editingPatient" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6 sticky top-0 bg-white">
          <h3 class="text-xl font-bold text-slate-800">Edit Patient</h3>
          <button @click="showEditPatientModal = false" class="text-slate-400 hover:text-slate-600"><X class="w-6 h-6" /></button>
        </div>
        <form @submit.prevent="updatePatient" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Name</label>
            <input v-model="editingPatient.name" type="text" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none" required />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700">Phone</label>
              <input v-model="editingPatient.phone" type="text" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none" required />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700">Gender</label>
              <select v-model="editingPatient.gender" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none" required>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Blood Group</label>
            <select v-model="editingPatient.blood_type" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none">
              <option value="">Select Blood Group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Address</label>
            <textarea v-model="editingPatient.address" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none"></textarea>
          </div>
          <button type="submit" class="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20">Update Patient</button>
        </form>
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

    <!-- Edit Receptionist Modal -->
    <div v-if="showEditReceptionistModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-slate-800">Edit Receptionist</h3>
          <button @click="showEditReceptionistModal = false" class="text-slate-400 hover:text-slate-600"><X class="w-6 h-6" /></button>
        </div>
        <form @submit.prevent="updateReceptionist" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Full Name</label>
            <input v-model="editingReceptionist.name" type="text" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none" required />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">Email</label>
            <input v-model="editingReceptionist.email" type="email" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none" required />
          </div>
          <button type="submit" class="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20">Update Receptionist</button>
        </form>
      </div>
    </div>
  </div>
</template>
