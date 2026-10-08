/**
 * Eliva Moss — Ürün Kataloğu Veri Kaynağı (Faz 1 & Faz 2)
 * Bu dosya statik sayfaların tek doğruluk kaynağıdır.
 * Faz 2 e-ticarete geçildiğinde fiyat ve stok yönetimi ile genişletilecektir.
 */

const products = [
  {
    id: "elv-001",
    title: "Stabilize Yosun Pano",
    slug: "stabilize-yosun-pano",
    badge: "Çok Satan",
    category: "Panolar",
    categorySlug: "panolar",
    image: "stabilize-yosun-pano.webp",
    imageFallback: "stabilize-yosun-pano.jpg",
    alt: "Pirinç çerçeveli stabilize yosun pano duvar dekoru",
    shortDescription: "Doğal dağ ve adaçayı yosunlarının özel stabilize tekniğiyle pirinç çerçevede buluştuğu zamansız duvar panosu.",
    description: "Eliva Moss Stabilize Yosun Pano, doğanın en saf halini modern iç mekan estetiğiyle harmanlar. Yüksek rakımlı dağlardan sürdürülebilir yöntemlerle toplanan doğal yosunlar, özel biyolojik koruma (stabilizasyon) işleminden geçirilerek canlılığını, elastikiyetini ve taze kokusunu uzun yıllar korur. Suya, gün ışığına veya budamaya ihtiyaç duymaz. Doğal lifli yapısı sayesinde mekan akustiğine katkı sağlar ve yankıyı azaltır.",
    features: [
      "%100 Doğal ve biyolojik olarak stabilize edilmiş yosunlar",
      "Sıfır bakım: Sulama, gübreleme veya gün ışığı gerektirmez",
      "Akustik konfor sağlayan ses emici doğal yüzey",
      "El işçiliği fırçalanmış pirinç çerçeve detayı",
      "Antistatik yapısı sayesinde toz ve polen barındırmaz",
      "Zararlı kimyasal ve toksik madde içermez, çevre dostudur"
    ],
    specs: [
      { key: "Standart Ebatlar", value: "60 x 60 cm, 80 x 80 cm veya projeye özel ölçü" },
      { key: "Kullanılan Yosunlar", value: "Stabilize Dağ Yosunu, Adaçayı Yosunu, Ada Yosunu" },
      { key: "Çerçeve Seçeneği", value: "Mat Fırçalanmış Pirinç veya Doğal Masif Meşe" },
      { key: "Kullanım Ömrü", value: "İç mekanda 7 - 10 yıl formunu ve tazeliğini korur" },
      { key: "Bakım Şartı", value: "%40-%70 arası ideal oda nemi, doğrudan güneşten koruyun" }
    ],
    sku: "ELV-PNO-001",
    price: null, // Faz 1 vitrin
    inStock: true,
    seoTitle: "Stabilize Yosun Pano | Eliva Moss Lüks Duvar Tasarımı",
    seoDescription: "Doğal stabilize yosun pano ile mekanlarınıza yeşilin huzurunu ve editoryal şıklığı getirin. El işçiliği pirinç çerçeveli premium yosun panolar Eliva Moss'ta."
  },
  {
    id: "elv-002",
    title: "Yastık Yosunu Tablo",
    slug: "yastik-yosunu-tablo",
    badge: "Özel Tasarım",
    category: "Tablolar",
    categorySlug: "tablolar",
    image: "yastik-yosunu-tablo.webp",
    imageFallback: "yastik-yosunu-tablo.jpg",
    alt: "Yuvarlak masif ahşap ve pirinç detaylı yastık yosunu tablo",
    shortDescription: "Üç boyutlu dolgun top yosun (ball moss) dokularının masif ceviz ve fırçalanmış pirinç çerçevede buluştuğu heykelsi sanat eseri.",
    description: "Yastık Yosunu Tablo (Ball / Bun Moss), doğadaki organik tepecik formlarını duvarlarınıza taşır. Her bir yastık yosunu özenle seçilmiş, yüksek yoğunluklu kabarık dokusuyla 3 boyutlu bir derinlik oluşturur. Masif ceviz çerçeve ve içteki ince antik pirinç şerit, mekana sofistike bir galeri havası katar. Hiçbir bakım istemeyen bu sanat parçası, modern ve klasik yaşam alanlarına doğal bir dinginlik aşılar.",
    features: [
      "Hacimli ve heykelsi 3D yastık yosun dokusu",
      "Birinci sınıf masif ceviz ağacı ve pirinç bilezik çerçeve",
      "Sulama, toprak ve gün ışığı gerektirmez",
      "Farklı zümrüt ve adaçayı yeşili doğal ton gradyanları",
      "Akustik yankıyı sönümleyen yüksek dolgu yoğunluğu",
      "Her esere özel butik el işçiliği ve benzersiz doku"
    ],
    specs: [
      { key: "Standart Çaplar", value: "Ø 50 cm, Ø 70 cm, Ø 90 cm veya özel ebat" },
      { key: "Kullanılan Yosunlar", value: "Birinci Kalite Yastık / Top Yosunu (Pillow Moss), Liken" },
      { key: "Çerçeve Seçeneği", value: "Doğal Masif Ceviz Ahşap & Pirinç Aksan" },
      { key: "Kullanım Ömrü", value: "7 - 10 yıl esnekliğini ve canlı rengini muhafaza eder" },
      { key: "Bakım Şartı", value: "Sadece iç mekan; su püskürtmeyiniz, doğrudan radyatörden uzak tutunuz" }
    ],
    sku: "ELV-TBL-002",
    price: null,
    inStock: true,
    seoTitle: "Yastık Yosunu Tablo | Yuvarlak Ahşap & Pirinç Çerçeveli | Eliva Moss",
    seoDescription: "Özel seçilmiş dolgun yastık yosunları ile el yapımı yuvarlak duvar tablosu. Masif ceviz ve pirinç detaylı lüks iç mekan tasarımı Eliva Moss'ta."
  },
  {
    id: "elv-003",
    title: "Terraryum Yosunu Seti",
    slug: "terraryum-yosunu-seti",
    badge: "Botanik Koleksiyon",
    category: "Botanik Setler",
    categorySlug: "setler",
    image: "terraryum-yosunu-seti.webp",
    imageFallback: "terraryum-yosunu-seti.jpg",
    alt: "Ahşap kutulu lüks stabilize terraryum ve dağ yosunları seti",
    shortDescription: "Botanik meraklıları ve iç mimari detaylar için özenle seçilmiş mini dağ yosunları, geyik yosunu ve liken koleksiyon seti.",
    description: "Eliva Moss Terraryum Yosunu Seti; cam fanus projeleriniz, masaüstü botanik kompozisyonlarınız veya dekoratif kaseleriniz için gereken en seçkin yosun türlerini tek bir lüks ahşap sandıkta sunar. Kutu içerisinde yastık yosunu, dağ yosunu, geyik yosunu (reindeer moss) ve doğal liken yer alır. Kutuya özel pirinç logolu kapak, hassas yerleştirme için botanik cımbız ve ahşap kaşık eşlik eder.",
    features: [
      "4 farklı premium tür: Yastık yosun, dağ yosunu, geyik yosunu, ağaç likeni",
      "Pirinç menteşeli ve kilitli el yapımı masif ahşap koleksiyon sandığı",
      "Özel botanik cımbız ve yerleştirme kaşığı dahil",
      "Nem ve sulama istemeyen uzun ömürlü stabilize materyal",
      "Hediye, ofis masası veya ev dekorasyonu için kusursuz prestijli sunum"
    ],
    specs: [
      { key: "Kutu Boyutu", value: "24 x 20 x 8 cm Masif Meşe / Çam Sandık" },
      { key: "Kutu İçeriği", value: "4 Bölmeli Yosun Koleksiyonu + Botanik Cımbız + Ahşap Kaşık" },
      { key: "Kullanım Ömrü", value: "5+ yıl tazelik ve yumuşak doku" },
      { key: "Kullanım Alanı", value: "Cam fanuslar, masaüstü dekorlar, botanik hediye sunumları" }
    ],
    sku: "ELV-SET-003",
    price: null,
    inStock: true,
    seoTitle: "Terraryum Yosunu Seti | Ahşap Kutulu Botanik Koleksiyon | Eliva Moss",
    seoDescription: "Stabilize dağ yosunu, liken ve geyik yosunlarından oluşan lüks terraryum seti. Ahşap sunum sandığı ve botanik aksesuarlarıyla Eliva Moss'ta."
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { products };
}
