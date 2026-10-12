/**
 * ELIVA MOSS - İnteraktif Dokunsal Yosun Duvarı Shader Motoru
 * (Tactile Interactive Moss Canvas Engine)
 * 
 * Özellikler:
 * - Saf WebGL (Sıfır harici kütüphane bağımlılığı, 60-120 FPS ultra hafif)
 * - Tıklama ve Dokunma ile Z ekseninde pofuduk 3D kabarma (Gaussian Bulge)
 * - Parmağın sağa-sola hareketine göre doku yönelmesi ve liflerin yatması (Directional Sway)
 * - Çerçeve koruma maskesi (SADECE yosunlar kabarır, pirinç çerçeve sabit kalır)
 * - Organik yay fiziği (Damped Spring Physics - Hooke Kanunu)
 * - Mobil uyumlu akıllı dokunmatik kontroller
 */

(function () {
  'use strict';

  function initInteractiveMoss() {
    const canvas = document.getElementById('moss-canvas');
    if (!canvas) return;

    const container = canvas.parentElement;
    const badge = document.getElementById('moss-hint-badge');

    // WebGL Context
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance'
    }) || canvas.getContext('experimental-webgl');

    if (!gl) {
      console.warn('WebGL desteklenmiyor, statik görsel devrede.');
      if (canvas) canvas.style.display = 'none';
      return;
    }

    // Vertex Shader: Basit 2D Düzlem
    const vsSource = `
      attribute vec2 aPosition;
      attribute vec2 aTexCoord;
      varying vec2 vUv;
      void main() {
        vUv = aTexCoord;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    // Fragment Shader: 3D Kabarma, Sağa-Sola Yönelme ve Işık
    const fsSource = `
      precision highp float;
      varying vec2 vUv;

      uniform sampler2D uTexture;     // Yosun & Çerçeve Görseli
      uniform sampler2D uMask;        // Maske: Çerçeve=0, Yosunlar>0
      uniform sampler2D uNormal;      // Yüzey Normalleri (3D Işık)
      uniform sampler2D uDepth;       // Yükseklik Haritası: Çerçeve=1 (önde), yosun 0.04-0.70 (gömülü)
      uniform vec2 uTilt;            // Bakış açısı eğimi (-1..1): fare / telefon eğimi
      uniform float uDepthScale;     // Derinlik (parallax) şiddeti
      uniform vec4 uInner;           // Işının kalacağı güvenli iç alan (minX, minY, maxX, maxY) UV
      uniform vec4 uFrame;           // Pirinç çerçevenin tam iç kenarı (minX, minY, maxX, maxY) UV

      float gEdge = 0.0;             // Işın çerçeve duvarına ne kadar dayandı (iç duvar gölgesi)

      uniform vec2 uTouch;           // Dokunulan nokta (UV 0..1)
      uniform float uBulge;          // Kabarma yay şiddeti (0..1)
      uniform vec2 uVelocity;        // Sürükleme yönü ve hızı (dx, dy)
      uniform float uTime;           // Zaman (Organik nefes alma dalgası)
      uniform float uRadius;         // Kabarma yarıçapı
      uniform float uAspect;         // Canvas yükseklik / genişlik oranı (dikey çerçeve)

      float heightAt(vec2 p) {
        return texture2D(uDepth, p).r;
      }

      // Parallax Occlusion Mapping: bakış ışını katman katman ilerler, ilk çarptığı yüzeyi bulur.
      // Böylece öndeki yosun topları arkadakileri örter, çerçeve kenarı içteki yosunu gizler.
      vec2 parallaxUv(vec2 uv) {
        vec2 dir = uTilt * uDepthScale * vec2(1.0, 1.0 / uAspect);
        const int STEPS = 24;
        float dl = 1.0 / float(STEPS);
        float layer = 1.0;
        vec2 p = uv;
        vec2 prevP = uv;
        float prevDiff = 0.0;
        for (int i = 0; i < STEPS; i++) {
          float diff = heightAt(p) - layer;
          if (diff >= 0.0) {
            float w = diff / (diff - prevDiff + 0.00001);
            return mix(p, prevP, w);
          }
          prevP = p;
          prevDiff = diff;
          layer -= dl;
          p = uv + dir * (1.0 - layer);
          // Yosun çerçevenin altına doğru devam eder: ışını iç alanda tut, taşmayı duvar gölgesi say
          vec2 cp = clamp(p, uInner.xy, uInner.zw);
          gEdge = max(gEdge, length((p - cp) * vec2(1.0, uAspect)));
          p = cp;
        }
        return p;
      }

      void main() {
        vec2 uv = vUv;

        // Pirinç çerçeve alanı (!insideFrame): KESİNLİKLE sabit kalır, hiçbir deformasyon veya parallax uygulanmaz!
        bool insideFrame = all(greaterThan(uv, uFrame.xy)) && all(lessThan(uv, uFrame.zw));
        if (!insideFrame) {
          gl_FragColor = texture2D(uTexture, uv);
          return;
        }

        // Maske: Çerçeve alanı 0.0, yosun alanları 0.3 - 1.0
        float mask = texture2D(uMask, uv).r;

        // 1. Dokunulan Noktaya Uzaklık
        vec2 delta = uv - uTouch;
        // Dikey çerçevede kabarma elips değil, tam daire kalsın
        float dist = length(delta * vec2(1.0, uAspect));

        // 2. Doğal Kubbe Eğrisi (Pofuduk tepe/kabarma, sıfır sarmal)
        float influence = 0.0;
        if (dist < uRadius) {
          float normD = dist / uRadius;
          // Pürüzsüz kosinüs kubbesi: merkezde yumuşak tepe, kenarda tatlı sönüm
          float dome = cos(normD * 1.5707963);
          influence = dome * dome;
        }

        // Çerçeve iç kenarına yaklaşırken kabarmayı yumuşakça sönümle (kenarda sıfır bozulma)
        float edgeDistX = min(uv.x - uFrame.x, uFrame.z - uv.x);
        float edgeDistY = min(uv.y - uFrame.y, uFrame.w - uv.y) * uAspect;
        float edgeFade = smoothstep(0.0, 0.032, min(edgeDistX, edgeDistY));

        // SADECE yosunlar kabarır, çerçeve kesinlikle kabarmasın!
        float bulgeFactor = influence * uBulge * mask * edgeFade;

        // 3. İmlecin ucunda doğal dışa doğru 3D kabarma (Merkezde tekillik/kırılma/sarmal yapmaz)
        vec2 bulgeOffset = -delta * (bulgeFactor * 0.28);

        // 4. Doğal hafif yatma (Sarmal/dönme yok, sadece anlık meyil)
        vec2 dragOffset = -uVelocity * (bulgeFactor * 0.12);

        // Toplam Deformasyon (güvenli iç alanda tut)
        vec2 displacedUv = clamp(uv + bulgeOffset + dragOffset, uInner.xy, uInner.zw);

        // 4b. Gerçek derinlik: bakış açısına göre katmanlar farklı hızda kayar.
        // Yosun fotoğrafı çerçevenin altına taşacak kadar hafif büyütülür: en uç açıda bile kenarda boşluk kalmaz.
        displacedUv = vec2(0.5) + (displacedUv - vec2(0.5)) * 0.885;
        displacedUv = clamp(parallaxUv(displacedUv), uInner.xy, uInner.zw);
        float h = heightAt(displacedUv);

        // Ana Doku Örnekleme
        vec4 color = texture2D(uTexture, displacedUv);

        // 5. Dinamik 3D Işık ve Gölge (Kabaran kubbenin tepe ışığı)
        vec3 normal = texture2D(uNormal, displacedUv).rgb * 2.0 - 1.0;
        vec3 lightDir = normalize(vec3(uTouch.x - uv.x, (1.0 - uTouch.y) - (1.0 - uv.y), 0.55));
        float diffLight = max(dot(normal, lightDir), 0.0);

        // Kabardıkça ışık vurgusunu ve derinlik gölgesini güçlendir
        float lightEffect = bulgeFactor * 1.6;
        color.rgb += vec3(diffLight * 0.15 * lightEffect);

        // 6. Derinlik gölgesi (çukurlar hafif koyu) ve bakış açısıyla kayan yumuşak ışık
        float inMoss = step(h, 0.95);
        color.rgb *= mix(1.0, mix(0.80, 1.06, smoothstep(0.04, 0.70, h)), inMoss);
        vec3 tiltLight = normalize(vec3(-uTilt.x * 0.8 - 0.35, uTilt.y * 0.8 + 0.45, 0.9));
        float relief = dot(normal, tiltLight) - 0.55;
        color.rgb += vec3(relief * 0.10 * inMoss);

        // 7. Çerçevenin iç duvarı: bakış açısı yana kaydıkça kenarda yumuşak gölge
        if (insideFrame) {
          // Çerçevenin yosun üzerine düşen yumuşak iç gölgesi; bakış yönüne göre bir kenarda genişler
          float dL = uv.x - uFrame.x;
          float dR = uFrame.z - uv.x;
          float dT = (uv.y - uFrame.y) * uAspect;
          float dB = (uFrame.w - uv.y) * uAspect;
          float sh = 1.0;
          sh *= mix(0.55, 1.0, smoothstep(0.0, 0.022 + max(0.0, -uTilt.x) * 0.03, dL));
          sh *= mix(0.55, 1.0, smoothstep(0.0, 0.022 + max(0.0,  uTilt.x) * 0.03, dR));
          sh *= mix(0.55, 1.0, smoothstep(0.0, 0.022 + max(0.0, -uTilt.y) * 0.03, dT));
          sh *= mix(0.55, 1.0, smoothstep(0.0, 0.022 + max(0.0,  uTilt.y) * 0.03, dB));
          color.rgb *= sh;
        }

        gl_FragColor = color;
      }
    `;

    // Shader Derleme Fonksiyonu
    function compileShader(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader derleme hatası:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = compileShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link hatası:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Düzlem Geometrisi (Tam ekran 2D Quad)
    // [x, y, u, v]
    const vertices = new Float32Array([
      -1.0, -1.0, 0.0, 1.0,
       1.0, -1.0, 1.0, 1.0,
      -1.0,  1.0, 0.0, 0.0,
      -1.0,  1.0, 0.0, 0.0,
       1.0, -1.0, 1.0, 1.0,
       1.0,  1.0, 1.0, 0.0,
    ]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, 'aPosition');
    const aTexCoord = gl.getAttribLocation(program, 'aTexCoord');

    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(aTexCoord);
    gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 16, 8);

    // Uniform Konumları
    const uTextureLoc = gl.getUniformLocation(program, 'uTexture');
    const uMaskLoc = gl.getUniformLocation(program, 'uMask');
    const uNormalLoc = gl.getUniformLocation(program, 'uNormal');
    const uTouchLoc = gl.getUniformLocation(program, 'uTouch');
    const uBulgeLoc = gl.getUniformLocation(program, 'uBulge');
    const uVelocityLoc = gl.getUniformLocation(program, 'uVelocity');
    const uTimeLoc = gl.getUniformLocation(program, 'uTime');
    const uRadiusLoc = gl.getUniformLocation(program, 'uRadius');
    const uAspectLoc = gl.getUniformLocation(program, 'uAspect');
    const uDepthLoc = gl.getUniformLocation(program, 'uDepth');
    const uTiltLoc = gl.getUniformLocation(program, 'uTilt');
    const uDepthScaleLoc = gl.getUniformLocation(program, 'uDepthScale');

    gl.uniform1i(uTextureLoc, 0);
    gl.uniform1i(uMaskLoc, 1);
    gl.uniform1i(uNormalLoc, 2);
    gl.uniform1f(uRadiusLoc, 0.28);
    gl.uniform1f(uAspectLoc, 1.5);
    gl.uniform1i(uDepthLoc, 3);
    gl.uniform1f(uDepthScaleLoc, 0.05);
    // Pirinç çerçeve kalınlığı: 800x1200 dokuda 40px (+3px pay: doku filtrelemesi pirinci karıştırmasın)
    // Fotoğraftaki gerçek ölçü: üst/sol çıta 38px'te, alt/sağ çıta 40px'te bitiyor
    gl.uniform4f(gl.getUniformLocation(program, 'uInner'), 41 / 800, 41 / 1200, 1 - 43 / 800, 1 - 43 / 1200);
    gl.uniform4f(gl.getUniformLocation(program, 'uFrame'), 38 / 800, 38 / 1200, 1 - 40 / 800, 1 - 40 / 1200);

    // Dokular yüklenene kadar canvas gizli: statik görsel görünür, düz yeşil kare görünmez
    canvas.style.opacity = '0';
    canvas.style.transition = 'opacity 0.5s ease';
    let texturesReady = 0;
    function onTextureReady() {
      texturesReady += 1;
      if (texturesReady === 4) canvas.style.opacity = '1';
    }

    // Texture Yükleyici
    function loadTexture(gl, url, unit) {
      const texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);

      // Geçici 1x1 yeşil piksel (görsel yüklenene kadar boş kalmasın)
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([30, 60, 25, 255])
      );

      const image = new Image();
      if (window.location.protocol !== 'file:' && url.indexOf('data:') !== 0) {
        image.crossOrigin = 'anonymous';
      }
      image.onload = function () {
        try {
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          onTextureReady();
        } catch (err) {
          console.warn('Doku WebGL aktarım uyarısı:', err);
        }
      };
      image.src = url;
      return texture;
    }

    // Görselleri Bağla (Tamamı Kayıpsız/Optimize WebP)
    function loadAllTextures(t) {
      loadTexture(gl, t.color, 0);
      loadTexture(gl, t.mask, 1);
      loadTexture(gl, t.normal, 2);
      loadTexture(gl, t.depth, 3);
    }

    if (window.location.protocol === 'file:') {
      // Dosyaya çift tıklanarak açıldığında tarayıcı yerel görselleri WebGL'e vermez (güvenlik).
      // Bu durumda dokular gömülü veri (data URI) olarak ayrı bir dosyadan yüklenir.
      const s = document.createElement('script');
      s.src = 'assets/js/hero-moss-textures.js?v=20261013b';
      s.onload = function () {
        if (window.ELIVA_MOSS_TEXTURES) loadAllTextures(window.ELIVA_MOSS_TEXTURES);
      };
      document.head.appendChild(s);
    } else {
      loadAllTextures({
        color: 'assets/img/hero-moss-tall.webp?v=20261013b',
        mask: 'assets/img/hero-moss-tall-mask.webp?v=20261013b',
        normal: 'assets/img/hero-moss-tall-normal.webp?v=20261013b',
        depth: 'assets/img/hero-moss-tall-depth.webp?v=20261013b'
      });
    }

    // --- FİZİK VE ETKİLEŞİM DURUMU ---
    let touchX = 0.5;
    let touchY = 0.5;
    let targetTouchX = 0.5;
    let targetTouchY = 0.5;

    let targetBulge = 0.0;
    let currentBulge = 0.0;
    let bulgeVelocity = 0.0;

    let targetVelX = 0.0;
    let targetVelY = 0.0;
    let currentVelX = 0.0;
    let currentVelY = 0.0;

    let isInteracting = false;
    let userHasInteracted = false;
    let lastUserInteractionTime = 0;
    let lastEventX = 0;
    let lastEventY = 0;

    // Derinlik bakış açısı (parallax tilt)
    let tiltX = 0.0, tiltY = 0.0;
    let targetTiltX = 0.0, targetTiltY = 0.0;
    let lastTiltInputTime = -99999;
    // Dokunmatik cihazlarda (telefon/tablet) derinlik kapalı: sadece dokunma kabarması
    const isTouchDevice = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    // Yay Sabitleri (Doğal, süngerimsi organik hissiyat)
    const STIFFNESS = 0.22;
    const DAMPING = 0.76;

    // Boyutlandırma (Responsive Retina & Mobil)
    function resizeCanvas() {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Mobilde pil ve hız için maks 2
      const width = Math.round(rect.width * dpr);
      const height = Math.round(rect.height * dpr);

      if (width > 0 && height > 0 && (canvas.width !== width || canvas.height !== height)) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
        if (rect.width > 0) gl.uniform1f(uAspectLoc, rect.height / rect.width);
      }
    }

    window.addEventListener('resize', resizeCanvas, { passive: true });
    if ('ResizeObserver' in window) {
      new ResizeObserver(resizeCanvas).observe(container);
    }
    resizeCanvas();

    // Koordinat Dönüştürücü (Client Pixel -> UV 0..1)
    function getUV(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      return {
        x: Math.max(0.0, Math.min(1.0, x)),
        y: Math.max(0.0, Math.min(1.0, y))
      };
    }

    // İpucu Rozetini Saklama / Onaylama
    function hideBadge() {
      if (badge && !badge.classList.contains('badge--hidden')) {
        badge.classList.add('badge--hidden');
      }
    }

    // --- DERİNLİK: FARE KONUMU (Masaüstü — sayfanın her yerinden) ---
    window.addEventListener('mousemove', function (e) {
      if (isTouchDevice) return;
      const rect = container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const rx = Math.max(window.innerWidth * 0.5, 1);
      const ry = Math.max(window.innerHeight * 0.5, 1);
      targetTiltX = Math.max(-1, Math.min(1, (e.clientX - cx) / rx));
      targetTiltY = Math.max(-1, Math.min(1, (e.clientY - cy) / ry));
      lastTiltInputTime = performance.now();
    }, { passive: true });

    // --- FARE / DESKTOP ETKİLEŞİMLERİ ---
    container.addEventListener('mouseenter', function (e) {
      isInteracting = true;
      userHasInteracted = true;
      lastUserInteractionTime = performance.now();
      targetBulge = 0.85;
      const uv = getUV(e.clientX, e.clientY);
      targetTouchX = uv.x;
      targetTouchY = uv.y;
      lastEventX = e.clientX;
      lastEventY = e.clientY;
    });

    container.addEventListener('mousemove', function (e) {
      const uv = getUV(e.clientX, e.clientY);
      targetTouchX = uv.x;
      targetTouchY = uv.y;

      const dx = (e.clientX - lastEventX) / (canvas.clientWidth || 400);
      const dy = (e.clientY - lastEventY) / (canvas.clientHeight || 400);

      targetVelX = Math.max(-0.35, Math.min(0.35, dx * 1.2));
      targetVelY = Math.max(-0.35, Math.min(0.35, dy * 1.2));

      lastEventX = e.clientX;
      lastEventY = e.clientY;

      isInteracting = true;
      userHasInteracted = true;
      lastUserInteractionTime = performance.now();
      targetBulge = 1.35;
      hideBadge();
    });

    container.addEventListener('mousedown', function () {
      targetBulge = 1.75;
      userHasInteracted = true;
      lastUserInteractionTime = performance.now();
      hideBadge();
    });

    window.addEventListener('mouseup', function () {
      if (isInteracting) {
        targetBulge = 1.20;
      }
    });

    container.addEventListener('mouseleave', function () {
      isInteracting = false;
      lastUserInteractionTime = performance.now();
      targetBulge = 0.0;
      targetVelX = 0.0;
      targetVelY = 0.0;
    });

    // --- MOBİL DOKUNMATİK (TOUCH) ETKİLEŞİMLERİ ---
    container.addEventListener('touchstart', function (e) {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const uv = getUV(touch.clientX, touch.clientY);
        touchX = uv.x;
        touchY = uv.y;
        targetTouchX = uv.x;
        targetTouchY = uv.y;

        lastEventX = touch.clientX;
        lastEventY = touch.clientY;

        isInteracting = true;
        userHasInteracted = true;
        lastUserInteractionTime = performance.now();
        targetBulge = 1.65;

        hideBadge();
      }
    }, { passive: true });

    container.addEventListener('touchmove', function (e) {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const uv = getUV(touch.clientX, touch.clientY);
        targetTouchX = uv.x;
        targetTouchY = uv.y;

        const dx = (touch.clientX - lastEventX) / (canvas.clientWidth || 300);
        const dy = (touch.clientY - lastEventY) / (canvas.clientHeight || 300);

        targetVelX = Math.max(-0.4, Math.min(0.4, dx * 1.5));
        targetVelY = Math.max(-0.4, Math.min(0.4, dy * 1.5));

        lastEventX = touch.clientX;
        lastEventY = touch.clientY;

        isInteracting = true;
        userHasInteracted = true;
        lastUserInteractionTime = performance.now();
        targetBulge = 1.45;
        hideBadge();
      }
    }, { passive: true });

    container.addEventListener('touchend', function () {
      isInteracting = false;
      lastUserInteractionTime = performance.now();
      targetBulge = 0.0;
      targetVelX = 0.0;
      targetVelY = 0.0;
    }, { passive: true });

    container.addEventListener('touchcancel', function () {
      isInteracting = false;
      lastUserInteractionTime = performance.now();
      targetBulge = 0.0;
      targetVelX = 0.0;
      targetVelY = 0.0;
    }, { passive: true });

    // --- RENDER DÖNGÜSÜ (60-120 FPS) ---
    let startTime = performance.now();

    function render(currentTime) {
      const elapsedSeconds = (currentTime - startTime) * 0.001;

      // 0. KULLANICI DOKUNMADIĞINDA OTOMATİK CANLI GÖSTERİM (%50 DAHA GENİŞ VE CANLI)
      const timeSinceUser = currentTime - lastUserInteractionTime;
      const shouldAutoPlay = !isInteracting && (!userHasInteracted || timeSinceUser > 2400);

      if (shouldAutoPlay) {
        const t = elapsedSeconds * 1.6;
        targetTouchX = 0.50 + Math.sin(t * 1.2) * 0.28;
        targetTouchY = 0.50 + Math.cos(t * 1.8) * 0.24;

        targetBulge = 1.45 + Math.sin(t * 3.0) * 0.50;

        targetVelX = Math.cos(t * 1.2) * 0.28 * 0.35;
        targetVelY = -Math.sin(t * 1.8) * 0.24 * 0.35;
      }

      // 0b. Bakış açısı: girdi yoksa yavaş, sakin bir salınım (derinlik kendiliğinden görünsün)
      if (isTouchDevice) {
        targetTiltX = 0.0;
        targetTiltY = 0.0;
      } else if (currentTime - lastTiltInputTime > 3000) {
        const tt = elapsedSeconds * 0.55;
        targetTiltX = Math.sin(tt) * 0.75;
        targetTiltY = Math.sin(tt * 0.7 + 1.3) * 0.5;
      }
      tiltX += (targetTiltX - tiltX) * 0.07;
      tiltY += (targetTiltY - tiltY) * 0.07;

      // 1. Dokunma Noktası Yumuşatma (Lerp)
      touchX += (targetTouchX - touchX) * 0.18;
      touchY += (targetTouchY - touchY) * 0.18;

      // 2. Yay Fiziği Hesaplama (Hooke Kanunu)
      const force = (targetBulge - currentBulge) * STIFFNESS;
      bulgeVelocity = (bulgeVelocity + force) * DAMPING;
      currentBulge += bulgeVelocity;

      // 3. Yönelme Hızının Dokuya Uygulanması ve Sönümlenmesi
      currentVelX += (targetVelX - currentVelX) * 0.25;
      currentVelY += (targetVelY - currentVelY) * 0.25;
      targetVelX *= 0.86;
      targetVelY *= 0.86;

      // Shader Uniform Değerlerini Güncelle
      gl.uniform2f(uTouchLoc, touchX, touchY);
      gl.uniform1f(uBulgeLoc, currentBulge);
      gl.uniform2f(uVelocityLoc, currentVelX, currentVelY);
      gl.uniform1f(uTimeLoc, elapsedSeconds);
      gl.uniform2f(uTiltLoc, tiltX, tiltY);

      // Çizim
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      rafId = isRunning ? requestAnimationFrame(render) : 0;
    }

    // Ekran dışındayken veya sekme arka plandayken döngüyü durdur (pil ve CPU tasarrufu)
    let rafId = 0;
    let isRunning = false;
    let isOnScreen = true;

    function updateLoop() {
      const shouldRun = isOnScreen && !document.hidden;
      if (shouldRun && !isRunning) {
        isRunning = true;
        rafId = requestAnimationFrame(render);
      } else if (!shouldRun && isRunning) {
        isRunning = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        isOnScreen = entries[0].isIntersecting;
        updateLoop();
      }, { threshold: 0 }).observe(container);
    }
    document.addEventListener('visibilitychange', updateLoop);

    // WebGL bağlamı kaybolursa statik görsele dön
    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      isRunning = false;
      if (rafId) cancelAnimationFrame(rafId);
      canvas.style.display = 'none';
    });

    updateLoop();
  }

  // DOM Yüklendiğinde Başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInteractiveMoss);
  } else {
    initInteractiveMoss();
  }
})();
