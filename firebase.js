// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// import { getFirestore } from "firebase/firestore";
import { initializeFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAbzUhLgsrVhewJ_0dws0xdYedXRFcWIrE",
  authDomain: "example-53d49.firebaseapp.com",
  projectId: "example-53d49",
  storageBucket: "example-53d49.appspot.com",
  messagingSenderId: "266292868410",
  appId: "1:266292868410:web:15f10cd9f5c974fa954c03",
  measurementId: "G-LPK0J8Z6ZV",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
