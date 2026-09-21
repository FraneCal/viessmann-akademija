# Viessmann Akademija: prijave, certifikati i ankete

Web forma za prijavu polaznika seminara. Prijave idu u Google Sheet, a Google Apps Script iz njih automatski šalje anketu, generira PDF certifikat i podsjeća polaznike prije isteka certifikata.

## Kako radi

```
Polaznik ispuni formu (GitHub Pages)
        │
        ▼
doPost u code.gs upiše jedan redak po odabranom seminaru u Sheet
        │
        ├── nakon 24h ──► mail s anketom (samo jednom po prijavi)
        │
        ├── nakon 48h ──► PDF certifikat po seminaru, spremljen u Drive i poslan mailom
        │
        └── 30 i 14 dana prije isteka ──► podsjetnik za obnovu certifikata
```

Minutni okidač pokreće `checkAndSend`, koja obrađuje ankete i certifikate. Dnevni okidač u 07:00 pokreće `posaljiPodsjetnike`.

## Datoteke

| datoteka | gdje živi | što radi |
|---|---|---|
| `index.html` | GitHub Pages | markup forme |
| `styles.css` | GitHub Pages | stilovi |
| `script.js` | GitHub Pages | popis seminara, validacija (OIB, poštanski broj, telefon), slanje na Apps Script |
| `assets.js` | GitHub Pages | base64 slike i fontovi (vidi *Poznate stvari*) |
| `code.gs` | Apps Script | prijem prijava, slanje ankete i certifikata, izrada PDF-a |
| `podsjetnici.gs` | Apps Script, isti projekt | podsjetnici pred istek certifikata |

Sve četiri web datoteke moraju biti u istom direktoriju. `assets.js` se u `index.html` učitava prije `script.js`.

## Više seminara u jednoj prijavi

Polaznik može označiti više seminara odjednom. Za svaki odabrani seminar forma pita je li mu to prvo sudjelovanje, jer o tome ovisi valjanost.

Jedna prijava s 3 seminara upiše 3 retka. Svaki redak je kompletan, sa svim podacima polaznika, jer se certifikat generira iz podataka tog retka. Retci iz iste prijave imaju identičan **Datum prijave**.

| redak | Status certifikata | Status ankete |
|---|---|---|
| 1. seminar | pending | pending |
| 2. seminar | pending | Stop |
| 3. seminar | pending | Stop |

Rezultat: 3 certifikata, 1 anketa.

## Stupci u Sheetu

| stupac | napomena |
|---|---|
| Datum prijave | `dd.MM.yyyy. HH:mm`, od njega se računa 24h i 48h |
| Ime, Prezime, E-mail, Telefon | |
| Naziv tvrtke, OIB, Adresa, Grad, Postanski broj | |
| Seminar | jedan seminar po retku |
| Prvi put | `DA` = vrijedi 6 mjeseci, `NE` = vrijedi 2 godine |
| Pristanak | `DA` je uvjet i za anketu i za certifikat |
| Datum seminara | |
| Vrijedi do | računa se automatski, ide na certifikat i u podsjetnike |
| Status certifikata | vidi statuse ispod |
| Status ankete | vidi statuse ispod |
| Certifikat | link na PDF u Driveu, upisuje se nakon slanja |
| Podsjetnik 30d, Podsjetnik 14d | datum slanja podsjetnika, skripta ih kreira sama |

Skripta ne ovisi o redoslijedu stupaca, traži ih po nazivu.

## Statusi

Isti za oba stupca statusa:

| status | značenje |
|---|---|
| `pending` | čeka slanje |
| `u obradi` | skripta ga upravo šalje, rezervira red da ne ode dvaput |
| `sent` | poslano |
| `Stop` | preskoči ovaj red (velika i mala slova nisu bitna) |
| `error: ...` | greška kod slanja, poruka je upisana |
| prazno | skripta popuni sama pri sljedećem prolazu |

Prazna ćelija se popunjava ovako: prazan status certifikata postaje `pending`, prazan status ankete postaje `sent` ako je certifikat već poslan, inače `pending`. Za ponovno slanje upiši `pending`, ne briši ćeliju.

### Kontrola slanja

- Ne šalji jedan od certifikata: upiši `Stop` u **Status certifikata** tog retka.
- Pošalji samo anketu, bez certifikata: `Stop` u **Status certifikata**.
- Pošalji samo certifikat, bez ankete: `Stop` u **Status ankete**.
- Ponovno pošalji: upiši `pending`.

## Postavljanje

### 1. Apps Script

1. U Google Sheetu: **Extensions > Apps Script**.
2. Zalijepi `code.gs` i dodaj novu datoteku `podsjetnici.gs` u isti projekt.
3. U `code.gs` provjeri `SHEET_ID` i `SHEET_NAME`.
4. Pokreni `testDriveIds()` i provjeri da su sve slike `OK`.
5. **Deploy > New deployment > Web app**, Execute as: *Me*, Who has access: *Anyone*.
6. Kopiraj URL web aplikacije.

### 2. Okidači

- **Triggers > Add Trigger**: funkcija `checkAndSend`, Time-driven, Minutes timer, Every minute.
- Jednom ručno pokreni `postaviDnevniOkidac()` iz `podsjetnici.gs`. Kreira dnevni okidač za podsjetnike.

Provjeri da postoji **točno jedan** okidač za `checkAndSend`. Dva okidača znače duple mailove.

### 3. Forma

1. U `script.js` postavi `APPS_SCRIPT_URL` na URL iz koraka 1.6.
2. Uploadaj `index.html`, `styles.css`, `script.js` i `assets.js` na GitHub.
3. Uključi GitHub Pages za repozitorij.
4. Nakon svakog deploya osvježi s Ctrl+Shift+R, GitHub Pages kešira.

Kad mijenjaš `code.gs`, napravi **Deploy > Manage deployments > Edit > New version**. Samo spremanje ne ažurira web aplikaciju.

## Konfiguracija

### code.gs

| konstanta | vrijednost | što radi |
|---|---|---|
| `DELAY_ANKETA` | `24 * 3600` | koliko sekundi nakon prijave ide anketa |
| `DELAY_CERT` | `48 * 3600` | koliko sekundi nakon prijave ide certifikat |
| `VALIDITY_YRS` | `2` | valjanost ponovljenog certifikata u godinama |
| `GRAD` | `Zagreb` | grad na certifikatu |
| `IZDAO`, `POTPISNIK` | | imena na certifikatu |
| `ANKETA_URL` | | link za **ispunjavanje** ankete, ne za uređivanje forme |
| `FROM_EMAIL`, `FROM_NAME` | | pošiljatelj mailova |
| `CERT_FOLDER_ID` | prazno | prazno = skripta kreira mapu `CERT_FOLDER_NAME` |
| `FOLDER_DATUM` | `seminar` | datum u nazivu podmape, `seminar` ili `danas` |
| `HILITE_FONT`, `HILITE_W` | `Open Sans`, `1.098` | font boldanog teksta i njegova širina u odnosu na Roboto |
| `ID_TOOLS`, `ID_SIGN_*`, `ID_PECAT`, `ID_LOGO` | | Drive ID-evi slika za certifikat |

### podsjetnici.gs

| konstanta | vrijednost | što radi |
|---|---|---|
| `R_PRAG_30` | `30` | prvi podsjetnik kad je do isteka 15 do 30 dana |
| `R_PRAG_14` | `14` | drugi podsjetnik kad je do isteka 0 do 14 dana |
| `R_KONTAKT_MAIL` | | kontakt u tekstu podsjetnika |

### script.js

| konstanta | što radi |
|---|---|
| `APPS_SCRIPT_URL` | URL web aplikacije iz Apps Scripta |
| `SEMINARI` | popis seminara u formi, jedan redak po seminaru |

## Certifikat

Generira se u `code.gs` kroz Google Docs i exporta u PDF.

- A4, uvijek jedna stranica. Skripta prije crtanja simulira prelamanje teksta i prilagodi veličinu slike alata. Ako tekst ne stane, redom smanjuje razmake pa font (do 11 pt).
- Nakon exporta broji stranice u PDF-u. Ako ih je više od jedne, ponavlja izradu s većom rezervom, najviše 4 puta.
- Boldano (Open Sans, crno): ime i prezime, naziv seminara, trajanje i datum valjanosti. Ostatak je Roboto, sivo.
- PDF se sprema u `Viessmann certifikati/yyMMdd_Naziv seminara/Potvrda_Prezime_Ime.pdf`.

## Mailovi

| mail | kada | subject | privitak |
|---|---|---|---|
| anketa | 24h nakon prijave | Anketa o zadovoljstvu - Viessmann Akademija | ne |
| certifikat | 48h nakon prijave | Potvrda o sudjelovanju - Viessmann Akademija | PDF |
| podsjetnik | 30 i 14 dana prije isteka | Podsjetnik: istek certifikata - Viessmann Akademija | ne |

## Ručne funkcije

| funkcija | datoteka | kada |
|---|---|---|
| `testAnketa()` | code.gs | pošalji dospjele ankete odmah, bez čekanja okidača |
| `testCertifikat()` | code.gs | pošalji dospjele certifikate odmah |
| `testSend()` | code.gs | oboje |
| `resetErrorRows()` | code.gs | vrati `error` i zaglavljene `u obradi` retke na `pending` |
| `migracijaStupaca()` | code.gs | jednokratno popuni `Vrijedi do` za stare retke |
| `testDriveIds()` | code.gs | provjeri da su sve slike dostupne |
| `testPodsjetnici()` | podsjetnici.gs | ispiši u log kome bi otišao podsjetnik, ništa ne šalje |
| `posaljiPodsjetnike()` | podsjetnici.gs | pošalji podsjetnike odmah |
| `postaviDnevniOkidac()` | podsjetnici.gs | jednom, pri postavljanju |

## Problemi

**Dva ista maila u razmaku od minute.** Provjeri da postoji samo jedan okidač za `checkAndSend`. Skripta ima zaštitu (LockService + status `u obradi`), ali dva okidača je i dalje zaobilaze.

**Redak zapeo na `u obradi`.** Izvršavanje je puklo na pola, najčešće timeout. Pokreni `resetErrorRows()`.

**Anketa nikad ne ode.** Provjeri **Pristanak**. Ako je `NE`, ni anketa ni certifikat ne idu.

**Certifikat u Arialu umjesto Robota ili Open Sansa.** Docs nije prepoznao font. Prelamanje više ne odgovara izračunu, pa se provjeri PDF.

**Forma bez stilova ili gumb ne reagira.** Nisu uploadane sve četiri datoteke, ili preglednik vuče staru verziju iz keša.

**Promjene u code.gs ne djeluju na formu.** Web aplikacija nije redeployana kao nova verzija.

**Log kaže `poslano: 0`, a u Sheetu piše `sent`.** Okidač je poslao prije ručnog pokretanja. Provjeri Executions i Gmail > Poslano.

## Poznate stvari

`script.js` sadrži funkciju `buildPdf` koja nikad nije pozvana. Certifikati se rade na serveru u `code.gs`. Zbog nje forma učitava `assets.js` od 2 MB i dvije pdf-lib biblioteke bez razloga. Brisanjem `buildPdf`, `assets.js` i dva pdf-lib `<script>` taga stranica pada s ~2 MB na ~15 KB.
