import { useState, useEffect } from 'react'
import { db } from './firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

function Asetukset() {
  const [lajit, setLajit] = useState([])
  const [uusiLaji, setUusiLaji] = useState("")
  const [tallennetaan, setTallennetaan] = useState(false)

  // Oletuslajit, jos tietokanta on tyhjä
  const OLETUSLAJIT = ["Ahven", "Hauki", "Kuha", "Siika", "Lohi"]

  // 1. Haetaan lajit tietokannasta kun sivu aukeaa
  useEffect(() => {
    haeLajit()
  }, [])

  const haeLajit = async () => {
    try {
      const docRef = doc(db, "asetukset", "kalalajit")
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        setLajit(docSnap.data().lista)
      } else {
        setLajit(OLETUSLAJIT)
      }
    } catch (virhe) {
      console.error("Virhe lajien haussa:", virhe)
    }
  }

  // 2. Tallennusfunktio
  const tallennaLajitPilveen = async (uusiLista) => {
    setTallennetaan(true)
    try {
      await setDoc(doc(db, "asetukset", "kalalajit"), {
        lista: uusiLista
      })
      setLajit(uusiLista) 
    } catch (virhe) {
      console.error("Tallennusvirhe:", virhe)
      alert("Virhe tallennuksessa!")
    }
    setTallennetaan(false)
  }

  const lisaaLaji = async () => {
    if (!uusiLaji.trim()) return
    if (lajit.includes(uusiLaji.trim())) {
      alert("Tämä laji on jo listalla!")
      return
    }

    const uusiLista = [...lajit, uusiLaji.trim()]
    await tallennaLajitPilveen(uusiLista)
    setUusiLaji("") 
  }

  const poistaLaji = async (poistettava) => {
    if (window.confirm(`Haluatko varmasti poistaa lajin: ${poistettava}?`)) {
      const uusiLista = lajit.filter(l => l !== poistettava)
      await tallennaLajitPilveen(uusiLista)
    }
  }

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h2 style={{ textAlign: "center" }}>⚙️ Kalalajien hallinta</h2>
      <p style={{ textAlign: "center", color: "#aaa" }}>
        Nämä lajit näkyvät tallennusvalikossa.
      </p>

      {/* Lisäyslomake */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input 
          type="text" 
          value={uusiLaji}
          onChange={(e) => setUusiLaji(e.target.value)}
          placeholder="Uusi laji (esim. Taimen)"
          style={{ flex: 1, padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
        />
        <button 
          onClick={lisaaLaji}
          disabled={tallennetaan}
          style={{
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          {tallennetaan ? "..." : "Lisää"}
        </button>
      </div>

      {/* Lista lajeista */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {lajit.map((laji) => (
          <div key={laji} style={{ 
            display: "flex", 
            alignItems: "center", 
            backgroundColor: "white", 
            padding: "8px 15px", 
            borderRadius: "20px", 
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            border: "1px solid #eee"
          }}>
            {/* KORJAUS: Lisätty väri nimenomaan tähän tekstiin */}
            <span style={{ marginRight: "10px", fontWeight: "bold", color: "#333" }}>{laji}</span>
            <button 
              onClick={() => poistaLaji(laji)}
              style={{ 
                backgroundColor: "transparent", 
                border: "none", 
                color: "#dc3545", 
                cursor: "pointer", 
                fontWeight: "bold",
                fontSize: "1.2em"
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Asetukset