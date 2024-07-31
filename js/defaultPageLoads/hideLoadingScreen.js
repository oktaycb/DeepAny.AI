import { loadScrollingAndMain } from './loadScrollingAndMain.js';

export function hideLoadingScreen(loadingScreen, navbar, mains, sidebar) {
	if (loadingScreen) {
		loadingScreen.remove();
	}

	loadScrollingAndMain(navbar, mains, sidebar);
}
