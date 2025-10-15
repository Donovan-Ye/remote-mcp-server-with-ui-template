import { Routes, Route } from 'react-router-dom';
import GetAliLogs from './pages/GetAliLogs';

function App() {
  return (
    <Routes>
      <Route path="/ui" element={<div>mcp ui home page</div>} />
      <Route path="/ui/get-ali-logs" element={<GetAliLogs />} />
    </Routes>
  );
}

export default App;
