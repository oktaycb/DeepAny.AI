import * as State from './accessVariables.js';

const swipeThreshold = 50;

export function loadScrollingAndMain(navbar, mains, sidebar) {
	if (mains && mains.length > 0) {
		mains.forEach((main, index) => {
			main.style.display = 'flex';
			main.style.top = `${index * State.getWindowHeight() + State.getNavbarHeight()}px`;
			main.style.height = `${State.getWindowHeight() - State.getNavbarHeight()}px`;
			main.style.width = `${State.getWindowWidth()}px`;
		});

		let scrolling = false;
		let touchStartY = 0;
		let touchEndY = 0;
		let touchStartTime = 0;

		function showMain(index, transitionDuration = 250) {
			if (index >= 0 && index < mains.length && !scrolling) {
				scrolling = true;
				const wentDown = index >= State.getCurrentMain();
				State.setCurrentMain(index);
				if (wentDown) {
					State.removeNavbar(navbar, mains, sidebar);
				} else {
					State.showNavbar(navbar, mains, sidebar);
				}
				setTimeout(() => {
					scrolling = false;
				}, transitionDuration);
			}
		}

		document.addEventListener('keydown', (event) => {
			if (!scrolling) {
				if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
					event.preventDefault();
					showMain(State.getCurrentMain() + 1);
				} else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
					event.preventDefault();
					showMain(State.getCurrentMain() - 1);
				}
			}
		});

		document.addEventListener('wheel', (event) => {
			if (event.ctrlKey) 
				return;
			
			if (!scrolling) {
				if (event.deltaY > 0) {
					showMain(State.getCurrentMain() + 1);
				} else if (event.deltaY < 0) {
					showMain(State.getCurrentMain() - 1);
				}
			}
		});

		function handleEvent(event) {
			if (event) {
				const clientY = event.type === 'touchstart' ? event.touches[0].clientY : event.clientY;
				const clientX = event.type === 'touchstart' ? event.touches[0].clientX : event.clientX;

				if (clientX > State.getActualSidebarWidth()) {
					if (clientY <= State.getActualNavbarHeight()) {
						State.showNavbar(navbar, mains, sidebar);
					} else if (event.type === 'click') {
						// State.removeNavbar(navbar, mains, sidebar);
					}
				}

				if (clientY > State.getActualNavbarHeight()) {
					if (!clientX) {
						State.showSidebar(sidebar);
					} else if (event.type === 'click' && clientX > State.getActualSidebarWidth()) {
						State.removeSidebar(sidebar);
					}
				}
			}
		}

		function handleSwipe() {
			const touchDistance = touchEndY - touchStartY;
			const touchDuration = Date.now() - touchStartTime;
			if (Math.abs(touchDistance) > swipeThreshold && touchDuration < 500) {
				if (touchDistance < 0) {
					showMain(State.getCurrentMain() + 1);
				} else {
					showMain(State.getCurrentMain() - 1);
				}
			}
		}

		document.addEventListener('click', handleEvent);
		document.addEventListener('mousemove', handleEvent);
		document.addEventListener('touchmove', (event) => {
			touchEndY = event.changedTouches[0].clientY;
			handleSwipe();
		});

		document.addEventListener('touchstart', (event) => {
			handleEvent(event);
			touchStartY = event.touches[0].clientY;
			touchStartTime = Date.now();
		});
	}
}