import * as THREE from 'three';

export class TextureGenerator {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  public static getConcreteTexture(): THREE.CanvasTexture {
    if (this.cache.has('concrete')) return this.cache.get('concrete')!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base concrete grey
    ctx.fillStyle = '#2b2e31';
    ctx.fillRect(0, 0, 512, 512);

    // Noise and grit
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 35;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Stains and water damage streaks
    ctx.fillStyle = 'rgba(15, 18, 16, 0.4)';
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const w = 40 + Math.random() * 80;
      const h = 50 + Math.random() * 180;
      ctx.beginPath();
      ctx.ellipse(x, y, w / 2, h / 2, Math.random() * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cracks
    ctx.strokeStyle = 'rgba(10, 10, 12, 0.6)';
    ctx.lineWidth = 1.5;
    for (let c = 0; c < 5; c++) {
      let cx = Math.random() * 512;
      let cy = Math.random() * 512;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 6; s++) {
        cx += (Math.random() - 0.5) * 60;
        cy += (Math.random() - 0.5) * 60;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set('concrete', texture);
    return texture;
  }

  public static getRustedMetalTexture(): THREE.CanvasTexture {
    if (this.cache.has('rusted_metal')) return this.cache.get('rusted_metal')!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Metal base
    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, 512, 512);

    // Corrugated vertical panel lines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    for (let x = 0; x < 512; x += 32) {
      ctx.fillRect(x, 0, 16, 512);
    }

    // Rust patches
    for (let i = 0; i < 30; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const rad = 20 + Math.random() * 50;
      const grad = ctx.createRadialGradient(rx, ry, 5, rx, ry, rad);
      grad.addColorStop(0, 'rgba(120, 50, 20, 0.85)');
      grad.addColorStop(0.6, 'rgba(80, 30, 10, 0.5)');
      grad.addColorStop(1, 'rgba(40, 20, 10, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(rx, ry, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Metal scratches
    ctx.strokeStyle = 'rgba(180, 190, 200, 0.25)';
    ctx.lineWidth = 1;
    for (let j = 0; j < 40; j++) {
      ctx.beginPath();
      const sx = Math.random() * 512;
      const sy = Math.random() * 512;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (Math.random() - 0.5) * 40, sy + (Math.random() - 0.5) * 40);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set('rusted_metal', texture);
    return texture;
  }

  public static getHazardTexture(): THREE.CanvasTexture {
    if (this.cache.has('hazard')) return this.cache.get('hazard')!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#b38600'; // Industrial dirty yellow
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#181818'; // Industrial black
    const stripeWidth = 32;
    for (let x = -256; x < 512; x += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeWidth, 0);
      ctx.lineTo(x + stripeWidth + 256, 256);
      ctx.lineTo(x + 256, 256);
      ctx.closePath();
      ctx.fill();
    }

    // Dirt grime
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set('hazard', texture);
    return texture;
  }

  public static getCardboardTexture(): THREE.CanvasTexture {
    if (this.cache.has('cardboard')) return this.cache.get('cardboard')!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#6e563b';
    ctx.fillRect(0, 0, 256, 256);

    // Box seams & tape
    ctx.fillStyle = '#4c3924';
    ctx.fillRect(0, 120, 256, 16);
    ctx.fillStyle = '#8b714b'; // tape
    ctx.fillRect(115, 0, 26, 256);

    // Label
    ctx.fillStyle = '#dcd6c8';
    ctx.fillRect(40, 40, 70, 50);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('SECTOR-09', 45, 55);
    ctx.fillText('FRAGILE', 45, 68);
    ctx.fillText('BATCH 94', 45, 80);

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set('cardboard', texture);
    return texture;
  }

  public static getSignTexture(title: string, subtitle: string, color: string = '#d32f2f'): THREE.CanvasTexture {
    const key = `sign_${title}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Plate background
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 500, 244);

    // Warning banner
    ctx.fillStyle = color;
    ctx.fillRect(16, 16, 480, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WARNING', 256, 58);

    // Title & subtitle
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 36px monospace';
    ctx.fillText(title, 256, 140);

    ctx.font = '18px monospace';
    ctx.fillStyle = '#374151';
    ctx.fillText(subtitle, 256, 190);

    // Rivets
    ctx.fillStyle = '#6b7280';
    for (const [rx, ry] of [[20, 20], [492, 20], [20, 236], [492, 236]]) {
      ctx.beginPath();
      ctx.arc(rx, ry, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }

  public static getMonitorScreenTexture(feedName: string, timeStr: string, subjectVisible: boolean): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d')!;

    // Dark green CCTV phosphor
    ctx.fillStyle = '#06140b';
    ctx.fillRect(0, 0, 320, 240);

    // Scanlines
    ctx.fillStyle = 'rgba(0, 255, 100, 0.05)';
    for (let y = 0; y < 240; y += 4) {
      ctx.fillRect(0, y, 320, 2);
    }

    // Grid / Warehouse aisle silhouette
    ctx.strokeStyle = '#0e3a1d';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, 240, 160);
    ctx.beginPath();
    ctx.moveTo(40, 40);
    ctx.lineTo(100, 100);
    ctx.moveTo(280, 40);
    ctx.lineTo(220, 100);
    ctx.stroke();

    if (subjectVisible) {
      // Silhouette of tall skeletal creature
      ctx.fillStyle = '#010502';
      ctx.beginPath();
      // Head
      ctx.arc(160, 90, 8, 0, Math.PI * 2);
      ctx.fill();
      // Elongated body
      ctx.fillRect(156, 98, 8, 50);
      // Long limbs
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#010502';
      ctx.beginPath();
      ctx.moveTo(156, 105);
      ctx.lineTo(142, 145);
      ctx.moveTo(164, 105);
      ctx.lineTo(178, 142);
      ctx.stroke();
      // Eyes glowing slightly
      ctx.fillStyle = '#a7f3d0';
      ctx.fillRect(158, 89, 2, 2);
      ctx.fillRect(161, 89, 2, 2);

      // Warning text glitch
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('MOTION DETECTED', 100, 180);
    }

    // Timestamp & Camera ID
    ctx.fillStyle = '#34d399';
    ctx.font = '12px monospace';
    ctx.fillText(`CAM-0${feedName} [ONLINE]`, 15, 25);
    ctx.fillText(`REC ${timeStr}`, 200, 25);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
}
