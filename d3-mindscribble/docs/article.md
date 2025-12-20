Composing D3 Visualizations With Vue.js
Vue.js makes composing visualizations with D3 simple, elegant and fun
Tyrone Tudehope

D3 is a powerful data visualization library combining visualization components and DOM manipulation. On the other hand, Vue.js is a reactive front-end framework which allows you to declaritvely render data to the DOM and abstract out complex logic. Both frameworks try to do similar things, however, when combined it can become difficult to keep logic consistent. This post will attempt to address this conflict by demonstrating how we can use Vue to manipulate the DOM while embracing reactivity to update D3 components.

A demo can be found here, and the sample code here.

Before we begin, lets create a Vue component which renders a simple line chart using regular D3 DOM manipulation:
<script>
import * as d3 from 'd3';
const data = [99, 71, 78, 25, 36, 92];
export default {
  name: 'non-vue-line-chart',
  template: '<div></div>',
  mounted() {
    const svg = d3.select(this.$el)
      .append('svg')
      .attr('width', 500)
      .attr('height', 270)
      .append('g')
      .attr('transform', 'translate(0, 10)');
    const x = d3.scaleLinear().range([0, 430]);
    const y = d3.scaleLinear().range([210, 0]);
    d3.axisLeft().scale(x);
    d3.axisTop().scale(y);
    x.domain(d3.extent(data, (d, i) => i));
    y.domain([0, d3.max(data, d => d)]);
    const createPath = d3.line()
      .x((d, i) => x(i))
      .y(d => y(d));
    svg.append('path').attr('d', createPath(data));
  },
};
</script>

<style lang="sass">
svg
  margin: 25px;
  path
    fill: none
    stroke: #76BF8A
    stroke-width: 3px
</style>

This will render the following:

Press enter or click to view image in full size

The code is simple and easy to understand, but this is just a basic example. Because we aren’t making use of a template, more complex visualizations which would require a lot more manipulation and calculations, would obscure design and logic of a component. Another caveat of the above approach is that we cannot make use of the scoped property for our CSS since D3 is dynamically adding elements to the DOM.

We can recreate this example in a more vuu-esque fashion:
<template>
  <svg width="500" height="270">
    <g style="transform: translate(0, 10px)">
      <path :d="line" />
    </g>
  </svg>
</template>

<script>
import * as d3 from 'd3';
export default {
  name: 'vue-line-chart',
  data() {
    return {
      data: [99, 71, 78, 25, 36, 92],
      line: '',
    };
  },
  mounted() {
    this.calculatePath();
  },
  methods: {
    getScales() {
      const x = d3.scaleTime().range([0, 430]);
      const y = d3.scaleLinear().range([210, 0]);
      d3.axisLeft().scale(x);
      d3.axisBottom().scale(y);
      x.domain(d3.extent(this.data, (d, i) => i));
      y.domain([0, d3.max(this.data, d => d)]);
      return { x, y };
    },
    calculatePath() {
      const scale = this.getScales();
      const path = d3.line()
        .x((d, i) => scale.x(i))
        .y(d => scale.y(d));
      this.line = path(this.data);
    },
  },
};
</script>

<style lang="sass" scoped>
svg
  margin: 25px;
path
  fill: none
  stroke: #76BF8A
  stroke-width: 3px
</style>

Quite cool, even though it doesn’t expose any properties and the data is hard-coded, it nicely separates the view from the logic and makes use of Vue hooks, methods and the data object.

We are making use of D3s components to generate the data we require to populate the document with, but we’re using Vue to manage the DOM and the state of the component.

Here is component which generates a stacked area chart, adds user interaction, responds to resize events on its parent container and reacts to changes to its dataset by animating the chart to its new state:
<template>
  <div>
    <svg @mousemove="mouseover" :width="width" :height="height">
      <g :style="{transform: `translate(${margin.left}px, ${margin.top}px)`}">
        <path class="area" :d="paths.area" />
        <path class="line" :d="paths.line" />
        <path class="selector" :d="paths.selector" />
      </g>
    </svg>
  </div>
</template>

<script>
/* globals window, requestAnimationFrame */
import * as d3 from 'd3';
import TWEEN from 'tween.js';
const props = {
  data: {
    type: Array,
    default: () => [],
  },
  margin: {
    type: Object,
    default: () => ({
      left: 0,
      right: 0,
      top: 10,
      bottom: 10,
    }),
  },
  ceil: {
    type: Number,
    default: 100,
  },
};
export default {
  name: 'area-chart',
  props,
  data() {
    return {
      width: 0,
      height: 0,
      paths: {
        area: '',
        line: '',
        selector: '',
      },
      lastHoverPoint: {},
      scaled: {
        x: null,
        y: null,
      },
      animatedData: [],
      points: [],
    };
  },
  computed: {
    padded() {
      const width = this.width - this.margin.left - this.margin.right;
      const height = this.height - this.margin.top - this.margin.bottom;
      return { width, height };
    },
  },
  mounted() {
    window.addEventListener('resize', this.onResize);
    this.onResize();
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize);
  },
  watch: {
    data: function dataChanged(newData, oldData) {
      this.tweenData(newData, oldData);
    },
    width: function widthChanged() {
      this.initialize();
      this.update();
    },
  },
  methods: {
    onResize() {
      this.width = this.$el.offsetWidth;
      this.height = this.$el.offsetHeight;
    },
    createArea: d3.area().x(d => d.x).y0(d => d.max).y1(d => d.y),
    createLine: d3.line().x(d => d.x).y(d => d.y),
    createValueSelector: d3.area().x(d => d.x).y0(d => d.max).y1(0),
    initialize() {
      this.scaled.x = d3.scaleLinear().range([0, this.padded.width]);
      this.scaled.y = d3.scaleLinear().range([this.padded.height, 0]);
      d3.axisLeft().scale(this.scaled.x);
      d3.axisBottom().scale(this.scaled.y);
    },
    tweenData(newData, oldData) {
      const vm = this;
      function animate(time) {
        requestAnimationFrame(animate);
        TWEEN.update(time);
      }
      new TWEEN.Tween(oldData)
        .easing(TWEEN.Easing.Quadratic.Out)
        .to(newData, 500)
        .onUpdate(function onUpdate() {
          vm.animatedData = this;
          vm.update();
        })
        .start();
      animate();
    },
    update() {
      this.scaled.x.domain(d3.extent(this.data, (d, i) => i));
      this.scaled.y.domain([0, this.ceil]);
      this.points = [];
      for (const [i, d] of this.animatedData.entries()) {
        this.points.push({
          x: this.scaled.x(i),
          y: this.scaled.y(d),
          max: this.height,
        });
      }
      this.paths.area = this.createArea(this.points);
      this.paths.line = this.createLine(this.points);
    },
    mouseover({ offsetX }) {
      if (this.points.length > 0) {
        const x = offsetX - this.margin.left;
        const closestPoint = this.getClosestPoint(x);
        if (this.lastHoverPoint.index !== closestPoint.index) {
          const point = this.points[closestPoint.index];
          this.paths.selector = this.createValueSelector([point]);
          this.$emit('select', this.data[closestPoint.index]);
          this.lastHoverPoint = closestPoint;
        }
      }
    },
    getClosestPoint(x) {
      return this.points
        .map((point, index) => ({ x:
          point.x,
          diff: Math.abs(point.x - x),
          index,
        }))
        .reduce((memo, val) => (memo.diff < val.diff ? memo : val));
    },
  },
};
</script>

We have now built a reusable component which requires only an array of arbitrary numbers to be passed down to it.

This component registers a listener on the resize event which calculates the container dimensions; Updates are triggered by changes to width and data; And, a mouseover handler snaps the data “selector” to a value in the chart and emits an event back to the parent component.

An example rendering of pseudo-random numbers within a range defined by the user:

Press enter or click to view image in full size

Live example

There are plenty of responsive HTML charting libraries available, and most of them can be quite easily wrapped inside Vue components. However, the extensibility of D3 and the amount of features it offers makes it a good fit for anybody wanting advanced data visualisation. Coupled with Vue.js, creating D3 components is not only easy, but also quite fun!