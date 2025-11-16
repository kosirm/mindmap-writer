<template>
  <div :class="style['container']">
    <div :id="style['svg-wrapper']" ref="wrapperEle">
      <svg :class="style['svg']" ref="svgEle">
        <g ref="gEle">
          <foreignObject ref="foreignEle" style="display: none">
            <mindmap-inline-editor
              v-model="editorContent"
              :visible="editorVisible"
              @save="onEditorSave"
              @cancel="onEditorCancel"
            />
          </foreignObject>
        </g>
      </svg>
    </div>
    <svg ref="asstSvgEle" :class="style['asst-svg']"></svg>
    <div :class="[style['button-list'], style['right-bottom']]">
      <button v-if="centerBtn" @click="centerView()"><i :class="style['gps']"></i></button>
      <button v-if="fitBtn" @click="fitView()"><i :class="style['fit']"></i></button>
      <button v-if="downloadBtn" @click="download()"><i :class="style['download']"></i></button>
    </div>
    <div v-if="timetravel" :class="[style['button-list'], style['right-top']]">
      <button @click="prev" :class="{ [style['disabled']]: !hasPrev }"><i :class="style['prev']"></i></button>
      <button @click="next" :class="{ [style['disabled']]: !hasNext }"><i :class="style['next']"></i></button>
    </div>
    <contextmenu
      v-if="ctm"
      :position="contextmenuPos"
      :groups="menu"
      @click-item="onClickMenu"
    ></contextmenu>
  </div>
</template>

<script lang="ts">
import emitter from '../../mitt'
import type { PropType} from 'vue';
import { defineComponent, onMounted, watch, watchEffect, ref } from 'vue'
import type { Data, TwoNumber } from './interface'
import style from './css'
import * as d3 from './d3'
import { afterOperation, ImData, mmdata } from './data'
import { hasNext, hasPrev } from './state'
import { fitView, getSizeHTML, centerView, next, prev, download } from './assistant'
import { xGap, yGap, branch, scaleExtent, ctm, selection, changeSharpCorner, addNodeBtn, mmprops } from './variable'
import { wrapperEle, svgEle, gEle, asstSvgEle, foreignEle } from './variable/element'
import { draw } from './draw'
import { switchZoom, switchEdit, switchSelect, switchContextmenu, switchDrag, switchKeyboard, onClickMenu } from './listener'
import Contextmenu from '../Contextmenu.vue'
import MindmapInlineEditor from './MindmapInlineEditor.vue'
import { cloneDeep } from 'lodash'
import type { Orientation } from './orientation';
import { applyOrientation } from './orientation'
import { rename } from './data'

export default defineComponent({
  // eslint-disable-next-line vue/multi-word-component-names
  name: 'Mindmap',
  components: {
    Contextmenu,
    MindmapInlineEditor
  },
  emits: ['update:modelValue'],
  props: {
    modelValue: {
      type: Array as PropType<Data[]>,
      required: true
    },
    // 绘制所需的变量
    xGap: { type: Number, default: xGap },
    yGap: { type: Number, default: yGap },
    branch: {
      type: Number,
      default: branch,
      validator: (val: number) => val >= 1 && val <= 6
    },
    scaleExtent: {
      type: Object as PropType<TwoNumber>,
      default: scaleExtent
    },
    sharpCorner: Boolean,
    orientation: {
      type: String as PropType<'clockwise' | 'anticlockwise' | 'right-left' | 'left-right'>,
      default: 'right-left',
      validator: (val: string) => ['clockwise', 'anticlockwise', 'right-left', 'left-right'].includes(val)
    },
    // 操作许可
    centerBtn: Boolean,
    fitBtn: Boolean,
    downloadBtn: Boolean,
    timetravel: Boolean,
    addNodeBtn: Boolean,
    edit: Boolean,
    drag: Boolean,
    keyboard: Boolean,
    ctm: Boolean,
    zoom: Boolean
  },
  setup (props, context) {
    // Keep a pristine copy of the original data for orientation changes
    const originalData = cloneDeep(props.modelValue[0])

    // Tiptap inline editor state
    const editorContent = ref('')
    const editorVisible = ref(false)
    const currentEditingNodeId = ref<string | null>(null)
    const currentEditingNodeOldName = ref<string | null>(null)

    // Editor event handlers
    const onEditorSave = (html: string) => {
      console.log('[Mindmap] Editor save', { nodeId: currentEditingNodeId.value, html })
      if (currentEditingNodeId.value && html !== currentEditingNodeOldName.value) {
        rename(currentEditingNodeId.value, html)
      }
      // Hide editor
      editorVisible.value = false
      if (foreignEle.value) {
        foreignEle.value.style.display = 'none'
      }
      // Remove edited class
      document.getElementsByClassName(style.edited)[0]?.classList.remove(style.edited, style.selected)
    }

    const onEditorCancel = () => {
      console.log('[Mindmap] Editor cancel')
      // Hide editor without saving
      editorVisible.value = false
      if (foreignEle.value) {
        foreignEle.value.style.display = 'none'
      }
      // Remove edited class
      document.getElementsByClassName(style.edited)[0]?.classList.remove(style.edited, style.selected)
    }

    // 立即执行
    watchEffect(() => emitter.emit('scale-extent', props.scaleExtent))
    watchEffect(() => emitter.emit('branch', props.branch))
    watchEffect(() => emitter.emit('sharp-corner', props.sharpCorner))
    watchEffect(() => emitter.emit('gap', { xGap: props.xGap, yGap: props.yGap }))
    watchEffect(() => emitter.emit('mindmap-context', context))
    watchEffect(() => addNodeBtn.value = props.edit && props.addNodeBtn)
    watchEffect(() => mmprops.value.drag = props.drag)
    watchEffect(() => mmprops.value.edit = props.edit)

    // Flag to prevent recreating ImData when the change originated from the mindmap itself
    let isInternalUpdate = false

    // Watch for modelValue changes and update the mindmap data
    watch(() => props.modelValue, (newValue) => {
      console.log('[Mindmap] modelValue changed, isInternalUpdate:', isInternalUpdate);
      if (isInternalUpdate) {
        console.log('[Mindmap] Skipping mmdata recreation - internal update');
        isInternalUpdate = false
        return
      }

      console.log('[Mindmap] Creating new ImData from modelValue');
      if (newValue && newValue[0]) {
        const dataWithOrientation = cloneDeep(newValue[0])
        applyOrientation(dataWithOrientation, props.orientation as Orientation)
        emitter.emit('mmdata', new ImData(dataWithOrientation, xGap, yGap, getSizeHTML))
        // Just redraw - don't call afterOperation to avoid emitting update:modelValue
        draw()
      }
    }, { deep: true })

    // Listen for internal updates from the mindmap
    emitter.on('internal-update', () => {
      console.log('[Mindmap] Setting isInternalUpdate flag');
      isInternalUpdate = true
    })
    // Listen for start-edit event from listener
    emitter.on('start-edit', (data: { nodeId: string, content: string, oldName: string }) => {
      console.log('[Mindmap] start-edit event received', data)
      currentEditingNodeId.value = data.nodeId
      currentEditingNodeOldName.value = data.oldName
      editorContent.value = data.content
      editorVisible.value = true
      console.log('[Mindmap] Editor state updated', {
        editorContent: editorContent.value,
        editorVisible: editorVisible.value,
        foreignEleDisplay: foreignEle.value?.style.display
      })
    })

    // Listen for editor-cancel event from keyboard
    emitter.on('editor-cancel', () => {
      onEditorCancel()
    })

    // onMounted
    onMounted(() => {
      if (!svgEle.value || !gEle.value || !asstSvgEle.value || !foreignEle.value) { return }
      emitter.emit('selection-svg', d3.select(svgEle.value))
      emitter.emit('selection-g', d3.select(gEle.value))
      emitter.emit('selection-asstSvg', d3.select(asstSvgEle.value))
      emitter.emit('selection-foreign',d3.select(foreignEle.value))

      // Emit orientation so it's available globally
      emitter.emit('orientation', props.orientation as Orientation)

      // Apply orientation before creating ImData
      const dataWithOrientation = cloneDeep(originalData)
      if (dataWithOrientation) {
        applyOrientation(dataWithOrientation, props.orientation as Orientation)
        emitter.emit('mmdata', new ImData(dataWithOrientation, xGap, yGap, getSizeHTML))
      }

      changeSharpCorner.value = false
      afterOperation()
      const { svg, foreign } = selection
      foreign?.raise()
      // bindForeignDiv() - No longer needed with Tiptap editor
      fitView()
      // mousedown与drag/zoom绑定的先后顺序会有影响
      svg?.on('mousedown', () => {
        const oldSele = document.getElementsByClassName(style.selected)[0]
        oldSele?.classList.remove(style.selected)
      })
      switchZoom(props.zoom)
      switchContextmenu(props.ctm)
      switchKeyboard(props.keyboard)

      // Debug: Add click listener to SVG wrapper to see if clicks are reaching it
      if (wrapperEle.value) {
        wrapperEle.value.addEventListener('click', (e) => {
          console.log('[Mindmap] SVG wrapper clicked', {
            target: e.target,
            targetTagName: (e.target as Element)?.tagName,
            targetClasses: (e.target as Element)?.className,
            pointerEvents: window.getComputedStyle(e.target as Element).pointerEvents
          });
        }, true); // Use capture phase
      }
    })
    // watch
    watch(() => [props.branch, addNodeBtn.value, props.sharpCorner], () => {
      draw()
      changeSharpCorner.value = false
    })
    watch(() => [props.xGap, props.yGap], (val) => {
      if (val[0] !== undefined && val[1] !== undefined) {
        mmdata.setBoundingBox(val[0], val[1])
        draw()
      }
    })
    watch(() => [props.drag, props.edit], (val) => {
      switchSelect(val[0] || val[1] || false)
      switchDrag(val[0] ?? false)
      switchEdit(val[1] ?? false)
    })
    watch(() => props.zoom, (val) => switchZoom(val))
    watch(() => props.ctm, (val) => switchContextmenu(val))
    watch(() => props.keyboard, (val) => switchKeyboard(val))
    watch(() => props.orientation, (val) => {
      // Emit orientation so it's available globally
      emitter.emit('orientation', val as Orientation)

      // Reapply orientation when it changes - always use original pristine data
      const dataWithOrientation = cloneDeep(originalData)
      if (dataWithOrientation) {
        applyOrientation(dataWithOrientation, val as Orientation)
        emitter.emit('mmdata', new ImData(dataWithOrientation, xGap, yGap, getSizeHTML))
        afterOperation()
        fitView()
      }
    })

    return {
      wrapperEle,
      svgEle,
      gEle,
      style,
      asstSvgEle,
      foreignEle,
      centerView,
      fitView,
      download,
      menu: ctm.menu,
      contextmenuPos: ctm.pos,
      onClickMenu,
      next,
      prev,
      hasPrev,
      hasNext,
      // Tiptap editor state
      editorContent,
      editorVisible,
      currentEditingNodeId,
      currentEditingNodeOldName,
      onEditorSave,
      onEditorCancel
    }
  }
})
</script>
