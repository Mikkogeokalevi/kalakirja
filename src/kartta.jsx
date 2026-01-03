import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// --- KORJAUS ALKAA: Tuodaan kuvat ja Leaflet erikseen ---
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

// Asetetaan ikonit manuaalisesti, jotta ne eivät hajoa netissä
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});

L.Marker.prototype.options.icon = DefaultIcon;
// --- KORJAUS PÄÄTTYY ---

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

  useEffect(() => {
    const haePaikat = async () => {
      const querySnapshot = await getDocs(collection(db, "kalapaikat"))
      const haetutPaikat = []
      
      querySnapshot.forEach((doc) => {
        haetutPaikat.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      setPaikat(haetutPaikat)
    }

    haePaikat()
  }, []) 

  const tallennaPaikka = async () => {
    if (!sijainti) return

    try {
      await addDoc(collection(db, "kalapaikat"), {
        lat: sijainti[0],
        lon: sijainti[1],
        nimi: "Uusi kalapaikka", 
        pvm: new Date().toISOString() 
      });
      
      alert("Paikka tallennettu! Päivitä sivu nähdäksesi sen.")
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
              Tallennettu: {new Date(paikka.pvm).toLocaleDateString()}
            </Popup>
          </Marker>
        ))}

      </MapContainer>

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