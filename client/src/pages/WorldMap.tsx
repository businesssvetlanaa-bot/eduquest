import { useEffect, useRef } from 'react'
import Phaser from 'phaser'

export interface PlacedBuilding {
  building_type: string
  emoji: string
  position_x: number
  position_y: number
}

interface WorldMapCallbacks {
  onPortalClick: (subject: string) => void
  onPlaceBuilding: (x: number, y: number) => void
}

interface WorldMapProps {
  avatarColor: string
  placedBuildings: PlacedBuilding[]
  placingBuilding: string | null
  placingEmoji: string
  onPortalClick: (subject: string) => void
  onPlaceBuilding: (x: number, y: number) => void
}

const AVATAR_COLORS: Record<string, number> = {
  blue:   0x3B82F6,
  green:  0x22C55E,
  orange: 0xF97316,
  purple: 0x8B5CF6,
}

// ─── Phaser Scene ─────────────────────────────────────────────────────────────

class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container
  private playerMoveTween: Phaser.Tweens.Tween | null = null
  private playerWalkTween: Phaser.Tweens.Tween | null = null
  private clouds: Phaser.GameObjects.Rectangle[] = []
  private buildingObjects: Phaser.GameObjects.GameObject[] = []
  private placementCursor: Phaser.GameObjects.Text | null = null

  // Day / Night
  private dayNightOverlay!: Phaser.GameObjects.Rectangle
  private stars: Phaser.GameObjects.Graphics[] = []
  private sun!: Phaser.GameObjects.Graphics
  private moon!: Phaser.GameObjects.Graphics
  private readonly DAY_CYCLE = 300000 // 5 minutes full cycle

  // Weather
  private rainData: Array<{ x: number; y: number; speed: number }> = []
  private rainGraphics!: Phaser.GameObjects.Graphics
  private isRaining = false
  private rainAlpha = 0

  // Animals
  private birds: Phaser.GameObjects.Text[] = []
  private cat!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'WorldScene' })
  }

  create() {
    this.drawGrass()
    this.drawSkyStrip()
    this.drawTrees()
    this.createCelestialBodies()
    this.createStars()
    this.createPortals()
    this.createClouds()
    this.createPlayer()
    this.createBuildings()
    this.createAnimals()
    this.createDayNightOverlay()
    this.createRainSystem()
    this.setupInput()
  }

  update() {
    const phase = (this.time.now % this.DAY_CYCLE) / this.DAY_CYCLE
    this.updateDayNight(phase)
    this.animateClouds()
    this.updateRain()
    this.syncPlacementCursor()
  }

  // ── Background ───────────────────────────────────────────────────────────

  private drawGrass() {
    const g = this.add.graphics()
    const TILE = 50
    const cols = Math.ceil(800 / TILE) + 1
    const rows = Math.ceil(500 / TILE) + 1
    const shades = [0x4ade80, 0x22c55e, 0x16a34a]
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        g.fillStyle(shades[(r + c * 2) % 3], 1)
        g.fillRect(c * TILE, r * TILE, TILE, TILE)
        g.lineStyle(1, 0x15803d, 0.25)
        g.strokeRect(c * TILE, r * TILE, TILE, TILE)
      }
    }
    // Path
    g.fillStyle(0xfde68a, 0.5)
    g.fillRect(120, 330, 560, 30)
    g.fillRect(370, 130, 60, 220)
  }

  private drawSkyStrip() {
    const g = this.add.graphics()
    g.fillStyle(0x93C5FD, 1)
    g.fillRect(0, 0, 800, 70)
    // Horizon blend
    g.fillStyle(0x86EFAC, 0.45)
    g.fillRect(0, 58, 800, 14)
  }

  private drawTrees() {
    const positions = [
      { x: 22,  y: 90  }, { x: 45,  y: 210 }, { x: 18,  y: 340 }, { x: 48,  y: 455 },
      { x: 778, y: 85  }, { x: 755, y: 205 }, { x: 782, y: 345 }, { x: 758, y: 450 },
      { x: 185, y: 22  }, { x: 330, y: 12  }, { x: 470, y: 18  }, { x: 620, y: 25  },
    ]
    const g = this.add.graphics()
    for (const p of positions) {
      g.fillStyle(0x92400e, 1)
      g.fillRect(p.x - 4, p.y + 8, 8, 18)
      g.fillStyle(0x15803d, 1)
      g.fillTriangle(p.x - 16, p.y + 8, p.x + 16, p.y + 8, p.x, p.y - 14)
      g.fillStyle(0x166534, 1)
      g.fillTriangle(p.x - 12, p.y - 4, p.x + 12, p.y - 4, p.x, p.y - 26)
    }
  }

  // ── Celestial Bodies ─────────────────────────────────────────────────────

  private createCelestialBodies() {
    // Sun
    this.sun = this.add.graphics()
    this.sun.fillStyle(0xFCD34D, 1)
    this.sun.fillCircle(0, 0, 15)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      this.sun.fillStyle(0xFBBF24, 1)
      this.sun.fillTriangle(
        Math.cos(a) * 19, Math.sin(a) * 19,
        Math.cos(a + 0.22) * 27, Math.sin(a + 0.22) * 27,
        Math.cos(a - 0.22) * 27, Math.sin(a - 0.22) * 27,
      )
    }
    this.sun.setDepth(1)
    this.sun.setPosition(100, 38)

    // Moon (crescent)
    this.moon = this.add.graphics()
    this.moon.fillStyle(0xE2E8F0, 1)
    this.moon.fillCircle(0, 0, 13)
    this.moon.fillStyle(0x1e3a5f, 1)
    this.moon.fillCircle(5, -2, 10)
    this.moon.setDepth(1)
    this.moon.setPosition(700, 38)
    this.moon.setAlpha(0)
  }

  // ── Stars ────────────────────────────────────────────────────────────────

  private createStars() {
    for (let i = 0; i < 45; i++) {
      const g = this.add.graphics()
      const size = Phaser.Math.FloatBetween(0.8, 2.2)
      g.fillStyle(0xffffff, 1)
      g.fillCircle(0, 0, size)
      g.setPosition(Phaser.Math.Between(10, 790), Phaser.Math.Between(3, 62))
      g.setDepth(9)
      g.setAlpha(0)
      this.stars.push(g)
    }
  }

  // ── Day / Night ───────────────────────────────────────────────────────────

  private createDayNightOverlay() {
    this.dayNightOverlay = this.add.rectangle(400, 250, 800, 500, 0x060d1f, 0)
    this.dayNightOverlay.setDepth(8)
  }

  private updateDayNight(phase: number) {
    // Sine wave: peak darkness at phase=0.5
    const nightAlpha = Math.max(0, Math.sin(phase * Math.PI)) * 0.75
    this.dayNightOverlay.setAlpha(nightAlpha)

    // Stars fade in when it's dark enough
    const starAlpha = Math.max(0, (nightAlpha - 0.18) / 0.57)
    for (const star of this.stars) star.setAlpha(starAlpha)

    // Sun: travels left→right during day (phase 0→0.5)
    if (phase < 0.5) {
      const t = phase / 0.5
      this.sun.setPosition(70 + t * 660, 42 - Math.sin(t * Math.PI) * 28)
      this.sun.setAlpha(Math.max(0, 1 - nightAlpha * 2))
    } else {
      this.sun.setAlpha(0)
    }

    // Moon: travels left→right during night (phase 0.5→1)
    if (phase >= 0.5) {
      const t = (phase - 0.5) / 0.5
      this.moon.setPosition(70 + t * 660, 42 - Math.sin(t * Math.PI) * 28)
      this.moon.setAlpha(Math.min(1, nightAlpha * 1.5))
    } else {
      this.moon.setAlpha(0)
    }
  }

  // ── Portals ──────────────────────────────────────────────────────────────

  private createPortals() {
    const portals = [
      { x: 140, y: 340, color: 0x3B82F6, label: '🔢 Математика', subject: 'math' },
      { x: 400, y: 160, color: 0x22C55E, label: '📖 Русский',    subject: 'russian' },
      { x: 660, y: 340, color: 0xF97316, label: '🌍 English',    subject: 'english' },
    ]
    for (const p of portals) this.drawPortal(p.x, p.y, p.color, p.label, p.subject)
  }

  private drawPortal(x: number, y: number, color: number, label: string, subject: string) {
    const glow = this.add.graphics()
    glow.fillStyle(color, 0.22)
    glow.fillRoundedRect(x - 50, y - 60, 100, 120, 24)

    const body = this.add.graphics()
    body.fillStyle(color, 1)
    body.fillRoundedRect(x - 40, y - 50, 80, 100, 16)
    body.fillStyle(0x000000, 0.25)
    body.fillEllipse(x, y, 52, 70)
    body.fillStyle(color, 0.6)
    body.fillEllipse(x, y, 42, 60)
    body.fillStyle(0xffffff, 0.35)
    body.fillRoundedRect(x - 30, y - 42, 22, 30, 8)

    this.tweens.add({
      targets: glow,
      alpha: { from: 0.6, to: 1 },
      scaleX: { from: 1, to: 1.06 },
      scaleY: { from: 1, to: 1.06 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.add.text(x, y + 64, label, {
      fontSize: '19px',
      fontFamily: '"Nunito", "Arial", sans-serif',
      fontStyle: 'bold',
      color: '#0f172a',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5)

    const zone = this.add.zone(x, y, 100, 140).setInteractive({ useHandCursor: true })
    zone.on('pointerdown', () => {
      if (this.game.registry.get('placingBuilding')) return
      const cb = this.game.registry.get('callbacks') as WorldMapCallbacks
      cb.onPortalClick(subject)
    })
  }

  // ── Clouds ───────────────────────────────────────────────────────────────

  private createClouds() {
    const cloudDefs = [
      { x: 80,   y: 22, w: 100, h: 30 },
      { x: 350,  y: 36, w: 130, h: 36 },
      { x: 600,  y: 18, w: 90,  h: 26 },
      { x: -60,  y: 50, w: 115, h: 32 },
      { x: 240,  y: 12, w: 80,  h: 24 },
    ]
    for (const c of cloudDefs) {
      const r = this.add.rectangle(c.x, c.y, c.w, c.h, 0xffffff, 0.82)
      r.setData('speed', Phaser.Math.Between(18, 40))
      r.setDepth(6)
      this.clouds.push(r)
    }
  }

  private animateClouds() {
    const dt = this.game.loop.delta / 1000
    for (const c of this.clouds) {
      c.x += (c.getData('speed') as number) * dt
      if (c.x > 880) c.x = -c.width - 20
    }
  }

  // ── Rain ─────────────────────────────────────────────────────────────────

  private createRainSystem() {
    this.rainGraphics = this.add.graphics()
    this.rainGraphics.setDepth(10)

    for (let i = 0; i < 80; i++) {
      this.rainData.push({
        x:     Phaser.Math.Between(0, 800),
        y:     Phaser.Math.Between(-500, 500),
        speed: Phaser.Math.Between(280, 480),
      })
    }

    // Toggle rain every ~90 seconds (offset first event by 60s so it rains after a bit)
    this.time.addEvent({
      delay: 60000,
      callback: () => { this.isRaining = true },
      callbackScope: this,
    })
    this.time.addEvent({
      delay: 120000,
      callback: () => { this.isRaining = false },
      callbackScope: this,
    })
    this.time.addEvent({
      delay: 90000,
      startAt: 150000,
      loop: true,
      callback: () => { this.isRaining = !this.isRaining },
      callbackScope: this,
    })
  }

  private updateRain() {
    const dt = this.game.loop.delta / 1000
    if (this.isRaining) {
      this.rainAlpha = Math.min(0.6, this.rainAlpha + dt * 0.4)
    } else {
      this.rainAlpha = Math.max(0, this.rainAlpha - dt * 0.25)
    }

    if (this.rainAlpha <= 0) { this.rainGraphics.clear(); return }

    const dt2 = this.game.loop.delta / 1000
    this.rainGraphics.clear()
    this.rainGraphics.lineStyle(1.5, 0xBAE6FD, this.rainAlpha)
    for (const drop of this.rainData) {
      drop.y += drop.speed * dt2
      if (drop.y > 510) { drop.y = -12; drop.x = Phaser.Math.Between(0, 800) }
      this.rainGraphics.lineBetween(drop.x, drop.y, drop.x + 2, drop.y + 13)
    }
  }

  // ── Player ───────────────────────────────────────────────────────────────

  private createPlayer() {
    const { playerColor } = this.game.registry.get('worldData') as { playerColor: number }

    const body = this.add.graphics()
    body.fillStyle(playerColor, 1)
    body.fillRect(-16, -16, 32, 32)
    body.fillStyle(0xffffff, 1)
    body.fillRect(-11, -10, 8, 8)
    body.fillRect(3,   -10, 8, 8)
    body.fillStyle(0x1e293b, 1)
    body.fillRect(-9, -8, 5, 5)
    body.fillRect(5,  -8, 5, 5)
    body.lineStyle(2, 0x1e293b, 1)
    body.strokeRect(-6, 4, 12, 5)

    this.player = this.add.container(400, 310, [body])
    this.player.setDepth(5)
  }

  // ── Animals ───────────────────────────────────────────────────────────────

  private createAnimals() {
    // 3 birds in the sky
    for (let i = 0; i < 3; i++) {
      const bird = this.add.text(-40, Phaser.Math.Between(12, 52), '🐦', {
        fontSize: '15px',
      }).setOrigin(0.5).setDepth(7)
      this.birds.push(bird)
      this.launchBird(bird)
    }

    // Cat wandering on path
    this.cat = this.add.text(260, 337, '🐱', {
      fontSize: '20px',
    }).setOrigin(0.5).setDepth(4)
    this.wanderCat()
  }

  private launchBird(bird: Phaser.GameObjects.Text) {
    const fromLeft = Math.random() > 0.5
    const y = Phaser.Math.Between(12, 55)
    bird.setPosition(fromLeft ? -30 : 830, y)
    bird.setFlipX(!fromLeft)

    this.tweens.add({
      targets: bird,
      x: fromLeft ? 860 : -60,
      y: y + Phaser.Math.FloatBetween(-12, 12),
      duration: Phaser.Math.Between(7000, 15000),
      delay:    Phaser.Math.Between(500, 6000),
      ease: 'Sine.easeInOut',
      onComplete: () => this.launchBird(bird),
    })
  }

  private wanderCat() {
    const newX = Phaser.Math.Between(150, 630)
    const dist  = Math.abs((this.cat?.x ?? 260) - newX)
    if (this.cat) {
      this.cat.setFlipX(newX < this.cat.x)
      this.tweens.add({
        targets: this.cat,
        x: newX,
        duration: dist * 14,
        delay: Phaser.Math.Between(2000, 7000),
        ease: 'Linear',
        onComplete: () => this.wanderCat(),
      })
    }
  }

  // ── Buildings ────────────────────────────────────────────────────────────

  createBuildings() {
    for (const obj of this.buildingObjects) obj.destroy()
    this.buildingObjects = []

    const buildings = (this.game.registry.get('placedBuildings') as PlacedBuilding[]) ?? []
    for (const b of buildings) {
      const bg = this.add.graphics()
      bg.fillStyle(0x78350f, 1)
      bg.fillRoundedRect(b.position_x - 24, b.position_y - 24, 48, 48, 10)
      bg.fillStyle(0xfef3c7, 0.3)
      bg.fillRoundedRect(b.position_x - 19, b.position_y - 19, 18, 15, 5)

      const t = this.add.text(b.position_x, b.position_y, b.emoji, {
        fontSize: '26px',
      }).setOrigin(0.5).setDepth(4)

      this.buildingObjects.push(bg, t)
    }
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  private setupInput() {
    this.input.on(
      'pointerdown',
      (ptr: Phaser.Input.Pointer, objects: Phaser.GameObjects.GameObject[]) => {
        if (objects.length > 0) return

        const placing = this.game.registry.get('placingBuilding') as string | null
        if (placing) {
          const cb = this.game.registry.get('callbacks') as WorldMapCallbacks
          cb.onPlaceBuilding(
            Phaser.Math.Clamp(ptr.worldX, 60, 740),
            Phaser.Math.Clamp(ptr.worldY, 60, 450),
          )
        } else {
          const dist = Phaser.Math.Distance.Between(
            this.player.x, this.player.y, ptr.worldX, ptr.worldY,
          )

          // Stop previous movement
          if (this.playerMoveTween) { this.playerMoveTween.stop(); this.playerMoveTween = null }
          if (this.playerWalkTween) { this.playerWalkTween.stop(); this.playerWalkTween = null }
          this.tweens.killTweensOf(this.player)
          this.player.setScale(1)

          // Walking squish (repeating up/down bob)
          this.playerWalkTween = this.tweens.add({
            targets: this.player,
            scaleY: { from: 0.90, to: 1.0 },
            scaleX: { from: 1.08, to: 1.0 },
            duration: 180,
            yoyo: true,
            repeat: -1,
          })

          // Move to destination
          this.playerMoveTween = this.tweens.add({
            targets: this.player,
            x: Phaser.Math.Clamp(ptr.worldX, 30, 770),
            y: Phaser.Math.Clamp(ptr.worldY, 30, 470),
            duration: Math.min(900, dist * 2.8),
            ease: 'Quad.easeOut',
            onComplete: () => {
              if (this.playerWalkTween) { this.playerWalkTween.stop(); this.playerWalkTween = null }
              this.tweens.killTweensOf(this.player)
              // Landing squish
              this.tweens.add({
                targets: this.player,
                scaleY: { from: 0.72, to: 1.0 },
                scaleX: { from: 1.28, to: 1.0 },
                duration: 240,
                ease: 'Back.easeOut',
              })
              this.playerMoveTween = null
            },
          })
        }
      },
    )
  }

  // ── Placement cursor ──────────────────────────────────────────────────────

  private syncPlacementCursor() {
    const placing = this.game.registry.get('placingBuilding') as string | null

    if (placing) {
      const emoji = this.game.registry.get('placingEmoji') as string
      if (!this.placementCursor) {
        this.placementCursor = this.add.text(0, 0, emoji, { fontSize: '34px' })
          .setOrigin(0.5)
          .setDepth(20)
        this.input.setDefaultCursor('crosshair')
      } else {
        this.placementCursor.setText(emoji)
      }
      const ptr = this.input.activePointer
      this.placementCursor.setPosition(ptr.worldX, ptr.worldY)
    } else if (this.placementCursor) {
      this.placementCursor.destroy()
      this.placementCursor = null
      this.input.setDefaultCursor('default')
    }
  }
}

// ─── React Component ──────────────────────────────────────────────────────────

export default function WorldMap({
  avatarColor,
  placedBuildings,
  placingBuilding,
  placingEmoji,
  onPortalClick,
  onPlaceBuilding,
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef      = useRef<Phaser.Game | null>(null)
  const callbacksRef = useRef({ onPortalClick, onPlaceBuilding })
  callbacksRef.current = { onPortalClick, onPlaceBuilding }

  // Mount Phaser once
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const playerColor = AVATAR_COLORS[avatarColor] ?? 0x4F46E5

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 800,
      height: 500,
      parent: containerRef.current,
      backgroundColor: '#22c55e',
      scale: {
        mode: Phaser.Scale.ENVELOP,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 500,
      },
      scene: WorldScene,
      input: { mouse: { preventDefaultWheel: false } },
    })

    game.registry.set('worldData', { playerColor })
    game.registry.set('placedBuildings', placedBuildings)
    game.registry.set('placingBuilding', null)
    game.registry.set('placingEmoji', '')
    game.registry.set('callbacks', {
      onPortalClick:   (s: string)            => callbacksRef.current.onPortalClick(s),
      onPlaceBuilding: (x: number, y: number) => callbacksRef.current.onPlaceBuilding(x, y),
    })

    gameRef.current = game

    return () => {
      game.destroy(true)
      gameRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync placement state → Phaser registry
  useEffect(() => {
    if (!gameRef.current) return
    gameRef.current.registry.set('placingBuilding', placingBuilding)
    gameRef.current.registry.set('placingEmoji', placingEmoji)
  }, [placingBuilding, placingEmoji])

  // Sync buildings → refresh scene
  useEffect(() => {
    if (!gameRef.current) return
    gameRef.current.registry.set('placedBuildings', placedBuildings)
    const scene = gameRef.current.scene.getScene('WorldScene') as WorldScene | null
    scene?.createBuildings()
  }, [placedBuildings])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    />
  )
}
