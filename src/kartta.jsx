import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import { db } from './firebase'
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore' 

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});
L.Marker.prototype.options.icon = DefaultIcon;

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
  const [kalalajit, setKalalajit] = useState(["Ahven", "Hauki"]) 

  // --- LOMAKKEEN TIEDOT ---
  const [nimi, setNimi] = useState("")
  const [vesisto, setVesisto] = useState("") // Tähän tulee automaattinen nimi
  const [kommentti, setKommentti] = useState("")
  const [valitutKalat, setValitutKalat] = useState([]) 
  const [ladataanOsoitetta, setLadataanOsoitetta] = useState(false)

  // 1. UUSI: Funktio joka hakee vesistön nimen
  const haeOsoite = async (lat, lon) => {
    setLadataanOsoitetta(true)
    try {
      // Kysytään OpenStreetMapin "Nominatim"-palvelusta
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
      const data = await response.json()
      
      // Yritetään löytää järkevä nimi (vesistö, kylä, kunta...)
      const paikanNimi = data.address.water || 
                         data.address.village || 
                         data.address.city || 
                         data.address.town || 
                         data.address.municipality || 
                         ""
      
      if (paikanNimi) {
        setVesisto(paikanNimi)
      }
    } catch (err) {
      console.error("Osoitteen haku ei onnistunut", err)
    }
    setLadataanOsoitetta(false)
  }

  // 2. Haetaan sijainti ja heti perään osoite
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lon = position.coords.longitude
          setSijainti([lat, lon])
          // Kutsutaan automaattihakua
          haeOsoite(lat, lon)
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
    const haeTiedot = async () => {
      const querySnapshot = await getDocs(collection(db, "kalapaikat"))
      const haetutPaikat = []
      querySnapshot.forEach((doc) => {
        haetutPaikat.push({ id: doc.id, ...doc.data() })
      })
      setPaikat(haetutPaikat)

      try {
        const docRef = doc(db, "asetukset", "kalalajit")
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setKalalajit(docSnap.data().lista)
        } else {
          setKalalajit(["Ahven", "Hauki", "Kuha", "Siika", "Lohi"])
        }
      } catch (virhe) {
        console.error("Virhe lajien haussa:", virhe)
      }
    }
    haeTiedot()
  }, []) 

  const hallitseKalavalintaa = (kala) => {
    if (valitutKalat.includes(kala)) {
      setValitutKalat(valitutKalat.filter(k => k !== kala))
    } else {
      setValitutKalat([...valitutKalat, kala])
    }
  }

  const tallennaPaikka = async () => {
    if (!sijainti) return

    const tallennettavaNimi = nimi.trim() !== "" ? nimi : "Nimetön paikka"

    const uusiPaikka = {
      lat: sijainti[0],
      lon: sijainti[1],
      nimi: tallennettavaNimi,
      vesisto: vesisto,
      kommentti: kommentti,
      kalat: valitutKalat, 
      pvm: new Date().toISOString() 
    }

    try {
      const docRef = await addDoc(collection(db, "kalapaikat"), uusiPaikka);
      setPaikat([...paikat, { id: docRef.id, ...uusiPaikka }])

      setNimi("") 
      setVesisto("") // Tyhjennetään, mutta GPS voi hakea sen uudestaan jos ladataan sivu
      setKommentti("")
      setValitutKalat([])

      alert("Havainto tallennettu! 🐟")

    } catch (virhe) {
      console.error("Virhe tallennuksessa:", virhe)
      alert("Tallennus epäonnistui.")
    }
  }

  return (
    <div style={{ paddingBottom: "50px" }}> 
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
        
        <h3 style={{ marginTop: 0, color: "#333" }}>Uusi havainto</h3>
        
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", fontWeight: "bold", color: "#333" }}>Paikan nimi:</label>
          <input 
            type="text" 
            value={nimi}
            onChange={(e) => setNimi(e.target.value)}
            placeholder="esim. Kuhanuistelupaikka"
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", fontWeight: "bold", color: "#333" }}>
            Vesistö {ladataanOsoitetta && <span style={{fontWeight:"normal", fontSize:"0.8em"}}>(Haetaan...)</span>}:
          </label>
          <input 
            type="text" 
            value={vesisto}
            onChange={(e) => setVesisto(e.target.value)}
            placeholder="Haetaan automaattisesti..."
            style={{ width: "100%", padding: "8px", boxSizing: "border-box", backgroundColor: ladataanOsoitetta ? "#eee" : "white" }}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: "5px", color: "#333" }}>Saadut kalat:</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {kalalajit.map((laji) => (
              <label key={laji} style={{ display: "flex", alignItems: "center", cursor: "pointer", backgroundColor: "white", padding: "5px 10px", borderRadius: "15px", border: "1px solid #ccc", color: "#333" }}>
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

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", fontWeight: "bold", color: "#333" }}>Kommentit:</label>
          <textarea 
            value={kommentti}
            onChange={(e) => setKommentti(e.target.value)}
            placeholder="Sää, vieheet, muut huomiot..."
            style={{ width: "100%", height: "60px", padding: "8px", boxSizing: "border-box" }}
          />
        </div>
        
        <button 
          onClick={tallennaPaikka}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "16px",
            backgroundColor: "#28a745",
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