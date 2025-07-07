# Kite AI Auto Interaction Bot

Skrip otomatisasi interaksi untuk platform [Kite AI Testnet](https://testnet.gokite.ai), dengan dukungan multi-wallet, login otomatis, dan interaksi berbasis persona AI.

---

## 🚀 Fitur

- 🔐 Autentikasi otomatis ke Kite AI dengan wallet Ethereum (EOA)
- 🧠 Dukungan 3 persona: `Professor`, `CryptoBuddy`, dan `Sherlock`
- 📡 Multi-wallet interaction (menggunakan `privatekey.txt`)
- 🔄 Interaksi otomatis berdasarkan prompt dari `agent.txt`
- 🔁 Pengulangan interaksi sesuai input user
- 📑 Log berwarna untuk feedback yang informatif
- ✅ Pengambilan dan cetak profil user (EOA, Smart Account, XP)
- 🔒 Enkripsi address sebelum login (AES-256-GCM)

---

## 📁 Struktur File

```bash
.
├── privatekey.txt     # Daftar private key (1 baris 1 key)
├── agent.txt          # Prompt AI per persona
├── kite-bot.js        # File utama (rename jika perlu)
├── README.md
````

---

## ⚙️ Instalasi

1. **Clone repo ini:**

```bash
git clone https://github.com/AUTODROPCENTRAL/Kiteai-Automation.git
cd kite-ai-bot
```

2. **Install dependency:**

```bash
npm install
```

> Pastikan sudah terinstall `Node.js` versi 16 ke atas

---

## 🧾 Format File `privatekey.txt`

Isi file ini dengan private key dompet Ethereum kamu. Satu private key per baris:

```
0xabc123...
0xdef456...
```

> ⚠️ Gunakan **wallet testnet** atau **wallet kosong**. Jangan pernah gunakan wallet utama.

---

## 🧠 Format File `agent.txt`

Gunakan format berikut untuk mengatur prompt berdasarkan persona:

```
[Professor]
Explain smart contracts
What's zk-SNARK?

[Crypto Buddy]
How do I bridge tokens?
Show me how to mint NFTs

[Sherlock]
Find vulnerabilities in a contract
Audit this Solidity code
```

---

## 🕹️ Cara Menjalankan

```bash
node kite-bot.js
```

Bot akan meminta:

* Jumlah interaksi per wallet
* Persona yang ingin digunakan

Setelah itu, bot akan memproses setiap wallet dan menjalankan interaksi AI secara otomatis.

---

## 📤 Output yang Diberikan

* Informasi wallet (EOA, smart account, XP)
* Log sukses atau error tiap interaksi
* Status login dan persona yang digunakan

---

## 🛡️ Disclaimer

> Script ini dibuat untuk **tujuan edukasi, testnet testing**, dan **pengembangan pribadi**.
> Tidak dianjurkan untuk digunakan pada wallet utama atau digunakan secara publik tanpa review keamanan tambahan.

---

## 📬 Kontak & Lisensi

Lisensi: MIT
Kredit: @autodropcentral

Silakan fork dan kembangkan sesuai kebutuhan Anda.

---


