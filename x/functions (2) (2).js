async function startServer(config) {
	const express = require('express');
	const path = require('path');
	const admin = require('firebase-admin');
	const fs = require('fs');
	const axios = require('axios');
	const nodemailer = require('nodemailer');
	const sharp = require('sharp');
	const WebSocket = require('ws');
	const { v4: uuidv4 } = require('uuid');

	const util = require('util');

	const { execFile } = require('child_process');
	const execFileAsync = util.promisify(execFile)

	const { exec } = require("child_process");
	const execPromise = util.promisify(exec);

	const { spawn } = require('child_process');
	const spawnPromise = util.promisify(spawn);

	const app = express();
	app.use(express.static(__dirname));
	app.use((err, req, res, next) => {
		console.error(err.stack);

		if (res.headersSent) {
			next(err);
			return;
		}

		res.status(500).json({ server: 'Internal Server Error.' });
	});

	const corsOptions = {
		origin: [
			"https://deepany.ai",
			"http://localhost",
		],
		allowedHeaders: [
			"Origin",
			"X-Requested-With",
			"Content-Type",
			"Accept",
			"Authorization",
		],
		methods: "GET, HEAD, POST, PATCH, PUT, DELETE, OPTIONS",
		optionsSuccessStatus: 200
	};

	const cors = require('cors');
	app.use(cors());
	app.options(/.*/, cors({ maxAge: 86400 }));

	const STATUS_OK = 200;
	const STATUS_CREATED = 201;
	const STATUS_BADREQUEST = 400;
	const STATUS_NOTFOUND = 404;
	const MAX_TASK_LIMIT = 10;

	function sendBadStatus(res, data) {
		try {
			return res.status(STATUS_BADREQUEST).json(data);
		} catch (err) {
			console.error("Error caught Bad:", err);
		}
	}

	function sendOkStatus(res, data) {
		try {
			return res.status(STATUS_OK).json(data);
		} catch (err) {
			console.error("Error caught Ok:", err);
		}
	}

	const fileStatusCache = new Map();

	let currentDate = null;
	let currentDeadline = null;
	let shouldCheckCredits = false;
	let currentCredits = 0;
	let neededCredits = 0;
	let userEmail = '';
	let userName = '';
	let maskFailed = false;

	const serviceAccount = require('./serviceAccountKey.json');
	admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

	const db = admin.firestore();
	const usersRef = db.collection('users');
	const serversRef = db.collection('servers');
	const privateRef = db.collection('private');
	const totalsRef = db.collection('totals');

	async function updateProcessing() {
		try {
			const querySnapshot = await usersRef.where('isProcessingDN', '==', true).get();
			const updatePromises = [];

			querySnapshot.forEach(async (doc) => {
				const userDocRef = usersRef.doc(doc.id);
				updatePromises.push(userDocRef.update({ isProcessingDN: false }));
				console.log(`\x1b[32m[SERVER PROCESS] \x1b[0mUser Query set for ${doc.id})`);
			});

			await Promise.all(updatePromises);
			console.log(`\x1b[32m[SERVER PROCESS] \x1b[0mUpdated processing for ${updatePromises.length} users.`);
		} catch (error) {
			console.error('Error updating isProcessingDN for all users:', error);
		}
	}

	updateProcessing();

	const { execSync } = require('child_process');

	function hasAudioStream(videoPath) {
		try {
			const output = execSync(`ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=nw=1:nk=1 "${videoPath}"`);
			return !!output.toString().trim(); // true if any audio stream is found
		} catch {
			return false; // if ffprobe throws (e.g. no audio), return false
		}
	}

	function dedent(str) {
		const lines = str.replace(/\t/g, '    ').split('\n');
		const minIndent = lines
			.filter(line => line.trim().length)
			.reduce((min, line) => {
				const indent = line.match(/^ */)[0].length;
				return Math.min(min, indent);
			}, Infinity);

		return lines.map(line => line.slice(minIndent)).join('\n').trim();
	}

	async function getSendMailPass(user = 'support@deepany.ai') {
		try {
			const config = {
				service: 'Gmail',
				host: 'smtp.gmail.com',
				port: 465,
				secure: true,
				auth: { user, pass: '' },
			};

			switch (user) {
				case 'official@deepany.ai':
					config.auth.pass = 'cjqx rqsz ereo ogjz';
					break;
				case 'support@deepany.ai':
					config.auth.pass = 'ljdy rppr uhtx jkzk';
					break;
				case 'zeroduri02@gmail.com':
					config.auth.pass = 'qqot uozv kche bwtn';
					break;
				case 'durieun02@gmail.com':
					config.auth.pass = 'nywc mywa xyvq acqc';
					break;
				default:
					throw new Error('Unsupported email account');
			}

			return nodemailer.createTransport(config);
		} catch (error) {
			console.error("Error configuring transporter:", error);
			throw error;
		}
	}

	let lastUsedIndex = -1; // global variable to track last used sender

	async function sendEmail(text, to, subject) {
		const emailAccounts = [
			'official@deepany.ai',
			'support@deepany.ai',
			'durieun02@gmail.com',
			'zeroduri02@gmail.com'
		];

		const mailOptions = { from: '', to, subject, text: dedent(text) };
		let lastError = null;
		const totalAccounts = emailAccounts.length;

		for (let attempt = 0; attempt < totalAccounts; attempt++) {
			lastUsedIndex = (lastUsedIndex + 1) % totalAccounts;
			const account = emailAccounts[lastUsedIndex];

			try {
				mailOptions.from = account;
				const transporter = await getSendMailPass(account);
				const info = await transporter.sendMail(mailOptions);
				console.log(`[sendEmail] Email sent successfully from ${account}: ${info.response}`);
				return;
			} catch (err) {
				lastError = err;
				console.error(`Failed to send email from ${account}:`, err.message);
			}
		}

		throw lastError;
	}

	async function sendSatisfactionEmail(userDoc, totalsDoc, userId, userName, userEmail) {
		if (!userDoc.data().emailSent) {
			const message = `
Hello ${userName},

We hope you are enjoying using DeepAny.AI. We value your opinion and would like to know if you are satisfied with our system. Your feedback is important to us, and it helps us improve our services.

Unfortunately, we have noticed that your credits are finished, and you are unable to continue using the system. To continue using our services, you can either purchase more credits or visit free credits page to learn how to earn more credits.

We appreciate your support and look forward to hearing from you.

Best regards,
The DeepAny.AI Team - Duri Eun
		`;

			const subject = 'DeepAny.AI | Insufficient Credits';

			try {
				const sent = await sendEmail(message, userEmail, subject);
				if (sent) {
					await userDoc.ref.update({ emailSent: true });
				}
			} catch (err) {
				console.error(`[sendSatisfactionEmail] Failed to send to ${userEmail}:`, err.message);
			}
		}
	}

	async function sendAccountBlockedEmail(userDoc, totalsDoc, userName, userEmail, banReason) {
		const message = `
Hello ${userName},

We regret to inform you that your DeepAny.AI account has been blocked due to violation of our terms of service. Our records indicate the presence of duplicated accounts associated with your profile, which is strictly against our policies.

We take such matters seriously to ensure a fair and secure environment for all our users. If you believe this is an error, please contact our support team at this e-mail for further assistance.
				
Here is your ban reason: ${banReason}.
				
We appreciate your understanding and cooperation.

To automatically reactivate your account, please make a payment of more than $14.99. Once payment is confirmed, your account will be unblocked and will remain active.
				
Best regards,
The DeepAny.AI Team - Duri Eun
			`;

		const subject = 'DeepAny.AI | Violation of Terms of Service';

		try {
			await sendEmail(message, userEmail, subject);
		} catch (err) {
			console.error(`[sendAccountBlockedEmail] Failed to send to ${userEmail}:`, err.message);
		}
	}

	async function sendOutputEmail(downloadLink, userName, userEmail) {
		const message =
			`
Hello ${userName},

Your DeepAny.AI output is ready!

You can download your result from the following link:
${downloadLink}

If you prefer not to receive output emails in the future, you can disable the "Email output" option in your profile settings. Please note that if this option is turned off, we won't be able to resend the output via email, and we do not provide refunds in case the output is lost.

We hope you're enjoying your experience with DeepAny.AI! If you have any feedback, we'd love to hear it.

Best regards,  
The DeepAny.AI Team - Duri Eun`;

		const subject = 'DeepAny.AI | Video Generation Completed';

		try {
			await sendEmail(message, userEmail, subject);
		} catch (err) {
			console.error(`[sendOutputEmail] Failed to send to ${userEmail}:`, err.message);
		}
	}

	serversRef.doc(config.SERVER_1).update({ onDeepNude: false });
	serversRef.doc(config.SERVER_1).update({ deepNudeQueue: 0 });

	let isProcessing = false;
	let requestQueue = [];
	let previousFiles = [];

	const SERVER_IDS = ["DN", "DA", "DV"];

	function queueFile(serverId) {
		return path.join("./", `${serverId}_totalQueue_${config.GPU}.json`);
	}

	const totalQueueFile = queueFile(config.serverType);
	if (!fs.existsSync(totalQueueFile))
		fs.writeFileSync(totalQueueFile, JSON.stringify({ queue: 0 }));

	function setTotalQueue(length) {
		fs.writeFileSync(totalQueueFile, JSON.stringify({ queue: length }));
	}

	setTotalQueue(0);

	function getTotalQueue() {
		let max = 0;

		for (const id of SERVER_IDS) {
			try {
				const data = JSON.parse(fs.readFileSync(queueFile(id), "utf8"));
				if (typeof data.queue === "number" && data.queue > max)
					max = data.queue;
			} catch { }
		}

		return max;
	}

	async function fileExists(filePath, retries = 3, delay = 100) {
		const fullPath = path.resolve(filePath);

		for (let i = 0; i < retries; i++) {
			try {
				await fs.promises.access(fullPath, fs.constants.F_OK);
				return true; // file exists
			} catch {
				if (i < retries - 1) {
					// wait before next attempt
					await new Promise(resolve => setTimeout(resolve, delay));
				}
			}
		}

		return false; // file not found after all attempts
	}

	function containsProhibitedContent(input) {
		input = input.toLowerCase().trim().normalize("NFKC");

		const obfuscationMap = {
			'0': 'o',
			'1': 'i',
			'3': 'e',
			'4': 'a',
			'5': 's',
			'7': 't',
			'@': 'a',
			'$': 's',
			'&': 'and'
		};
		input = input.replace(/[013457@$&]/g, char => obfuscationMap[char] || char);
		const childRelatedKeywords = [
			/child/i,
			/kid/i,
			/loli/i,
			/minor/i,
			/underage/i,
			/preteen/i,
			/teenager/i,
			/toddler/i,
			/baby/i,
			/young girl/i,
			/young boy/i,
			/little girl/i,
			/little boy/i,
			/schoolgirl/i,
			/schoolboy/i,
			/youth/i,
			/infant/i
		];

		const adultContentKeywords = [
			/sex/i,
			/nsfw/i,
			/hentai/i,
			/porn/i,
			/erotic/i,
			/nude/i,
			/xxx/i,
			/explicit/i,
			/fetish/i,
			/lewd/i,
			/topless/i,
			/breast/i,
			/boobs/i,
			/nipples/i,
			/genital/i,
			/pussy/i,
			/vaginal/i,
			/penis/i,
			/blowjob/i,
			/cum/i,
			/orgy/i,
			/threesome/i,
			/anal/i,
			/masturbat/i,
			/dildo/i,
			/bondage/i,
			/bdsm/i,
			/squirting/i,
			/creampie/i,
			/gangbang/i,
			/bukkake/i,
			/pegging/i,
			/cuckold/i,
			/erotic/i,
			/sexual/i
		];

		const suspiciousPhrases = [
			/age gap/i,
			/barely legal/i,
			/teen erotica/i,
			/young and/i,
			/innocence/i,
			/illegal content/i,
			/under 18/i,
			/not an adult/i
		];

		const repeatedPattern = /(\b(?:child|kid|loli|minor|porn|sex|nude)\b).*\1/i;
		const hasChildKeywords = childRelatedKeywords.some(regex => regex.test(input));
		const hasAdultKeywords = adultContentKeywords.some(regex => regex.test(input));
		const hasSuspiciousPhrases = suspiciousPhrases.some(regex => regex.test(input));
		const hasRepeatedPattern = repeatedPattern.test(input);
		return hasChildKeywords && (hasAdultKeywords || hasSuspiciousPhrases || hasRepeatedPattern);
	}

	function containsAdultContent(input) {
		if (!input) return false;

		input = input
			.trim()
			.toLowerCase()
			.normalize("NFKC");

		const obfuscationMap = {
			'0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a', '5': 's', '6': 'g',
			'7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's', '&': 'and', '+': 't',
			'!': 'i', '|': 'i', '?': 'q'
		};
		input = input.replace(/[0-9@\$&\+!\|\?]/g, c => obfuscationMap[c] || c);
		input = input.replace(/(\w)\1{2,}/g, '$1$1');

		const adultRe = /\b(?:sex(?:ual(?:ly)?)?|porn(?:hub|tube)?|nsfw|hentai|erotic|nude|xxx|explicit|fetish|lewd|topless|breast|boobs?|nipples?|tits?|genitals?|pussy|vaginal|clit(?:oris)?|penis|cock|dick|asshole?|butt(?:plug)?|blowjob|handjob|footjob|cum(?:shot)?|orgy|gangbang|threesome|anal|rimming|cumhole|fisting|masturbat(?:e|ing)?|dildo|vibrator|bondage|bdsm|squirting|creampie|bukkake|pegging|cuckold|milf|stripper|escort|cam(?:girl|boy|site)?|webcam|scat|urinat(?:e|ion)|incest|rape|ped(?:o|ophile|ophilia)?|bestiality|zoophilia|orgasm)\b/i;
		return adultRe.test(input);
	}

	let processingAmount = null;
	let frameCount = null;
	let totalFrames = null;
	let elapsedTime = null;
	let remainingTime = null;

	async function processNextRequest() {
		const deleteOldFiles = (directory) => {
			fs.readdir(directory, (err, files) => {
				if (err) {
					console.error(`Error reading directory: ${err}`);
					return;
				}

				const now = Date.now();
				const twoDaysInMilliseconds = 6 * 60 * 60 * 1000;

				files.forEach((file) => {
					const filePath = path.join(directory, file);
					fs.stat(filePath, (err, stats) => {
						if (err) {
							console.error(`Error getting stats for file: ${err}`);
							return;
						}

						if (stats.isFile() && (now - stats.mtimeMs > twoDaysInMilliseconds)) {
							fs.rm(filePath, { force: true }, (err) => {
								if (err) {
									console.error(`Error removing file: ${err}`);
								} else {
									console.log(`Removed file: ${file}`);
								}
							});
						}
					});
				});
			});
		};

		(async () => {
			deleteOldFiles(path.join(__dirname, 'processing'));
			deleteOldFiles(path.join(__dirname, 'mask'));
			deleteOldFiles(path.join(__dirname, 'inpaint'));
			deleteOldFiles(path.join(__dirname, 'results'));
			deleteOldFiles(path.join(__dirname, 'videos'));
			deleteOldFiles(path.join(__dirname, 'output'));
			deleteOldFiles(path.join(__dirname, 'uploads'));
		})();

		fs.readdir(__dirname, (err, files) => {
			if (err) return console.error(err);

			files.forEach(file => {
				const filePath = path.join(__dirname, file);

				// check filename pattern
				if (/^\d+\.\d+$/.test(file)) {
					try {
						const stats = fs.statSync(filePath);

						// check size > 1 GB
						if (stats.isFile() && stats.size > 1 * 1024 * 1024 * 1024) {
							fs.rmSync(filePath, { force: true });
							console.log('Deleted large numeric crash file:', file);
						}
					} catch (e) {
						console.error('Error checking/deleting file:', filePath, e);
					}
				}
			});
		});

		if (requestQueue.length === 0) {
			setTotalQueue(requestQueue.length);
			didSentTheOutput = true;
			isProcessing = false;

			serversRef.doc(config.SERVER_1).update({ onDeepNude: false });
			serversRef.doc(config.SERVER_1).update({ deepNudeQueue: requestQueue.length });

			console.log(`\x1b[32m[QUEUE] \x1b[0mNo requests left to process`);
			return;
		}

		if (isProcessing) {
			console.log(`\x1b[33m[PROCESSNEXTREQUEST] \x1b[31m[WAITING RESPONSE] \x1b[0mA process is still running; the request is queued.`);
			return;
		}

		isProcessing = true;

		const request = requestQueue[0];
		const { req } = request;

		try {
			let { og, startFrameNumber, denoiseSkippingPercentage, promptOptimizations, invertMask, depthDetection, poseDetection, analyzeImage, userId, fileOutputId, removeBanner, positivePrompt, negativePrompt, positiveMaskPrompt, negativeMaskPrompt, modeSelector, randomizeSeed, losslessEncoder, duration, quality } = req.body;

			function processPrompt(prompt) {
				let lines = prompt.split(/\r?\n/).map(line => line.trim().replace(/,+/g, ','));
				let processedPrompt = lines.join(', ');
				return processedPrompt.endsWith(',') ? processedPrompt.slice(0, -1) : processedPrompt;
			}

			if (!positivePrompt || !positivePrompt.length) {
				positivePrompt = 'nude, completely nude, nsfw';
			}

			if (!negativePrompt || !negativePrompt.length) {
				negativePrompt = 'lowres, bad anatomy, bad hands, wet, text, error, missing finger, extra digits, fewer digits, cropped, worst quality, low quality, low score, bad score, average score, signature, watermark, username, blurry';
			}

			positivePrompt = processPrompt(positivePrompt);
			negativePrompt = processPrompt(negativePrompt);

			//console.log(positivePrompt);
			//console.log(negativePrompt);

			const imageMask = req.files.imageMask && req.files.imageMask !== 'null' ? req.files.imageMask[0] : null;
			const imageMaskPath = path.join(__dirname, `processing/${fileOutputId}_positive.png`);

			const referenceImage = req.files.referenceFile && req.files.referenceFile !== 'null' ? req.files.referenceFile[0] : null;
			const referenceImagePath = path.join(__dirname, `processing/${fileOutputId}_reference.png`);

			const imageFile = req.files.imageFile && req.files.imageFile !== 'null' ? req.files.imageFile[0] : null;
			const isGif = (() => {
				if (!imageFile) return false;
				const mt = (imageFile.mimetype || '').toLowerCase();
				if (mt.includes('gif')) return true;
				if (imageFile.buffer && imageFile.buffer.length >= 6) {
					const h = imageFile.buffer.slice(0, 6).toString('ascii');
					if (h === 'GIF87a' || h === 'GIF89a') return true;
				}
				if (imageFile.path) {
					try {
						const fd = fs.openSync(imageFile.path, 'r');
						const buf = Buffer.alloc(6);
						fs.readSync(fd, buf, 0, 6, 0);
						fs.closeSync(fd);
						const h = buf.toString('ascii');
						if (h === 'GIF87a' || h === 'GIF89a') return true;
					} catch (e) { }
				}
				return false;
			})();

			const extensionFile = (isGif || path.extname(imageFile.originalname).toLowerCase() === '.mp4')
				? 'mp4'
				: 'png';
			const isInputVideo = extensionFile === 'mp4';
			const imageFilePath = path.join(__dirname, `uploads/${config.PORT}.${extensionFile}`);

			if (imageFile !== null) {
				if (imageFile)
					await fs.promises.rename(imageFile.path, imageFilePath);

				if (referenceImage && referenceImage != 'null')
					await fs.promises.rename(referenceImage.path, referenceImagePath);

				if (imageMask && imageMask != 'null')
					await fs.promises.rename(imageMask.path, imageMaskPath);
			}

			try {
				await serversRef.doc(config.SERVER_1).update({ onDeepNude: isProcessing });
				await usersRef.doc(userId).update({ isProcessing });
			} catch (error) {
				console.error('Error updating document:', error);
			}

			const userDoc = await usersRef.doc(userId).get();
			const totalsDoc = await totalsRef.doc('data').get();

			if (!userDoc.exists)
				throw new Error(`User Not Found`);

			if (userDoc.data().isBanned)
				throw new Error(`Account Blocked`);

			userName = userDoc.data().username;
			currentCredits =
				((isNaN(userDoc.data().credits) || userDoc.data().credits === undefined) ? 0 : userDoc.data().credits) +
				((isNaN(userDoc.data().dailyCredits) || userDoc.data().dailyCredits === undefined) ? 0 : userDoc.data().dailyCredits) +
				((isNaN(userDoc.data().rewardCredits) || userDoc.data().rewardCredits === undefined) ? 0 : userDoc.data().rewardCredits); currentDate = new Date();
			currentDate = new Date();
			currentDeadline = [userDoc.data().deadline, userDoc.data().deadlineDN].filter(Boolean).map(d => d.toDate()).sort((a, b) => b - a)[0] || null;
			shouldCheckCredits = !userDoc.data().moderator && !userDoc.data().admin;

			if (containsProhibitedContent(positivePrompt) && shouldCheckCredits)
				throw new Error(`Prohibited Content`)

			const userCredential = await admin.auth().getUser(userId);
			if (!userCredential)
				throw new Error(`User Not Found`)

			userEmail = userCredential.email;
			if (!userCredential.emailVerified)
				throw new Error(`E-mail is not verified for ${userEmail}`);

			if (shouldCheckCredits && (currentDate > currentDeadline || !currentDeadline)) {
				neededCredits = 1;

				if (isInputVideo) {
					neededCredits *= Number(duration);
					neededCredits *= 1 + (Number(quality) - 1) * 0.5;
				}

				if (removeBanner === "true") neededCredits *= 2;

				neededCredits = Math.max(1, Math.round(neededCredits));
				if (currentCredits - neededCredits < 0) {
					//sendSatisfactionEmail(userDoc, totalsDoc, userId, userName, userEmail);
					throw new Error(`${userName} don't have enough credits. Buy ${neededCredits - currentCredits} credits or goto your profile to gain credits.`)
				}
			}
			else {
				neededCredits = 0;
			}

			maskFailed = false;
			didSentTheOutput = false;
			if (userName)
				userName = userName.replace(/\s/g, '');

			console.log(`\x1b[32m[PROCESSNEXTREQUEST] \x1b[32m[RESPONSE] \x1b[0mStarting the process for \x1b[32m${userName}\x1b[0m`);

			const outputPath = path.join(__dirname, `inpaint/${fileOutputId}.${extensionFile}`);

			let seed = randomizeSeed === 'true' ? Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) : 476262191439262;
			let length = Math.min(81, (16 * parseInt(duration)) + 1);
			let stepsVideo = Math.min(4, 2 + (1 * (parseInt(quality) - 1)));
			let stepsImage = Math.min(25, 10 + (5 * (parseInt(quality) - 1)));
			let endStepsImage = stepsImage;

			const skipPercent = denoiseSkippingPercentage; // e.g. 50
			if (skipPercent > 0) {
				const skipped = Math.max(1, Math.floor((stepsImage * skipPercent) / 100));
				endStepsImage = stepsImage - skipped;
			}

			let nodeCounter = 0;
			function addNode(payload, node) {
				if (payload === null)
					return 0;
				nodeCounter += 1;
				const key = String(nodeCounter);
				payload.prompt[key] = node;
				return key;
			}

			const clothingItems = [
				// Tops
				"cloth(es|ing)?", "shirt", "t[-\\s]?shirt", "tee", "blouse", "polo",
				"tank top", "crop top", "hoodie", "sweatshirt", "sweater", "cardigan",
				"vest", "jacket", "coat", "blazer", "suit jacket", "tube top", "halter top",
				"tunic", "shrug", "kimono top",

				// Bottoms
				"pants?", "trousers?", "jeans?", "shorts?", "leggings?", "joggers?",
				"sweatpants?", "skirt", "mini skirt", "maxi skirt", "chinos?", "cargos?",
				"culottes", "capris", "tights?", "sarong",

				// Full-body / Dresses
				"dress(es|ing)?", "gown", "jumpsuit", "romper", "overalls?", "uniform",
				"robe", "kimono", "saree|sari", "lehenga", "abaya", "hanbok",
				"qipao|cheongsam", "kaftan", "tunic dress", "pinafore",

				// Undergarments / Sleepwear
				"underwear", "briefs?", "boxers?", "bra", "pant(y|ies)", "lingerie",
				"camisole", "nightgown", "pajamas?", "slip", "corset", "bustier",
				"thong", "g-string", "bralette", "boxer briefs",

				// Swimwear
				"swimsuit", "bikini", "swim trunks?", "swim shorts?", "monokini", "tankini",

				// Footwear
				"shoes?", "sneakers?", "boots?", "sandals?", "flip[-\\s]?flops?", "slippers?",
				"loafers?", "heels?", "clogs?", "wedges?", "moccasins?", "oxfords?", "derbies?",
				"brogues?", "flats?", "ballet flats?", "espadrilles?", "thongs?",

				// Accessories
				"hat(s)?", "cap(s)?", "beanie", "bonnet", "turban", "bandana",
				"scarf(s|ves)?", "gloves?", "earmuffs", "socks?", "stockings?",
				"tie", "bow tie", "belt", "leg warmers?", "wristbands?"
			];

			// Build regex dynamically
			const clothingRegex = new RegExp(
				"\\b(" +
				clothingItems.map(item => item.replace(/\s+/g, "\\s*")).join("|") +
				")\\b",
				"i"
			);

			// imageFilePath
			// positivePrompt
			// negativePrompt
			// ckpt_name
			// length - 81
			// steps - 4
			// positiveMaskPrompt

			let payload = {
				prompt: {}
			};

			if (!isInputVideo) {
				const node0 = addNode(payload, {
					class_type: "LoadImage",
					inputs: {
						"image": imageFilePath
					}
				});

				const node1 = addNode(payload, {
					class_type: "WanVideoImageResizeToClosest",
					inputs: {
						"generation_width": 512,
						"generation_height": 512,
						"aspect_ratio_preservation": "keep_input",
						"image": [
							node0,
							0
						]
					}
				});

				let textReplaceIdx = -1;
				let positiveP = positivePrompt + ", masterpiece, high score, great score, absurdres, sharp focus";
				let negativeP = negativePrompt;

				if (analyzeImage === 'true') {
					const node2 = addNode(payload, {
						class_type: "DownloadAndLoadFlorence2Model",
						inputs: {
							"model": "MiaoshouAI/Florence-2-large-PromptGen-v2.0",
							"precision": "fp16",
							"attention": "sdpa",
							"convert_to_safetensors": true
						}
					});

					const node3 = addNode(payload, {
						class_type: "Florence2Run",
						inputs: {
							"text_input": "",
							"task": "prompt_gen_tags",
							"fill_mask": false,
							"keep_model_loaded": true,
							"max_new_tokens": 1024,
							"num_beams": 3,
							"do_sample": false,
							"output_mask_select": "",
							"seed": seed,
							"image": [
								node1,
								0
							],
							"florence2_model": [
								node2,
								0
							]
						}
					});

					const node4 = addNode(payload, {
						class_type: "FormatTags",
						inputs: {
							"metadata": [
								node3,
								2
							],
							"keep_words": "pants, stretching, ankle up, leg raise, leg up, breasts out, panties, navel, spread legs, medium breasts, ass, full body, sitting, 1girl, pussy, vagina, nsfw, solo, breasts, big breasts, big breast, large breasts, close-up, nipples, upper body, nude, uncensored"
						}
					});

					const node5 = addNode(payload, {
						class_type: "Florence2Run",
						inputs: {
							"text_input": "",
							"task": "prompt_gen_analyze",
							"fill_mask": false,
							"keep_model_loaded": true,
							"max_new_tokens": 1024,
							"num_beams": 3,
							"do_sample": false,
							"output_mask_select": "",
							"seed": seed,
							"image": [
								node1,
								0
							],
							"florence2_model": [
								node2,
								0
							]
						}
					});

					const node6 = addNode(payload, {
						class_type: "FormatCaptions",
						inputs: {
							"metadata": [
								node5,
								2
							],
							"skip_keys": "race,text,ear,hair style,hair_color,eye color,hair _style,eyes_color,hair_colour,hairst_color,hairstyle,eye _color,ear_color,hair_ style,eye_direction,image_composition,hair color,gender,hair _color,location,background,accessory,clothing,pants,shoes,hair_style,hair_color,facial_expression,ear"
						}
					});

					const node7 = addNode(payload, {
						class_type: "StringFunction|pysssss",
						inputs: {
							"action": "append",
							"tidy_tags": "yes",
							"text_a": [
								node4,
								0
							],
							"text_b": [
								node6,
								0
							],
							"text_c": positivePrompt + ", masterpiece, high score, great score, absurdres, sharp focus",
							"result": "1girl, solo, navel, portrait, photo realistic, full body, standing, slim, ship, yacht, boat, masterpiece, high score, great score, absurdres, sharp focus"
						}
					});

					textReplaceIdx = node7;

					if (positivePrompt.includes('nude') && promptOptimizations === 'true') {
						const node8 = addNode(payload, {
							class_type: "Text Find and Replace",
							inputs: {
								"find": "digital illustration",
								"replace": "2d, anime",
								"text": [
									textReplaceIdx,
									0
								]
							}
						});

						const node9 = addNode(payload, {
							class_type: "Text Find and Replace",
							inputs: {
								"find": "panties",
								"replace": "pussy",
								"text": [
									node8,
									0
								]
							}
						});

						const node10 = addNode(payload, {
							class_type: "Text Find and Replace",
							inputs: {
								"find": "full body",
								"replace": "pussy, breasts, nipples, full body",
								"text": [
									node9,
									0
								]
							}
						});

						const node11 = addNode(payload, {
							class_type: "Text Find and Replace",
							inputs: {
								"find": "pants",
								"replace": "pussy",
								"text": [
									node10,
									0
								]
							}
						});

						textReplaceIdx = addNode(payload, {
							class_type: "Text Find and Replace",
							inputs: {
								"find": "breasts,",
								"replace": "breasts, nipples,",
								"text": [
									node11,
									0
								]
							}
						});
					}

					positiveP = addNode(payload, {
						class_type: "UniqueTags",
						inputs: {
							"metadata": [
								textReplaceIdx,
								0
							]
						}
					});

					const node17 = addNode(payload, {
						class_type: "FormatNegativeTags",
						inputs: {
							"metadata": [
								node5,
								2
							]
						}
					});

					const node18 = addNode(payload, {
						class_type: "StringConcatenate",
						inputs: {
							"string_a": [
								node17,
								0
							],
							"string_b": negativePrompt,
							"delimiter": ", "
						}
					});

					negativeP = addNode(payload, {
						class_type: "UniqueTags",
						inputs: {
							"metadata": [
								node18,
								0
							]
						}
					});
				}

				const ckpt_name = !modeSelector.includes('anime') ? "sdxl/inpainting/realistic/CyberRealisticV53-Inpaint-XL.safetensors" : "Waifu-Inpaint-XL-V-Prediction";
				let modelLoader = -1;
				if (!modeSelector.includes('anime')) {
					modelLoader = addNode(payload, {
						class_type: "CheckpointLoaderSimple",
						inputs: {
							"ckpt_name": ckpt_name
						}
					});
				} else {
					modelLoader = addNode(payload, {
						class_type: "DiffusersLoader",
						inputs: {
							"model_path": ckpt_name
						}
					});
				}

				let modelIdx = modelLoader;

				if (ckpt_name.includes("V-Prediction")) {
					modelIdx = addNode(payload, {
						class_type: "ModelSamplingDiscrete",
						inputs: {
							"model": [modelLoader, 0],
							"sampling": "v_prediction",
							"zsnr": true,
						}
					});
				}

				const node15 = addNode(payload, {
					class_type: "CLIPSetLastLayer",
					inputs: {
						"stop_at_clip_layer": -2,
						"clip": [
							modelLoader,
							1
						]
					}
				});

				const node16 = addNode(payload, {
					class_type: "CLIPTextEncode",
					inputs: {
						"text": analyzeImage !== 'true' ? positiveP : [
							positiveP,
							0
						],
						"clip": [
							node15,
							0
						]
					}
				});

				const node20 = addNode(payload, {
					class_type: "CLIPTextEncode",
					inputs: {
						"text": analyzeImage !== 'true' ? negativeP : [
							negativeP,
							0
						],
						"clip": [
							node15,
							0
						]
					}
				});

				const node22 = addNode(payload, {
					class_type: "DifferentialDiffusion",
					inputs: {
						"model": [
							modelIdx,
							0
						]
					}
				});

				const node23 = addNode(payload, {
					class_type: "WanVideoImageResizeToClosest",
					inputs: {
						"generation_width": 1024,
						"generation_height": 1024,
						"aspect_ratio_preservation": "keep_input",
						"image": [
							node0,
							0
						]
					}
				});

				const node24 = addNode(payload, {
					class_type: "SAM2ModelLoader (segment anything2)",
					inputs: {
						"model_name": "sam2_1_hiera_large.pt"
					}
				});

				const node25 = addNode(payload, {
					class_type: "GroundingDinoModelLoader (segment anything2)",
					inputs: {
						"model_name": "GroundingDINO_SwinB (938MB)"
					}
				});

				const node26 = addNode(payload, {
					class_type: "GroundingDinoSAM2Segment V2 (segment anything2)",
					inputs: {
						"prompt": positiveMaskPrompt,
						"threshold": 0.2,
						"confidence_threshold": -0.100,
						"negative_prompt": negativeMaskPrompt !== 'none' ? negativeMaskPrompt : '',
						"negative_threshold": 0.25,
						"negative_confidence_threshold": -0.25,
						"false_positive_prompt": clothingRegex.test(positiveMaskPrompt) ? "person" : "",
						"fp_threshold": 0.25,
						"fp_confidence_threshold": -0.25,
						"fp_similarity_threshold": 0.9,
						"comparison_resize_factor": 0.5,
						"resize_factor": 1,
						"min_acceptance_rule": true,
						"combine_multi_prompts": true,
						"skipper": 0,
						"detect_scene_change": false,
						"mask_similarity_threshold": 0.5,
						"sam_model": [
							node24,
							0
						],
						"grounding_dino_model": [
							node25,
							0
						],
						"image": [
							node1,
							0
						]
					}
				});

				const node27 = addNode(payload, {
					class_type: "MaskToImage",
					inputs: {
						"mask": [
							node26,
							0
						]
					}
				});

				const node28 = addNode(payload, {
					class_type: "ColorToMask",
					inputs: {
						"invert": invertMask !== 'true',
						"red": 0,
						"green": 0,
						"blue": 0,
						"threshold": 16,
						"per_batch": 16,
						"images": [
							node27,
							0
						]
					}
				});

				const node29 = addNode(payload, {
					class_type: "MaskFix+",
					inputs: {
						"erode_dilate": 0,
						"fill_holes": 0,
						"remove_isolated_pixels": invertMask !== 'true' ? 3 : 0,
						"smooth": 0,
						"blur": 0,
						"mask": [
							node28,
							0
						]
					}
				});

				const node30 = addNode(payload, {
					class_type: "MaskFix+",
					inputs: {
						"erode_dilate": 0,
						"fill_holes": invertMask !== 'true' ? 24 : 0,
						"remove_isolated_pixels": 0,
						"smooth": 0,
						"blur": 0,
						"mask": [
							node29,
							0
						]
					}
				});


				const node31 = addNode(payload, {
					class_type: "MaskFix+",
					inputs: {
						"erode_dilate": invertMask !== 'true' ? 16 : 0,
						"fill_holes": 0,
						"remove_isolated_pixels": 0,
						"smooth": 0,
						"blur": 0,
						"mask": [
							node30,
							0
						]
					}
				});

				let lastMaskFix = node31;

				const node32 = addNode(payload, {
					class_type: "ResizeMask",
					inputs: {
						"width": [
							node23,
							1
						],
						"height": [
							node23,
							2
						],
						"keep_proportions": false,
						"upscale_method": "bilinear",
						"crop": "disabled",
						"mask": [
							lastMaskFix,
							0
						]
					}
				});

				//console.log(!ckpt_name.includes("V-Prediction"));

				const node33 = addNode(payload, {
					class_type: "InpaintModelConditioning",
					inputs: {
						"noise_mask": !ckpt_name.includes("V-Prediction"),
						"positive": [
							node16,
							0
						],
						"negative": [
							node20,
							0
						],
						"vae": [
							modelLoader,
							2
						],
						"pixels": [
							node23,
							0
						],
						"mask": [
							node32,
							0
						]
					}
				});

				const node34 = addNode(payload, {
					class_type: "ControlNetLoader",
					inputs: {
						"control_net_name": "controlnet-union-sdxl-1.0-promax.safetensors"
					}
				});

				const node35 = addNode(payload, {
					class_type: "AV_ControlNetPreprocessor",
					inputs: {
						"preprocessor": "depth_metric3d",
						"sd_version": "sdxl",
						"resolution": 1024,
						"preprocessor_override": "None",
						"image": [
							node23,
							0
						]
					}
				});

				const node37 = addNode(payload, {
					class_type: "ControlNetLoader",
					inputs: {
						"control_net_name": "controlnet-zoe-depth-sdxl-1.0.safetensors"
					}
				});

				const node38 = addNode(payload, {
					class_type: "AV_ControlNetPreprocessor",
					inputs: {
						"preprocessor": "depth_zoe",
						"sd_version": "sdxl",
						"resolution": 1024,
						"preprocessor_override": "None",
						"image": [
							node23,
							0
						]
					}
				});


				const node40 = addNode(payload, {
					class_type: "ControlNetLoader",
					inputs: {
						"control_net_name": "noob-sdxl-controlnet-depth-midas-v1-1.safetensors"
					}
				});

				const node41 = addNode(payload, {
					class_type: "AV_ControlNetPreprocessor",
					inputs: {
						"preprocessor": "depth_midas",
						"sd_version": "sdxl",
						"resolution": 1024,
						"preprocessor_override": "None",
						"image": [
							node23,
							0
						]
					}
				});

				let clips = node33;

				if (depthDetection === 'true') {
					const node36 = addNode(payload, {
						class_type: "ControlNetApplyAdvanced",
						inputs: {
							"strength": 0.25,
							"start_percent": 0.1,
							"end_percent": 0.4,
							"positive": [
								node33,
								0
							],
							"negative": [
								node33,
								1
							],
							"control_net": [
								node34,
								0
							],
							"image": [
								node35,
								0
							],
							"vae": [
								modelLoader,
								2
							]
						}
					});

					const node39 = addNode(payload, {
						class_type: "ControlNetApplyAdvanced",
						inputs: {
							"strength": 0.25,
							"start_percent": 0.1,
							"end_percent": 0.4,
							"positive": [
								node36,
								0
							],
							"negative": [
								node36,
								1
							],
							"control_net": [
								node37,
								0
							],
							"image": [
								node38,
								0
							],
							"vae": [
								modelLoader,
								2
							]
						}
					});

					clips = addNode(payload, {
						class_type: "ControlNetApplyAdvanced",
						inputs: {
							"strength": 0.25,
							"start_percent": 0.1,
							"end_percent": 0.4,
							"positive": [
								node39,
								0
							],
							"negative": [
								node39,
								1
							],
							"control_net": [
								node40,
								0
							],
							"image": [
								node41,
								0
							],
							"vae": [
								modelLoader,
								2
							]
						}
					});
				}

				const node43 = addNode(payload, {
					class_type: "KSamplerAdvanced",
					inputs: {
						"add_noise": "enable",
						"noise_seed": seed,
						"steps": stepsImage,
						"cfg": 5,
						"sampler_name": "euler_ancestral",
						"scheduler": "simple",
						"start_at_step": 0,
						"end_at_step": endStepsImage,
						"return_with_leftover_noise": "disable",
						"model": [
							node22,
							0
						],
						"positive": [
							clips,
							0
						],
						"negative": [
							clips,
							1
						],
						"latent_image": [
							node33,
							2
						]
					}
				});

				const vaeDecode = addNode(payload, {
					class_type: "VAEDecode",
					inputs: {
						"samples": [
							node43,
							0
						],
						"vae": [
							modelLoader,
							2
						]
					}
				});

				const node45 = addNode(payload, {
					class_type: "AnyMaskBlend",
					inputs: {
						"blend": 50,
						"output": [
							vaeDecode,
							0
						],
						"image": [
							node23,
							0
						],
						"mask": [
							node32,
							0
						]
					}
				});

				addNode(payload, {
					class_type: "SaveImage",
					inputs: {
						"filename_prefix": fileOutputId,
						"images": [
							node45,
							0
						]
					}
				});
			}
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			// AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			else {
				const node0 = addNode(payload, {
					class_type: "VAELoaderKJ",
					inputs: {
						"vae_name": "wan_fp16.safetensors",
						"device": "main_device",
						"weight_dtype": "fp16"
					}
				});

				const node1 = addNode(payload, {
					class_type: "TorchCompileVAE",
					inputs: {
						"backend": "inductor",
						"fullgraph": false,
						"mode": "default",
						"compile_encoder": false,
						"compile_decoder": true,
						"vae": [
							node0,
							0
						]
					}
				});

				const node2 = addNode(payload, {
					class_type: "CLIPLoader",
					inputs: {
						"clip_name": "umt5_xxl_fp16.safetensors",
						"type": "wan",
						"device": "default"
					}
				});

				const node3 = addNode(payload, {
					class_type: "VHS_LoadVideo",
					inputs: {
						"video": imageFilePath,
						"force_rate": 16,
						"custom_width": 0,
						"custom_height": 0,
						"frame_load_cap": length,
						"skip_first_frames": startFrameNumber || 0,
						"select_every_nth": 1,
						"format": "Wan"
					}
				});

				const node4 = addNode(payload, {
					class_type: "MathExpression|pysssss",
					inputs: {
						"expression": "min(4 * floor((a - 1) / 4) + 1, 81)",
						"a": [
							node3,
							1
						]
					}
				});

				const node5 = addNode(payload, {
					class_type: "ImageFromBatch",
					inputs: {
						"batch_index": 0,
						"length": [
							node4,
							0
						],
						"image": [
							node3,
							0
						]
					}
				});

				const node6 = addNode(payload, {
					class_type: "WanVideoImageResizeToClosest",
					inputs: {
						"generation_width": 832,
						"generation_height": 480,
						"aspect_ratio_preservation": "keep_input",
						"image": [
							node5,
							0
						]
					}
				});

				const node7 = addNode(payload, {
					class_type: "ImageFromBatch",
					inputs: {
						"batch_index": 0,
						"length": 1,
						"image": [
							node6,
							0
						]
					}
				});

				let textReplaceIdx = -1;
				let positiveP = positivePrompt + ", masterpiece, high score, great score, absurdres, sharp focus";
				let negativeP = negativePrompt;

				if (analyzeImage === 'true') {
					const node8 = addNode(payload, {
						class_type: "DownloadAndLoadFlorence2Model",
						inputs: {
							"model": "MiaoshouAI/Florence-2-large-PromptGen-v2.0",
							"precision": "fp16",
							"attention": "sdpa",
							"convert_to_safetensors": true
						}
					});

					const node9 = addNode(payload, {
						class_type: "Florence2Run",
						inputs: {
							"text_input": "",
							"task": "prompt_gen_tags",
							"fill_mask": false,
							"keep_model_loaded": true,
							"max_new_tokens": 1024,
							"num_beams": 3,
							"do_sample": false,
							"output_mask_select": "",
							"seed": seed,
							"image": [
								node7,
								0
							],
							"florence2_model": [
								node8,
								0
							]
						}
					});

					const node10 = addNode(payload, {
						class_type: "FormatTags",
						inputs: {
							"metadata": [
								node9,
								2
							],
							"keep_words": "pants, stretching, ankle up, leg raise, leg up, breasts out, panties, navel, spread legs, medium breasts, ass, full body, sitting, 1girl, pussy, vagina, nsfw, solo, breasts, big breasts, big breast, large breasts, close-up, nipples, upper body, nude, uncensored"
						}
					});

					const node11 = addNode(payload, {
						class_type: "Florence2Run",
						inputs: {
							"text_input": "",
							"task": "prompt_gen_analyze",
							"fill_mask": false,
							"keep_model_loaded": true,
							"max_new_tokens": 1024,
							"num_beams": 3,
							"do_sample": false,
							"output_mask_select": "",
							"seed": seed,
							"image": [
								node7,
								0
							],
							"florence2_model": [
								node8,
								0
							]
						}
					});

					const node12 = addNode(payload, {
						class_type: "FormatCaptions",
						inputs: {
							"metadata": [
								node11,
								2
							],
							"skip_keys": "race,text,ear,hair style,hair_color,eye color,hair _style,eyes_color,hair_colour,hairst_color,hairstyle,eye _color,ear_color,hair_ style,eye_direction,image_composition,hair color,gender,hair _color,location,background,accessory,clothing,pants,shoes,hair_style,hair_color,facial_expression,ear"
						}
					});

					const node13 = addNode(payload, {
						class_type: "StringFunction|pysssss",
						inputs: {
							"action": "append",
							"tidy_tags": "yes",
							"text_a": [
								node10,
								0
							],
							"text_b": [
								node12,
								0
							],
							"text_c": positivePrompt + ", masterpiece, high score, great score, absurdres, sharp focus"
						}
					});

					textReplaceIdx = node13;

					if (positivePrompt.includes('nude') && promptOptimizations === 'true') {
						const node8 = addNode(payload, {
							class_type: "Text Find and Replace",
							inputs: {
								"find": "digital illustration",
								"replace": "2d, anime",
								"text": [
									textReplaceIdx,
									0
								]
							}
						});

						const node9 = addNode(payload, {
							class_type: "Text Find and Replace",
							inputs: {
								"find": "panties",
								"replace": "pussy",
								"text": [
									node8,
									0
								]
							}
						});

						const node10 = addNode(payload, {
							class_type: "Text Find and Replace",
							inputs: {
								"find": "full body",
								"replace": "pussy, breasts, nipples, full body",
								"text": [
									node9,
									0
								]
							}
						});

						const node11 = addNode(payload, {
							class_type: "Text Find and Replace",
							inputs: {
								"find": "pants",
								"replace": "pussy",
								"text": [
									node10,
									0
								]
							}
						});

						textReplaceIdx = addNode(payload, {
							class_type: "Text Find and Replace",
							inputs: {
								"find": "breasts,",
								"replace": "breasts, nipples,",
								"text": [
									node11,
									0
								]
							}
						});
					}

					positiveP = addNode(payload, {
						class_type: "UniqueTags",
						inputs: {
							"metadata": [
								textReplaceIdx,
								0
							]
						}
					});

					const node17 = addNode(payload, {
						class_type: "FormatNegativeTags",
						inputs: {
							"metadata": [
								node11,
								2
							]
						}
					});

					const node18 = addNode(payload, {
						class_type: "StringConcatenate",
						inputs: {
							"string_a": [
								node17,
								0
							],
							"string_b": negativePrompt,
							"delimiter": ", "
						}
					});

					negativeP = addNode(payload, {
						class_type: "UniqueTags",
						inputs: {
							"metadata": [
								node18,
								0
							]
						}
					});
				}

				const node15 = addNode(payload, {
					class_type: "CLIPSetLastLayer",
					inputs: {
						"stop_at_clip_layer": -2,
						"clip": [
							node2,
							0
						]
					}
				});

				const node16 = addNode(payload, {
					class_type: "CLIPTextEncode",
					inputs: {
						"text": analyzeImage !== 'true' ? positiveP : [
							positiveP,
							0
						],
						"clip": [
							node15,
							0
						]
					}
				});

				const node20 = addNode(payload, {
					class_type: "CLIPTextEncode",
					inputs: {
						"text": analyzeImage !== 'true' ? negativeP : [
							negativeP,
							0
						],
						"clip": [
							node15,
							0
						]
					}
				});

				const node21 = addNode(payload, {
					class_type: "UNETLoader",
					inputs: {
						"unet_name": "vace/vace_fp8_e4m3fn_scaled.safetensors",
						"weight_dtype": "default"
					}
				});

				/*const node22 = addNode(payload, {
					class_type: "wanBlockSwap",
					inputs: {
						"blocks_to_swap": 40,
						"offload_img_emb": false,
						"offload_txt_emb": false,
						"use_non_blocking": true,
						"model": [
							node21,
							0
						]
					}
				});*/

				const node23 = addNode(payload, {
					class_type: "LoraLoaderModelOnly",
					inputs: {
						"lora_name": "14b/t2v/boost/Wan21_T2V_14B_lightx2v_cfg_step_distill_lora_rank32.safetensors",
						"strength_model": 1,
						"model": [
							node21,
							0
						]
					}
				});

				/*const node24 = addNode(payload, {
					class_type: "PatchModelPatcherOrder",
					inputs: {
						"patch_order": "weight_patch_first",
						"full_load": "auto",
						"model": [
							node23,
							0
						]
					}
				});*/

				const node25 = addNode(payload, {
					class_type: "TorchCompileModelAdvanced",
					inputs: {
						backend: "inductor",
						fullgraph: false,
						mode: "default",
						dynamic: "auto",
						compile_transformer_blocks_only: true,
						dynamo_cache_size_limit: 1024,
						debug_compile_keys: false,
						model: [
							node23,
							0
						]
					}
				});

				const node26 = addNode(payload, {
					class_type: "ModelPatchTorchSettings",
					inputs: {
						"enable_fp16_accumulation": true,
						"model": [
							node25,
							0
						]
					}
				});

				const node27 = addNode(payload, {
					class_type: "WanVideoTeaCacheKJ",
					inputs: {
						"rel_l1_thresh": 0.10000000000000002,
						"start_percent": 1,
						"end_percent": 1,
						"cache_device": "offload_device",
						"coefficients": "i2v_480",
						"model": [
							node26,
							0
						]
					}
				});

				const node28 = addNode(payload, {
					class_type: "PathchSageAttentionKJ",
					inputs: {
						"sage_attention": "sageattn_qk_int8_pv_fp8_cuda++",
						"model": [
							node27,
							0
						]
					}
				});

				const node30 = addNode(payload, {
					class_type: "WanVideoNAG",
					inputs: {
						"nag_scale": 11,
						"nag_alpha": 0.25,
						"nag_tau": 2.5,
						"input_type": "default",
						"model": [
							node28,
							0
						],
						"conditioning": [
							node20,
							0
						]
					}
				});

				const node31 = addNode(payload, {
					class_type: "SAM2ModelLoader (segment anything2)",
					inputs: {
						"model_name": "sam2_1_hiera_large.pt"
					}
				});

				const node32 = addNode(payload, {
					class_type: "GroundingDinoModelLoader (segment anything2)",
					inputs: {
						"model_name": "GroundingDINO_SwinB (938MB)"
					}
				});

				const node33 = addNode(payload, {
					class_type: "GroundingDinoSAM2Segment V2 (segment anything2)",
					inputs: {
						"prompt": positiveMaskPrompt,
						"threshold": 0.2,
						"confidence_threshold": -0.100,
						"negative_prompt": negativeMaskPrompt !== 'none' ? negativeMaskPrompt : '',
						"negative_threshold": 0.25,
						"negative_confidence_threshold": -0.25,
						"false_positive_prompt": clothingRegex.test(positiveMaskPrompt) ? "person" : "",
						"fp_threshold": 0.25,
						"fp_confidence_threshold": -0.25,
						"fp_similarity_threshold": 0.9,
						"comparison_resize_factor": 0.5,
						"resize_factor": 1,
						"min_acceptance_rule": true,
						"combine_multi_prompts": true,
						"skipper": 1,
						"detect_scene_change": true,
						"mask_similarity_threshold": 0.5,
						"sam_model": [
							node31,
							0
						],
						"grounding_dino_model": [
							node32,
							0
						],
						"image": [
							node6,
							0
						]
					}
				});

				const node34 = addNode(payload, {
					class_type: "MaskToImage",
					inputs: {
						"mask": [
							node33,
							0
						]
					}
				});

				const node35 = addNode(payload, {
					class_type: "ColorToMask",
					inputs: {
						"invert": invertMask !== 'true',
						"red": 0,
						"green": 0,
						"blue": 0,
						"threshold": 16,
						"per_batch": 16,
						"images": [
							node34,
							0
						]
					}
				});

				const node36 = addNode(payload, {
					class_type: "MaskFix+",
					inputs: {
						"erode_dilate": 0,
						"fill_holes": 0,
						"remove_isolated_pixels": invertMask !== 'true' ? 3 : 0,
						"smooth": 0,
						"blur": 0,
						"mask": [
							node35,
							0
						]
					}
				});

				const node37 = addNode(payload, {
					class_type: "MaskFix+",
					inputs: {
						"erode_dilate": 0,
						"fill_holes": invertMask !== 'true' ? 24 : 0,
						"remove_isolated_pixels": 0,
						"smooth": 0,
						"blur": 0,
						"mask": [
							node36,
							0
						]
					}
				});

				const node38 = addNode(payload, {
					class_type: "MaskFix+",
					inputs: {
						"erode_dilate": invertMask !== 'true' ? 16 : 0,
						"fill_holes": 0,
						"remove_isolated_pixels": 0,
						"smooth": 0,
						"blur": 0,
						"mask": [
							node37,
							0
						]
					}
				});

				let lastMaskFix = node38;

				const node39 = addNode(payload, {
					class_type: "MaskToImage",
					inputs: {
						"mask": [
							lastMaskFix,
							0
						]
					}
				});

				const node40 = addNode(payload, {
					class_type: "ImageCompositeMasked",
					inputs: {
						"x": 0,
						"y": 0,
						"resize_source": true,
						"destination": [
							node6,
							0
						],
						"source": [
							node39,
							0
						],
						"mask": [
							lastMaskFix,
							0
						]
					}
				});

				const node42 = addNode(payload, {
					class_type: "ImageFromBatch",
					inputs: {
						"batch_index": 0,
						"length": 1,
						"image": [
							node39,
							0
						]
					}
				});

				const node43 = addNode(payload, {
					class_type: "ImageInvert",
					inputs: {
						"image": [
							node42,
							0
						]
					}
				});

				const ckpt_name = !modeSelector.includes('anime') ? "sdxl/inpainting/realistic/CyberRealisticV53-Inpaint-XL.safetensors" : "Waifu-Inpaint-XL-V-Prediction";
				let modelLoader = -1;
				if (!modeSelector.includes('anime')) {
					modelLoader = addNode(payload, {
						class_type: "CheckpointLoaderSimple",
						inputs: {
							"ckpt_name": ckpt_name
						}
					});
				} else {
					modelLoader = addNode(payload, {
						class_type: "DiffusersLoader",
						inputs: {
							"model_path": ckpt_name
						}
					});
				}

				let modelIdx = modelLoader;

				if (ckpt_name.includes("V-Prediction")) {
					modelIdx = addNode(payload, {
						class_type: "ModelSamplingDiscrete",
						inputs: {
							"model": [modelLoader, 0],
							"sampling": "v_prediction",
							"zsnr": true,
						}
					});
				}

				const node45 = addNode(payload, {
					class_type: "DifferentialDiffusion",
					inputs: {
						"model": [
							modelIdx,
							0
						]
					}
				});

				const node46 = addNode(payload, {
					class_type: "CLIPSetLastLayer",
					inputs: {
						"stop_at_clip_layer": -2,
						"clip": [
							modelLoader,
							1
						]
					}
				});

				const node47 = addNode(payload, {
					class_type: "CLIPTextEncode",
					inputs: {
						"text": analyzeImage !== 'true' ? positiveP : [
							positiveP,
							0
						],
						"clip": [
							node46,
							0
						]
					}
				});

				const node48 = addNode(payload, {
					class_type: "CLIPTextEncode",
					inputs: {
						"text": analyzeImage !== 'true' ? negativeP : [
							negativeP,
							0
						],
						"clip": [
							node46,
							0
						]
					}
				});

				const node49 = addNode(payload, {
					class_type: "ImageFromBatch",
					inputs: {
						"batch_index": 0,
						"length": 1,
						"image": [
							node3,
							0
						]
					}
				});

				const node50 = addNode(payload, {
					class_type: "WanVideoImageResizeToClosest",
					inputs: {
						"generation_width": 1024,
						"generation_height": 1024,
						"aspect_ratio_preservation": "keep_input",
						"image": [
							node49,
							0
						]
					}
				});

				const node51 = addNode(payload, {
					class_type: "MaskFromBatch+",
					inputs: {
						"start": 0,
						"length": 1,
						"mask": [
							lastMaskFix,
							0
						]
					}
				});

				const node52 = addNode(payload, {
					class_type: "ResizeMask",
					inputs: {
						"width": [
							node50,
							1
						],
						"height": [
							node50,
							2
						],
						"keep_proportions": false,
						"upscale_method": "bilinear",
						"crop": "disabled",
						"mask": [
							node51,
							0
						]
					}
				});

				const node53 = addNode(payload, {
					class_type: "InpaintModelConditioning",
					inputs: {
						"noise_mask": !ckpt_name.includes("V-Prediction"),
						"positive": [
							node47,
							0
						],
						"negative": [
							node48,
							0
						],
						"vae": [
							modelLoader,
							2
						],
						"pixels": [
							node50,
							0
						],
						"mask": [
							node52,
							0
						]
					}
				});

				const node54 = addNode(payload, {
					class_type: "ControlNetLoader",
					inputs: {
						"control_net_name": "controlnet-union-sdxl-1.0-promax.safetensors"
					}
				});

				const node55 = addNode(payload, {
					class_type: "AV_ControlNetPreprocessor",
					inputs: {
						"preprocessor": "depth_metric3d",
						"sd_version": "sdxl",
						"resolution": 1024,
						"preprocessor_override": "None",
						"image": [
							node50,
							0
						]
					}
				});

				const node57 = addNode(payload, {
					class_type: "ControlNetLoader",
					inputs: {
						"control_net_name": "controlnet-zoe-depth-sdxl-1.0.safetensors"
					}
				});

				const node58 = addNode(payload, {
					class_type: "AV_ControlNetPreprocessor",
					inputs: {
						"preprocessor": "depth_zoe",
						"sd_version": "sdxl",
						"resolution": 1024,
						"preprocessor_override": "None",
						"image": [
							node50,
							0
						]
					}
				});

				const node60 = addNode(payload, {
					class_type: "ControlNetLoader",
					inputs: {
						"control_net_name": "noob-sdxl-controlnet-depth-midas-v1-1.safetensors"
					}
				});

				const node61 = addNode(payload, {
					class_type: "AV_ControlNetPreprocessor",
					inputs: {
						"preprocessor": "depth_midas",
						"sd_version": "sdxl",
						"resolution": 1024,
						"preprocessor_override": "None",
						"image": [
							node50,
							0
						]
					}
				});

				let clips = node53;

				if (depthDetection === 'true') {
					const node56 = addNode(payload, {
						class_type: "ControlNetApplyAdvanced",
						inputs: {
							"strength": 0.25,
							"start_percent": 0.1,
							"end_percent": 0.4,
							"positive": [
								node53,
								0
							],
							"negative": [
								node53,
								1
							],
							"control_net": [
								node54,
								0
							],
							"image": [
								node55,
								0
							],
							"vae": [
								modelLoader,
								2
							]
						}
					});

					const node59 = addNode(payload, {
						class_type: "ControlNetApplyAdvanced",
						inputs: {
							"strength": 0.25,
							"start_percent": 0.1,
							"end_percent": 0.4,
							"positive": [
								node56,
								0
							],
							"negative": [
								node56,
								1
							],
							"control_net": [
								node57,
								0
							],
							"image": [
								node58,
								0
							],
							"vae": [
								modelLoader,
								2
							]
						}
					});

					clips = addNode(payload, {
						class_type: "ControlNetApplyAdvanced",
						inputs: {
							"strength": 0.25,
							"start_percent": 0.1,
							"end_percent": 0.4,
							"positive": [
								node59,
								0
							],
							"negative": [
								node59,
								1
							],
							"control_net": [
								node60,
								0
							],
							"image": [
								node61,
								0
							],
							"vae": [
								modelLoader,
								2
							]
						}
					});
				}

				const node63 = addNode(payload, {
					class_type: "KSamplerAdvanced",
					inputs: {
						"add_noise": "enable",
						"noise_seed": seed,
						"steps": stepsImage,
						"cfg": 5,
						"sampler_name": "euler_ancestral",
						"scheduler": "simple",
						"start_at_step": 0,
						"end_at_step": endStepsImage,
						"return_with_leftover_noise": "disable",
						"model": [
							node45,
							0
						],
						"positive": [
							clips,
							0
						],
						"negative": [
							clips,
							1
						],
						"latent_image": [
							node53,
							2
						]
					}
				});

				const node64 = addNode(payload, {
					class_type: "VAEDecode",
					inputs: {
						"samples": [
							node63,
							0
						],
						"vae": [
							modelLoader,
							2
						]
					}
				});

				const node66 = addNode(payload, {
					class_type: "AnyMaskBlend",
					inputs: {
						"blend": 50,
						"output": [
							node64,
							0
						],
						"image": [
							node50,
							0
						],
						"mask": [
							node52,
							0
						]
					}
				});

				const node67 = addNode(payload, {
					class_type: "ImageCompositeMasked",
					inputs: {
						"x": 0,
						"y": 0,
						"resize_source": true,
						"destination": [
							node43,
							0
						],
						"source": [
							node66,
							0
						],
						"mask": [
							node52,
							0
						]
					}
				});

				const node71 = addNode(payload, {
					class_type: "WanVaceToVideo",
					inputs: {
						"width": [
							node6,
							1
						],
						"height": [
							node6,
							2
						],
						"length": [
							node4,
							0
						],
						"batch_size": 1,
						"strength": 1,
						"positive": [
							node16,
							0
						],
						"negative": [
							node20,
							0
						],
						"vae": [
							node0,
							0
						],
						"control_video": [
							node40,
							0
						],
						"control_masks": [
							lastMaskFix,
							0
						],
						"reference_image": [
							node67,
							0
						]
					}
				});

				const node72 = addNode(payload, {
					class_type: "KSamplerAdvanced",
					inputs: {
						"add_noise": "enable",
						"noise_seed": seed,
						"steps": stepsVideo,
						"cfg": 1,
						"sampler_name": "euler",
						"scheduler": "beta",
						"start_at_step": 0,
						"end_at_step": 10000,
						"return_with_leftover_noise": "disable",
						"model": [
							node30,
							0
						],
						"positive": [
							node71,
							0
						],
						"negative": [
							node71,
							1
						],
						"latent_image": [
							node71,
							2
						]
					}
				});

				const node73 = addNode(payload, {
					class_type: "TrimVideoLatent",
					inputs: {
						"trim_amount": [
							node71,
							3
						],
						"samples": [
							node72,
							0
						]
					}
				});

				const node74 = addNode(payload, {
					class_type: "VRAM_Debug",
					inputs: {
						"empty_cache": true,
						"gc_collect": true,
						"unload_all_models": true,
						"any_input": [
							node73,
							0
						]
					}
				});

				const node75 = addNode(payload, {
					class_type: "VAEDecode",
					inputs: {
						"samples": [
							node74,
							0
						],
						"vae": [
							node0,
							0
						]
					}
				});

				const node76 = addNode(payload, {
					class_type: "AnyMaskBlend",
					inputs: {
						"blend": 50,
						"output": [
							node75,
							0
						],
						"image": [
							node6,
							0
						],
						"mask": [
							lastMaskFix,
							0
						]
					}
				});

				let images = [
					node76,
					0
				];

				const CONFIG_PATH = './nsfw_config.json';
				let CHECK_NSFW = false;

				if (!fs.existsSync(CONFIG_PATH)) {
					fs.writeFileSync(CONFIG_PATH, JSON.stringify({ CHECK_NSFW: false }, null, 2));
					console.log('[config] Created config.json with CHECK_NSFW=false');
				}

				const NSFW = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
				CHECK_NSFW = !!NSFW.CHECK_NSFW;

				if (og === "true") {
					CHECK_NSFW = false;
				}

				if (CHECK_NSFW) {
					const NSFWCheck = addNode(payload, {
						class_type: "FilterNsfw",
						inputs: {
							image: images,
							model_name: "nudenet (640)",
							threshold: 0.5,
							mode: "nsfw-chan",
							resolution: 8
						}
					});
					images = [NSFWCheck, 0];
				}

				addNode(payload, {
					class_type: "VHS_VideoCombine",
					inputs: {
						"frame_rate": 16,
						"loop_count": 0,
						"filename_prefix": fileOutputId,
						"format": "video/h264-mp4",
						"pix_fmt": "yuv420p",
						"crf": losslessEncoder === 'true' ? 0 : 18,
						"save_metadata": userName === 'durieun02',
						"trim_to_audio": true,
						"pingpong": false,
						"save_output": userName === 'durieun02',
						"images": [
							node76,
							0
						],
						"audio": [
							node3,
							2
						]
					}
				});
			}

			console.log(`\x1b[32m[PROCESSNEXTREQUEST] \x1b[32m[RESPONSE] \x1b[0mStarted the process for \x1b[32m${userName}\x1b[0m`);

			const client_id = uuidv4();
			let start_time = Date.now();

			async function queue_prompt(prompt) {
				const payload = { prompt, client_id };
				try {
					const response = await axios.post(`http://${config.URL}/prompt`, payload);
					return response.data;
				} catch (err) {
					console.error("Error queueing prompt:", err);
					fileStatusCache.set(fileOutputId, { status: 'failed', server: 'Queue Failed...' });
					throw err;
				}
			}

			async function get_image(filename, subfolder, folder_type) {
				const params = { filename, subfolder, type: folder_type };
				try {
					const response = await axios.get(`http://${config.URL}/view`, {
						params,
						responseType: 'arraybuffer' // to handle binary data
					});
					return Buffer.from(response.data);
				} catch (err) {
					console.error("Error fetching image:", err);
					fileStatusCache.set(fileOutputId, { status: 'failed', server: 'Fetching Failed...' });
					throw err;
				}
			}

			async function get_history(prompt_id) {
				try {
					const response = await axios.get(`http://${config.URL}/history/${prompt_id}`);
					return response.data;
				} catch (err) {
					console.error("Error fetching history:", err);
					fileStatusCache.set(fileOutputId, { status: 'failed', server: 'History Failed...' });
					throw err;
				}
			}

			async function get_outputs(ws, prompt) {
				const queueResponse = await queue_prompt(prompt);
				let prompt_id = queueResponse.prompt_id;
				const outputs = {};

				// Listen to WebSocket messages until execution is done.
				await new Promise((resolve) => {
					const messageHandler = (message) => {
						// If the message is not a string, convert it.
						if (typeof message !== 'string') {
							message = message.toString('utf8');
						}
						// If the message doesn't start with '{', skip it.
						if (!message.trim().startsWith('{')) {
							return;
						}

						let out;
						try {
							out = JSON.parse(message);
						} catch (e) {
							// If the message isn't valid JSON, ignore it.
							return;
						}

						switch (out.type) {
							case 'executing': {
								const data = out.data;
								if (data.node === null && data.prompt_id === prompt_id) {
									//ws.off('message', messageHandler);
									console.log(`\x1b[32m[PROCESSNEXTREQUEST] \x1b[0mExecution resolved`);
									resolve();
								}
								break;
							}
							case 'status': {
								const data = out.data;
								const queue_remaining = data.status.exec_info.queue_remaining;
								break;
							}
							case 'execution_start': {
								console.log(`\x1b[32m[PROCESSNEXTREQUEST] \x1b[0mExecution started`);
								break;
							}
							case 'executed': {
								const data = out.data;
								prompt_id = data.prompt_id;
								console.log(`\x1b[32m[PROCESSNEXTREQUEST] \x1b[0mExecution executed`);
								break;
							}
							case 'progress': {
								const data = out.data;
								frameCount = data.value;
								totalFrames = data.max;
								processingAmount = parseInt((frameCount / totalFrames) * 100, 10);

								if (frameCount === totalFrames)
									start_time = Date.now();

								const elapsed = Date.now() - start_time;

								let elapsedTime = '00:00';
								if (elapsed > 0) {
									const totalSeconds = Math.floor(elapsed / 1000);
									const minutes = Math.floor(totalSeconds / 60);
									const seconds = totalSeconds % 60;
									elapsedTime = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
								}

								let remainingTime = '00:00';
								if (data.value > 0 && data.value < data.max) {
									const avgPerFrame = elapsed / data.value;
									const remaining = Math.round(avgPerFrame * (data.max - data.value));
									const totalSeconds = Math.floor(remaining / 1000);
									const minutes = Math.floor(totalSeconds / 60);
									const seconds = totalSeconds % 60;
									remainingTime = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
								}

								console.log(
									`\x1b[32m[PROCESSNEXTREQUEST] \x1b[0mProgress ${processingAmount.toFixed(1)}% (${data.value}/${data.max}) – ETA ${elapsedTime}<${remainingTime}`
								);
								break;
							}
							default:
								break;
						}
					};
					ws.on('message', messageHandler);
				});

				// Fetch history and download outputs.
				const historyData = await get_history(prompt_id);
				const history = historyData[prompt_id];

				for (const node_id in history.outputs) {
					const node_output = history.outputs[node_id];
					const type = node_output.images || node_output.gifs;
					if (type) {
						const output = [];

						for (const image of type) {
							const image_data = await get_image(image.filename, image.subfolder, image.type);
							output.push(image_data);
						}

						outputs[node_id] = output;
					} else {
						console.error(`Node ${node_id} has no images.`); // Log if no images are found in the node
					}
				}

				return outputs;
			}

			async function runFfprobe(args) {
				return new Promise((resolve, reject) => {
					execFile('ffprobe', args, (err, stdout, stderr) => {
						if (err) return reject(new Error(`ffprobe error: ${err.message} ${stderr || ''}`));
						resolve(stdout);
					});
				});
			}

			async function getMediaDimensions(filePath) {
				const args = ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', filePath];
				const stdout = await runFfprobe(args);
				const parsed = JSON.parse(stdout);
				if (!parsed.streams || !parsed.streams.length) throw new Error('No video stream found');
				const w = parseInt(parsed.streams[0].width, 10);
				const h = parseInt(parsed.streams[0].height, 10);
				if (!w || !h) throw new Error('Could not determine width/height');
				return { width: w, height: h };
			}

			async function hasAudioStream(filePath) {
				const args = ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'json', filePath];
				try {
					const stdout = await runFfprobe(args);
					const parsed = JSON.parse(stdout);
					return parsed.streams && parsed.streams.length > 0;
				} catch {
					return false;
				}
			}

			async function processFile(imageBuffer) {
				const tempInputPath = path.join(__dirname, `inpaint/temp_${fileOutputId}.mp4`);
				await fs.promises.writeFile(tempInputPath, imageBuffer);

				let width = null;
				let height = null;
				let maskFailed = false;

				try {
					if (isInputVideo) {
						const dims = await getMediaDimensions(tempInputPath);
						width = dims.width; height = dims.height;
					} else {
						const metadata = await sharp(tempInputPath).metadata();
						width = metadata.width; height = metadata.height;
						const stats = await sharp(tempInputPath).stats();
						const allChannelsBlack = stats.channels.every(ch => ch.max === 0);
						maskFailed = allChannelsBlack;
						if (allChannelsBlack) throw new Error('Mask Failed');
					}

					const inputs = ['-i', tempInputPath];
					let filterComplex = null;
					let usedFilterComplex = false;

					if (removeBanner !== 'true') {
						const bannerImagePath = path.join(__dirname, 'banners', 'white_banner.png');
						if (!fs.existsSync(bannerImagePath)) throw new Error(`Banner image not found: ${bannerImagePath}`);
						inputs.push('-i', bannerImagePath);

						const bannerMeta = await sharp(bannerImagePath).metadata();
						const bannerWidth = bannerMeta.width;
						const bannerHeight = bannerMeta.height;

						let filters = [];
						if (isInputVideo) {
							const aspectRatio = width / height;
							const newBannerWidth = Math.round(
								bannerWidth * (aspectRatio >= 1
									? Math.min(Math.min(width / 3, bannerWidth) / bannerWidth, Math.min(height / 3, bannerHeight) / bannerHeight)
									: Math.min(Math.min(width / 2, bannerWidth) / bannerWidth, Math.min(height / 2, bannerHeight) / bannerHeight))
							);
							const newBannerHeight = Math.round(
								bannerHeight * (aspectRatio >= 1
									? Math.min(Math.min(width / 3, bannerWidth) / bannerWidth, Math.min(height / 3, bannerHeight) / bannerHeight)
									: Math.min(Math.min(width / 2, bannerWidth) / bannerWidth, Math.min(height / 2, bannerHeight) / bannerHeight))
							);

							filters = [
								`[1]scale=${newBannerWidth}:${newBannerHeight}[banner1]`,
								`[1]scale=${Math.round(bannerWidth * Math.min(Math.min(width / 1.2, bannerWidth) / bannerWidth, Math.min(height / 1.2, bannerHeight) / bannerHeight))}:${Math.round(bannerHeight * Math.min(Math.min(width / 1.2, bannerWidth) / bannerWidth, Math.min(height / 1.2, bannerHeight) / bannerHeight))},format=yuva420p,colorchannelmixer=aa=0.025[banner2]`,
								`[0][banner1]overlay=10:10[temp1]`,
								`[temp1][banner2]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2[outv]`
							];
						} else {
							const bannerScale = 0.5;
							const maxBannerWidth = width * bannerScale;
							const maxBannerHeight = height * bannerScale;
							const widthRatio = maxBannerWidth / bannerWidth;
							const heightRatio = maxBannerHeight / bannerHeight;
							const scaleFactor = Math.min(widthRatio, heightRatio);
							const newBannerWidth = Math.round(bannerWidth * scaleFactor);
							const newBannerHeight = Math.round(bannerHeight * scaleFactor);
							const faintBannerWidth = Math.round(bannerWidth * Math.min(width / 1.2, bannerWidth) / bannerWidth);
							const faintBannerHeight = Math.round(bannerHeight * Math.min(height / 1.2, bannerHeight) / bannerHeight);

							filters = [
								`[1]scale=${newBannerWidth}:${newBannerHeight}[banner1]`,
								`[1]scale=${faintBannerWidth}:${faintBannerHeight},format=yuva420p,colorchannelmixer=aa=0.025[banner2]`,
								`[0][banner1]overlay=10:10[temp1]`,
								`[temp1][banner2]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2[outv]`
							];
						}

						filterComplex = filters.join(';');
						usedFilterComplex = true;
					}

					const args = [...inputs];
					if (usedFilterComplex) args.push('-filter_complex', filterComplex);

					const audioPresent = await hasAudioStream(tempInputPath);

					if (isInputVideo) {
						if (!audioPresent) {
							args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
						}

						if (usedFilterComplex) {
							args.push('-map', '[outv]');
						} else {
							args.push('-map', '0:v:0');
						}

						if (audioPresent) {
							args.push('-map', '0:a:0');
						} else {
							const audioInputIndex = args.filter(x => x === '-i').length - 1;
							args.push('-map', `${audioInputIndex}:a:0`, '-shortest');
						}

						args.push('-r', 16, '-c:v', 'libx264', '-preset', 'veryfast');

						if (losslessEncoder === 'true') {
							args.push('-crf', '1', '-x264-params', 'lossless=1');
						} else {
							args.push('-crf', '18', '-profile:v', 'high', '-level:v', '4.2');
						}

						args.push('-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', '-f', 'mp4', outputPath);
					} else {
						if (usedFilterComplex) {
							args.push('-map', '[outv]', '-frames:v', '1', '-y', outputPath);
						} else {
							args.push('-frames:v', '1', '-y', outputPath);
						}
					}

					//console.log('FFmpeg args:', args.join(' '));

					await new Promise((resolve, reject) => {
						const ffmpegProcess = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
						let ffmpegError = '';
						ffmpegProcess.stderr.on('data', d => ffmpegError += d.toString());
						ffmpegProcess.on('close', code => {
							fs.unlink(tempInputPath, () => { });
							if (code === 0) resolve();
							else reject(new Error(`FFmpeg exited with code ${code}: ${ffmpegError}`));
						});
						ffmpegProcess.on('error', err => {
							fs.unlink(tempInputPath, () => { });
							reject(err);
						});
					});
				} catch (err) {
					await fs.promises.unlink(tempInputPath).catch(() => { });
					throw err;
				}
			}

			// Establish WebSocket connection.
			const wsUrl = `ws://${config.URL}/ws?clientId=${client_id}`;
			const ws = new WebSocket(wsUrl);

			let rejectWs;
			const wsClosed = new Promise((resolve, reject) => {
				rejectWs = reject;
				ws.on('close', () => {
					resolve();
				});
				ws.on('error', (err) => {
					console.error('WebSocket error:', err);
					reject(err);
				});
			});

			ws.on('open', () => {
				(async function handleOpen() {
					try {
						const outputs = await get_outputs(ws, payload.prompt);
						if (!outputs || Object.keys(outputs).length === 0) {
							fileStatusCache.set(fileOutputId, { status: 'failed', server: 'Output Not Found...' });
							console.error("No outputs received — output not found.");
							ws.close(); // Close immediately on error
							rejectWs(new Error("No outputs received — output not found."));
							return;
						}

						const lastNodeId = Object.keys(outputs).reverse().find(id => outputs[id]?.length > 0);
						const lastImageArray = lastNodeId ? outputs[lastNodeId] : null;

						if (lastImageArray && lastImageArray.length > 0) {
							fileStatusCache.set(fileOutputId, { status: 'processing', server: 'Finalising...' });
							await processFile(lastImageArray[0]);
							fileStatusCache.set(fileOutputId, { status: 'completed', server: 'Completed!' });
							console.log(`\x1b[32m[PROCESSNEXTREQUEST] \x1b[0mClosing WS after completion`);
							ws.close(); // Close after success
						} else {
							console.error("No image data in outputs.");
							fileStatusCache.set(fileOutputId, { status: 'failed', server: 'Process Failed...' });
							ws.close(); // Close on error
							rejectWs(new Error("No image data in outputs."));
							return;
						}
					} catch (err) {
						console.error('Error while handling outputs:', err);
						fileStatusCache.set(fileOutputId, { status: 'failed', server: 'Handling Failed...' });
						ws.close(); // Close on error
						rejectWs(err);
					}
				})();
			});

			await wsClosed;

			try {
				if (await fileExists(outputPath)) {
					const fileUrl = `${config.serverAddress}/download-output/${fileOutputId}`;

					if (req.body.emailOutput === "true") {
						sendOutputEmail(fileUrl, userName, userEmail)
					}

					if (
						shouldCheckCredits &&
						(currentDate > currentDeadline || !currentDeadline)
					) {
						let paidCredits = (isNaN(userDoc.data().credits) ? 0 : userDoc.data().credits) || 0;
						let dailyCredits = (isNaN(userDoc.data().dailyCredits) ? 0 : userDoc.data().dailyCredits) || 0;
						let rewardCredits = (isNaN(userDoc.data().rewardCredits) ? 0 : userDoc.data().rewardCredits) || 0;

						let totalCredits = paidCredits + dailyCredits + rewardCredits;
						let creditsUsedFromDaily = 0;
						let creditsUsedFromReward = 0;
						let creditsUsedFromPaid = 0;

						neededCredits = isNaN(neededCredits) ? 0 : neededCredits;
						if (neededCredits <= dailyCredits) {
							dailyCredits -= neededCredits;
							creditsUsedFromDaily = neededCredits;
						} else {
							creditsUsedFromDaily = dailyCredits;
							neededCredits -= dailyCredits;
							dailyCredits = 0;

							if (neededCredits <= rewardCredits) {
								rewardCredits -= neededCredits;
								creditsUsedFromReward = neededCredits;
							} else {
								creditsUsedFromReward = rewardCredits;
								neededCredits -= rewardCredits;
								rewardCredits = 0;

								paidCredits = Math.max(0, paidCredits - neededCredits);
								creditsUsedFromPaid = neededCredits;
							}
						}

						paidCredits = parseInt(paidCredits, 10);
						dailyCredits = parseInt(dailyCredits, 10);
						rewardCredits = parseInt(rewardCredits, 10);

						let logTotalCredits = totalCredits;
						let logConsumedCredits = neededCredits;

						try {
							await usersRef.doc(userId).update({
								credits: paidCredits,
								dailyCredits: dailyCredits,
								rewardCredits: rewardCredits
							});
						} catch (updateErr) {
							console.error(`Failed to update credits for user ${userName} (${userId}):`, updateErr);
							logTotalCredits = 'NULL';
							logConsumedCredits = 'NULL';
						} finally {
							try {
								const logFilePath = path.join(__dirname, 'creditsLog.txt');

								async function logCreditUsage({ username, totalCredits, consumedCredits, fileUrl, date }) {
									const logLine = `${username} | Total Credits: ${totalCredits} | Consumed Credits: ${consumedCredits} | URL: ${fileUrl} | ${date}\n`;
									try {
										await fs.promises.appendFile(logFilePath, logLine);
									} catch (err) {
										console.error("Failed to write to credits log:", err);
									}
								}

								const now = new Date().toISOString();

								await logCreditUsage({
									username: userName,
									totalCredits: logTotalCredits,
									consumedCredits: logConsumedCredits,
									fileUrl,
									date: now
								});
							} catch (logErr) {
								console.error(`Failed to write credits log for user ${userName} (${userId}):`, logErr);
							}
						}

						(async () => {
							if (totalCredits <= 0) {
								await sendSatisfactionEmail(userDoc, totalsDoc, userId, userName, userEmail);
							}
						})();

						previousFiles.push({
							settings: req.body
						});

						console.log(
							`\x1b[32m[FIREBASE-AUTH] \x1b[0mCredit To ${paidCredits + dailyCredits + rewardCredits
							} - Was ${totalCredits} - Decrease ${creditsUsedFromDaily + creditsUsedFromPaid} (Reward: ${creditsUsedFromReward}, Daily: ${creditsUsedFromDaily}, Paid: ${creditsUsedFromPaid})`
						);
					} else {
						console.log(
							`\x1b[32m[FIREBASE-AUTH] \x1b[0mNo need to consume credits for this user.`
						);
					}

					(async () => {
						const successfulDN = (userDoc.data().successfulDN || 0) + 1;
						await usersRef.doc(userId).update({ successfulDN });
					})();
				} else {
					console.error("No output found.");
				}
			} catch (updateErr) {
				console.error(updateErr.message);
			}
		} catch (error) {
			fileStatusCache.set(fileOutputId, { status: 'failed', server: error.message });
			console.error(`\x1b[31m[PROCESSNEXTREQUEST] \x1b[0mFailed output:`, error);
		} finally {
			isProcessing = false;

			const indexToRemove = requestQueue.findIndex(r => r?.req?.body?.userId === req?.body?.userId);
			if (indexToRemove !== -1) {
				requestQueue.splice(indexToRemove, 1)[0];
				setTotalQueue(requestQueue.length);
			}

			(async () => {
				try {
					if (indexToRemove !== -1) {
						await usersRef.doc(req.body.userId).update({ isProcessing });
					}
				} catch (error) { }

				try {
					await privateRef.doc(config.SERVER_1).update({ requestQueue: requestQueue.map(request => ({ userId: request?.req?.body?.userId, processToken: request?.req?.body?.processToken, language: request.req.headers['accept-language'] || 'Unknown', userAgent: request.req.headers['user-agent'] || 'Unknown', origin: request.req.headers['origin'] || 'Unknown', referer: request.req.headers['referer'] || request.req.headers['referrer'] || 'Unknown', host: request.req.headers['host'] || 'Unknown', ip: request.req.headers['x-forwarded-for'] || request.req.socket.remoteAddress, country: request.req.headers['cf-ipcountry'] || 'Unknown' })) });
				} catch (error) { }

				try {
					await serversRef.doc(config.SERVER_1).update({ requestQueue: requestQueue.map(request => ({ userId: request?.req?.body?.userId })) });
				} catch (error) { }

				try {
					await serversRef.doc(config.SERVER_1).update({ onDeepNude: isProcessing });
				} catch (error) { }

				try {
					await serversRef.doc(config.SERVER_1).update({ deepNudeQueue: requestQueue.length });
				} catch (error) { }
			})();

			processingAmount = null;
			frameCount = null;
			totalFrames = null;
			elapsedTime = null;
			remainingTime = null;

			console.log(`\x1b[32m[PROCESSNEXTREQUEST] \x1b[32m[RESPONSE] \x1b[0mFinished the process for \x1b[32m${userName}\x1b[0m`);
			return await processNextRequest();
		}
	}

	const multer = require('multer');
	const upload = multer({ dest: 'uploads/' });
	app.post('/start-process', upload.fields([
		{ name: 'imageFile', maxCount: 1 },
		{ name: 'imageMask', maxCount: 1 }
	]), async (req, res, next) => {
		const maintenanceFile = path.join(__dirname, `checkMaintaince_${config.GPU}.txt`);

		const allowedOrigins = corsOptions.origin;
		const country = req.headers['cf-ipcountry'] || 'Unknown';
		const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
		const userAgent = req.headers['user-agent'] || 'Unknown';
		const referer = req.headers['referer'] || req.headers['referrer'] || 'Unknown';
		const host = req.headers['host'] || 'Unknown';
		const origin = req.headers['origin'] || 'Unknown';
		const language = req.headers['accept-language'] || 'Unknown';
		const contentType = req.headers['content-type'] || 'Unknown';
		const contentLength = req.headers['content-length'] || 'Unknown';
		const cacheControl = req.headers['cache-control'] || 'Unknown';
		const connection = req.headers['connection'] || 'Unknown';
		const encoding = req.headers['accept-encoding'] || 'Unknown';
		const cookie = req.headers['cookie'] || 'None';
		const forwardedFor = req.headers['forwarded'] || 'None';
		const timestamp = new Date().toISOString();

		if (!allowedOrigins.includes(origin)) {
			res.status(STATUS_NOTFOUND).json({ server: `Origin that made a request (/start-process) isn't allowed: ${origin}.` });
			return;
		}

		res.setHeader('Access-Control-Allow-Origin', origin);
		res.setHeader('Access-Control-Allow-Methods', 'POST');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

		const imageFile = req.files && req.files.imageFile ? req.files.imageFile[0] : null;
		if (!imageFile) {
			res.status(STATUS_BADREQUEST).json({
				server: `Image Missing`,
			});
			return;
		}

		const isGif = (() => {
			if (!imageFile) return false;
			const mt = (imageFile.mimetype || '').toLowerCase();
			if (mt.includes('gif')) return true;
			if (imageFile.buffer && imageFile.buffer.length >= 6) {
				const h = imageFile.buffer.slice(0, 6).toString('ascii');
				if (h === 'GIF87a' || h === 'GIF89a') return true;
			}
			if (imageFile.path) {
				try {
					const fd = fs.openSync(imageFile.path, 'r');
					const buf = Buffer.alloc(6);
					fs.readSync(fd, buf, 0, 6, 0);
					fs.closeSync(fd);
					const h = buf.toString('ascii');
					if (h === 'GIF87a' || h === 'GIF89a') return true;
				} catch (e) { }
			}
			return false;
		})();

		const extensionFile = (isGif || path.extname(imageFile.originalname).toLowerCase() === '.mp4')
			? 'mp4'
			: 'png';
		const isInputVideo = extensionFile === 'mp4';

		const MAX_FILE_SIZE = 50 * 1024 * 1024;
		if (MAX_FILE_SIZE > 0 && imageFile.size > MAX_FILE_SIZE) {
			try {
				await fs.promises.access(imageFile.path);
				await fs.promises.unlink(imageFile.path);
			} catch (error) { }

			res.status(STATUS_BADREQUEST).json({
				server: `Max file size ${MAX_FILE_SIZE / (1024 * 1024)} MB.`,
			});
			return;
		}

		/*const { maskSelector, positiveMaskPrompt, negativeMaskSelector, negativeMaskPrompt } = req.body;
		const dynamicMaskPromptPositive = maskSelector === 'prompt' ? positiveMaskPrompt !== "null" ? positiveMaskPrompt : 'clothes' : maskSelector !== "null" ? maskSelector : 'clothes';	
		const dynamicMaskPromptNegative = negativeMaskSelector === 'negative-prompt-rectangle' ? negativeMaskPrompt : negativeMaskSelector;
		if (dynamicMaskPromptPositive === dynamicMaskPromptNegative || dynamicMaskPromptPositive === 'clothes' && dynamicMaskPromptNegative === 'clothing') {
			res.status(STATUS_BADREQUEST).json({
				server: `Same Positive and Negative mask`,
			});

			try {
				await fs.promises.access(imageFile.path);
				await fs.promises.unlink(imageFile.path);
			} catch (error) { }
			
			try {
				await fs.promises.access(imageMask.path);
				await fs.promises.unlink(imageMask.path);
			} catch (error) { }
			return;
		}*/

		const { userId, processToken, userUniqueInternetProtocolId, userInternetProtocolAddress, fileOutputId, positivePrompt, removeBanner, duration, quality } = req.body;
		if (!userId || !fileOutputId) {
			res.status(STATUS_BADREQUEST).json({
				server: `UID Missing`,
			});

			try {
				await fs.promises.access(imageFile.path);
				await fs.promises.unlink(imageFile.path);
			} catch (error) { }
			return;
		}

		function isNullOrUndefined(value) {
			return value === undefined || value === null || value === 'undefined' || value === 'null' || value === 'none';
		}

		if (isNullOrUndefined(processToken)) {
			return res.status(401).json({ error: "Token Not Found" });
		}

		try {
			const decoded = await admin.auth().verifyIdToken(processToken);
			if (!decoded || !decoded.uid || decoded.uid !== userId) {
				return res.status(403).json({ error: "Token Mismatch" });
			}
		} catch (error) {
			try {
				res.status(STATUS_BADREQUEST).json({ server: 'Invalid Token' });
				console.error(error.message);
			} catch (error) {
				console.error("Error occurred while sending response 4:", error);
			}
			return;
		}

		const removeKeys = (obj, keys) => {
			const newObj = { ...obj };
			keys.forEach(key => delete newObj[key]);
			return newObj;
		};

		let userDoc = await usersRef.doc(userId).get();

		const similarityInProcesses = await Promise.all(previousFiles.map(async (previous) => {
			const sameUID = previous.settings.userId && userId && previous.settings.userId === userId; // Means both are different account.
			const sameIpAdress = previous.settings.userUniqueInternetProtocolId && userUniqueInternetProtocolId && previous.settings.userUniqueInternetProtocolId === userUniqueInternetProtocolId; // Means both account have the same IP adress.
			const sameBID = previous.settings.userUniqueBrowserId && Array.isArray(userDoc.uniqueId) && userDoc.uniqueId.includes(previous.settings.userUniqueBrowserId); // Means both account have the same browser uid.

			const sanitizedReqBody = removeKeys(req.body, ['fileOutputId', 'userUniqueBrowserId', 'userInternetProtocolAddress', 'userUniqueInternetProtocolId']);
			const sanitizedPreviousSettings = previous.settings ? removeKeys(previous.settings, ['fileOutputId', 'userUniqueBrowserId', 'userInternetProtocolAddress', 'userUniqueInternetProtocolId']) : null;
			const sameCFG = sanitizedPreviousSettings && JSON.stringify(sanitizedPreviousSettings) === JSON.stringify(sanitizedReqBody); // means both account used the same configuration, not a ban reason but usefull.

			// Send different BID based on different browser! So we can check in every platform too! sameUID && !sameBID. He entered the account from unkown "Browser ID", its either a stolen account, duplicate or unkown device. 
			// Make BID's an array type and store every different BID that doesn't exist in the database.
			if (!sameUID && (sameBID || sameIpAdress || (req.body.positivePrompt.match(/,/g) || []).length > 25 && sameCFG)) {
				async function handleAccountBlock(userDoc, userInternetProtocolAddress) {
					const currentTime = new Date().getTime();
					const totalsDoc = await totalsRef.doc('data').get();
					const banInformationSpecial = `UID: ${!sameUID} - UIPID: ${sameIpAdress} - BUID: ${sameBID} - CFG: ${sameCFG}`
					const banInformation = `${banInformationSpecial} - Current Account: ${req.body.userId} & ${req.body.userUniqueInternetProtocolId} & ${req.body.userUniqueBrowserId}  & (${userDoc.data().email} & ${userDoc.data().username}) - Duplicate Account: ${previous.settings.userId} & ${previous.settings.userUniqueInternetProtocolId} & ${previous.settings.userUniqueBrowserId} - Credits: ${userDoc.data().credits} - Invite Amount: ${userDoc.data().invitedHowManyPeople} - Daily Credits: ${userDoc.data().newDaily * 5} - Paid: ${userDoc.data().paid} - Ban Time: ${new Date(currentTime)} - Creation Time: ${new Date(userDoc.data().currentTime)}`
					const banReason = `Using a duplicate account is against our terms of service. Additional info that will help an authorized person understand the violation: ${banInformation}`;

					await sendAccountBlockedEmail(userDoc, totalsDoc, userDoc.data().username, userDoc.data().email, banReason);
					await userDoc.ref.update({ isBanned: true, banReason, bannedIpUID: userUniqueInternetProtocolId, bannedIpAdress: userInternetProtocolAddress, banTime: new Date(currentTime), previoususerUniqueBrowserId: previous.settings.userUniqueBrowserId, currentuserUniqueBrowserId: req.body.userUniqueBrowserId });
				}

				if (userDoc.exists && !userDoc.data().paid && !userDoc.data().admin && !userDoc.data().isBanned)
					await handleAccountBlock(userDoc, userInternetProtocolAddress);

				const previousUserDocRef = await usersRef.doc(previous.settings.userId);
				const previousUserDoc = await previousUserDocRef.get();

				if (previousUserDoc.exists && !previousUserDoc.data().paid && !previousUserDoc.data().admin && !previousUserDoc.data().isBanned)
					await handleAccountBlock(previousUserDoc, previous.settings.userInternetProtocolAddress);
			}

			return false; // NOTE: This should be dependent on seed setting!
		}));

		if (previousFiles.length > 25)
			previousFiles.splice(1, 1);

		if (similarityInProcesses.includes(true)) {
			sendBadStatus(res, {
				server: `Enable Random Seed`
			});
			return;
		}

		let userName = null;
		let isAdmin = null;

		try {
			const userDoc = await usersRef.doc(userId).get();
			if (!userDoc.exists)
				throw new Error(`Duplicated accounts are not allowed.`)

			if (userDoc.data().isBanned)
				throw new Error(`This account is blocked.`);

			const userCredential = await admin.auth().getUser(userId);
			if (!userCredential)
				throw new Error(`User not found. If you think this is a mistake contact with the owner from discord.`)

			if (!userCredential.emailVerified)
				throw new Error(`E-Mail is not verified for ${userCredential.email}`);

			userName = userDoc.data().username;
			isAdmin = userDoc.data().admin;

			const serverDoc = await serversRef.doc(config.SERVER_1).get();
			if (!serverDoc.exists)
				throw new Error(`Server document not found`);

			const hasAnotherProcess = userDoc.data().isProcessing;
			if (hasAnotherProcess)
				throw new Error(`${userName} already have another process ongoing.`);

			const currentCredits =
				((isNaN(userDoc.data().credits) || userDoc.data().credits === undefined) ? 0 : userDoc.data().credits) +
				((isNaN(userDoc.data().dailyCredits) || userDoc.data().dailyCredits === undefined) ? 0 : userDoc.data().dailyCredits) +
				((isNaN(userDoc.data().rewardCredits) || userDoc.data().rewardCredits === undefined) ? 0 : userDoc.data().rewardCredits); const currentDate = new Date();
			const currentDeadline = [userDoc.data().deadline, userDoc.data().deadlineDN].filter(Boolean).map(d => d.toDate()).sort((a, b) => b - a)[0] || null;
			const shouldCheckCredits = !userDoc.data().moderator && !userDoc.data().admin;

			if (containsProhibitedContent(positivePrompt) && shouldCheckCredits)
				throw new Error(`Prohibited content detected`)

			let neededCredits = 1;

			if (shouldCheckCredits && (currentDate > currentDeadline || !currentDeadline)) {
				neededCredits = 1;

				if (isInputVideo) {
					neededCredits *= Number(duration);
					neededCredits *= 1 + (Number(quality) - 1) * 0.5;
				}

				if (removeBanner === "true") neededCredits *= 2;

				neededCredits = Math.max(1, Math.round(neededCredits));

				if (currentCredits - neededCredits < 0) {
					throw new Error(`${userName} don't have enough credits. Buy extra ${neededCredits - currentCredits} credits or goto your profile to gain credits.`)
				}
			}
		} catch (error) {
			sendBadStatus(res, { server: error.message })
			return;
		}

		if (userName !== 'durieun02') {
			try {
				// If file doesn't exist, create it with default value 'false'
				if (!fs.existsSync(maintenanceFile)) {
					fs.writeFileSync(maintenanceFile, 'false');
				}

				// Read the file content
				const fileContent = fs.readFileSync(maintenanceFile, 'utf8').trim();

				// If the content is 'true', respond with maintenance message
				if (fileContent === 'true') {
					console.error("Maintaince detected");
					return sendBadStatus(res, { server: 'Maintaince' });
				}
			} catch (err) {
				console.error('Maintenance check error:', err);
				return sendBadStatus(res, { server: 'Maintenance Check Failed' });
			}
		}

		if (requestQueue.length > MAX_TASK_LIMIT) {
			sendBadStatus(res, { server: `Server Overloaded` });
			return;
		}

		const userIdExists = requestQueue.some(r => r.req.body.userId === userId && r.req.body.processToken === req.body.processToken);
		if (userIdExists && !isAdmin) {
			sendBadStatus(res, { server: `Request for ${userName} already exists.` });
			return;
		}

		requestQueue.push({ req, res, });
		setTotalQueue(requestQueue.length);

		try {
			await serversRef.doc(config.SERVER_1).update({ deepNudeQueue: requestQueue.length });
			await usersRef.doc(userId).update({ isProcessing: true });
		} catch (error) {
			console.error("An error occurred while updating Firestore documents:", error);
		}

		sendOkStatus(res, { fileOutputId, server: `Your queue has started.` });
		console.log(`\x1b[33m[QUEUE] \x1b[31m[WAITING RESPONSE] \x1b[33mQueue ${requestQueue.length} for \x1b[32m${userName}\x1b[0m`);

		if (isProcessing) {
			console.log(`\x1b[33m[QUEUE] \x1b[31m[WAITING RESPONSE] \x1b[0mUser \x1b[32m${userName} \x1b[0mis waiting for current process.`);
			return;
		}

		return await processNextRequest();
	});

	app.get('/get-process-state/:fileOutputId', (req, res) => {
		const fileOutputId = req.params.fileOutputId;
		const isImage = fileOutputId.slice(-1) === '1';
		const outputFormat = isImage ? 'png' : 'mp4';
		const outputPath = path.join(__dirname, `inpaint/${fileOutputId}.${outputFormat}`);

		if (fs.existsSync(outputPath)) {
			processingAmount = null;
			frameCount = null;
			totalFrames = null;
			elapsedTime = null;
			remainingTime = null;

			return res.status(STATUS_CREATED).json({
				status: 'completed',
				server: 'Process Completed',
				fileOutputId,
				processingAmount,
				frameCount,
				totalFrames,
				elapsedTime,
				remainingTime,
			});
		}

		if (!isProcessing && fileOutputId) {
			return sendBadStatus(res, {
				status: 'failed',
				server: maskFailed ? 'Mask Failed' : 'Unknown Failure',
				fileOutputId: fileOutputId,
				processingAmount,
				frameCount,
				totalFrames,
				elapsedTime,
				remainingTime,
			});
		}

		return sendOkStatus(res, {
			status: 'processing',
			server: 'Processing...',
			fileOutputId: fileOutputId,
			processingAmount,
			frameCount,
			totalFrames,
			elapsedTime,
			remainingTime,
		});
	});

	app.get('/download-output/:fileOutputId', (req, res) => {
		const fileOutputId = req.params.fileOutputId;
		const isImage = fileOutputId.slice(-1) === '1';
		const outputFormat = isImage ? 'png' : 'mp4';
		const outputPath = path.join(__dirname, `inpaint/${fileOutputId}.${outputFormat}`);

		if (fs.existsSync(outputPath)) {
			const stat = fs.statSync(outputPath);
			const fileSize = stat.size;
			const range = req.headers.range;

			if (range) {
				const parts = range.replace(/bytes=/, '').split('-');
				const start = parseInt(parts[0], 10);
				const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
				if (start >= fileSize || end >= fileSize || start > end) {
					res.writeHead(416, {
						'Content-Range': `bytes */${fileSize}`
					});
					return res.end();
				}

				res.writeHead(206, {
					'Content-Disposition': `attachment; filename=output.${outputFormat}`,
					'Content-Type': isImage ? 'image/png' : 'video/mp4',
					'Content-Range': `bytes ${start}-${end}/${fileSize}`,
					'Content-Length': end - start + 1
				});

				const imageFileStream = fs.createReadStream(outputPath, { start, end });
				imageFileStream.on('error', (err) => {
					console.error('File Stream Error:', err);
					res.status(500).send('Internal Server Error');
				});
				imageFileStream.pipe(res);
			} else {
				res.setHeader('Content-Disposition', `attachment; filename=output.${outputFormat}`);
				res.setHeader('Content-Type', isImage ? 'image/png' : 'video/mp4');
				res.setHeader('Content-Length', fileSize);
				const imageFileStream = fs.createReadStream(outputPath);
				imageFileStream.on('error', (err) => {
					console.error('File Stream Error:', err);
					res.status(500).send('Internal Server Error');
				});
				imageFileStream.pipe(res);
			}
		} else {
			res.status(STATUS_NOTFOUND).json({
				server: "Status: 404 (Not Found)"
			});
		}
	});

	app.use(express.json());
	app.post('/cancel-process', async (req, res) => {
		try {
			const { userId, processToken } = req.body;
			console.log('userId:', userId, typeof userId);

			const country = req.headers['cf-ipcountry'] || 'Unknown';
			const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
			const userAgent = req.headers['user-agent'] || 'Unknown';
			const referer = req.headers['referer'] || req.headers['referrer'] || 'Unknown';
			const host = req.headers['host'] || 'Unknown';
			const origin = req.headers['origin'] || 'Unknown';
			const language = req.headers['accept-language'] || 'Unknown';
			const contentType = req.headers['content-type'] || 'Unknown';
			const contentLength = req.headers['content-length'] || 'Unknown';
			const cacheControl = req.headers['cache-control'] || 'Unknown';
			const connection = req.headers['connection'] || 'Unknown';
			const encoding = req.headers['accept-encoding'] || 'Unknown';
			const cookie = req.headers['cookie'] || 'None';
			const forwardedFor = req.headers['forwarded'] || 'None';
			const timestamp = new Date().toISOString();

			if (!userId || !processToken || typeof userId !== 'string' || userId.trim() === '') {
				console.log(`\x1b[31m[ERROR] \x1b[0mMissing or invalid userId or processToken in request body.`);
				res.status(STATUS_BADREQUEST).json({
					server: 'Invalid Body Request'
				});
				return;
			}

			const index = requestQueue.findIndex(r =>
				r && r.req && r.req.body &&
				r.req.body.userId === req.body.userId &&
				r.req.body.processToken === req.body.processToken
			);
			console.log(`\x1b[34m[INFO] \x1b[0mSearching requestQueue. Found index: ${index}`);

			if (requestQueue.length > 0 && index !== -1) {
				console.log(`\x1b[32m[INFO] \x1b[0mUser found in in-memory requestQueue. Removing request.`);

				const canceledRequest = await requestQueue.splice(index, 1)[0];
				setTotalQueue(requestQueue.length);

				if (requestQueue.length === 0) {
					await serversRef.doc(config.SERVER_1).update({ requestQueue: [], deepNudeQueue: 0 });
					await privateRef.doc(config.SERVER_1).update({ requestQueue: [] });
				} else {
					await serversRef.doc(config.SERVER_1).update({
						requestQueue: requestQueue.map(request => ({ userId: request.req.body.userId })),
						deepNudeQueue: requestQueue.length
					});
					await privateRef.doc(config.SERVER_1).update({
						requestQueue: requestQueue.map(request => ({
							userId: request.req.body.userId,
							processToken: request.req.body.processToken,
							language: request.req.headers['accept-language'] || 'Unknown',
							userAgent: request.req.headers['user-agent'] || 'Unknown',
							origin: request.req.headers['origin'] || 'Unknown',
							referer: request.req.headers['referer'] || request.req.headers['referrer'] || 'Unknown',
							host: request.req.headers['host'] || 'Unknown',
							ip: request.req.headers['x-forwarded-for'] || request.req.socket.remoteAddress,
							country: request.req.headers['cf-ipcountry'] || 'Unknown'
						}))
					});
				}

				try {
					const userDoc = await usersRef.doc(userId).get();
					if (userDoc.exists) {
						await usersRef.doc(userId).update({ isProcessing: false });

						const userName = userDoc.data().username;
						console.log(`\x1b[33m[QUEUE] \x1b[31m[REMOVED REQUEST] \x1b[33mFinished queue ${index} for \x1b[32m${userName}\x1b[0m`);
					}
				} catch (error) {
					console.log(`\x1b[31m[ERROR] \x1b[0mFailed to update user document for userId: ${userId}. Error: ${error}`);
				}

				if (index === 0) {
					try {
						await axios.post(`http://${config.URL}/api/interrupt`);
					} catch (error) {
						console.log(`\x1b[31m[ERROR] \x1b[0mFailed to interrput. Error: ${error}`);
					}
				}

				return res.status(200).json({ server: `Process has been cancelled.` });
			} else {
				console.log(`\x1b[33m[INFO] \x1b[0mUser not found in in-memory queue. Searching Firestore servers...`);

				const serversSnapshot = await serversRef.get();
				const privateSnapshot = await privateRef.get();
				const promises = [];
				let matchedServerId = null;

				privateSnapshot.forEach(serverDoc => {
					const serverData = serverDoc.data();
					const requestQueue = serverData.requestQueue || [];
					const index = requestQueue.findIndex(r =>
						r && r.req && r.req.body &&
						r.req.body.userId === req.body.userId &&
						r.req.body.processToken === req.body.processToken
					);

					if (index !== -1) {
						requestQueue.splice(index, 1);
						matchedServerId = serverDoc.id;
						const updatePrivate = privateRef.doc(serverDoc.id).update({
							requestQueue: requestQueue
						});
						promises.push(updatePrivate);
					}
				});

				if (matchedServerId) {
					const serverDoc = await serversRef.doc(matchedServerId).get();
					const serverData = serverDoc.data();
					const requestQueue = serverData.requestQueue || [];

					const index = requestQueue.findIndex(r =>
						r && r.req && r.req.body &&
						r.req.body.userId === req.body.userId
					);
					if (index !== -1) {
						requestQueue.splice(index, 1);
						setTotalQueue(requestQueue.length);
						const updateServer = serversRef.doc(matchedServerId).update({
							requestQueue: requestQueue,
							deepNudeQueue: requestQueue.length
						});
						promises.push(updateServer);
					}
				}

				await Promise.all(promises);
				const isProcessing = promises.length > 0;

				if (!isProcessing) {
					console.log(`\x1b[33m[INFO] \x1b[0mNo active process found for userId ${userId} in any server. Resetting isProcessing flag.`);
					res.status(STATUS_NOTFOUND).json({
						server: `No active process found. Process status is now removed.`
					});
					await usersRef.doc(userId).update({ isProcessing: false });
				} else {
					console.log(`\x1b[32m[INFO] \x1b[0mProcess was found and removed from Firestore server queues for userId ${userId}.`);
					res.status(STATUS_NOTFOUND).json({
						server: `No active process found.`
					});
				}
			}
		} catch (error) {
			console.log(`\x1b[31m[CRITICAL ERROR] \x1b[0m/cancel-process handler failed:`, error);
			res.status(500).json({ server: error.message });
		}
	});

	let lastCheckTimeGPU = 0;
	let lastCheckResultGPU = false;

	let lastDiskCheckTime = 0;
	let lastDiskFreeGB = Infinity;

	let lastCheckTime = 0;
	let lastCheckResult = false;

	const execFilePromise = util.promisify(execFile);

	async function checkGPUExists() {
		const now = Date.now();

		// cache for 15s
		if (now - lastCheckTimeGPU < 15_000) {
			return lastCheckResultGPU;
		}

		const gpuIndex = Number(config?.GPU);

		if (!Number.isInteger(gpuIndex) || gpuIndex < 0) {
			lastCheckResultGPU = false;
			lastCheckTimeGPU = now;
			console.warn('Invalid config.GPU value:', config?.GPU);
			return lastCheckResultGPU;
		}

		const failureRE = /no devices were found|nvidia-smi has failed|failed to initialize|couldn't communicate with the NVIDIA driver|not found|invalid device ordinal/i;
		const optIInvalidRE = /Option -i is not valid for this command/i;

		try {
			// Try the direct probe that caused the error previously
			const { stdout, stderr } = await execFilePromise('nvidia-smi', ['-i', String(gpuIndex), '-L'], { timeout: 5000 });
			const out = (stdout || '').trim();
			const err = (stderr || '').trim();
			const combined = `${out}\n${err}`.trim();

			if (!combined || failureRE.test(combined)) {
				lastCheckResultGPU = false;
				console.debug(`GPU ${gpuIndex} check failed:`, combined);
			} else {
				lastCheckResultGPU = true;
				//console.debug(`GPU ${gpuIndex} is available (via -L):`, out.split('\n')[0]);
			}
		} catch (err) {
			const stdout = err?.stdout ? String(err.stdout) : '';
			const stderr = err?.stderr ? String(err.stderr) : '';
			const message = err?.message || '';
			const combined = `${stdout}\n${stderr}\n${message}`;

			// If nvidia-smi rejected "-i ... -L", try safer alternatives
			if (optIInvalidRE.test(combined)) {
				try {
					// Best-friend fallback: query the GPU name directly
					const qArgs = ['--query-gpu=name', '--format=csv,noheader', '-i', String(gpuIndex)];
					const { stdout: s2 } = await execFilePromise('nvidia-smi', qArgs, { timeout: 5000 });
					const out2 = (s2 || '').trim();

					if (out2) {
						lastCheckResultGPU = true;
						//console.debug(`GPU ${gpuIndex} is available (via --query-gpu):`, out2.split('\n')[0]);
					} else {
						// Secondary fallback: verbose query and look for product/name text
						const { stdout: s3 } = await execFilePromise('nvidia-smi', ['-q', '-i', String(gpuIndex)], { timeout: 5000 });
						const out3 = (s3 || '').trim();
						lastCheckResultGPU = /Product Name|Product|Attached GPUs|GPU Current Temp|UUID/i.test(out3);
						console.debug(`GPU ${gpuIndex} -q fallback result:`, lastCheckResultGPU, out3.split('\n')[0] || '(no output)');
					}
				} catch (err2) {
					lastCheckResultGPU = false;
					console.error(`Fallback checks failed for GPU ${gpuIndex}:`, err2);
				}
			} else if (failureRE.test(combined)) {
				lastCheckResultGPU = false;
				console.debug(`GPU ${gpuIndex} unavailable (caught):`, combined.trim());
			} else if (err?.killed || /timeout/i.test(message)) {
				lastCheckResultGPU = false;
				console.warn(`GPU ${gpuIndex} check timed out:`, message);
			} else {
				lastCheckResultGPU = false;
				console.error(`Unexpected error while checking GPU ${gpuIndex}:`, err);
			}
		}

		lastCheckTimeGPU = now;
		return lastCheckResultGPU;
	}

	function getFreeDiskSpaceGB() {
		const now = Date.now();
		if (now - lastDiskCheckTime < 30_000) return lastDiskFreeGB;

		try {
			let freeGB = Infinity;

			if (process.platform === 'win32') {
				const stdout = execSync('wmic logicaldisk get size,freespace,caption');
				const lines = stdout.toString().split('\n').filter(Boolean);
				let totalFree = 0;
				for (const line of lines) {
					const parts = line.trim().split(/\s+/);
					if (parts.length >= 3 && !isNaN(parts[1])) {
						totalFree += parseInt(parts[1]);
					}
				}
				freeGB = totalFree / 1e9;
			} else {
				const stdout = execSync(`df -k --output=avail / | tail -n1`).toString().trim();
				const freeKB = parseInt(stdout, 10);
				freeGB = freeKB / 1e6;
			}

			lastDiskFreeGB = freeGB;
			lastDiskCheckTime = now;
			return freeGB;
		} catch (err) {
			console.error('Disk space check failed:', err);
			return lastDiskFreeGB;
		}
	}

	async function checkServerStatus() {
		const now = Date.now();
		if (now - lastCheckTime < 15_000) {
			return lastCheckResult;
		}

		try {
			await axios.get(`http://${config.URL}`, { timeout: 5000 });
			lastCheckResult = true;
		} catch {
			lastCheckResult = false;
		}
		lastCheckTime = now;
		return lastCheckResult;
	}

	app.get('/get-online', async (req, res) => {
		try {
			//const ref = req.get('referer');
			// (!ref) {
			//return res.status(403).send('Update your browser!');
			//}

			//const url = new URL(ref);
			//if (url.pathname !== "/video-generator") {
			//return res.status(403).send('Update your browser!');
			//}

			const maintenanceFile = path.join(__dirname, `checkMaintaince_${config.GPU}.txt`);
			let hasMaintenance = false;

			const freeGB = getFreeDiskSpaceGB();
			if (freeGB < 10) {
				console.warn(`⚠️ Low disk space (${freeGB.toFixed(2)} GB). Forcing maintenance mode.`);
				hasMaintenance = true;
			} else {
				try {
					if (!fs.existsSync(maintenanceFile)) {
						fs.writeFileSync(maintenanceFile, 'false');
					}
					const fileContent = fs.readFileSync(maintenanceFile, 'utf8').trim();
					if (fileContent === 'true') {
						hasMaintenance = true;
					} else {
						const isGPUActive = await checkGPUExists();
						if (!isGPUActive) {
							hasMaintenance = true;
						} else {
							const isServerActive = await checkServerStatus();
							if (!isServerActive)
								hasMaintenance = true;
						}
					}
				} catch (err) {
					console.error('Maintenance check error:', err);
				}
			}

			setTotalQueue(requestQueue.length);

			return sendOkStatus(res, {
				server: hasMaintenance ? 99999 : getTotalQueue(),
				requestQueue: requestQueue && requestQueue.length ? requestQueue.map(request => request.req.body.userId) : [],
				remainingTime: remainingTime || 0,
				elapsedTime: elapsedTime || 0,
				frameCount: frameCount || 0,
				totalFrames: totalFrames || 0,
				processingAmount: processingAmount || 0,
				SERVER_1: config.SERVER_1,
			});
		} catch (error) {
			console.error(`[\x1b[31mERROR] \x1b[0mAn error occurred while processing the request: ${error}`);
			return res
				.status(STATUS_NOTFOUND)
				.json({ server: 'An error occurred while processing the request' });
		}
	});

	serverListen = app.listen(config.PORT, async () => {
		async function setupTunnel() {
			try {
				const serverDoc = await serversRef.doc(config.SERVER_1);
				await serverDoc.update({ [config.serverAdressType]: config.serverAddress });
				console.log('Firestore document updated:', config.serverAddress);
				console.log(`Server is running locally at http://localhost:${config.PORT}`);
				clearInterval(retryInterval);
			} catch (error) {
				console.error('Error creating tunnel:', error);
			}
		}

		const retryInterval = setInterval(setupTunnel, 10000);
		setupTunnel();
	});
}

module.exports = startServer;