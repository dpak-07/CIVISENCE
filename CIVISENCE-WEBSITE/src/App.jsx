import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";

// Pages
import MunicipalLogin from "./components/authpages/login";
import MapView from "./components/map analytics/map";

function App() {
  return (
    <Router>
      <Routes>
        {/* Login */}
        <Route path="/login" element={<MunicipalLogin />} />

        {/* Map View */}
        <Route path="/map" element={<MapView />} />
      </Routes>
    </Router>
  );
}

export default App;
