import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/stage1.css';
import './styles/stage2.css';
import './styles/stage2-student.css';
import './styles/stage3.css';
import './styles/stage4.css';
import './styles/dashboard.css';
import './styles/stage-flow.css';
import './styles/stage-flow.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
