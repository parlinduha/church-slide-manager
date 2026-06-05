import { motion, AnimatePresence } from 'framer-motion';

/**
 * Komponen preview slide 16:9
 * @param {object} slide - { content, label }
 * @param {object} settings - { background_color, text_color, font_size, font_family, text_align }
 * @param {boolean} isActive - apakah ini slide yang sedang aktif
 * @param {boolean} isBlackScreen - mode hitam
 * @param {boolean} isBlankScreen - mode putih
 * @param {function} onClick - klik slide
 * @param {string} size - 'sm' | 'md' | 'lg' (mengontrol skala font)
 */
export default function SlidePreview({
  slide,
  settings = {},
  isActive = false,
  isBlackScreen = false,
  isBlankScreen = false,
  onClick,
  size = 'md',
  showLabel = true,
}) {
  const {
    background_color = '#000000',
    text_color = '#FFFFFF',
    font_size = 48,
    font_family = 'Arial',
    text_align = 'center',
  } = settings;

  const fontScales = { sm: 0.18, md: 0.28, lg: 0.5 };
  const scale = fontScales[size] || 0.28;
  const scaledFontSize = Math.round(font_size * scale);

  const bgStyle = isBlackScreen
    ? { backgroundColor: '#000000' }
    : isBlankScreen
    ? { backgroundColor: '#FFFFFF' }
    : { backgroundColor: background_color };

  const textStyle = isBlackScreen || isBlankScreen
    ? { opacity: 0 }
    : {
        color: text_color,
        fontSize: `${scaledFontSize}px`,
        fontFamily: font_family,
        textAlign: text_align,
        lineHeight: 1.4,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      };

  return (
    <div
      onClick={onClick}
      className={`slide-preview select-none ${onClick ? 'cursor-pointer' : ''} ${
        isActive ? 'ring-2 ring-primary-500' : 'ring-1 ring-surface-600'
      }`}
      style={bgStyle}
    >
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={slide?.id || 'empty'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={textStyle}
          >
            {slide?.content || ''}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Label slide */}
      {showLabel && slide?.label && (
        <div className="absolute bottom-1.5 left-2 text-xs bg-black/50 text-gray-300 px-1.5 py-0.5 rounded">
          {slide.label}
        </div>
      )}
    </div>
  );
}
