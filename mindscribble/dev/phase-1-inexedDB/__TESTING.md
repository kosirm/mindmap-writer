We just finished with this implementation: mindscribble\dev\phase-1-inexedDB\IMPLEMENTATION_PLAN.md
All work which was done is documented here: mindscribble\dev\phase-1-inexedDB\__DONE.md

Now I would like to make some manual testing before we start making test cases.
For this we would need first to create file management component - it should be placed in left drawer - File Management tab.
As for now we have there File Operations and Recent Files sections. In file operations we have these operations:
New File
Open File
Save
Save As
Manage Files

All these operations are working directly with the files on google drive.
From now on we should operate exclusevly with files/folders in indexedDB.
Currently I cannot see that indexedDB is even created in chrome dev tools - application...

For file management of the files in indexedDB I would copletly renew this file management drawer tab.
I would use almost exactly the same component as we are using in outline for nodes (we can copy/paste this compnent and just make changes to it or we can make a new component - as you wish) - with these differences:
instead of nodes we represent folder and files - so we need two icons (file and folder) for each item.
Files cannot have child elements, only folders can have child elements (folders of files).
Instead of button add node (top-left), we need two buttons - add file and add folder.
Drag/drop should also be upgraded, because we cannot drop one file as a child node to another file, only folder can have child nodes.
Root node is vault (repository) and there can be only one root node. We will be working with one vault at a time - so if we have one vault in indexedDB, there should be also only one vault in file management.
What if user wants to move some files/folders from one repository to another repository?
For this we will add (later) export/import functionality.