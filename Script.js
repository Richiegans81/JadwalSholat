document.addEventListener("DOMContentLoaded", () => {
  const locationDisplay = document.getElementById("lokasi");
  const dateDisplay = document.getElementById("tanggal-hari-ini");
  const clockDisplay = document.getElementById("live-clock");
  const prayerElements = {
    subuh: document.getElementById("subuh"),
    dzuhur: document.getElementById("dzuhur"),
    ashar: document.getElementById("ashar"),
    maghrib: document.getElementById("maghrib"),
    isya: document.getElementById("isya"),
  };
  const nextPrayerName = document.getElementById("next-prayer-name");
  const countdownTimer = document.getElementById("countdown-timer");

  let currentJadwal = null;
  let nextPrayer = null;
  let countdownInterval = null;

  /* =====================================================
   * 1. JAM REAL-TIME
   * ===================================================== */
  function startLiveClock() {
    setInterval(() => {
      const now = new Date();
      clockDisplay.textContent = now
        .toLocaleTimeString("id-ID", { hour12: false })
        .replace(/\./g, ":");
    }, 1000);
  }

  /* =====================================================
   * 2. TANGGAL HARI INI
   * ===================================================== */
  function displayCurrentDate() {
    const now = new Date();
    const options = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    dateDisplay.textContent = now.toLocaleDateString("id-ID", options);
  }

  /* =====================================================
   * 3. AMBIL DATA JADWAL SHOLAT (API KEMENAG via MyQuran)
   * ===================================================== */
  async function fetchPrayerTimes(city = "Depok") {
    try {
      // Cari kode kota dari API MyQuran
      const cityRes = await fetch(
        `https://api.myquran.com/v1/sholat/kota/cari/${city}`
      );
      const cityData = await cityRes.json();

      if (!cityData.status || cityData.data.length === 0) {
        alert("Kota tidak ditemukan!");
        return;
      }

      const cityCode = cityData.data[0].id;
      const cityName = cityData.data[0].lokasi;
      locationDisplay.textContent = cityName;

      // Ambil jadwal hari ini berdasarkan kode kota
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");

      const jadwalRes = await fetch(
        `https://api.myquran.com/v1/sholat/jadwal/${cityCode}/${year}/${month}/${day}`
      );
      const jadwalData = await jadwalRes.json();
      const jadwal = jadwalData.data.jadwal;
      currentJadwal = jadwal;

      // Tampilkan ke elemen HTML
      prayerElements.subuh.textContent = jadwal.subuh;
      prayerElements.dzuhur.textContent = jadwal.dzuhur;
      prayerElements.ashar.textContent = jadwal.ashar;
      prayerElements.maghrib.textContent = jadwal.maghrib;
      prayerElements.isya.textContent = jadwal.isya;

      // Tentukan sholat berikutnya
      determineNextPrayer();
    } catch (error) {
      console.error("Gagal memuat jadwal:", error);
    }
  }

  /* =====================================================
   * 4. TENTUKAN WAKTU SHOLAT BERIKUTNYA
   * ===================================================== */
  function determineNextPrayer() {
    if (!currentJadwal) return;

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const prayers = [
      { name: "Subuh", time: currentJadwal.subuh },
      { name: "Dzuhur", time: currentJadwal.dzuhur },
      { name: "Ashar", time: currentJadwal.ashar },
      { name: "Maghrib", time: currentJadwal.maghrib },
      { name: "Isya", time: currentJadwal.isya },
    ];

    // Cari waktu sholat berikutnya yang lebih besar dari waktu saat ini
    const next = prayers.find((p) => {
      const [h, m] = p.time.split(":");
      const prayerTime = new Date(`${today}T${h.padStart(2, "0")}:${m}:00`);
      return prayerTime > now;
    });

    // Jika semua sudah lewat, berarti kembali ke Subuh (besok)
    nextPrayer = next || prayers[0];
    nextPrayerName.textContent = nextPrayer.name;

    startCountdown(nextPrayer.time, nextPrayer.name);
  }

  /* =====================================================
   * 5. HITUNG MUNDUR MENUJU WAKTU SHOLAT BERIKUTNYA
   * ===================================================== */
  function startCountdown(timeString, prayerName) {
    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
      const now = new Date();
      const [h, m] = timeString.split(":");
      let target = new Date();
      target.setHours(h, m, 0, 0);

      // Jika waktu sudah lewat (misal tengah malam), target besok
      if (target < now) {
        target.setDate(target.getDate() + 1);
      }

      const diff = target - now;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      countdownTimer.textContent = `${String(hours).padStart(2, "0")}:${String(
        minutes
      ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

      // Jika waktu sholat telah tiba
      if (diff <= 0) {
        clearInterval(countdownInterval);
        countdownTimer.textContent = "00:00:00";
        alert(`Sudah masuk waktu sholat ${prayerName}!`);
        determineNextPrayer();
      }
    }, 1000);
  }

  /* =====================================================
   * 6. FITUR: GUNAKAN LOKASI OTOMATIS
   * ===================================================== */
  document
    .getElementById("detect-location-button")
    .addEventListener("click", () => {
      if (!navigator.geolocation)
        return alert("Browser Anda tidak mendukung GPS.");

      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const city =
            data.address.city ||
            data.address.town ||
            data.address.county ||
            "Depok";
          fetchPrayerTimes(city);
        } catch {
          fetchPrayerTimes("Depok");
        }
      });
    });

  /* =====================================================
   * 7. FITUR: PENCARIAN KOTA MANUAL
   * ===================================================== */
  document.getElementById("search-button").addEventListener("click", () => {
    const city = document.getElementById("search-input").value.trim();
    if (city) fetchPrayerTimes(city);
  });

  /* =====================================================
   * 8. INISIALISASI
   * ===================================================== */
  startLiveClock();
  displayCurrentDate();
  fetchPrayerTimes("Depok");
});

// =======================================================
// SISTEM SHOLAT BERIKUTNYA
// =======================================================

// Contoh jadwal sholat (biasanya dari API)
const jadwalSholat = {
  subuh: "04:27",
  dzuhur: "11:42",
  ashar: "15:05",
  maghrib: "17:52",
  isya: "19:03",
};

// Elemen HTML
const nextPrayerName = document.getElementById("next-prayer-name");
const countdownTimer = document.getElementById("countdown-timer");

// Variabel internal
let countdownInterval = null;

// ======================
// Fungsi utama
// ======================
function tentukanSholatBerikutnya() {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const daftarSholat = [
    { nama: "Subuh", waktu: jadwalSholat.subuh },
    { nama: "Dzuhur", waktu: jadwalSholat.dzuhur },
    { nama: "Ashar", waktu: jadwalSholat.ashar },
    { nama: "Maghrib", waktu: jadwalSholat.maghrib },
    { nama: "Isya", waktu: jadwalSholat.isya },
  ];

  // Cari waktu sholat berikutnya yang lebih besar dari sekarang
  let berikutnya = daftarSholat.find((p) => {
    const [h, m] = p.waktu.split(":");
    const waktuSholat = new Date(`${today}T${h.padStart(2, "0")}:${m}:00`);
    return waktuSholat > now;
  });

  // Kalau semua sudah lewat, berarti kembali ke Subuh (besok)
  if (!berikutnya) berikutnya = daftarSholat[0];

  // Tampilkan nama sholat berikutnya
  nextPrayerName.textContent = berikutnya.nama;

  // Jalankan hitung mundur menuju waktu itu
  mulaiHitungMundur(berikutnya.waktu, berikutnya.nama);
}

// ======================
// Hitung Mundur
// ======================
function mulaiHitungMundur(waktuString, namaSholat) {
  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    const now = new Date();
    const [h, m] = waktuString.split(":");
    let target = new Date();
    target.setHours(h, m, 0, 0);

    // Jika waktu sudah lewat (misalnya tengah malam), target besok
    if (target < now) {
      target.setDate(target.getDate() + 1);
    }

    const selisih = target - now;
    const jam = Math.floor(selisih / 3600000);
    const menit = Math.floor((selisih % 3600000) / 60000);
    const detik = Math.floor((selisih % 60000) / 1000);

    countdownTimer.textContent = `${jam.toString().padStart(2, "0")}:${menit
      .toString()
      .padStart(2, "0")}:${detik.toString().padStart(2, "0")}`;

    // Kalau sudah waktunya
    if (selisih <= 0) {
      clearInterval(countdownInterval);
      countdownTimer.textContent = "00:00:00";
      alert(`Sudah masuk waktu sholat ${namaSholat}!`);
      tentukanSholatBerikutnya(); // otomatis ganti ke sholat berikutnya
    }
  }, 1000);
}

// ======================
// Jalankan sistem
// ======================
tentukanSholatBerikutnya();
