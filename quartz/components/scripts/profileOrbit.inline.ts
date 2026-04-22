// Profile Orbit — animated skill constellation for About page
// Three orbital rings: Teaching · Tech · Building

type OrbitalNode = {
  label: string
  emoji: string
  ring: number      // 0=inner 1=mid 2=outer
  angle: number     // current angle in radians
  speed: number     // radians per second
  color: string
}

const NODES: Omit<OrbitalNode, "angle">[] = [
  // Inner ring — Core identity
  { label: "Chinese Coach",  emoji: "🎯", ring: 0, speed: 0.25,  color: "#e7bd57" },
  { label: "AI Builder",     emoji: "🤖", ring: 0, speed: -0.25, color: "#e7bd57" },

  // Mid ring — Teaching craft
  { label: "Immersive CLT",  emoji: "🗣️", ring: 1, speed: 0.18,  color: "#84a59d" },
  { label: "6000h Teaching", emoji: "⏱️", ring: 1, speed: -0.14, color: "#84a59d" },
  { label: "HSK Prep",       emoji: "📝", ring: 1, speed: 0.20,  color: "#84a59d" },
  { label: "Corp Training",  emoji: "💼", ring: 1, speed: -0.16, color: "#84a59d" },

  // Outer ring — Tech stack
  { label: "Claude Code",    emoji: "⚡", ring: 2, speed: 0.10,  color: "#a78bfa" },
  { label: "TypeScript",     emoji: "🔷", ring: 2, speed: -0.09, color: "#a78bfa" },
  { label: "Next.js",        emoji: "▲",  ring: 2, speed: 0.12,  color: "#a78bfa" },
  { label: "n8n / Dify",     emoji: "🔄", ring: 2, speed: -0.11, color: "#a78bfa" },
  { label: "MCP Agents",     emoji: "🕸️", ring: 2, speed: 0.08,  color: "#a78bfa" },
  { label: "Vercel / CF",    emoji: "☁️", ring: 2, speed: -0.13, color: "#a78bfa" },
]

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function initOrbit() {
  // Only run on the about page
  if (!window.location.pathname.includes("/about")) return

  const canvas = document.getElementById("orbit-canvas") as HTMLCanvasElement | null
  if (!canvas) return

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  // HiDPI
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  const W = rect.width
  const H = rect.height
  const cx = W / 2
  const cy = H / 2

  const RADII = [H * 0.14, H * 0.28, H * 0.42]

  // Initialize node angles spread evenly per ring
  const nodes: OrbitalNode[] = NODES.map((n) => {
    const siblings = NODES.filter((s) => s.ring === n.ring)
    const idx = siblings.indexOf(n)
    return {
      ...n,
      angle: (idx / siblings.length) * Math.PI * 2,
    }
  })

  let lastTime = 0
  let animId = 0

  function drawGlow(x: number, y: number, r: number, color: string, alpha: number) {
    const [rv, gv, bv] = hexToRgb(color)
    const grad = ctx!.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, `rgba(${rv},${gv},${bv},${alpha})`)
    grad.addColorStop(1, `rgba(${rv},${gv},${bv},0)`)
    ctx!.fillStyle = grad
    ctx!.beginPath()
    ctx!.arc(x, y, r, 0, Math.PI * 2)
    ctx!.fill()
  }

  function frame(time: number) {
    const dt = Math.min((time - lastTime) / 1000, 0.05)
    lastTime = time

    ctx!.clearRect(0, 0, W, H)

    // Grid background dots
    ctx!.fillStyle = "rgba(231,189,87,0.04)"
    for (let gx = 0; gx < W; gx += 28) {
      for (let gy = 0; gy < H; gy += 28) {
        ctx!.beginPath()
        ctx!.arc(gx, gy, 0.8, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    // Orbital rings
    RADII.forEach((r, i) => {
      const colors = ["rgba(231,189,87,", "rgba(132,165,157,", "rgba(167,139,250,"]
      ctx!.beginPath()
      ctx!.arc(cx, cy, r, 0, Math.PI * 2)
      ctx!.strokeStyle = colors[i] + "0.18)"
      ctx!.lineWidth = 1
      ctx!.setLineDash([4, 8])
      ctx!.stroke()
      ctx!.setLineDash([])
    })

    // Center hub — Tony's portrait placeholder
    drawGlow(cx, cy, 38, "#e7bd57", 0.35)
    ctx!.beginPath()
    ctx!.arc(cx, cy, 22, 0, Math.PI * 2)
    ctx!.fillStyle = "#0d1a2d"
    ctx!.fill()
    ctx!.strokeStyle = "rgba(231,189,87,0.8)"
    ctx!.lineWidth = 2
    ctx!.stroke()
    ctx!.font = "bold 16px sans-serif"
    ctx!.fillStyle = "#e7bd57"
    ctx!.textAlign = "center"
    ctx!.textBaseline = "middle"
    ctx!.fillText("T", cx, cy)

    // Update & draw nodes
    for (const n of nodes) {
      n.angle += n.speed * dt

      const r = RADII[n.ring]
      const nx = cx + Math.cos(n.angle) * r
      const ny = cy + Math.sin(n.angle) * r

      // Connector line from center
      const [rv, gv, bv] = hexToRgb(n.color)
      ctx!.beginPath()
      ctx!.moveTo(cx, cy)
      ctx!.lineTo(nx, ny)
      ctx!.strokeStyle = `rgba(${rv},${gv},${bv},0.12)`
      ctx!.lineWidth = 0.8
      ctx!.stroke()

      // Glow halo
      drawGlow(nx, ny, 18, n.color, 0.3)

      // Node circle
      ctx!.beginPath()
      ctx!.arc(nx, ny, 6, 0, Math.PI * 2)
      ctx!.fillStyle = n.color
      ctx!.fill()

      // Emoji
      ctx!.font = "11px sans-serif"
      ctx!.textAlign = "center"
      ctx!.textBaseline = "middle"
      ctx!.fillText(n.emoji, nx, ny - 16)

      // Label
      ctx!.font = "9px 'JetBrains Mono', monospace"
      ctx!.fillStyle = `rgba(${rv},${gv},${bv},0.9)`
      ctx!.textAlign = "center"
      ctx!.textBaseline = "top"
      ctx!.fillText(n.label, nx, ny + 9)
    }

    animId = requestAnimationFrame(frame)
  }

  animId = requestAnimationFrame(frame)

  // Cleanup
  window.addCleanup?.(() => cancelAnimationFrame(animId))
}

document.addEventListener("nav", initOrbit)
