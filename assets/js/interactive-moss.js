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

      uniform vec2 uTouch;           // Dokunulan nokta (UV 0..1)
      uniform float uBulge;          // Kabarma yay şiddeti (0..1)
      uniform vec2 uVelocity;        // Sürükleme yönü ve hızı (dx, dy)
      uniform float uTime;           // Zaman (Organik nefes alma dalgası)
      uniform float uRadius;         // Kabarma yarıçapı

      void main() {
        vec2 uv = vUv;

        // Maske: Çerçeve alanı 0.0, yosun alanları 0.3 - 1.0
        float mask = texture2D(uMask, uv).r;

        // 1. Dokunulan Noktaya Uzaklık
        vec2 delta = uv - uTouch;
        float dist = length(delta);

        // 2. Doğal Kubbe Eğrisi (Pofuduk tepe/kabarma, sıfır sarmal)
        float influence = 0.0;
        if (dist < uRadius) {
          float normD = dist / uRadius;
          // Pürüzsüz kosinüs kubbesi: merkezde yumuşak tepe, kenarda tatlı sönüm
          float dome = cos(normD * 1.5707963);
          influence = dome * dome;
        }

        // SADECE yosunlar kabarır, çerçeve kesinlikle kabarmasın!
        float bulgeFactor = influence * uBulge * mask;

        // 3. İmlecin ucunda doğal dışa doğru 3D kabarma (Merkezde tekillik/kırılma/sarmal yapmaz)
        vec2 bulgeOffset = -delta * (bulgeFactor * 0.28);

        // 4. Doğal hafif yatma (Sarmal/dönme yok, sadece anlık meyil)
        vec2 dragOffset = -uVelocity * (bulgeFactor * 0.12);

        // Toplam Deformasyon
        vec2 displacedUv = uv + bulgeOffset + dragOffset;
        displacedUv = clamp(displacedUv, 0.001, 0.999);

        // Ana Doku Örnekleme
        vec4 color = texture2D(uTexture, displacedUv);

        // 5. Dinamik 3D Işık ve Gölge (Kabaran kubbenin tepe ışığı)
        vec3 normal = texture2D(uNormal, displacedUv).rgb * 2.0 - 1.0;
        vec3 lightDir = normalize(vec3(uTouch.x - uv.x, (1.0 - uTouch.y) - (1.0 - uv.y), 0.55));
        float diffLight = max(dot(normal, lightDir), 0.0);

        // Kabardıkça ışık vurgusunu ve derinlik gölgesini güçlendir
        float lightEffect = bulgeFactor * 1.6;
        color.rgb += vec3(diffLight * 0.15 * lightEffect);

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

    gl.uniform1i(uTextureLoc, 0);
    gl.uniform1i(uMaskLoc, 1);
    gl.uniform1i(uNormalLoc, 2);
    gl.uniform1f(uRadiusLoc, 0.28);

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
      if (window.location.protocol !== 'file:') {
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
        } catch (err) {
          console.warn('Doku WebGL aktarım uyarısı:', err);
        }
      };
      image.onerror = function () {
        if (url.endsWith('.webp')) {
          image.src = url.replace('.webp', unit === 1 || unit === 2 ? '.png' : '.jpg');
        }
      };
      image.src = url;
      return texture;
    }

    // Görselleri Bağla (Modern WebP, destek yoksa JPG/PNG)
    loadTexture(gl, 'assets/img/hero-moss-interactive.webp', 0);
    loadTexture(gl, 'assets/img/hero-moss-mask.webp', 1);
    loadTexture(gl, 'assets/img/hero-moss-normal.webp', 2);

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

    // Yay Sabitleri (Doğal, süngerimsi organik hissiyat)
    const STIFFNESS = 0.22;
    const DAMPING = 0.76;

    // Boyutlandırma (Responsive Retina & Mobil)
    function resizeCanvas() {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Mobilde pil ve hız için maks 2
      const width = Math.round(rect.width * dpr);
      const height = Math.round(rect.height * dpr);

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    }

    window.addEventListener('resize', resizeCanvas, { passive: true });
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

      // Anlık parmak/fare hızı (Sarmal birikim yapmaz, doğrudan yönü yansıtır)
      targetVelX = Math.max(-0.35, Math.min(0.35, dx * 1.2));
      targetVelY = Math.max(-0.35, Math.min(0.35, dy * 1.2));

      lastEventX = e.clientX;
      lastEventY = e.clientY;

      isInteracting = true;
      userHasInteracted = true;
      lastUserInteractionTime = performance.now();
      targetBulge = 1.35; // İmlecin ucu doğal şekilde kabarır
      hideBadge();
    });

    container.addEventListener('mousedown', function (e) {
      targetBulge = 1.75; // Tıklayınca ekstra dolgun doğal kabarma!
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
        targetBulge = 1.65; // Dokununca imlecin ucu hemen pofudukça kabarsın!
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

        // Anlık sürükleme yönü (Sarmal dönme yapmaz, temiz doğrusal meyil)
        targetVelX = Math.max(-0.4, Math.min(0.4, dx * 1.5));
        targetVelY = Math.max(-0.4, Math.min(0.4, dy * 1.5));

        lastEventX = touch.clientX;
        lastEventY = touch.clientY;

        isInteracting = true;
        userHasInteracted = true;
        lastUserInteractionTime = performance.now();
        targetBulge = 1.45; // Sürüklerken parmağın altında pofuduk kabarma
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
        // %50 daha geniş rota: Tüm panonun top yosunları üzerinde belirgin gezinir
        const t = elapsedSeconds * 1.6;
        targetTouchX = 0.50 + Math.sin(t * 1.2) * 0.28;
        targetTouchY = 0.50 + Math.cos(t * 1.8) * 0.24;

        // %50 daha güçlü kabarma dalgası (1.1 - 1.8 arası belirgin kabarma)
        targetBulge = 1.45 + Math.sin(t * 3.0) * 0.50;

        // Yumuşak doğal meyil
        targetVelX = Math.cos(t * 1.2) * 0.28 * 0.35;
        targetVelY = -Math.sin(t * 1.8) * 0.24 * 0.35;
      }

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

      // Boyut kontrolü
      resizeCanvas();

      // Shader Uniform Değerlerini Güncelle
      gl.uniform2f(uTouchLoc, touchX, touchY);
      gl.uniform1f(uBulgeLoc, currentBulge);
      gl.uniform2f(uVelocityLoc, currentVelX, currentVelY);
      gl.uniform1f(uTimeLoc, elapsedSeconds);

      // Çizim
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  }

  // DOM Yüklendiğinde Başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInteractiveMoss);
  } else {
    initInteractiveMoss();
  }
})();
