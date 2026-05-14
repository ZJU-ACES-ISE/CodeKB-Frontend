<template>
  <div class="donut-wrap">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
      <g :transform="`translate(${size/2},${size/2})`">
        <!-- segments -->
        <path
          v-for="(seg, i) in segments"
          :key="i"
          :d="seg.d"
          :fill="seg.color"
          :opacity="hoveredIdx === i ? 1 : 0.88"
          style="cursor:pointer;transition:opacity .15s"
          @mouseenter="hoveredIdx = i"
          @mouseleave="hoveredIdx = -1"
        />
        <!-- center text -->
        <text text-anchor="middle" dy="-0.2em" class="center-val">{{ centerVal }}</text>
        <text text-anchor="middle" dy="1.4em" class="center-label">{{ centerLabel }}</text>
      </g>
    </svg>
    <!-- tooltip -->
    <div v-if="hoveredIdx >= 0 && segments[hoveredIdx]" class="donut-tooltip">
      <span class="tt-dot" :style="{ background: segments[hoveredIdx].color }" />
      {{ segments[hoveredIdx].label }}: {{ segments[hoveredIdx].pct }}%
    </div>
    <!-- legend -->
    <div class="legend">
      <div v-for="(seg, i) in segments.slice(0, maxLegend)" :key="i" class="legend-item">
        <span class="legend-dot" :style="{ background: seg.color }" />
        <span class="legend-label">{{ seg.label }}</span>
        <span class="legend-pct">{{ seg.pct }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Segment { label: string; value: number; color: string }

const props = withDefaults(defineProps<{
  data: Segment[]
  size?: number
  innerRatio?: number
  centerVal?: string
  centerLabel?: string
  maxLegend?: number
}>(), {
  size: 160,
  innerRatio: 0.55,
  centerVal: '',
  centerLabel: '',
  maxLegend: 6,
})

const hoveredIdx = ref(-1)
const R = computed(() => props.size / 2 - 4)
const r = computed(() => R.value * props.innerRatio)

const segments = computed(() => {
  const total = props.data.reduce((s, d) => s + d.value, 0)
  if (!total) return []
  let startAngle = -Math.PI / 2
  return props.data.map(d => {
    const angle = (d.value / total) * Math.PI * 2
    const endAngle = startAngle + angle
    const pct = Math.round(d.value / total * 100)
    const d_path = describeArc(0, 0, R.value, r.value, startAngle, endAngle)
    startAngle = endAngle
    return { ...d, pct, d: d_path }
  })
})

function describeArc(cx: number, cy: number, R: number, r: number, startAngle: number, endAngle: number) {
  const x1 = cx + R * Math.cos(startAngle)
  const y1 = cy + R * Math.sin(startAngle)
  const x2 = cx + R * Math.cos(endAngle)
  const y2 = cy + R * Math.sin(endAngle)
  const ix1 = cx + r * Math.cos(endAngle)
  const iy1 = cy + r * Math.sin(endAngle)
  const ix2 = cx + r * Math.cos(startAngle)
  const iy2 = cy + r * Math.sin(startAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  return `M${x1},${y1} A${R},${R},0,${largeArc},1,${x2},${y2} L${ix1},${iy1} A${r},${r},0,${largeArc},0,${ix2},${iy2} Z`
}
</script>

<style scoped>
.donut-wrap { position: relative; display: flex; flex-direction: column; align-items: center; }
.center-val { font-size: 20px; font-weight: 700; fill: #172033; }
.center-label { font-size: 11px; fill: #69758a; }
.donut-tooltip {
  position: absolute;
  top: -28px; left: 50%;
  transform: translateX(-50%);
  background: rgba(23,32,51,.85);
  color: #fff;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
}
.tt-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
.legend { margin-top: 8px; width: 100%; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; margin-bottom: 3px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.legend-label { flex: 1; color: #4a5568; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.legend-pct { color: #69758a; }
</style>
