// Reassembles the exact original MP4 from static, cacheable base64 shards.
// Hosting build requires no special server functions or media storage.
(async function loadOriginalIntro() {
  const video = document.getElementById('introVideo');
  if (!video) return;
  const total = 28;
  const parts = new Array(total);
  try {
    for (let begin = 0; begin < total; begin += 6) {
      const indexes = Array.from({length: Math.min(6, total - begin)}, (_, i) => begin + i);
      await Promise.all(indexes.map(async (index) => {
        const name = `assets/intro-part-${String(index).padStart(2,'0')}.txt`;
        const response = await fetch(name);
        if (!response.ok) throw new Error(`Vídeo indisponível: ${response.status}`);
        const encoded = (await response.text()).replace(/\s+/g, '');
        const decoded = atob(encoded);
        const bytes = new Uint8Array(decoded.length);
        for (let j = 0; j < decoded.length; j++) bytes[j] = decoded.charCodeAt(j);
        parts[index] = bytes;
      }));
    }
    const url = URL.createObjectURL(new Blob(parts, {type: 'video/mp4'}));
    video.src = url;
    video.load();
    if (!document.getElementById('intro').classList.contains('hidden')) {
      video.play().catch(() => {});
    }
    window.addEventListener('pagehide', () => URL.revokeObjectURL(url), {once: true});
  } catch (error) {
    // The supplied video's poster remains visible and INICIAR always works.
    console.warn('NEON RADAR: animação indisponível, mantendo imagem de abertura.', error);
  }
})();