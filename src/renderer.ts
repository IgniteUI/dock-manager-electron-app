import { defineCustomElements } from 'igniteui-dockmanager/loader';
import { IgcContentPane, IgcDockManagerComponent, IgcDockManagerPaneType, IgcPaneHeaderConnectionEventArgs, IgcSplitPaneOrientation } from 'igniteui-dockmanager';
import './index.css';
import { IChildDockManagerWindow, IDockManagerWindow, IMainDockManagerWindow } from './interfaces';

defineCustomElements();

const currentWindow = window as IDockManagerWindow;

/**
 * When pane header is connected we disable the built-in dragging and attach the custom drag handlers
 */
const paneHeaderConnected = (event: CustomEvent<IgcPaneHeaderConnectionEventArgs>) => {
    const element = event.detail.element;
    element.dragService.destroy();
    element.dragService = null;
    element.draggable = true;
    element.ondragstart = ev => {
        paneHeaderDragStart(event.detail.pane, ev);
    };
    element.ondragend = ev => {
        paneHeaderDragEnd(ev);
    };
}

const paneHeaderDisconnected = (event: CustomEvent<IgcPaneHeaderConnectionEventArgs>) => {
    const element = event.detail.element;
    element.ondragstart = null;
    element.ondragend = null;
}

const paneHeaderDragStart = async (pane: IgcContentPane, event: DragEvent) => {
    event.dataTransfer.dropEffect = 'move';
    dockManager.draggedPane = pane;
    
    const mainWindow = getMainWindow();
    mainWindow.dragStartWindow = window;

    executeForAllWindows(paneDragStart, pane);
}

const paneDragStart = (window: Window, pane: IgcContentPane) => {
    const dockManager = window.document.getElementById('dockManager') as IgcDockManagerComponent;
    if (!dockManager.draggedPane) {
        dockManager.draggedPane = pane;
    }

    disableContentPointerEvents(dockManager);
}

const paneHeaderDragEnd = async (event: DragEvent) => {
    event.preventDefault();

    const mainWindow = getMainWindow();
    mainWindow.dragStartWindow = null;
    
    // dropped outside of the browser
    if (event.dataTransfer.dropEffect === 'none') {
        await droppedOutOfWindow(event);
    }

    executeForAllWindows(paneDragEnd)
}

const paneDragEnd = (window: Window) => {
    const dockManager = window.document.getElementById('dockManager') as IgcDockManagerComponent;

    if (!dockManager) {
        return;
    }
    
    if (dockManager.draggedPane) {
        dockManager.dropPosition = null;
        dockManager.dropPane();
    }
    
    enableContentPointerEvents(dockManager);

    // close the window if no panes were left
    if (!currentWindow.isMain && (!dockManager.layout.rootPane.panes || !dockManager.layout.rootPane.panes.length)) {
        currentWindow.close();
    }
}

const handleDocumentDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    dockManager.dropPosition = {
      x: event.clientX,
      y: event.clientY
    };
}

const handleDocumentDrop = async (event: DragEvent) => {
    const contentId = (dockManager.draggedPane as IgcContentPane).contentId;

    const docked = await dockManager.dropPane();

    if (docked) {
        const contentElement = dockManager.querySelector('[slot=' + contentId + ']');
        
        // if the content element is missing from the current dock manager it means it comes from another window
        if (!contentElement) {
            await droppedInAnotherWindow();
        }
    }
}

/**
 * Handles creating a new window and transferring the content element when the pane was dropped out of any browser window
 * @param event 
 * @returns 
 */
const droppedOutOfWindow = async (event: DragEvent) => {
    const draggedPane = dockManager.draggedPane as IgcContentPane;

    // if there is a single pane in the window just move the window
    if (dockManager.layout.rootPane.panes.length === 1 && dockManager.layout.rootPane.panes[0] === draggedPane) {
        window.moveTo(event.screenX, event.screenY);
        return;
    }
    
    await dockManager.removePane(draggedPane);
    dockManager.layout = { ...dockManager.layout };

    draggedPane.isPinned = true;
    
    const contentElement = dockManager.querySelector('[slot=' + draggedPane.contentId + ']');
    const rect = contentElement.getBoundingClientRect();

    openChildWindow(event.screenX, event.screenY, rect.width, rect.height, (childWindow: Window) => {
        const newDocument = childWindow.document;
        const newDockManager = newDocument.getElementById('dockManager') as IgcDockManagerComponent;
        newDockManager.layout = {
            rootPane: {
                type: IgcDockManagerPaneType.splitPane,
                orientation: IgcSplitPaneOrientation.horizontal,
                panes: [
                    draggedPane
                ]
            }
        };
        const adoptedNode = newDocument.adoptNode(contentElement);
        newDockManager.appendChild(adoptedNode);
    });
}

const droppedInAnotherWindow = async () => {
    const mainWindow = getMainWindow();
    const sourceDocument = mainWindow.dragStartWindow.document;
    const sourceDockManager = sourceDocument.getElementById('dockManager') as IgcDockManagerComponent;

    // remove the pane from the source dock manager
    await sourceDockManager.removePane(sourceDockManager.draggedPane);
    sourceDockManager.layout = { ...sourceDockManager.layout };

    // adopt the content element from the source document into the current one
    const contentElement = sourceDockManager.querySelector('[slot=' + (sourceDockManager.draggedPane as IgcContentPane).contentId + ']');
    const adoptedNode = document.adoptNode(contentElement);
    dockManager.appendChild(adoptedNode);
}

const enableContentPointerEvents = (dockManager: IgcDockManagerComponent) => {
    for (const child of Array.from(dockManager.children)) {
        (child as HTMLElement).style.pointerEvents = 'all';
    }
}

/**
 * Disable the pointer events of the content since the iframes does not bubble the mouse events (used for resizing) to the parent document
 */
const disableContentPointerEvents = (dockManager: IgcDockManagerComponent) => {
    for (const child of Array.from(dockManager.children)) {
        (child as HTMLElement).style.pointerEvents = 'none';
    }
}

/**
 * Generates the initial content of the panes
 */
const generateContent = (slot: string, url: string): HTMLElement => {
    const div1 = document.createElement('DIV');
    div1.classList.add("content-div");
    div1.slot = slot;

    const iframe1 = document.createElement('IFRAME') as HTMLIFrameElement;
    iframe1.src = url;

    div1.appendChild(iframe1);

    return div1;
}

const getMainWindow = (): IMainDockManagerWindow => {
    return currentWindow.isMain !== false ? currentWindow : currentWindow.mainWindow;
}

const openChildWindow = (x: number, y: number, width: number, height: number, onOpen: (childWindow: Window) => void) => {
    const mainWindow = getMainWindow();

    const childWindow = mainWindow.open(
        document.location.href,
        '_blank',
        `top=${y},left=${x},width=${width},height=${height}`) as IChildDockManagerWindow;


    childWindow.isMain = false;
    childWindow.mainWindow = mainWindow;
    mainWindow.childWindows.push(childWindow);

    childWindow.onload = () => {
        onOpen(childWindow);

        // for some reason onunload is fired before onload, that's why we attach it in the onload handler
        childWindow.onunload = () => {
            childWindow.mainWindow = null;
            const index = mainWindow.childWindows.indexOf(childWindow);
            mainWindow.childWindows.splice(index, 1);
        };
    }
}

const executeForAllWindows = (callback: (window: Window, param?: any) => void, param?: any) => {
    const mainWindow = getMainWindow();
    callback(mainWindow, param);
    
    for (const win of mainWindow.childWindows) {
        callback(win, param);
    }
}

const dockManager = document.getElementById('dockManager') as IgcDockManagerComponent;

dockManager.addEventListener('paneHeaderConnected', paneHeaderConnected);
dockManager.addEventListener('paneHeaderDisconnected', paneHeaderDisconnected);
dockManager.addEventListener('tabHeaderConnected', paneHeaderConnected);
dockManager.addEventListener('tabHeaderDisconnected', paneHeaderDisconnected);
dockManager.addEventListener('splitterResizeStart', () => disableContentPointerEvents(dockManager));
dockManager.addEventListener('splitterResizeEnd', () => enableContentPointerEvents(dockManager));

document.addEventListener('dragover', handleDocumentDragOver);
document.addEventListener('drop', handleDocumentDrop);

if (currentWindow.isMain !== false) {
    currentWindow.isMain = true;
    currentWindow.childWindows = [];

    // execute this only for the main window
    const content1 = generateContent('content1', 'https://www.infragistics.com/angular-demos-grid-crm/grid-crm');
    const content2 = generateContent('content2', 'https://www.infragistics.com/angular-demos-dv/charts/data-chart-bar-chart-multiple-sources');
    const content3 = generateContent('content3', 'https://www.infragistics.com/angular-demos-dv/charts/doughnut-chart-legend');
    
    dockManager.appendChild(content1);
    dockManager.appendChild(content2);
    dockManager.appendChild(content3);
    
    dockManager.layout = {
        rootPane: {
            type: IgcDockManagerPaneType.splitPane,
            orientation: IgcSplitPaneOrientation.vertical,
            panes: [
                {
                    type: IgcDockManagerPaneType.contentPane,
                    contentId: 'content1',
                    header: 'Grid'
                },
                {
                    type: IgcDockManagerPaneType.splitPane,
                    orientation: IgcSplitPaneOrientation.horizontal,
                    panes: [
                        {
                            type: IgcDockManagerPaneType.contentPane,
                            contentId: 'content2',
                            header: 'Bar Chart'
                        },
                        {
                            type: IgcDockManagerPaneType.contentPane,
                            contentId: 'content3',
                            header: 'Donut Chart'
                        }
                    ]
                }
            ]
        }
    };
}

