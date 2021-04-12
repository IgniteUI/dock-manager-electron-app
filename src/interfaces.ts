export interface IChildDockManagerWindow extends Window {
    isMain?: false;
    mainWindow?: IMainDockManagerWindow;
}

export interface IMainDockManagerWindow extends Window {
    isMain?: true;
    childWindows?: IChildDockManagerWindow[];
    dragStartWindow?: IChildDockManagerWindow;
}

export type IDockManagerWindow = IChildDockManagerWindow | IMainDockManagerWindow;