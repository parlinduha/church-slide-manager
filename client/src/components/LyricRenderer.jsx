import { motion } from 'framer-motion';

/**
 * LyricRenderer — Renders lirik dengan gaya tipografi yang hidup:
 *
 * Fitur:
 * 1. Setiap baris muncul dengan animasi stagger (tidak sekaligus)
 * 2. Baris pertama lebih besar (emphasis) — baris pembuka selalu menonjol
 * 3. Kata yang diawali huruf kapital semua (TUHAN, YESUS, KASIH) → bold + sedikit glowing
 * 4. Text shadow berlapis untuk readability di semua background
 * 5. Baris terakhir sedikit lebih kecil + italic (nuansa "fading")
 * 6. Jarak antar baris proporsional untuk mudah dibaca jemaat
 */

// Deteksi kata yang perlu di-bold (kata penting rohani atau all-caps)
function parseLineEmphasis(text) {
  // Split kata, tandai yang all-caps (min 2 huruf) atau diawali huruf besar dan panjang > 3
  const words = text.split(/(\s+)/);
  return words.map((word, i) => {
    const clean = word.replace(/[^a-zA-Z]/g, '');
    if (!clean) return { text: word, bold: false, key: i };

    // All caps dengan min 3 huruf → bold & emphasis
    const isAllCaps = clean.length >= 3 && clean === clean.toUpperCase() && /[A-Z]/.test(clean);

    return { text: word, bold: isAllCaps, key: i };
  });
}

export default function LyricRenderer({
  content = '',
  color = '#FFFFFF',
  fontSize = 48,
  fontFamily = 'Arial',
  textAlign = 'center',
  animationKey = 'slide',
}) {
  const lines = content.split('\n').filter(l => l.trim() !== '' || content.includes('\n\n'));
  const nonEmptyLines = content.split('\n');
  const totalLines = nonEmptyLines.length;

  // Shadow berlapis untuk readability maksimal di semua warna background
  const baseShadow = [
    '0 1px 0 rgba(0,0,0,0.8)',
    '0 2px 4px rgba(0,0,0,0.7)',
    '0 4px 16px rgba(0,0,0,0.6)',
    '0 8px 32px rgba(0,0,0,0.4)',
  ].join(', ');

  const emphasisShadow = [
    '0 1px 0 rgba(0,0,0,0.9)',
    '0 2px 4px rgba(0,0,0,0.8)',
    '0 4px 16px rgba(0,0,0,0.6)',
    '0 0 40px rgba(255,255,255,0.08)',
  ].join(', ');

  // Ukuran font per baris berdasarkan posisi
  const getLineFontSize = (idx, total) => {
    if (total === 1) return fontSize;
    if (total === 2) return idx === 0 ? fontSize * 1.05 : fontSize * 0.95;
    if (idx === 0) return fontSize * 1.08;           // baris pertama lebih besar
    if (idx === total - 1) return fontSize * 0.9;    // baris terakhir lebih kecil
    return fontSize;
  };

  // Font weight per baris
  const getLineWeight = (idx, total) => {
    if (idx === 0) return '700';        // baris pertama bold
    if (idx === total - 1) return '400'; // baris terakhir normal
    return '600';                        // baris tengah semi-bold
  };

  // Letter spacing — baris pertama sedikit lebih lebar
  const getLetterSpacing = (idx) => {
    if (idx === 0) return '0.02em';
    return '0.01em';
  };

  // Opacity per baris
  const getLineOpacity = (idx, total) => {
    if (total <= 2) return 1;
    if (idx === total - 1) return 0.85;
    return 1;
  };

  // Container animation
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
    exit: {
      transition: {
        staggerChildren: 0.04,
        staggerDirection: -1,
      },
    },
  };

  // Per-line animation
  const lineVariants = {
    hidden: { opacity: 0, y: 14, filter: 'blur(4px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
    },
    exit: {
      opacity: 0,
      y: -10,
      filter: 'blur(2px)',
      transition: { duration: 0.2, ease: 'easeIn' },
    },
  };

  const alignItems =
    textAlign === 'left' ? 'flex-start' :
    textAlign === 'right' ? 'flex-end' : 'center';

  return (
    <motion.div
      key={animationKey}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems,
        justifyContent: 'center',
        width: '100%',
        maxWidth: '90%',
        gap: `${Math.round(fontSize * 0.28)}px`,
      }}
    >
      {nonEmptyLines.map((line, idx) => {
        const lineFontSize = getLineFontSize(idx, totalLines);
        const lineWeight   = getLineWeight(idx, totalLines);
        const letterSpacing = getLetterSpacing(idx);
        const lineOpacity  = getLineOpacity(idx, totalLines);
        const isEmpty      = line.trim() === '';
        const wordParts    = parseLineEmphasis(line);
        const isFirstLine  = idx === 0;
        const isLastLine   = idx === totalLines - 1;

        if (isEmpty) {
          return <div key={idx} style={{ height: `${fontSize * 0.3}px` }} />;
        }

        return (
          <motion.div
            key={idx}
            variants={lineVariants}
            style={{
              textAlign,
              lineHeight: 1.15,
              opacity: lineOpacity,
            }}
          >
            {/* Garis dekoratif halus di atas baris pertama */}
            {isFirstLine && totalLines > 1 && (
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 0.25 }}
                transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                style={{
                  height: '1px',
                  background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                  marginBottom: `${fontSize * 0.18}px`,
                  transformOrigin: 'center',
                }}
              />
            )}

            <span
              style={{
                fontFamily,
                fontSize: `${lineFontSize}px`,
                fontWeight: lineWeight,
                letterSpacing,
                textShadow: isFirstLine ? emphasisShadow : baseShadow,
                color,
                display: 'inline-block',
                wordBreak: 'break-word',
                // Italic halus di baris terakhir jika lebih dari 2 baris
                fontStyle: isLastLine && totalLines > 2 ? 'italic' : 'normal',
              }}
            >
              {wordParts.map(({ text, bold, key }) =>
                bold ? (
                  <strong
                    key={key}
                    style={{
                      fontWeight: '800',
                      color,
                      textShadow: [
                        '0 0 20px rgba(255,255,255,0.3)',
                        '0 2px 4px rgba(0,0,0,0.8)',
                        '0 4px 16px rgba(0,0,0,0.6)',
                      ].join(', '),
                    }}
                  >
                    {text}
                  </strong>
                ) : (
                  <span key={key}>{text}</span>
                )
              )}
            </span>

            {/* Garis dekoratif di bawah baris terakhir */}
            {isLastLine && totalLines > 1 && (
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 0.18 }}
                transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
                style={{
                  height: '1px',
                  background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                  marginTop: `${fontSize * 0.16}px`,
                  transformOrigin: 'center',
                }}
              />
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
