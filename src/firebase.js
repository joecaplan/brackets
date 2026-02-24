import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey:            "AIzaSyD-HJEX9f8BAo6_NzZ0qP0H-NpaZmjpbmU",
  authDomain:        "brackets-11789.firebaseapp.com",
  databaseURL:       "https://brackets-11789-default-rtdb.firebaseio.com",
  projectId:         "brackets-11789",
  storageBucket:     "brackets-11789.firebasestorage.app",
  messagingSenderId: "103429248167",
  appId:             "1:103429248167:web:8080e2b5ad52e23ef17782",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
