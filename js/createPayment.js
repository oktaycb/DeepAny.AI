import { auth, serversRef } from './firebase/firebase-config.js';
import { getCache, setCache } from './timeLimitedCache.js';

document.addEventListener("DOMContentLoaded", async function () {
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

	// SVG icons for the feature list
	const checkmarkIcon = `
		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
			<path d="M20 6 9 17l-5-5"></path>
		</svg>
	`;

	const xIcon = `
		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x plans_x__KKb0t">
			<path d="M18 6 6 18"></path>
			<path d="m6 6 12 12"></path>
		</svg>
	`;

	// Capabilities data
	const capabilities = {
		faceSwap: {
			name: "Face Swap Video",
			formula: (credits) =>
				`${Math.floor((credits * 60) / (30 * 60))} minutes of video (30fps)`,
		},
		imageSwap: {
			name: "Image Swap",
			formula: (credits) => `${credits} images`,
		},
		inpainter: {
			name: "Inpainter",
			formula: (credits) =>
				`${Math.floor(credits / 4)} generations`,
		},
		artGeneration: {
			name: "Art Generation",
			formula: (credits) => `${credits} art pieces`,
		},
	};

	// Function to update the capabilities list
	function updateCapabilityList(credits, isSubscriptionMode) {
		const capabilityListElement = document.getElementById("capability-list");

		// Clear previous content
		capabilityListElement.innerHTML = "";

		// If in subscription mode, display unlimited for all capabilities, specific limit for video
		if (isSubscriptionMode) {
			const faceSwapElement = document.createElement("p");
			faceSwapElement.classList.add("capability");
			faceSwapElement.innerHTML = `
            ${capabilities.faceSwap.name}: 2 hour per process (30fps)
        `;
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
            ${capability.name}: ${capability.formula(credits)}
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

	async function createPayment() {
		// Fetch conversion rates from Frankfurter API
		let selectedCurrency = 'USD';

		// These data's are needed in server to determine the payment type.
		const sliderElement = document.getElementById("slider");
		const subscriptionMode = document.getElementById("subscription-mode");
		const creditsMode = document.getElementById("credits-mode");

		// These data's are not usefull for server-side but client-side, helps user to select a better plan.
		const currencyOptions = document.querySelectorAll(".background-dot-container-option[data-currency]");
		const dailyPriceAmountElement = document.getElementById("cost-per-day");
		const discountElement = document.getElementById("discount");
		const discountDetailsElement = document.getElementById("discount-details");
		const purchase = document.getElementById("purchase");

		// Initial prices and durations
		let credits = [250, 500, 1000, 2500, 5000, 10000, 25000, 50000];
		let prices = [14.99, 24.99, 44.99, 99.99, 174.99, 299.99, 624.99, 999.99];
		let durationsInDays = [1, 7, 30, 90, 365, -1];
		let subprices = [99.99, 49.99 * durationsInDays[1], 24.99 * durationsInDays[2], 9.99 * durationsInDays[3], 4.99 * durationsInDays[4], 1499.99];
		const durations = ["1 day", "1 week", "1 month", "3 months", "1 year", "Lifetime"];

		function calculatePrice(value) {
			return prices[value - 1];
		}

		function calculateSubPrice(value) {
			return subprices[value - 1];
		}

		function calculateCredit(value) {
			return credits[value - 1];
		}

		function formatNumber(value, precision) {
			if (value === 0) return '0';
			return Number(value).toFixed(precision).replace(/\.?0+$/, '');
		}


		function updatePrices() {
			if (!conversionRates) return;

			updateSliderRange();
			const value = sliderElement.value;
			const isCreditsMode = creditsMode.classList.contains("selected");
			const isSubscriptionMode = subscriptionMode.classList.contains("selected");
			const currencySymbol = getCurrencySymbol(selectedCurrency);

			// Update the feature list based on the mode
			updateFeatureList(isCreditsMode);

			let dailyPriceAmount;
			let priceInSelectedCurrency;
			let displayText;
			let discountMessage = '';

			// Calculate cost per day and discount based on mode
			if (isCreditsMode) {
				const price = calculatePrice(value);
				const creditAmount = calculateCredit(value);
				dailyPriceAmount = creditAmount > 0 ? Math.max(0, price / creditAmount) : null;

				// Update the capability list based on the current credits and mode
				updateCapabilityList(creditAmount, isSubscriptionMode);

				priceInSelectedCurrency = price;
				if (selectedCurrency !== 'USD' && selectedCurrency !== 'BTC') {
					priceInSelectedCurrency = price * conversionRates[selectedCurrency];
					if (dailyPriceAmount !== null) {
						dailyPriceAmount *= conversionRates[selectedCurrency];
					}
				}

				displayText = `${currencySymbol}${formatNumber(dailyPriceAmount, 3)} `;

				const basePrice = prices[0];
				const baseCredits = credits[0];
				const totalBasePrice = (basePrice / baseCredits) * credits;
				let discount = Math.max(0, totalBasePrice - price); // Ensure discount is not negative

				if (selectedCurrency !== 'USD' && selectedCurrency !== 'BTC') {
					discount *= conversionRates[selectedCurrency];
				}

				document.getElementById('cost-per-day-unit').textContent = '/credit';
				discountMessage = 'You can spend your credits anytime.';
				discountDetailsElement.textContent = `Total payment is ${currencySymbol}${formatNumber(priceInSelectedCurrency, 3)}.`;

				dailyPriceAmountElement.textContent = displayText;
				if (discountElement)
					discountElement.textContent = discountMessage;
			} else {
				// Subscription mode
				const price = calculateSubPrice(value);
				const durationDays = durationsInDays[value - 1];
				dailyPriceAmount = durationDays > 0 ? Math.max(0, price / durationDays) : null;

				updateCapabilityList(0, isSubscriptionMode);

				priceInSelectedCurrency = price;
				if (selectedCurrency !== 'USD' && selectedCurrency !== 'BTC') {
					priceInSelectedCurrency = price * conversionRates[selectedCurrency];
					if (dailyPriceAmount !== null) {
						dailyPriceAmount *= conversionRates[selectedCurrency];
					}
				}

				displayText = durationDays === -1 ? `${currencySymbol}${formatNumber(priceInSelectedCurrency, 2)}` : `${currencySymbol}${formatNumber(dailyPriceAmount, 2)}`;
				document.getElementById('cost-per-day-unit').textContent = '/day';

				if (durationDays === -1) {
					// Lifetime plan
					document.getElementById('cost-per-day-unit').textContent = '';
					discountMessage = 'Use our products without credit limitations.';
					discountDetailsElement.textContent = '';
				} else {
					// Regular plans
					const daysInPeriod = durationsInDays[0]; // Assuming daily is always the first period
					const costForPeriod = prices[0] * (durationDays / daysInPeriod);
					let discount = costForPeriod - price;

					if (selectedCurrency !== 'USD' && selectedCurrency !== 'BTC') {
						discount *= conversionRates[selectedCurrency];
					}

					discountMessage = 'Use our products without credit limitations.';
					discountDetailsElement.textContent = `Total payment is ${currencySymbol}${formatNumber(priceInSelectedCurrency, 3)}`;
				}

				dailyPriceAmountElement.textContent = displayText;
				if (discountElement)
					discountElement.textContent = discountMessage;
			}
		}

		function getCurrencySymbol(currency) {
			const symbols = {
				USD: '$',
				EUR: '€',
				GBP: '£',
				TRY: '₺',
				BTC: '$',
			};
			return symbols[currency] || currency;
		}

		// Set event listeners for currency options
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

			if (isCreditsMode) {
				sliderElement.max = credits.length;
			} else {
				sliderElement.max = durations.length;
			}

			// Ensure the current value is within the new range
			const currentValue = sliderElement.value;
			if (currentValue > sliderElement.max) {
				sliderElement.value = sliderElement.max;
			}
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

		// Initial slider range update
		updateSliderRange();

		// Initial update
		updateSliderValue();

		// User clicked on purchase button
		purchase.addEventListener("click", async () => {
			await handleBuyNow();
		});

		// Function to handle charge creation and payment
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