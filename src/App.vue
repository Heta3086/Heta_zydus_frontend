<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Login from './views/Login.vue';
import Register from './views/Register.vue';
import AdminDashboard from './views/AdminDashboard.vue';
import DoctorDashboard from './views/DoctorDashboard.vue';
import ReceptionistDashboard from './views/ReceptionistDashboard.vue';
import PharmacyDashboard from './views/PharmacyDashboard.vue';
import PatientDashboard from './views/PatientDashboard.vue';
import { logoutUser, fetchProfile } from './services/auth';

const token = ref<string | null>(null);
const role = ref<string | null>(null);
const userName = ref<string | null>(null);
const isValidating = ref(true);
const authScreen = ref<'login' | 'register'>('login');

const normalizeRole = (value: string | null | undefined) => {
  const roleValue = String(value || '').toLowerCase();
  if (roleValue === 'receptioniest' || roleValue === 'recertioniest' || roleValue === 'receiptionist') return 'receptionist';
  return roleValue;
};

const onLogin = (newToken: string, newRole: string) => {
  token.value = newToken;
  role.value = normalizeRole(newRole);
  localStorage.setItem('heta_auth_token', newToken);
  localStorage.setItem('heta_auth_role', role.value);
  // Fetch profile immediately to get user's name
  fetchProfile(newToken)
    .then((profile) => {
      userName.value = profile.name || null;
    })
    .catch((err) => {
      console.error('Error fetching profile after login:', err);
    });
};

const onRegisterSuccess = (newToken: string, newRole: string) => {
  onLogin(newToken, newRole);
};

const onLogout = async () => {
  if (token.value) {
    try {
      await logoutUser(token.value);
    } catch (error) {
      console.error('Logout API error:', error);
    }
  }
  token.value = null;
  role.value = null;
  localStorage.removeItem('heta_auth_token');
  localStorage.removeItem('heta_auth_role');
};

const validateToken = async () => {
  const storedToken = localStorage.getItem('heta_auth_token');

  if (!storedToken) {
    token.value = null;
    role.value = null;
    userName.value = null;
    isValidating.value = false;
    return;
  }

  try {
    const profile = await fetchProfile(storedToken);
    token.value = storedToken;
    role.value = normalizeRole(profile.role);
    userName.value = profile.name || null;
    localStorage.setItem('heta_auth_role', role.value);
  } catch (error) {
    console.error('Token validation failed:', error);
    localStorage.removeItem('heta_auth_token');
    localStorage.removeItem('heta_auth_role');
    token.value = null;
    role.value = null;
    userName.value = null;
  } finally {
    isValidating.value = false;
  }
};

onMounted(() => {
  validateToken();
});
</script>

<template>
  <div v-if="isValidating" class="flex items-center justify-center h-screen bg-slate-100">
    <div class="text-center">
      <div class="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-slate-600 font-semibold">Loading...</p>
    </div>
  </div>
  <Register
    v-else-if="!token && authScreen === 'register'"
    @back="authScreen = 'login'"
    @register="onRegisterSuccess"
  />
  <Login
    v-else-if="!token"
    @login="onLogin"
    @show-register="authScreen = 'register'"
  />
  <DoctorDashboard v-else-if="token && role === 'doctor'" :userName="userName" @logout="onLogout" />
  <ReceptionistDashboard v-else-if="token && role === 'receptionist'" :userName="userName" @logout="onLogout" />
  <PharmacyDashboard v-else-if="token && role === 'pharmacy'" :userName="userName" @logout="onLogout" />
  <PatientDashboard v-else-if="token && role === 'patient'" :userName="userName" @logout="onLogout" />
  <AdminDashboard v-else :role="role || 'admin'" :userName="userName" @logout="onLogout" />
</template>
