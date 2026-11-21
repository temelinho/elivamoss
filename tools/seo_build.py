"""
SEO yapısı: ürün başlıkları, kategori sayfaları, breadcrumb verisi, sitemap.

- Ürün sayfaları (TR/EN/RU): aranan terimlerle başlık (<title>, H1, JSON-LD
  name, og/meta açıklama, galeri alt metinleri). Eski ürün adı H1 altında
  "Model: ..." olarak kalır (WhatsApp mesajları ve kartlarla tutarlı).
- BreadcrumbList JSON-LD (TR ürünlerde kategori sayfası dahil).
- TR kategori sayfaları: /magaza/<kategori>/ (magaza/index.html şablonundan).
- Mağaza sayfasına kategori bağlantıları, sitemap'e kategori URL'leri.

Idempotent; tekrar çalıştırılabilir. Ardından:
    python tools/google_shopping.py
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://elivamoss.com.tr"

FRAMES = {
    "brass": ("Pirinç Çerçeve", "Brass Frame", "латунная рама"),
    "walnut": ("Ceviz Çerçeve", "Walnut Frame", "рама из ореха"),
    "black": ("Siyah Çerçeve", "Black Frame", "чёрная рама"),
    "oak": ("Meşe Çerçeve", "Oak Frame", "дубовая рама"),
}

KINDS = {
    "hex": ("Altıgen Stabilize Yosun Tablo", "Hexagonal Preserved Moss Wall Art",
            "Шестиугольная картина из стабилизированного мха"),
    "hex5": ("Altıgen Stabilize Yosun Tablo 5'li Set", "Hexagonal Preserved Moss Wall Art, Set of 5",
             "Набор из 5 шестиугольных картин из стабилизированного мха"),
    "square": ("Kare Stabilize Yosun Tablo", "Square Preserved Moss Wall Art",
               "Квадратная картина из стабилизированного мха"),
    "square3": ("Kare Stabilize Yosun Tablo 3'lü Set", "Square Preserved Moss Wall Art, Set of 3",
                "Набор из 3 квадратных картин из стабилизированного мха"),
    "tri": ("Üçgen Stabilize Yosun Tablo", "Triangular Preserved Moss Wall Art",
            "Треугольная картина из стабилизированного мха"),
    "tri3": ("Üçgen Stabilize Yosun Tablo 3'lü Set", "Triangular Preserved Moss Wall Art, Set of 3",
             "Набор из 3 треугольных картин из стабилизированного мха"),
    "rect": ("Dikdörtgen Stabilize Yosun Tablo", "Rectangular Preserved Moss Wall Art",
             "Прямоугольная картина из стабилизированного мха"),
    "vrect": ("Dikey Dikdörtgen Stabilize Yosun Tablo", "Vertical Preserved Moss Wall Art",
              "Вертикальная картина из стабилизированного мха"),
    "round": ("Yuvarlak Stabilize Yosun Tablo", "Round Preserved Moss Wall Art",
              "Круглая картина из стабилизированного мха"),
    "roundplant": ("Yuvarlak Stabilize Yosun ve Bitki Tablosu", "Round Preserved Moss and Plant Wall Art",
                   "Круглая картина из стабилизированного мха и растений"),
    "ball": ("Top Yosunlu (Ball Moss) Stabilize Yosun Tablo", "Ball Moss Preserved Moss Wall Art",
             "Картина из стабилизированного шарового мха"),
    "lichen": ("Liken Detaylı Stabilize Yosun ve Bitki Tablosu", "Preserved Moss and Plant Wall Art with Lichen",
               "Картина из стабилизированного мха, растений и лишайника"),
    "fern": ("Eğrelti ve Stabilize Bitkili Yosun Tablo", "Preserved Moss Wall Art with Fern and Plants",
             "Картина из стабилизированного мха с папоротником и растениями"),
    "branch": ("Doğal Dal Detaylı Stabilize Yosun Tablo", "Preserved Moss Wall Art with Natural Branches",
               "Картина из стабилизированного мха с натуральными ветками"),
    "dried": ("Kare Mumyalanmış Yosun Tablo", "Square Dried Preserved Moss Wall Art",
              "Квадратная картина из мумифицированного мха"),
    "plant3": ("Stabilize Yosun ve Bitki Tablosu 3'lü Set", "Preserved Moss and Plant Wall Art, Set of 3",
               "Набор из 3 картин из стабилизированного мха и растений"),
    "bonsai_l": ("Büyük Boy Stabilize Bonsai Ağacı, Seramik Saksılı", "Large Preserved Bonsai Tree in Ceramic Pot",
                 "Большое стабилизированное дерево бонсай в керамическом горшке"),
    "bonsai_m": ("Orta Boy Stabilize Bonsai Ağacı, Seramik Saksılı", "Medium Preserved Bonsai Tree in Ceramic Pot",
                 "Среднее стабилизированное дерево бонсай в керамическом горшке"),
    "maple": ("Stabilize Akçaağaç Bonsai, Kızıl Yapraklı", "Preserved Maple Bonsai with Red Autumn Leaves",
              "Стабилизированный клён бонсай с осенними листьями"),
    "mini": ("Mini Stabilize Bonsai Ağacı, Masa Üstü", "Mini Preserved Bonsai Tree for Desks",
             "Мини стабилизированное дерево бонсай для стола"),
}

# TR slug -> (tür, çerçeve, model eki)
PRODUCTS = {
    "akcaagac-bonsai": ("maple", None, None),
    "bonsai-agac-01": ("bonsai_l", None, "01"),
    "bonsai-agac-02": ("bonsai_m", None, "02"),
    "mini-bonsai-agac": ("mini", None, None),
    "altigen-botanik-yosun-tablo-01": ("hex", "brass", "01"),
    "altigen-botanik-yosun-tablo-02": ("hex", "walnut", "02"),
    "altigen-botanik-yosun-tablo-03": ("hex", "black", "03"),
    "altigen-botanik-yosun-tablo-04": ("hex", "oak", "04"),
    "altigen-botanik-yosun-tablo-05": ("hex", "brass", "05"),
    "altigen-botanik-yosun-tablo-5li-set": ("hex5", "brass", None),
    "ball-moss-detayli-yosun-tablo": ("ball", "brass", None),
    "dekoratif-botanik-yosun-tablo": ("lichen", "black", None),
    "dogal-bitkili-yosun-tablo": ("fern", "brass", None),
    "dogal-dal-detayli-yosun-tablo": ("branch", "walnut", None),
    "kare-botanik-yosun-tablo-3lu-set": ("square3", "black", None),
    "kare-yosun-tablo-01": ("square", "brass", "01"),
    "kare-yosun-tablo-02": ("square", "walnut", "02"),
    "kare-yosun-tablo-03": ("square", "black", "03"),
    "mumyalanmis-yosun-tablo-01": ("dried", "oak", None),
    "ucgen-botanik-yosun-tablo-01": ("tri", "brass", "01"),
    "ucgen-botanik-yosun-tablo-02": ("tri", "walnut", "02"),
    "ucgen-botanik-yosun-tablo-03": ("tri", "black", "03"),
    "ucgen-botanik-yosun-tablo-04": ("tri", "oak", "04"),
    "ucgen-botanik-yosun-tablo-05": ("tri", "brass", "05"),
    "ucgen-botanik-yosun-tablo-06": ("tri", "walnut", "06"),
    "ucgen-botanik-yosun-tablo-3lu-set-01": ("tri3", "brass", "01"),
    "ucgen-botanik-yosun-tablo-3lu-set-02": ("tri3", "walnut", "02"),
    "yosun-dikdortgen-tablo-01": ("rect", "brass", "01"),
    "yosun-dikdortgen-tablo-02": ("vrect", "black", "02"),
    "yosun-dikdortgen-tablo-03": ("rect", "walnut", "03"),
    "yosun-ve-stabilize-bitki-tablosu-3lu-set": ("plant3", "oak", None),
    "yuvarlak-cerceveli-yosun-tablo-02": ("round", "walnut", "02"),
    "yuvarlak-stabilize-yosun-ve-bitki-tablosu-03": ("roundplant", "brass", "03"),
    "yuvarlak-stabilize-yosun-ve-bitki-tablosu-04": ("roundplant", "oak", "04"),
}

LANG = {
    "tr": {"i": 0, "dir": "magaza", "model": "Model", "modelsfx": "Model",
           "home": "Ana Sayfa", "shop": "Mağaza", "shop_url": f"{SITE}/magaza/",
           "desc": "{p} – {price}. El yapımı, bakım gerektirmez. Türkiye geneli ücretsiz kargo, 14 gün iade."},
    "en": {"i": 1, "dir": "en/shop", "model": "Model", "modelsfx": "Model",
           "home": "Home", "shop": "Shop", "shop_url": f"{SITE}/en/shop/",
           "desc": "{p} – {price}. Handmade and maintenance-free. Free shipping across Turkey, 14-day returns."},
    "ru": {"i": 2, "dir": "ru/shop", "model": "Модель", "modelsfx": "модель",
           "home": "Главная", "shop": "Магазин", "shop_url": f"{SITE}/ru/shop/",
           "desc": "{p} – {price}. Ручная работа, не требует ухода. Бесплатная доставка по Турции, возврат 14 дней."},
}

# --- Kategori sayfaları (TR) ---
CATEGORIES = {
    "yosun": {
        "slug": "yosun-tablo",
        "name": "Yosun Tablolar",
        "title": "Stabilize Yosun Tablo Modelleri ve Fiyatları | Eliva Moss",
        "h1": "Stabilize Yosun Tablo Modelleri ve Fiyatları",
        "intro": [
            "Stabilize yosun tablolar, gerçek yosunun özel bir koruma işleminden geçirilmesiyle hazırlanır. Yosun canlılığını kaybetmez ama büyümez; sulama, gübre ya da gün ışığı istemez. Bu yüzden ofis, salon, otel lobisi ve penceresiz alanlarda bile yıllarca ilk günkü yeşilliğini korur.",
            "Koleksiyondaki her tablo atölyemizde elde hazırlanır. Kare, dikdörtgen ve yuvarlak formlar; fırçalanmış antik pirinç, koyu ceviz, mat siyah ve doğal meşe çerçeve seçenekleri; düz yosun, top (yastık) yosun, liken, doğal dal ve stabilize bitki gibi farklı dokular arasından mekanınıza uygun olanı seçebilirsiniz.",
            "Listelenen fiyatlar standart ölçüler içindir. Duvarınıza özel ölçü, çerçeve veya renk isterseniz WhatsApp üzerinden bize yazmanız yeterli. Türkiye geneline kargo ücretsizdir ve standart ürünlerde 14 gün içinde iade hakkınız vardır.",
        ],
        "faq": [
            ("Stabilize yosun tablo bakım ister mi?", "Hayır. Stabilize yosun tablolar sulama, budama veya gün ışığı gerektirmez. Doğrudan güneş ışığından ve sudan uzak tutmanız, tozunu ara sıra yumuşak bir fırçayla almanız yeterlidir."),
            ("Yosun tablo ne kadar dayanır?", "İç mekanda, doğrudan güneş almayan ve normal nem seviyesindeki ortamlarda stabilize yosun formunu ve rengini uzun yıllar korur."),
            ("Özel ölçüde yosun tablo yaptırabilir miyim?", "Evet. Tüm tablolarımızı mekanınıza özel ölçü, çerçeve ve renk seçenekleriyle üretebiliyoruz. Ölçünüzü WhatsApp üzerinden iletmeniz yeterli."),
            ("Kargo ve iade koşulları nedir?", "Türkiye geneline kargo ücretsizdir. Standart ürünlerde teslimden itibaren 14 gün içinde cayma hakkınız vardır; kişiye özel üretilen ürünlerde cayma hakkı bulunmaz."),
        ],
    },
    "geometrik": {
        "slug": "geometrik-yosun-tablo",
        "name": "Geometrik Yosun Tablolar",
        "title": "Geometrik Yosun Tablo: Altıgen ve Üçgen Modeller | Eliva Moss",
        "h1": "Geometrik Yosun Tablolar: Altıgen ve Üçgen Modeller",
        "intro": [
            "Geometrik yosun tablolar, stabilize yosunu altıgen ve üçgen çerçevelerle buluşturan modüler tasarımlardır. Tek başına küçük bir yeşil dokunuş olarak kullanılabildiği gibi, birkaç parça yan yana dizilerek petek ya da zikzak kompozisyonlar oluşturulabilir.",
            "Her parçada stabilize düz yosun, top (yastık) yosun, liken ve doğal dallar elde yerleştirilir. Fırçalanmış antik pirinç, koyu ceviz, mat siyah ve doğal meşe çerçeve seçenekleri sayesinde farklı tonları karıştırarak kendi duvar düzeninizi kurabilirsiniz.",
            "Geometrik tablolar bakım gerektirmez; sulama ve gün ışığı istemez. Türkiye geneline ücretsiz kargo ile gönderilir. Birden fazla parça veya toplu sipariş için WhatsApp üzerinden bize ulaşabilirsiniz.",
        ],
        "faq": [
            ("Geometrik yosun tabloları nasıl dizebilirim?", "Altıgen tablolar kenar kenara getirilerek petek dizilim, üçgen tablolar ise yukarı ve aşağı bakacak şekilde sıralanarak zikzak bir kompozisyon oluşturur. Hazır düzen için 3'lü ve 5'li setlerimize de göz atabilirsiniz."),
            ("Farklı çerçeve renklerini karıştırabilir miyim?", "Evet. Pirinç, ceviz, siyah ve meşe çerçeveli parçaları bir arada kullanarak daha canlı bir duvar düzeni elde edebilirsiniz."),
            ("Geometrik yosun tablo bakım ister mi?", "Hayır. Stabilize yosun sulama, budama veya gün ışığı gerektirmez; doğrudan güneşten ve sudan uzak tutmanız yeterlidir."),
        ],
    },
    "set": {
        "slug": "yosun-tablo-setleri",
        "name": "Yosun Tablo Setleri",
        "title": "Yosun Tablo Setleri: 3'lü ve 5'li Kombinler | Eliva Moss",
        "h1": "Yosun Tablo Setleri: 3'lü ve 5'li Kombinler",
        "intro": [
            "Yosun tablo setleri, birbiriyle uyumlu olacak şekilde tasarlanmış 3'lü ve 5'li stabilize yosun tablo kombinleridir. Kanepe arkası, yatak başı, koridor veya toplantı odası gibi geniş duvarlarda tek bir büyük tablo yerine dengeli ve ritmik bir görünüm sağlar.",
            "Setlerde kare, üçgen, altıgen ve dikey dikdörtgen formlar; pirinç, ceviz, siyah ve meşe çerçeve seçenekleri bulunur. Parçaların tamamı stabilize yosun ve stabilize bitkilerle elde hazırlanır ve bakım gerektirmez.",
            "Set fiyatları tüm parçaları kapsar ve Türkiye geneline kargo ücretsizdir. Duvarınıza özel bir kombin oluşturmak isterseniz ölçülerinizi WhatsApp üzerinden iletebilirsiniz.",
        ],
        "faq": [
            ("Set fiyatına tüm parçalar dahil mi?", "Evet. Listelenen set fiyatı setteki tüm tabloları kapsar."),
            ("Yosun tablo seti hangi duvarlar için uygun?", "Kanepe arkası, yatak başı, koridor, resepsiyon ve toplantı odası gibi geniş duvarlarda setler tek parça tabloya göre daha dengeli bir görünüm sağlar."),
            ("Setteki parçaları ayrı ayrı alabilir miyim?", "Setlerdeki formların çoğu mağazamızda tek parça olarak da bulunur. Farklı bir kombin için WhatsApp üzerinden bize yazabilirsiniz."),
        ],
    },
    "bonsai": {
        "slug": "bonsai-agaci",
        "name": "Bonsai Ağaçları",
        "title": "Stabilize Bonsai Ağacı Modelleri ve Fiyatları | Eliva Moss",
        "h1": "Stabilize Bonsai Ağacı Modelleri ve Fiyatları",
        "intro": [
            "Stabilize bonsai ağaçları, bonsai sanatının zarif formunu bakım derdi olmadan mekanınıza taşır. Doğal bitkiler özel bir koruma işleminden geçirildiği için sulama, budama, gübre veya gün ışığı gerektirmez; ofislerde ve az ışık alan alanlarda bile formunu korur.",
            "Gövde, dal yapısı ve yaprak katmanları atölyemizde tek tek elde yerleştirilir ve seramik bonsai saksısında sunulur. Masa üstü için mini bonsai, konsol ve kitaplıklar için orta boy, resepsiyon ve lobiler için büyük boy modeller ile kızıl yapraklı akçaağaç bonsai seçeneği bulunur.",
            "Stabilize bonsai, kalıcı ve şık bir kurumsal ya da kişisel hediye olarak da tercih edilir. Türkiye geneline ücretsiz kargo ile korumalı ambalajda gönderilir.",
        ],
        "faq": [
            ("Stabilize bonsai sulanır mı?", "Hayır. Stabilize bonsai sulanmaz; sulamak bitkiye zarar verir. Doğrudan güneş ışığından ve sudan uzak tutmanız yeterlidir."),
            ("Stabilize bonsai canlı mı?", "Stabilize bonsailerimiz doğal bitkilerden, özel bir koruma işlemiyle hazırlanır. Büyümez ve bakım gerektirmez; formunu ve rengini iç mekanda uzun süre korur."),
            ("Bonsai ağacı hediye olarak gönderilebilir mi?", "Evet. Ürünler korumalı ambalajla Türkiye'nin her yerine ücretsiz kargo ile gönderilir. Hediye notu veya kurumsal sipariş için WhatsApp üzerinden bize yazabilirsiniz."),
        ],
    },
}

CAT_SLUGS = {c["slug"] for c in CATEGORIES.values()}
LD_RE = re.compile(r'(<script type="application/ld\+json">\s*)(.*?)(\s*</script>)', re.S)
HREFLANG_TR_RE = re.compile(r'<link rel="alternate" hreflang="tr" href="([^"]+)"')


def esc(s):
    return html.escape(s, quote=True)


def phrase(tr_slug, lang):
    kind, frame, model = PRODUCTS[tr_slug]
    i = LANG[lang]["i"]
    p = KINDS[kind][i]
    if frame:
        p += " – " + FRAMES[frame][i]
    if model:
        p += f" ({LANG[lang]['modelsfx']} {model})"
    return p


def fmt_price(price, lang):
    whole = int(round(float(price)))
    if lang == "en":
        return f"₺{whole:,}"
    s = f"{whole:,}".replace(",", "." if lang == "tr" else " ")
    return f"₺{s}" if lang == "tr" else f"{s} ₺"


def product_category_map():
    """magaza/index.html kartlarından TR slug -> data-cat."""
    t = (ROOT / "magaza/index.html").read_text(encoding="utf-8")
    out = {}
    for card in re.findall(r'<article class="product-card shop-card".*?</article>', t, re.S):
        k = re.search(r'data-cat="([a-z]+)"', card).group(1)
        slug = re.search(r'href="\.\./magaza/([^/]+)/index\.html"', card).group(1)
        out[slug] = k
    return out


def dump_ld(data, base):
    return json.dumps(data, ensure_ascii=False, indent=2).replace("\n", "\n" + base)


def process_product(page, lang, cat_map):
    h = page.read_text(encoding="utf-8")
    tr_slug = HREFLANG_TR_RE.search(h).group(1).rstrip("/").split("/")[-1]
    L = LANG[lang]
    p = phrase(tr_slug, lang)

    model_m = re.search(r'<p class="pdetail__model">[^:<]*: ([^<]*)</p>', h)
    if model_m:
        name = html.unescape(model_m.group(1))
    else:
        name = html.unescape(re.search(r'<h1 class="product-info__title">([^<]*)</h1>', h).group(1))

    info = {}

    def ld_repl(m):
        data = json.loads(m.group(2))
        base = m.group(1).rsplit("\n", 1)[-1]
        if data.get("@type") == "Product":
            data["name"] = p
            info["price"] = data["offers"]["price"]
            info["url"] = data["offers"]["url"]
            return m.group(1) + dump_ld(data, base) + m.group(3)
        if data.get("@type") == "BreadcrumbList":
            return "<!--drop-->"
        return m.group(0)

    h = LD_RE.sub(ld_repl, h)
    h = re.sub(r"\n[ \t]*<!--drop-->", "", h)

    crumbs = [(L["home"], f"{SITE}/" if lang == "tr" else f"{SITE}/{lang}/"), (L["shop"], L["shop_url"])]
    if lang == "tr" and tr_slug in cat_map:
        c = CATEGORIES[cat_map[tr_slug]]
        crumbs.append((c["name"], f"{SITE}/magaza/{c['slug']}/"))
    crumbs.append((p, info["url"]))
    bl = {"@context": "https://schema.org", "@type": "BreadcrumbList",
          "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": u}
                              for i, (n, u) in enumerate(crumbs)]}
    h = h.replace("</head>", '  <script type="application/ld+json">\n  ' + dump_ld(bl, "  ") + "\n  </script>\n</head>", 1)

    title = f"{p} | Eliva Moss"
    desc = L["desc"].format(p=p, price=fmt_price(info["price"], lang))
    h = re.sub(r"<title>[^<]*</title>", lambda m: f"<title>{esc(title)}</title>", h, 1)
    h = re.sub(r'(<meta property="og:title" content=")[^"]*(")', lambda m: m.group(1) + esc(title) + m.group(2), h, 1)
    for attr in ('name="description"', 'property="og:description"', 'name="twitter:description"'):
        h = re.sub(r'(<meta ' + re.escape(attr) + r' content=")[^"]*(")', lambda m: m.group(1) + esc(desc) + m.group(2), h, 1)

    h = re.sub(r'<h1 class="product-info__title">[^<]*</h1>(\s*<p class="pdetail__model">[^<]*</p>)?',
               lambda m: f'<h1 class="product-info__title">{esc(p)}</h1>\n          <p class="pdetail__model">{L["model"]}: {esc(name)}</p>',
               h, 1)

    h = h.replace(f'alt="{esc(name)} - ', f'alt="{esc(p)} - ')
    if lang == "tr" and tr_slug in cat_map:
        c = CATEGORIES[cat_map[tr_slug]]
        link = f'<li><a href="../{c["slug"]}/index.html">{esc(c["name"])}</a></li>'
        if link not in h:
            h = h.replace('<li><a href="../../magaza/index.html">Mağaza</a></li>',
                          '<li><a href="../../magaza/index.html">Mağaza</a></li>\n          ' + link, 1)

    page.write_text(h, encoding="utf-8", newline="\n")


def category_nav(active):
    links = ['<a href="../index.html" class="shop-filter">Tümü</a>']
    for key, c in CATEGORIES.items():
        if key == active:
            links.append(f'<a href="index.html" class="shop-filter active" aria-current="page">{esc(c["name"])}</a>')
        else:
            links.append(f'<a href="../{c["slug"]}/index.html" class="shop-filter">{esc(c["name"])}</a>')
    return '<nav class="shop-filters" aria-label="Kategoriler">\n          ' + "\n          ".join(links) + "\n        </nav>"


def build_category(key, cat, shop_html):
    t = shop_html
    url = f"{SITE}/magaza/{cat['slug']}/"
    cards = re.findall(r'(        <article class="product-card shop-card" data-cat="([a-z]+)".*?\n        </article>\n)', t, re.S)
    mine = [c for c, k in cards if k == key]
    prices = [float(re.search(r'data-price="([\d.]+)"', c).group(1)) for c in mine]
    marker = '<div class="products-grid shop-grid" id="shop-grid">\n'
    grid_start = t.index(marker) + len(marker)
    grid_end = t.index('      </div>\n\n      <div style="margin-top: 5rem;">')
    t = t[:grid_start] + "".join(mine) + t[grid_end:]

    t = re.sub(r'\n      <nav class="category-links".*?</nav>\n', "\n", t, 1, flags=re.S)
    t = re.sub(r'<div class="shop-filters".*?</div>', lambda m: category_nav(key), t, 1, flags=re.S)
    t = re.sub(r'<span class="shop-count" aria-live="polite"><strong>\d+</strong>',
               f'<span class="shop-count" aria-live="polite"><strong>{len(mine)}</strong>', t, 1)

    lo, hi = fmt_price(min(prices), "tr"), fmt_price(max(prices), "tr")
    header = (f'<div class="section-header" style="margin-top: 1.5rem;">\n'
              f'        <span class="eyebrow">{esc(cat["name"].upper())}</span>\n'
              f'        <h1>{esc(cat["h1"])}</h1>\n'
              f'        <div class="brass-line"></div>\n'
              f'        <p><strong>{len(mine)} model, {lo} – {hi} arası fiyatlarla.</strong> {esc(cat["intro"][0])}</p>\n'
              f'      </div>\n')
    t = re.sub(r'<div class="section-header" style="margin-top: 1.5rem;">.*?\n      </div>\n', lambda m: header, t, 1, flags=re.S)
    t = t.replace('<li aria-current="page">Mağaza</li>',
                  f'<li><a href="../index.html">Mağaza</a></li>\n          <li aria-current="page">{esc(cat["name"])}</li>', 1)

    intro = "\n".join(f"        <p>{esc(x)}</p>" for x in cat["intro"][1:])
    faq_html = "\n".join(
        f'          <div class="faq-item">\n'
        f'            <button class="faq-question" aria-expanded="false">\n'
        f'              {esc(q)}\n'
        f'              <svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>\n'
        f'            </button>\n'
        f'            <div class="faq-answer">\n'
        f'              <div class="faq-answer-inner">{esc(a)}</div>\n'
        f'            </div>\n'
        f'          </div>' for q, a in cat["faq"])
    about = (f'\n      <section class="category-about">\n'
             f'        <h2>{esc(cat["name"])} Hakkında</h2>\n{intro}\n'
             f'        <h2>Sık Sorulan Sorular</h2>\n'
             f'        <div class="faq-list">\n{faq_html}\n        </div>\n      </section>\n')
    t = t.replace('\n      <div style="margin-top: 5rem;">', about + '\n      <div style="margin-top: 5rem;">', 1)

    desc = (f"{cat['h1']}: {len(mine)} model, {lo} – {hi}. Bakım gerektirmez, el yapımı. "
            f"Türkiye geneli ücretsiz kargo, 14 gün iade.")
    t = re.sub(r"<title>[^<]*</title>", lambda m: f"<title>{esc(cat['title'])}</title>", t, 1)
    for attr in ('name="description"', 'property="og:description"'):
        t = re.sub(r'(<meta ' + re.escape(attr) + r' content=")[^"]*(")', lambda m: m.group(1) + esc(desc) + m.group(2), t, 1)
    t = re.sub(r'(<meta property="og:title" content=")[^"]*(")', lambda m: m.group(1) + esc(cat["title"]) + m.group(2), t, 1)
    t = t.replace(f'<link rel="canonical" href="{SITE}/magaza/">', f'<link rel="canonical" href="{url}">')
    t = t.replace(f'<meta property="og:url" content="{SITE}/magaza/">', f'<meta property="og:url" content="{url}">')
    t = re.sub(r'\n\s*<link rel="alternate" hreflang="[a-z-]+"[^>]*>', "", t)
    t = re.sub(r'\n\s*<meta property="og:locale:alternate"[^>]*>', "", t)

    items = []
    for c in mine:
        slug = re.search(r'href="\.\./magaza/([^/]+)/index\.html"', c).group(1)
        items.append({"@type": "ListItem", "position": len(items) + 1, "url": f"{SITE}/magaza/{slug}/",
                      "name": phrase(slug, "tr")})
    lds = [
        {"@context": "https://schema.org", "@type": "CollectionPage", "name": cat["h1"], "description": desc,
         "url": url, "mainEntity": {"@type": "ItemList", "numberOfItems": len(items), "itemListElement": items}},
        {"@context": "https://schema.org", "@type": "FAQPage",
         "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
                        for q, a in cat["faq"]]},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Ana Sayfa", "item": f"{SITE}/"},
            {"@type": "ListItem", "position": 2, "name": "Mağaza", "item": f"{SITE}/magaza/"},
            {"@type": "ListItem", "position": 3, "name": cat["name"], "item": url}]},
    ]
    t = LD_RE.sub("<!--drop-->", t)
    t = re.sub(r"\n[ \t]*<!-- Yapılandırılmış Veri:[^>]*-->", "", t)
    t = re.sub(r"\n[ \t]*<!--drop-->", "", t)
    ld_html = "".join('  <script type="application/ld+json">\n  ' + dump_ld(d, "  ") + "\n  </script>\n" for d in lds)
    t = t.replace("</head>", ld_html + "</head>", 1)

    # göreli yolları bir seviye derine taşı (kategori nav linkleri hariç: onlar zaten doğru)
    nav_start = t.index('<nav class="shop-filters"')
    nav_end = t.index("</nav>", nav_start)
    nav = t[nav_start:nav_end]
    t = t[:nav_start] + "@@NAV@@" + t[nav_end:]
    t = re.sub(r'((?:href|src)=")\.\./', r"\1../../", t)
    t = t.replace('<li><a href="../../index.html">Mağaza</a></li>', '<li><a href="../index.html">Mağaza</a></li>')
    t = t.replace("@@NAV@@", nav)
    # dil seçici: TR bu sayfa, EN/RU mağaza ana sayfası
    t = t.replace('href="../../en/shop/index.html"', 'href="../../en/shop/index.html"')

    out = ROOT / "magaza" / cat["slug"] / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(t, encoding="utf-8", newline="\n")
    return url


def add_shop_category_links():
    p = ROOT / "magaza/index.html"
    t = p.read_text(encoding="utf-8")
    if 'class="category-links"' in t:
        return
    block = ('\n      <nav class="category-links" aria-label="Kategori sayfaları">\n        <span>Kategoriler:</span>\n        '
             + "\n        ".join(f'<a href="{c["slug"]}/index.html">{esc(c["name"])}</a>' for c in CATEGORIES.values())
             + "\n      </nav>\n")
    t = t.replace('\n      <div class="shop-toolbar">', block + '\n      <div class="shop-toolbar">', 1)
    p.write_text(t, encoding="utf-8", newline="\n")


def update_sitemap(urls):
    p = ROOT / "sitemap.xml"
    t = p.read_text(encoding="utf-8")
    add = ""
    for u in urls:
        if f"<loc>{u}</loc>" not in t:
            add += f"  <url>\n    <loc>{u}</loc>\n    <lastmod>2026-11-21</lastmod>\n    <priority>0.8</priority>\n  </url>\n"
    if add:
        p.write_text(t.replace("</urlset>", add + "</urlset>"), encoding="utf-8", newline="\n")


def main():
    cat_map = product_category_map()
    assert len(cat_map) == 34, len(cat_map)
    shop_html = (ROOT / "magaza/index.html").read_text(encoding="utf-8")
    urls = [build_category(k, c, shop_html) for k, c in CATEGORIES.items()]
    add_shop_category_links()
    n = 0
    for lang, L in LANG.items():
        for page in sorted((ROOT / L["dir"]).glob("*/index.html")):
            if page.parent.name in CAT_SLUGS:
                continue
            process_product(page, lang, cat_map)
            n += 1
    update_sitemap(urls)
    print(f"{n} ürün sayfası, {len(urls)} kategori sayfası")


if __name__ == "__main__":
    main()
