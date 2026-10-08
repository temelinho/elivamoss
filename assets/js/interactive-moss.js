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

        // 1. Organik Nefes Alma (Idle Yaşam Dalgası - Sadece yosunlarda)
        float idleWave = sin(uv.y * 14.0 + uTime * 1.8) * cos(uv.x * 12.0 + uTime * 1.4) * 0.0022 * mask;

        // 2. Dokunulan Noktaya Uzaklık
        vec2 delta = uv - uTouch;
        float dist = length(delta);

        // 3. Kabarma Etkisi (Gaussian Falloff Kubbesi)
        float influence = 0.0;
        if (dist < uRadius) {
          float normD = dist / uRadius;
          influence = (1.0 - normD) * (1.0 - normD); // Yumuşak eğri
        }

        // SADECE yosunlar kabarır, çerçeve kesinlikle kabarmasın!
        float bulgeFactor = influence * uBulge * mask;

        // 4. Z-Ekseninde 3D Dışa Doğru Kabarma (Lens / Rölyef Şişmesi)
        vec2 radialDir = dist > 0.0001 ? normalize(delta) : vec2(0.0);
        vec2 bulgeOffset = -radialDir * bulgeFactor * 0.058;

        // 5. Parmağın Sağa/Sola Hareketine Doğru Yönelme (Tüylerin / Liflerin Yatması)
        // uVelocity: parmağın anlık hareket vektörü
        vec2 swayOffset = -uVelocity * influence * mask * 0.42;

        // Toplam Deformasyon
        vec2 displacedUv = uv + bulgeOffset + swayOffset + vec2(idleWave);
        displacedUv = clamp(displacedUv, 0.001, 0.999);

        // Ana Doku Örnekleme
        vec4 color = texture2D(uTexture, displacedUv);

        // 6. Dinamik 3D Işık ve Gölge
        vec3 normal = texture2D(uNormal, displacedUv).rgb * 2.0 - 1.0;
        vec3 lightDir = normalize(vec3(uTouch.x - uv.x, (1.0 - uTouch.y) - (1.0 - uv.y), 0.5));
        float diffLight = max(dot(normal, lightDir), 0.0);

        // Kabardıkça ışık vurgusunu ve derinlik gölgesini güçlendir
        float lightEffect = bulgeFactor * 1.8;
        color.rgb += vec3(diffLight * 0.14 * lightEffect);

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
      targetBulge = 0.75;
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

      // Yönelme kuvvetini artır
      targetVelX = Math.max(-0.6, Math.min(0.6, targetVelX + dx * 1.6));
      targetVelY = Math.max(-0.6, Math.min(0.6, targetVelY + dy * 1.6));

      lastEventX = e.clientX;
      lastEventY = e.clientY;

      if (!isInteracting) {
        isInteracting = true;
        targetBulge = 0.85;
      }
      hideBadge();
    });

    container.addEventListener('mousedown', function (e) {
      targetBulge = 1.35; // Tıklayınca ekstra yüksek kabarma!
      hideBadge();
    });

    window.addEventListener('mouseup', function () {
      if (isInteracting) {
        targetBulge = 0.75;
      }
    });

    container.addEventListener('mouseleave', function () {
      isInteracting = false;
      targetBulge = 0.0;
      targetVelX = 0.0;
      targetVelY = 0.0;
    });

    // --- MOBİL DOKUNMATİK (TOUCH) ETKİLEŞİMLERİ ---
    // Mobilde hem akıcı kabarma hem de pürüzsüz kaydırma sağlar
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
        targetBulge = 1.25; // Dokununca hemen pofudukça kabarsın!
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

        // Parmağın yönüne doğru yosunların yatması / akışı
        targetVelX = Math.max(-0.8, Math.min(0.8, targetVelX + dx * 2.2));
        targetVelY = Math.max(-0.8, Math.min(0.8, targetVelY + dy * 2.2));

        lastEventX = touch.clientX;
        lastEventY = touch.clientY;
        targetBulge = 1.15;
        hideBadge();
      }
    }, { passive: true });

    container.addEventListener('touchend', function () {
      isInteracting = false;
      targetBulge = 0.0; // Bırakınca yay fiziğiyle pofudukça eski haline döner
      targetVelX = 0.0;
      targetVelY = 0.0;
    }, { passive: true });

    container.addEventListener('touchcancel', function () {
      isInteracting = false;
      targetBulge = 0.0;
      targetVelX = 0.0;
      targetVelY = 0.0;
    }, { passive: true });

    // --- RENDER DÖNGÜSÜ (60-120 FPS) ---
    let startTime = performance.now();

    function render(currentTime) {
      const elapsedSeconds = (currentTime - startTime) * 0.001;

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
