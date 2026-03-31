export const departments = [
  { id: 1, name: 'Cardiology', head: 'Dr. John Smith', doctors: 12, patients: 450 },
  { id: 2, name: 'Neurology', head: 'Dr. Sarah Wilson', doctors: 8, patients: 320 },
  { id: 3, name: 'Orthopedic', head: 'Dr. Michael Brown', doctors: 15, patients: 600 },
  { id: 4, name: 'Pediatrics', head: 'Dr. Emily Davis', doctors: 10, patients: 280 },
];

export const doctors = [
  { id: 1, name: 'Dr. John Smith', department: 'Cardiology', email: 'john.smith@zydus.com', experience: '15 Years' },
  { id: 2, name: 'Dr. Sarah Wilson', department: 'Neurology', email: 'sarah.wilson@zydus.com', experience: '12 Years' },
  { id: 3, name: 'Dr. Michael Brown', department: 'Orthopedic', email: 'michael.brown@zydus.com', experience: '18 Years' },
];

export const patients = [
  { id: 1, name: 'Robert Johnson', age: 45, gender: 'Male', phone: '+1 234 567 8911', blood: 'A+' },
  { id: 2, name: 'Maria Garcia', age: 32, gender: 'Female', phone: '+1 234 567 8912', blood: 'O-' },
  { id: 3, name: 'William Chen', age: 58, gender: 'Male', phone: '+1 234 567 8913', blood: 'B+' },
];

export const appointments = [
  { id: 1, patient: 'Robert Johnson', doctor: 'Dr. John Smith', date: '2026-03-25', time: '10:00 AM', status: 'Accepted' },
  { id: 2, patient: 'Maria Garcia', doctor: 'Dr. Sarah Wilson', date: '2026-03-25', time: '11:30 AM', status: 'Pending' },
  { id: 3, patient: 'William Chen', doctor: 'Dr. Michael Brown', date: '2026-03-26', time: '09:00 AM', status: 'Rejected' },
];

export const medicines = [
  { id: 1, name: 'Amoxicillin', stock: 500, price: 12.5, category: 'Antibiotic' },
  { id: 2, name: 'Lisinopril', stock: 200, price: 8.75, category: 'Blood Pressure' },
  { id: 3, name: 'Metformin', stock: 350, price: 15.0, category: 'Diabetes' },
];

export const bills = [
  { id: 1, patient: 'Robert Johnson', date: '2026-03-24', amount: 4500, status: 'Paid' },
  { id: 2, patient: 'Maria Garcia', date: '2026-03-24', amount: 1200, status: 'Unpaid' },
];

export const orders = [
  {
    id: 1,
    patient: 'Robert Johnson',
    date: '2026-03-24',
    status: 'Completed',
    medicines: [
      { name: 'Amoxicillin', quantity: 2 },
      { name: 'Metformin', quantity: 1 },
    ],
  },
  {
    id: 2,
    patient: 'Maria Garcia',
    date: '2026-03-25',
    status: 'Pending',
    medicines: [{ name: 'Lisinopril', quantity: 1 }],
  },
  {
    id: 3,
    patient: 'William Chen',
    date: '2026-03-26',
    status: 'Pending',
    medicines: [
      { name: 'Metformin', quantity: 2 },
      { name: 'Amoxicillin', quantity: 1 },
    ],
  },
];

export const labTests = [
  {
    id: 1,
    patient: 'Robert Johnson',
    test: 'Complete Blood Count',
    date: '2026-03-24',
    status: 'Completed',
    result: 'Normal',
  },
  {
    id: 2,
    patient: 'Maria Garcia',
    test: 'Lipid Profile',
    date: '2026-03-25',
    status: 'Pending',
    result: '-',
  },
  {
    id: 3,
    patient: 'William Chen',
    test: 'Blood Sugar',
    date: '2026-03-26',
    status: 'Completed',
    result: 'High',
  },
];
