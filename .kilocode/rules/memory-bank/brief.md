# MindScribble Project Brief

## Overview
MindScribble is a professional mindmapping application designed to overcome the cognitive limitations of traditional mindmapping tools. By enabling users to create interconnected, smaller mindmaps instead of monolithic structures, it addresses the scalability challenges of managing complex knowledge bases while maintaining user data ownership and privacy.

## Main Objectives
- **Scalable Knowledge Management**: Enable unlimited knowledge organization through networked mindmaps rather than single large documents
- **AI-First User Experience**: Provide intelligent assistance for mindmap creation, expansion, and analysis using affordable AI providers
- **User Data Sovereignty**: Store all mindmap data in users' Google Drive accounts, ensuring complete data ownership
- **Accessible Freemium Model**: Offer powerful features across subscription tiers with transparent pricing

## Key Features
- **Inter-Map Linking System**: Connect nodes across different mindmaps to create a personal knowledge network
- **AI-Powered Operations**: Natural language commands for creating, expanding, analyzing, and reorganizing mindmaps
- **Master Map Visualization**: D3 force-directed graph showing relationships between all user's mindmaps
- **Advanced Canvas**: VueFlow-based editing with LOD (Level of Detail) system for handling 1000+ nodes
- **Rich Text Editing**: Tiptap-powered content editing with full formatting support
- **Multi-View Interface**: Canvas, writer, and tree views for different editing modes
- **Real-time Collaboration**: Share and collaborate on mindmaps (Pro/Enterprise features)
- **Offline Support**: IndexedDB caching for offline editing and synchronization

## Technology Stack

### Frontend
- **Vue 3** (Composition API) - Reactive UI framework
- **Quasar 2** - Material Design component library with theming
- **VueFlow** - Canvas-based node editing with custom layout engine
- **Tiptap** - Rich text editor for node content
- **D3.js** - Force-directed graph visualization for master maps
- **TypeScript** - Type-safe development
- **Pinia** - Centralized state management

### Backend & Infrastructure
- **Supabase** - Authentication, database, and serverless functions
- **Google Drive API** - Secure, user-owned file storage
- **Stripe** - Subscription and payment processing
- **Supabase Edge Functions** - Serverless AI processing

### AI Integration
- **Supabase Edge Functions** - Server-side AI orchestration (replacing n8n)
- **DeepSeek/OpenAI** - Cost-effective LLM providers for mindmap operations
- **Structured JSON Operations** - Predictable AI responses for canvas manipulation
- **Rate Limiting & Usage Tracking** - Fair usage across subscription tiers

## Business Model
MindScribble operates on a freemium subscription model:

- **FREE**: Unlimited mindmaps, basic editing, Google Drive storage
- **PRO ($7/month)**: Full-text search, export capabilities, collaboration features
- **ENTERPRISE ($25-40/month)**: AI-powered features, unlimited AI requests, team workspaces

## Significance
MindScribble represents a paradigm shift in mindmapping by solving the fundamental scalability problem: cognitive overload from large, unwieldy mindmaps. The inter-map linking system enables unlimited knowledge organization while maintaining mental clarity. The AI-first approach, combined with user data ownership, positions MindScribble as a privacy-focused alternative to traditional mindmapping tools, potentially disrupting how professionals organize and manage complex information.

The technical architecture demonstrates sophisticated integration of modern web technologies with AI, establishing a foundation for future knowledge management applications that prioritize both user experience and data sovereignty.

Currently we're in progress to develop this project.
