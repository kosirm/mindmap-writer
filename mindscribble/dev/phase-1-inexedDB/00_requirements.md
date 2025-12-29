App is in active development mode, it is not alive and has no users (except the main developer) so for implementation we don't need any complicated migrations. We do all development in dedicated branch and then merge to main when it is ready for release.

For indexedDB, we need to store the following data:

1. Vault
2. Folders
3. Files
4. Nodes
5. Edges
5. Inter-Map Links
6. Vault Settings
7. User Settings


Plan: make indexedDB first, test locally, then switch file saving from "direct opening/saving from/to google drive" (what we have now) to indexedDB sync.

We are using bun, not npm for package management.