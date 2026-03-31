const API_BASE = 'http://localhost:8080';

const getToken = () => localStorage.getItem('heta_auth_token');

async function authFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  if (!token) {
    throw new Error('Missing auth token. Please login again.');
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (response.status === 401) {
    localStorage.removeItem('heta_auth_token');
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    const errorMessage = data?.error || data?.message || 'Request failed';
    throw new Error(errorMessage);
  }

  return data;
}

export type Department = {
  id: number;
  name: string;
  description: string;
  floor_number: string;
};

export type DepartmentOverview = {
  id: number;
  name: string;
  floor_number: string;
  doctors_count: number;
  patients_count: number;
};

export type Doctor = {
  id: number;
  name: string;
  email: string;
  specialization: string;
  experience: string;
  qualification?: string;
    experience_yrs?: number;
  department_id: number;
};

export type Receptionist = {
  id: number;
  name: string;
  email: string;
};

export type Pharmacist = {
  id: number;
  name: string;
  email: string;
};

export type Patient = {
  id: number;
  name: string;
  phone: string;
  gender: string;
  blood_type?: string;
};

export type CreateDepartmentPayload = {
  name: string;
  description: string;
  floor_number: string;
};

export type CreateDoctorPayload = {
  name: string;
  email: string;
  password: string;
  department_id: number;
  specialization: string;
  qualification: string;
  experience_yrs?: number;
};

export type CreateReceptionistPayload = {
  name: string;
  email: string;
  password: string;
};

export type CreatePharmacistPayload = {
  name: string;
  email: string;
  password: string;
};

export async function getDepartments(): Promise<Department[]> {
  const data = await authFetch(`${API_BASE}/departments`);
  return (data?.departments || []) as Department[];
}

export async function getDepartmentOverview(): Promise<DepartmentOverview[]> {
  const data = await authFetch(`${API_BASE}/departments/overview`);
  return (data?.overview || []) as DepartmentOverview[];
}

export async function getFloorNumbers(): Promise<string[]> {
  const data = await authFetch(`${API_BASE}/floor-numbers`);
  return (data?.floor_numbers || []) as string[];
}

export async function createDepartment(payload: CreateDepartmentPayload): Promise<void> {
  await authFetch(`${API_BASE}/departments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteDepartment(id: number): Promise<void> {
  await authFetch(`${API_BASE}/departments/${id}`, {
    method: 'DELETE',
  });
}

export async function getDoctors(): Promise<Doctor[]> {
  const data = await authFetch(`${API_BASE}/doctors`);
  return (data || []) as Doctor[];
}

export async function createDoctor(payload: CreateDoctorPayload): Promise<void> {
  await authFetch(`${API_BASE}/doctors`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createReceptionist(payload: CreateReceptionistPayload): Promise<void> {
  await authFetch(`${API_BASE}/admin/receptionists`, {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      password: payload.password,
    }),
  });
}

export async function createPharmacist(payload: CreatePharmacistPayload): Promise<void> {
  await authFetch(`${API_BASE}/admin/pharmacists`, {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      password: payload.password,
    }),
  });
}

export async function getReceptionists(): Promise<Receptionist[]> {
  try {
    const data = await authFetch(`${API_BASE}/admin/receptionists`);
    return (Array.isArray(data) ? data : (data?.receptionists || [])) as Receptionist[];
  } catch (error) {
    console.error('Error fetching receptionists:', error);
    return [];
  }
}

export async function getPharmacists(): Promise<Pharmacist[]> {
  try {
    const data = await authFetch(`${API_BASE}/admin/pharmacists`);
    return (Array.isArray(data) ? data : (data?.pharmacists || [])) as Pharmacist[];
  } catch (error) {
    console.error('Error fetching pharmacists:', error);
    return [];
  }
}

export async function deleteReceptionist(id: number): Promise<void> {
  await authFetch(`${API_BASE}/admin/receptionists/${id}`, {
    method: 'DELETE',
  });
}

export async function updateReceptionist(id: number, data: { name: string; email: string }): Promise<void> {
  await authFetch(`${API_BASE}/admin/receptionists/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePharmacist(id: number): Promise<void> {
  await authFetch(`${API_BASE}/admin/pharmacists/${id}`, {
    method: 'DELETE',
  });
}

export async function updatePharmacist(id: number, data: { name: string; email: string }): Promise<void> {
  await authFetch(`${API_BASE}/admin/pharmacists/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteDoctor(id: number): Promise<void> {
  await authFetch(`${API_BASE}/doctors/${id}`, {
    method: 'DELETE',
  });
}

export async function getPatients(): Promise<Patient[]> {
  const data = await authFetch(`${API_BASE}/patients`);
  return (data || []) as Patient[];
}

export async function getDoctorPatients(): Promise<Patient[]> {
  const data = await authFetch(`${API_BASE}/doctor/patients`);
  if (Array.isArray(data)) {
    return data as Patient[];
  }
  return (data?.patients || []) as Patient[];
}

export type Appointment = {
  id: number;
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason?: string;
  patient?: {
    name: string;
  };
  doctor?: {
    name: string;
  };
};

export type DoctorPatientHistoryItem = {
  appointment_id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason: string;
  diagnosis: string;
  symptoms: string;
  treatment: string;
  doctor_notes: string;
  prescription: Array<{ name?: string; dosage?: string; duration?: string; category?: string }>;
};

export type DoctorPatientHistoryResponse = {
  patient: Patient;
  history: DoctorPatientHistoryItem[];
};

export type PharmacyItem = {
  item_id: number;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  created_at: string;
};

export type CreatePharmacyItemPayload = {
  medicine_name: string;
  quantity: number;
  unit_price: number;
};

export type LabReport = {
  lab_report_id: number;
  patient_id: number;
  patient_name?: string;
  doctor_name?: string;
  appointment_id?: number;
  test_name: string;
  result: string;
  status: string;
  created_at: string;
};

export type CreateLabReportPayload = {
  patient_id: number;
  appointment_id?: number;
  test_name: string;
  result?: string;
  status?: string;
};

export type LabTest = {
  test_id: number;
  name: string;
  category: string;
  price: number;
  description?: string;
  turnaround_time?: string;
  is_active: boolean;
  created_at?: string;
};

export type CreateLabTestPayload = {
  name: string;
  category: string;
  price: number;
  description?: string;
  turnaround_time?: string;
};

export type UpdateLabTestPayload = {
  result: string;
  status: string;
};

export type CreateAppointmentPayload = {
  doctor_id: number;
  appointment_date: string;
  appointment_time: string;
  reason: string;
};

export type MyAppointment = {
  id: number;
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason?: string;
  diagnosis?: string;
  symptoms?: string;
  treatment?: string;
  doctor_notes?: string;
  prescription?: any;
  doctor?: {
    name?: string;
  };
};

export type MyLabReport = {
  lab_report_id: number;
  appointment_id: number;
  test_name: string;
  result: string;
  status: string;
  created_at: string;
};

export type MyBill = {
  bill_id: number;
  appointment_id: number;
  amount: number;
  status: string;
  description: string;
  breakdown?: {
    consultation: number;
    medicines: number;
    lab_tests: number;
  };
  created_at: string;
};

export type MyPrescription = {
  prescription_id: number;
  appointment_id?: number;
  medicine_name: string;
  dosage: string;
  duration?: string;
  instructions?: string;
  doctor_name?: string;
  created_at?: string;
};

export type UpdateDoctorPayload = {
  name?: string;
  email?: string;
  department_id?: number;
  specialization?: string;
    experience_yrs?: number;
  qualification?: string;
};

export async function getAppointments(): Promise<Appointment[]> {
  try {
    const data = await authFetch(`${API_BASE}/appointments`);
    const appointments = Array.isArray(data) ? data : (data?.appointments || []);
    
    if (!appointments || appointments.length === 0) {
      return [];
    }
    
    // Fetch doctors and patients to populate names
    const [doctors, patients] = await Promise.all([
      getDoctors().catch(() => []),
      getPatients().catch(() => []),
    ]);
    
    // Transform appointments to include doctor and patient info
    return appointments.map((apt: any) => ({
      id: apt.id || apt.appointment_id,
      patient_id: apt.patient_id,
      doctor_id: apt.doctor_id,
      appointment_date: apt.appointment_date || apt.date || '',
      appointment_time: apt.appointment_time || apt.time || '',
      status: apt.status || 'scheduled',
      reason: apt.reason || '',
      patient: patients.find((p) => p.id === apt.patient_id),
      doctor: doctors.find((d) => d.id === apt.doctor_id),
    })) as Appointment[];
  } catch (err) {
    console.error('Error fetching appointments:', err);
    return [];
  }
}

export async function getDoctorAppointments(): Promise<Appointment[]> {
  const data = await authFetch(`${API_BASE}/doctor/appointments`);
  if (Array.isArray(data)) {
    return data as Appointment[];
  }
  return (data?.appointments || []) as Appointment[];
}

export async function createAppointment(payload: CreateAppointmentPayload): Promise<void> {
  await authFetch(`${API_BASE}/appointments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMyAppointments(): Promise<MyAppointment[]> {
  const data = await authFetch(`${API_BASE}/my-appointments`);
  const list = Array.isArray(data) ? data : (data?.appointments || []);
  return list as MyAppointment[];
}

export async function getMyLabReports(): Promise<MyLabReport[]> {
  const data = await authFetch(`${API_BASE}/my-lab-reports`);
  return (data?.lab_reports || []) as MyLabReport[];
}

export async function getMyBills(): Promise<MyBill[]> {
  const token = getToken();
  if (!token) {
    throw new Error('Missing auth token. Please login again.');
  }

  const response = await fetch(`${API_BASE}/my-bills`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Backward-compatible fallback while older backend instances are still running.
  if (response.status === 404) {
    return [];
  }

  const data = await response.json();

  if (response.status === 401) {
    localStorage.removeItem('heta_auth_token');
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Request failed');
  }

  return (data?.bills || []) as MyBill[];
}

export async function getMyPrescriptions(): Promise<MyPrescription[]> {
  const data = await authFetch(`${API_BASE}/my-prescriptions`);
  return (data?.prescriptions || []) as MyPrescription[];
}

export async function acceptAppointment(id: number): Promise<void> {
  await authFetch(`${API_BASE}/appointments/${id}/accept`, {
    method: 'PUT',
  });
}

export async function rejectAppointment(id: number): Promise<void> {
  await authFetch(`${API_BASE}/appointments/${id}/reject`, {
    method: 'PUT',
  });
}

export async function completeAppointment(
  id: number,
  payload: { diagnosis: string; symptoms: string; treatment: string; doctor_notes: string; prescription: any[] },
): Promise<void> {
  await authFetch(`${API_BASE}/appointments/${id}/complete`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getDoctorPatientHistory(patientId: number): Promise<DoctorPatientHistoryResponse> {
  const data = await authFetch(`${API_BASE}/doctor/patients/${patientId}/history`);
  return {
    patient: (data?.patient || {}) as Patient,
    history: (data?.history || []) as DoctorPatientHistoryItem[],
  };
}

export async function getDoctorRequests(): Promise<Appointment[]> {
  const data = await authFetch(`${API_BASE}/doctor/requests`);
  if (Array.isArray(data)) {
    return data as Appointment[];
  }
  return (data?.requests || []) as Appointment[];
}

export async function getReceptionistRejectedAppointments(): Promise<Appointment[]> {
  const data = await authFetch(`${API_BASE}/receptionist/rejected-appointments`);
  if (Array.isArray(data)) {
    return data as Appointment[];
  }
  return (data?.appointments || []) as Appointment[];
}

export async function rescheduleAppointment(id: number, payload: { appointment_date: string; appointment_time: string; reason?: string }): Promise<void> {
  await authFetch(`${API_BASE}/appointments/${id}/reschedule`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteCancelledAppointment(id: number): Promise<void> {
  await authFetch(`${API_BASE}/appointments/${id}`, {
    method: 'DELETE',
  });
}

export async function getDoctorById(id: number): Promise<Doctor> {
  const data = await authFetch(`${API_BASE}/doctors/${id}`);
  return data as Doctor;
}

export async function getPharmacyItems(): Promise<PharmacyItem[]> {
  const data = await authFetch(`${API_BASE}/pharmacy/items`);
  return (data?.items || []) as PharmacyItem[];
}

export async function createPharmacyItem(payload: CreatePharmacyItemPayload): Promise<void> {
  await authFetch(`${API_BASE}/pharmacy/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePharmacyItem(id: number, payload: CreatePharmacyItemPayload): Promise<void> {
  await authFetch(`${API_BASE}/pharmacy/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deletePharmacyItem(id: number): Promise<void> {
  await authFetch(`${API_BASE}/pharmacy/items/${id}`, {
    method: 'DELETE',
  });
}

export async function getLabReports(): Promise<LabReport[]> {
  const data = await authFetch(`${API_BASE}/lab-reports`);
  return (data?.lab_reports || []) as LabReport[];
}

export async function createLabReport(payload: CreateLabReportPayload): Promise<void> {
  await authFetch(`${API_BASE}/lab-reports`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateLabTest(id: number, payload: UpdateLabTestPayload): Promise<void> {
  await authFetch(`${API_BASE}/lab-reports/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// Lab Tests Catalog Functions
export async function getLabTestsCatalog(): Promise<LabTest[]> {
  const data = await authFetch(`${API_BASE}/lab-tests-catalog`);
  return (data?.tests || []) as LabTest[];
}

export async function getLabTestByID(id: number): Promise<LabTest> {
  const data = await authFetch(`${API_BASE}/lab-tests-catalog/${id}`);
  return data as LabTest;
}

export async function getLabTestsByCategory(category: string): Promise<LabTest[]> {
  const data = await authFetch(`${API_BASE}/lab-tests-catalog/category/${category}`);
  return (data?.tests || []) as LabTest[];
}

export async function createLabTest(payload: CreateLabTestPayload): Promise<void> {
  await authFetch(`${API_BASE}/lab-tests-catalog`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateLabTestCatalog(id: number, payload: Partial<CreateLabTestPayload>): Promise<void> {
  await authFetch(`${API_BASE}/lab-tests-catalog/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteLabTest(id: number): Promise<void> {
  await authFetch(`${API_BASE}/lab-tests-catalog/${id}`, {
    method: 'DELETE',
  });
}

export async function updateDoctor(id: number, payload: UpdateDoctorPayload): Promise<void> {
  await authFetch(`${API_BASE}/doctors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateDepartment(id: number, payload: CreateDepartmentPayload): Promise<void> {
  await authFetch(`${API_BASE}/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getPatientById(id: number): Promise<Patient> {
  const data = await authFetch(`${API_BASE}/patients/${id}`);
  return data as Patient;
}

export type CreatePatientPayload = {
  name: string;
  email: string;
  password?: string;
  phone: string;
  gender: string;
  age?: number;
  blood_type?: string;
  address?: string;
  department_id?: number;
  doctor_id?: number;
  appointment_date?: string;
  appointment_time?: string;
  reason?: string;
};

export async function createPatient(payload: CreatePatientPayload): Promise<void> {
  if (!payload.password) {
    throw new Error('Patient password is required');
  }

  const [firstName, ...restName] = (payload.name || '').trim().split(/\s+/);
  const lastName = restName.join(' ');

  await authFetch(`${API_BASE}/patients`, {
    method: 'POST',
    body: JSON.stringify({
      first_name: firstName || payload.name,
      last_name: lastName,
      email: payload.email,
      password: payload.password,
      phone: payload.phone,
      gender: payload.gender,
      blood_type: payload.blood_type || '',
      date_of_birth: '1995-01-01',
      address: payload.address || '',
      department_id: payload.department_id || 0,
      doctor_id: payload.doctor_id || 0,
      appointment_date: payload.appointment_date || '',
      appointment_time: payload.appointment_time || '',
      reason: payload.reason || 'Registered by receptionist',
    }),
  });
}

export async function updatePatient(id: number, payload: CreatePatientPayload): Promise<void> {
  await authFetch(`${API_BASE}/patients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
