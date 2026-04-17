/**
 * ForgeAdmin - Firebase Client Configuration
 * Project: neurodb-6fcf5
 */

const firebaseConfig = {
  apiKey: "AIzaSyCI_C9z5SDr8rQNoj196ox8sV9kQhnQ5MQ", // Get from Firebase Console > Project Settings > General
  authDomain: "neurodb-6fcf5.firebaseapp.com",
  projectId: "neurodb-6fcf5",
  storageBucket: "neurodb-6fcf5.appspot.com",
  messagingSenderId: "434516415230",
  appId: "1:434516415230:web:9b10ee6921abbc0e5dcbaf"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const firebaseAuth = firebase.auth();

console.log('🔥 Firebase initialized — project: neurodb-6fcf5');
