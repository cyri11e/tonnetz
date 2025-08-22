function mod12(n) { return ((n % 12) + 12) % 12; }

function keyToPc(k) {
  const c = (k || '').toLowerCase();

  // Blancs: Q S D F G H J (K = C à l’octave, même pc que C)
  const whiteMap = {
    'q': 'C', 's': 'D', 'd': 'E', 'f': 'F',
    'g': 'G', 'h': 'A', 'j': 'B', 'k': 'C'
  };

  // Noirs: Z E T Y U
  const blackMap = {
    'z': 'C♯', 'e': 'D♯', 't': 'F♯', 'y': 'G♯', 'u': 'A♯'
  };

  const name = whiteMap[c] || blackMap[c];
  return name ? nameToPc(name) : null;
}
