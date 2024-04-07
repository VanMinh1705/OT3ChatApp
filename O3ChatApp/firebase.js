import firebase from "@react-native-firebase/app";
import "@react-native-firebase/auth";
// If you are using firebase auth

const firebaseConfig = {
  apiKey: "AIzaSyBklukxNzThDHw5kh1Avy7tsdApi189Xtw",
  authDomain: "otpphonecheck.firebaseapp.com",
  projectId: "otpphonecheck",
  storageBucket: "otpphonecheck.appspot.com",
  messagingSenderId: "538955893751",
  appId: "1:538955893751:web:57ae083fafa165945f7cf2",
  measurementId: "G-FPN1VDBGE1",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export default firebase;
