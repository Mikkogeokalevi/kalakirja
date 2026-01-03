import { useState } from 'react'
import Kartta from './Kartta'
import Lista from './Lista'
import Asetukset from './Asetukset'
import './App.css'

function App() {
  // Tämä muuttuja päättää, mikä sivu on auki. 
  // Oletuksena 'kartta'.
  const [sivu, setSivu] = useState('kartta')

  return (
    <div>
      {/* --- YLÄVALIKKO --- */}
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-around', 
        padding: '10px', 
        backgroundColor: '#333', 
        color: 'white' 
      }}>
        <button 
          onClick={() => setSivu('kartta')}
          style={{ backgroundColor: sivu === 'kartta' ? '#555' : 'transparent', border: 'none', color: 'white', padding: '10px', fontSize: '16px', cursor: 'pointer' }}
        >
          🗺️ Kartta
        </button>
        
        <button 
          onClick={() => setSivu('lista')}
          style={{ backgroundColor: sivu === 'lista' ? '#555' : 'transparent', border: 'none', color: 'white', padding: '10px', fontSize: '16px', cursor: 'pointer' }}
        >
          📋 Lista
        </button>
        
        <button 
          onClick={() => setSivu('asetukset')}
          style={{ backgroundColor: sivu === 'asetukset' ? '#555' : 'transparent', border: 'none', color: 'white', padding: '10px', fontSize: '16px', cursor: 'pointer' }}
        >
          ⚙️ Asetukset
        </button>
      </nav>

      {/* --- SISÄLTÖ --- */}
      {/* Näytetään se komponentti, joka vastaa valittua sivua */}
      
      <div style={{ height: 'calc(100vh - 60px)' }}> {/* Varataan tilaa sisällölle */}
        {sivu === 'kartta' && <Kartta />}
        {sivu === 'lista' && <Lista />}
        {sivu === 'asetukset' && <Asetukset />}
      </div>
      
    </div>
  )
}

export default App