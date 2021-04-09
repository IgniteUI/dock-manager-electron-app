/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */
import { defineCustomElements } from 'igniteui-dockmanager/loader';
import { IgcDockManagerComponent, IgcDockManagerPaneType, IgcSplitPaneOrientation } from 'igniteui-dockmanager';
import './index.css';

defineCustomElements();

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

const dockManager = document.getElementById('dockManager') as IgcDockManagerComponent;
const content1 = generateContent('content1', 'https://www.infragistics.com/angular-demos-lob/grid/grid');
const content2 = generateContent('content2', 'https://www.infragistics.com/angular-demos-dv/charts/category-chart-overview');
const content3 = generateContent('content3', 'https://www.infragistics.com/angular-demos-dv/charts/pie-chart-overview');

dockManager.appendChild(content1);
dockManager.appendChild(content2);
dockManager.appendChild(content3);

dockManager.layout = {
    rootPane: {
        type: IgcDockManagerPaneType.splitPane,
        orientation: IgcSplitPaneOrientation.horizontal,
        panes: [
            {
                type: IgcDockManagerPaneType.contentPane,
                contentId: 'content1',
                header: 'Grid'
            },
            {
                type: IgcDockManagerPaneType.splitPane,
                orientation: IgcSplitPaneOrientation.vertical,
                panes: [
                    {
                        type: IgcDockManagerPaneType.contentPane,
                        contentId: 'content2',
                        header: 'Chart'
                    },
                    {
                        type: IgcDockManagerPaneType.contentPane,
                        contentId: 'content3',
                        header: 'Pie Chart'
                    }
                ]
            }
        ]
    }
};