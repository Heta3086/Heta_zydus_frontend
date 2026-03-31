<script setup lang="ts">
import { ref } from 'vue';
import { ShieldCheck, Eye, EyeOff } from 'lucide-vue-next';
import { registerUser, loginUser } from '../services/auth';

const emit = defineEmits<{
  back: [];
  register: [token: string, role: string];
}>();

const form = ref({
  name: '',
  email: '',
  phone: '',
  gender: '',
  blood_type: '',
  address: '',
  password: '',
  confirmPassword: '',
});

const showPassword = ref(false);
const showConfirmPassword = ref(false);
const loading = ref(false);
const errorMessage = ref('');

const onPhoneInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  form.value.phone = String(target.value || '').replace(/\D/g, '').slice(0, 10);
};

const handleRegister = async () => {
  if (
    !form.value.name.trim() ||
    !form.value.email.trim() ||
    !form.value.phone.trim() ||
    !form.value.gender ||
    !form.value.blood_type ||
    !form.value.address.trim() ||
    !form.value.password ||
    !form.value.confirmPassword
  ) {
    errorMessage.value = 'Please fill all details';
    return;
  }

  if (!/^\d{10}$/.test(form.value.phone)) {
    errorMessage.value = 'Phone number must be exactly 10 digits';
    return;
  }

  if (form.value.password !== form.value.confirmPassword) {
    errorMessage.value = 'Passwords do not match';
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    await registerUser({
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      phone: form.value.phone,
      gender: form.value.gender,
      blood_type: form.value.blood_type,
      address: form.value.address.trim(),
      password: form.value.password,
      role: 'patient',
    });

    const login = await loginUser(form.value.email.trim(), form.value.password);
    emit('register', login.token, String(login.role || 'patient'));
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Registration failed';
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
            <p class="text-slate-600 text-sm font-semibold">Create your patient account</p>
        </div>
        
        <form @submit.prevent="handleRegister" class="space-y-4">
            <input v-model="form.name" type="text" placeholder="Full Name" class="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-sky-500" required />
            <input v-model="form.email" type="email" placeholder="Email" class="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-sky-500" required />
            <div class="relative">
              <input v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="Password" class="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-sky-500 pr-10" required />
              <button type="button" @click="showPassword = !showPassword" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <Eye v-if="showPassword" class="w-5 h-5" />
                <EyeOff v-else class="w-5 h-5" />
              </button>
            </div>
            <div class="relative">
              <input v-model="form.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" placeholder="Confirm Password" class="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-sky-500 pr-10" required />
              <button type="button" @click="showConfirmPassword = !showConfirmPassword" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <Eye v-if="showConfirmPassword" class="w-5 h-5" />
                <EyeOff v-else class="w-5 h-5" />
              </button>
            </div>
        <input v-model="form.phone" type="text" inputmode="numeric" maxlength="10" pattern="[0-9]{10}" placeholder="Phone (10 digits)" class="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-sky-500" @input="onPhoneInput" required />

        <select v-model="form.gender" class="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-sky-500" required>
          <option value="" disabled>Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>

        <select v-model="form.blood_type" class="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-sky-500" required>
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

        <textarea v-model="form.address" rows="2" placeholder="Address" class="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-sky-500" required></textarea>


        <button type="submit" class="w-full py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600">
          {{ loading ? 'Creating Account...' : 'Create Account' }}
        </button>
      </form>

      <p v-if="errorMessage" class="mt-3 text-sm text-red-500 text-center">{{ errorMessage }}</p>

      <p class="mt-4 text-sm text-center text-slate-500">
        Already have an account?
        <button type="button" @click="emit('back')" class="text-sky-600 font-semibold hover:underline">Sign In</button>
      </p>
    </div>
  </div>
</template>
