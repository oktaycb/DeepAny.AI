// If you are looking for buttons and services li's refer to sizeBasedElements inside loadDefaultHTML.
const websiteTitle = document.title.split('.')[0];
const loadSideBarAndNavBar = `
			<nav class="navbar">
				<div class="container">
					<div class="logo">
						<img onclick="location.href='index.html';" style="cursor: pointer;" class="logoimg" src="assets/logo.png" alt="Logo">
						<h2 onclick="location.href='index.html';" style="cursor: pointer;">${websiteTitle}.<span class="text-gradient">AI</span></h2>
					</div>
				</div>
			</nav>
			<nav class="sidebar">
				<div style="flex: 1; justify-content: space-between;">
					<div>
						<button id="exploreButton"><img src="./assets/explore.svg">Explore</button>
						<button id="profileButton"><img src="./assets/profile.svg">Profile</button>
						<button id="premiumButton" class="important"><img src="./assets/premium.svg">Premium</button>
					</div>
					<div>
						<button id="discordButton"><img src="./assets/discord.svg">Discord </button>
						<button id="twitterButton"><img src="./assets/x.svg">X</button>
						<button id="redditButton"><img src="./assets/reddit.svg">Reddit</button>
					</div>
					<div>
						<button id="contactButton"><img src="./assets/contact.svg" alt="Contact Icon">Contact</button>
						<button><img src="./assets/trophy.svg">Affiliation</button>
						<button><img src="./assets/settings.svg">Settings</button>
					</div>
				</div>
			</nav>
			<div class="loading-screen">
				<div class="loading-spinner"></div>
			</div>
		`;

export function loadBars() {
	document.body.insertAdjacentHTML('afterbegin', loadSideBarAndNavBar);
	document.getElementById('contactButton').addEventListener('click', function () { window.location.href = 'mailto:durieun02@gmail.com'; });
	document.getElementById('discordButton').addEventListener('click', function () { window.open('https://discord.gg/6FTmwtaK', '_blank'); });
	document.getElementById('twitterButton').addEventListener('click', function () { window.open('https://x.com/zeroduri', '_blank'); });
	document.getElementById('redditButton').addEventListener('click', function () { window.open('https://www.reddit.com/r/bodyswapai/', '_blank'); });
	document.getElementById('exploreButton').addEventListener('click', function () { window.location.href = 'index.html'; });
	document.getElementById('profileButton').addEventListener('click', function () { window.location.href = 'profile.html'; });
	document.getElementById('premiumButton').addEventListener('click', function () { window.location.href = 'pricing.html'; });
}