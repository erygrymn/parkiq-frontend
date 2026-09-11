"""
Kare 1 — "Leave now $5. Stay and it's $10." (aso.md §4)

Tasarım kararı: telefon MOCKUP'I yok, kenar payı da yok.

Şablon görüntüsünün sebebi "gradyanın üstünde yüzen tam telefon + üstte başlık"
kalıbıdır. Burada ekran TAM GENİŞLİKTE, alt kenara basan bir figür olarak
duruyor — yüzen bir kart değil. Üstteki krem alan boş bırakılıyor: boşluk
dekordan daha pahalı görünür ve design.md'nin tek lüksü zaten tipografi.
"""
from PIL import Image, ImageDraw
from tokens import *

SRC = r"C:/Users/eray/Desktop/ss/Simulator Screenshot - iPhone 17 Pro - 2026-09-12 at 02.03.51.png"

# Kaynak görüntüde panelin tutamağının başladığı satır: haritanın gürültüsü
# kadraja girmesin, figür tam oradan başlasın.
SHEET_TOP = 900

COPY = {
    "en": {
        "overline": "THE PRICE, NOT THE TIME",
        "lines": ["LEAVE NOW $5.", "STAY AND IT'S $10."],
    },
    "tr": {
        "overline": "SÜRE DEĞİL, FİYAT",
        "lines": ["ŞİMDİ ÇIK ₺50.", "KALIRSAN ₺100."],
    },
}


def render(locale: str = "en") -> Image.Image:
    copy = COPY[locale]
    img = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(img)

    shot = Image.open(SRC).convert("RGB")
    band = shot.crop((0, SHEET_TOP, shot.width, shot.height))
    scale = W / band.width
    band = band.resize((W, int(band.height * scale)), Image.LANCZOS)
    band_top = H - band.height

    # Üst köşeler yuvarlak; figür kremin içinden yükseliyor gibi otursun.
    mask = Image.new("L", band.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, W, band.height + 90), radius=64, fill=255)
    img.paste(band, (0, band_top), mask)
    d.rounded_rectangle(
        (0, band_top, W - 1, band_top + band.height + 90), radius=64, outline=HAIRLINE, width=2
    )

    # --- Tip bloğu figürün ÜSTÜNE dayanır, ortada asılı kalmaz. ---
    #
    # Önce yukarı sabitlenmişti ve arada 400 px ölü krem kalıyordu: boşluk
    # ortadayken hata gibi, tepedeyken kitap kapağı gibi okunuyor. Blok alta
    # yaslanınca üstteki büyük alan kasıtlı hava oluyor.
    f_over = font(30, 800)
    f_head = font(112, 900)
    line_h = 132
    block_h = 40 + 52 + line_h * len(copy["lines"])
    y0 = band_top - 96 - block_h

    tracked(d, (M, y0), copy["overline"], f_over, TEXT_TERTIARY, tracking=0.16)

    # Aralık −0.012em: Pillow harfleri tek tek çizerken kerning'i zaten
    # düşürüyor, design.md'nin −0.03'ü bunun üstüne binince harfler çarpışıyordu.
    y = y0 + 40 + 52
    last = len(copy["lines"]) - 1
    for i, line in enumerate(copy["lines"]):
        body, dot = line[:-1], line[-1]
        x = tracked(d, (M, y + i * line_h), body, f_head, INK, tracking=-0.012)
        # İlke 7: ekran başına EN FAZLA 1 imza noktası. Yeşil olan yalnız son
        # satırda; ilk satırın noktası mürekkep, yoksa iki imza olurdu.
        tracked(d, (x, y + i * line_h), dot, f_head,
                DOT_ON_LIGHT if i == last else INK, tracking=-0.012)

    return img


if __name__ == "__main__":
    for loc in ("en", "tr"):
        im = render(loc)
        im.save(f"out-01-{loc}.png")
        im.resize((im.width // 3, im.height // 3), Image.LANCZOS).save(f"preview-01-{loc}.png")
        print(f"out-01-{loc}.png", im.size)
