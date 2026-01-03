// Tuodaan tarvittavat Firebase-osat
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- KORVAA TÄMÄ OSA FIREBASE-SIVULTA SAAMILLASI TIEDOILLA ---
const firebaseConfig = {

  apiKey: "AIzaSyCRwFFvOMBoIquTdcxD4dOO8dIT1yONntU",

  authDomain: "kalakirja-sovellus.firebaseapp.com",

  projectId: "kalakirja-sovellus",

  storageBucket: "kalakirja-sovellus.firebasestorage.app",

  messagingSenderId: "752186216034",

  appId: "1:752186216034:web:adb444c707a85181610b3b"

};

// -------------------------------------------------------------

// Käynnistetään Firebase
const app = initializeApp(firebaseConfig);

// Otetaan yhteys tietokantaan ja viedään se muiden käytettäväksi
export const db = getFirestore(app);