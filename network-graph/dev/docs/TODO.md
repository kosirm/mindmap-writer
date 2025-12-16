- zoom canvas with/without nodes being zoomed
- box mode concept mapping (like concept map in mindscribble) - maybe with layers?
- child nodes expand-collapse
- editing nodes (tiptap lazy loaded)
- select, delete edges
- context menu on edges
- edge labels
- edge animations 


Node styling:
🔧 Implementation Feasibility
YES, this is absolutely possible! The v-network-graph library is designed for this exact use case:

✅ Technical Feasibility: The library supports function-based styling for all properties
✅ Performance: Custom templates are efficient even with many nodes
✅ User Experience: Can implement intuitive style selection UI
✅ Data Model: Easy to extend MindMapNode interface
✅ Persistence: Styles can be saved/loaded with node data
🚀 Recommendation
For the final product, I recommend:

Start with style presets (important, urgent, completed, etc.)
Add custom color picker for advanced users
Implement style inheritance (child nodes inherit parent styles)
Add style copy/paste functionality
Include style reset option