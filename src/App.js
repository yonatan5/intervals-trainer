import './App.css';
import SoundDetector from "./pitch";
import React from "react";

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
