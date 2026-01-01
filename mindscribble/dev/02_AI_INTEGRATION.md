# MindPad AI Integration Guide

## Overview

MindPad uses **n8n** as an AI agent orchestration platform to provide AI-powered mindmap features. This document describes the complete AI integration architecture.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      MindPad Frontend                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  AI Chat UI  │  │  AI Store    │  │ Document     │          │
│  │              │  │  (Pinia)     │  │ Store        │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
│         └─────────────────┴──────────────────┘                   │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │ HTTPS POST
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        n8n Workflow                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Webhook    │→ │ Parse Intent │→ │  Call LLM    │          │
│  │   Trigger    │  │              │  │ (OpenAI/     │          │
│  │              │  │              │  │  Claude)     │          │
│  └──────────────┘  └──────────────┘  └──────┬───────┘          │
│                                              │                   │
│  ┌──────────────┐  ┌──────────────┐         │                   │
│  │   Return     │← │   Format     │←────────┘                   │
│  │   Response   │  │  Operations  │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
                            │ JSON Response
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MindPad Frontend                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Apply        │→ │  Update      │→ │  Auto-save   │          │
│  │ Operations   │  │  Canvas      │  │  to Drive    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## AI Use Cases

### 1. Creation & Generation
- **Create from scratch**: "Create a mindmap for planning a wedding"
- **Create from document**: "Create a mindmap from this meeting transcript"
- **Create from template**: "Create a SWOT analysis mindmap"

### 2. Expansion & Detailing
- **Expand node**: "Expand the 'Budget' node with typical wedding costs"
- **Expand with context**: "Add details to 'Venue' with pros and cons"
- **Expand entire mindmap**: "Expand all nodes to 3 levels deep"

### 3. Analysis & Insights
- **Analyze structure**: "Analyze this mindmap and suggest improvements"
- **Find gaps**: "What's missing from this project plan?"
- **Compare**: "Compare this with best practices for project planning"

### 4. Reorganization & Optimization
- **Restructure**: "Reorganize by priority"
- **Simplify**: "Simplify this mindmap by merging similar nodes"
- **Balance**: "Balance the depth of all branches"

### 5. Content Enhancement
- **Improve writing**: "Improve the writing quality of all nodes"
- **Add descriptions**: "Add descriptions to all nodes"
- **Translate**: "Translate this mindmap to Spanish"

### 6. Smart Suggestions
- **Proactive suggestions**: AI suggests improvements while editing
- **Auto-complete**: AI completes node titles
- **Related topics**: "Show related topics from my other mindmaps"

### 7. Task Management
- **Extract action items**: "Extract all action items from this mindmap"
- **Add deadlines**: "Add realistic deadlines to all tasks"
- **Export to task manager**: "Export tasks to Todoist format"

### 8. Collaboration
- **Summarize**: "Create a summary of this mindmap for sharing"
- **Generate presentation**: "Create a presentation outline from this mindmap"
- **Executive summary**: "Create an executive summary"

## Frontend Implementation

### AI Store (Pinia)

```typescript
// stores/aiStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AIRequest, AIResponse, AIOperation } from '@/types/ai'

export const useAIStore = defineStore('ai', () => {
  // State
  const isProcessing = ref(false)
  const conversationHistory = ref<Array<{ role: 'user' | 'ai', content: string, timestamp: string }>>([])
  const suggestions = ref<string[]>([])
  const lastOperations = ref<AIOperation[]>([])
  const context = ref<any>({})
  
  // Actions
  async function sendPrompt(prompt: string, selectedNodeId?: string) {
    isProcessing.value = true
    
    try {
      const documentStore = useDocumentStore()
      const authStore = useAuthStore()
      
      // Check subscription tier
      const subscriptionStore = useSubscriptionStore()
      if (!subscriptionStore.isEnterprise) {
        throw new Error('AI features require Enterprise subscription')
      }
      
      // Check rate limit
      const canUseAI = await checkRateLimit(authStore.user.id)
      if (!canUseAI) {
        throw new Error('AI rate limit exceeded. Please try again later.')
      }
      
      // Prepare request
      const request: AIRequest = {
        prompt,
        mindmap: documentStore.currentMindmap,
        selectedNodeId,
        context: {
          recentActions: [], // TODO: Track recent actions
          conversationHistory: conversationHistory.value
        }
      }
      
      // Call n8n webhook
      const response = await fetch(import.meta.env.VITE_N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.user.id}` // For rate limiting
        },
        body: JSON.stringify(request)
      })
      
      if (!response.ok) {
        throw new Error(`AI request failed: ${response.statusText}`)
      }
      
      const aiResponse: AIResponse = await response.json()
      
      if (!aiResponse.success) {
        throw new Error(aiResponse.error || 'AI request failed')
      }
      
      // Apply operations
      await applyOperations(aiResponse.operations)
      
      // Update conversation history
      conversationHistory.value.push(
        { role: 'user', content: prompt, timestamp: new Date().toISOString() },
        { role: 'ai', content: aiResponse.explanation, timestamp: new Date().toISOString() }
      )
      
      // Update suggestions
      suggestions.value = aiResponse.suggestions || []
      
      // Store operations for undo
      lastOperations.value = aiResponse.operations
      
      // Track usage
      await trackAIUsage(authStore.user.id, 'prompt', prompt)
      
      return aiResponse
    } catch (error) {
      console.error('AI error:', error)
      throw error
    } finally {
      isProcessing.value = false
    }
  }
  
  async function applyOperations(operations: AIOperation[]) {
    const documentStore = useDocumentStore()
    const eventBus = useEventBus()

    for (const op of operations) {
      switch (op.type) {
        case 'create':
          documentStore.createNode({
            title: op.title,
            content: op.content,
            parentId: op.parentId,
            position: op.position,
            aiGenerated: true,
            aiPrompt: op.aiPrompt
          })
          break

        case 'update':
          documentStore.updateNode(op.nodeId, {
            title: op.title,
            content: op.content
          })
          break

        case 'delete':
          documentStore.deleteNode(op.nodeId)
          break

        case 'move':
          documentStore.moveNode(op.nodeId, op.newParentId, op.position)
          break

        case 'createEdge':
          documentStore.createEdge(op.source, op.target, op.edgeType)
          break

        case 'deleteEdge':
          documentStore.deleteEdge(op.edgeId)
          break
      }
    }

    // Emit event
    eventBus.emit('ai:operations-applied', { operations })
  }

  async function undoLastAI() {
    // TODO: Implement undo for AI operations
    // This requires storing the state before AI operations
  }

  async function checkRateLimit(userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('ai_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    return data.length < 1000 // 1000 requests per day for Enterprise
  }

  async function trackAIUsage(userId: string, operationType: string, prompt: string) {
    await supabase
      .from('ai_usage')
      .insert({
        user_id: userId,
        operation_type: operationType,
        tokens_used: 0, // TODO: Track actual tokens
        created_at: new Date().toISOString()
      })
  }

  return {
    isProcessing,
    conversationHistory,
    suggestions,
    lastOperations,
    context,
    sendPrompt,
    applyOperations,
    undoLastAI
  }
})
```

### AI Chat Component

```vue
<!-- components/AIChat.vue -->
<template>
  <q-card class="ai-chat">
    <q-card-section>
      <div class="text-h6">AI Assistant</div>
    </q-card-section>

    <q-separator />

    <q-card-section class="conversation-history" style="max-height: 400px; overflow-y: auto;">
      <div v-for="(message, index) in aiStore.conversationHistory" :key="index" class="message">
        <div :class="['message-bubble', message.role]">
          <div class="message-role">{{ message.role === 'user' ? 'You' : 'AI' }}</div>
          <div class="message-content">{{ message.content }}</div>
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
        </div>
      </div>

      <div v-if="aiStore.isProcessing" class="message">
        <div class="message-bubble ai">
          <q-spinner-dots size="20px" />
          <span class="q-ml-sm">Thinking...</span>
        </div>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section v-if="aiStore.suggestions.length > 0">
      <div class="text-caption text-grey-7">Suggestions:</div>
      <q-chip
        v-for="(suggestion, index) in aiStore.suggestions"
        :key="index"
        clickable
        @click="sendSuggestion(suggestion)"
      >
        {{ suggestion }}
      </q-chip>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <q-input
        v-model="prompt"
        outlined
        placeholder="Ask AI to help with your mindmap..."
        @keyup.enter="sendPrompt"
        :disable="aiStore.isProcessing"
      >
        <template v-slot:append>
          <q-btn
            flat
            round
            icon="send"
            @click="sendPrompt"
            :disable="!prompt || aiStore.isProcessing"
          />
        </template>
      </q-input>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAIStore } from '@/stores/aiStore'
import { useQuasar } from 'quasar'

const aiStore = useAIStore()
const $q = useQuasar()
const prompt = ref('')

async function sendPrompt() {
  if (!prompt.value) return

  try {
    await aiStore.sendPrompt(prompt.value)
    prompt.value = ''
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.message || 'AI request failed'
    })
  }
}

function sendSuggestion(suggestion: string) {
  prompt.value = suggestion
  sendPrompt()
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString()
}
</script>

<style scoped>
.ai-chat {
  width: 100%;
  max-width: 600px;
}

.conversation-history {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-bubble {
  padding: 12px;
  border-radius: 8px;
  max-width: 80%;
}

.message-bubble.user {
  background-color: #1976d2;
  color: white;
  align-self: flex-end;
  margin-left: auto;
}

.message-bubble.ai {
  background-color: #f5f5f5;
  color: black;
  align-self: flex-start;
}

.message-role {
  font-weight: bold;
  font-size: 12px;
  margin-bottom: 4px;
}

.message-content {
  font-size: 14px;
  line-height: 1.4;
}

.message-time {
  font-size: 11px;
  opacity: 0.7;
  margin-top: 4px;
}
</style>
```

## n8n Workflow Implementation

### Workflow Overview

The n8n workflow consists of 5 main nodes:

1. **Webhook Trigger** - Receives requests from frontend
2. **Parse Intent** - Extracts user intent and context
3. **Call LLM** - Sends prompt to OpenAI/Claude
4. **Format Operations** - Converts LLM response to structured operations
5. **Return Response** - Sends response back to frontend

### Node 1: Webhook Trigger

```json
{
  "name": "Webhook",
  "type": "n8n-nodes-base.webhook",
  "position": [250, 300],
  "parameters": {
    "path": "mindpad-ai",
    "responseMode": "responseNode",
    "options": {
      "allowedOrigins": "https://mindpad.app"
    }
  }
}
```

### Node 2: Parse Intent

```javascript
// JavaScript code node
const prompt = $input.item.json.body.prompt;
const mindmap = $input.item.json.body.mindmap;
const selectedNodeId = $input.item.json.body.selectedNodeId;
const context = $input.item.json.body.context;

// Extract intent
let intent = 'unknown';
if (prompt.toLowerCase().includes('create') || prompt.toLowerCase().includes('generate')) {
  intent = 'create';
} else if (prompt.toLowerCase().includes('expand') || prompt.toLowerCase().includes('add')) {
  intent = 'expand';
} else if (prompt.toLowerCase().includes('analyze') || prompt.toLowerCase().includes('improve')) {
  intent = 'analyze';
} else if (prompt.toLowerCase().includes('reorganize') || prompt.toLowerCase().includes('restructure')) {
  intent = 'reorganize';
}

// Get selected node context
let selectedNode = null;
if (selectedNodeId) {
  selectedNode = mindmap.nodes.find(n => n.id === selectedNodeId);
}

return {
  prompt,
  mindmap,
  selectedNode,
  intent,
  context
};
```

### Node 3: Call LLM (OpenAI)

```json
{
  "name": "OpenAI",
  "type": "n8n-nodes-base.openAi",
  "position": [650, 300],
  "parameters": {
    "operation": "message",
    "model": "gpt-4-turbo-preview",
    "messages": {
      "values": [
        {
          "role": "system",
          "content": "You are an AI assistant for MindPad, a mindmap application. Your job is to help users create, expand, analyze, and reorganize mindmaps. You must respond with structured JSON operations that the frontend can apply to the mindmap.\n\nAvailable operations:\n- create: Create a new node\n- update: Update an existing node\n- delete: Delete a node\n- move: Move a node to a new parent\n- createEdge: Create a connection between nodes\n- deleteEdge: Delete a connection\n\nResponse format:\n{\n  \"operations\": [\n    { \"type\": \"create\", \"title\": \"...\", \"content\": \"...\", \"parentId\": \"...\", \"position\": { \"x\": 0, \"y\": 0 } }\n  ],\n  \"explanation\": \"Human-readable explanation\",\n  \"suggestions\": [\"Optional suggestion 1\", \"Optional suggestion 2\"]\n}"
        },
        {
          "role": "user",
          "content": "={{$json.prompt}}\n\nCurrent mindmap:\n={{JSON.stringify($json.mindmap, null, 2)}}\n\nSelected node:\n={{JSON.stringify($json.selectedNode, null, 2)}}\n\nIntent: {{$json.intent}}"
        }
      ]
    },
    "options": {
      "temperature": 0.7,
      "maxTokens": 2000
    }
  }
}
```

### Node 4: Format Operations

```javascript
// JavaScript code node
const llmResponse = $input.item.json.message.content;

try {
  // Parse LLM response
  const parsed = JSON.parse(llmResponse);

  // Validate operations
  const operations = parsed.operations || [];
  const explanation = parsed.explanation || 'Operations completed';
  const suggestions = parsed.suggestions || [];

  // Add AI metadata to create operations
  const formattedOperations = operations.map(op => {
    if (op.type === 'create') {
      return {
        ...op,
        aiGenerated: true,
        aiPrompt: $json.prompt
      };
    }
    return op;
  });

  return {
    success: true,
    operations: formattedOperations,
    explanation,
    suggestions
  };
} catch (error) {
  return {
    success: false,
    operations: [],
    explanation: '',
    suggestions: [],
    error: `Failed to parse LLM response: ${error.message}`
  };
}
```

### Node 5: Return Response

```json
{
  "name": "Respond to Webhook",
  "type": "n8n-nodes-base.respondToWebhook",
  "position": [1050, 300],
  "parameters": {
    "respondWith": "json",
    "responseBody": "={{$json}}"
  }
}
```

## LLM System Prompt (Detailed)

```
You are an AI assistant for MindPad, a professional mindmap application. Your role is to help users create, expand, analyze, and reorganize their mindmaps through natural language commands.

## Your Capabilities

1. **Create mindmaps from scratch** - Generate complete mindmap structures from descriptions
2. **Expand nodes** - Add child nodes with relevant details
3. **Analyze structure** - Identify gaps, suggest improvements
4. **Reorganize** - Restructure mindmaps by priority, timeline, or category
5. **Enhance content** - Improve writing, add descriptions
6. **Extract insights** - Find action items, create summaries

## Response Format

You MUST respond with valid JSON in this exact format:

{
  "operations": [
    {
      "type": "create",
      "title": "Node Title",
      "content": "<p>HTML content from Tiptap</p>",
      "parentId": "parent-node-id or null for root",
      "position": { "x": 100, "y": 200 }
    },
    {
      "type": "update",
      "nodeId": "existing-node-id",
      "title": "New Title",
      "content": "<p>New content</p>"
    },
    {
      "type": "delete",
      "nodeId": "node-to-delete"
    },
    {
      "type": "move",
      "nodeId": "node-to-move",
      "newParentId": "new-parent-id",
      "position": { "x": 150, "y": 250 }
    },
    {
      "type": "createEdge",
      "source": "source-node-id",
      "target": "target-node-id",
      "edgeType": "hierarchy" or "reference"
    },
    {
      "type": "deleteEdge",
      "edgeId": "edge-id"
    }
  ],
  "explanation": "Human-readable explanation of what you did",
  "suggestions": [
    "Optional follow-up suggestion 1",
    "Optional follow-up suggestion 2"
  ]
}

## Guidelines

1. **Be concise** - Node titles should be 2-5 words, content 1-2 sentences
2. **Be relevant** - Only create nodes that directly relate to the user's request
3. **Be structured** - Maintain logical hierarchy
4. **Use HTML** - Content must be valid HTML (Tiptap format): <p>, <strong>, <em>, <ul>, <li>
5. **Calculate positions** - Space nodes appropriately (50-100px apart)
6. **Preserve context** - Don't delete or modify nodes unless explicitly asked
7. **Suggest next steps** - Provide 1-2 helpful suggestions for what to do next

## Examples

User: "Expand the 'Budget' node with typical wedding costs"
Response:
{
  "operations": [
    {
      "type": "create",
      "title": "Venue",
      "content": "<p>Ceremony and reception location</p>",
      "parentId": "budget-node-id",
      "position": { "x": 100, "y": 150 }
    },
    {
      "type": "create",
      "title": "Catering",
      "content": "<p>Food and beverages for guests</p>",
      "parentId": "budget-node-id",
      "position": { "x": 100, "y": 200 }
    },
    {
      "type": "create",
      "title": "Photography",
      "content": "<p>Professional photographer and videographer</p>",
      "parentId": "budget-node-id",
      "position": { "x": 100, "y": 250 }
    }
  ],
  "explanation": "I've added three major wedding cost categories: Venue, Catering, and Photography. These typically account for 60-70% of wedding budgets.",
  "suggestions": [
    "Would you like me to add estimated costs for each category?",
    "Should I add more detailed subcategories?"
  ]
}
```

## Rate Limiting

```typescript
// Supabase Edge Function: check-ai-rate-limit
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { userId } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get user's subscription tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single()

  if (profile.subscription_tier !== 'enterprise') {
    return new Response(
      JSON.stringify({ allowed: false, reason: 'AI features require Enterprise subscription' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Check usage in last 24 hours
  const { data: usage } = await supabase
    .from('ai_usage')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  const limit = 1000 // 1000 requests per day
  const remaining = limit - usage.length

  return new Response(
    JSON.stringify({
      allowed: remaining > 0,
      remaining,
      limit,
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

## Testing

### Test Cases

1. **Create from scratch**
   - Prompt: "Create a mindmap for planning a birthday party"
   - Expected: Root node + 4-6 main categories

2. **Expand node**
   - Prompt: "Expand the 'Food' node with menu options"
   - Expected: 3-5 child nodes with food categories

3. **Analyze**
   - Prompt: "Analyze this project plan and suggest improvements"
   - Expected: Update operations with improved content + suggestions

4. **Reorganize**
   - Prompt: "Reorganize by priority"
   - Expected: Move operations to restructure hierarchy

### Manual Testing

```bash
# Test n8n webhook directly
curl -X POST https://your-n8n-instance.com/webhook/mindpad-ai \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a mindmap for planning a wedding",
    "mindmap": { "version": "1.0", "metadata": {}, "nodes": [], "edges": [], "layout": {} },
    "selectedNodeId": null,
    "context": {}
  }'
```

## Summary

The AI integration uses:
- ✅ **n8n** for workflow orchestration
- ✅ **OpenAI/Claude** for LLM capabilities
- ✅ **Structured operations** for predictable results
- ✅ **Rate limiting** to prevent abuse
- ✅ **Conversation history** for context
- ✅ **Suggestions** for follow-up actions

This architecture ensures:
- 🔒 **Security** - Rate limiting, authentication
- 🎯 **Reliability** - Structured responses, error handling
- 🚀 **Scalability** - n8n can handle high load
- 🔧 **Maintainability** - Easy to update prompts and logic


