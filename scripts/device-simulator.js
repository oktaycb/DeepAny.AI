// c:\Apache24\htdocs\scripts\device-simulator.js

class TensomarSimulator {
    constructor() {
        this.interval = null;
        this.deviceStates = {}; // Map of deviceId -> state variables
        this.fixedTension = null; // Used for testing overrides (Applies to all devices)

        // Listen for testing keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            // CTRL + SHIFT + V: Fixed 500kg
            if (e.ctrlKey && e.shiftKey && e.code === 'KeyV') {
                e.preventDefault();
                this.fixedTension = 500;
                console.log('[Tensomar Dev] Override: Fixed 500kg Tension');
            }
            // CTRL + SHIFT + X: Fixed 1000kg
            if (e.ctrlKey && e.shiftKey && e.code === 'KeyX') {
                e.preventDefault();
                this.fixedTension = 1000;
                console.log('[Tensomar Dev] Override: Fixed 1000kg Tension');
            }
            // CTRL + SHIFT + C: Random (Default behavior)
            if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
                e.preventDefault();
                this.fixedTension = null;
                console.log('[Tensomar Dev] Override: Restored Random Tension');
            }
        });
    }

    start() {
        if (this.interval) return;

        console.log("[Tensomar Simulator] Engine started. Emitting data every 2s.");
        // We run a tick immediately, then set interval
        this.tick();
        this.interval = setInterval(() => this.tick(), 2000);
    }

    stop() {
        clearInterval(this.interval);
        this.interval = null;
        console.log("[Tensomar Simulator] Engine stopped.");
    }

    tick() {
        const stored = localStorage.getItem('tensomar_mock_devices');
        const devices = stored ? JSON.parse(stored) : [];

        if (devices.length === 0) {
            // Emitting empty payload when no devices are registered
            const emptyData = { deviceId: 'NONE', tension: '--', peakTension: '--', temp: '--', moisture: '--', angle: '--', accel: '--' };
            window.dispatchEvent(new CustomEvent('device_data_update', { detail: emptyData }));
            return; // Skip data generation
        }

        // 1. Initialize states for new devices
        devices.forEach(dev => {
            if (!this.deviceStates[dev.id]) {
                this.deviceStates[dev.id] = {
                    baseTension: 650 + Math.random() * 50, // 650 - 700
                    baseTemp: 22 + Math.random() * 5,      // 22 - 27
                    baseMoisture: 10 + Math.random() * 5,  // 10 - 15
                    baseAngle: 12 + Math.random() * 6,     // 12 - 18
                    baseAccel: 0.15 + Math.random() * 0.1, // 0.15 - 0.25
                    peakTension: 690 + Math.random() * 40, // Starting peak
                    history: new Array(15).fill(675)       // Initialize history buffer
                };
            }
        });

        // 2. Clean up states for removed devices
        const deviceIds = devices.map(d => d.id);
        Object.keys(this.deviceStates).forEach(id => {
            if (!deviceIds.includes(id)) {
                delete this.deviceStates[id];
            }
        });

        // 3. Generate data for each active device
        devices.forEach(device => {
            const state = this.deviceStates[device.id];

            // Generate realistic but varying data
            let tension;
            if (this.fixedTension !== null) {
                tension = this.fixedTension; // Apply global override to all active testing nodes
            } else {
                tension = state.baseTension + (Math.random() * 40 - 20); // +/- 20kg variance
            }

            // Temperature rises slightly if tension is very high
            let tempChange = (Math.random() * 0.8 - 0.4);
            if (tension > 700) tempChange += 0.2;
            const temp = state.baseTemp + tempChange;

            const moisture = state.baseMoisture + (Math.random() * 0.4 - 0.2);
            const angle = state.baseAngle + (Math.random() * 1.0 - 0.5);
            const accel = state.baseAccel + (Math.random() * 0.08 - 0.02);

            if (tension > state.peakTension) {
                state.peakTension = tension;
            }

            state.history.push(parseFloat(tension.toFixed(1)));
            if (state.history.length > 15) state.history.shift();

            const data = {
                deviceId: device.id,
                deviceName: device.name,
                deviceMac: device.mac,
                tension: parseFloat(tension.toFixed(1)),
                peakTension: parseFloat(state.peakTension.toFixed(1)),
                temp: parseFloat(temp.toFixed(1)),
                moisture: parseFloat(moisture.toFixed(1)),
                angle: parseFloat(angle.toFixed(1)),
                accel: parseFloat(accel.toFixed(2)),
                history: [...state.history]
            };

            const event = new CustomEvent('device_data_update', { detail: data });
            window.dispatchEvent(event);

            // --- Alert Generation Logic ---
            const settingsRaw = localStorage.getItem('tensomar_mock_settings_' + device.id);
            const config = settingsRaw ? JSON.parse(settingsRaw) : {};
            const threshold = config.intensity ? parseInt(config.intensity) : 500;

            // Generate an alert if tension is over the configured threshold
            if (tension > threshold) {
                // Check if we are already in cooldown to prevent spamming the DOM Alerts array too much
                const cooldownMs = config.cooldown ? parseInt(config.cooldown) : 300000;
                const lastPushKey = 'tensomar_last_push_time_' + device.id;
                const lastPushTime = parseInt(localStorage.getItem(lastPushKey) || "0");
                const now = Date.now();

                if (now - lastPushTime >= cooldownMs) {
                    this.generateAlert(
                        device,
                        'warning',
                        'warning',
                        `Peak Tension: ${device.name}`,
                        `Tension reached ${data.tension}kg (Exceeds ${threshold}kg limit) on ${device.name}.`
                    );
                }
            }
        });
    }

    generateAlert(device, type, icon, title, message) {
        const storedAlerts = localStorage.getItem('tensomar_mock_alerts');
        const alerts = storedAlerts ? JSON.parse(storedAlerts) : [];

        alerts.unshift({ // Add to beginning
            id: Date.now(),
            deviceId: device.id,
            type,
            icon,
            title,
            message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        // Keep only last 10 alerts total
        if (alerts.length > 10) alerts.pop();

        localStorage.setItem('tensomar_mock_alerts', JSON.stringify(alerts));
        window.dispatchEvent(new CustomEvent('device_alert'));

        // --- Web Push Notification Logic ---
        this.triggerPushNotification(device, title, message);
    }

    triggerPushNotification(device, title, message) {
        if (!("Notification" in window) || Notification.permission !== "granted") return;

        const settingsRaw = localStorage.getItem('tensomar_mock_settings_' + device.id);
        const config = settingsRaw ? JSON.parse(settingsRaw) : {};

        // Default cooldown: 5 minutes (300000ms)
        const cooldownMs = config.cooldown ? parseInt(config.cooldown) : 300000;

        // Use device-specific cooldown tracking
        const lastPushKey = 'tensomar_last_push_time_' + device.id;
        const lastPushTime = parseInt(localStorage.getItem(lastPushKey) || "0");
        const now = Date.now();

        if (now - lastPushTime >= cooldownMs) {
            // [TESTING STAGE ONLY]: Ask for confirmation to prevent spam during development
            if (true/*confirm(`[TESTING] Trigger Desktop Push Notification for: "${title}"?\n(Next one blocked for ${cooldownMs / 1000} seconds)`)*/) {
                new Notification(`Tensomar: ${title}`, {
                    body: message,
                    icon: 'https://placeholder.pics/svg/200/D9E3F0-1152D4/1152D4/T' // Standardized icon for the PWA
                });
                localStorage.setItem(lastPushKey, now.toString());
                console.log(`[Tensomar Push] Notification fired for ${device.name}. Cooldown active for ${cooldownMs}ms.`);
            }
        } else {
            console.log(`[Tensomar Push] Event for ${device.name} suppressed due to rate limiting (cooldown: ${cooldownMs}ms).`);
        }
    }
}

// Auto-start for the dashboard simulation
window.tensomarSim = new TensomarSimulator();
window.tensomarSim.start();
