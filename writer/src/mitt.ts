import mitt from 'mitt'

// Define all event types used in the mindmap component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Events = Record<string, any>

const emitter = mitt<Events>()
export default emitter
