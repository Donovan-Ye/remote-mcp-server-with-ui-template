import { Routes, Route } from 'react-router-dom';
import GetAliLogs from './pages/GetAliLogs';
import Home from './pages/Home';

function App() {
  return (
    <Routes>
      <Route path="/ui" element={<Home />} />
      <Route path="/ui/get-ali-logs" element={<GetAliLogs />} />
    </Routes>
  );
}

export default App;
