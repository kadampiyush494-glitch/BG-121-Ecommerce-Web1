/**
 * ForgeAdmin - Firebase Client Configuration
 * Project: e-commerce-7d1b7
 */

const firebaseConfig = {
  apiKey: "AIzaSyBvXgUiQoQOVSgm14EAzLNDWIUj7m8KykE",
  authDomain: "e-commerce-7d1b7.firebaseapp.com",
  projectId: "e-commerce-7d1b7",
  storageBucket: "e-commerce-7d1b7.firebasestorage.app",
  messagingSenderId: "648605209937",
  appId: "1:648605209937:web:cde20e8e96bc90bbff6f70",
  measurementId: "G-6HVNSW4145"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const firebaseAuth = firebase.auth();

console.log('🔥 Firebase initialized — project: e-commerce-7d1b7');
