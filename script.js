// Upitnik - Viessmann Akademija: logika forme, validacija i slanje.
// Base64 assets (TOOLS_B64, SIGN_B64, FONT_B64, FONT_BOLD_B64) su u assets.js,
// koji se ucitava PRIJE ove datoteke.
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw6HbueSHeHTzj88Q-uFOQONL0_V8-feoyWjpkmFNHVpBZle5mkSmWHYtJ9LrTI8p0E/exec";
const IZDAO          = "Marin Antunovic";
const POTPISNIK      = "Bacc.ing.techn. Stjepan Mikleusevic";
const SKOLOVANJE     = "Skolovanje za servis Vitodens, Vitocrossal, Vitomax, Vitorondens, Vitoplex";
const VALIDITY_YEARS = 2;
const GRAD_IZDAVANJA = "Zagreb";


/* --- Popis seminara. Dodajes/mijenjas samo ovdje. --- */
const SEMINARI = [
  "Servis, puštanje u pogon i godišnji servisni pregledi Viessmann plinskih kondenzacijskih uređaja snage do 150 kW",
  "Servis, puštanje u pogon i godišnji servisni pregledi Viessmann plinskih kondenzacijskih kotlova srednje i velike snage (iznad 150 kW)",
  "Servis, puštanje u pogon i godišnji servisni pregledi Viessmann dizalica topline snage do 20 kW",
  "Servis, puštanje u pogon i godišnji servisni pregledi Carrier dizalica topline snage do 20 kW",
  "Servis, puštanje u pogon i godišnji servisni pregledi Viessmann dizalica topline srednje i velike snage (iznad 20 kW)",
  "Servis, puštanje u pogon i godišnji servisni pregledi Carrier dizalica topline srednje i velike snage (iznad 20 kW)",
  "Servis, puštanje u pogon i godišnji servisni pregledi Viessmann solarnog sustava"
];

const $ = id => document.getElementById(id);
const val = id => $(id).value.trim();

function fmtDate(d) {
  const p = n => String(n).padStart(2,"0");
  return `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()}.`;
}
function addYears(d,y) { const n=new Date(d); n.setFullYear(n.getFullYear()+y); return n; }
function b64ToBytes(b64) {
  const bin=atob(b64); const out=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out;
}
function wrapText(text,font,size,maxW) {
  const words=(text||"").split(/\s+/).filter(Boolean);
  const lines=[]; let cur="";
  for(const w of words){
    const t=cur?cur+" "+w:w;
    if(font.widthOfTextAtSize(t,size)>maxW&&cur){lines.push(cur);cur=w;}else cur=t;
  }
  if(cur)lines.push(cur); return lines.length?lines:[""];
}

async function buildPdf(row) {
  const {PDFDocument,rgb,degrees}=PDFLib;
  const pdf=await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const reg  = await pdf.embedFont(b64ToBytes(FONT_B64),     {subset:true});
  const bold = await pdf.embedFont(b64ToBytes(FONT_BOLD_B64),{subset:true});
  const toolsImg = await pdf.embedPng(b64ToBytes(TOOLS_B64));
  const signImg  = await pdf.embedPng(b64ToBytes(SIGN_B64));

  const [W,H]=[595.28,841.89];
  const page=pdf.addPage([W,H]);
  const left=175, maxW=W-left-55;
  const TEXT=rgb(0.13,0.13,0.13), RED=rgb(0.86,0.14,0.12), GREY=rgb(0.74,0.74,0.74);

  page.drawText("Potvrda",{x:96,y:H-360,size:46,font:reg,color:GREY,rotate:degrees(90)});
  page.drawImage(toolsImg,{x:left,y:H-415,width:300,height:300});

  const semDate=new Date(row.datum+"T00:00:00");
  const validTo=addYears(semDate,VALIDITY_YEARS);
  let y=H-415-20;

  const line=(t,f=reg,s=11,gap=16,color=TEXT)=>{page.drawText(t,{x:left,y,size:s,font:f,color});y-=gap;};
  const wrapped=(t,f=reg,s=11,gap=15)=>{for(const ln of wrapText(t,f,s,maxW))line(ln,f,s,gap);};

  line(`${GRAD_IZDAVANJA}, ${fmtDate(semDate)}`,reg,10,26);
  line(`Gospodin: ${row.ime} ${row.prezime}`);
  if(row.naziv_tvrtke) line(`Tvrtka: ${row.naziv_tvrtke}`);
  const adr=[row.adresa,[row.postanski_broj,row.grad].filter(Boolean).join(" ")]
    .filter(s=>s&&s.trim()).join(", ");
  if(adr) line(adr);
  y-=12;
  wrapped(`sudjelovao je dana ${fmtDate(semDate)} na strucnom seminaru:`);
  wrapped(row.seminar,bold);
  y-=12;
  line(`Valjanost:  ${VALIDITY_YEARS} godine, ${fmtDate(validTo)}`);
  wrapped(SKOLOVANJE);
  y-=22;
  line(`Izdao: ${IZDAO}`,reg,11,8);
  const sw=130, sh=sw*(signImg.height/signImg.width);
  page.drawImage(signImg,{x:left,y:y-sh-2,width:sw,height:sh});
  y-=sh+6;
  line(POTPISNIK);
  page.drawText("VIESSMANN",{x:55,y:48,size:20,font:bold,color:RED});

  return await pdf.save();
}

function showErr(t){$("err").textContent=t;$("err").style.display="block";}

/* --- OIB: ISO 7064, MOD 11,10 (sluzbeni algoritam) --- */
function oibIspravan(v){
  if(!/^[0-9]{11}$/.test(v)) return false;
  let a=10;
  for(let i=0;i<10;i++){
    a=(a+Number(v[i]))%10;
    if(a===0) a=10;
    a=(a*2)%11;
  }
  let k=11-a;
  if(k===10) k=0;
  return k===Number(v[10]);
}

/* --- OIB: samo brojke + provjera uzivo --- */
const oibEl=$("oib"), oibMsg=$("oibMsg");
function provjeriOib(){
  const v=oibEl.value;
  oibEl.classList.remove("ok","bad");
  oibMsg.className="fmsg";
  if(!v){ oibMsg.textContent=""; return; }
  if(v.length<11){
    oibMsg.textContent="Uneseno "+v.length+" od 11 znamenki.";
    oibMsg.classList.add("neutral");
    return;
  }
  if(oibIspravan(v)){
    oibEl.classList.add("ok");
    oibMsg.textContent="OIB je ispravan \u2713";
    oibMsg.classList.add("ok");
  } else {
    oibEl.classList.add("bad");
    oibMsg.textContent="OIB nije ispravan, provjerite znamenke.";
    oibMsg.classList.add("bad");
  }
}
oibEl.addEventListener("input",e=>{
  e.target.value=e.target.value.replace(/[^0-9]/g,"").slice(0,11);
  provjeriOib();
});
oibEl.addEventListener("blur",provjeriOib);

/* --- Postanski broj: samo brojke --- */
const pbEl=$("postanski_broj");
pbEl.addEventListener("input",e=>{
  e.target.value=e.target.value.replace(/[^0-9]/g,"").slice(0,5);
});

/* --- Telefon: brojke, razmak, +, - i zagrade --- */
$("telefon").addEventListener("input",e=>{
  e.target.value=e.target.value.replace(/[^0-9+\-\s()]/g,"");
});

/* --- Iscrtavanje popisa seminara s checkboxima --- */
function nacrtajSeminare() {
  const wrap = $("seminari");
  wrap.innerHTML = SEMINARI.map((naziv, i) => `
    <div class="sem" id="sem${i}">
      <label class="sem-row">
        <input type="checkbox" class="sem-cb" data-i="${i}"/>
        <span>${naziv}</span>
      </label>
      <div class="sem-pp hide" id="pp${i}">
        Prvo sudjelovanje na ovom seminaru?
        <label class="opt"><input type="radio" name="pp${i}" value="DA"/> Da</label>
        <label class="opt"><input type="radio" name="pp${i}" value="NE"/> Ne</label>
      </div>
    </div>`).join("");

  wrap.insertAdjacentHTML("beforeend", '<div class="sem-count" id="semCount"></div>');

  wrap.querySelectorAll(".sem-cb").forEach(cb => {
    cb.addEventListener("change", () => {
      const i = cb.dataset.i;
      $("sem" + i).classList.toggle("on", cb.checked);
      $("pp" + i).classList.toggle("hide", !cb.checked);
      if (!cb.checked) {
        document.getElementsByName("pp" + i).forEach(r => r.checked = false);
      }
      osvjeziBrojac();
    });
  });
  osvjeziBrojac();
}

function osvjeziBrojac() {
  const n = odabraniSeminari().length;
  $("semCount").textContent = n === 0 ? "" :
    n === 1 ? "Odabran 1 seminar, izdaje se 1 potvrda." :
              "Odabrano " + n + " seminara, izdaje se " + n + " potvrda.";
}

/* Vraca [{seminar, prvi_put}] za sve oznacene seminare. */
function odabraniSeminari() {
  const out = [];
  document.querySelectorAll(".sem-cb").forEach(cb => {
    if (!cb.checked) return;
    const i = cb.dataset.i;
    const r = document.querySelector('input[name="pp' + i + '"]:checked');
    out.push({ seminar: SEMINARI[i], prvi_put: r ? r.value : "" });
  });
  return out;
}

nacrtajSeminare();

$("f").addEventListener("submit", async e => {
  e.preventDefault();
  $("err").style.display="none";
  const ime=val("ime"),prezime=val("prezime"),email=val("email");
  const telefon=val("telefon"),naziv=val("naziv_tvrtke"),oib=val("oib");
  const adresa=val("adresa"),grad=val("grad"),postanski=val("postanski_broj");
  const seminari=odabraniSeminari();

  if(!ime||!prezime||!email||!telefon||!naziv||!oib||!adresa||!grad||!postanski)
    return showErr("Sva polja su obavezna.");
  if(seminari.length===0)
    return showErr("Odaberite barem jedan seminar.");
  const bezOdgovora=seminari.filter(s=>!s.prvi_put);
  if(bezOdgovora.length)
    return showErr("Za svaki odabrani seminar odgovorite je li to Vaše prvo sudjelovanje.");
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return showErr("E-mail nije u ispravnom formatu (primjer: ime@domena.hr).");
  if(!oibIspravan(oib)){
    provjeriOib();
    oibEl.focus();
    return showErr("OIB nije ispravan. Provjerite unesenih 11 znamenki.");
  }
  if(!/^[0-9]+$/.test(postanski))
    return showErr("Poštanski broj smije sadržavati samo brojeve.");

  $("btn").disabled=true;
  $("btn").innerHTML='<span class="spinner"></span>Šaljem...';

  const datum=new Date().toISOString().slice(0,10);
  const row={
    ime,prezime,email,
    telefon:val("telefon"),
    naziv_tvrtke:val("naziv_tvrtke"),
    oib:val("oib"),
    adresa:val("adresa"),
    grad:val("grad"),
    postanski_broj:val("postanski_broj"),
    seminari,                                  // [{seminar, prvi_put}, ...]
    seminar:seminari[0].seminar,               // za stariju verziju skripte
    prvi_put:seminari[0].prvi_put,
    pristanak:$("pristanak").checked?"DA":"NE",
    datum,
    created_at:new Date().toISOString(),
  };

  try {
    await fetch(APPS_SCRIPT_URL,{method:"POST",body:JSON.stringify(row),mode:"no-cors"});
  } catch(ex) {
    $("btn").disabled=false;$("btn").textContent="Pošalji";
    return showErr("Greška pri slanju. Pokušajte ponovno.");
  }

  $("f").style.display="none";
  if($("pristanak").checked && seminari.length>1)
    $("doneMsg").textContent="Zaprimili smo Vaše podatke. Izdat ćemo " + seminari.length +
      " zasebne potvrde, a anketu šaljemo samo jednom.";
  if(!$("pristanak").checked)
    $("doneMsg").textContent="Zaprimili smo Vaše podatke. Bez pristanka za certifikat potvrda se ne izdaje.";
  $("done").style.display="block";
  window.scrollTo({top:0,behavior:"smooth"});
});
