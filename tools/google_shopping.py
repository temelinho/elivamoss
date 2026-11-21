"""
Google Alışveriş (Shopping) hazırlığı.

1) Mağaza ürün sayfalarındaki (TR /magaza, EN /en/shop, RU /ru/shop) Product
   JSON-LD verisini Google "merchant listing" alanlarıyla tamamlar:
   sku, itemCondition, seller, shippingDetails, hasMerchantReturnPolicy.
2) Google Merchant Center için RSS 2.0 ürün feed'leri üretir:
   feeds/google-merchant-tr.xml, -en.xml, -ru.xml

Fiyat/ürün değişince tekrar çalıştırın (idempotent):
    python tools/google_shopping.py
"""
import json
import re
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://elivamoss.com.tr"
BRAND = "Eliva Moss"

# --- Mağaza politikaları (yasal/index.html#teslimat ile tutarlı tutun) ---
SHIPPING_PRICE = "0"          # Türkiye geneli ücretsiz kargo
HANDLING_DAYS = (1, 3)        # siparişe özel hazırlık (iş günü)
TRANSIT_DAYS = (2, 4)         # kargo süresi (iş günü)
RETURN_DAYS = 14              # standart ürünlerde 14 gün içinde değişim

LANGS = {
    "tr": {"dir": "magaza", "prefix": "/magaza/"},
    "en": {"dir": "en/shop", "prefix": "/en/shop/"},
    "ru": {"dir": "ru/shop", "prefix": "/ru/shop/"},
}

LD_RE = re.compile(r'(<script type="application/ld\+json">\s*)(.*?)(\s*</script>)', re.S)
HREFLANG_TR_RE = re.compile(r'<link rel="alternate" hreflang="tr" href="([^"]+)"')


def google_category(tr_slug: str) -> str:
    if "bonsai" in tr_slug:
        return "Home & Garden > Decor"  # stabilize (doğal) bonsai
    return "Home & Garden > Decor > Artwork"


def sku_for(tr_slug: str) -> str:
    return "ELV-" + tr_slug.upper()


def shipping_details():
    return {
        "@type": "OfferShippingDetails",
        "shippingRate": {"@type": "MonetaryAmount", "value": SHIPPING_PRICE, "currency": "TRY"},
        "shippingDestination": {"@type": "DefinedRegion", "addressCountry": "TR"},
        "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "handlingTime": {"@type": "QuantitativeValue", "minValue": HANDLING_DAYS[0],
                             "maxValue": HANDLING_DAYS[1], "unitCode": "DAY"},
            "transitTime": {"@type": "QuantitativeValue", "minValue": TRANSIT_DAYS[0],
                            "maxValue": TRANSIT_DAYS[1], "unitCode": "DAY"},
        },
    }


def return_policy():
    return {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "TR",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": RETURN_DAYS,
        "returnMethod": "https://schema.org/ReturnByMail",
        "returnFees": "https://schema.org/ReturnFeesCustomerResponsibility",
        "merchantReturnLink": f"{SITE}/yasal/#teslimat",
    }


def enrich(data: dict, tr_slug: str) -> dict:
    offer = data["offers"]
    out = {}
    for k, v in data.items():
        if k == "offers":
            continue
        out[k] = v
        if k == "name":
            out["sku"] = sku_for(tr_slug)
    new_offer = {
        "@type": "Offer",
        "url": offer["url"],
        "priceCurrency": offer["priceCurrency"],
        "price": offer["price"],
        "availability": offer["availability"],
        "itemCondition": "https://schema.org/NewCondition",
        "seller": {"@type": "Organization", "name": BRAND, "url": f"{SITE}/"},
        "shippingDetails": shipping_details(),
        "hasMerchantReturnPolicy": return_policy(),
    }
    out["offers"] = new_offer
    return out


def process_lang(lang: str):
    cfg = LANGS[lang]
    items = []
    for page in sorted((ROOT / cfg["dir"]).glob("*/index.html")):
        html = page.read_text(encoding="utf-8")
        tr_url_m = HREFLANG_TR_RE.search(html)
        if not tr_url_m:
            continue  # kategori sayfası vb.
        tr_slug = tr_url_m.group(1).rstrip("/").split("/")[-1]

        def repl(m):
            data = json.loads(m.group(2))
            if data.get("@type") != "Product":
                return m.group(0)
            data = enrich(data, tr_slug)
            items.append((data, tr_slug))
            base = m.group(1).rsplit("\n", 1)[-1] if "\n" in m.group(1) else ""
            body = json.dumps(data, ensure_ascii=False, indent=2).replace("\n", "\n" + base)
            return m.group(1) + body + m.group(3)

        new_html = LD_RE.sub(repl, html)
        if new_html != html:
            page.write_text(new_html, encoding="utf-8", newline="\n")
    return items


def feed_xml(lang: str, items) -> str:
    titles = {"tr": "Eliva Moss Mağaza", "en": "Eliva Moss Shop", "ru": "Eliva Moss Магазин"}
    out = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
        "<channel>",
        f"<title>{escape(titles[lang])}</title>",
        f"<link>{SITE}{LANGS[lang]['prefix']}</link>",
        f"<description>{escape(titles[lang])}</description>",
    ]
    for data, tr_slug in items:
        offer = data["offers"]
        avail = "in_stock" if offer["availability"].endswith("InStock") else "out_of_stock"
        imgs = data["image"] if isinstance(data["image"], list) else [data["image"]]
        out.append("<item>")
        out.append(f"  <g:id>{escape(sku_for(tr_slug))}</g:id>")
        out.append(f"  <g:title>{escape(data['name'])}</g:title>")
        out.append(f"  <g:description>{escape(data['description'])}</g:description>")
        out.append(f"  <g:link>{escape(offer['url'])}</g:link>")
        out.append(f"  <g:image_link>{escape(imgs[0])}</g:image_link>")
        for extra in imgs[1:11]:
            out.append(f"  <g:additional_image_link>{escape(extra)}</g:additional_image_link>")
        out.append(f"  <g:availability>{avail}</g:availability>")
        out.append(f"  <g:price>{offer['price']} {offer['priceCurrency']}</g:price>")
        out.append("  <g:condition>new</g:condition>")
        out.append(f"  <g:brand>{BRAND}</g:brand>")
        out.append("  <g:identifier_exists>no</g:identifier_exists>")
        out.append(f"  <g:google_product_category>{escape(google_category(tr_slug))}</g:google_product_category>")
        if data.get("category"):
            out.append(f"  <g:product_type>{escape(data['category'])}</g:product_type>")
        out.append("  <g:shipping>")
        out.append("    <g:country>TR</g:country>")
        out.append(f"    <g:price>{SHIPPING_PRICE} TRY</g:price>")
        out.append(f"    <g:min_handling_time>{HANDLING_DAYS[0]}</g:min_handling_time>")
        out.append(f"    <g:max_handling_time>{HANDLING_DAYS[1]}</g:max_handling_time>")
        out.append(f"    <g:min_transit_time>{TRANSIT_DAYS[0]}</g:min_transit_time>")
        out.append(f"    <g:max_transit_time>{TRANSIT_DAYS[1]}</g:max_transit_time>")
        out.append("  </g:shipping>")
        out.append("</item>")
    out += ["</channel>", "</rss>", ""]
    return "\n".join(out)


def main():
    feeds = ROOT / "feeds"
    feeds.mkdir(exist_ok=True)
    for lang in LANGS:
        items = process_lang(lang)
        (feeds / f"google-merchant-{lang}.xml").write_text(feed_xml(lang, items), encoding="utf-8", newline="\n")
        print(f"{lang}: {len(items)} ürün")


if __name__ == "__main__":
    main()
