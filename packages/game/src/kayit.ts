/** İlk açılışta (ve ayarlardan) oyuncunun adını ve dükkânının adını soran form. */
import { type Profile, save } from "./save";

const temizle = (s: string) => s.replace(/\s+/g, " ").trim();

export function kayitFormu(onceki?: Profile): Promise<Profile> {
  const kutu = document.getElementById("kayit")!;
  const form = kutu.querySelector("form")!;
  const ad = document.getElementById("kayit-ad") as HTMLInputElement;
  const dukkan = document.getElementById("kayit-dukkan") as HTMLInputElement;
  const hata = document.getElementById("kayit-hata")!;
  const baslik = document.getElementById("kayit-baslik")!;
  ad.value = onceki?.name ?? "";
  dukkan.value = onceki?.shop ?? "";
  baslik.textContent = onceki ? "Bilgilerini düzenle" : "Hoş geldin usta!";
  hata.textContent = "";
  let elle = !!onceki;
  // Dükkân adı elle değiştirilmediyse addan otomatik öner
  ad.oninput = () => {
    if (!elle) dukkan.value = ad.value.trim() ? `${temizle(ad.value)} Usta Ocakbaşı` : "";
  };
  dukkan.oninput = () => (elle = true);
  kutu.classList.add("acik");
  setTimeout(() => ad.focus(), 50);

  return new Promise((resolve) => {
    form.onsubmit = (e) => {
      e.preventDefault();
      const name = temizle(ad.value);
      const shop = temizle(dukkan.value);
      if (name.length < 2) return void (hata.textContent = "Adın en az 2 harf olmalı.");
      if (shop.length < 3) return void (hata.textContent = "Dükkânının adı en az 3 harf olmalı.");
      const p: Profile = { ...onceki, name, shop };
      save.setProfile(p);
      kutu.classList.remove("acik");
      (document.activeElement as HTMLElement | null)?.blur();
      resolve(p);
    };
  });
}
