import { initializeApp, getApp, getApps } from 'firebase/app';
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  "projectId": "snapstock-ousa6",
  "appId": "1:855458781786:web:b56a1a9b2ca6a7ddb9d663",
  "storageBucket": "snapstock-ousa6.appspot.com",
  "apiKey": "AIzaSyANCu6z2ggIrANJM06hVXdY0qKtVRTZu78",
  "authDomain": "snapstock-ousa6.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "855458781786"
};


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const storage = getStorage(app);

export { app, storage };
