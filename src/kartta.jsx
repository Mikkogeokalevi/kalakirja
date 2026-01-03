import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Tuodaan tietokantayhteys ja tarvittavat toiminnot
import { db } from './firebase'
import { collection, addDoc } from 'firebase/firestore' 

// Apukomponentti kartan liikutteluun
function SiirraKartta({ koordinaatit }) {
  const map = useMap()
  useEffect(() => {
    if (koordinaatit) {
      map.flyTo(koordinaatit, 14, { duration: 2 })
    }
  }, [koordinaatit, map])
  return null
}

function Kartta() {
  const [sijainti, setSijainti] = useState(null)

  // Haetaan sijainti kun sivu latautuu
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSijainti([position.coords.latitude, position.coords.longitude])
        },
        (error) => {
          console.log("Ei sijaintia, käytetään Lahtea.")
          setSijainti([60.9827, 25.6612]) 
        }
      )
    } else {
      setSijainti([60.9827, 25.6612])
    }
  }, [])

  // --- TÄMÄ FUNKTIO HOITAA TALLENNUKSEN ---
  const tallennaPaikka = async () => {
    if (!sijainti) {
      alert("Odota, sijaintia haetaan vielä...")
      return
    }

    try {
      // Lähetetään tiedot Firebaseen "kalapaikat"-kokoelmaan
      await addDoc(collection(db, "kalapaikat"), {
        lat: sijainti[0],
        lon: sijainti[1],
        nimi: "Uusi kalapaikka", // Tähän voisi myöhemmin kysyä nimeä
        pvm: new Date().toISOString() // Tallennetaan myös aika
      });
      
      alert("Paikka tallennettu pilveen! 🐟")
    } catch (virhe) {
      console.error("Virhe tallennuksessa:", virhe)
      alert("Tallennus epäonnistui. Katso konsolista lisätietoja.")
    }
  }

  return (
    <div>
      {/* Kartta-elementti */}
      <MapContainer center={[64.0, 26.0]} zoom={5} style={{ height: "400px", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {sijainti && (
          <>
            <Marker position={sijainti}>
              <Popup>Olet tässä!</Popup>
            </Marker>
            <SiirraKartta koordinaatit={sijainti} />
          </>
        )}
      </MapContainer>

      {/* Tallenna-nappi kartan alle */}
      <div style={{ marginTop: "10px", textAlign: "center" }}>
        <button 
          onClick={tallennaPaikka}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          📍 Tallenna nykyinen sijainti
        </button>
      </div>
    </div>
  )
}

export default Kartta