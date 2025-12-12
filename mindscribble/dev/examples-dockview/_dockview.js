import { createDockview } from './dockview.min.js';

if (!localStorage.getItem("dockview-theme")) {
    localStorage.setItem("dockview-theme", "dockview-theme-dark")
}
let theme = localStorage.getItem("dockview-theme")
let themeColor = theme.split("-")[2]
let openedPanels = []
let user_id = 1
let loggedIn = false
window.docs = []
let panelIds = []

class Panel {
    constructor() {
        this.element = document.createElement('div');
        // this.element.style.color = 'white';
        // this.element.style.paddingTop = '20px';
        // this.element.style.paddingLeft = '20px';
    }

    init(parameters) {
        this.element.innerHTML = '';
    }
}

window.dockview = createDockview(document.getElementById('dock-container'), {
    className: theme,
    createComponent: (options) => {
        switch (options.name) {
            case 'default':
                return new Panel();
        }
    },
})

window.addPanel = (panel_id, panel_title) => {
    if (!dockview.getPanel(panel_id)) {
        dockview.addPanel({
            id: panel_id,
            component: 'default',
            title: panel_title,
        });
        setButtons()
        setHTML(panel_id)
    }
}

window.addFloatingPanel = (panel_id, panel_title, floatingData) => {
    if (!dockview.getPanel(panel_id)) {
        const id = panel_id;
        dockview.addPanel({
            id,
            title: panel_title,
            component: 'default',
            floating: floatingData,
            params: {}, // Optional parameters for the component
        })
        setHTML(panel_id)
    }
}

window.switchCSS = (color) => {
    if (!document.querySelector('link[href*="css/' + color + '.css"]')) {
        var defaultStyle = document.querySelector('link[href*="css/dark.css"]')
        // console.log("old css file: ", defaultStyle)
        defaultStyle.parentNode.removeChild(defaultStyle);
        // add new style
        var head = document.getElementsByTagName('head')[0]
        var style = document.createElement('link')
        style.href = 'css/light.css'
        style.type = 'text/css'
        style.rel = 'stylesheet'
        head.append(style);
    }
}

window.switchTheme = (color) => {
    let newTheme
    color == "dark" ? newTheme = "dockview-theme-dark" : newTheme = "dockview-theme-light"
    dockview.updateOptions({ className: newTheme })
    localStorage.setItem('dockview-theme', newTheme)
    window.location.reload()
}


window.setActiveIcons = () => {
    let panels = dockview.panels
    let gridPanels = []
    for (let k = 0; k < panels.length; k++) {
        // only visible && grid type panels ++ exclude help
        if (panels[k].api.location.type == "grid" && panels[k].api.isVisible) {
            gridPanels.push(panels[k])
        }
    }

    for (let i = 0; i < gridPanels.length; i++) {
        let group = document.getElementsByClassName(gridPanels[i].id)[0].closest("div.dv-groupview")
        let max = group.querySelectorAll(".max")[0]
        let maximized = group.querySelector(".maximized")
        let float = group.querySelectorAll(".float")[0]
        // let addTab = group.querySelectorAll(".addTab")[0] //to trenutno ne koristim
        // ovo treba odvojiti
        let navbarIcons = group.querySelectorAll(".navbar-svg")
        if (gridPanels[i].api.isActive) {
            max.classList.add("active")
            float.classList.add("active")
            // addTab.classList.add("active") //to trenutno ne koristim
            // odvojiti
            for (let j = 0; j < navbarIcons.length; j++) {
                navbarIcons[j].classList.add("active")
            }
        }
        else {
            max.classList.remove("active")
            float.classList.remove("active")
            // addTab.classList.remove("active") //to trenutno ne koristim
            // odvojiti
            for (let j = 0; j < navbarIcons.length; j++) {
                navbarIcons[j].classList.remove("active")
            }
        }
    }
}

var delay = (function () {
    var timer = 0
    return function (callback, ms) {
        clearTimeout(timer)
        timer = setTimeout(callback, ms)
    }
})()

// PROBLEM JE DA SE OVAJ SCRIPT NE PRENOSI U POPOUT WINDOW, PA SE NE MOŽE KORISTITI
// A AKO PRENESEM dockview, ONDA ČE BITI BELAJA SA DOCKVIEWOM, BOJIM SE DA ĆE SE SVE POKVARITI
// kako god, ovo treba iči vani...
window.setAllHTML = () => {
    let panels = dockview.panels
    if (panels && panels.length > 0) {
        for (let i = 0; i < panels.length; i++) {
            let panel = panels[i]
            const reg = /\n\s+/g
            const template = document.getElementById(panels[i].id + '-navbar').cloneNode(true).textContent.replace(reg, "")
            panel.view._content.element.innerHTML = template
        }
    }
    delay(function () {
        (async () => {
            await loginAndGetId('milan.kosir@gmail.com', 'Dreambox1.')
            await getTemplates()
            await getTemplateElements()
            await subscribeToTemplates()
            runTabulator()
        })();
        // db.info().then(function (info) {
        //     if (info.instance_start_time) {
        //         loggedIn = true
        //         db.allDocs({ startkey: 't_' + user_id, endkey: 't_' + user_id + '\uffff', include_docs: true })
        //             .then((response) => {
        //                 response.rows.forEach((row) => {
        //                     docs.push(row.doc)
        //                 })
        //                 console.log("docs:", docs)
        //             })
        //     }
        //     else if (info.error) {
        //         console.log("error:", info.reason)
        //     }
        // })
    }, 100)
}

// OVO JE U STVARI NAJVEČA BREMZA... 
window.setHTML = (id) => {
    let panel = dockview.getPanel(id)
    if (panel) {
        const reg = /\n\s+/g
        const template = document.getElementById(id + '-navbar').cloneNode(true).textContent.replace(reg, "")
        panel.view._content.element.innerHTML = template
    }
    if (id = "templates") {
        (async () => {
            await loginAndGetId('milan.kosir@gmail.com', 'Dreambox1.')
            await getTemplates()
            await getTemplateElements()
            await subscribeToTemplates()
            runTabulator()
        })();
        // db.info().then(function (info) {
        //     if (info.instance_start_time) {
        //         loggedIn = true
        //         db.allDocs({ startkey: 't_' + user_id, endkey: 't_' + user_id + '\uffff', include_docs: true })
        //             .then((response) => {
        //                 response.rows.forEach((row) => {
        //                     docs.push(row.doc)
        //                 })
        //                 // console.log("docs:", docs)
        //             })
        //     }
        //     else if (info.error) {
        //         console.log("error:", info.reason)
        //     }
        // })
    }
}

// BUTTONS

function setMinIcon(panel) {
    let el = document.getElementById(panel).querySelector(".max")
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("class", "navbar-svg")
    svg.setAttribute("width", "24px")
    svg.setAttribute("height", "24px")
    svg.setAttribute("viewBox", "0 -960 960 960")
    svg.setAttribute("fill", "#ffffff")
    let path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttributeNS(null, "d", "M200-200v-240h80v160h160v80H200Zm480-320v-160H520v-80h240v240h-80Z")
    svg.appendChild(path)
    el.querySelector("svg").replaceWith(svg)
}

function setMaxIcon(panel) {
    let el = document.getElementById(panel).querySelector(".max")
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("class", "navbar-svg")
    svg.setAttribute("width", "24px")
    svg.setAttribute("height", "24px")
    svg.setAttribute("viewBox", "0 -960 960 960")
    svg.setAttribute("fill", "#ffffff")
    let path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttributeNS(null, "d", "M440-440v240h-80v-160H200v-80h240Zm160-320v160h160v80H520v-240h80Z")
    svg.appendChild(path)
    el.querySelector("svg").replaceWith(svg)
}

window.setButtons = () => {
    let panels = dockview.panels
    let gridPanels = []
    for (let i = 0; i < panels.length; i++) {
        if (panels[i].api.location.type == "grid") {
            gridPanels.push(panels[i])
        }
    }

    for (let g of gridPanels) {
        let group_id = dockview.getPanel(g.id)._group.id

        // POPOUT BUTTON
        let popoutButton = document.createElement('div')
        popoutButton.id = `right_controls_panel_${g.id}_1`
        popoutButton.style.cursor = 'pointer'
        // navbar-svg klasu treba zamijeniti, da se ne poklapa sa contentom...
        popoutButton.innerHTML = /*HTML*/`
            <div class="float"> 
                <div title="Popout View" class="action">
                    <button class="navbar-item viewType"><svg class="navbar-svg" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h560v-280h80v280q0 33-23.5 56.5T760-120H200Zm188-212-56-56 372-372H560v-80h280v280h-80v-144L388-332Z"/></svg></button>
                </div>
            </div>
            `
        popoutButton.addEventListener('click', () => {
            let panel_id = g.id
            let panel = dockview.getPanel(panel_id)
            // console.log(panel.id)
            table.destroy()
            console.log("popout...")
            clearFilters()
            dockview.activePanel.accessor.addPopoutGroup(
                panel,
                {
                    popoutUrl: "./pop_" + panel.id + ".html"
                }
            )
        })


        // FLOAT BUTTON
        let floatButton = document.createElement('div')
        floatButton.id = `right_controls_panel_${g.id}_2`
        floatButton.style.cursor = 'pointer'
        // navbar-svg klasu treba zamijeniti, da se ne poklapa sa contentom...
        floatButton.innerHTML = /*HTML*/`
            <div class="float"> 
                <div title="Float View" class="action">
                    <button class="navbar-item viewType"><svg class="navbar-svg" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="M640-160v-360H160v360h480Zm80-200v-80h80v-360H320v200h-80v-200q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v360q0 33-23.5 56.5T800-360h-80ZM160-80q-33 0-56.5-23.5T80-160v-360q0-33 23.5-56.5T160-600h480q33 0 56.5 23.5T720-520v360q0 33-23.5 56.5T640-80H160Zm400-603ZM400-340Z"/></svg></button>
                </div>
            </div>
            `
        floatButton.addEventListener('click', () => {
            let panel_id = g.id
            let panel = dockview.getPanel(panel_id)
            // notify the main process that a floating window is opened
            // ipcRenderer.send('open-float-window', [panel_id, panel.title, { position: { left: 100, top: 100 }, width: 500, height: 500 }])
            dockview.activePanel.accessor.addFloatingGroup(panel, {
                position: { left: 100, top: 100 },
                width: 500,
                height: 500,
                inDragMode: false,
            })
        })
        // MAX BUTTON
        let maxButton = document.createElement('div')
        maxButton.id = `right_controls_panel_${g.id}_3`
        maxButton.style.cursor = 'pointer'
        // navbar-svg klasu treba zamijeniti, da se ne poklapa sa contentom...
        maxButton.innerHTML = /*HTML*/`
            <div class="max"> 
                <div title="Maximize View" class="action">
                    <button class="navbar-item viewType"><svg class="navbar-svg" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="M200-200v-240h80v160h160v80H200Zm480-320v-160H520v-80h240v240h-80Z"/></svg></button>
                </div>
            </div>
            `
        maxButton.addEventListener('click', () => {
            let panel_id = g.id
            let panel = dockview.getPanel(panel_id)

            if (panel.api.isMaximized()) {
                panel.api.exitMaximized()
                setMinIcon(maxButton.id)
            } else {
                const max = async () => {
                    panel.api.maximize();
                }
                max().then(() => setMaxIcon(maxButton.id));
            }
        })

        /* ADD TAB BUTTON */ //to trenutno ne koristim
        let addTabButton = document.createElement('div')
        addTabButton.id = `left_controls_panel_${g.id}_1`
        addTabButton.style.cursor = 'pointer'
        // navbar-svg klasu treba zamijeniti, da se ne poklapa sa contentom...
        addTabButton.innerHTML = /*HTML*/`
            <div class="addTabDiv">
                <div title="Add Tab" class="action addTab">
                    <button class="addTab"><svg class="navbar-svg add-tab-svg" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg></button>
                </div>
            </div>
            `

        let groupControl = document.createElement('div')
        groupControl.id = "group-control"
        groupControl.classList.add("group-control")
        groupControl.appendChild(popoutButton)
        groupControl.appendChild(floatButton)
        groupControl.appendChild(maxButton)

        dockview.getGroup(group_id).part.tabsContainer.setLeftActionsElement(addTabButton) //to trenutno ne koristim
        dockview.getGroup(group_id).part.tabsContainer.setRightActionsElement(groupControl)
    }
}

window.setTableHeight = () => {
    // console.log(dockview.panels)
    // console.log(dockview.panels[0].api.height)
    for (let i = 0; i < dockview.panels.length; i++) {
        let table = document.getElementById("templates-table")
        if (table) {
            // console.log(table)
            if (dockview.panels[i].id == "templates") {
                let h = dockview.panels[i].api._height
                // console.log("h", h)
                // console.log("before", table.style.height)
                // table.style.height = "850.5px"
                table.style.height = dockview.panels[i].api.height - 75 + "px"
                // console.log("after", table.style.height)
                // table.syle.height = dockview.panels[i].api.height + "px"
            }
        }
    }
}

// Save the layout to localStorage
window.saveState = () => {
    console.log("save state...")
    setTableHeight()
    setButtons()
    setActiveIcons()
    // getPanels()
    const state = dockview.toJSON();
    localStorage.setItem('dockview-layout', JSON.stringify(state))

    // let popupWindows = []
    // if (state.popoutGroups !== undefined) {
    //     // console.log("popout groups:", state.popoutGroups)
    //     state.popoutGroups.forEach((group) => {
    //         let item = group.data.activeView
    //         // console.log("group:", group.data.activeView)
    //         if (popupWindows.indexOf(item) === -1) {
    //             popupWindows.push(item);
    //         }
    //     })
    // }
    // window.electronAPI.sendToMain('popout-windows', { target: 'main', message: popupWindows })

    // console.log("popup groups:", popupWindows)
    // // ovo je više manje bezveze, ali super da znam da mogu poslati podatke iz renderera u main
    // window.dispatchEvent(new CustomEvent("dockviewChange", { detail: openedPanels }))
}

function windowResize() {
    window.saveState()
}

var doit
window.onresize = function () {
    clearTimeout(doit)
    doit = setTimeout(windowResize, 100)
}

const print = (e) => {
    console.log(e)
}

dockview.onDidRemovePanel(print)

// Listen for layout changes and save to localStorage
dockview.onDidLayoutChange(window.saveState);
window.change = () => {
    console.log("window change event")    
    dockview.onDidLayoutChange()
}

// Debug: Clear localStorage
window.clearLocalstorage = () => {
    localStorage.removeItem('dockview-layout');
}

// Load the layout from localStorage when initializing
const savedState = localStorage.getItem('dockview-layout');
if (savedState) {
    dockview.fromJSON(JSON.parse(savedState));
    setAllHTML()
}

switchCSS(themeColor)

// getPanels = () => {
//     let panelIds = []
//     if (dockview.panels.length > 0) {
//         for (let i = 0; i < dockview.panels.length; i++) {
//             panelIds.push(dockview.panels[i].id)
//         }
//     }
//     openedPanels = panelIds
//     return panelIds
// }

// setAPPPath = (value) => {
//     path = value
//     console.log("path:", path)
// }
// function setAPPPath(value){
//     path = value
// }
