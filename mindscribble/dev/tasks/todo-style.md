- dockview scrollbars - get in line with app (quasar scrollbars)

- highlight (outline, vault tree) now needs to be a bit more colored, since we have no more border
- global variable for highlight color (theme)
- use it in outline view and vault tree
- maybe also in other views (mindmap, concept map)
____________________________________________________________
-Problem with dark background when all files are closed:
 the problem is coming from this (in css - chrome inspector):

for element div class="dv-grid-view dv-dockview" we have computed style background color rgb(0,12,24)
If I click details I can see where this style is comming from (css):

.dv-dockview{
    background-color: var(--dv-group-view-background-color)
}

But I don't know whow to override this style.
_____________________________________________________________