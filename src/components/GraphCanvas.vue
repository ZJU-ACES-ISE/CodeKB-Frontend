<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import type { GraphEdge, GraphNode, GraphPayload } from '@/types/graph';

interface Props {
  graph: GraphPayload | null;
  visibleTypes: Set<string>;
  maxNodes: number;
  pinnedNodeIds?: Set<string>;
  matchedNodeIds?: Set<string>;
  highlightedEdgeKeys?: Set<string>;
  focusedNodeId?: string | null;
  selectedNodeId?: string | null;
  selectedEdgeKey?: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  select: [node: GraphNode];
  'select-edge': [edge: GraphEdge];
  'toggle-node-select': [node: GraphNode];
  'toggle-edge-select': [edge: GraphEdge];
  'blank-click': [];
  stats: [stats: { nodes: number; edges: number }];
}>();

const WIDTH = 1200;
const HEIGHT = 800;

const COLORS: Record<string, string> = {
  folder_structure:  '#64748b',
  cross_file_deps:   '#2563eb',
  call_graph:        '#0c7c59',
  class_inheritance: '#b45309',
  ast:               '#7c3aed',
  cfg:               '#dc2626',
  dfg:               '#0891b2',
  type_deps:         '#9333ea',
  code:              '#0c7c59',
  file:              '#64748b',
  class:             '#b45309',
  interface:         '#8b5cf6',
  function:          '#059669',
  external:          '#2563eb',
  code_symbol:       '#0891b2',
};

interface PositionedNode extends GraphNode {
  x: number;
  y: number;
  r: number;
  fill: string;
}

interface PositionedEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  sourceId: string;
  targetId: string;
  raw: GraphEdge;
  key: string;
}

const positionedNodes = ref<PositionedNode[]>([]);
const positionedEdges = ref<PositionedEdge[]>([]);

const viewBox = computed(() => `0 0 ${WIDTH} ${HEIGHT}`);
const hasMatches = computed(() => Boolean(props.matchedNodeIds?.size));

function edgeKey(edge: GraphEdge) {
  return [
    edge.source,
    edge.target,
    edge.edge_type || '',
    edge.relation || '',
    edge.source_location || '',
  ].join('__');
}

function filterAndLayout() {
  const graph = props.graph;
  if (!graph) {
    positionedNodes.value = [];
    positionedEdges.value = [];
    emit('stats', { nodes: 0, edges: 0 });
    return;
  }

  const types = props.visibleTypes;
  const maxNodes = props.maxNodes || 700;
  const pinnedNodeIds = props.pinnedNodeIds || new Set<string>();

  let nodes = graph.nodes.filter((n) => types.has(n.graph_type));
  nodes.sort((a, b) => String(a.id).localeCompare(String(b.id)));

  if (nodes.length > maxNodes) {
    const pinned: GraphNode[] = [];
    const rest: GraphNode[] = [];
    nodes.forEach((node) => {
      if (pinnedNodeIds.has(node.id)) pinned.push(node);
      else rest.push(node);
    });
    const keptPinned = pinned.slice(0, maxNodes);
    const remainingSlots = Math.max(0, maxNodes - keptPinned.length);
    nodes = [...keptPinned, ...rest.slice(0, remainingSlots)];
  }

  const ids = new Set(nodes.map((n) => n.id));
  const edges = graph.edges.filter((e: GraphEdge) => ids.has(e.source) && ids.has(e.target));

  const degree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  edges.forEach((e) => {
    degree.set(e.source, (degree.get(e.source) || 0) + 1);
    degree.set(e.target, (degree.get(e.target) || 0) + 1);
  });

  const byType = new Map<string, GraphNode[]>();
  nodes.forEach((n) => {
    const arr = byType.get(n.graph_type) || [];
    arr.push(n);
    byType.set(n.graph_type, arr);
  });

  const typeList = [...byType.keys()].sort();
  const placed = new Map<string, { x: number; y: number }>();
  typeList.forEach((type, idx) => {
    const group = byType.get(type)!;
    const cx = WIDTH * ((idx + 1) / (typeList.length + 1));
    const cy = HEIGHT / 2;
    const radius = Math.min(260, 70 + group.length * 1.8);
    group.forEach((node, i) => {
      const angle = (Math.PI * 2 * i) / Math.max(1, group.length);
      placed.set(node.id, {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    });
  });

  positionedNodes.value = nodes.map((n) => {
    const p = placed.get(n.id)!;
    const deg = degree.get(n.id) || 1;
    return {
      ...n,
      x: p.x,
      y: p.y,
      r: Math.min(13, 4 + Math.sqrt(deg)),
      fill: COLORS[n.graph_type] || '#475569',
    } satisfies PositionedNode;
  });

  positionedEdges.value = edges
    .map((e) => {
      const s = placed.get(e.source);
      const t = placed.get(e.target);
      if (!s || !t) return null;
      const crossSubgraph = e.edge_type && !e.edge_type.startsWith('internal_');
      return {
        x1: s.x,
        y1: s.y,
        x2: t.x,
        y2: t.y,
        width: crossSubgraph ? 1.6 : 0.8,
        sourceId: e.source,
        targetId: e.target,
        raw: e,
        key: edgeKey(e),
      } satisfies PositionedEdge;
    })
    .filter((e): e is PositionedEdge => e !== null);

  emit('stats', { nodes: positionedNodes.value.length, edges: positionedEdges.value.length });
}

watch(
  () => [props.graph, props.visibleTypes, props.maxNodes, props.pinnedNodeIds],
  () => filterAndLayout(),
  { immediate: true, deep: true },
);

function onSelect(node: PositionedNode) {
  emit('select', node);
}

function onSelectEdge(edge: PositionedEdge) {
  emit('select-edge', edge.raw);
}

function onToggleNodeSelect(node: PositionedNode) {
  emit('toggle-node-select', node);
}

function onToggleEdgeSelect(edge: PositionedEdge) {
  emit('toggle-edge-select', edge.raw);
}

function labelText(node: PositionedNode): string {
  const raw = node.label || node.id;
  return String(raw).slice(0, 34);
}

function nodeClasses(node: PositionedNode) {
  const matched = props.matchedNodeIds?.has(node.id) ?? false;
  const focused = props.focusedNodeId === node.id;
  const selected = props.selectedNodeId === node.id;
  return {
    'is-match': matched,
    'is-focused': focused,
    'is-selected': selected,
    'is-dim': hasMatches.value && !matched && !selected,
  };
}

function labelClasses(node: PositionedNode) {
  const selected = props.selectedNodeId === node.id;
  return {
    'is-dim': hasMatches.value && !(props.matchedNodeIds?.has(node.id) ?? false) && !selected,
    'is-focused': props.focusedNodeId === node.id,
    'is-selected': selected,
  };
}

function edgeClasses(edge: PositionedEdge) {
  const highlighted = props.highlightedEdgeKeys?.has(edge.key) ?? false;
  const selected = props.selectedEdgeKey === edge.key;
  return {
    'is-related': highlighted,
    'is-selected': selected,
    'is-dim': hasMatches.value && !highlighted && !selected,
  };
}

function onBackgroundClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit('blank-click');
  }
}
</script>

<template>
  <div class="graph-canvas-wrap">
    <svg
      class="graph-svg"
      :viewBox="viewBox"
      role="img"
      @click="onBackgroundClick"
      aria-label="Repository graph"
      preserveAspectRatio="xMidYMid meet"
    >
      <g class="edges">
        <g
          v-for="(edge, idx) in positionedEdges"
          :key="`e-${idx}-${edge.sourceId}-${edge.targetId}`"
          class="edge-group"
          @mouseenter="onSelectEdge(edge)"
          @mousedown.stop.prevent="onToggleEdgeSelect(edge)"
        >
          <line
            class="edge"
            :class="edgeClasses(edge)"
            :x1="edge.x1"
            :y1="edge.y1"
            :x2="edge.x2"
            :y2="edge.y2"
            :stroke-width="edge.width"
          />
          <line
            class="edge-hit"
            :x1="edge.x1"
            :y1="edge.y1"
            :x2="edge.x2"
            :y2="edge.y2"
            :stroke-width="Math.max(8, edge.width + 6)"
          />
        </g>
      </g>
      <g class="nodes">
        <g
          v-for="node in positionedNodes"
          :key="node.id"
          class="node-group"
          @mouseenter="onSelect(node)"
          @mousedown.stop.prevent="onToggleNodeSelect(node)"
        >
          <circle
            class="node"
            :class="nodeClasses(node)"
            :cx="node.x"
            :cy="node.y"
            :r="node.r"
            :fill="node.fill"
          />
          <text
            class="node-label"
            :class="labelClasses(node)"
            :x="node.x + node.r + 3"
            :y="node.y + 3"
          >{{ labelText(node) }}</text>
        </g>
      </g>
      <text
        v-if="!positionedNodes.length"
        x="50%"
        y="50%"
        text-anchor="middle"
        class="placeholder-text"
      >尚未加载图数据，请先 Build 或 Load Graph</text>
    </svg>
  </div>
</template>

<style scoped>
.graph-canvas-wrap {
  position: absolute;
  inset: 0;
  background: #fbfcfe;
  overflow: hidden;
}

.graph-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.edge {
  stroke: #a6b0c3;
  stroke-opacity: 0.45;
  transition: stroke 0.15s, stroke-opacity 0.15s, stroke-width 0.15s;
}

.edge.is-related {
  stroke: #2563eb;
  stroke-opacity: 0.95;
  stroke-width: 2.4;
}

.edge.is-dim {
  stroke-opacity: 0.08;
}

.edge-hit {
  stroke: transparent;
  pointer-events: stroke;
}

.edge-group {
  cursor: pointer;
}

.edge-group:hover .edge {
  stroke: #2563eb;
  stroke-opacity: 0.9;
}

.edge-group:hover .edge.is-selected {
  stroke: #ec4899;
  stroke-opacity: 0.95;
}

.node {
  stroke: #fff;
  stroke-width: 1.5;
  cursor: pointer;
  transition: stroke 0.15s, stroke-width 0.15s, opacity 0.15s, filter 0.15s;
}

.node.is-match {
  stroke: #f59e0b;
  stroke-width: 3;
  filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.35));
}

.node.is-focused {
  stroke: #172033;
  stroke-width: 3.2;
  filter: drop-shadow(0 0 12px rgba(37, 99, 235, 0.38));
}

.node.is-dim {
  opacity: 0.22;
}

.node-group:hover .node {
  stroke: #172033;
  stroke-width: 2;
}

.node.is-selected {
  stroke: #ec4899;
  stroke-width: 3.4;
  opacity: 1;
  filter: drop-shadow(0 0 14px rgba(236, 72, 153, 0.45));
}

.edge.is-selected {
  stroke: #ec4899;
  stroke-opacity: 0.95;
  stroke-width: 3;
}

.node-label {
  font-size: 10px;
  fill: #263247;
  pointer-events: none;
  transition: opacity 0.15s, fill 0.15s, font-weight 0.15s;
}

.node-label.is-dim {
  opacity: 0.28;
}

.node-label.is-focused {
  fill: #172033;
  font-weight: 700;
}

.node-label.is-selected {
  fill: #be185d;
  font-weight: 700;
}

.placeholder-text {
  font-size: 16px;
  fill: var(--kb-muted);
}
</style>
