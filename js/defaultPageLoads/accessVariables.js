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

export function setAspectRatio() {
    if (windowHeight != window.innerHeight || windowWidth != window.innerWidth || aspectRatio != window.innerWidth / window.innerHeight) {
        setWindowHeight(window.innerHeight);
        setWindowWidth(window.innerWidth);
        aspectRatio = getWindowWidth() / getWindowHeight();
    }
}

export function getAspectRatio() {
    setAspectRatio();
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

export function moveMains(mains, currentMain) {
    if (mains && mains.length > 0) {
        mains.forEach((main, i) => {
            const offset = (i - currentMain) * getWindowHeight();
            main.style.top = `${offset + getNavbarHeight()}px`;
            main.style.height = `${getWindowHeight() - getNavbarHeight()}px`;
            main.style.width = `${getWindowWidth()}px`;
        });
    }
}

export function reconstructMainStyles() {
    let mains = document.querySelectorAll('main');
    if (mains && mains.length > 0) {
        mains.forEach((main, i) => {
			main.style.display = 'flex';
            main.style.top = `${i * getWindowHeight() + getNavbarHeight()}px`;
			main.style.height = `${getWindowHeight() - getNavbarHeight()}px`;
			main.style.width = `${getWindowWidth()}px`;
		});
    }
}

export function setNavbar(navbar, mains, sidebar) {
    setActualNavbarHeight(navbar ? navbar.offsetHeight : 0);
    setNavbarHeight(getActualNavbarHeight() && getNavbarActive() ? getActualNavbarHeight() : 0);
    moveMains(mains, currentMain);

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

export function cleanPages() {
    let mains = document.querySelectorAll('main');
    mains.forEach(main => main.remove());
}

export function createPages(contents) {
    const numberOfPages = contents.length;
    if (numberOfPages <= 0) return;

    for (let index = 0; index < numberOfPages; index++) {
        const mainElement = document.createElement('main');
        const mainContainer = document.createElement('div');
        mainContainer.classList.add('main-container');

        const fadedContent = document.createElement('div');
        fadedContent.classList.add('faded-content');

        const firstText = document.createElement('div');
        firstText.classList.add('first-text');

        const h1Element = document.createElement('h1');
        h1Element.innerHTML = 'DeepAny.<span class="text-gradient">AI</span>';

        const h2Element = document.createElement('h2');
        h2Element.classList.add('text-gradient');
        h2Element.textContent = 'bring your imagination come to life.';

        const offsetText = document.createElement('div');
        offsetText.classList.add('offset-text');

        for (let j = 0; j < 3; j++) {
            const offsetH1 = document.createElement('h1');
            offsetH1.classList.add('offset');
            offsetH1.innerHTML = 'deepany.a<span class="no-spacing">i</span>';
            offsetText.appendChild(offsetH1);
        }

        firstText.appendChild(h1Element);
        firstText.appendChild(h2Element);
        firstText.appendChild(offsetText);
        fadedContent.appendChild(firstText);

        mainElement.appendChild(fadedContent);
        mainElement.appendChild(mainContainer);

        document.body.appendChild(mainElement);
    }
}

export function updateContent(contents) {
    const mainContainers = document.querySelectorAll('.main-container');
    mainContainers.forEach((mainContainer, index) => {
        if (contents[index]) {
            mainContainer.innerHTML = '';
            mainContainer.insertAdjacentHTML('beforeend', contents[index]);
        }
    });
}