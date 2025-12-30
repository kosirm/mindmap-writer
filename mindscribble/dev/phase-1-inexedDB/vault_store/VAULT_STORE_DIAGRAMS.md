
```mermaid
sequenceDiagram
    participant User
    participant VTB as VaultToolbar.vue
    participant VS as VaultStore
    participant FS as fileSystemService
    participant IDB as IndexedDB
    participant EB as EventBus
    participant VT as VaultTree.vue
    participant VTI as VaultTreeItem.vue
    
    User->>VTB: Click "New File"
    activate VTB
    VTB->>VS: createNewFile(name, parentId)
    activate VS
    
    VS->>FS: createFile(vaultId, name, parentId)
    activate FS
    FS->>IDB: INSERT file record
    activate IDB
    IDB-->>FS: Success
    deactivate IDB
    FS-->>VS: Created file data
    deactivate FS
    
    Note over VS: Update state reactively
    VS->>VS: vaultStructure.push(newFile)
    
    VS->>EB: emit('file:created', payload)
    activate EB
    
    VS-->>VTB: Return created file
    deactivate VS
    deactivate VTB
    
    Note over VT,VTI: Reactive updates happen automatically
    
    EB-->>VT: Notify file:created
    activate VT
    Note over VT: Component re-renders<br/>with updated store state
    deactivate VT
    
    EB-->>VTI: Notify file:created
    activate VTI
    Note over VTI: Component re-renders<br/>with updated store state
    deactivate VTI
    
    deactivate EB
    
    Note over User,VTI: Total: 1 DB query, automatic UI update
    ```

    ```mermaid
    graph LR
    subgraph "Current Approach - Multiple State Copies"
        direction TB
        C1[VaultTree.vue]
        C2[VaultTreeItem.vue]
        C3[VaultToolbar.vue]
        
        subgraph "Composable Instance 1"
            UV1[useVault]
            UF1[useFileSystem]
            State1[State Copy 1]
        end
        
        subgraph "Composable Instance 2"
            UV2[useVault]
            UF2[useFileSystem]
            State2[State Copy 2]
        end
        
        subgraph "Composable Instance 3"
            UV3[useVault]
            UF3[useFileSystem]
            State3[State Copy 3]
        end
        
        C1 --> UV1
        C1 --> UF1
        UV1 --> State1
        UF1 --> State1
        
        C2 --> UV2
        C2 --> UF2
        UV2 --> State2
        UF2 --> State2
        
        C3 --> UV3
        C3 --> UF3
        UV3 --> State3
        UF3 --> State3
        
        CE[Custom Event Emitter]
        State1 -.sync.-> CE
        State2 -.sync.-> CE
        State3 -.sync.-> CE
        
        IDB1[(IndexedDB)]
        State1 --> IDB1
        State2 --> IDB1
        State3 --> IDB1
    end
    
    subgraph "New Approach - Single Shared State"
        direction TB
        N1[VaultTree.vue]
        N2[VaultTreeItem.vue]
        N3[VaultToolbar.vue]
        
        VS[VaultStore<br/>Pinia Singleton]
        
        SharedState[Shared State<br/>Single Source of Truth]
        
        N1 --> VS
        N2 --> VS
        N3 --> VS
        
        VS --> SharedState
        
        EB[EventBus<br/>Type-Safe]
        VS --> EB
        EB -.notify.-> N1
        EB -.notify.-> N2
        EB -.notify.-> N3
        
        IDB2[(IndexedDB)]
        SharedState --> IDB2
    end
    
    style State1 fill:#ffcccc,stroke:#cc0000,color:#333
    style State2 fill:#ffcccc,stroke:#cc0000,color:#333
    style State3 fill:#ffcccc,stroke:#cc0000,color:#333
    style CE fill:#ffcccc,stroke:#cc0000,color:#333
    
    style VS fill:#4a90e2,stroke:#2e5c8a,color:#fff
    style SharedState fill:#ccffcc,stroke:#00cc00,color:#333
    style EB fill:#50c878,stroke:#2d7a4a,color:#fff
    ```


    ```mermaid
    graph TD
    Index[VAULT_STORE_INDEX.md<br/>Master Index<br/>5 min read]
    
    Readme[VAULT_STORE_README.md<br/>Overview & Navigation<br/>10 min read]
    
    Impl[VAULT_STORE_IMPLEMENTATION.md<br/>Complete Implementation Guide<br/>30-45 min read]
    
    Quick[VAULT_STORE_QUICK_REFERENCE.md<br/>Daily Reference<br/>10-15 min read]
    
    Arch[VAULT_STORE_ARCHITECTURE_DIAGRAMS.md<br/>Visual Guide<br/>15-20 min read]
    
    Index -->|Start Here| Readme
    Index -->|Navigate to| Impl
    Index -->|Navigate to| Quick
    Index -->|Navigate to| Arch
    
    Readme -->|For Implementation| Impl
    Readme -->|For Daily Use| Quick
    Readme -->|For Visuals| Arch
    
    Impl -->|Reference| Quick
    Impl -->|Visualize| Arch
    
    subgraph "For Implementers"
        Impl
        Arch
    end
    
    subgraph "For Daily Use"
        Quick
    end
    
    subgraph "For Overview"
        Readme
        Index
    end
    
    style Index fill:#ffd700,stroke:#b8860b,color:#333
    style Readme fill:#4a90e2,stroke:#2e5c8a,color:#fff
    style Impl fill:#e74c3c,stroke:#c0392b,color:#fff
    style Quick fill:#50c878,stroke:#2d7a4a,color:#fff
    style Arch fill:#9b59b6,stroke:#6c3483,color:#fff
    ```
