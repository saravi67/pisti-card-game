# Pişti (Klasik & Eşli) - PocketVibe El Konsolu Kağıt Oyunu

Google Play Store'un en sevilen ve en yüksek puanına sahip (**4.6★**) Pişti mobil oyunundan esinlenilerek PocketVibe el konsolları (Anbernic RG34XX SP, RG DS, Android el konsolları) ve modern web tarayıcıları için Three.js ile geliştirilmiş 3D Türk usulü **Pişti** oyunu.

---

## 🎮 Nasıl Oynanır ve Çalıştırılır?

### 1. Bilgisayarda / Tarayıcıda Oynamak İçin:
```bash
cd pisti-game
npm install
npm run dev
```
Tarayıcınızda açılan ekranda el konsolu arayüzü ve 3D çuha masa simülasyonu çalışacaktır.

**Klavye Tuş Karşılıkları (PocketVibe Düzeni):**
- **◄ ► (D-pad Sol/Sağ):** Eldeki kartlar arasında gezinme / Menüde hareket
- **▲ ▼ (D-pad Yukarı/Aşağı):** Menü seçenekleri arasında gezinme
- **X Tuşu (A Butonu):** Seçili kartı masaya at / Seçimi onayla
- **Z Tuşu (B Butonu):** Geri dön / Açık menüyü kapat
- **S Tuşu (X Butonu):** Skor Tablosu
- **A Tuşu (Y Butonu):** Pişti Kuralları ve Puan Tablosunu aç / kapat
- **Enter (START):** Yeni Maç / Ana Menü
- **P Tuşu:** El Konsolu Performans Paneli (FPS, Draw Calls, Triangles)

---

### 2. Kendi El Konsolunuzda (Anbernic vb.) Oynamak İçin:
Aynı Wi-Fi ağına bağlıyken oyun klasöründe şunu çalıştırın:
```bash
npx pocketvibe serve
```
Konsolunuzda PocketVibe arayüzünden **Settings > Stores > Add a store** kısmına ekranda çıkan IP adresini girin (`http://192.168.x.x:8740`). Oyun doğrudan el konsolunuza yüklenecektir!

---

## 🃏 Oyun Özellikleri ve Kuralları

- **Oyun Modları:**
  - ⚡ **Tekli Pişti (1v1):** Sen ve akıllı yapay zeka rakip (Ali) arasında teke tek düello.
  - 👥 **Eşli Pişti (2v2):** Sen ve ortağın (Ayşe), rakip takıma (Ali & Can) karşı stratejik takım oyunu.
- **Hedef Puan Seçimi:**
  - 51 Puan (Hızlı Maç)
  - 101 Puan (Klasik Standart)
  - 151 Puan (Uzun Turnuva)
- **Akıllı Yapay Zeka (AI):**
  - Çıkan kartları ve yerdeki kartları hafızada tutar (kart sayma tekniği).
  - Masada tek kart varken pişti yapabilecek kartları kollar.
  - Valeleri (J) ve puan kartlarını (Karo 10, Sinek 2, Aslar) gereksiz yere yere atmaz, güvenli çöp kartları boş masaya sürer.
  - Eşli modda ortağının aldığı ellere dikkat eder.
- **Resmi Türk Pişti Puanlama Sistemi:**
  - **Normal Pişti:** 10 Puan
  - **Çift / Vale Piştisi (Vale üzerine Vale):** 20 Puan
  - **Karo 10 (♦10):** 3 Puan
  - **Sinek 2 (♣2):** 2 Puan
  - **Aslar (A):** 1'er Puan (Toplam 4 Puan)
  - **Valeler (J):** 1'er Puan (Toplam 4 Puan)
  - **Kart Çoğunluğu:** Tur sonunda 27 ve üzeri kart toplayan tarafa +3 Puan.
- **3D Masa & Ses Deneyimi:**
  - Sabit 60 FPS garantili düşük poligonlu çuha masa ve 3D kartlar.
  - Web Audio API ile sıfır gecikmeli kart atma, toplama, pişti ve zafer ses efektleri.
