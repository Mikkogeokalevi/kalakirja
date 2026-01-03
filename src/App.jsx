import './App.css'
import Kartta from './Kartta' // <--- 1. Tuodaan kartta mukaan

function App() {
  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <h1>🐟 Kalakirja</h1>
      <p>Tähän rakennetaan Suomen paras kalastussovellus.</p>
      
      {/* 2. Laitetaan kartta tähän alle */}
      <div style={{ margin: '20px auto', maxWidth: '800px', border: '2px solid #ccc' }}>
        <Kartta />
      </div>

    </div>
  )
}

export default App