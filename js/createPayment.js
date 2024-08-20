import { auth, serversRef } from './firebase/firebase-config.js';
import { getCache, setCache } from './timeLimitedCache.js';
import * as State from './defaultPageLoads/accessVariables.js';

document.addEventListener("DOMContentLoaded", async function () {
	// TODO: Recieve prices from the server itself.
	let credits = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000];
	let prices = [9.99, 14.99, 24.99, 44.99, 99.99, 174.99, 299.99, 624.99, 999.99];
	let durationsInDays = [1, 7, 30, 90, 365, -1];
	let subprices = [19.99, 9.99 * durationsInDays[1], 4.99 * durationsInDays[2], 3.49 * durationsInDays[3], 1.99 * durationsInDays[4], 1399.99];
	const durations = ["1 day", "1 week", "1 month", "3 months", "1 year", "Lifetime"];

	async function fetchServerAddressAPI() {
		const cacheKey = 'serverAddressAPI';
		const cachedAddress = getCache(cacheKey);

		if (cachedAddress) {
			return cachedAddress;
		}

		const serverDoc = await serversRef.doc('3050-1').get();
		if (serverDoc.exists) {
			const serverAddress = serverDoc.data()['serverAdress-API'];
			setCache(cacheKey, serverAddress || null, 7 * 24 * 60 * 60 * 1000); 
			return serverAddress || null;
		} 

		return null;
	}

	// Use the function to fetch the server address
	const serverAddressAPI = await fetchServerAddressAPI();

	// Use the function to fetch the server address
	async function fetchServerAddressPAYTR() {
		const cacheKey = 'serverAddressPAYTR';
		const cachedAddress = getCache(cacheKey);

		if (cachedAddress) {
			return cachedAddress;
		}

		const serverDoc = await serversRef.doc('3050-1').get();
		if (serverDoc.exists) {
			const serverAddress = serverDoc.data()['serverAdress-PAYTR'];
			setCache(cacheKey, serverAddress || null, 7 * 24 * 60 * 60 * 1000); 
			return serverAddress || null;
		}

		return null;
	}

	// Use the function to fetch the server address
	const serverAddressPAYTR = await fetchServerAddressPAYTR();

	// Use the function to fetch the server address
	async function fetchConversionRates() {
		const cacheKey = 'conversionRates';
		const cachedRates = getCache(cacheKey);

		if (cachedRates) {
			return cachedRates;
		}

		try {
			const response = await fetch('https://api.frankfurter.app/latest?from=USD');
			const data = await response.json();
			setCache(cacheKey, data.rates, 1 * 24 * 60 * 60 * 1000); 
			return data.rates;
		} catch (error) {
			console.error("Error fetching conversion rates:", error);
		}

		return null;
	}

	let conversionRates = await fetchConversionRates();

	const checkmarkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>`;
	const xIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x plans_x__KKb0t"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`;

	const SingleCreditFPS = 120;
	const creditPerFrames = 60;
	const FPS = 30;
	const minute = 60 /*seconds*/ * 1 /*minute*/;
	const creditVideo = creditPerFrames / SingleCreditFPS;
	const creditPerInpaint = 2;
	const creditPerArtGeneration = 1;

	// Helper function to calculate credits based on state
	const getCapabilities = (isAspectRatioLow, price, currencySymbol) => {
		return {
			faceSwap: { name: "Video Swap", formula: (credits) => isAspectRatioLow ? `${Math.floor((credits * 60) / (FPS * minute))} mins` : `${creditVideo} cred (${currencySymbol}${price * creditVideo})/${creditPerFrames} fps (${Math.floor((credits * SingleCreditFPS) / (FPS * minute))} mins)` },
			imageSwap: { name: "Image Swap", formula: (credits) => isAspectRatioLow ? `${Math.floor(credits)} process` : `1 cred (${currencySymbol}${price})/face swap (${Math.floor(credits)})` },
			inpainter: { name: "Inpainter", formula: (credits) => isAspectRatioLow ? `${Math.floor(credits / creditPerInpaint)} process` : `${creditPerInpaint} creds (${currencySymbol}${price * creditPerInpaint})/inpaint (${Math.floor(credits / creditPerInpaint)})` },
			artGeneration: { name: "Art", formula: (credits) => isAspectRatioLow ? `${Math.floor(credits)} process` : `${creditPerArtGeneration} cred (${currencySymbol}${price})/art (${Math.floor(credits)})` }
		};
	};

	// Function to update the capabilities list
	function updateCapabilityList(credits, price, currencySymbol, isSubscriptionMode) {
		const capabilityListElement = document.getElementById("capability-list");

		// Clear previous content
		capabilityListElement.innerHTML = "";

		const capabilities = getCapabilities(State.getAspectRatio() <= 4 / 3, price, currencySymbol);

		// If in subscription mode, display unlimited for all capabilities, specific limit for video
		if (isSubscriptionMode) {
			const faceSwapElement = document.createElement("li");
			faceSwapElement.classList.add("capability");
			faceSwapElement.innerHTML = `
            ${capabilities.faceSwap.name}: 2 hour per process`;
			capabilityListElement.appendChild(faceSwapElement);

			// Other capabilities will be shown as unlimited
			Object.values(capabilities).forEach(capability => {
				if (capability.name !== capabilities.faceSwap.name) {
					const capabilityElement = document.createElement("li");
					capabilityElement.classList.add("capability");
					capabilityElement.innerHTML = `
                    ${capability.name}: Unlimited
                `;
					capabilityListElement.appendChild(capabilityElement);
				}
			});
			return;
		}

		// Loop through each capability and create the necessary HTML elements for credits mode
		Object.values(capabilities).forEach(capability => {
			const capabilityElement = document.createElement("li");
			capabilityElement.classList.add("capability");
			capabilityElement.innerHTML = `
            ${capability.name}: ${capability.formula(credits, price, currencySymbol)}
        `;
			capabilityListElement.appendChild(capabilityElement);
		});
	}

	const subscriptionFeatures = [
		{ text: "Professional account", icon: checkmarkIcon },
		{ text: "Unlimited usage", icon: checkmarkIcon },
		{ text: "4k resolution", icon: checkmarkIcon },
		{ text: "Upload limit to 2 GB", icon: checkmarkIcon },
		{ text: "6x frame limiter ", icon: checkmarkIcon },
		{ text: "Pixel boost feature", icon: checkmarkIcon },
		{ text: "Priority queue", icon: checkmarkIcon },
	];

	const creditFeatures = [
		{ text: "Verified account", icon: checkmarkIcon },
		{ text: "No deadline", icon: checkmarkIcon },
		{ text: "HD resolution", icon: checkmarkIcon },
		{ text: "Upload limit to 500MB", icon: checkmarkIcon },
		{ text: "6x frame limiter ", icon: xIcon },
		{ text: "Pixel boost feature", icon: xIcon },
		{ text: "Priority queue", icon: xIcon },
	];

	// Function to update the feature list based on mode
	function updateFeatureList(isCreditsMode) {
		const featuresListElement = document.getElementById("features-list");
		featuresListElement.innerHTML = ""; // Clear previous content

		// Select the appropriate feature array based on the mode
		const selectedFeatures = isCreditsMode ? creditFeatures : subscriptionFeatures;

		// Loop through each feature and create the necessary HTML elements
		selectedFeatures.forEach(feature => {
			const featureElement = document.createElement("p");
			featureElement.classList.add("feature");
			featureElement.innerHTML = `
            ${feature.icon}
            ${feature.text}
        `;
			featuresListElement.appendChild(featureElement);
		});
	}

	function calculatePrice(value) {
		return prices[value - 1];
	}

	function calculateSubPrice(value) {
		return subprices[value - 1];
	}

	function calculateCredit(value) {
		return credits[value - 1];
	}

	function formatNumber(value, currency) {
		// Determine the locale based on the currency
		let locale;
		switch (currency) {
			case 'USD':
				locale = 'en-US'; // United States Dollar
				break;
			case 'EUR':
				locale = 'de-DE'; // Euro
				break;
			case 'GBP':
				locale = 'en-GB'; // British Pound
				break;
			case 'TRY':
				locale = 'tr-TR'; // Turkish Lira
				break;
			default:
				locale = 'en-US'; // Default to US English
		}

		// Format the number based on the determined locale
		return new Intl.NumberFormat(locale, {
			style: 'decimal',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(value);
	}

	async function createPayment() {
		let selectedCurrency = 'USD';

		const sliderElement = document.getElementById("slider");
		const subscriptionMode = document.getElementById("subscription-mode");
		const creditsMode = document.getElementById("credits-mode");
		const currencyOptions = document.querySelectorAll(".background-dot-container-option[data-currency]");
		const dailyPriceAmountElement = document.getElementById("cost-per-day");
		const discountElement = document.getElementById("discount");
		const discountDetailsElement = document.getElementById("discount-details");
		const purchase = document.getElementById("purchase");

		function updatePrices() {
			updateSliderRange();
			const value = sliderElement.value;
			const isCreditsMode = creditsMode.classList.contains("selected");
			const isSubscriptionMode = subscriptionMode.classList.contains("selected");
			const currencySymbol = getCurrencySymbol(selectedCurrency);

			updateFeatureList(isCreditsMode);

			let dailyPriceAmount;
			let priceInSelectedCurrency;
			let displayText;
			let discountMessage = '';

			if (isCreditsMode) {
				const price = calculatePrice(value);
				const creditAmount = calculateCredit(value);
				dailyPriceAmount = creditAmount > 0 ? Math.max(0, price / creditAmount) : null;

				priceInSelectedCurrency = price;
				if (selectedCurrency !== 'USD' && selectedCurrency !== 'BTC' && conversionRates) {
					priceInSelectedCurrency = price * conversionRates[selectedCurrency];
					if (dailyPriceAmount !== null) {
						dailyPriceAmount *= conversionRates[selectedCurrency];
					}
				}

				displayText = `${currencySymbol}${formatNumber(dailyPriceAmount, selectedCurrency)} `;
				updateCapabilityList(creditAmount, formatNumber(dailyPriceAmount, selectedCurrency), currencySymbol, isSubscriptionMode);

				const basePrice = prices[0];
				const baseCredits = credits[0];
				const totalBasePrice = (basePrice / baseCredits) * credits;
				let discount = Math.max(0, totalBasePrice - price);

				if (selectedCurrency !== 'USD' && selectedCurrency !== 'BTC' && conversionRates) {
					discount *= conversionRates[selectedCurrency];
				}

				document.getElementById('cost-per-day-unit').textContent = '/credit';
				discountMessage = 'You can spend your credits anytime.';
				discountDetailsElement.textContent = `Total payment is ${currencySymbol}${formatNumber(priceInSelectedCurrency, selectedCurrency)}.`;

				dailyPriceAmountElement.textContent = displayText;
				if (discountElement)
					discountElement.textContent = discountMessage;
			} else {
				const price = calculateSubPrice(value);
				const durationDays = durationsInDays[value - 1];
				dailyPriceAmount = durationDays > 0 ? Math.max(0, price / durationDays) : null;

				priceInSelectedCurrency = price;
				if (selectedCurrency !== 'USD' && selectedCurrency !== 'BTC' && conversionRates) {
					priceInSelectedCurrency = price * conversionRates[selectedCurrency];
					if (dailyPriceAmount !== null) {
						dailyPriceAmount *= conversionRates[selectedCurrency];
					}
				}

				updateCapabilityList(0, 0, 0, isSubscriptionMode);

				displayText = durationDays === -1 ? `${currencySymbol}${formatNumber(priceInSelectedCurrency, selectedCurrency)}` : `${currencySymbol}${formatNumber(dailyPriceAmount, selectedCurrency)}`;
				document.getElementById('cost-per-day-unit').textContent = '/day';

				if (durationDays === -1) {
					document.getElementById('cost-per-day-unit').textContent = '';
					discountMessage = 'Use our products without credit limitations.';
					discountDetailsElement.textContent = '';
				} else {
					const daysInPeriod = durationsInDays[0];
					const costForPeriod = prices[0] * (durationDays / daysInPeriod);
					let discount = costForPeriod - price;

					if (selectedCurrency !== 'USD' && selectedCurrency !== 'BTC' && conversionRates) {
						discount *= conversionRates[selectedCurrency];
					}

					discountMessage = 'Use our products without credit limitations.';
					discountDetailsElement.textContent = `Total payment is ${currencySymbol}${formatNumber(priceInSelectedCurrency, selectedCurrency)}`;
				}

				dailyPriceAmountElement.textContent = displayText;
				if (discountElement)
					discountElement.textContent = discountMessage;
			}
		}

		function getCurrencySymbol(currency) {
			const symbols = { USD: '$', EUR: '€', GBP: '£', TRY: '₺', BTC: '₿' };
			return symbols[currency] || currency;
		}

		currencyOptions.forEach(option => {
			option.addEventListener("click", () => {
				currencyOptions.forEach(opt => opt.classList.remove("selected"));
				option.classList.add("selected");

				selectedCurrency = option.getAttribute("data-currency");
				updatePrices();
			});
		});

		function updateSliderRange() {
			const isCreditsMode = creditsMode.classList.contains("selected");
			if (isCreditsMode) 
				sliderElement.max = credits.length;
			else sliderElement.max = durations.length;
			
			// Ensure the current value is within the new range
			const currentValue = sliderElement.value;
			if (currentValue > sliderElement.max) 
				sliderElement.value = sliderElement.max;
		}

		function updateSliderValue() {
			const value = sliderElement.value;
			const isCreditsMode = creditsMode.classList.contains("selected");
			if (isCreditsMode) {
				const creditAmount = calculateCredit(value);
				sliderElement.nextElementSibling.textContent = `${creditAmount} credit${creditAmount > 1 ? 's' : ''}`;
			} else {
				const selectedDuration = durations[value - 1];
				sliderElement.nextElementSibling.textContent = selectedDuration;
			}

			updatePrices();
		}

		sliderElement.addEventListener("input", updateSliderValue);

		subscriptionMode.addEventListener("click", () => {
			subscriptionMode.classList.add("selected");
			creditsMode.classList.remove("selected");
			updateSliderRange(); // Update slider range for subscription mode
			updateSliderValue();
		});

		creditsMode.addEventListener("click", () => {
			creditsMode.classList.add("selected");
			subscriptionMode.classList.remove("selected");
			updateSliderRange(); // Update slider range for credits mode
			updateSliderValue();
		});

		updateSliderRange();
		updateSliderValue();

		purchase.addEventListener("click", async () => { await handleBuyNow(); });

		async function handleBuyNow() {
			{
				try {
					const user = await new Promise((resolve) => {
						const unsubscribe = auth.onAuthStateChanged((user) => {
							unsubscribe(); // Unsubscribe once we have the user object
							resolve(user);
						});
					});

					// Check the selected mode
					let selectedMode = '';
					if (subscriptionMode.classList.contains("selected")) {
						selectedMode = 'subscription';
					} else {
						selectedMode = 'credits';
					}

					// Check if the user is authenticated
					if (user) {
						const requestData = {
							userId: auth.currentUser.uid,
							userEmail: auth.currentUser.email,
							selectedCurrency: selectedCurrency,
							sliderElement: sliderElement.value,
							selectedMode: selectedMode,
						};

						if (selectedCurrency !== 'BTC') {
							const cardResponse = await fetch(serverAddressPAYTR + '/create-charge-2', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify(requestData)
							});

							const cardHtml = await cardResponse.text();
							if (cardHtml.error) {
								alert(cardHtml.error);
							} else {
								document.getElementById('paymentContainer').style.display = 'block';
								document.getElementById('paymentContainer').innerHTML = cardHtml;
							}
						} else {
							// Pay with coin.
							const coinResponse = await fetch(serverAddressAPI + '/create-charge-new', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify(requestData)
							});

							const coinData = await coinResponse.json();
							console.log('Response from server:', coinData);

							if (coinData.data && coinData.data.hosted_url) {
								// Open the Coinbase Commerce payment page in a new tab
								window.open(coinData.data.hosted_url, '_blank');
							} else {
								alert(coinData.error);
							}
						}
					}
				} catch (error) {
					console.error('Error checking referral:', error);
				}
			}
		}
	}

	createPayment();

	window.addEventListener('resize', createPayment);
});