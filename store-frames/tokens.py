"""
Mağaza karesi tasarım token'ları — TEK KAYNAK.

Değerler design.md'den birebir alındı; burada yeni renk/ölçü İCAT EDİLMEZ.
Skill'in varsayılan estetiği (gradyan, blob, glow, yüzen kart) bilerek
kullanılmıyor: CLAUDE.md öncelik sırası design.md > skill, ve design.md bunların
hepsini DON'T listesine koymuş.
"""
from PIL import ImageFont

W, H = 1320, 2868           # App Store 6.9"
M = 96                      # kenar payı

CREAM = (245, 242, 235)
POSTER_BLACK = (20, 20, 22)
INK = (20, 20, 22)
WHITE = (255, 255, 255)
TEXT_SECONDARY = (90, 90, 100)
TEXT_TERTIARY = (138, 138, 147)
DOT_ON_LIGHT = (11, 122, 62)     # krem üstünde 4.9:1
DOT_ON_DARK = (47, 224, 122)
AMBER = (255, 179, 0)
AMBER_TEXT = (154, 94, 0)
HAIRLINE = (214, 210, 201)

_FONT = "fonts/Inter.ttf"


def font(size: int, weight: int = 400):
    f = ImageFont.truetype(_FONT, size)
    try:
        f.set_variation_by_axes([min(size, 32), weight])
    except Exception:
        pass
    return f


def tracked(draw, xy, text, f, fill, tracking=0.0, anchor_left=True):
    """
    Pillow'da harf aralığı yok; display tipografisi onsuz olmuyor — design.md
    dev uppercase için −0.02…−0.03em istiyor ve varsayılan aralıkla o metin
    gevşek duruyor. Harfler tek tek çizilip advance elle daraltılıyor.
    """
    x, y = xy
    step = tracking * f.size
    if not anchor_left:
        total = sum(f.getlength(c) + step for c in text) - step
        x -= total
    for ch in text:
        draw.text((x, y), ch, font=f, fill=fill)
        x += f.getlength(ch) + step
    return x


def tracked_width(text, f, tracking=0.0):
    step = tracking * f.size
    return sum(f.getlength(c) + step for c in text) - (step if text else 0)
