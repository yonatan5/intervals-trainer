import './App.css';
import SoundDetector from "./pitch";
import React from "react";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBeSOi1sa5QGzsNLhMWafENv2le08uB8wU",
    authDomain: "jonboy-b2b5e.firebaseapp.com",
    projectId: "jonboy-b2b5e",
    storageBucket: "jonboy-b2b5e.appspot.com",
    messagingSenderId: "830160437983",
    appId: "1:830160437983:web:a4895310cb56068ef01f6a",
    measurementId: "G-52XX34SC0C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

function App() {
  return (
    <div className="App">
      <div>
          <SoundDetector></SoundDetector>
      </div>
    </div>
  );
}

export default App;
