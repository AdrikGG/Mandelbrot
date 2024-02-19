import React, { useState } from 'react';
import './App.css';
import keyQ from './icons/icons8-q-key-50.png';
import keyE from './icons/icons8-e-key-50.png';
import keyW from './icons/icons8-w-key-50.png';
import keyA from './icons/icons8-a-key-50.png';
import keyS from './icons/icons8-s-key-50.png';
import keyD from './icons/icons8-d-key-50.png';
import keyC from './icons/icons8-c-key-50.png';

import Sequential from './versions/Sequential';
import CPUParallel from './versions/CPUParallel';
import GPUParallel from './versions/GPUParallel';

function App() {
  const [tab, setTab] = useState('sequential');

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="tabs">
          <button
            className={tab === 'sequential' ? 'active' : ''}
            onClick={() => handleTabChange('sequential')}
          >
            Sequential
          </button>
          <button
            className={tab === 'cpuparallel' ? 'active' : ''}
            onClick={() => handleTabChange('cpuparallel')}
          >
            Parallel (CPU)
          </button>
          <button
            className={tab === 'gpuparallel' ? 'active' : ''}
            onClick={() => handleTabChange('gpuparallel')}
          >
            Parallel (GPU)
          </button>
        </div>
        {tab === 'sequential' ? (
          <Sequential />
        ) : tab === 'cpuparallel' ? (
          <CPUParallel />
        ) : (
          <GPUParallel />
        )}
      </header>
      <div className="controls" style={{ fontSize: '300%' }}>
        <h1>Controls</h1>
        <div>
          <ul style={{ listStyleType: 'disc', textAlign: 'left' }}>
            <li>Select the canvas with left click</li>
            <li>Hover the mouse over where you want to zoom</li>
            <li>
              Zoom in with <img src={keyE} alt="E key" className="key-image" />{' '}
              and zoom out with{' '}
              <img src={keyQ} alt="Q key" className="key-image" />
            </li>
            <li>
              Pan with <img src={keyW} alt="W key" className="key-image" />
              <img src={keyA} alt="A key" className="key-image" />
              <img src={keyS} alt="S key" className="key-image" />
              <img src={keyD} alt="D key" className="key-image" />
            </li>
            <li>
              Toggle between color and greyscale with{' '}
              <img src={keyC} alt="C key" className="key-image" />
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
