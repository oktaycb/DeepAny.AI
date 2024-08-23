let currentMain = 0;
let windowHeight = window.innerHeight;
let windowWidth = window.innerWidth;
let aspectRatio = windowHeight / windowWidth;
let sidebarActive = true;
let navbarActive = true;
let actualNavbarHeight = 0;
let actualSidebarWidth = 0;
let navbarHeight = 0;

//console.log("[LOADING] accesVariables.js");

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

let sidebarLoaded = false;

export function showSidebar(sidebar, hamburgerMenu) {
    setSidebarActive(sidebar);
    setSidebar(sidebar);

    if (hamburgerMenu)
        hamburgerMenu.classList.add('open');

    localStorage.removeItem('sidebarState');

    if (!sidebarLoaded) {
        const loadSideBar = `
				<div style="flex: 1; justify-content: space-between;">
					<div>
						<button id="exploreButton">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M12 0C5.38318 0 0 5.38318 0 12C0 18.6168 5.38318 24 12 24C18.6164 24 23.9992 18.6168 23.9992 12C23.9992 5.38318 18.6164 0 12 0ZM17.9313 6.83591L14.1309 13.8977C14.0788 13.9945 13.9995 14.0742 13.9023 14.1264L6.84094 17.9263C6.75694 17.9714 6.66559 17.9932 6.57463 17.9932C6.42889 17.9932 6.28489 17.9369 6.1767 17.8285C6.00097 17.653 5.96129 17.3828 6.07896 17.1641L9.87858 10.1029C9.93084 10.0059 10.0104 9.9262 10.1074 9.87413L17.1695 6.07413C17.3882 5.95626 17.658 5.99613 17.8339 6.17167C18.0093 6.34741 18.0494 6.61721 17.9313 6.83591Z" fill="white"/>
							<path d="M12.0136 10.6924C11.2898 10.6924 10.7031 11.2784 10.7031 12.0023C10.7031 12.7259 11.2899 13.3129 12.0136 13.3129C12.7367 13.3129 13.3235 12.7259 13.3235 12.0023C13.3235 11.2784 12.7367 10.6924 12.0136 10.6924Z" fill="white"/>
							</svg>
							Explore
						</button>
						<button id="profileButton">
							<svg width="24" height="24" viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path fill-rule="evenodd" clip-rule="evenodd" d="M6.95279 0.554203C7.03413 0.600771 7.09797 0.674016 7.13412 0.762255C7.17027 0.850494 7.17664 0.948642 7.15223 1.04104L6.04556 5.21405H10.0834C10.1646 5.21405 10.244 5.23846 10.3119 5.28427C10.3798 5.33008 10.4332 5.3953 10.4655 5.47191C10.4979 5.54851 10.5077 5.63317 10.4939 5.71547C10.4801 5.79778 10.4432 5.87414 10.3878 5.93516L4.55444 12.3635C4.4909 12.4337 4.40632 12.4799 4.31423 12.4948C4.22214 12.5097 4.12785 12.4924 4.04645 12.4457C3.96504 12.3989 3.90123 12.3255 3.86521 12.237C3.82919 12.1486 3.82305 12.0503 3.84777 11.9578L4.95444 7.78539H0.916643C0.835442 7.78538 0.756011 7.76097 0.688116 7.71516C0.620221 7.66935 0.56682 7.60413 0.534478 7.52752C0.502135 7.45092 0.492261 7.36626 0.506068 7.28396C0.519876 7.20166 0.556763 7.1253 0.612197 7.06427L6.44556 0.635914C6.5091 0.566 6.59356 0.519971 6.68548 0.505163C6.77741 0.490354 6.87151 0.507618 6.95279 0.554203Z" fill="#FFBEC9"/>
							</svg>
							Profile
						</button>
						<button id="premiumButton" class="important">
							<svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path id="Vector" d="M15.8533 5.76333L12.1773 2.08733C12.0843 1.99433 11.9588 1.94183 11.8278 1.94083L4.23825 1.88283C4.10425 1.88183 3.97575 1.93433 3.88075 2.02933L0.14625 5.76383C-0.04875 5.95933 -0.04875 6.27533 0.14625 6.47083L7.64625 13.9708C7.84175 14.1663 8.15825 14.1663 8.35325 13.9708L15.8533 6.47083C16.0488 6.27533 16.0488 5.95883 15.8533 5.76333ZM12.9533 6.47433L9.37725 10.0858C9.18275 10.2823 8.86625 10.2838 8.66975 10.0893C8.47325 9.89483 8.47175 9.57833 8.66625 9.38183L11.9038 6.11333L10.8098 4.94733C10.6183 4.74883 10.6243 4.43183 10.8233 4.24033C10.9203 4.14633 11.0513 4.09683 11.1858 4.10083C11.3208 4.10483 11.4483 4.16333 11.5393 4.26283L12.9633 5.78133C13.1463 5.97733 13.1423 6.28333 12.9533 6.47433Z" fill="white"/>
							</svg>
							Premium
						</button>
					</div>
					<div>
						<button id="discordButton">
							<svg width="24" height="24" viewBox="0 0 127.14 96.36" xmlns="http://www.w3.org/2000/svg">
								<path class="cls-1" d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" fill="white"/>
							</svg>
							Discord
						</button>
						<button id="twitterButton">
							<svg width="24" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path id="Vector" d="M14.7339 10.1623L23.4764 0H21.4047L13.8136 8.82385L7.7507 0H0.757812L9.92616 13.3432L0.757812 24H2.82961L10.846 14.6817L17.2489 24H24.2418L14.7334 10.1623H14.7339ZM3.57609 1.55963H6.75823L21.4056 22.5113H18.2235L3.57609 1.55963Z" fill="white"/>
							</svg>
							X
						</button>
						<button id="redditButton">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M14.238 15.348c.085.084.085.221 0 .306-.465.462-1.194.687-2.231.687l-.008-.002-.008.002c-1.036 0-1.766-.225-2.231-.688-.085-.084-.085-.221 0-.305.084-.084.222-.084.307 0 .379.377 1.008.561 1.924.561l.008.002.008-.002c.915 0 1.544-.184 1.924-.561.085-.084.223-.084.307 0zm-3.44-2.418c0-.507-.414-.919-.922-.919-.509 0-.923.412-.923.919 0 .506.414.918.923.918.508.001.922-.411.922-.918zm13.202-.93c0 6.627-5.373 12-12 12s-12-5.373-12-12 5.373-12 12-12 12 5.373 12 12zm-5-.129c0-.851-.695-1.543-1.55-1.543-.417 0-.795.167-1.074.435-1.056-.695-2.485-1.137-4.066-1.194l.865-2.724 2.343.549-.003.034c0 .696.569 1.262 1.268 1.262.699 0 1.267-.566 1.267-1.262s-.568-1.262-1.267-1.262c-.537 0-.994.335-1.179.804l-2.525-.592c-.11-.027-.223.037-.257.145l-.965 3.038c-1.656.02-3.155.466-4.258 1.181-.277-.255-.644-.415-1.05-.415-.854.001-1.549.693-1.549 1.544 0 .566.311 1.056.768 1.325-.03.164-.05.331-.05.5 0 2.281 2.805 4.137 6.253 4.137s6.253-1.856 6.253-4.137c0-.16-.017-.317-.044-.472.486-.261.82-.766.82-1.353zm-4.872.141c-.509 0-.922.412-.922.919 0 .506.414.918.922.918s.922-.412.922-.918c0-.507-.413-.919-.922-.919z" fill="white"/></svg>
							Reddit
						</button>
					</div>
					<div>
						<button id="contactButton">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<g id="contact">
							<path id="Vector" fill-rule="evenodd" clip-rule="evenodd" d="M8.8717 5.01934H22.1952L14.2817 10.4443L8.89889 6.75418C9.10383 6.20542 9.10556 5.58512 8.8717 5.01934ZM5.38716 8.16803L7.32919 6.98556C7.90552 6.63465 8.09681 5.88596 7.75941 5.30157L6.00614 2.26482C5.82628 1.95324 5.55403 1.75281 5.20312 1.67359C4.85217 1.59432 4.5203 1.65831 4.22395 1.86235L1.02652 4.06379C-0.495469 9.42648 6.34402 21.0365 11.5895 22.3594L15.0947 20.6911C15.4196 20.5365 15.641 20.281 15.7478 19.9374C15.8546 19.5939 15.8172 19.2579 15.6373 18.9464L13.884 15.9096C13.5466 15.3252 12.8026 15.1165 12.2105 15.4402L10.2155 16.5308C8.2425 14.7761 5.92031 10.754 5.38716 8.16803ZM23.1629 5.71703L14.5981 11.5885C14.3977 11.7253 14.1403 11.7146 13.954 11.5808L8.26809 7.68287C8.16037 7.77995 8.04239 7.86845 7.91423 7.94649L6.68592 8.69434C7.33125 10.777 8.92805 13.5427 10.409 15.1429L11.6708 14.4531C12.7983 13.8368 14.2158 14.2344 14.8582 15.3471L15.9455 17.2304H22.2787C22.7788 17.2304 23.1879 16.8212 23.1879 16.3212V5.92853C23.1879 5.85578 23.1792 5.78495 23.1629 5.71703Z" fill="#D1D1D1"/>
							</g>
							</svg>
							Contact
						</button>
						<button>
							<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
							<g id="Layer 2">
							<path id="Vector" d="M7.15112 10.9938L3.47837 10.5042C2.75859 10.4061 2.09857 10.051 1.62009 9.50438C1.14162 8.95779 0.876977 8.25658 0.875 7.53016V3.5C0.875397 3.1023 1.03356 2.721 1.31478 2.43978C1.596 2.15856 1.9773 2.0004 2.375 2H5.375C5.54228 1.99988 5.7048 2.05573 5.83666 2.15866C5.96853 2.26159 6.06217 2.40568 6.10266 2.56799L7.97766 10.068C8.00524 10.1786 8.00728 10.294 7.98361 10.4055C7.95994 10.5169 7.91119 10.6216 7.84105 10.7114C7.77092 10.8012 7.68124 10.8739 7.57883 10.9239C7.47642 10.9739 7.36397 10.9999 7.25 11L7.15112 10.9938ZM2.375 7.53016C2.37601 7.89334 2.50838 8.24389 2.74766 8.5171C2.98695 8.79031 3.317 8.96773 3.67688 9.0166L6.25427 9.36085L4.78943 3.5H2.37537L2.375 7.53016Z" fill="#D1D1D1"/>
							<path id="Vector_2" d="M14.7499 11C14.6359 11 14.5234 10.9741 14.4209 10.9241C14.3184 10.8741 14.2287 10.8013 14.1586 10.7114C14.0884 10.6215 14.0397 10.5168 14.0162 10.4052C13.9926 10.2937 13.9948 10.1782 14.0226 10.0676L15.8976 2.56799C15.9378 2.4056 16.0313 2.26139 16.1632 2.15842C16.295 2.05545 16.4576 1.99967 16.6249 2H19.6249C20.0226 2.00046 20.4039 2.15864 20.6851 2.43984C20.9663 2.72105 21.1245 3.10232 21.1249 3.5V7.53016C21.1229 8.25649 20.8583 8.95761 20.3799 9.50414C19.9015 10.0507 19.2416 10.4057 18.5219 10.5038L14.8363 10.9952L14.7499 11ZM15.7453 9.36084L18.3234 9.01697C18.6832 8.96788 19.0132 8.79034 19.2523 8.51709C19.4915 8.24384 19.6239 7.89331 19.6249 7.53016V3.5H17.2108L15.7453 9.36084Z" fill="#D1D1D1"/>
							<path id="Vector_3" d="M17.1875 8.31494V1.25C17.1865 1.10114 17.1269 0.958688 17.0216 0.853429C16.9163 0.748169 16.7739 0.688564 16.625 0.6875H5.37503C5.22619 0.688595 5.08375 0.74821 4.9785 0.853463C4.87324 0.958716 4.81363 1.10115 4.81253 1.25V8.31494C4.80833 9.53444 5.21209 10.7203 5.95956 11.6839C6.70703 12.6475 7.75528 13.3334 8.93753 13.6325V17.9375H6.90503C6.68825 17.9362 6.47458 17.989 6.28337 18.0912C6.09217 18.1933 5.92947 18.3416 5.81003 18.5225L5.30759 19.2725C5.17665 19.4705 5.10178 19.7003 5.09091 19.9375C5.08005 20.1747 5.1336 20.4103 5.24588 20.6195C5.35816 20.8287 5.52498 21.0036 5.72863 21.1256C5.93229 21.2476 6.16518 21.3122 6.40259 21.3125H15.1926C15.4519 21.3114 15.7051 21.2335 15.9203 21.0887C16.1354 20.9439 16.3028 20.7386 16.4015 20.4988C16.5002 20.259 16.5256 19.9953 16.4746 19.741C16.4237 19.4868 16.2986 19.2533 16.1151 19.07L15.3651 18.32C15.1197 18.0765 14.7884 17.9391 14.4426 17.9375H13.0625V13.6325C14.2448 13.3334 15.293 12.6475 16.0405 11.6839C16.788 10.7203 17.1917 9.53444 17.1875 8.31494ZM12.6202 7.2425L12.9652 8.6375C12.9847 8.71168 12.9818 8.78997 12.9568 8.86251C12.9319 8.93504 12.8861 8.99858 12.8251 9.0451C12.7641 9.09162 12.6907 9.11905 12.6142 9.12392C12.5376 9.1288 12.4613 9.11091 12.395 9.0725L11.195 8.39C11.1366 8.35322 11.069 8.3337 11 8.3337C10.931 8.3337 10.8634 8.35322 10.805 8.39L9.60514 9.07243C9.53875 9.11084 9.46248 9.12873 9.38593 9.12386C9.30939 9.11898 9.236 9.09155 9.17502 9.04503C9.11404 8.99851 9.0682 8.93498 9.04327 8.86244C9.01835 8.7899 9.01545 8.71161 9.03495 8.63743L9.38011 7.24243C9.39863 7.17689 9.39935 7.1076 9.38219 7.04169C9.36504 6.97578 9.33063 6.91563 9.28251 6.86743L8.54001 6.13243C8.48559 6.07756 8.44862 6.00781 8.43375 5.93197C8.41888 5.85612 8.42678 5.77758 8.45646 5.70622C8.48614 5.63486 8.53626 5.57387 8.60052 5.53094C8.66479 5.488 8.74031 5.46504 8.8176 5.46493H9.80765C9.88404 5.46239 9.9582 5.43858 10.0218 5.39618C10.0854 5.35379 10.1359 5.2945 10.1677 5.22497L10.6401 4.11497C10.6692 4.04344 10.7191 3.98222 10.7832 3.93913C10.8473 3.89604 10.9228 3.87302 11.0001 3.87302C11.0773 3.87302 11.1528 3.89604 11.2169 3.93913C11.2811 3.98222 11.3309 4.04344 11.3601 4.11497L11.8325 5.22497C11.8642 5.29452 11.9148 5.35383 11.9784 5.39622C12.042 5.43861 12.1162 5.46241 12.1926 5.46493H13.1827C13.26 5.46507 13.3355 5.48805 13.3997 5.531C13.464 5.57395 13.5141 5.63494 13.5437 5.7063C13.5734 5.77765 13.5812 5.85618 13.5664 5.93201C13.5515 6.00784 13.5145 6.07757 13.4601 6.13243L12.7176 6.86743C12.6695 6.91565 12.6351 6.97581 12.618 7.04174C12.6008 7.10766 12.6016 7.17696 12.6202 7.2425Z" fill="#D1D1D1"/>
							</g>
							</svg>
							Affiliation
						</button>
						<button>
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<g clip-path="url(#clip0_3128_4961)">
							<path d="M18.975 8.95L17.0812 7.05625V4.375C17.0805 3.98567 16.9256 3.61247 16.6503 3.33717C16.375 3.06187 16.0018 2.90691 15.6125 2.90625H12.9312L11.0375 1.0125C10.7613 0.739223 10.3885 0.585937 9.99995 0.585938C9.61143 0.585938 9.23861 0.739223 8.96245 1.0125L7.0687 2.90625H4.38745C3.99812 2.90691 3.62492 3.06187 3.34962 3.33717C3.07432 3.61247 2.91936 3.98567 2.9187 4.375V7.05625L1.02495 8.95C0.888287 9.08601 0.779841 9.24769 0.705842 9.42573C0.631843 9.60378 0.59375 9.79469 0.59375 9.9875C0.59375 10.1803 0.631843 10.3712 0.705842 10.5493C0.779841 10.7273 0.888287 10.889 1.02495 11.025L2.9187 12.925V15.6C2.91845 15.7929 2.95628 15.9841 3.03 16.1624C3.10372 16.3407 3.2119 16.5027 3.34834 16.6391C3.48477 16.7755 3.64678 16.8837 3.82509 16.9575C4.0034 17.0312 4.1945 17.069 4.38745 17.0688H7.0687L8.96245 18.9625C9.09846 19.0992 9.26013 19.2076 9.43818 19.2816C9.61623 19.3556 9.80714 19.3937 9.99995 19.3937C10.1928 19.3937 10.3837 19.3556 10.5617 19.2816C10.7398 19.2076 10.9014 19.0992 11.0375 18.9625L12.9312 17.0688H15.6125C15.8054 17.069 15.9965 17.0312 16.1748 16.9575C16.3531 16.8837 16.5151 16.7755 16.6516 16.6391C16.788 16.5027 16.8962 16.3407 16.9699 16.1624C17.0436 15.9841 17.0814 15.7929 17.0812 15.6V12.925L18.975 11.025C19.1116 10.889 19.2201 10.7273 19.2941 10.5493C19.3681 10.3712 19.4062 10.1803 19.4062 9.9875C19.4062 9.79469 19.3681 9.60378 19.2941 9.42573C19.2201 9.24769 19.1116 9.08601 18.975 8.95ZM9.99995 13.125C9.38188 13.125 8.7777 12.9417 8.26379 12.5983C7.74989 12.255 7.34935 11.7669 7.11283 11.1959C6.8763 10.6249 6.81442 9.99653 6.935 9.39034C7.05558 8.78415 7.3532 8.22733 7.79024 7.79029C8.22728 7.35325 8.7841 7.05563 9.39029 6.93505C9.99648 6.81447 10.6248 6.87635 11.1958 7.11288C11.7669 7.3494 12.2549 7.74994 12.5983 8.26384C12.9417 8.77775 13.125 9.38193 13.125 10C13.125 10.8288 12.7957 11.6237 12.2097 12.2097C11.6236 12.7958 10.8288 13.125 9.99995 13.125Z" fill="white"/>
							</g>
							</svg>
							Settings
						</button>
					</div>
				</div>
				`;

        sidebar.innerHTML = loadSideBar;
        document.getElementById('contactButton').addEventListener('click', function () { window.location.href = 'mailto:durieun02@gmail.com'; });
        document.getElementById('discordButton').addEventListener('click', function () { window.open('https://discord.gg/6FTmwtaK', '_blank'); });
        document.getElementById('twitterButton').addEventListener('click', function () { window.open('https://x.com/zeroduri', '_blank'); });
        document.getElementById('redditButton').addEventListener('click', function () { window.open('https://www.reddit.com/r/bodyswapai/', '_blank'); });
        document.getElementById('exploreButton').addEventListener('click', function () { window.location.href = 'index.html'; localStorage.setItem('sidebarState', 'removeSidebar'); });
        document.getElementById('profileButton').addEventListener('click', function () { window.location.href = 'profile.html'; localStorage.setItem('sidebarState', 'removeSidebar'); });
        document.getElementById('premiumButton').addEventListener('click', function () { window.location.href = 'pricing.html'; localStorage.setItem('sidebarState', 'removeSidebar'); });
        sidebarLoaded = true;
    }
}

export function showNavbar(navbar, mains, sidebar) {
    setNavbarActive(navbar);
    setNavbar(navbar, mains, sidebar);
}

export function removeSidebar(sidebar, hamburgerMenu) {
    setSidebarActive(false);
    setSidebar(sidebar);

    if (hamburgerMenu)
        hamburgerMenu.classList.remove('open');

    localStorage.setItem('sidebarState', 'keepSideBar');
    // TODO: Remove side bar elements when animation is over and allow recreation!
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

//console.log("[LOADED] accesVariables.js");