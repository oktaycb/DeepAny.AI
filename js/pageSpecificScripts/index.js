// import { auth } from '../firebase/firebase-auth.js';
import * as State from '../defaultPageLoads/accessVariables.js';

document.addEventListener('DOMContentLoaded', function () {
	const mainContainers = document.querySelectorAll('.main-container');

	function sizeBasedElements() {
		mainContainers.forEach((mainContainer, index) => {
			mainContainer.innerHTML = '';

			if (State.getAspectRatio() <= 4 / 3) {
				switch (index) {
					case 0:
						mainContainer.insertAdjacentHTML('beforeend', `
											<div style="display: grid;grid-template-rows: 1fr auto;align-items: center;">
												<div class="start-content" id="hover-div">
													<p class="subtext">Leading AI platform since 2023.</p>
													<h1 class="text-gradient" id="dynamic-text">AI Services</h1>
													<ul class="styled-list">
														<li><strong>Free Trial:</strong> Full-featured services free.</li>
														<li><strong>Security & Support:</strong> Data protection & 24/7 support.</li>
														<li><strong>High Ratings:</strong> 4.9 rating on
															<a class="trusted-link" href="https://www.trustpilot.com/review/bodyswap.me" target="_blank" rel="noopener noreferrer">Trustpilot</a>.
														</li>
														<li><strong>Cost-Effective:</strong> 1 credit per image/frame.</li>
														<li><strong>Fast Processing:</strong> RTX 4090 GPUs for optimal performance.</li>
														<li><strong>Pricing:</strong> $0.1/credit, 10 free credits daily.
														</li>
													</ul>
													<p class="subtext">Reliable and affordable AI services.</p>
													<div class="button-container">
														<button>Try Now</button>
														<button class="important">Purchase</button>
													</div>
												</div>
												<div class="end-content">
													<div class="bloom-effect" style="opacity: 0.5;" id="middle-bloom"></div>
													<img src="./assets/resize-large.webp" id="middle-img">
												</div>
											</div>
										`);
						break;
					case 1:
						mainContainer.insertAdjacentHTML('beforeend', `
											<div class="end-content">
												<h3 style="text-align: center; align-self: center;">
												  Easy to use interface<br>
												</h3>
												<h4 class="text-gradient" style="align-self: center; text-align: center; margin: 1vh; color: #999999; font-weight: 300;">
												  Start generating now!
												</h4>
											</div>
											<div class="card-container">
												<a href="face-swap" class="card">
													<div class="card-content">
														<div>
															<div class="card-title">Face Swapper</div>
															<div class="card-description">Swap faces in your photos with ease.</div>
														</div>
														<div class="card-link">Try Face Swapper</div>
													</div>
												</a>
												<a href="inpaint" class="card">
													<div class="card-content">
														<div>
															<div class="card-title">Inpainter</div>
															<div class="card-description">Remove or add elements in your images.</div>
														</div>
														<div class="card-link">Try Inpainter</div>
													</div>
												</a>
												<a href="art" class="card">
													<div class="card-content">
														<div>
															<div class="card-title">Art Generator</div>
															<div class="card-description">Create stunning digital artworks.</div>
														</div>
														<div class="card-link">Create Art</div>
													</div>
												</a>
											</div>
										`);
						break;
				}
			} else {
				switch (index) {
					case 0:
						mainContainer.insertAdjacentHTML('beforeend', `
											<div style="display: flex;gap: clamp(0px, calc(12vh* var(--scale-factor)), calc(24vw* var(--scale-factor)));justify-content: space-between;align-items: center;">
												<div class="start-content" id="hover-div">
													<p class="subtext">Discover the leading AI platform since 2023, renowned for its ease and excellence.</p>
													<h1 class="text-gradient" id="dynamic-text">AI-Powered Services</h1>
													<ul class="styled-list">
														<li><strong>Free Trial:</strong> Experience our full-featured services without cost.</li>
														<li><strong>Security & Support:</strong> Your data is protected, with 24/7 support available.</li>
														<li><strong>High Ratings:</strong> Trusted by users with a 4.9 rating on
															<a class="trusted-link" href="https://www.trustpilot.com/review/bodyswap.me" target="_blank" rel="noopener noreferrer">Trustpilot</a>.
														</li>
														<li><strong>Cost-Effective:</strong> Only 1 credit per image & frame processed.</li>
														<li><strong>Fast Processing:</strong> RTX 4090 GPUs in our servers for optimal performance.</li>
														<li><strong>Pricing:</strong> Plans tailored to every budget ($0.1/credit), with 10 free credits daily.
														</li>
													</ul>
													<p class="subtext">Unlock the potential of AI for your projects with our reliable and affordable services.</p>
													<div class="button-container">
														<button>Try Now</button>
														<button class="important">Purchase</button>
													</div>
												</div>
												<div class="end-content">
													<div class="bloom-effect" id="middle-bloom"></div>
													<img src="./assets/resize-large.webp" id="wide-img">
													<img src="./assets/resize-middle.webp" id="middle-img">
													<img src="./assets/resize-long.webp" id="long-img">
												</div>
											</div>
											<div class="card-container">
												<div class="background"></div>
												<a href="face-swap" class="card">
													<div class="card-content">
														<div>
															<div class="card-title">Face Swapper</div>
															<div class="card-description">Swap faces in your photos with ease.</div>
														</div>
														<div class="card-link">Try Face Swapper</div>
													</div>
												</a>
												<a href="inpaint" class="card">
													<div class="card-content">
														<div>
															<div class="card-title">Inpainter</div>
															<div class="card-description">Remove or add elements in your images.</div>
														</div>
														<div class="card-link">Try Inpainter</div>
													</div>
												</a>
												<a href="art" class="card">
													<div class="card-content">
														<div>
															<div class="card-title">Art Generator</div>
															<div class="card-description">Create stunning digital artworks.</div>
														</div>
														<div class="card-link">Create Art</div>
													</div>
												</a>
											</div>
										`);
						break;
				}
			}
		});
	}

	sizeBasedElements();

	window.addEventListener('resize', sizeBasedElements);

	function setupTextRotation(aspectRatio) {
		let texts = [
			"Enhanced Face Swapping",
			"Advanced Inpainting",
			"Renowned Art Generator"
		];

		if (aspectRatio <= 4 / 3) {
			texts = [
				"Face Swapping",
				"Inpainting",
				"Art Generator"
			];
		}

		let index = 0;
		let intervalId;
		let isFirstHover = true;

		const element = document.getElementById("dynamic-text");
		const hoverDiv = document.getElementById("hover-div");

		if (hoverDiv && element) {
			function rotateText() {
				element.classList.add("change");
				setTimeout(() => {
					element.textContent = texts[index];
					index = (index + 1) % texts.length;
					element.classList.remove("change");
				}, 300);
			}

			function resetText() {
				isFirstHover = true;
				clearInterval(intervalId);
				element.classList.add("change");
				setTimeout(() => {
					element.textContent = aspectRatio <= 4 / 3 ? "AI Services" : "AI-Powered Services";
					element.classList.remove("change");
				}, 300);
			}

			let timeoutId;

			hoverDiv.addEventListener("mouseenter", function () {
				clearTimeout(timeoutId);
				timeoutId = setTimeout(() => {
					if (isFirstHover) {
						isFirstHover = false;
						rotateText();
						intervalId = setInterval(rotateText, 3000);
					}
				}, 600);
			});

			hoverDiv.addEventListener("mouseleave", function () {
				clearTimeout(timeoutId);
				timeoutId = setTimeout(() => {
					resetText();
				}, 600);
			});
		}
	}

	setupTextRotation(State.getAspectRatio());
});