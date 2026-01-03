import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// --- KUVAKORJAUS ---
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
// -------------------

import { db } from './firebase'
import { collection, addDoc, getDocs } from 'firebase/firestore' 

// Tämä lista on nyt "kovakoodattu" tähän. 
// Myöhemmin haemme tämän Asetukset-sivulta!
const KALALAJIT = ["Ahven", "Hauki", "Kuha", "Siika", "Lohi", "Taimen", "Made"]

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

  // --- LOMAKKEEN TIEDOT ---
  const [nimi, setNimi] = useState("")
  const [vesisto, setVesisto] = useState("")
  const [kommentti, setKommentti] = useState("")
  const [valitutKalat, setValitutKalat] = useState([]) // Lista valituista kaloista

  // 1. Haetaan sijainti
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

  // 2. Haetaan vanhat paikat tietokannasta
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

  // --- KALAVALINNAN LOGIIKKA ---
  const hallitseKalavalintaa = (kala) => {
    if (valitutKalat.includes(kala)) {
      // Jos kala oli jo listalla, poistetaan se (filter)
      setValitutKalat(valitutKalat.filter(k => k !== kala))
    } else {
      // Jos kalaa ei ollut, lisätään se listaan
      setValitutKalat([...valitutKalat, kala])
    }
  }

  const tallennaPaikka = async () => {
    if (!sijainti) return

    const tallennettavaNimi = nimi.trim() !== "" ? nimi : "Nimetön paikka"

    // Luodaan uusi paikka-objekti kaikilla herkuilla
    const uusiPaikka = {
      lat: sijainti[0],
      lon: sijainti[1],
      nimi: tallennettavaNimi,
      vesisto: vesisto,
      kommentti: kommentti,
      kalat: valitutKalat, // Tässä menee lista (esim. ["Hauki", "Ahven"])
      pvm: new Date().toISOString() 
    }

    try {
      // 1. Lähetetään Firebaseen
      const docRef = await addDoc(collection(db, "kalapaikat"), uusiPaikka);
      
      // 2. Päivitetään ruutu
      setPaikat([...paikat, { id: docRef.id, ...uusiPaikka }])

      // 3. Tyhjennetään lomake
      setNimi("") 
      setVesisto("")
      setKommentti("")
      setValitutKalat([])

      alert("Havainto tallennettu! 🐟")

    } catch (virhe) {
      console.error("Virhe tallennuksessa:", virhe)
      alert("Tallennus epäonnistui.")
    }
  }

  return (
    <div style={{ paddingBottom: "50px" }}> {/* Lisätilaa alas ettei napit jää piiloon */}
      
      {/* Kartta */}
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
              {paikka.vesisto && <i>{paikka.vesisto}<br/></i>}
              <small>{new Date(paikka.pvm).toLocaleDateString()}</small><br/>
              {/* Näytetään kalat, jos niitä on tallennettu */}
              {paikka.kalat && paikka.kalat.length > 0 && (
                <div style={{ marginTop: "5px", fontWeight: "bold", color: "#007bff" }}>
                  🐟 {paikka.kalat.join(", ")}
                </div>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* --- LOMAKE --- */}
      <div style={{ margin: "15px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px", border: "1px solid #ddd" }}>
        
        <h3 style={{ marginTop: 0 }}>Uusi havainto</h3>
        
        {/* Nimi */}
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", fontWeight: "bold" }}>Paikan nimi:</label>
          <input 
            type="text" 
            value={nimi}
            onChange={(e) => setNimi(e.target.value)}
            placeholder="esim. Kuhanuistelupaikka"
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          />
        </div>

        {/* Vesistö */}
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", fontWeight: "bold" }}>Vesistö:</label>
          <input 
            type="text" 
            value={vesisto}
            onChange={(e) => setVesisto(e.target.value)}
            placeholder="esim. Päijänne"
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          />
        </div>

        {/* Kalalajit (Checkboxit) */}
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: "5px" }}>Saadut kalat:</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {KALALAJIT.map((laji) => (
              <label key={laji} style={{ display: "flex", alignItems: "center", cursor: "pointer", backgroundColor: "white", padding: "5px 10px", borderRadius: "15px", border: "1px solid #ccc" }}>
                <input 
                  type="checkbox" 
                  checked={valitutKalat.includes(laji)}
                  onChange={() => hallitseKalavalintaa(laji)}
                  style={{ marginRight: "5px" }}
                />
                {laji}
              </label>
            ))}
          </div>
        </div>

        {/* Kommentti */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", fontWeight: "bold" }}>Kommentit:</label>
          <textarea 
            value={kommentti}
            onChange={(e) => setKommentti(e.target.value)}
            placeholder="Sää, vieheet, muut huomiot..."
            style={{ width: "100%", height: "60px", padding: "8px", boxSizing: "border-box" }}
          />
        </div>
        
        {/* Tallenna-nappi */}
        <button 
          onClick={tallennaPaikka}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "16px",
            backgroundColor: "#28a745", // Vihreä väri
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          ✅ Tallenna havainto
        </button>
      </div>
    </div>
  )
}

export default Kartta