import * as State from '../defaultPageLoads/accessVariables.js';

document.addEventListener('DOMContentLoaded', function () {
    let pageContents = [];

    function updatePageContents() {
			pageContents = [`
										<div style="display: grid;gap: clamp(0px, calc(2vh* var(--scale-factor)), calc(4vw* var(--scale-factor)));justify-content: center;font-weight: 600;">
											<div style="display: flex;flex-direction: column; gap: clamp(0px, calc(2vh* var(--scale-factor)), calc(4vw* var(--scale-factor)));">
															<div class="background-container">
																<p class="background-dot-container-option selected" id="credits-mode">Credits</p>
																<p class="background-dot-container-option" id="subscription-mode">Subscription</p>
																<p class="background-dot-container-option not-available" id="renewal-mode">Renewal</p>
															</div>


															<div class="background-container" style="display: flex;flex-direction: row;height: 100%;">
																<p class="background-dot-container-option selected" data-currency="USD" style="height: 100%;">$USD</p>
																<p class="background-dot-container-option" data-currency="EUR" style="height: 100%;">€EUR</p>
																<p class="background-dot-container-option" data-currency="GBP" style="height: 100%;">£GBP</p>
																<p class="background-dot-container-option" data-currency="TRY" style="height: 100%;">₺TRY</p>
																<p class="background-dot-container-option important-outline" data-currency="BTC" style="height: 100%;">COIN</p>
															</div>


												<div class="background-container" style="display: flex;flex-direction: column;align-items: stretch;">
													<div style="display: flex; gap: clamp(0px, calc(1vh* var(--scale-factor)), calc(2vw* var(--scale-factor)));">
														<a class="background-dot-container">
															<div class="background-dot-container-content" style="min-width: clamp(0px, calc(50vh* var(--scale-factor)), calc(50vw* var(--scale-factor)));">
															<div class="background-container" style="grid: unset; display: grid;grid-template-columns: 1fr 1fr;">
																<input type="range" id="slider" min="1" max="6" step="1" value="1"></input>
																<p class="slider-value">1 day</p>
															</div>
																	<div class="line"></div>
																<div class="background-dot-container-header">
																	<p class="plans-name text-gradient">Starter</p>
																	<div class="plans-popular">
																		<p class="plans-name text-gradient">Popular</p>
																	</div>
																</div>
																<div class="background-dot-container-price">
																	<h1 id="cost-per-day">⟳ Loading...</h1>
																	<h4 id="cost-per-day-unit" style="opacity: 0.5;">/day</h4>
																</div>
																<div class="background-dot-container-link" id="purchase">Purchase</div>
																<div>
																	<div class="line"></div>
																	<h4 id="discount-details">⟳ Loading...</h4>
																	<p class="discount-details" id="discount">⟳ Loading...</p>
																	<div class="line"></div>
																	<div id="features-list"></div>
																	<div class="line"></div>
																	<h4 style="margin-bottom: 1vh;">Plan Capability</h4>
																	<ul id="capability-list" style="display: flow;background: transparent;"></ul>
																</div>
															</div>
														</a>
													</div>
												</div>
											</div>
										</div>
									`];
    }

    updatePageContents();

	State.createPages(pageContents);
	State.updateContent(pageContents);

	function sizeBasedElements() {
		const oldContentLenght = pageContents.length;
		updatePageContents();
		const currentContentLenght = pageContents.length;
		if (oldContentLenght != currentContentLenght) {
			State.cleanPages(pageContents);
			State.createPages(pageContents);
			State.reconstructMainStyles(pageContents);
		}

		State.updateContent(pageContents);
	}

	sizeBasedElements();

	window.addEventListener('resize', sizeBasedElements);
});