import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// --- KUVAKORJAUS (PIDETÄÄN TÄMÄ MUKANA) ---
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});

L.Marker.prototype.options.icon = DefaultIcon;
// ------------------------------------------

import { db } from './firebase'
import { collection, addDoc, getDocs } from 'firebase/firestore' 

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
  const [paikat, setPaikat] = useState([])
  
  // UUSI: Tähän tallentuu se nimi, jota käyttäjä kirjoittaa
  const [uusiNimi, setUusiNimi] = useState("")

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

  // Hakee paikat alussa
  useEffect(() => {
    const haePaikat = async () => {
      const querySnapshot = await getDocs(collection(db, "kalapaikat"))
      const haetutPaikat = []
      querySnapshot.forEach((doc) => {
        haetutPaikat.push({ id: doc.id, ...doc.data() })
      })
      setPaikat(haetutPaikat)
    }
    haePaikat()
  }, []) 

  const tallennaPaikka = async () => {
    if (!sijainti) return

    // Jos nimi on tyhjä, käytetään oletusta
    const tallennettavaNimi = uusiNimi.trim() !== "" ? uusiNimi : "Nimetön paikka"

    try {
      // 1. Lähetetään Firebaseen
      const docRef = await addDoc(collection(db, "kalapaikat"), {
        lat: sijainti[0],
        lon: sijainti[1],
        nimi: tallennettavaNimi, 
        pvm: new Date().toISOString() 
      });
      
      // 2. Lisätään paikka heti myös ruudulle näkyviin (ei tarvitse F5)
      setPaikat([...paikat, {
        id: docRef.id,
        lat: sijainti[0],
        lon: sijainti[1],
        nimi: tallennettavaNimi,
        pvm: new Date().toISOString()
      }])

      // 3. Tyhjennetään tekstikenttä ja kiitetään
      setUusiNimi("") 
      alert("Paikka tallennettu! 🐟")

    } catch (virhe) {
      console.error("Virhe tallennuksessa:", virhe)
      alert("Tallennus epäonnistui.")
    }
  }

  return (
    <div>
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

        {paikat.map((paikka) => (
          <Marker key={paikka.id} position={[paikka.lat, paikka.lon]}>
            <Popup>
              <b>{paikka.nimi}</b><br />
              <small>{new Date(paikka.pvm).toLocaleDateString()}</small>
            </Popup>
          </Marker>
        ))}

      </MapContainer>

      {/* UUSI: Ohjauspaneeli kartan alla */}
      <div style={{ marginTop: "15px", textAlign: "center", padding: "10px", backgroundColor: "#f0f0f0", borderRadius: "8px" }}>
        
        <h3>Lisää uusi havainto</h3>
        
        <input 
          type="text" 
          placeholder="Paikan nimi (esim. Iso hauki)" 
          value={uusiNimi}
          onChange={(e) => setUusiNimi(e.target.value)}
          style={{ 
            padding: "10px", 
            width: "70%", 
            marginBottom: "10px", 
            borderRadius: "5px", 
            border: "1px solid #ccc" 
          }}
        />
        <br />
        
        <button 
          onClick={tallennaPaikka}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            width: "80%"
          }}
        >
          📍 Tallenna sijainti
        </button>
      </div>
    </div>
  )
}

export default Kartta