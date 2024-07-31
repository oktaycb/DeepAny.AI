let currentMain = 0;
let windowHeight = window.innerHeight;
let windowWidth = window.innerWidth;
let aspectRatio = windowHeight / windowWidth;
let sidebarActive = true;
let navbarActive = true;
let actualNavbarHeight = 0;
let actualSidebarWidth = 0;
let navbarHeight = 0;

export function setCurrentMain(value) {
    currentMain = value;
}

export function getCurrentMain() {
    return currentMain;
}

export function setWindowHeight(value) {
	windowHeight = value;
}

export function getWindowHeight() {
    return windowHeight;
}

export function setWindowWidth(value) {
	windowWidth = value;
}

export function getWindowWidth() {
    return windowWidth;
}

export function setAspectRatio(value) {
    aspectRatio = value;
}

export function getAspectRatio() {
    return aspectRatio;
}

export function setSidebarActive(value) {
    sidebarActive = value;
}

export function getSidebarActive() {
    return sidebarActive;
}

export function setNavbarActive(value) {
    navbarActive = value;
}

export function getNavbarActive() {
    return navbarActive;
}

export function setActualNavbarHeight(value) {
    actualNavbarHeight = value;
}

export function getActualNavbarHeight() {
    return actualNavbarHeight;
}

export function setActualSidebarWidth(value) {
    actualSidebarWidth = value;
}

export function getActualSidebarWidth() {
    return actualSidebarWidth;
}

export function setNavbarHeight(value) {
    navbarHeight = value;
}

export function getNavbarHeight() {
    return navbarHeight;
}

export function setSidebar(sidebar) {
	setActualSidebarWidth(sidebar ? sidebar.offsetWidth : 0);

	if (getSidebarActive()) {
		sidebar.style.left = '0';
		return;
	}

	if (sidebar) {
		sidebar.style.left = -getActualSidebarWidth() + "px";
	}
}

export function setNavbar(navbar, mains, sidebar) {
	setActualNavbarHeight(navbar ? navbar.offsetHeight : 0);
	setNavbarHeight(getActualNavbarHeight() && getNavbarActive() ? getActualNavbarHeight() : 0);

	if (mains && mains.length > 0) {
		mains.forEach((main, i) => {
			const offset = (i - currentMain) * getWindowHeight();
			main.style.top = `${offset + getNavbarHeight()}px`;
			main.style.height = `${getWindowHeight() - getNavbarHeight()}px`;
			main.style.width = `${getWindowWidth()}px`;
		});
	}

	if (getNavbarActive()) {
		navbar.style.top = '0';

		if (sidebar) {
			sidebar.style.top = `${getNavbarHeight()}px`;
			sidebar.style.height = `${getWindowHeight() - getNavbarHeight()}px`;
		}
	}
	else {
		if (navbar) {
			navbar.style.top = -getActualNavbarHeight() + "px";
		}

		if (sidebar) {
			sidebar.style.top = 0;
			sidebar.style.height = '100vh';
		}
	}
}

export function showSidebar(sidebar) {
	setSidebarActive(sidebar);
	setSidebar(sidebar);
}

export function showNavbar(navbar, mains, sidebar) {
	setNavbarActive(navbar);
	setNavbar(navbar, mains, sidebar);
}

export function removeSidebar(sidebar) {
	setSidebarActive(false);
	setSidebar(sidebar);
}

export function removeNavbar(navbar, mains, sidebar) {
	setNavbarActive(false);
	setNavbar(navbar, mains, sidebar);
}
