import type { ContentDetails } from "../../plugins/emitters/contentIndex"
import {
  SimulationNodeDatum,
  SimulationLinkDatum,
  Simulation,
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceLink,
  forceCollide,
  forceRadial,
  zoomIdentity,
  select,
  drag,
  zoom,
} from "d3"
import { Text, Graphics, Application, Container, Circle } from "pixi.js"
import { Group as TweenGroup, Tween as Tweened } from "@tweenjs/tween.js"
import { registerEscapeHandler, removeAllChildren } from "./util"
import { FullSlug, SimpleSlug, getFullSlug, resolveRelative, simplifySlug } from "../../util/path"
import { D3Config } from "../Graph"

type GraphicsInfo = {
  color: string
  gfx: Graphics
  alpha: number
  active: boolean
}

type NodeData = {
  id: SimpleSlug
  text: string
  tags: string[]
} & SimulationNodeDatum

type SimpleLinkData = {
  source: SimpleSlug
  target: SimpleSlug
}

type LinkData = {
  source: NodeData
  target: NodeData
} & SimulationLinkDatum<NodeData>

type LinkRenderData = GraphicsInfo & {
  simulationData: LinkData
}

type NodeRenderData = GraphicsInfo & {
  simulationData: NodeData
  label: Text
  glowGfx: Graphics
  pulsePhase: number
}

// Particle on a link edge
type Particle = {
  progress: number  // 0..1 along the edge
  speed: number
  linkIndex: number
}

const localStorageKey = "graph-visited"
function getVisited(): Set<SimpleSlug> {
  return new Set(JSON.parse(localStorage.getItem(localStorageKey) ?? "[]"))
}

function addToVisited(slug: SimpleSlug) {
  const visited = getVisited()
  visited.add(slug)
  localStorage.setItem(localStorageKey, JSON.stringify([...visited]))
}

type TweenNode = {
  update: (time: number) => void
  stop: () => void
}

async function renderGraph(graph: HTMLElement, fullSlug: FullSlug) {
  const slug = simplifySlug(fullSlug)
  const visited = getVisited()
  removeAllChildren(graph)

  let {
    drag: enableDrag,
    zoom: enableZoom,
    depth,
    scale,
    repelForce,
    centerForce,
    linkDistance,
    fontSize,
    opacityScale,
    removeTags,
    showTags,
    focusOnHover,
    enableRadial,
  } = JSON.parse(graph.dataset["cfg"]!) as D3Config

  const data: Map<SimpleSlug, ContentDetails> = new Map(
    Object.entries<ContentDetails>(await fetchData).map(([k, v]) => [
      simplifySlug(k as FullSlug),
      v,
    ]),
  )
  const links: SimpleLinkData[] = []
  const tags: SimpleSlug[] = []
  const validLinks = new Set(data.keys())

  const tweens = new Map<string, TweenNode>()
  for (const [source, details] of data.entries()) {
    const outgoing = details.links ?? []

    for (const dest of outgoing) {
      if (validLinks.has(dest)) {
        links.push({ source: source, target: dest })
      }
    }

    if (showTags) {
      const localTags = details.tags
        .filter((tag) => !removeTags.includes(tag))
        .map((tag) => simplifySlug(("tags/" + tag) as FullSlug))

      tags.push(...localTags.filter((tag) => !tags.includes(tag)))

      for (const tag of localTags) {
        links.push({ source: source, target: tag })
      }
    }
  }

  const neighbourhood = new Set<SimpleSlug>()
  const wl: (SimpleSlug | "__SENTINEL")[] = [slug, "__SENTINEL"]
  if (depth >= 0) {
    while (depth >= 0 && wl.length > 0) {
      // compute neighbours
      const cur = wl.shift()!
      if (cur === "__SENTINEL") {
        depth--
        wl.push("__SENTINEL")
      } else {
        neighbourhood.add(cur)
        const outgoing = links.filter((l) => l.source === cur)
        const incoming = links.filter((l) => l.target === cur)
        wl.push(...outgoing.map((l) => l.target), ...incoming.map((l) => l.source))
      }
    }
  } else {
    validLinks.forEach((id) => neighbourhood.add(id))
    if (showTags) tags.forEach((tag) => neighbourhood.add(tag))
  }

  const nodes = [...neighbourhood].map((url) => {
    const text = url.startsWith("tags/") ? "#" + url.substring(5) : (data.get(url)?.title ?? url)
    return {
      id: url,
      text,
      tags: data.get(url)?.tags ?? [],
    }
  })
  const graphData: { nodes: NodeData[]; links: LinkData[] } = {
    nodes,
    links: links
      .filter((l) => neighbourhood.has(l.source) && neighbourhood.has(l.target))
      .map((l) => ({
        source: nodes.find((n) => n.id === l.source)!,
        target: nodes.find((n) => n.id === l.target)!,
      })),
  }

  const width = graph.offsetWidth
  const height = Math.max(graph.offsetHeight, 250)

  // we virtualize the simulation and use pixi to actually render it
  const simulation: Simulation<NodeData, LinkData> = forceSimulation<NodeData>(graphData.nodes)
    .force("charge", forceManyBody().strength(-100 * repelForce))
    .force("center", forceCenter().strength(centerForce))
    .force("link", forceLink(graphData.links).distance(linkDistance))
    .force("collide", forceCollide<NodeData>((n) => nodeRadius(n)).iterations(3))

  const radius = (Math.min(width, height) / 2) * 0.8
  if (enableRadial) simulation.force("radial", forceRadial(radius).strength(0.2))

  // precompute style prop strings as pixi doesn't support css variables
  const cssVars = [
    "--secondary",
    "--tertiary",
    "--gray",
    "--light",
    "--lightgray",
    "--dark",
    "--darkgray",
    "--bodyFont",
    "--zt-amber",
  ] as const
  const computedStyleMap = cssVars.reduce(
    (acc, key) => {
      acc[key] = getComputedStyle(document.documentElement).getPropertyValue(key).trim()
      return acc
    },
    {} as Record<(typeof cssVars)[number], string>,
  )

  // Z TURNS amber palette (fallback if CSS var not loaded)
  const ZT_AMBER   = computedStyleMap["--zt-amber"] || "#e7bd57"
  const ZT_VISITED = computedStyleMap["--tertiary"]  || "#8faa6e"
  const ZT_TAG     = "#a78bfa"  // soft violet for tags
  const ZT_CURRENT = "#ffffff"  // white core for current node

  // calculate color
  const color = (d: NodeData) => {
    const isCurrent = d.id === slug
    if (isCurrent) {
      return ZT_CURRENT
    } else if (d.id.startsWith("tags/")) {
      return ZT_TAG
    } else if (visited.has(d.id)) {
      return ZT_VISITED
    } else {
      return ZT_AMBER
    }
  }

  function nodeRadius(d: NodeData) {
    const numLinks = graphData.links.filter(
      (l) => l.source.id === d.id || l.target.id === d.id,
    ).length
    // More dramatic size scaling: hubs are much larger
    return 3 + Math.pow(numLinks, 0.65) * 1.8
  }

  // Parse hex color to 0xRRGGBB number for Pixi
  function hexToNum(hex: string): number {
    const h = hex.replace("#", "")
    return parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16)
  }

  let hoveredNodeId: string | null = null
  let hoveredNeighbours: Set<string> = new Set()
  const linkRenderData: LinkRenderData[] = []
  const nodeRenderData: NodeRenderData[] = []
  function updateHoverInfo(newHoveredId: string | null) {
    hoveredNodeId = newHoveredId

    if (newHoveredId === null) {
      hoveredNeighbours = new Set()
      for (const n of nodeRenderData) {
        n.active = false
      }

      for (const l of linkRenderData) {
        l.active = false
      }
    } else {
      hoveredNeighbours = new Set()
      for (const l of linkRenderData) {
        const linkData = l.simulationData
        if (linkData.source.id === newHoveredId || linkData.target.id === newHoveredId) {
          hoveredNeighbours.add(linkData.source.id)
          hoveredNeighbours.add(linkData.target.id)
        }

        l.active = linkData.source.id === newHoveredId || linkData.target.id === newHoveredId
      }

      for (const n of nodeRenderData) {
        n.active = hoveredNeighbours.has(n.simulationData.id)
      }
    }
  }

  let dragStartTime = 0
  let dragging = false

  function renderLinks() {
    tweens.get("link")?.stop()
    const tweenGroup = new TweenGroup()

    for (const l of linkRenderData) {
      let alpha = hoveredNodeId ? (l.active ? 0.75 : 0.08) : 0.25
      l.color = l.active ? "#ffffff" : ZT_AMBER
      tweenGroup.add(new Tweened<LinkRenderData>(l).to({ alpha }, 200))
    }

    tweenGroup.getAll().forEach((tw) => tw.start())
    tweens.set("link", {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop())
      },
    })
  }

  function renderLabels() {
    tweens.get("label")?.stop()
    const tweenGroup = new TweenGroup()

    const defaultScale = 1 / scale
    const activeScale = defaultScale * 1.1
    for (const n of nodeRenderData) {
      const nodeId = n.simulationData.id

      if (hoveredNodeId === nodeId) {
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: 1,
              scale: { x: activeScale, y: activeScale },
            },
            100,
          ),
        )
      } else {
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: n.label.alpha,
              scale: { x: defaultScale, y: defaultScale },
            },
            100,
          ),
        )
      }
    }

    tweenGroup.getAll().forEach((tw) => tw.start())
    tweens.set("label", {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop())
      },
    })
  }

  function renderNodes() {
    tweens.get("hover")?.stop()

    const tweenGroup = new TweenGroup()
    for (const n of nodeRenderData) {
      let alpha = 1

      if (hoveredNodeId !== null && focusOnHover) {
        alpha = n.active ? 1 : 0.15
      }

      tweenGroup.add(new Tweened<Graphics>(n.gfx, tweenGroup).to({ alpha }, 200))
      // keep glowGfx alpha in sync (handled in animate loop via n.alpha)
      n.alpha = alpha
    }

    tweenGroup.getAll().forEach((tw) => tw.start())
    tweens.set("hover", {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop())
      },
    })
  }

  function renderPixiFromD3() {
    renderNodes()
    renderLinks()
    renderLabels()
  }

  tweens.forEach((tween) => tween.stop())
  tweens.clear()

  const app = new Application()
  await app.init({
    width,
    height,
    antialias: true,
    autoStart: false,
    autoDensity: true,
    backgroundAlpha: 0,
    preference: "webgpu",
    resolution: window.devicePixelRatio,
    eventMode: "static",
  })
  graph.appendChild(app.canvas)

  const stage = app.stage
  stage.interactive = false

  const labelsContainer  = new Container<Text>({ zIndex: 4, isRenderGroup: true })
  const nodesContainer   = new Container<Graphics>({ zIndex: 3, isRenderGroup: true })
  const glowContainer    = new Container<Graphics>({ zIndex: 2, isRenderGroup: true })
  const linkContainer    = new Container<Graphics>({ zIndex: 1, isRenderGroup: true })
  const particleContainer = new Container<Graphics>({ zIndex: 5, isRenderGroup: true })
  stage.addChild(linkContainer, glowContainer, nodesContainer, particleContainer, labelsContainer)

  // Particles for link animation
  const particles: Particle[] = []
  const particleGfxPool: Graphics[] = []

  for (const n of graphData.nodes) {
    const nodeId = n.id
    const isTagNode = nodeId.startsWith("tags/")
    const isCurrent = nodeId === slug
    const nodeColor = color(n)
    const r = nodeRadius(n)

    const label = new Text({
      interactive: false,
      eventMode: "none",
      text: n.text,
      alpha: 0,
      anchor: { x: 0.5, y: 1.3 },
      style: {
        fontSize: fontSize * 15,
        fill: isCurrent ? "#ffffff" : ZT_AMBER,
        fontFamily: computedStyleMap["--bodyFont"],
        fontWeight: isCurrent ? "700" : "400",
        dropShadow: {
          color: isCurrent ? "#ffffff" : ZT_AMBER,
          blur: 8,
          alpha: 0.8,
          distance: 0,
        },
      },
      resolution: window.devicePixelRatio * 4,
    })
    label.scale.set(1 / scale)

    // Outer glow ring (large, very transparent)
    const glowGfx = new Graphics({ interactive: false, eventMode: "none" })
    glowGfx.circle(0, 0, r * 3.5).fill({ color: hexToNum(nodeColor), alpha: 0.06 })
    glowGfx.circle(0, 0, r * 2.2).fill({ color: hexToNum(nodeColor), alpha: 0.1 })
    glowContainer.addChild(glowGfx)

    let oldLabelOpacity = 0
    const gfx = new Graphics({
      interactive: true,
      label: nodeId,
      eventMode: "static",
      hitArea: new Circle(0, 0, r * 2),
      cursor: "pointer",
    })

    // Draw layered node: border ring + fill
    if (isCurrent) {
      // Current node: bright white core with strong amber ring
      gfx.circle(0, 0, r + 2.5).fill({ color: 0xe7bd57, alpha: 0.5 })
      gfx.circle(0, 0, r).fill({ color: 0xffffff, alpha: 1 })
    } else if (isTagNode) {
      // Tag node: violet with dashed-ish ring
      gfx.circle(0, 0, r + 1.5).fill({ color: 0xa78bfa, alpha: 0.3 })
      gfx.circle(0, 0, r).fill({ color: 0xa78bfa, alpha: 0.85 })
    } else {
      // Regular node: amber with subtle outer ring
      gfx.circle(0, 0, r + 1.5).fill({ color: hexToNum(ZT_AMBER), alpha: 0.25 })
      gfx.circle(0, 0, r).fill({ color: hexToNum(nodeColor), alpha: 0.95 })
    }

    gfx
      .on("pointerover", (e) => {
        updateHoverInfo(e.target.label)
        oldLabelOpacity = label.alpha
        if (!dragging) renderPixiFromD3()
      })
      .on("pointerleave", () => {
        updateHoverInfo(null)
        label.alpha = oldLabelOpacity
        if (!dragging) renderPixiFromD3()
      })

    nodesContainer.addChild(gfx)
    labelsContainer.addChild(label)

    const nodeRenderDatum: NodeRenderData = {
      simulationData: n,
      gfx,
      glowGfx,
      label,
      color: nodeColor,
      alpha: 1,
      active: false,
      pulsePhase: Math.random() * Math.PI * 2,
    }
    nodeRenderData.push(nodeRenderDatum)
  }

  for (let i = 0; i < graphData.links.length; i++) {
    const l = graphData.links[i]
    const gfx = new Graphics({ interactive: false, eventMode: "none" })
    linkContainer.addChild(gfx)

    const linkRenderDatum: LinkRenderData = {
      simulationData: l,
      gfx,
      color: ZT_AMBER,
      alpha: 0.25,
      active: false,
    }
    linkRenderData.push(linkRenderDatum)

    // Spawn 1-2 particles per link
    const numParticles = Math.random() < 0.5 ? 1 : 2
    for (let p = 0; p < numParticles; p++) {
      const pgfx = new Graphics({ interactive: false, eventMode: "none" })
      particleContainer.addChild(pgfx)
      particleGfxPool.push(pgfx)
      particles.push({
        progress: Math.random(),
        speed: 0.0008 + Math.random() * 0.0012,
        linkIndex: i,
      })
    }
  }

  let currentTransform = zoomIdentity
  if (enableDrag) {
    select<HTMLCanvasElement, NodeData | undefined>(app.canvas).call(
      drag<HTMLCanvasElement, NodeData | undefined>()
        .container(() => app.canvas)
        .subject(() => graphData.nodes.find((n) => n.id === hoveredNodeId))
        .on("start", function dragstarted(event) {
          if (!event.active) simulation.alphaTarget(1).restart()
          event.subject.fx = event.subject.x
          event.subject.fy = event.subject.y
          event.subject.__initialDragPos = {
            x: event.subject.x,
            y: event.subject.y,
            fx: event.subject.fx,
            fy: event.subject.fy,
          }
          dragStartTime = Date.now()
          dragging = true
        })
        .on("drag", function dragged(event) {
          const initPos = event.subject.__initialDragPos
          event.subject.fx = initPos.x + (event.x - initPos.x) / currentTransform.k
          event.subject.fy = initPos.y + (event.y - initPos.y) / currentTransform.k
        })
        .on("end", function dragended(event) {
          if (!event.active) simulation.alphaTarget(0)
          event.subject.fx = null
          event.subject.fy = null
          dragging = false

          // if the time between mousedown and mouseup is short, we consider it a click
          if (Date.now() - dragStartTime < 500) {
            const node = graphData.nodes.find((n) => n.id === event.subject.id) as NodeData
            const targ = resolveRelative(fullSlug, node.id)
            window.spaNavigate(new URL(targ, window.location.toString()))
          }
        }),
    )
  } else {
    for (const node of nodeRenderData) {
      node.gfx.on("click", () => {
        const targ = resolveRelative(fullSlug, node.simulationData.id)
        window.spaNavigate(new URL(targ, window.location.toString()))
      })
    }
  }

  if (enableZoom) {
    select<HTMLCanvasElement, NodeData>(app.canvas).call(
      zoom<HTMLCanvasElement, NodeData>()
        .extent([
          [0, 0],
          [width, height],
        ])
        .scaleExtent([0.25, 4])
        .on("zoom", ({ transform }) => {
          currentTransform = transform
          stage.scale.set(transform.k, transform.k)
          stage.position.set(transform.x, transform.y)

          // zoom adjusts opacity of labels too
          const scale = transform.k * opacityScale
          let scaleOpacity = Math.max((scale - 1) / 3.75, 0)
          const activeNodes = nodeRenderData.filter((n) => n.active).flatMap((n) => n.label)

          for (const label of labelsContainer.children) {
            if (!activeNodes.includes(label)) {
              label.alpha = scaleOpacity
            }
          }
        }),
    )
  }

  let stopAnimation = false
  let lastTime = 0
  function animate(time: number) {
    if (stopAnimation) return
    const dt = Math.min(time - lastTime, 50)
    lastTime = time

    // --- Nodes & glow pulsing ---
    for (const n of nodeRenderData) {
      const { x, y } = n.simulationData
      if (!x || !y) continue
      const cx = x + width / 2
      const cy = y + height / 2

      n.gfx.position.set(cx, cy)
      if (n.label) n.label.position.set(cx, cy)

      // Animate glow ring scale with sine wave
      n.pulsePhase = (n.pulsePhase + dt * 0.0015) % (Math.PI * 2)
      const pulse = 0.85 + Math.sin(n.pulsePhase) * 0.15
      n.glowGfx.position.set(cx, cy)
      n.glowGfx.scale.set(pulse)
      n.glowGfx.alpha = n.alpha * (0.6 + Math.sin(n.pulsePhase) * 0.4)
    }

    // --- Links ---
    for (const l of linkRenderData) {
      const linkData = l.simulationData
      const sx = linkData.source.x! + width / 2
      const sy = linkData.source.y! + height / 2
      const tx = linkData.target.x! + width / 2
      const ty = linkData.target.y! + height / 2

      l.gfx.clear()
      l.gfx
        .moveTo(sx, sy)
        .lineTo(tx, ty)
        .stroke({ alpha: l.alpha, width: l.active ? 1.5 : 0.8, color: l.color })
    }

    // --- Particles flowing along links ---
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      const pgfx = particleGfxPool[i]
      if (!pgfx) continue

      p.progress += p.speed * dt
      if (p.progress > 1) p.progress -= 1

      const link = linkRenderData[p.linkIndex]
      if (!link) continue

      const ld = link.simulationData
      const sx = ld.source.x! + width / 2
      const sy = ld.source.y! + height / 2
      const tx = ld.target.x! + width / 2
      const ty = ld.target.y! + height / 2

      const px = sx + (tx - sx) * p.progress
      const py = sy + (ty - sy) * p.progress

      pgfx.clear()
      // Only show particles on visible links
      if (link.alpha > 0.1) {
        pgfx
          .circle(px, py, 1.5)
          .fill({ color: 0xffffff, alpha: link.alpha * 0.9 })
        // Tiny glow halo
        pgfx
          .circle(px, py, 3.5)
          .fill({ color: 0xe7bd57, alpha: link.alpha * 0.25 })
      }
    }

    tweens.forEach((t) => t.update(time))
    app.renderer.render(stage)
    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)
  return () => {
    stopAnimation = true
    app.destroy()
  }
}

let localGraphCleanups: (() => void)[] = []
let globalGraphCleanups: (() => void)[] = []

function cleanupLocalGraphs() {
  for (const cleanup of localGraphCleanups) {
    cleanup()
  }
  localGraphCleanups = []
}

function cleanupGlobalGraphs() {
  for (const cleanup of globalGraphCleanups) {
    cleanup()
  }
  globalGraphCleanups = []
}

document.addEventListener("nav", async (e: CustomEventMap["nav"]) => {
  const slug = e.detail.url
  addToVisited(simplifySlug(slug))

  async function renderLocalGraph() {
    cleanupLocalGraphs()
    const localGraphContainers = document.getElementsByClassName("graph-container")
    for (const container of localGraphContainers) {
      localGraphCleanups.push(await renderGraph(container as HTMLElement, slug))
    }
  }

  await renderLocalGraph()
  const handleThemeChange = () => {
    void renderLocalGraph()
  }

  document.addEventListener("themechange", handleThemeChange)
  window.addCleanup(() => {
    document.removeEventListener("themechange", handleThemeChange)
  })

  const containers = [...document.getElementsByClassName("global-graph-outer")] as HTMLElement[]
  async function renderGlobalGraph() {
    const slug = getFullSlug(window)
    for (const container of containers) {
      container.classList.add("active")
      const sidebar = container.closest(".sidebar") as HTMLElement
      if (sidebar) {
        sidebar.style.zIndex = "1"
      }

      const graphContainer = container.querySelector(".global-graph-container") as HTMLElement
      registerEscapeHandler(container, hideGlobalGraph)
      if (graphContainer) {
        globalGraphCleanups.push(await renderGraph(graphContainer, slug))
      }
    }
  }

  function hideGlobalGraph() {
    cleanupGlobalGraphs()
    for (const container of containers) {
      container.classList.remove("active")
      const sidebar = container.closest(".sidebar") as HTMLElement
      if (sidebar) {
        sidebar.style.zIndex = ""
      }
    }
  }

  async function shortcutHandler(e: HTMLElementEventMap["keydown"]) {
    if (e.key === "g" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault()
      const anyGlobalGraphOpen = containers.some((container) =>
        container.classList.contains("active"),
      )
      anyGlobalGraphOpen ? hideGlobalGraph() : renderGlobalGraph()
    }
  }

  const containerIcons = document.getElementsByClassName("global-graph-icon")
  Array.from(containerIcons).forEach((icon) => {
    icon.addEventListener("click", renderGlobalGraph)
    window.addCleanup(() => icon.removeEventListener("click", renderGlobalGraph))
  })

  document.addEventListener("keydown", shortcutHandler)
  window.addCleanup(() => {
    document.removeEventListener("keydown", shortcutHandler)
    cleanupLocalGraphs()
    cleanupGlobalGraphs()
  })
})
