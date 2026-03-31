import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 1. Tus credenciales reales de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyChLguIMlaRJ1fl3IaD0x1DcpnACtjNQ2I",
  authDomain: "kraken-handyman.firebaseapp.com",
  projectId: "kraken-handyman",
  storageBucket: "kraken-handyman.firebasestorage.app",
  messagingSenderId: "289798963894",
  appId: "1:289798963894:web:0b1b1b348f7a9dc9661c17"
};

// 2. Inicializar Firebase
const app = initializeApp(firebaseConfig);

// 3. Exportar los servicios necesarios
export const auth = getAuth(app);
export const db = getFirestore(app);

// 4. Configurar el proveedor de Google (Para que funcione el botón de Login con Google)
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Prueba de conexión simplificada para la consola
console.log("Firebase Kraken OS inicializado correctamente");
