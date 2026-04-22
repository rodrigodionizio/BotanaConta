import Image from 'next/image'

// ── LogoMark ──────────────────────────────────────────────────────────────────
// Exibe apenas o símbolo (checkmark + espetinho), sem o texto.
// Funciona em fundos escuros: usa background-image para recortar a zona do símbolo
// no logo.png (y: 3%-55%, x: 15%-85%), mostrando o ícone num container branco
// arredondado — mesma convenção de app-icons no iOS/Android.

interface LogoMarkProps {
  /** Tamanho (largura e altura) em px. Padrão: 32 */
  size?: number
  className?: string
}

export function LogoMark({ size = 32, className = '' }: LogoMarkProps) {
  return (
    <span
      className={`rounded-xl overflow-hidden flex-shrink-0 inline-block ${className}`}
      style={{
        width: size,
        height: size,
        // Zoom 210% para mostrar apenas a zona do símbolo (sem o texto)
        backgroundImage: "url('/logo.png')",
        backgroundSize: '210%',
        backgroundPosition: '48% 5%',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#ffffff',
      }}
      role="img"
      aria-label="Bota na Conta"
    />
  )
}

// ── LogoFull ──────────────────────────────────────────────────────────────────
// Logo completo (símbolo + texto "BotaNaConta").
// Use em fundos claros (login, splash, documentos).

interface LogoFullProps {
  /** Dimensão (imagem quadrada). Padrão: 200 */
  size?: number
  className?: string
  priority?: boolean
}

export function LogoFull({ size = 200, priority = false, className = '' }: LogoFullProps) {
  return (
    <Image
      src="/logo.png"
      alt="Bota na Conta"
      width={size}
      height={size}
      priority={priority}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  )
}
