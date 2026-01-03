import { useState, useEffect } from 'react'
import { db } from './firebase'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'

function Lista() {
  const [paikat, setPaikat] = useState([])

  // Haetaan paikat heti kun sivu aukeaa
  useEffect(() => {
    haePaikat()
  }, [])

  const haePaikat = async () => {
    const querySnapshot = await getDocs(collection(db, "kalapaikat"))
    const haetutPaikat = []
    querySnapshot.forEach((doc) => {
      haetutPaikat.push({ id: doc.id, ...doc.data() })
    })
    
    // Järjestetään: uusin havainto ensin
    haetutPaikat.sort((a, b) => new Date(b.pvm) - new Date(a.pvm))
    
    setPaikat(haetutPaikat)
  }

  const poistaPaikka = async (id) => {
    // Varmistetaan käyttäjältä ettei poista vahingossa
    if (window.confirm("Haluatko varmasti poistaa tämän havainnon?")) {
      try {
        await deleteDoc(doc(db, "kalapaikat", id))
        // Päivitetään lista poiston jälkeen
        haePaikat() 
      } catch (virhe) {
        console.error("Virhe poistossa:", virhe)
        alert("Poisto epäonnistui.")
      }
    }
  }

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>📋 Kaikki havainnot</h2>
      
      {paikat.length === 0 && (
        <p style={{ textAlign: "center", color: "#666" }}>Ei vielä tallennettuja paikkoja.</p>
      )}

      {paikat.map((paikka) => (
        <div key={paikka.id} style={{ 
          border: "1px solid #e0e0e0", 
          borderRadius: "8px", 
          padding: "15px", 
          marginBottom: "15px", 
          backgroundColor: "#fff",
          boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
        }}>
          {/* Ylärivi: Nimi ja Päivämäärä */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h3 style={{ margin: 0, color: "#333" }}>{paikka.nimi}</h3>
            <span style={{ fontSize: "0.9em", color: "#888" }}>
              {new Date(paikka.pvm).toLocaleDateString()}
            </span>
          </div>

          {/* Vesistö */}
          {paikka.vesisto && (
            <div style={{ marginBottom: "5px", fontStyle: "italic", color: "#555" }}>
              📍 {paikka.vesisto}
            </div>
          )}

          {/* Kalat - näytetään sinisinä "tageina" */}
          {paikka.kalat && paikka.kalat.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px" }}>
              {paikka.kalat.map(kala => (
                <span key={kala} style={{ 
                  backgroundColor: "#e3f2fd", 
                  color: "#007bff", 
                  padding: "2px 8px", 
                  borderRadius: "12px", 
                  fontSize: "0.9em",
                  fontWeight: "bold"
                }}>
                  🐟 {kala}
                </span>
              ))}
            </div>
          )}

          {/* Kommentti */}
          {paikka.kommentti && (
            <div style={{ 
              backgroundColor: "#f9f9f9", 
              padding: "10px", 
              borderRadius: "5px", 
              fontSize: "0.95em", 
              color: "#444",
              marginBottom: "10px"
            }}>
              "{paikka.kommentti}"
            </div>
          )}

          {/* Alarivi: Poista-nappi */}
          <div style={{ textAlign: "right" }}>
            <button 
              onClick={() => poistaPaikka(paikka.id)}
              style={{
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                padding: "8px 15px",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "0.9em"
              }}
            >
              🗑️ Poista
            </button>
          </div>

        </div>
      ))}
    </div>
  )
}

export default Lista