<script setup lang="ts">
import { ref } from 'vue';
import { ShieldCheck, Eye, EyeOff } from 'lucide-vue-next';
import { fetchProfile, loginUser } from '../services/auth';

const emit = defineEmits<{
  login: [token: string, role: string];
  'show-register': [];
}>();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const errorMessage = ref('');
const normalizeRole = (value: string) => {
  const role = String(value || '').toLowerCase();
  if (role === 'receptioniest' || role === 'recertioniest' || role === 'receiptionist') return 'receptionist';
  return role;
};

const allowedRoles = new Set(['admin', 'doctor', 'pharmacy', 'receptionist', 'patient']);

const handleLogin = async () => {
  if (!email.value || !password.value) return;

  loading.value = true;
  errorMessage.value = '';
  try {
    const login = await loginUser(email.value, password.value);
    let role = normalizeRole(String(login.role || '').toLowerCase());

    // Fallback to /profile when role is not present in login response.
    if (!role) {
      const profile = await fetchProfile(login.token);
      role = normalizeRole(String(profile.role || '').toLowerCase());
    }

    if (!allowedRoles.has(role)) {
      throw new Error('Only admin, doctor, pharmacy, receptionist, and patient can login here.');
    }

    emit('login', login.token, role);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Login failed';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <div class="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
      <div class="text-center mb-8">
        <div class="w-14 h-14 bg-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <ShieldCheck class="w-8 h-8 text-white" />
        </div>
        <p class="text-slate-600 text-sm font-semibold">Sign in to your Zydus Health account</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <input v-model="email" type="email" autocomplete="off" placeholder="Email" class="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-sky-500" required />
        <div class="relative">
          <input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" placeholder="Password" class="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-sky-500 pr-10" required />
          <button type="button" @click="showPassword = !showPassword" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <Eye v-if="showPassword" class="w-5 h-5" />
            <EyeOff v-else class="w-5 h-5" />
          </button>
        </div>

        <button type="submit" class="w-full py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600">
          {{ loading ? 'Signing In...' : 'Sign In' }}
        </button>
      </form>

      <p v-if="errorMessage" class="mt-3 text-sm text-red-500 text-center">{{ errorMessage }}</p>

      <p class="mt-4 text-sm text-center text-slate-500">
        New patient?
        <button type="button" @click="emit('show-register')" class="text-sky-600 font-semibold hover:underline">Create account</button>
      </p>
    </div>
  </div>
</template>
