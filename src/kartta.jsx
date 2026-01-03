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
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore' 

// Apukomponentti kartan keskittämiseen
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
  const [vesisto, setVesisto] = useState("")
  const [kommentti, setKommentti] = useState("")
  const [valitutKalat, setValitutKalat] = useState([]) 
  const [ladataanOsoitetta, setLadataanOsoitetta] = useState(false)

  // --- MUOKKAUSTILA ---
  const [muokattavaId, setMuokattavaId] = useState(null) 
  const [muokkausData, setMuokkausData] = useState({})   

  // 1. Osoitteenhaku (Vieläkin paranneltu versio)
  const haeOsoite = async (lat, lon) => {
    setLadataanOsoitetta(true)
    // Tyhjennetään vanha, jotta käyttäjä huomaa haun olevan käynnissä
    setVesisto("") 

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
      const data = await response.json()
      
      console.log("Osoitehaku palautti:", data)

      // Yritetään löytää paras mahdollinen nimi
      let paikanNimi = data.address.water || 
                       data.address.natural || 
                       data.address.island || 
                       data.address.village || 
                       data.address.town || 
                       data.address.city || 
                       data.address.municipality || 
                       data.address.suburb ||       
                       data.address.neighbourhood || 
                       data.address.road;

      // HÄTÄVARA: Jos mikään yllä olevista ei tärppää, otetaan "display_name":n ensimmäinen osa
      // Esim. jos data on "Prisma, Aleksanterinkatu...", otetaan "Prisma"
      if (!paikanNimi && data.display_name) {
        paikanNimi = data.display_name.split(",")[0];
      }

      // Jos vieläkään ei löydy, laitetaan koordinaatit
      if (!paikanNimi) {
        paikanNimi = "Tuntematon sijainti"
      }
      
      setVesisto(paikanNimi)

    } catch (err) {
      console.error("Osoitteen haku ei onnistunut", err)
      setVesisto("Ei osoitetietoa")
    }
    setLadataanOsoitetta(false)
  }

  // 2. Haetaan käyttäjän sijainti
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lon = position.coords.longitude
          setSijainti([lat, lon])
          haeOsoite(lat, lon)
        },
        (error) => {
          console.log("Ei sijaintia, käytetään Lahtea.")
          const lahti = [60.9827, 25.6612]
          setSijainti(lahti) 
          haeOsoite(lahti[0], lahti[1])
        }
      )
    } else {
      const lahti = [60.9827, 25.6612]
      setSijainti(lahti)
      haeOsoite(lahti[0], lahti[1])
    }
  }, [])

  // 3. Haetaan tallennetut paikat ja kalalajit
  useEffect(() => {
    const haeTiedot = async () => {
      // Paikat
      const querySnapshot = await getDocs(collection(db, "kalapaikat"))
      const haetutPaikat = []
      querySnapshot.forEach((doc) => {
        haetutPaikat.push({ id: doc.id, ...doc.data() })
      })
      setPaikat(haetutPaikat)

      // Kalalajit
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

  // --- LOGIIKKA: Uusi paikka ---
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
    // Jos vesistö on vielä "latautuu", käytetään tyhjää tai tekstiä "Haku kesken"
    const tallennettavaVesisto = ladataanOsoitetta ? "Sijaintia haetaan..." : vesisto

    const uusiPaikka = {
      lat: sijainti[0],
      lon: sijainti[1],
      nimi: tallennettavaNimi,
      vesisto: tallennettavaVesisto,
      kommentti: kommentti,
      kalat: valitutKalat, 
      pvm: new Date().toISOString() 
    }

    try {
      const docRef = await addDoc(collection(db, "kalapaikat"), uusiPaikka);
      setPaikat([...paikat, { id: docRef.id, ...uusiPaikka }])
      setNimi("") 
      setKommentti("")
      setValitutKalat([])
      // Emme tyhjennä vesistöä kokonaan, jotta se pysyy näkyvissä seuraavaa varten
      alert("Havainto tallennettu! 🐟")
    } catch (virhe) {
      console.error("Tallennus epäonnistui:", virhe)
      alert("Tallennus epäonnistui.")
    }
  }

  // --- LOGIIKKA: Muokkaus ---
  const aloitaMuokkaus = (paikka) => {
    setMuokattavaId(paikka.id)
    setMuokkausData({ ...paikka }) 
  }

  const hallitseMuokkausKaloja = (kala) => {
    const nykyiset = muokkausData.kalat || []
    if (nykyiset.includes(kala)) {
      setMuokkausData({
        ...muokkausData,
        kalat: nykyiset.filter(k => k !== kala)
      })
    } else {
      setMuokkausData({
        ...muokkausData,
        kalat: [...nykyiset, kala]
      })
    }
  }

  const tallennaMuokkaus = async () => {
    try {
      const paikkaRef = doc(db, "kalapaikat", muokattavaId)
      await updateDoc(paikkaRef, {
        nimi: muokkausData.nimi,
        vesisto: muokkausData.vesisto,
        kommentti: muokkausData.kommentti,
        kalat: muokkausData.kalat
      })
      const paivitettyLista = paikat.map(p => 
        p.id === muokattavaId ? { ...p, ...muokkausData } : p
      )
      setPaikat(paivitettyLista)
      setMuokattavaId(null) 
    } catch (virhe) {
      console.error("Päivitys epäonnistui:", virhe)
      alert("Virhe päivityksessä.")
    }
  }

  const poistaPaikkaKartalta = async (id) => {
    if (window.confirm("Haluatko varmasti poistaa tämän paikan?")) {
      try {
        await deleteDoc(doc(db, "kalapaikat", id))
        setPaikat(paikat.filter(p => p.id !== id))
      } catch (virhe) {
        console.error("Poisto epäonnistui:", virhe)
      }
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
              <Popup>📍 Olet tässä: <br/> {vesisto || "Haetaan sijaintia..."}</Popup>
            </Marker>
            <SiirraKartta koordinaatit={sijainti} />
          </>
        )}

        {paikat.map((paikka) => (
          <Marker key={paikka.id} position={[paikka.lat, paikka.lon]}>
            <Popup minWidth={250}>
              {muokattavaId === paikka.id ? (
                // MUOKKAUSLOMAKE
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <strong>Muokkaa havaintoa</strong>
                  <input 
                    type="text" 
                    value={muokkausData.nimi} 
                    onChange={(e) => setMuokkausData({...muokkausData, nimi: e.target.value})}
                    placeholder="Nimi"
                  />
                  <input 
                    type="text" 
                    value={muokkausData.vesisto} 
                    onChange={(e) => setMuokkausData({...muokkausData, vesisto: e.target.value})}
                    placeholder="Vesistö"
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                    {kalalajit.map(kala => (
                       <label key={kala} style={{ fontSize: '0.8em', display: 'flex', alignItems: 'center', marginRight: '5px' }}>
                         <input 
                           type="checkbox" 
                           checked={(muokkausData.kalat || []).includes(kala)}
                           onChange={() => hallitseMuokkausKaloja(kala)}
                         /> {kala}
                       </label>
                    ))}
                  </div>
                  <textarea 
                    value={muokkausData.kommentti} 
                    onChange={(e) => setMuokkausData({...muokkausData, kommentti: e.target.value})}
                    placeholder="Kommentti"
                    style={{ fontSize: '0.9em' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                    <button onClick={tallennaMuokkaus} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '5px', borderRadius: '3px', cursor: 'pointer' }}>Tallenna</button>
                    <button onClick={() => setMuokattavaId(null)} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '5px', borderRadius: '3px', cursor: 'pointer' }}>Peruuta</button>
                  </div>
                </div>
              ) : (
                // NORMAALI NÄKYMÄ
                <div>
                  <h3 style={{ margin: "0 0 5px 0" }}>{paikka.nimi}</h3>
                  {paikka.vesisto && <div style={{ fontStyle: "italic", marginBottom: "5px" }}>📍 {paikka.vesisto}</div>}
                  <div style={{ fontSize: "0.85em", color: "#666" }}>{new Date(paikka.pvm).toLocaleDateString()}</div>
                  {paikka.kalat && paikka.kalat.length > 0 && (
                    <div style={{ margin: "5px 0", color: "#007bff", fontWeight: "bold" }}>
                      🐟 {paikka.kalat.join(", ")}
                    </div>
                  )}
                  {paikka.kommentti && (
                    <div style={{ backgroundColor: "#f1f1f1", padding: "5px", borderRadius: "4px", margin: "5px 0", fontStyle: "italic" }}>
                      "{paikka.kommentti}"
                    </div>
                  )}
                  <div style={{ marginTop: "10px", display: "flex", gap: "5px" }}>
                    <button 
                      onClick={() => aloitaMuokkaus(paikka)}
                      style={{ backgroundColor: "#007bff", color: "white", border: "none", padding: "5px 10px", borderRadius: "3px", cursor: "pointer" }}
                    >
                      ✏️ Muokkaa
                    </button>
                    <button 
                      onClick={() => poistaPaikkaKartalta(paikka.id)}
                      style={{ backgroundColor: "#dc3545", color: "white", border: "none", padding: "5px 10px", borderRadius: "3px", cursor: "pointer" }}
                    >
                      🗑️ Poista
                    </button>
                  </div>
                </div>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* --- UUSI HAVAINTO --- */}
      <div style={{ margin: "15px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px", border: "1px solid #ddd" }}>
        <h3 style={{ marginTop: 0, color: "#333" }}>Uusi havainto</h3>
        
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", fontWeight: "bold", color: "#333" }}>Paikan nimi:</label>
          <input 
            type="text" 
            value={nimi}
            onChange={(e) => setNimi(e.target.value)}
            placeholder="esim. Hyvä haukipaikka"
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", fontWeight: "bold", color: "#333" }}>
            Vesistö / Sijainti:
          </label>
          <input 
            type="text" 
            value={ladataanOsoitetta ? "Haetaan osoitetta..." : vesisto}
            onChange={(e) => setVesisto(e.target.value)}
            disabled={ladataanOsoitetta}
            placeholder="Haetaan automaattisesti..."
            style={{ 
              width: "100%", 
              padding: "8px", 
              boxSizing: "border-box", 
              backgroundColor: ladataanOsoitetta ? "#e9ecef" : "white",
              color: ladataanOsoitetta ? "#666" : "#000",
              fontStyle: ladataanOsoitetta ? "italic" : "normal"
            }}
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
          style={{ width: "100%", padding: "12px", fontSize: "16px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
        >
          ✅ Tallenna havainto
        </button>
      </div>
    </div>
  )
}

export default Kartta