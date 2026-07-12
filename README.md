# Viessmann Akademija - Upitnik i certifikat

Web aplikacija za prijavu polaznika stručnih seminara. Korisnik skenira QR kod, ispunjava upitnik, a sustav automatski generira PDF potvrdu i šalje je e-mailom.

## Kako radi

```
Korisnik skenira QR kod
        |
    index.html (GitHub Pages)
        |
    Google Apps Script
        |
    Google Sheets (sprema prijavu)
        |
    Time-driven trigger (svake minute)
        |
    Generira PDF (Google Docs)
        |
    Gmail (šalje potvrdu)
```

## Postavke u Apps Scriptu

Na vrhu `Code.gs` nalaze se sve konfiguracijske varijable:

| Varijabla | Opis |
|---|---|
| `SHEET_ID` | ID Google Sheeta |
| `DELAY_SEC` | Odgoda slanja u sekundama (60 = 1 min, 43200 = 12h) |
| `IZDAO` | Ime osobe koja izdaje certifikat |
| `POTPISNIK` | Ime potpisnika |
| `SKOLOVANJE` | Tekst retka o školovanju |
| `VALIDITY_YRS` | Valjanost certifikata u godinama |
| `GRAD` | Grad izdavanja |


Prijave bez pristanka (`Pristanak = NE`) se upisuju u Sheet ali certifikat se ne šalje.

Za ponovni pokušaj greške: u Sheetu postavi Status natrag na `pending` i pričekaj sljedeći okidač.
