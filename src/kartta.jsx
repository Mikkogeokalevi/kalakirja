import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { db } from './firebase'
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore' 

// --- POMMINVARMA KUVAKORJAUS ---
// Haetaan kuvat suoraan Leafletin palvelimelta, jotta build ei riko niitä
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;
// -------------------------------

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

  const [nimi, setNimi] = useState("")
  const [vesisto, setVesisto] = useState("")
  const [kommentti, setKommentti] = useState("")
  const [valitutKalat, setValitutKalat] = useState([]) 
  const [ladataanOsoitetta, setLadataanOsoitetta] = useState(false)

  const [muokattavaId, setMuokattavaId] = useState(null) 
  const [muokkausData, setMuokkausData] = useState({})   

  const haeOsoite = async (lat, lon) => {
    setLadataanOsoitetta(true)
    setVesisto("") 
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
      const data = await response.json()
      let paikanNimi = data.address.water || data.address.village || data.address.town || data.address.city || data.address.municipality || data.address.road;
      if (!paikanNimi && data.display_name) paikanNimi = data.display_name.split(",")[0];
      if (!paikanNimi) paikanNimi = "Tuntematon sijainti"
      setVesisto(paikanNimi)
    } catch (err) {
      console.error(err)
      setVesisto("Ei osoitetietoa")
    }
    setLadataanOsoitetta(false)
  }

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = [pos.coords.latitude, pos.coords.longitude]
          setSijainti(loc)
          haeOsoite(loc[0], loc[1])
        },
        () => {
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

  useEffect(() => {
    const hae = async () => {
      const snap = await getDocs(collection(db, "kalapaikat"))
      const p = []
      snap.forEach((d) => p.push({ id: d.id, ...d.data() }))
      setPaikat(p)

      const dRef = doc(db, "asetukset", "kalalajit")
      const dSnap = await getDoc(dRef)
      if (dSnap.exists()) setKalalajit(dSnap.data().lista)
    }
    hae()
  }, []) 

  const hallitseKalavalintaa = (kala) => {
    if (valitutKalat.includes(kala)) setValitutKalat(valitutKalat.filter(k => k !== kala))
    else setValitutKalat([...valitutKalat, kala])
  }

  const tallennaPaikka = async () => {
    if (!sijainti) return
    const uusi = {
      lat: sijainti[0], lon: sijainti[1],
      nimi: nimi.trim() || "Nimetön",
      vesisto: ladataanOsoitetta ? "Haetaan..." : vesisto,
      kommentti, kalat: valitutKalat, pvm: new Date().toISOString() 
    }
    const ref = await addDoc(collection(db, "kalapaikat"), uusi);
    setPaikat([...paikat, { id: ref.id, ...uusi }])
    setNimi(""); setKommentti(""); setValitutKalat([])
    alert("Tallennettu!")
  }

  const tallennaMuokkaus = async () => {
    await updateDoc(doc(db, "kalapaikat", muokattavaId), muokkausData)
    setPaikat(paikat.map(p => p.id === muokattavaId ? { ...p, ...muokkausData } : p))
    setMuokattavaId(null)
  }

  const poista = async (id) => {
    if (window.confirm("Poistetaanko?")) {
      await deleteDoc(doc(db, "kalapaikat", id))
      setPaikat(paikat.filter(p => p.id !== id))
    }
  }

  return (
    <div style={{ paddingBottom: "50px" }}> 
      <MapContainer center={[64.0, 26.0]} zoom={5} style={{ height: "400px", width: "100%" }}>
        <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {sijainti && <Marker position={sijainti}><Popup>Olet tässä: {vesisto}</Popup></Marker>}
        {sijainti && <SiirraKartta koordinaatit={sijainti} />}
        {paikat.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lon]}>
            <Popup minWidth={250}>
              {muokattavaId === p.id ? (
                <div>
                  <input value={muokkausData.nimi} onChange={e=>setMuokkausData({...muokkausData,nimi:e.target.value})} placeholder="Nimi"/>
                  <button onClick={tallennaMuokkaus}>Tallenna</button>
                  <button onClick={()=>setMuokattavaId(null)}>Peru</button>
                </div>
              ) : (
                <div>
                  <h3>{p.nimi}</h3>
                  <i>{p.vesisto}</i>
                  <br/>
                  <button onClick={()=>{setMuokattavaId(p.id);setMuokkausData({...p})}}>✏️</button>
                  <button onClick={()=>poista(p.id)}>🗑️</button>
                </div>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div style={{ margin: "15px", padding: "15px", backgroundColor: "#eee" }}>
        <h3>Uusi havainto</h3>
        <input value={nimi} onChange={e=>setNimi(e.target.value)} placeholder="Paikan nimi" style={{width:"100%",marginBottom:10,padding:8}}/>
        <input value={ladataanOsoitetta?"Haetaan...":vesisto} onChange={e=>setVesisto(e.target.value)} placeholder="Vesistö" style={{width:"100%",marginBottom:10,padding:8}}/>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
          {kalalajit.map(k=><label key={k}><input type="checkbox" checked={valitutKalat.includes(k)} onChange={()=>hallitseKalavalintaa(k)}/>{k}</label>)}
        </div>
        <button onClick={tallennaPaikka} style={{width:"100%",padding:10,background:"green",color:"white",border:"none"}}>Tallenna</button>
      </div>
    </div>
  )
}
export default Kartta