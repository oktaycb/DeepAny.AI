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
	const os = require("os");

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
	const MAX_TASK_LIMIT = 50;

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

	function hideSpawn(command, args, options = {}) {
		const defaultOptions = {
			detached: true,
			stdio: ['ignore', 'pipe', 'pipe'],
			windowsHide: true,
		};

		const mergedOptions = { ...defaultOptions, ...options };

		try {
			const child = spawn(command, args, mergedOptions);
			if (options.logOutput) {
				if (child.stdout) {
					child.stdout.on('data', (data) => console.log(`STDOUT: ${data}`));
				}
				if (child.stderr) {
					child.stderr.on('data', (data) => console.error(`STDERR: ${data}`));
				}
			}

			child.unref();
			return child;
		} catch (error) {
			console.error('Failed to spawn process:', error);
			return null;
		}
	}

	module.exports = hideSpawn;

	const fileStatusCache = new Map();
	const expandedWordsCache = new Map();
	let hasCached = false;

	let currentDate = null;
	let currentDeadline = null;
	let shouldCheckCredits = false;
	let currentCredits = 0;
	let neededCredits = 0;
	let userEmail = '';
	let userName = '';

	const serviceAccount = require('./serviceAccountKey.json');
	admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

	const db = admin.firestore();
	const usersRef = db.collection('users');
	const serversRef = db.collection('servers');
	const privateRef = db.collection('private');
	const totalsRef = db.collection('totals');

	async function updateProcessing() {
		try {
			const querySnapshot = await usersRef.where('isProcessingDV', '==', true).get();
			const updatePromises = [];

			querySnapshot.forEach(async (doc) => {
				const userDocRef = usersRef.doc(doc.id);
				updatePromises.push(userDocRef.update({ isProcessingDV: false }));
				console.log(`\x1b[32m[SERVER PROCESS] \x1b[0mUser Query set for ${doc.id})`);
			});

			await Promise.all(updatePromises);
			console.log(`\x1b[32m[SERVER PROCESS] \x1b[0mUpdated processing for ${updatePromises.length} users.`);
		} catch (error) {
			console.error('Error updating isProcessingDV for all users:', error);
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

	privateRef.doc(config.SERVER_1).update({ requestQueue: [] });
	serversRef.doc(config.SERVER_1).update({ requestQueue: [] });
	serversRef.doc(config.SERVER_1).update({ onDeepVideo: false });
	serversRef.doc(config.SERVER_1).update({ deepVideoQueue: 0 });

	let isProcessing = false;
	let requestQueue = [];
	let onlineClients = {};
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
			/ass/i,
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

		input = input.trim().toLowerCase().normalize('NFKC');

		const obfuscationMap = {
			'0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a', '5': 's', '6': 'g',
			'7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's', '&': 'and', '+': 't',
			'!': 'i', '|': 'i', '?': 'q', '#': '', '*': '', '%': '', '.': '', '-': '',
			'_': '', '/': '', '\\': ''
		};

		input = input.replace(/[\d@\$&\+!\|\?\#\*\%.\-_/\\]/g, c => obfuscationMap[c] ?? c);
		input = input.replace(/(\w)\1{2,}/g, '$1$1');

		const adultRe = /\b(?:sex(?:ual(?:ly)?)?|porn(?:hub|tube)?|nsfw|hentai|erotic|nude|xxx|explicit|ass|fetish|lewd|topless|breast|boobs?|nipples?|tits?|genitals?|doggy|cowgirl|pussy|vaginal|vagina|vag|vajina|clit(?:oris)?|labia|penis|cock|dick|asshole?|butt(?:plug)?|blowjob|handjob|footjob|cum(?:shot)?|orgy|gangbang|threesome|anal|rimming|cumhole|fisting|masturbat(?:e|ing)?|dildo|vibrator|bondage|bdsm|squirting|creampie|bukkake|pegging|cuckold|milf|stripper|escort|cam(?:girl|boy|site)?|webcam|scat|urinat(?:e|ion)|incest|rape|ped(?:o|ophile|ophilia)?|bestiality|zoophilia|orgasm)\b/i;

		const collapsed = input.replace(/[^a-z]/g, '');
		const compactRe = /(vagina|vajina|pussy|labia|clitoris|clit|penis|cock|dick|cumshot|cum|blowjob|handjob|dildo|vibrator|porn|nsfw|hentai|nude|xxx|sex|anal|rape|incest)/i;

		return adultRe.test(input) || compactRe.test(collapsed);
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
									//console.log(`Removed file: ${file}`);
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

		if (requestQueue.length === 0) {
			setTotalQueue(requestQueue.length);
			didSentTheOutput = true;
			isProcessing = false;

			(async () => {
				await privateRef.doc(config.SERVER_1).update({ requestQueue: [] });
				await serversRef.doc(config.SERVER_1).update({ requestQueue: [] });
				await serversRef.doc(config.SERVER_1).update({ onDeepVideo: false });
				await serversRef.doc(config.SERVER_1).update({ deepVideoQueue: 0 });
			})();

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
			let { og, fp16Latent, anchorSample, structural_repulsion_boost, dynamicLatent, advancedClip, colorDriftCorrection, increaseSamplerSeeds, disableSamplerNoise, userId, fps, interpolation, nag, moe, sampler, motion, amplitude, scheduler, shift, clipSkip, randomizeSeed, losslessEncoder, removeBanner, model, positiveAudioPrompt, negativeAudioPrompt, positivePrompt, negativePrompt, resolution, generateAudio, changeAspectRatio, aspectRatio, quality, duration, fileOutputId } = req.body;
			let motion_latent_count = 1;
			if (structural_repulsion_boost)
				structural_repulsion_boost = Number(structural_repulsion_boost);
			//generateAudio = 'false';
			//interpolation = 1;
			//if (duration === 8)
			//duration = 5;

			//fps = 16;

			const upscaleResolution = resolution;
			const isHighResolution = upscaleResolution === '2160p' || upscaleResolution === '4x';
			resolution = '480p';

			if (!model)
				model = 'realistic any 2.5';

			function processPrompt(prompt) {
				let lines = prompt.split(/\r?\n/).map(line => line.trim().replace(/,+/g, ','));
				let processedPrompt = lines.join(', ');
				return processedPrompt.endsWith(',') ? processedPrompt.slice(0, -1) : processedPrompt;
			}

			positiveAudioPrompt = processPrompt(positiveAudioPrompt);
			negativeAudioPrompt = processPrompt(negativeAudioPrompt);

			if (negativePrompt.length < 1) {
				negativePrompt = 'medium quality, worst quality, low quality, blurry, out of focus, fuzzy, low detail, abnormal skin tone, body horror, bright colors, undersaturated, oversaturated, underexposed, overexposed, subtitles, ugly, missing fingers, extra fingers, poorly drawn hands, twisted mouth, malformed face, ugly face, low detail face, blurry face, out of focus face, asymmetrical face, distorted facial features, extra eyes, missing eyes, poorly drawn faces, disease, wounds, bruises, scars, rashes, skin blemishes, acne, wrinkles, skin spots, moles, pores, cellulite, pimples, deformed, disfigured, fused fingers, bad anatomy, bad proportions, signature, missing limbs, extra limbs, malformed limbs, mutated hands, duplicate, mutant, cropped, artifacts, low resolution, slow motion, frame skipping, posterizing, aliasing, compression artifact, banding, ghosting, jerky motion, no motion, pixelation, color bleeding, frame tearing, temporal noise, judder, motion blur, over-sharpening, flickering, film grain, static noise, watermark, logo, timestamp, interlacing, ghost frames, chromatic aberration, walking backwards, unnatural movement, glitch, reversed motion, spasms, twitching, jittery movement, looping motion, motion lag, stutter, walking in place, asynchronous limb movement, floating, inverted walking, gliding, sliding, inconsistent, inaccurate, teleporting steps';
			}

			//positivePrompt = processPrompt(positivePrompt);
			negativePrompt = processPrompt(negativePrompt);

			//console.log(positivePrompt);
			//console.log(negativePrompt);
			const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.mkv', '.avi']);
			const VIDEO_MIME_PREFIX = 'video/';

			function extFromOriginalName(originalname) {
				return originalname ? path.extname(originalname).toLowerCase() : '';
			}

			function isVideoFile(fileOrPath) {
				// fileOrPath can be: multer file object { path, originalname, mimetype } OR a string path
				if (!fileOrPath) return false;
				if (typeof fileOrPath === 'string') {
					return VIDEO_EXTS.has(path.extname(fileOrPath).toLowerCase());
				}
				// multer file object
				if (fileOrPath.mimetype && typeof fileOrPath.mimetype === 'string') {
					if (fileOrPath.mimetype.startsWith(VIDEO_MIME_PREFIX)) return true;
				}
				const ext = extFromOriginalName(fileOrPath.originalname) || path.extname(fileOrPath.path || '').toLowerCase();
				return VIDEO_EXTS.has(ext);
			}

			async function ensureFileHasExtension(multerFile) {
				// If Multer saved file without extension, append original extension (if available)
				const currentExt = path.extname(multerFile.path || '');
				const origExt = extFromOriginalName(multerFile.originalname);
				if (!currentExt && origExt) {
					const newPath = `${multerFile.path}${origExt}`;
					await fs.promises.rename(multerFile.path, newPath);
					// update path in-place so callers see the new filename
					multerFile.path = newPath;
					return newPath;
				}
				return multerFile.path;
			}

			async function safeConvertOrMove(fileOrPath, outputPath) {
				// normalize to object with path/originalname/mimetype if a multer file object was passed
				const isStringPath = typeof fileOrPath === 'string';
				const file = isStringPath ? { path: fileOrPath, originalname: path.basename(fileOrPath), mimetype: null } : fileOrPath;

				// If this is a multer file and it lacks extension, give it one based on originalname
				try {
					if (!isStringPath && file.originalname) {
						await ensureFileHasExtension(file);
					}
				} catch (e) {
					console.warn('Failed to ensure extension, continuing (will still try to detect):', e);
				}

				// Decide video vs image using mimetype/originalname/path
				const isVideo = isVideoFile(file);

				if (isVideo) {
					try {
						const ffmpeg = os.platform().startsWith('win') ? `"C:\\ffmpeg\\bin\\ffmpeg.exe"` : 'ffmpeg';
						// use ffmpeg to copy container, strip metadata and faststart for mp4
						const cmd = `${ffmpeg} -y -i "${file.path}" -map_metadata -1 -movflags +faststart "${outputPath}"`;
						await execPromise(cmd);

						const stat = await fs.promises.stat(outputPath);
						if (stat.size === 0) throw new Error('FFmpeg created empty file');
						return;
					} catch (ffmpegErr) {
						console.warn(`FFmpeg failed for ${file.path}, falling back to rename. Error:`, ffmpegErr);
					}

					try {
						await fs.promises.rename(file.path, outputPath);
						return;
					} catch (renameErr) {
						console.warn(`Rename failed, copying instead. Error:`, renameErr);
						await fs.promises.copyFile(file.path, outputPath);
						await fs.promises.unlink(file.path).catch(() => { });
						return;
					}
				}

				// ---------- IMAGE branch ----------
				try {
					const isWindows = os.platform().startsWith('win');
					const imBinary = isWindows
						? `"C:\\Program Files\\ImageMagick-7.1.2-Q16-HDRI\\magick.exe"`
						: "convert";

					await execPromise(`${imBinary} "${file.path}" "${outputPath}"`);
					const stat = await fs.promises.stat(outputPath);
					if (stat.size === 0) throw new Error('ImageMagick created empty file');
					return;
				} catch (magickErr) {
					console.warn(`ImageMagick failed for ${file.path}, falling back to Sharp. Error:`, magickErr);
				}

				try {
					await sharp(file.path, { failOn: 'none' })
						.rotate()
						.removeAlpha()
						.withMetadata({ exif: undefined })
						.toFormat('png')
						.toFile(outputPath);

					const stat = await fs.promises.stat(outputPath);
					if (stat.size === 0) throw new Error('Sharp created empty file');
					return;
				} catch (sharpErr) {
					console.warn(`Sharp failed for ${file.path}, falling back to rename. Error:`, sharpErr);
				}

				try {
					await fs.promises.rename(file.path, outputPath);
				} catch (renameErr) {
					console.warn(`Rename failed, copying instead. Error:`, renameErr);
					await fs.promises.copyFile(file.path, outputPath);
					await fs.promises.unlink(file.path).catch(() => { });
				}
			}

			let startFrameFile = req.files.startFrameFile && req.files.startFrameFile !== 'null' && req.files.startFrameFile !== undefined && req.files.startFrameFile !== null ? req.files.startFrameFile[0] : null;
			let startFramePath = path.join(__dirname, `processing/${config.PORT}_start_frame.png`);

			let lastFrameFile = req.files.lastFrameFile && req.files.lastFrameFile !== 'null' && req.files.lastFrameFile !== undefined && req.files.lastFrameFile !== null ? req.files.lastFrameFile[0] : null;
			let lastFramePath = path.join(__dirname, `processing/${config.PORT}_last_frame.png`);

			let videoFile = req.files.videoFile && req.files.videoFile !== 'null' && req.files.videoFile !== undefined && req.files.videoFile !== null ? req.files.videoFile[0] : null;
			let videoPath = path.join(__dirname, `processing/${config.PORT}_video.mp4`);

			if (startFrameFile)
				await safeConvertOrMove(startFrameFile, startFramePath);

			if (lastFrameFile)
				await safeConvertOrMove(lastFrameFile, lastFramePath);

			if (videoFile)
				await safeConvertOrMove(videoFile, videoPath);

			const resolutionMap = {
				'480p': {
					'16:10': [768, 480],
					'10:16': [480, 768],
					'21:9': [1120, 480],
					'9:21': [480, 1120],
					'2:1': [960, 480],
					'1:2': [480, 960],
					'1:1': [640, 640],
					'5:4': [600, 480],
					'4:5': [480, 600],
					'4:3': [640, 480],
					'3:4': [480, 640],
					'3:2': [720, 480],
					'2:3': [480, 720],
					'16:9': [832, 480],
					'9:16': [480, 832],
					'5:3': [800, 480],
					'3:5': [480, 800],
					'7:5': [672, 480],
					'5:7': [480, 672],
					'7:6': [560, 480],
					'6:7': [480, 560],
					'18:9': [960, 480],
					'9:18': [480, 960],
					'19.5:9': [1040, 480],
					'9:19.5': [480, 1040],
					'20:9': [1067, 480],
					'9:20': [480, 1067],
					'2.35:1': [1128, 480],
					'2.39:1': [1147, 480],
					'2.76:1': [1325, 480],
					'default': [832, 480]
				}
			};

			function getDimensions(resolution, aspectRatio) {
				const res = resolutionMap[resolution] || resolutionMap['480p'];
				const [width, height] = res[aspectRatio] || res['default'];
				return { width, height };
			}

			const { width, height } = getDimensions(resolution, aspectRatio);
			const { width: baseWidth, height: baseHeight } = getDimensions(resolution, 'default');

			// Function to calculate the greatest common divisor (GCD)
			const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

			// Function to find the closest aspect ratio from resolutionMap
			const findClosestAspectRatio = (width, height) => {
				if (!width || !height) return 'default'; // Fallback if dimensions are missing

				const targetRatio = width / height;
				const allRatios = Object.keys(resolutionMap[resolution]); // Assuming all resolutions have the same ratios

				let closestRatio = 'default';
				let smallestDiff = Infinity;

				for (const ratio of allRatios) {
					if (ratio === 'default') continue;

					const [w, h] = ratio.split(':').map(Number);
					const predefinedRatio = w / h;
					const diff = Math.abs(predefinedRatio - targetRatio);

					if (diff < smallestDiff) {
						smallestDiff = diff;
						closestRatio = ratio;
					}
				}

				return closestRatio;
			};

			let startFrameClosestAspectRatio = null;
			let lastFrameClosestAspectRatio = null;

			if (startFrameFile !== null) {
				const metadata = await sharp(startFramePath).metadata();
				startFrameClosestAspectRatio = findClosestAspectRatio(metadata.width, metadata.height);
			}

			if (lastFrameFile !== null) {
				const metadata = await sharp(lastFramePath).metadata();
				lastFrameClosestAspectRatio = findClosestAspectRatio(metadata.width, metadata.height);
			}

			const { width: startWidth, height: startHeight } = getDimensions(
				resolution,
				startFrameClosestAspectRatio
			);
			const { width: lastWidth, height: lastHeight } = getDimensions(
				resolution,
				lastFrameClosestAspectRatio
			);

			(async () => {
				try {
					await serversRef.doc(config.SERVER_1).update({ onDeepVideo: isProcessing });
					await usersRef.doc(userId).update({ isProcessing });
				} catch (error) {
					console.error('Error updating document:', error);
				}
			})();

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
			currentDeadline = [userDoc.data().deadline, userDoc.data().deadlineDV].filter(Boolean).map(d => d.toDate()).sort((a, b) => b - a)[0] || null;
			shouldCheckCredits = !userDoc.data().moderator && !userDoc.data().admin;

			if (containsProhibitedContent(positivePrompt) && shouldCheckCredits)
				throw new Error(`Prohibited Content`)

			const userCredential = await admin.auth().getUser(userId);
			if (!userCredential)
				throw new Error(`User Not Found`)

			userEmail = userCredential.email;
			if (!userCredential.emailVerified)
				throw new Error(`E-mail is not verified for ${userEmail}`);

			function getTotalDurationFromPrompt(text) {
				if (!text) return 0;

				const regex = /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/g;
				let maxEnd = 0;
				let match;

				while ((match = regex.exec(text)) !== null) {
					const end = parseFloat(match[2]);
					if (Number.isFinite(end) && end > maxEnd) {
						maxEnd = end;
					}
				}

				return maxEnd;
			}

			if (shouldCheckCredits && (currentDate > currentDeadline || !currentDeadline)) {
				neededCredits = 1;
				neededCredits *= Number(getTotalDurationFromPrompt(positivePrompt) || duration);
				neededCredits *= 1 + (Number(quality) - 1) * 0.5;

				if (removeBanner === "true") neededCredits *= 2;
				//if (model.includes('2.5')) neededCredits *= 4;
				// if (resolution === '720p') neededCredits *= 2;

				neededCredits /= 2;
				neededCredits = Math.max(1, Math.round(neededCredits));

				if (currentCredits - neededCredits < 0) {
					//sendSatisfactionEmail(userDoc, totalsDoc, userId, userName, userEmail);
					throw new Error(`${userName} don't have enough credits. Buy ${neededCredits - currentCredits} credits or goto your profile to gain credits.`)
				}
			}
			else {
				neededCredits = 0;
			}

			didSentTheOutput = false;
			if (userName)
				userName = userName.replace(/\s/g, '');

			console.log(`\x1b[32m[PROCESSNEXTREQUEST] \x1b[32m[RESPONSE] \x1b[0mStarting the process for \x1b[32m${userName}\x1b[0m`);

			let seed = randomizeSeed === 'true' ? Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) : userName === 'durieun02' || userName === 'Hobbs' ? 1043512787729606 : 476262191439262;
			const outputPath = path.join(__dirname, `videos/${fileOutputId}.mp4`);
			const length = Math.min(162, (16 * parseInt(duration)) + 1);

			let cfg = 1;
			let steps = Math.min(4, 2 + (1 * (parseInt(quality) - 1)));

			let nodeCounter = 0;

			function addNode(payload, node) {
				if (!payload || typeof payload !== "object") {
					throw new Error("❌ addNode(): payload is null or not an object");
				}

				if (!payload.prompt || typeof payload.prompt !== "object") {
					throw new Error("❌ addNode(): payload.prompt is missing or not an object");
				}

				const isFake = !!payload.__isFake;

				if (isFake) {
					if (!payload.__counterSaved) {
						payload.__counterSaved = nodeCounter;
						payload.__counterRestored = false;
					}
				} else {
					if (payload.__counterSaved !== undefined && !payload.__counterRestored) {
						nodeCounter = payload.__counterSaved;
						payload.__counterRestored = true;
					}
				}

				nodeCounter += 1;
				const key = String(nodeCounter);
				payload.prompt[key] = node;
				return key;
			}


			const addedLoraNodes = new Map(); // lora_name -> nodeIndex

			function addLora14B(payload,
				previousHighModelIdx,
				previousLowModelIdx,
				baseHighModelIdx,
				baseLowModelIdx,
				positivePrompt,
				negativePrompt,
				unet_name = '',
				i = 0) {
				let highModelIdx = baseHighModelIdx;
				let lowModelIdx = baseLowModelIdx;

				if (resolution === '540p')
					resolution = '720p';

				if ((unet_name.includes('t2v') || unet_name.includes('i2v')) && (unet_name.includes('high') || unet_name.includes('low'))) {
					/** Normalize text for comparison (lowercase, remove punctuation -> spaces, collapse) */
					function normalizeText(text) {
						if (!text) return '';
						return String(text).toLowerCase()
							.replace(/['’]/g, "")              // drop apostrophes (don't break contractions)
							.replace(/[^a-z0-9\s]/g, " ")      // non-alnum => space
							.replace(/\s+/g, " ")              // collapse spaces
							.trim();
					}

					/** escape for regex */
					function escapeRE(s) {
						return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
					}

					/** Expand common word forms for a single token (keeps result small) */
					function expandWordForms(word) {
						const w = String(word).toLowerCase().trim();
						const set = new Set();
						if (!w) return [];

						set.add(w);

						// simple plural
						if (!w.endsWith('s')) set.add(w + 's');

						// -ed (past)
						if (!w.endsWith('ed')) {
							if (w.endsWith('ie')) {
								set.add(w.slice(0, -2) + 'ied'); // tie -> tied
							} else {
								set.add(w + 'ed');               // play -> played
								// CVC doubling (hop -> hopped)
								if (/[^aeiou][aeiou][^aeiou]$/.test(w)) {
									set.add(w + w.slice(-1) + 'ed');
								}
							}
						}

						// -ing (present participle)
						if (!w.endsWith('ing')) {
							if (w.endsWith('ie')) {
								set.add(w.slice(0, -2) + 'ying');
							} else if (w.endsWith('e') && !w.endsWith('ee') && w.length > 2) {
								set.add(w.slice(0, -1) + 'ing'); // take -> taking
							} else {
								set.add(w + 'ing'); // play -> playing
								if (/[^aeiou][aeiou][^aeiou]$/.test(w)) {
									set.add(w + w.slice(-1) + 'ing'); // worship -> worshipping
								}
							}
						}

						// some irregular-ish endings
						if (/[^aeiou]y$/.test(w)) set.add(w.slice(0, -1) + 'ies'); // many -> manies (rare but ok)
						if (/(s|x|ch|sh)$/.test(w)) set.add(w + 'es');

						return Array.from(set);
					}

					/** Expand phrase combinations from your "pipe/slash" syntax.
						Examples:
						  'breast/boob/chest|insert/penetrate' -> ['breast insert','breast penetrate','boob insert',...]
						Limits variants per part to avoid explosion.
					*/
					function expandPhraseCombinations(phrase, perPartLimit = 8) {
						if (!phrase) return [];
						phrase = String(phrase).trim();
						const seen = new Set();
						const push = (s) => {
							if (!s) return;
							const t = s.trim();
							if (!t || seen.has(t)) return;
							seen.add(t);
						};

						// 1) If phrase contains '|' -> treat as multi-part expression (keep cartesian)
						if (phrase.includes('|')) {
							const parts = phrase.split('|').map(p => p.trim());
							const options = parts.map(p => p.split('/').map(s => s.trim()).slice(0, perPartLimit));
							// cartesian combine
							const out = [];
							const comb = (idx, cur) => {
								if (idx === options.length) {
									out.push(cur.trim());
									return;
								}
								for (const o of options[idx]) {
									comb(idx + 1, cur ? (cur + ' ' + o) : o);
									if (out.length > 1000) return;
								}
							};
							comb(0, '');

							// add each to seen, and for multi-word items add glued + reversed glued/space
							for (const it of out) {
								push(it);
							}
							// snapshot for adding extras
							for (const it of Array.from(seen)) {
								const toks = it.split(/\s+/).filter(Boolean);
								if (toks.length > 1) {
									push(toks.join(''));               // glued original
									push(toks.slice().reverse().join(' ')); // reversed spaced
									push(toks.slice().reverse().join(''));  // reversed glued
								}
							}
							return Array.from(seen);
						}

						// 2) If phrase contains a space -> treat as explicit multi-word phrase
						if (/\s+/.test(phrase)) {
							const toks = phrase.split(/\s+/).filter(Boolean);
							if (toks.length === 1) { push(toks[0]); return Array.from(seen); }
							// original spaced
							push(toks.join(' '));
							// reversed spaced
							push(toks.slice().reverse().join(' '));
							// glued original
							push(toks.join(''));
							// glued reversed
							push(toks.slice().reverse().join(''));
							return Array.from(seen);
						}

						// 3) If we get here and there's a slash -> treat as alternatives (single tokens)
						if (phrase.includes('/')) {
							const opts = phrase.split('/').map(s => s.trim()).filter(Boolean).slice(0, perPartLimit);
							// sort alphabetically to give deterministic order (splash, water)
							opts.sort((a, b) => a.localeCompare(b));
							for (const o of opts) push(o);
							return Array.from(seen);
						}

						// 4) fallback: single token
						push(phrase);
						return Array.from(seen);
					}

					/** cartesian product helper */
					function cartesianCombine(arrays) {
						return arrays.reduce((acc, arr) => {
							const res = [];
							acc.forEach(a => arr.forEach(b => res.push(a.concat([b]))));
							return res;
						}, [[]]);
					}

					/**
					 * Main matcher:
					 *  - text: original prompt
					 *  - cfg: object with _expanded (subject[], needed_words[], needed_word[], gap, trigger_word[])
					 *
					 * Behavior:
					 *  - If any trigger_word (normalized) is present in normalized text -> MATCH
					 *  - All needed_words must match (forms considered)
					 *  - At least one needed_word entry (if provided) must match
					 *  - Subject: for each subject phrase (pipe/slash combo) try combinations; for multi-word combos:
					 *      - expand each token (s/ed/ing variants)
					 *      - generate cartesian combos and test both orders (A ... B AND B ... A) with gap allowance
					 *    for single-word combos test word-forms with word boundaries.
					 */
					function checkRegex(text, cfg) {
						if (!text || !cfg) return false;
						const s = normalizeText(text);
						const expanded = cfg._expanded || {};

						// 0) quick trigger_word match (normalized)
						if (Array.isArray(expanded.trigger_word) && expanded.trigger_word.length) {
							for (const tw of expanded.trigger_word) {
								const normTw = normalizeText(tw);
								if (!normTw) continue;
								if (s.includes(normTw)) return true;
							}
						}

						// 1) needed_words: all of them must exist (match any form)
						if (expanded.needed_words && expanded.needed_words.length) {
							for (const w of expanded.needed_words) {
								const forms = expandWordForms(w);
								const found = forms.some(f => new RegExp('\\b' + escapeRE(f) + '\\b', 'i').test(s));
								if (!found) return false;
							}
						}

						// 2) needed_word: at least one of them must exist
						if (expanded.needed_word && expanded.needed_word.length) {
							let ok = false;
							for (const w of expanded.needed_word) {
								const forms = expandWordForms(w);
								if (forms.some(f => new RegExp('\\b' + escapeRE(f) + '\\b', 'i').test(s))) {
									ok = true; break;
								}
							}
							if (!ok) return false;
						}

						// 3) subject phrases (at least one subject phrase must match if subject defined)
						if (expanded.subject && expanded.subject.length) {
							const gap = Number.isFinite(expanded.gap) ? expanded.gap : 0;
							let subjMatched = false;

							for (const subjPhrase of expanded.subject) {
								// expand pipe/slash combos into base phrases (e.g. 'breast insert', 'boob insert', ...)
								const baseVariants = expandPhraseCombinations(subjPhrase, 12); // limit
								for (const base of baseVariants) {
									const tokens = base.split(/\s+/).map(t => t.trim()).filter(Boolean);
									// For each token get its possible forms
									const tokenForms = tokens.map(tok => expandWordForms(tok).slice(0, 8)); // limit forms per token
									// Build cartesian combos (each combo is an array of concrete token strings)
									const combos = cartesianCombine(tokenForms);
									for (const combo of combos) {
										if (combo.length === 1) {
											// single-word -> simple word boundary check
											const word = escapeRE(combo[0]);
											const re = new RegExp('\\b' + word + '\\b', 'i');
											if (re.test(s)) { subjMatched = true; break; }
										} else {
											// multi-word: build pattern with gap allowance, test both orders
											const escapedWords = combo.map(w => escapeRE(w));
											// pattern A -> B -> C (with gaps between)
											const mid = `(?:\\s+\\w+){0,${gap}}\\s+`;
											const patA = escapedWords.join(mid);
											const patB = escapedWords.slice().reverse().join(mid); // reversed order
											const re = new RegExp(patA, 'i');
											const reRev = new RegExp(patB, 'i');
											if (re.test(s) || reRev.test(s)) { subjMatched = true; break; }
										}
									}
									if (subjMatched) break;
								}
								if (subjMatched) break;
							}

							if (!subjMatched) return false;
						}

						// if we've passed all checks, it's a match (or there's no subject/needed rules and trigger_word handled earlier)
						return true;
					}

					// -----------------------
					// LoRA configs (your original list)
					// -----------------------
					let loraConfigs = [];

					if (unet_name.includes('i2v')) {
						loraConfigs = [
							// Style
							{
								label: 'v25',
								folder: 'style',
								needed_word: ['v25'],
								subject: ['detail'],
								category: ['general'],
							},

							// Camera
							{
								label: 'camera_orbit',
								folder: 'camera',
								subject: ['camera/360|rotate/orbit/turn/spin'],
								category: ['camera_movement'],
							},

							// Detailers
							{
								label: 'water_splash',
								subject: ['water splash'],
								gap: 3,
								category: ['other'],
							},

							// Feet
							{
								label: 'show_feet',
								subject: [
									'show/display/reveal/expose/present|feet/foot/soles/toes',
									'raise/lift/put/prop|feet/foot/leg',
								],
								needed_word: ['feet', 'foot', 'soles', 'toes'],
								trigger_word: ['feet up'],
								category: ['feet_focus'],
								gap: 3
							},

							// Ass
							{
								label: 'shake_ass',
								subject: ['twerk', 'booty/ass/butt|shake/dance'],
								trigger_word: ['performs an ass shaking dance'],
								category: ['twerk'],
								gap: 3,
							},

							// Facial expressions / style
							{
								label: 'ahegao_middle_finger',
								subject: ['ahegao', 'middle finger'],
								category: ['expressions'],
							},
							{
								label: 'sigma_face',
								subject: ['sigma face'],
								trigger_word: ['doing sigma face expression'],
								category: ['expressions'],
							},

							// Undress
							{
								label: 'scanner_nude',
								subject: ['scan'],
								needed_word: ['nude', 'clothes are removed', 'become nude', 'undress', 'nudify'],
								trigger_word: ['Video of all women get scanned,the clothes are removed and become nude'],
								category: ['undress'],
								gap: 3
							},
							{
								label: 'panties_aside',
								subject: ['panties', 'underwear', 'thong', 'panty'],
								needed_word: ['aside', 'pull', 'slide', 'shift', 'move', 'remove'],
								trigger_word: ['The girl pulls her panties aside, exposing her vagina'],
								category: ['undress'],
								gap: 3
							},

							// Sex family
							{
								label: 'doggy_zoom_reveal',
								subject: ['zoom reveal'],
								needed_word: ['doggy'],
								trigger_word: ['Camera zooms out right away to reveal her on all fours, naked, ass in the air, having fast, rough, intense sex with a man behind her. The man is thrusting is penis inside her from behind, causing her hips to jolt with each impact.'],
								category: ['sex_position'],
							},
							{
								label: 'zoom_reveal',
								subject: ['zoom reveal'],
								needed_word: ['sex', 'fuck', 'porn'],
								trigger_word: ['The camera zooms out as she is having sex'],
								category: ['sex_position'],
							},
							{
								label: 'nelson_sex',
								subject: ['nelson|fuck/sex'],
								category: ['sex_position'],
							},
							{
								label: 'xray_sex',
								subject: ['sex', 'fuck', 'porn'],
								needed_word: ['x ray'],
								category: ['sex_position'],
							},
							{
								label: 'outsauce',
								subject: ['sex', 'fuck', 'porn'],
								needed_word: ['outsauce'],
								trigger_word: ["outsauce, A person is at the center of the frame as another person enters from off-screen. The first person inserts their penis inside the other person's anus and they start having sex while the camera slowly zooms out to reveal more of the scene"],
								category: ['sex_position'],
							},
							{
								label: 'double_penetration',
								subject: ['double penetration'],
								trigger_word: ["double penetration"],
								category: ['sex_position'],
							},
							{
								label: 'analplay',
								subject: ['anal dildo'],
								trigger_word: ['A girl engaged in extreme anal play'],
								category: ['sex_position'],
							},
							{
								label: 'fade_sex_spoon',
								subject: ['sex', 'fuck'],
								needed_words: ['fade', 'spoon'],
								trigger_word: ["spn_lie_diagonally_behind_vagina"],
								category: ['sex_position'],
							},
							{
								label: 'fade_cowgirl',
								subject: ['cow girl', 'riding|sex/fuck'],
								needed_word: ['fade'],
								trigger_word: ["reverse_cowgirl_lie_front_vagina"],
								category: ['sex_position'],
							},
							{
								label: 'blink_cowgirl',
								subject: ['cow girl', 'riding|sex/fuck'],
								needed_word: ['cut', 'scene change', 'jumpcut', 'cut scene', 'scene cut', 'smash cut', 'smashcut', 'transition', 'cast', 'blink', 'crossfade', 'cutaway', 'establishing shot'],
								category: ['sex_position'],
								gap: 4,
							},
							{
								label: 'anal_reverse_cowgirl',
								subject: ['reverse cow girl'],
								needed_word: ['anal'],
								category: ['sex_position'],
							},
							{
								label: 'reverse_cowgirl',
								subject: ['reverse cow girl'],
								trigger_word: ['reverse_cowgirl_lie_front_vagina'],
								category: ['sex_position'],
							},
							{
								label: 'hard_cowgirl',
								subject: ['hard cow girl'],
								category: ['sex_position'],
							},
							{
								label: 'mating_press',
								subject: ['mating press'],
								trigger_word: ['mating press'],
								category: ['sex_position'],
							},
							{
								label: 'blink_missionary',
								subject: ['missionary', 'knees to chest/leg spread|sex/fuck'],
								needed_word: ['cut', 'scene change', 'jumpcut', 'cut scene', 'scene cut', 'smash cut', 'smashcut', 'transition', 'cast', 'blink', 'crossfade', 'cutaway', 'establishing shot'],
								category: ['sex_position'],
							},
							{
								label: 'pov_missionary',
								subject: ['missionary', 'knees to chest/leg spread|sex/fuck'],
								needed_word: ['pov'],
								category: ['sex_position'],
							},
							{
								label: 'missionary',
								subject: ['missionary', 'knees to chest/leg spread|sex/fuck'],
								category: ['sex_position'],
							},
							{
								label: 'reverse_suspended_congress',
								subject: ['reverse suspended congress'],
								category: ['sex_position'],
							},
							{
								label: 'sex_from_behind',
								subject: ['from behind|fuck/sex/style'],
								gap: 4,
								category: ['sex_position'],
							},
							{
								label: 'transition_sideleg_sex',
								subject: ['side leg/one leg standing|style/sex/fuck'],
								needed_word: ['cut', 'scene change', 'jumpcut', 'cut scene', 'scene cut', 'smash cut', 'smashcut', 'transition', 'cast', 'blink', 'crossfade', 'cutaway', 'establishing shot'],
								category: ['sex_position'],
								gap: 4,
							},
							{
								label: 'fade_doggy_style',
								subject: ['doggy|fuck/sex/style'],
								needed_word: ['fade'],
								trigger_word: ["doggy_kneel_diagonally_behind_vagina"],
								category: ['sex_position'],
							},
							{
								label: 'blink_back_doggy_style',
								subject: ['from behind/look back|sex/fuck/doggy style'],
								needed_word: ['cut', 'scene change', 'jumpcut', 'cut scene', 'scene cut', 'smash cut', 'smashcut', 'transition', 'cast', 'blink', 'crossfade', 'cutaway', 'establishing shot'],
								category: ['sex_position'],
								gap: 32,
							},
							{
								label: 'blink_doggy_style',
								subject: ['from front/face forward/face camera/stand|sex/fuck/doggy style'],
								needed_word: ['cut', 'scene change', 'jumpcut', 'cut scene', 'scene cut', 'smash cut', 'smashcut', 'transition', 'cast', 'blink', 'crossfade', 'cutaway', 'establishing shot'],
								category: ['sex_position'],
								gap: 32,
							},
							{
								label: 'sex_cut',
								subject: ['sex', 'fuck', 'porn'],
								needed_word: ['cut', 'scene change', 'jumpcut', 'cut scene', 'scene cut', 'smash cut', 'smashcut', 'transition', 'cast', 'blink', 'crossfade', 'cutaway', 'establishing shot'],
								trigger_word: ['<SM4SHCUT>'],
								category: ['sex_position'],
							},
							{
								label: 'cowgirl',
								subject: ['cow girl'],
								needed_word: ['sex', 'fuck', 'porn'],
								trigger_word: ['r3v3rs3_c0wg1rl, c0wg1rl, straddling  him in the reverse cowgirl position'],
								category: ['sex_position'],
							},
							{
								label: 'doggy',
								subject: ['doggy|fuck/sex/style'],
								category: ['sex_position'],
							},
							{
								label: 'anal_v2',
								subject: ['anal'],
								needed_word: ['v2'],
								trigger_word: ['anal sex'],
								category: ['sex_position'],
							},
							{
								label: 'anal',
								subject: ['anal'],
								trigger_word: ['anal sex'],
								category: ['sex_position'],
							},
							{
								label: 'sex_slider',
								subject: ['fuck/sex'],
								needed_word: ['zoom'],
								category: ['sex_position'],
							},

							// With hands
							{
								label: 'blink_handjob',
								subject: ['hand job'],
								needed_word: ['cut', 'scene change', 'jumpcut', 'cut scene', 'scene cut', 'smash cut', 'smashcut', 'transition', 'cast', 'blink', 'crossfade', 'cutaway', 'establishing shot'],
								category: ['hand'],
							},

							// Oral
							{
								label: 'double_blowjob',
								subject: ['double/2 girl|blow job'],
								trigger_word: ['d0ubl3_bj'],
								category: ['oral'],
							},
							{
								label: 'penis_play',
								subject: ['penis/dick/cock|play/tease/touch/lick/worship'],
								trigger_word: ['penis worshipping'],
								category: ['oral'],
							},
							{
								label: 'footjob',
								subject: ['foot job'],
								trigger_word: ["The female's feet move up and down. Her toes surround his penis. The girl is performing a footjob."],
								category: ['oral'],
							},
							{
								label: 'shoejob',
								subject: ['shoe job'],
								trigger_word: ['Her feet move up and down. the girl is performing a shoejob.'],
								category: ['oral'],
							},
							{
								label: 'cheek_insertion',
								subject: ['cheek|insert/penetrate'],
								trigger_word: ["A man appears and he inserts his penis into her cheek. A man is moving his penis in and out of a female's mouth."],
								category: ['insertion', 'oral'],
								gap: 8,
							},
							{
								label: 'oral_insertion',
								subject: ['oral/mouth|insert/penetrate'],
								trigger_word: ['A man appears and she sucks his penis'],
								category: ['insertion', 'oral'],
								gap: 8,
							},
							{
								label: 'handjob_blowjob',
								subject: ['blow job'],
								needed_word: ['hand job'],
								category: ['hand', 'oral'],
							},
							{
								label: 'bbc_deepthroat',
								subject: ['deep throat', 'throat|sex/fuck'],
								needed_word: ['bbc', 'black penis', 'black dick', 'black cock', 'black man'],
								trigger_word: ["black dick, bbc"],
								category: ['oral'],
							},
							{
								label: 'deepthroat',
								subject: ['deep throat', 'throat|sex/fuck'],
								trigger_word: ["deep throat"],
								gap: 4,
								category: ['oral'],
							},
							{
								label: 'blowjob',
								subject: ['blow job', 'fellatio', 'oral', 'face/mouth|sex/fuck', 'suck/blow|penis/dick/cock'],
								trigger_word: ['bl0wj0b'],
								gap: 4,
								category: ['oral'],
							},
							{
								label: 'blink_blowjob',
								subject: ['blow job', 'fellatio', 'oral', 'face/mouth|sex/fuck', 'suck/blow|penis/dick/cock'],
								needed_word: ['cut', 'scene change', 'jumpcut', 'cut scene', 'scene cut', 'smash cut', 'smashcut', 'transition', 'cast', 'blink', 'crossfade', 'cutaway', 'establishing shot'],
								gap: 4,
								category: ['oral'],
							},

							// Posing / Fetish
							{
								label: 'jacko_pose',
								subject: ['jack o pose', 'j4ck0'],
								trigger_word: ['j4ck0, she spreads her legs, arches her back, puts her head on the floor, puts ass in the air and does a perfect j4ck0 pose while tilting her head up to look at the camera and smile'],
								category: ['pose'],
							},
							{
								label: 'bend_forward',
								subject: ['bend/lean|forward'],
								trigger_word: ['bends forward to show her cleavage'],
								category: ['pose'],
							},
							{
								label: 'cat_pose',
								subject: ['cat/neko/paw|pose'],
								trigger_word: ['The girl moves into in a paw pose with her fists raised, looking at the viewer.'],
								category: ['pose'],
							},

							// Dildo / toys
							{
								label: 'fucking_machine',
								subject: ['fuck/sex/dildo|machine'],
								category: ['fetish'],
							},

							// Cum variants
							{
								label: 'body_cumshot',
								subject: ['body/breast/boob/chest|cumshot'],
								trigger_word: ['b0dyshot'],
								category: ['cum'],
							},
							{
								label: 'blink_facial',
								subject: ['facial/face/shoot|cum/cumshot'],
								needed_word: ['cut', 'scene change', 'jumpcut', 'cut scene', 'scene cut', 'smash cut', 'smashcut', 'transition', 'cast', 'blink', 'crossfade', 'cutaway', 'establishing shot'],
								category: ['cum'],
								gap: 8,
							},
							{
								label: 'facial',
								subject: ['facial/face/shoot|cum/cumshot'],
								needed_word: ['cum'],
								trigger_word: ['cum shoots out of the penis and lands on her face and her eyes and her mouth'],
								gap: 8,
								category: ['cum'],
							},
							{
								label: 'cumshot_v2',
								subject: ['cumshot', 'ejaculate'],
								needed_word: ['v2'],
								trigger_word: ['cum shoots out of the penis and lands on her face and her eyes and her mouth'],
								category: ['cum'],
							},
							{
								label: 'cumshot_penis_appears',
								subject: ['cumshot', 'ejaculate'],
								needed_word: ['penis', 'dick'],
								category: ['cum'],
							},
							{
								label: 'cumshot',
								subject: ['cumshot', 'ejaculate'],
								trigger_word: ['cum shoots out of the penis and lands on her face and her eyes and her mouth'],
								category: ['cum'],
							},

							// Motion / performance
							{
								label: 'dance',
								subject: ['dance'],
								category: ['motion'],
							},

							// Paizuri
							{
								label: 'blink_titjob',
								subject: ['tit/titty/breast/boob|fuck/sex/job', 'paizuri'],
								needed_word: ['cut', 'scene change', 'jumpcut', 'cut scene', 'scene cut', 'smash cut', 'smashcut', 'transition', 'cast', 'blink', 'crossfade', 'cutaway', 'establishing shot'],
								category: ['breasts'],
								gap: 4,
							},
							{
								label: 'paizuri',
								subject: ['tit/titty/breast/boob|fuck/sex/job', 'paizuri'],
								trigger_word: ['titJob'],
								category: ['breasts'],
								gap: 4,
							},

							// Insertion
							{
								label: 'breast_insertion',
								subject: ['breast/boob/chest|insert/penetrate'],
								trigger_word: ['A man appears and inserts his penis between her breasts'],
								category: ['insertion', 'breasts'],
								gap: 8,
							},
							{
								label: 'missionary_insertion',
								subject: ['missionary|insert/penetrate'],
								category: ['insertion', 'sex_position'],
								gap: 8,
							},
							{
								label: 'anal_insertion',
								subject: ['anal/ass/anus|insert/penetrate'],
								trigger_word: ["anal insertion, the video depicts a man slowly inserting his dick into a female's anus"],
								category: ['insertion', 'anal'],
								gap: 8,
							},
							{
								label: 'penis_insertion',
								subject: ['penis/dick/cock|insert/penetrate'],
								trigger_word: ['A man appears and inserts his penis into her.'],
								category: ['insertion', 'sex_position', 'anal', 'breasts', 'oral'],
								gap: 8,
							},

							// Body / motion
							{
								label: 'face_sit',
								subject: ['face sit'],
								trigger_word: ["Face sitting. A girl places her crotch over the camera, obscuring the view. The final frame of the video is a close up of the female's crotch"],
								category: ['body_motion'],
							},
							{
								label: 'ass_ripple',
								subject: ['ass ripple'],
								trigger_word: ['ass ripple, dick going in anal. Then he starts to move hips back and forth.'],
								category: ['body_motion'],
							},
							{
								label: 'bouncy_walk',
								subject: ['breast/boob/chest|bounce/jiggle'],
								needed_word: ['walk'],
								trigger_word: ['her breasts are bouncing'],
								category: ['breast_bounce'],
							},
							{
								label: 'bouncing_breasts',
								subject: ['breast/boob/chest|bounce/jiggle'],
								trigger_word: ["her breasts are bouncing"],
								category: ['breast_bounce'],
							},
							{
								label: 'breast_expansion',
								subject: ['breast/boob/chest|expand/grow/inflate'],
								trigger_word: ['Br3ast3xpansion, her breasts grow'],
								category: ['body_change'],
							},

							// Male perspective or finish
							{
								label: 'orgasm',
								subject: ['she/female/girl/woman|orgasm'],
								gap: 6,
								trigger_word: ['She is orgasming. She is experiencing an orgasm. She closes her eyes and has a screaming orgasm. Her whole body shakes and spasms as she has a shaking orgasm.'],
								category: ['expressions'],
							},
							{
								label: 'male_finish',
								subject: ['man/male|orgasm/finish/ejaculate'],
								trigger_word: ['The man ejaculates'],
								gap: 2,
								category: ['finish'],
							},
							{
								label: 'naked_stranger_man_erect',
								subject: ['nude/nude|man/male'],
								gap: 2,
								category: ['finish'],
							},

							// Fingering / touch category
							{
								label: 'fisting',
								subject: ['anal/pussy/vagina|fist'],
								trigger_word: ['Male fist is moving in and out of girl bottom part'],
								category: ['hands'],
							},
							{
								label: 'massage_tits',
								subject: ['breast/boob/chest/nipple|massage'],
								trigger_word: ["The man has his hands around the girl breasts and massages her breasts with his hands"],
								category: ['upper_body_touch'],
							},
							{
								label: 'nipple_stroke',
								subject: ['breast/boob/chest/nipple|stroke'],
								trigger_word: ['nipple_stroke'],
								category: ['upper_body_touch'],
							},
							{
								label: 'nipple_suck',
								subject: ['breast/boob/chest/nipple|suck'],
								trigger_word: ['n1ppl3suck1ng'],
								category: ['upper_body_touch'],
							},
							{
								label: 'breast_play',
								subject: ['breast/boob/chest/nipple|play'],
								trigger_word: ["breast play, nipple play"],
								category: ['upper_body_touch'],
							},
							{
								label: 'fingering_pussy',
								subject: ['pussy/vagina|finger'],
								trigger_word: ["girl pushing fingers into pussy, two fingers, solo, targeting her vaginal entrance"],
								category: ['lower_body_touch'],
							},
							{
								label: 'sensual_fingering',
								subject: ['pussy/vagina|masturbate'],
								category: ['lower_body_touch'],
							},
							{
								label: 'foot_worship',
								subject: ['foot worship', 'suck foot'],
								trigger_word: ['foot worship'],
								gap: 4,
								category: ['lower_body_touch'],
							},

							// Detailers
							/*{
								label: 'penis',
								folder: 'detailers',
								subject: ['penis', 'cock|male/genital'],
								category: ['penis_detailers'],
								gap: 4,
							},*/
						];

						for (const cfg of loraConfigs) {
							cfg.label += '_i2v';
						}
					}
					else {
						let loraConfigs = [
							// detailers
							{
								label: 'futanari',
								folder: 'detailers',
								subject: ['futanari', 'futa', 'hermaphrodite'],
								category: ['character']
							},
							{
								label: 'microbikini',
								folder: 'detailers',
								subject: ['tiny/micro/mini/small/little/slim/thin|swimwear/bikini/bathing suit/swimsuit/microkini'],
								category: ['clothing'],
							},
							{
								label: 'pussy',
								folder: 'detailers',
								subject: ['pussy'],
								category: ['female_genitalia'],
							},
							{
								label: 'vagina',
								folder: 'detailers',
								subject: ['vagina', 'girl/woman/female|genitelia/genitals/private part'],
								category: ['female_genitalia'],
								gap: 4,
							},

							// style
							{
								label: 'blade_runner',
								folder: 'style',
								subject: ['blade runner', 'cyberpunk', 'neon', 'dystopian', 'futuristic', 'sci fi'],
								category: [],
								nsfw: false,
							},

							// Twerking
							{
								label: 'twerking',
								subject: ['twerk', 'booty/ass/butt|shake/dance'],
								category: ['twerk'],
								gap: 3,
							},

							// facial expressions / style
							{
								label: 'ahegao',
								subject: ['ahegao', 'tongue out face', 'eyes rolled back'],
								category: ['expressions'],
							},

							// Oral / Blowjob family
							{
								label: 'bbc_blowjob',
								subject: ['blow job'],
								needed_word: ['bbc'],
								category: ['oral'],
								gap: 4,
							},
							{
								label: 'side_deepthroat',
								subject: ['deep throat', 'throat|sex/fuck'],
								needed_word: ['side'],
								category: ['oral'],
								gap: 4,
							},
							{
								label: 'blowjob_sideview',
								subject: ['blow job', 'fellatio', 'oral/mouth|sex/fuck', 'suck/lick/blow|penis/dick/cock'],
								needed_word: ['side'],
								category: ['oral'],
								gap: 4,
							},
							{
								label: 'blowjob_v2',
								subject: ['blow job', 'fellatio', 'oral/mouth|sex/fuck', 'suck/lick/blow|penis/dick/cock'],
								needed_word: ['v2'],
								category: ['oral'],
								gap: 4,
							},
							{
								label: 'blowjob',
								subject: ['blow job', 'fellatio', 'oral/mouth|sex/fuck', 'suck/lick/blow|penis/dick/cock'],
								category: ['oral'],
								gap: 4,
							},
							{
								label: 'deepthroat',
								subject: ['deep throat', 'throat|sex/fuck'],
								trigger_word: ["a girl in front of a penis, she engages in a deep throat blowjob, she swallows the penis all the way. Her lips touches the man's groin. Her nose smashes against the man's hips"],
								category: ['oral'],
								gap: 4,
							},

							// Playing
							{
								label: 'rubbing',
								subject: ['masturbate|rub|pussy/vagina', 'rubbing', 'grind|sex/fuck'],
								category: ['manual'],
								gap: 4,
							},
							{
								label: 'breast_play',
								subject: ['breast play', 'boob|touch/suck'],
								trigger_word: ['breast play'],
								category: ['manual'],
								gap: 4,
							},

							// Fetish / Body-related
							{
								label: 'big_perky_breasts',
								folder: 'detailers',
								subject: ['big perky breasts', 'big tits|boob'],
								category: ['breast_detailers'],
								gap: 4,
							},
							{
								label: 'saggy_tits',
								folder: 'detailers',
								subject: ['saggy tits', 'droopy breasts|boob'],
								category: ['breast_detailers'],
								gap: 4,
							},
							{
								label: 'pubic_hair',
								folder: 'detailers',
								subject: ['pubic hair', 'hair|groin'],
								category: ['pussy_detailers'],
								gap: 4,
							},
							{
								label: 'tiny_panties',
								folder: 'detailers',
								subject: ['tiny panties', 'underwear|panty'],
								category: ['clothing'],
								gap: 4,
							},
							{
								label: 'pov_titty_fuck',
								subject: ['tit/titty/breast/boob|fuck/sex/job', 'paizuri'],
								category: ['breasts'],
								gap: 4,
							},

							// Walk
							{
								label: 'jiggle',
								subject: ['jiggle walk', 'bounce|boob/ass'],
								category: ['walk'],
								gap: 4,
							},

							// Misc / Fantasy / Extreme
							{
								label: 'scary_slider',
								folder: 'effect',
								subject: ['scary', 'creepy|scene/fx'],
								category: ['detailers'],
								gap: 4,
							},
							{
								label: 'sit_effect_learn',
								subject: ['sit effect', 'sit|fx/learn'],
								category: ['effect'],
								gap: 4,
							},
							{
								label: 'penis',
								folder: 'detailers',
								subject: ['penis', 'cock|male/genital'],
								category: ['penis_detailers'],
								gap: 4,
							},
							{
								label: 'pussy_v2',
								folder: 'detailers',
								subject: ['pussy', 'vagina|female/genital'],
								needed_word: ['v2'],
								category: ['pussy_detailers'],
								gap: 4,
							},
							{
								label: 'dildo_masturbation',
								subject: ['dildo/toy|masturbation'],
								category: ['manual'],
								gap: 4,
							},
							{
								label: 'bbc_ride',
								subject: ['bbc ride'],
								category: ['position'],
								gap: 4,
							},
							{
								label: 'xxx',
								subject: ['xxx', 'explicit'],
								category: ['general'],
								gap: 4,
							},

							// Ejaculate & finishers
							{
								label: 'facial',
								subject: ['facial', 'face'],
								needed_word: ['cumshot'],
								category: ['ejaculate_penis'],
								gap: 4,
							},
							{
								label: 'facial',
								subject: ['facial', 'cum|face/mouth'],
								category: ['ejaculate_penis'],
								gap: 4,
							},
							{
								label: 'facials',
								subject: ['facials', 'cumshot face'],
								category: ['ejaculate_penis'],
								gap: 4,
							},
							{
								label: 'body_shots',
								subject: ['body', 'breasts'],
								needed_word: ['cumshot'],
								trigger_word: ['b0dyshot, pull0ut'],
								category: ['ejaculate_penis'],
								gap: 4,
							},
							{
								label: 'cumshot',
								subject: ['cumshot'],
								category: ['ejaculate_penis'],
								gap: 4,
							},

							// Ejaculate & finishers
							{
								label: 'creampie',
								subject: ['cream pie', 'cum/fill|pussy/vagina', 'fill cum'],
								trigger_word: ['A female, the camera quickly pulls back to reveal her vagina, with sperm on her vagina, and the sperm continues to drip down from her vagina'],
								category: ['ejaculate_pussy'],
								gap: 4,

							},

							// Sex / intercourse
							{
								label: 'doggy_v2',
								subject: ['doggy style', 'rear|sex/fuck'],
								needed_word: ['v2'],
								category: ['sex_position'],
								gap: 4,
							},
							{
								label: 'cowgirl',
								subject: ['cow girl', 'riding|sex/fuck'],
								category: ['sex_position'],
								gap: 4,
							},
							{
								label: 'reverse_cowgirl',
								subject: ['reverse cow girl', 'reverse riding|sex/fuck'],
								category: ['sex_position'],
								gap: 4,
							},
							{
								label: 'reverse_cowgirl_v1',
								subject: ['reverse cow girl', 'reverse riding|sex/fuck'],
								needed_word: ['v2'],
								category: ['sex_position'],
								gap: 4,
							},
							{
								label: 'lotus_sex',
								subject: ['lotus position', 'lotus|sex/fuck'],
								category: ['sex_position'],
								gap: 4,
							},
							{
								label: 'mating_press',
								subject: ['mating press', 'press|sex/fuck'],
								trigger_word: ['mating press'],
								category: ['sex_position'],
								gap: 4,
							},
							{
								label: 'nelson_sex',
								subject: ['nelson|sex/fuck'],
								category: ['sex_position'],
								gap: 4,
							},
							{
								label: 'amazon_sex',
								subject: ['amazon position', 'amazon|sex/fuck'],
								category: ['sex_position'],
								gap: 4,
							},
							{
								label: 'thigh_sex',
								subject: ['thigh sex', 'thigh|sex/fuck'],
								trigger_word: ['thigh sex'],
								category: ['sex_position'],
								gap: 4,
							},
							{
								label: 'doggy_style',
								subject: ['from behind/doggy|style/sex/fuck'],
								trigger_word: ['doggy style sex'],
								category: ['sex_position'],
								gap: 4,
							},
							{
								label: 'standing_sex',
								subject: ['stand/upright|sex/fuck'],
								trigger_word: ["A man and a girl are having standing sex, the man is standing behind the girl and is thrusting his hip while penetrating her, they are having passionate sex"],
								category: ['sex_position'],
								gap: 4,
							},
							{
								label: 'anal_missionary',
								subject: ['missionary', 'knees to chest/leg spread|sex/fuck'],
								needed_word: ['anal', 'ass', 'anus'],
								category: ['sex_position'],
							},
							{
								label: 'pov_missionary',
								subject: ['missionary', 'knees to chest/leg spread|sex/fuck'],
								needed_word: ['pov'],
								category: ['sex_position'],
							},
							{
								label: 'prone_bone',
								subject: ['prone bone'],
								category: ['sex_position'],
							},
							{
								label: 'double_penetration',
								subject: ['double penetration'],
								trigger_word: ["a female, the camera quickly pulls back to reveal her vagina, her breasts are bouncing and her ass are bouncing, she was sitting and leaning back against a man, the man beneath her thrusting his penis in and out of her anus, another man on the left was thrusting his penis into and out of her pussy, their testicles continued to sway, her legs were spread apart, and her breasts could be seen spread apart, the man's buttocks were visible beneath her"],
								category: ['sex_position'],
							},
							{
								label: 'reverse_suspended_congress',
								subject: ['reverse suspended congress'],
								trigger_word: ['A girl is having sex in the reverse_suspended_congress position'],
								category: ['sex_position'],
							},
							{
								label: 'missionary_sex',
								subject: ['missionary', 'sex', 'fuck'],
								category: ['sex_position'],
							},

							// Toys & machines
							{
								label: 'dildo_ride',
								subject: ['dildo ride'],
								category: ['toy'],
								gap: 4,
							},
							{
								label: 'fucking_machine',
								subject: ['fuck/sex/dildo|machine'],
								category: ['toy'],
								gap: 4,
							},

							// Hands / manual stimulation
							{
								label: 'analfisting',
								subject: ['anal fist'],
								category: ['hands'],
								gap: 4,
							},
							{
								label: 'hand_in_panties',
								subject: ['hand in panties'],
								category: ['hands'],
								gap: 4,
							},
							{
								label: 'pov_hand_job',
								subject: ['hand|job/stimulation'],
								needed_word: ['pov'],
								category: ['hands'],
								gap: 4,
							},
							{
								label: 'handjobs',
								subject: ['hand|job/stimulation'],
								category: ['hands'],
								gap: 4,
							},

							// Oral / insertion
							{
								label: 'oral_insertion',
								subject: ['oral insert', 'oral/mouth|penis/dick|insert'],
								category: ['insertion', 'oral'],
								gap: 8,
							},

							// Misc / play
							{
								label: 'pillow_humping',
								subject: ['pillow hump'],
								category: ['misc'],
								gap: 4,
							},

							// Kissing / intimate
							{
								label: 'kissing',
								subject: ['kiss'],
								category: ['mouth'],
							},

							// Detailers
							{
								label: 'replicate_wan25',
								folder: 'style',
								needed_word: ['v25'],
								subject: ['detail'],
								category: ['general'],
							},
						];

						for (const cfg of loraConfigs) {
							cfg.label += '_t2v';
						}
					}

					//console.log("positivePrompt: " + positivePrompt);

					// decide whether we are running in "workflow building" mode
					// Only allow caching/adding nodes when payload is provided AND base indices are non-null.
					const isCaching = !payload?.__isFake && payload?.__isCaching;
					const runtimeCanModifyWorkflow = Boolean(payload) && baseHighModelIdx != null && baseLowModelIdx != null;

					// helper: add or reuse node only when runtimeCanModifyWorkflow === true
					function addOrReuseLoraNode(loraName, strenghtValue, modelChainIdx) {
						// If we are not in workflow-modification mode, do nothing (no add, no cache).
						if (!runtimeCanModifyWorkflow) {
							//console.log(`[LoRA] Skipping add/reuse for ${loraName} (no workflow payload)`);
							// Return unchanged indices so caller's chain stays the same.
							return { previous: modelChainIdx, nodeIdx: modelChainIdx, reused: false, skipped: true };
						}

						// runtime can modify workflow: attempt reuse from cache
						if (addedLoraNodes.has(loraName)) {
							const existingNodeIdx = addedLoraNodes.get(loraName);
							//console.log(`[LoRA] Reusing existing LoRA node for ${loraName} -> node ${existingNodeIdx}`);
							return { previous: modelChainIdx, nodeIdx: existingNodeIdx, reused: true, skipped: false };
						}

						// create node and cache it
						const prev = modelChainIdx;
						const nodeIdx = addNode(payload, {
							class_type: "LoraLoaderModelOnly",
							inputs: {
								lora_name: loraName,
								strength_model: strenghtValue,
								model: [prev, 0]
							}
						});

						if (isCaching)
							addedLoraNodes.set(loraName, nodeIdx);

						//console.log(`[LoRA] Added new LoRA node for ${loraName} -> node ${nodeIdx}`);
						return { previous: prev, nodeIdx, reused: false, skipped: false };
					}

					//console.log(`[LoRA] ============================= ${i} =============================`);

					// Main logic (keeps your prior structure)
					const containsNSFW = containsAdultContent(positivePrompt);
					let addedAnyLora = false;
					const categoryUsage = {};

					for (const cfg of loraConfigs) {
						try {
							// Cache expanded forms
							if (!expandedWordsCache.has(cfg.label)) {
								expandedWordsCache.set(cfg.label, {
									subject: (cfg.subject || []).flatMap(s => expandWordForms(s)),
									needed_word: (cfg.needed_word || []).flatMap(s => expandWordForms(s)),
									needed_words: (cfg.needed_words || []).flatMap(s => expandWordForms(s)),
									trigger_word: cfg.trigger_word || [],
									strenght: cfg.strenght || 1.0,
									gap: cfg.gap || 0,
								});
							}

							cfg._expanded = expandedWordsCache.get(cfg.label);

							if (checkRegex(positivePrompt, cfg)) {
								//console.log(`[LoRA] Matched config: ${cfg.label}, nsfw=${cfg?.nsfw}`);

								// --- Multi-category handling ---
								const categoryNames = (cfg.category && cfg.category.length)
									? cfg.category.map(name => `${name}_${i}`)
									: [`default_${i}`];
								let categoryLimit = 1; // default limit
								if (cfg.category && cfg.category.length > 1 && typeof cfg.category[1] === 'number') {
									categoryLimit = cfg.category[1];
								}

								// Check if any category reached the limit
								const maxCount = Math.max(...categoryNames.map(name => categoryUsage[name] || 0));
								if (maxCount >= categoryLimit) {
									//console.log(`[LoRA] Skipping ${cfg.label} (one of categories '${categoryNames.join(',')}' reached limit ${categoryLimit})`);
									continue;
								}

								const folder = cfg.folder || 'character_action';
								const strenght = cfg.strenght || 1.0;

								// --- Build high variant name ---
								let unetHigh = unet_name.includes('t2v') ? 't2v_high' : 'i2v_high';
								let typeHigh = unetHigh.includes('t2v') ? 't2v' : 'i2v';
								let suffixHigh = unetHigh.includes('high') ? '_high' : '_low';
								const loraNameHigh = `14b/${typeHigh}/2.5/${folder}/${cfg.label.replace(/_i2v|_t2v/g, '')}${suffixHigh}.safetensors`;
								//console.log(`[LoRA] Processing matched LoRA (high): ${loraNameHigh} (categories '${categoryNames.join(',')}', will use ${maxCount + 1}/${categoryLimit})`);

								// Add or reuse high node
								let skippedLora = false;

								// --- Add or reuse high node ---
								previousHighModelIdx = highModelIdx;
								{
									const { previous, nodeIdx, skipped, reused } = addOrReuseLoraNode(loraNameHigh, strenght, previousHighModelIdx);
									previousHighModelIdx = previous;
									highModelIdx = nodeIdx;

									if (skipped) skippedLora = true;
								}

								// --- Build low variant name ---
								let unetLow = unet_name.includes('t2v') ? 't2v_low' : 'i2v_low';
								let typeLow = unetLow.includes('t2v') ? 't2v' : 'i2v';
								let suffixLow = unetLow.includes('high') ? '_high' : '_low';
								const loraNameLow = `14b/${typeLow}/2.5/${folder}/${cfg.label.replace(/_i2v|_t2v/g, '')}${suffixLow}.safetensors`;
								//console.log(`[LoRA] Processing matched LoRA (low): ${loraNameLow} (categories '${categoryNames.join(',')}', will use ${maxCount + 1}/${categoryLimit})`);

								// Add or reuse low node
								previousLowModelIdx = lowModelIdx;
								{
									const { previous, nodeIdx, skipped, reused } = addOrReuseLoraNode(loraNameLow, strenght, previousLowModelIdx);
									previousLowModelIdx = previous;
									lowModelIdx = nodeIdx;

									if (skipped) skippedLora = true;
								}

								if (!skippedLora) {
									// --- Optimize trigger word injection ---
									if (cfg.trigger_word?.length) {
										const lowerPrompt = positivePrompt.toLowerCase();
										const wordsToAdd = cfg.trigger_word.filter(word => !lowerPrompt.includes(word.toLowerCase()));
										if (wordsToAdd.length) {
											positivePrompt = wordsToAdd.join(', ') + ', ' + positivePrompt;
										}
									}

									// --- Update usage for all categories ---
									categoryNames.forEach(name => {
										categoryUsage[name] = (categoryUsage[name] || 0) + 1;
									});

									addedAnyLora = true;
								}
							}
						} catch (e) {
							console.warn('[LoRA] checkRegex error for', cfg.label, e);
						}
					}

					if (!addedAnyLora && containsNSFW) {
						//console.log(`[LoRA] No LoRA matched but containsNSFW=true, injecting fallback NSFW LoRA`);

						if (unet_name.includes('t2v'))
							unet_name = "t2v_low";
						else
							unet_name = "i2v_low";

						let skippedLora = false;

						// low fallback
						{
							const fallbackLow = '14b/' + ((unet_name && unet_name.includes('t2v')) ? 't2v' : 'i2v') + '/2.5/style/nsfw' + ((unet_name && unet_name.includes('high')) ? '_high' : '_low') + '.safetensors';
							previousLowModelIdx = lowModelIdx;
							const { previous, nodeIdx, skipped, reused } = addOrReuseLoraNode(fallbackLow, 1.0, previousLowModelIdx);
							if (skipped) skippedLora = true;
							//if (!skippedLora)
							{
								previousLowModelIdx = previous;
								lowModelIdx = nodeIdx;
							}
						}

						if (unet_name.includes('t2v'))
							unet_name = "t2v_high";
						else
							unet_name = "i2v_high";

						// high fallback
						{
							const fallbackHigh = '14b/' + ((unet_name && unet_name.includes('t2v')) ? 't2v' : 'i2v') + '/2.5/style/nsfw' + ((unet_name && unet_name.includes('high')) ? '_high' : '_low') + '.safetensors';
							previousHighModelIdx = highModelIdx;
							const { previous, nodeIdx, skipped, reused } = addOrReuseLoraNode(fallbackHigh, 1.0, previousHighModelIdx);
							if (skipped) skippedLora = true;
							//if (!skippedLora)
							{
								previousHighModelIdx = previous;
								highModelIdx = nodeIdx;
							}
						}

						//if (!skippedLora)
						{
							if (!positivePrompt.toLowerCase().includes('nsfwsks')) {
								positivePrompt = 'nsfwsks, ' + positivePrompt;
							}
							addedNSFW = true;
						}
					}

					// ALWAYS return this exact shape (per your requirement)
					return { previousHighModelIdx, previousLowModelIdx, highModelIdx, lowModelIdx, positivePrompt, negativePrompt };
				}

				return { previousHighModelIdx, previousLowModelIdx, highModelIdx, lowModelIdx, positivePrompt, negativePrompt };
			}

			function adjustLoraStrengthsByCategory(payload, userConfig = {}) {
				if (!payload || !payload.prompt) return;

				const cfg = Object.assign({
					normalUnit: 1.0,
					actionUnit: 1.0,
					normalReduction: 0.2,
					styleReduction: 0.075,
					detailersReduction: 0.125,
					actionReduction: 0.05,
				}, userConfig);

				const loraEntries = Object.entries(payload.prompt || {})
					.filter(([_, node]) => node && node.class_type === 'LoraLoaderModelOnly')
					.map(([key, node]) => {
						let name = (node.inputs && node.inputs.lora_name) || '';
						let normName = name
							.toLowerCase()
							.replace(/_high\.safetensors$/, '.safetensors')
							.replace(/_low\.safetensors$/, '.safetensors'); // normalize high/low
						return { key, node, name, normName };
					});

				if (!loraEntries.length) {
					//console.log('No LORA nodes found.');
					return;
				}

				function detectCategory(nameLower) {
					if (nameLower.includes('/svi/')) return 'svi';
					if (nameLower.includes('/boost/')) return 'boost';
					if (nameLower.includes('/style/')) return 'style';
					if (nameLower.includes('/detailers/')) return 'detailers';
					if (nameLower.includes('character_action') || nameLower.includes('/action/') || nameLower.includes(' action')) return 'action';
					return 'normal';
				}

				loraEntries.forEach(e => { e.cat = detectCategory(e.normName); });
				//console.log(loraEntries);

				// unique list for counting
				function uniqueByNormName(list) {
					const seen = new Set();
					return list.filter(e => {
						if (seen.has(e.normName)) return false;
						seen.add(e.normName);
						return true;
					});
				}

				const normalList = uniqueByNormName(loraEntries.filter(e => e.cat === 'normal'));
				const actionList = uniqueByNormName(loraEntries.filter(e => e.cat === 'action'));
				const styleList = uniqueByNormName(loraEntries.filter(e => e.cat === 'style'));
				const detailersList = uniqueByNormName(loraEntries.filter(e => e.cat === 'detailers'));
				const boostList = uniqueByNormName(loraEntries.filter(e => e.cat === 'boost'));
				const sviList = uniqueByNormName(loraEntries.filter(e => e.cat === 'svi'));

				const normalCount = normalList.length;
				const actionCount = actionList.length;
				const styleCount = styleList.length;
				const detailersCount = detailersList.length;
				const boostCount = boostList.length;
				const sviCount = sviList.length;

				const totalCount = normalCount + actionCount + styleCount + detailersCount - boostCount - sviCount;

				const effectiveCount =
					(styleCount * cfg.normalUnit) +
					(normalCount * cfg.normalUnit) +
					(detailersCount * cfg.normalUnit) +
					(actionCount * cfg.actionUnit);

				if (effectiveCount <= 0) {
					//console.log(`Found ${loraEntries.length} LORAs (${boostList.length} boost ignored, ${sviList.length} boost ignored). effectiveCount=${effectiveCount} → no adjustment.`);
					return;
				}

				//console.log(`Adjusting LORAs: normal=${normalCount}, action=${actionCount}, style=${styleCount}, detailers=${detailersCount}, boost(ignored)=${boostCount}, svi(ignored)=${sviCount}, effectiveCount=${effectiveCount.toFixed(3)}`);

				function applyList(list, reduction, label, skipIfOne = 0) {
					if ((skipIfOne === 1 && list.length <= 1) || totalCount <= 1) {
						//console.log(`Skipping reduction for ${label} category because only one unique LoRA found.`);
						return;
					}

					list.forEach(e => {
						// find all actual entries matching this normalized name
						const allVariants = loraEntries.filter(x => x.normName === e.normName);
						allVariants.forEach(({ key, node, name }) => {
							if (!node.inputs) node.inputs = {};
							const existing = Number(node.inputs.strength_model ?? 1.0);
							let totalReduction = +(reduction * effectiveCount).toFixed(2);
							if (skipIfOne === 2 && allVariants.length <= 1)
								totalReduction /= 2;
							const updated = Math.max(0.0, existing - totalReduction);
							node.inputs.strength_model = Number(updated.toFixed(2));
							//console.log(`${label} key=${key} name=${name} (group=${e.normName}) : ${existing} -> ${node.inputs.strength_model} (reduced ${totalReduction})`);
						});
					});
				}

				applyList(normalList, cfg.normalReduction, 'normal', 0);
				applyList(actionList, cfg.actionReduction, 'action', 1);
				applyList(styleList, cfg.styleReduction, 'style', 0);
				applyList(detailersList, cfg.detailersReduction, 'detailers', 0);
				//boostList.forEach(({ key, name }) => console.log(`boost (ignored): key=${key} name=${name}`));
			}

			const default_fps = 16;
			const interpolation_factor = parseInt(interpolation, 10);
			const interpolation_fps = parseInt(default_fps * interpolation_factor, 10);

			let modelHigh = "t2v/t2v_high_noise_lightx2v_fp8_e4m3fn_scaled.safetensors";
			let modelLow = "t2v/t2v_low_noise_fp8_e4m3fn_scaled.safetensors";

			if (lastFrameFile !== null || startFrameFile !== null || videoFile !== null) {
				modelHigh = "i2v/2.5/lightx2v_1030_high_fp8_e4m3fn_scaled.safetensors";
				modelLow = "i2v/2.5/lightx2v_low_fp8_e4m3fn_scaled.safetensors";
			}

			function parseTimestampedPrompt(prompt) {
				if (!prompt || typeof prompt !== 'string') return null;

				const lines = prompt.split('\n').map(l => l.trim()).filter(Boolean);
				if (!lines.length) return null;

				const segments = [];

				for (const line of lines) {
					const m = line.match(/^([\d.]+)-([\d.]+){(.*)}$/);
					if (!m) return null; // not timestamped → fallback
					segments.push({
						start: parseFloat(m[1]),
						end: parseFloat(m[2]),
						text: m[3].trim()
					});
				}

				return segments;
			}

			let segments;
			const cachePrompts = new Map(); // promptText -> { positivePrompt, negativePrompt }

			function processTimestampedPrompts(
				positivePrompt,
				negativePrompt,
				model
			) {
				segments = parseTimestampedPrompt(positivePrompt);
				//console.log("segments: " + segments);
				if (!segments) {
					return addLora14B(null, 0, 0, null, null, positivePrompt, negativePrompt, model);
				}

				const processedSegments = segments.map(seg => {
					if (!cachePrompts.has(seg.text)) {
						const result = addLora14B(
							null,
							0,
							0,
							null,
							null,
							seg.text,
							negativePrompt,
							model
						);
						cachePrompts.set(seg.text, result);
					}

					const cached = cachePrompts.get(seg.text);

					return {
						start: seg.start,
						end: seg.end,
						text: cached.positivePrompt
					};
				})

				const serializedPositive = processedSegments
					.map(s => `${s.start.toFixed(2)}-${s.end.toFixed(2)}{${s.text}}`)
					.join('\n');

				return {
					positivePrompt: serializedPositive,
					negativePrompt: negativePrompt
				};
			}

			const result = processTimestampedPrompts(
				positivePrompt,
				negativePrompt,
				modelHigh || modelLow
			);

			positivePrompt = result.positivePrompt;
			negativePrompt = result.negativePrompt;

			function getTotalDuration(segments) {
				if (!segments || !segments.length) return 0;
				return segments.reduce((total, seg) => total + (seg.end - seg.start), 0);
			}

			const totalDuration = getTotalDuration(segments);
			if (totalDuration > 15)
				throw new Error(`Total timestamp exceeds 15s!`);
			
			let payload = null;

			let wanMoESchedulerIdx = -1;
			let clipEncodeNegIdx = -1;
			let vaeDecodeIdx = -1;

			const q = parseInt(quality);
			steps = Math.min(12, 4 + 2 * (q - 1));

			const priority = req.body.priority;
			const highSteps = Math.round(
				1 + (steps - 2) * ((priority - 1) / 4)
			);
			let lowSteps = steps - highSteps;

			function buildVideoModelPipeline(payload, unet_name) {
				let modelIdx = addNode(payload, {
					class_type: "UNETLoader",
					inputs: {
						unet_name,
						weight_dtype: "default"
					}
				});

				let previousModelIdx = modelIdx;
				/*modelIdx = addNode(payload, {
					class_type: "PatchModelPatcherOrder",
					inputs: { patch_order: "weight_patch_first", full_load: "auto", model: [previousModelIdx, 0] }
				});*/

				if (req.body.torchAccumulation === 'true') {
					previousModelIdx = modelIdx;
					modelIdx = addNode(payload, {
						class_type: "ModelPatchTorchSettings",
						inputs: { enable_fp16_accumulation: true, model: [previousModelIdx, 0] }
					});
				}

				if (req.body.torchCompiler === 'true') {
					previousModelIdx = modelIdx;
					modelIdx = addNode(payload, {
						class_type: "TorchCompileModelAdvanced",
						inputs: {
							backend: "inductor",
							fullgraph: false,
							mode: "default",
							dynamic: "auto",
							compile_transformer_blocks_only: true,
							dynamo_cache_size_limit: 1024,
							debug_compile_keys: false,
							model: [previousModelIdx, 0]
						}
					});
				}

				let sage_attention = req.body.sageAttention;

				if (req.body.sageAttention !== 'disabled' && !unet_name.includes('scaled')) {
					sage_attention = 'sageattn_qk_int8_pv_fp16_cuda';
				}

				previousModelIdx = modelIdx;
				modelIdx = addNode(payload, {
					class_type: "PathchSageAttentionKJ",
					inputs: {
						sage_attention,
						allow_compile: true,
						model: [previousModelIdx, 0],
					}
				});

				if (nag === 'true') {
					previousModelIdx = modelIdx;
					modelIdx = addNode(payload, {
						class_type: "WanVideoNAG",
						inputs: {
							nag_scale: 11, nag_alpha: 0.25, nag_tau: 2.5,
							model: [previousModelIdx, 0],
							conditioning: [clipEncodeNegIdx, 0]
						}
					});
				}

				/*const modelGB = 16;
				const gpuVRAM = config.VRAM;
				const blocks_to_swap = Math.max(1, Math.min(40, Math.round((height * width) * ((Number(duration) / 115200) * (modelGB / gpuVRAM)))));
	
				if (blocks_to_swap > 20) {
					previousModelIdx = modelIdx;
					modelIdx = addNode(payload, {
						class_type: "wanBlockSwap",
						inputs: {
							blocks_to_swap,
							offload_img_emb: false,
							offload_txt_emb: false,
							use_non_blocking: true,
							model: [previousModelIdx, 0]
						}
					});
				}*/

				return modelIdx;
			}

			if (videoFile !== null) {
				payload = { prompt: {} };
				payload.__isFake = false;
				payload.__isCaching = true;

				const VHS_LoadVideoFFmpeg = addNode(payload, {
					class_type: "VHS_LoadVideoFFmpegPath",
					inputs: {
						video: videoPath,
						force_rate: 16,
						custom_width: 0,
						custom_height: 0,
						frame_load_cap: 0,
						start_time: 0,
						format: "Wan",
					}
				});

				const resizedVideoIdx = addNode(payload, {
					class_type: "WanVideoImageResizeToClosest",
					inputs: {
						generation_width: 832,
						generation_height: 480,
						aspect_ratio_preservation: "keep_input",
						image: [VHS_LoadVideoFFmpeg, 0]
					}
				});

				let loadImageIdx = null;
				let getFirstFrameIdx = null;

				if (startFrameFile !== null) {
					loadImageIdx = addNode(payload, {
						class_type: "LoadImage",
						inputs: {
							image: startFramePath
						}
					});
				} else {
					getFirstFrameIdx = addNode(payload, {
						class_type: "ImageFromBatch",
						inputs: {
							image: [VHS_LoadVideoFFmpeg, 0],
							batch_index: 0,
							length: 1,
						}
					});
				}

				const referenceIdx = addNode(payload, {
					class_type: "WanVideoImageResizeToClosest",
					inputs: {
						generation_width: [resizedVideoIdx, 1],
						generation_height: [resizedVideoIdx, 2],
						aspect_ratio_preservation: "stretch_to_new",
						image: loadImageIdx !== null ? [loadImageIdx, 0] : [getFirstFrameIdx, 0]
					}
				});

				let reverseIdx = addNode(payload, {
					class_type: "ReverseImageBatch",
					inputs: { images: [resizedVideoIdx, 0] }
				});

				const videoLastSecondsUnreversedIdx = addNode(payload, {
					class_type: "ImageFromBatch",
					inputs: {
						image: [reverseIdx, 0],
						batch_index: 0,
						length: 81,
					}
				});

				const videoLastSecondsIdx = addNode(payload, {
					class_type: "ReverseImageBatch",
					inputs: { images: [videoLastSecondsUnreversedIdx, 0] }
				});

				const clipLoaderIdx = addNode(payload, {
					class_type: "CLIPLoader",
					inputs: {
						clip_name: false /*&& /nsfw/i.test(positivePrompt) && containsAdultContent(positivePrompt)*/ ? "nsfw_wan_umt5-xxl_fp8_scaled.safetensors" : "umt5_xxl_fp16.safetensors",
						type: "wan",
						device: "default"
					}
				});

				const vaeLoaderIdx = addNode(payload, {
					class_type: "VAELoaderKJ",
					inputs: {
						vae_name: "wan_fp16.safetensors",
						device: "main_device",
						weight_dtype: "fp16"
					}
				});

				// —————————————————————————————————————————————————————————————————————
				// 7. Text Encoding
				// —————————————————————————————————————————————————————————————————————

				const clipSetLayerIdx = addNode(payload, {
					class_type: "CLIPSetLastLayer",
					inputs: { stop_at_clip_layer: clipSkip * -1, clip: [clipLoaderIdx, 0] }
				});

				clipEncodeNegIdx = addNode(payload, {
					class_type: "CLIPTextEncode",
					inputs: {
						text: negativePrompt, // [deepTranslatorNegativeTextNodeIdx, 0],
						clip: [clipSetLayerIdx, 0]
					}
				});

				let samplerLastIdx;

				const finalHighModelIdx = buildVideoModelPipeline(
					payload,
					modelHigh,
				);

				const finalLowModelIdx = buildVideoModelPipeline(
					payload,
					modelLow,
				);

				wanMoESchedulerIdx = addNode(payload, {
					class_type: "WanMoEScheduler",
					inputs: {
						scheduler: scheduler !== 'light' ? scheduler : 'ddim_uniform',
						steps_high: highSteps,
						steps_low: lowSteps,
						boundary: 0.875,
						interval: 0.01,
						denoise: 1.0,
						model: [finalHighModelIdx, 0]
					}
				});

				let ModelSamplingSD3;

				if (/*parseInt(shift !== 8)*/true) {
					ModelSamplingSD3 = addNode(payload, {
						class_type: "ModelSamplingSD3",
						inputs: { shift: parseInt(shift) === 0 ? [wanMoESchedulerIdx, 0] : shift, model: [finalHighModelIdx, 0] }
					});
				}

				let lightSchedulerSigmasIdx;
				let basicSchedulerIdx;

				if (scheduler === 'light') {
					lightSchedulerSigmasIdx = addNode(payload, {
						class_type: "WanLightx2vSchedulerBasic",
						inputs: {
							steps,
							sigma_max: 1.0,
							sigma_min: 0.0,
							shift: parseInt(shift) === 0 ? [wanMoESchedulerIdx, 0] : shift
						}
					});
				}
				else {
					basicSchedulerIdx = addNode(payload, {
						class_type: "BasicScheduler",
						inputs: {
							model: [ModelSamplingSD3, 0],
							scheduler: scheduler !== 'light' ? scheduler : 'ddim_uniform',
							steps: steps,
							denoise: 1.0
						}
					});
				}

				const splitSigmasIdx = addNode(payload, {
					class_type: "SplitSigmas",
					inputs: {
						sigmas: (scheduler !== 'light' ? (moe === 'true' ? [wanMoESchedulerIdx, 4] : [basicSchedulerIdx, 0]) : [lightSchedulerSigmasIdx, 0]),
						step: highSteps
					}
				});

				const samplerSelectIdx = addNode(payload, {
					class_type: "KSamplerSelect",
					inputs: {
						sampler_name: sampler
					}
				});

				const VAEEncodeVideoLastSeconds = addNode(payload, {
					class_type: "VAEEncode",
					inputs: {
						pixels: [videoLastSecondsIdx, 0],
						vae: [vaeLoaderIdx, 0],
					}
				});

				/*const VAEDecodeVideoLastSeconds = addNode(payload, {
					class_type: "VAEDecode",
					inputs: {
						samples: [VAEEncodeVideoLastSeconds, 0],
						vae: [vaeLoaderIdx, 0],
					}
				});*/

				// —————————————————————————————————————————————————————————————————————
				// 9. Video Generation
				// —————————————————————————————————————————————————————————————————————

				let stitchedImagesIdx = null;
				let images = null;

				if (!segments) {
					const clipEncodePosIdx = addNode(payload, {
						class_type: "CLIPTextEncode",
						inputs: {
							text: positivePrompt || '',
							clip: [clipSetLayerIdx, 0]
						}
					});

					const anchorSamplesIdx = addNode(payload, {
						class_type: "VAEEncode",
						inputs: {
							pixels: [referenceIdx, 0],
							vae: [vaeLoaderIdx, 0],
						}
					});

					const motionAmp = 1 + (0.1 * Number(motion));
					const wanLatentIdx = addNode(payload, {
						class_type: "IAMCCS_WanImageMotion",
						inputs: {
							positive: [clipEncodePosIdx, 0],
							negative: [clipEncodeNegIdx, 0],
							anchor_samples: [anchorSamplesIdx, 0],
							anchor_image: [referenceIdx, 0],
							structural_repulsion_boost,
							prev_samples: [VAEEncodeVideoLastSeconds, 0],
							length: (length + (motion_latent_count * 4)) + 1,
							motion_latent_count,
							motion: motionAmp,
							motion_mode: 'all_nonfirst (anchor+motion)',
							color_protect: Number(colorDriftCorrection) !== 0,
							correct_strength: Number(colorDriftCorrection),
							add_reference_latents: true,
							latent_precision: fp16Latent === "true" ? 'fp16' : 'auto',
							vram_profile: 'normal',
							include_padding_in_motion: dynamicLatent === "true",
						}
					});

					const currentHighModelIdx = addNode(payload, {
						class_type: "LoraLoaderModelOnly",
						inputs: {
							lora_name: '14b/i2v/2.5/svi/high.safetensors',
							strength_model: 1.0,
							model: [finalHighModelIdx, 0]
						}
					});

					const currentLowModelIdx = addNode(payload, {
						class_type: "LoraLoaderModelOnly",
						inputs: {
							lora_name: '14b/i2v/2.5/svi/low.safetensors',
							strength_model: 1.0,
							model: [finalLowModelIdx, 0]
						}
					});

					// -------------------------------
					// LoRAs
					// -------------------------------
					const loraResult = addLora14B(
						payload,
						currentHighModelIdx,
						currentLowModelIdx,
						currentHighModelIdx,
						currentLowModelIdx,
						positivePrompt,
						negativePrompt,
						modelHigh || modelLow
					);

					if (sampler.includes('/')) {
						const samplerFirstIdx = addNode(payload, {
							class_type: "ClownsharKSampler_Beta",
							inputs: {
								eta: 0.5,
								seed: seed,
								cfg: cfg,
								sampler_name: sampler,
								scheduler: scheduler,
								steps: steps,
								steps_to_run: highSteps,
								denoise: 1,
								sampler_mode: 'standard',
								bongmath: true,
								model: [loraResult.highModelIdx, 0],
								positive: [wanLatentIdx, 0],
								negative: [wanLatentIdx, 1],
								latent_image: [wanLatentIdx, 4],
								sigmas: [basicSchedulerIdx, 0]
							}
						});

						samplerLastIdx = addNode(payload, {
							class_type: "ClownsharkChainsampler_Beta",
							inputs: {
								eta: 0.5,
								sampler_name: sampler,
								steps_to_run: -1,
								cfg: cfg,
								sampler_mode: 'resample',
								bongmath: true,
								model: [loraResult.lowModelIdx, 0],
								positive: [wanLatentIdx, 0],
								negative: [wanLatentIdx, 1],
								latent_image: [samplerFirstIdx, 0],
							}
						});
					}
					else {
						const samplerFirstIdx = addNode(payload, {
							class_type: "SamplerCustom",
							inputs: {
								model: [loraResult.highModelIdx, 0],
								positive: [wanLatentIdx, 0],
								negative: [wanLatentIdx, 1],
								latent_image: [wanLatentIdx, 4],
								sampler: [samplerSelectIdx, 0],
								sigmas: [splitSigmasIdx, 0],
								cfg,
								add_noise: 'enable',
								noise_seed: seed,
							}
						});

						samplerLastIdx = addNode(payload, {
							class_type: "SamplerCustom",
							inputs: {
								model: [loraResult.lowModelIdx, 0],
								positive: [wanLatentIdx, 0],
								negative: [wanLatentIdx, 1],
								latent_image: [samplerFirstIdx, 1],
								sampler: [samplerSelectIdx, 0],
								sigmas: [splitSigmasIdx, 1],
								cfg,
								add_noise: disableSamplerNoise === "true" ? "disable" : "false",
								noise_seed: seed,
							}
						});
					}

					/*const VRAMDebugDecodeVaeIdx = addNode(payload, {
						class_type: "VRAM_Debug",
						inputs: {
							empty_cache: true,
							gc_collect: true,
							unload_all_models: true,
							any_input: [samplerLastIdx, 0]
						}
					});*/

					// decode node
					vaeDecodeIdx = addNode(payload, {
						class_type: "VAEDecodeTiled",
						inputs: {
							tile_size: 256,
							overlap: length + 4,
							temporal_size: length + 4,
							temporal_overlap: length + 4,
							samples: [samplerLastIdx, 0],
							vae: [vaeLoaderIdx, 0]
						}
					}); /* gives frames */

					images = [vaeDecodeIdx, 0];
				} else {
					let start_image = [referenceIdx, 0];
					let previousSamplesIdx = null;
					let previousDecodeIdx = null;
					let anchorSamplesIdx = null;
					let firstAnchorSampleIdx = null;
					let currentLowModelIdx = null;
					let currentHighModelIdx = null;
					let lastSVILowModelIdx = null;
					let lastSVIHighModelIdx = null;

					for (let i = 0; i < segments.length; i++) {
						const seg = segments[i];
						const cached = cachePrompts.get(seg.text);

						// -------------------------------
						// CLIP encode
						// -------------------------------
						const clipEncodePosIdx_i = addNode(payload, {
							class_type: "CLIPTextEncode",
							inputs: {
								text: cached.positivePrompt,
								clip: [clipSetLayerIdx, 0]
							}
						});

						const segFrames = Math.max(1, Math.round((seg.end - seg.start) * 16));
						const motionAmp = 1 + (0.1 * Number(motion));

						let latentIdx_i;

						if (i === 0) {
							anchorSamplesIdx = addNode(payload, {
								class_type: "VAEEncode",
								inputs: {
									pixels: start_image,
									vae: [vaeLoaderIdx, 0],
								}
							});

							latentIdx_i = addNode(payload, {
								class_type: "IAMCCS_WanImageMotion",
								inputs: {
									positive: [clipEncodePosIdx_i, 0],
									negative: [clipEncodeNegIdx, 0],
									anchor_samples: [anchorSamplesIdx, 0],
									anchor_image: start_image,
									structural_repulsion_boost,
									prev_samples: [VAEEncodeVideoLastSeconds, 0],
									length: (segFrames + (motion_latent_count * 4)) + 1,
									motion_latent_count,
									motion: motionAmp,
									motion_mode: 'all_nonfirst (anchor+motion)',
									color_protect: Number(colorDriftCorrection) !== 0,
									correct_strength: Number(colorDriftCorrection),
									add_reference_latents: true,
									latent_precision: fp16Latent === "true" ? 'fp16' : 'auto',
									vram_profile: 'normal',
									include_padding_in_motion: dynamicLatent === "true",
								}
							});

							firstAnchorSampleIdx = anchorSamplesIdx;
						}
						else {
							if (previousDecodeIdx && sampler.includes('/')) {
								let VAEEncodePreviousFrames = addNode(payload, {
									class_type: "VAEEncode",
									inputs: {
										pixels: [previousDecodeIdx, 0],
										vae: [vaeLoaderIdx, 0],
									}
								});
								previousSamplesIdx = [VAEEncodePreviousFrames, 0];
							}

							latentIdx_i = addNode(payload, {
								class_type: "IAMCCS_WanImageMotion",
								inputs: {
									positive: [clipEncodePosIdx_i, 0],
									negative: [clipEncodeNegIdx, 0],
									anchor_samples: [anchorSamplesIdx, 0],
									anchor_image: start_image,
									structural_repulsion_boost,
									prev_samples: dynamicLatent === "true" ? null : previousSamplesIdx,
									length: (segFrames + (motion_latent_count * 4)) + 1,
									motion_latent_count,
									motion: motionAmp,
									motion_mode: 'all_nonfirst (anchor+motion)',
									color_protect: Number(colorDriftCorrection) !== 0,
									correct_strength: Number(colorDriftCorrection),
									add_reference_latents: true,
									latent_precision: fp16Latent === "true" ? 'fp16' : 'auto',
									vram_profile: 'normal',
									include_padding_in_motion: dynamicLatent === "true",
								}
							});
						}

						// -------------------------------
						// LoRAs
						// -------------------------------
						if (i === 0) {
							const fakePayload = structuredClone(payload);
							fakePayload.__isFake = true;

							let loraResult = addLora14B(
								fakePayload,
								0, 0,
								finalHighModelIdx, finalLowModelIdx,
								seg.text,
								negativePrompt,
								modelHigh || modelLow,
								-1
							);

							const newLora = (loraResult.highModelIdx > currentHighModelIdx) ||
								(loraResult.lowModelIdx > currentLowModelIdx);

							const highModelIdx = newLora
								? finalHighModelIdx
								: currentHighModelIdx;

							const lowModelIdx = newLora
								? finalLowModelIdx
								: currentLowModelIdx;

							currentHighModelIdx = addNode(payload, {
								class_type: "LoraLoaderModelOnly",
								inputs: {
									lora_name: '14b/i2v/2.5/svi/high.safetensors',
									strength_model: 1.0,
									model: [highModelIdx, 0]
								}
							});

							currentLowModelIdx = addNode(payload, {
								class_type: "LoraLoaderModelOnly",
								inputs: {
									lora_name: '14b/i2v/2.5/svi/low.safetensors',
									strength_model: 1.0,
									model: [lowModelIdx, 0]
								}
							});

							lastSVILowModelIdx = currentLowModelIdx;
							lastSVIHighModelIdx = currentHighModelIdx;

							if (newLora) {
								loraResult = addLora14B(
									payload,
									0, 0,
									lastSVIHighModelIdx, lastSVILowModelIdx,
									seg.text,
									negativePrompt,
									modelHigh || modelLow,
									i
								);

								currentHighModelIdx = loraResult.highModelIdx;
								currentLowModelIdx = loraResult.lowModelIdx;
							}
						}
						else {
							const loraResult = addLora14B(
								payload,
								0, 0,
								lastSVIHighModelIdx, lastSVILowModelIdx,
								seg.text,
								negativePrompt,
								modelHigh || modelLow,
								i
							);

							currentHighModelIdx = (loraResult.highModelIdx > lastSVIHighModelIdx)
								? loraResult.highModelIdx
								: lastSVIHighModelIdx;

							currentLowModelIdx = (loraResult.lowModelIdx > lastSVILowModelIdx)
								? loraResult.lowModelIdx
								: lastSVILowModelIdx;
						}

						// -------------------------------
						// Samplers
						// -------------------------------
						let samplerLastIdx_i;

						if (sampler.includes('/')) {
							const samplerFirstIdx = addNode(payload, {
								class_type: "ClownsharKSampler_Beta",
								inputs: {
									eta: 0.5,
									seed: seed,
									cfg: cfg,
									sampler_name: sampler,
									scheduler: scheduler,
									steps: steps,
									steps_to_run: highSteps,
									denoise: 1,
									sampler_mode: 'standard',
									bongmath: true,
									model: [currentHighModelIdx, 0],
									positive: [latentIdx_i, 0],
									negative: [latentIdx_i, 1],
									latent_image: [latentIdx_i, 4],
									sigmas: [basicSchedulerIdx, 0]
								}
							});

							samplerLastIdx_i = addNode(payload, {
								class_type: "ClownsharkChainsampler_Beta",
								inputs: {
									eta: 0.5,
									sampler_name: sampler,
									steps_to_run: -1,
									cfg: cfg,
									sampler_mode: 'resample',
									bongmath: true,
									model: [currentLowModelIdx, 0],
									positive: [latentIdx_i, 2],
									negative: [latentIdx_i, 3],
									latent_image: [samplerFirstIdx, 0],
								}
							});
						}
						else {
							const samplerFirstIdx = addNode(payload, {
								class_type: "SamplerCustom",
								inputs: {
									model: [currentHighModelIdx, 0],
									positive: [latentIdx_i, 0],
									negative: [latentIdx_i, 1],
									latent_image: [latentIdx_i, 4],
									sampler: [samplerSelectIdx, 0],
									sigmas: [splitSigmasIdx, 0],
									cfg,
									add_noise: "enable",
									noise_seed: seed + (increaseSamplerSeeds === "true" ? i : 0),
								}
							});

							samplerLastIdx_i = addNode(payload, {
								class_type: "SamplerCustom",
								inputs: {
									model: [currentLowModelIdx, 0],
									positive: [latentIdx_i, 2],
									negative: [latentIdx_i, 3],
									latent_image: [samplerFirstIdx, 1],
									sampler: [samplerSelectIdx, 0],
									sigmas: [splitSigmasIdx, 1],
									cfg,
									add_noise: disableSamplerNoise === "true" ? "disable" : "false",
									noise_seed: seed + (increaseSamplerSeeds === "true" ? i : 0),
								}
							});
						}

						// -------------------------------
						// Decode
						// -------------------------------
						const vaeDecodeIdx_i = addNode(payload, {
							class_type: "VAEDecodeTiled",
							inputs: {
								tile_size: 256,
								overlap: segFrames + 4,
								temporal_size: segFrames + 4,
								temporal_overlap: segFrames + 4,
								samples: [samplerLastIdx_i, 0],
								vae: [vaeLoaderIdx, 0]
							}
						});

						const sourceImages = stitchedImagesIdx ? [stitchedImagesIdx, 2] : [previousDecodeIdx, 0];

						// -------------------------------
						// Stitch output
						// -------------------------------
						if (i !== 0) {
							stitchedImagesIdx = addNode(payload, {
								class_type: "ImageBatchExtendWithOverlap",
								inputs: {
									source_images: sourceImages,
									new_images: [vaeDecodeIdx_i, 0],
									overlap: (motion_latent_count * 4) + 1,
									overlap_side: 'source',
									overlap_mode: 'ease_in_out',
								}
							});
						}

						previousDecodeIdx = vaeDecodeIdx_i;

						if (segments.length > 1 && i !== segments.length - 1) {
							if (anchorSample !== "use_first") {
								const reverseIdx = addNode(payload, {
									class_type: "ReverseImageBatch",
									inputs: { images: [vaeDecodeIdx_i, 0] }
								});

								const lastFrameIdx = addNode(payload, {
									class_type: "ImageFromBatch",
									inputs: {
										image: [reverseIdx, 0],
										batch_index: 0,
										length: 1,
									}
								});

								let newAnchorSamplesIdx = addNode(payload, {
									class_type: "VAEEncode",
									inputs: {
										pixels: [lastFrameIdx, 0],
										vae: [vaeLoaderIdx, 0],
									}
								});

								if (anchorSample === "use_previous_last") {
									anchorSamplesIdx = newAnchorSamplesIdx;
								}
								else if (anchorSample === "add_previous_last_to_first") {
									anchorSamplesIdx = addNode(payload, {
										class_type: "LatentInterpolate",
										inputs: {
											samples1: [firstAnchorSampleIdx, 0],
											samples2: [newAnchorSamplesIdx, 0],
											ratio: 0.6,
										}
									});
								}
								else if (anchorSample === "add_all_previous_last_to_first") {
									let previousAnchorSamplesIdx = anchorSamplesIdx;
									anchorSamplesIdx = addNode(payload, {
										class_type: "LatentInterpolate",
										inputs: {
											samples1: [previousAnchorSamplesIdx, 0],
											samples2: [newAnchorSamplesIdx, 0],
											ratio: 0.6,
										}
									});
								}
							}

							//previousVideoIdx = vaeDecodeIdx_i;*/
							previousSamplesIdx = [samplerLastIdx_i, 0]
						}
					}

					images = stitchedImagesIdx ? [stitchedImagesIdx, 2] : [previousDecodeIdx, 0];
				}

				const combinedVideoIdx = addNode(payload, {
					class_type: "ImageBatchExtendWithOverlap",
					inputs: {
						source_images: [videoLastSecondsIdx, 0],
						new_images: images,
						overlap: (motion_latent_count * 4) + 1,
						overlap_side: 'source',
						overlap_mode: 'ease_in_out',
					}
				});

				images = [combinedVideoIdx, 2];

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

				if (upscaleResolution !== '480p') {
					const LoadUpscalerTensorrtModel = addNode(payload, {
						class_type: "LoadUpscalerTensorrtModel",
						inputs: {
							model: '4x-UltraSharpV2_Lite',
							precision: 'fp16'
						}
					});

					const UpscalerTensorrt = addNode(payload, {
						class_type: "UpscalerTensorrt",
						inputs: {
							images,
							upscaler_trt_model: [LoadUpscalerTensorrtModel, 0],
							resize_to: upscaleResolution,
							keep_aspect_ratio: 'keep',
						}
					});

					images = [UpscalerTensorrt, 0];
					/*const CacheCleaner = addNode(payload, {
						class_type: "CacheCleaner",
						inputs: {
							clean_cache: false,
							unload_models: false,
							free_memory: true,
							disable_gc: false,
							anything: images,
						}
					});
					images = [CacheCleaner, 0];*/
				}

				if (interpolation_factor !== 1) {
					const VRAM_Debug = addNode(payload, {
						class_type: "VRAM_Debug",
						inputs: {
							empty_cache: false,
							gc_collect: false,
							unload_all_models: true,
							any_input: images
						}
					});
					images = [VRAM_Debug, 0];

					const RifeTensorrt = addNode(payload, {
						class_type: "RifeTensorRT",
						inputs: {
							frames: images,
							model: "rife47",
							precision: "fp16",
							interpolation: interpolation_factor,
							cuda_graph: true,
							keep_loaded: false,
						}
					});

					images = [RifeTensorrt, 0];
				}

				let MMAudioSampler = null;

				if (generateAudio === 'true') {
					const MMAudioModelLoader = addNode(payload, {
						class_type: "MMAudioModelLoader",
						inputs: {
							mmaudio_model: 'mmaudio_44k_nsfw_fp16.safetensors',
							base_precision: 'fp16',
							use_offload_device: true
						}
					});

					const MMAudioFeatureUtilsLoader = addNode(payload, {
						class_type: "MMAudioFeatureUtilsLoader",
						inputs: {
							vae_model: 'mmaudio_vae_44k_fp16.safetensors',
							synchformer_model: 'mmaudio_synchformer_fp16.safetensors',
							clip_model: 'mmaudio_clip_fp16.safetensors',
							mode: '44k',
							precision: 'fp16',
							use_offload_device: true
						}
					});

					MMAudioSampler = addNode(payload, {
						class_type: "MMAudioSampler",
						inputs: {
							mmaudio_model: [MMAudioModelLoader, 0],
							feature_utils: [MMAudioFeatureUtilsLoader, 0],
							images,
							steps: 100,
							cfg: 4.5,
							seed,
							prompt: positiveAudioPrompt,
							negative_prompt: negativeAudioPrompt,
							mask_away_clip: false,
							force_offload: true,
							fps: interpolation_fps,
							force_fps: 25,
						}
					});
				}

				/*const CacheCleaner = addNode(payload, {
					class_type: "CacheCleaner",
					inputs: {
						clean_cache: false,
						unload_models: false,
						free_memory: true,
						disable_gc: false,
						anything: images,
					}
				});
				images = [CacheCleaner, 0];
	
				const RAMCleanup = addNode(payload, {
					class_type: "RAMCleanup",
					inputs: {
						clean_file_cache: true,
						clean_processes: true,
						clean_dlls: true,
						retry_times: 1,
						anything: images,
					}
				});
				images = [RAMCleanup, 0];*/

				const VHS_VideoCombine = addNode(payload, {
					class_type: "VHS_VideoCombine",
					inputs: {
						frame_rate: interpolation_fps,
						loop_count: 0,
						filename_prefix: fileOutputId + seed,
						format: "video/h264-mp4",
						pix_fmt: "yuv420p",
						crf: losslessEncoder === 'true' ? 0 : 18,
						save_metadata: userName === 'durieun02' || userName === 'Hobbs',
						pingpong: false,
						save_output: userName === 'durieun02' || userName === 'Hobbs',
						images,
						...(MMAudioSampler ? { audio: [MMAudioSampler, 0] } : {}),
						vae: [vaeLoaderIdx, 0]
					}
				});

				images = [VHS_VideoCombine, 0];
				addNode(payload, {
					class_type: "DynamicRAMCacheControl",
					inputs: {
						mode: 'RAM_PRESSURE (Auto Purge)',
						cleanup_threshold: "24",
						any_input: images,
					}
				});

				adjustLoraStrengthsByCategory(payload);
			}
			else if (lastFrameFile !== null && startFrameFile !== null) {
				payload = { prompt: {} };
				payload.__isFake = false;
				payload.__isCaching = true;

				const loadStartImageIdx = addNode(payload, {
					class_type: "LoadImage",
					inputs: { image: startFramePath }
				});

				const loadLastImageIdx = addNode(payload, {
					class_type: "LoadImage",
					inputs: { image: lastFramePath }
				});

				let resizeStartImageIdx = null;
				let resizeLastImageIdx = null;

				if (changeAspectRatio === 'keepProportionsStartFrame') {
					resizeStartImageIdx = addNode(payload, {
						class_type: "WanVideoImageResizeToClosest",
						inputs: {
							generation_width: baseWidth,
							generation_height: baseHeight,
							aspect_ratio_preservation: "keep_input",
							image: [loadStartImageIdx, 0]
						}
					});

					resizeLastImageIdx = addNode(payload, {
						class_type: "WanVideoImageResizeToClosest",
						inputs: {
							generation_width: [resizeStartImageIdx, 1],
							generation_height: [resizeStartImageIdx, 2],
							aspect_ratio_preservation: "crop_to_new",
							image: [loadLastImageIdx, 0]
						}
					});
				} else if (changeAspectRatio === 'keepProportionsLastFrame') {
					resizeLastImageIdx = addNode(payload, {
						class_type: "WanVideoImageResizeToClosest",
						inputs: {
							generation_width: baseWidth,
							generation_height: baseHeight,
							aspect_ratio_preservation: "keep_input",
							image: [loadLastImageIdx, 0]
						}
					});

					resizeStartImageIdx = addNode(payload, {
						class_type: "WanVideoImageResizeToClosest",
						inputs: {
							generation_width: [resizeLastImageIdx, 1],
							generation_height: [resizeLastImageIdx, 2],
							aspect_ratio_preservation: "crop_to_new",
							image: [loadStartImageIdx, 0]
						}
					});
				} else if (changeAspectRatio === 'closestARStartFrame') {
					resizeStartImageIdx = addNode(payload, {
						class_type: "WanVideoImageResizeToClosest",
						inputs: {
							generation_width: startWidth,
							generation_height: startHeight,
							aspect_ratio_preservation: "crop_to_new",
							image: [loadStartImageIdx, 0]
						}
					});

					resizeLastImageIdx = addNode(payload, {
						class_type: "WanVideoImageResizeToClosest",
						inputs: {
							generation_width: [resizeStartImageIdx, 1],
							generation_height: [resizeStartImageIdx, 2],
							aspect_ratio_preservation: "crop_to_new",
							image: [loadLastImageIdx, 0]
						}
					});
				} else if (changeAspectRatio === 'closestARLastFrame') {
					resizeLastImageIdx = addNode(payload, {
						class_type: "WanVideoImageResizeToClosest",
						inputs: {
							generation_width: lastWidth,
							generation_height: lastHeight,
							aspect_ratio_preservation: "crop_to_new",
							image: [loadLastImageIdx, 0]
						}
					});

					resizeStartImageIdx = addNode(payload, {
						class_type: "WanVideoImageResizeToClosest",
						inputs: {
							generation_width: [resizeLastImageIdx, 1],
							generation_height: [resizeLastImageIdx, 2],
							aspect_ratio_preservation: "crop_to_new",
							image: [loadStartImageIdx, 0]
						}
					});
				} else {
					resizeStartImageIdx = addNode(payload, {
						class_type: "WanVideoImageResizeToClosest",
						inputs: {
							generation_width: width,
							generation_height: height,
							aspect_ratio_preservation: "crop_to_new",
							image: [loadStartImageIdx, 0]
						}
					});

					resizeLastImageIdx = addNode(payload, {
						class_type: "WanVideoImageResizeToClosest",
						inputs: {
							generation_width: [resizeStartImageIdx, 1],
							generation_height: [resizeStartImageIdx, 2],
							aspect_ratio_preservation: "crop_to_new",
							image: [loadLastImageIdx, 0]
						}
					});
				}

				/*const deepTranslatorPositiveTextNodeIdx = addNode(payload, {
					class_type: "DeepTranslatorTextNode",
					inputs: {
						add_proxies: false,
						auth_data: "",
						from_translate: "auto",
						proxies: "",
						service: "GoogleTranslator [free]",
						text: positivePrompt,
						to_translate: req.body.language === 'en' ? 'english' : 'chinese (simplified)',
					}
				});
	
				const deepTranslatorNegativeTextNodeIdx = addNode(payload, {
					class_type: "DeepTranslatorTextNode",
					inputs: {
						add_proxies: false,
						auth_data: "",
						from_translate: "auto",
						proxies: "",
						service: "GoogleTranslator [free]",
						text: negativePrompt,
						to_translate: req.body.language === 'en' ? 'english' : 'chinese (simplified)',
					}
				});*/

				const clipLoaderIdx = addNode(payload, {
					class_type: "CLIPLoader",
					inputs: {
						clip_name: false /*&& /nsfw/i.test(positivePrompt) && containsAdultContent(positivePrompt)*/ ? "nsfw_wan_umt5-xxl_fp8_scaled.safetensors" : "umt5_xxl_fp16.safetensors",
						type: "wan",
						device: "default"
					}
				});

				const clipSetLayerIdx = addNode(payload, {
					class_type: "CLIPSetLastLayer",
					inputs: { stop_at_clip_layer: clipSkip * -1, clip: [clipLoaderIdx, 0] }
				});

				clipEncodeNegIdx = addNode(payload, {
					class_type: "CLIPTextEncode",
					inputs: {
						text: negativePrompt,
						clip: [clipSetLayerIdx, 0]
					}
				});

				const vaeLoaderIdx = addNode(payload, {
					class_type: "VAELoaderKJ",
					inputs: {
						vae_name: "wan_fp16.safetensors",
						device: "main_device",
						weight_dtype: "fp16"
					}
				});

				let samplerLastIdx;

				const finalHighModelIdx = buildVideoModelPipeline(
					payload,
					modelHigh,
				);

				const finalLowModelIdx = buildVideoModelPipeline(
					payload,
					modelLow,
				);

				wanMoESchedulerIdx = addNode(payload, {
					class_type: "WanMoEScheduler",
					inputs: {
						scheduler: scheduler !== 'light' ? scheduler : 'ddim_uniform',
						steps_high: highSteps,
						steps_low: lowSteps,
						boundary: 0.875,
						interval: 0.01,
						denoise: 1.0,
						model: [finalHighModelIdx, 0]
					}
				});

				let ModelSamplingSD3;

				if (/*parseInt(shift !== 8)*/true) {
					ModelSamplingSD3 = addNode(payload, {
						class_type: "ModelSamplingSD3",
						inputs: { shift: parseInt(shift) === 0 ? [wanMoESchedulerIdx, 0] : shift, model: [finalHighModelIdx, 0] }
					});
				}

				let lightSchedulerSigmasIdx;
				let basicSchedulerIdx;

				if (scheduler === 'light') {
					lightSchedulerSigmasIdx = addNode(payload, {
						class_type: "WanLightx2vSchedulerBasic",
						inputs: {
							steps,
							sigma_max: 1.0,
							sigma_min: 0.0,
							shift: parseInt(shift) === 0 ? [wanMoESchedulerIdx, 0] : shift
						}
					});
				}
				else {
					basicSchedulerIdx = addNode(payload, {
						class_type: "BasicScheduler",
						inputs: {
							model: [ModelSamplingSD3, 0],
							scheduler: scheduler !== 'light' ? scheduler : 'ddim_uniform',
							steps: steps,
							denoise: 1.0
						}
					});
				}

				const splitSigmasIdx = addNode(payload, {
					class_type: "SplitSigmas",
					inputs: {
						sigmas: (scheduler !== 'light' ? (moe === 'true' ? [wanMoESchedulerIdx, 4] : [basicSchedulerIdx, 0]) : [lightSchedulerSigmasIdx, 0]),
						step: highSteps
					}
				});

				const samplerSelectIdx = addNode(payload, {
					class_type: "KSamplerSelect",
					inputs: {
						sampler_name: sampler
					}
				});

				/*const vaeCompileIdx = addNode(payload, {
					class_type: "TorchCompileVAE",
					inputs: {
						backend: "inductor",
						fullgraph: false,
						mode: "default",
						compile_encoder: false,
						compile_decoder: true,
						vae: [vaeLoaderIdx, 0]
					}
				});*/


				// —————————————————————————————————————————————————————————————————————
				// 9. Video Generation
				// —————————————————————————————————————————————————————————————————————

				let stitchedImagesIdx = null;

				if (!segments) {
					const clipEncodePosIdx = addNode(payload, {
						class_type: "CLIPTextEncode",
						inputs: {
							text: positivePrompt,
							clip: [clipSetLayerIdx, 0]
						}
					});

					const wanLatentIdx = addNode(payload, {
						class_type: "PainterFLF2V",
						inputs: {
							width: [resizeStartImageIdx, 1],
							height: [resizeStartImageIdx, 2],
							length: length,
							motion_amplitude: 1 + (0.1 * Number(motion)),
							batch_size: 1,
							positive: [clipEncodePosIdx, 0],
							negative: [clipEncodeNegIdx, 0],
							vae: [vaeLoaderIdx, 0],
							start_image: [resizeStartImageIdx, 0],
							end_image: [resizeLastImageIdx, 0]
						}
					});

					// -------------------------------
					// LoRAs
					// -------------------------------
					const loraResult = addLora14B(
						payload,
						finalHighModelIdx,
						finalLowModelIdx,
						finalHighModelIdx,
						finalLowModelIdx,
						positivePrompt,
						negativePrompt,
						modelHigh || modelLow
					);

					if (sampler.includes('/')) {
						const samplerFirstIdx = addNode(payload, {
							class_type: "ClownsharKSampler_Beta",
							inputs: {
								"eta": 0.5,
								"seed": seed,
								"cfg": cfg,
								"sampler_name": sampler,
								"scheduler": scheduler,
								"steps": steps,
								"steps_to_run": highSteps,
								"denoise": 1,
								"sampler_mode": 'standard',
								"bongmath": true,
								"model": [loraResult.highModelIdx, 0],
								"positive": [wanLatentIdx, 0],
								"negative": [wanLatentIdx, 1],
								"latent_image": [wanLatentIdx, 2],
								"sigmas": [basicSchedulerIdx, 0]
							}
						});

						samplerLastIdx = addNode(payload, {
							class_type: "ClownsharkChainsampler_Beta",
							inputs: {
								eta: 0.5,
								sampler_name: sampler,
								steps_to_run: -1,
								cfg: cfg,
								sampler_mode: 'resample',
								bongmath: true,
								model: [loraResult.lowModelIdx, 0],
								positive: [wanLatentIdx, 0],
								negative: [wanLatentIdx, 1],
								latent_image: [samplerFirstIdx, 0],
							}
						});
					}
					else {
						const samplerFirstIdx = addNode(payload, {
							class_type: "SamplerCustom",
							inputs: {
								model: [loraResult.highModelIdx, 0],
								positive: [wanLatentIdx, 0],
								negative: [wanLatentIdx, 1],
								latent_image: [wanLatentIdx, 2],
								sampler: [samplerSelectIdx, 0],
								sigmas: [splitSigmasIdx, 0],
								cfg,
								add_noise: 'enable',
								noise_seed: seed,
							}
						});

						samplerLastIdx = addNode(payload, {
							class_type: "SamplerCustom",
							inputs: {
								model: [loraResult.lowModelIdx, 0],
								positive: [wanLatentIdx, 0],
								negative: [wanLatentIdx, 1],
								latent_image: [samplerFirstIdx, 1],
								sampler: [samplerSelectIdx, 0],
								sigmas: [splitSigmasIdx, 1],
								cfg,
								add_noise: disableSamplerNoise === "true" ? "disable" : "false",
								noise_seed: seed,
							}
						});
					}

					/*const VRAMDebugDecodeVaeIdx = addNode(payload, {
						class_type: "VRAM_Debug",
						inputs: {
							empty_cache: true,
							gc_collect: true,
							unload_all_models: true,
							any_input: [samplerLastIdx, 0]
						}
					});*/

					// decode node
					vaeDecodeIdx = addNode(payload, {
						class_type: "VAEDecodeTiled",
						inputs: {
							tile_size: 256,
							overlap: length + 4,
							temporal_size: length + 4,
							temporal_overlap: length + 4,
							samples: [samplerLastIdx, 0],
							vae: [vaeLoaderIdx, 0]
						}
					}); /* gives frames */

					stitchedImagesIdx = vaeDecodeIdx;
				} else {
					let start_image = [resizeStartImageIdx, 0];
					let previousVideoIdx = null;

					for (let i = 0; i < segments.length; i++) {
						const seg = segments[i];
						const cached = cachePrompts.get(seg.text);

						// -------------------------------
						// CLIP encode
						// -------------------------------
						const clipEncodePosIdx_i = addNode(payload, {
							class_type: "CLIPTextEncode",
							inputs: {
								text: cached.positivePrompt,
								clip: [clipSetLayerIdx, 0]
							}
						});

						const segFrames = Math.max(1, Math.round((seg.end - seg.start) * 16));
						const motionAmp = 1 + (0.1 * Number(motion));

						let latentIdx_i;

						if (i === 0) {
							latentIdx_i = addNode(payload, {
								class_type: "PainterI2VAdvanced",
								inputs: {
									width: [resizeStartImageIdx, 1],
									height: [resizeStartImageIdx, 2],
									length: segFrames + 1,
									motion_amplitude: motionAmp,
									batch_size: 1,
									positive: [clipEncodePosIdx_i, 0],
									negative: [clipEncodeNegIdx, 0],
									color_protect: Number(colorDriftCorrection) !== 0,
									correct_strength: Number(colorDriftCorrection),
									vae: [vaeLoaderIdx, 0],
									start_image: start_image
								}
							});
						}
						// =========================================================
						// SEGMENTS 1..N → PainterLongVideo
						// =========================================================
						else {
							latentIdx_i = addNode(payload, {
								class_type: "PainterLongVideo",
								inputs: {
									width: [resizeStartImageIdx, 1],
									height: [resizeStartImageIdx, 2],
									length: segFrames + 1,
									batch_size: 1,
									motion_frames: 5,
									motion_amplitude: motionAmp,

									positive: [clipEncodePosIdx_i, 0],
									negative: [clipEncodeNegIdx, 0],
									vae: [vaeLoaderIdx, 0],

									previous_video: [previousVideoIdx, 0],
									initial_reference_image: [resizeStartImageIdx, 0],
									start_image: start_image,
									...(i === segments.length - 1 ? { end_image: [resizeLastImageIdx, 0] } : {})
								}
							});
						}

						// -------------------------------
						// LoRAs
						// -------------------------------
						const loraResult = addLora14B(
							payload,
							finalHighModelIdx,
							finalLowModelIdx,
							finalHighModelIdx,
							finalLowModelIdx,
							seg.text,
							negativePrompt,
							modelHigh || modelLow
						);

						// -------------------------------
						// Samplers
						// -------------------------------
						let samplerLastIdx_i;

						if (sampler.includes('/')) {
							const samplerFirstIdx = addNode(payload, {
								class_type: "ClownsharKSampler_Beta",
								inputs: {
									eta: 0.5,
									seed: seed,
									cfg: cfg,
									sampler_name: sampler,
									scheduler: scheduler,
									steps: steps,
									steps_to_run: highSteps,
									denoise: 1,
									sampler_mode: 'standard',
									bongmath: true,
									model: [loraResult.highModelIdx, 0],
									positive: [latentIdx_i, 0],
									negative: [latentIdx_i, 1],
									latent_image: [latentIdx_i, i === 0 ? 4 : 2],
									sigmas: [basicSchedulerIdx, 0]
								}
							});

							samplerLastIdx_i = addNode(payload, {
								class_type: "ClownsharkChainsampler_Beta",
								inputs: {
									eta: 0.5,
									sampler_name: sampler,
									steps_to_run: -1,
									cfg: cfg,
									sampler_mode: 'resample',
									bongmath: true,
									model: [loraResult.lowModelIdx, 0],
									positive: [latentIdx_i, i === 0 ? 2 : 0],
									negative: [latentIdx_i, i === 0 ? 3 : 1],
									latent_image: [samplerFirstIdx, 0],
								}
							});
						}
						else {
							const samplerFirstIdx = addNode(payload, {
								class_type: "SamplerCustom",
								inputs: {
									model: [loraResult.highModelIdx, 0],
									positive: [latentIdx_i, 0],
									negative: [latentIdx_i, 1],
									latent_image: [latentIdx_i, i === 0 ? 4 : 2],
									sampler: [samplerSelectIdx, 0],
									sigmas: [splitSigmasIdx, 0],
									cfg,
									add_noise: "enable",
									noise_seed: seed + (increaseSamplerSeeds === "true" ? i : 0),
								}
							});

							samplerLastIdx_i = addNode(payload, {
								class_type: "SamplerCustom",
								inputs: {
									model: [loraResult.lowModelIdx, 0],
									positive: [latentIdx_i, i === 0 ? 2 : 0],
									negative: [latentIdx_i, i === 0 ? 3 : 1],
									latent_image: [samplerFirstIdx, 1],
									sampler: [samplerSelectIdx, 0],
									sigmas: [splitSigmasIdx, 1],
									cfg,
									add_noise: disableSamplerNoise === "true" ? "disable" : "false",
									noise_seed: seed + (increaseSamplerSeeds === "true" ? i : 0),
								}
							});
						}

						// -------------------------------
						// Decode
						// -------------------------------
						const vaeDecodeIdx_i = addNode(payload, {
							class_type: "VAEDecodeTiled",
							inputs: {
								tile_size: 256,
								overlap: segFrames + 4,
								temporal_size: segFrames + 4,
								temporal_overlap: segFrames + 4,
								samples: [samplerLastIdx_i, 0],
								vae: [vaeLoaderIdx, 0]
							}
						});

						// -------------------------------
						// Stitch output
						// -------------------------------
						if (!stitchedImagesIdx) {
							stitchedImagesIdx = vaeDecodeIdx_i;
						} else {
							stitchedImagesIdx = addNode(payload, {
								class_type: "ImageBatch",
								inputs: {
									image1: [stitchedImagesIdx, 0],
									image2: [vaeDecodeIdx_i, 0]
								}
							});
						}

						if (segments.length > 1 && i !== segments.length - 1) {
							const reverseIdx = addNode(payload, {
								class_type: "ReverseImageBatch",
								inputs: { images: [vaeDecodeIdx_i, 0] }
							});

							const lastFrameIdx = addNode(payload, {
								class_type: "ImageFromBatch",
								inputs: {
									image: [reverseIdx, 0],
									batch_index: 0,
									length: 1,
								}
							});

							start_image = [lastFrameIdx, 0];
							previousVideoIdx = vaeDecodeIdx_i;
						}
					}
				}

				let images = [stitchedImagesIdx, 0];

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

				const userData = userDoc.data();
				const totalProcessCount =
					(userData?.successfulDA || 0) +
					(userData?.successfulDV || 0) +
					(userData?.successfulDN || 0) +
					(userData?.successfulDF || 0);

				const accountTimestamp = userData?.createdAt || userData?.currentTime; // Firestore Timestamp fallback
				const accountCreatedAt = accountTimestamp?.toDate(); // Convert to JS Date if it exists

				const threeMonthsAgo = new Date();
				threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

				const isOlderThanThreeMonths = accountCreatedAt && accountCreatedAt <= threeMonthsAgo;
				if (userData?.paid >= 25 && totalProcessCount >= 100 || isOlderThanThreeMonths) {
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

				if (upscaleResolution !== '480p') {
					const LoadUpscalerTensorrtModel = addNode(payload, {
						class_type: "LoadUpscalerTensorrtModel",
						inputs: {
							model: '4x-UltraSharpV2_Lite',
							precision: 'fp16'
						}
					});

					const UpscalerTensorrt = addNode(payload, {
						class_type: "UpscalerTensorrt",
						inputs: {
							images,
							upscaler_trt_model: [LoadUpscalerTensorrtModel, 0],
							resize_to: upscaleResolution,
							keep_aspect_ratio: 'keep',
						}
					});

					images = [UpscalerTensorrt, 0];
					/*const CacheCleaner = addNode(payload, {
						class_type: "CacheCleaner",
						inputs: {
							clean_cache: false,
							unload_models: false,
							free_memory: true,
							disable_gc: false,
							anything: images,
						}
					});
					images = [CacheCleaner, 0];*/
				}

				if (interpolation_factor !== 1) {
					const VRAM_Debug = addNode(payload, {
						class_type: "VRAM_Debug",
						inputs: {
							empty_cache: false,
							gc_collect: false,
							unload_all_models: true,
							any_input: images
						}
					});
					images = [VRAM_Debug, 0];

					const RifeTensorrt = addNode(payload, {
						class_type: "RifeTensorRT",
						inputs: {
							frames: images,
							model: "rife47",
							precision: "fp16",
							interpolation: interpolation_factor,
							cuda_graph: true,
							keep_loaded: false,
						}
					});

					images = [RifeTensorrt, 0];
				}

				let MMAudioSampler = null;

				if (generateAudio === 'true') {
					const MMAudioModelLoader = addNode(payload, {
						class_type: "MMAudioModelLoader",
						inputs: {
							mmaudio_model: 'mmaudio_44k_nsfw_fp16.safetensors',
							base_precision: 'fp16',
							use_offload_device: true
						}
					});

					const MMAudioFeatureUtilsLoader = addNode(payload, {
						class_type: "MMAudioFeatureUtilsLoader",
						inputs: {
							vae_model: 'mmaudio_vae_44k_fp16.safetensors',
							synchformer_model: 'mmaudio_synchformer_fp16.safetensors',
							clip_model: 'mmaudio_clip_fp16.safetensors',
							mode: '44k',
							precision: 'fp16',
							use_offload_device: true
						}
					});

					MMAudioSampler = addNode(payload, {
						class_type: "MMAudioSampler",
						inputs: {
							mmaudio_model: [MMAudioModelLoader, 0],
							feature_utils: [MMAudioFeatureUtilsLoader, 0],
							images,
							steps: 100,
							cfg: 4.5,
							seed,
							prompt: positiveAudioPrompt,
							negative_prompt: negativeAudioPrompt,
							mask_away_clip: false,
							force_offload: true,
							fps: interpolation_fps,
							force_fps: 25,
						}
					});
				}

				/*const CacheCleaner = addNode(payload, {
					class_type: "CacheCleaner",
					inputs: {
						clean_cache: false,
						unload_models: false,
						free_memory: true,
						disable_gc: false,
						anything: images,
					}
				});
				images = [CacheCleaner, 0];
	
				const RAMCleanup = addNode(payload, {
					class_type: "RAMCleanup",
					inputs: {
						clean_file_cache: true,
						clean_processes: true,
						clean_dlls: true,
						retry_times: 1,
						anything: images,
					}
				});
				images = [RAMCleanup, 0];*/

				const VHS_VideoCombine = addNode(payload, {
					class_type: "VHS_VideoCombine",
					inputs: {
						frame_rate: interpolation_fps,
						loop_count: 0,
						filename_prefix: fileOutputId + seed,
						format: "video/h264-mp4",
						pix_fmt: "yuv420p",
						crf: losslessEncoder === 'true' ? 0 : 18,
						save_metadata: userName === 'durieun02' || userName === 'Hobbs',
						pingpong: false,
						save_output: userName === 'durieun02' || userName === 'Hobbs',
						images,
						...(MMAudioSampler ? { audio: [MMAudioSampler, 0] } : {}),
						vae: [vaeLoaderIdx, 0]
					}
				});

				images = [VHS_VideoCombine, 0];
				addNode(payload, {
					class_type: "DynamicRAMCacheControl",
					inputs: {
						mode: 'RAM_PRESSURE (Auto Purge)',
						cleanup_threshold: "24",
						any_input: images,
					}
				});

				adjustLoraStrengthsByCategory(payload);
				//console.dir(payload, { depth: null }); 1
				////console.dir(payload, { depth: null }); 1
			}
			else if (lastFrameFile === null && startFrameFile !== null) {
				payload = { prompt: {} };
				payload.__isFake = false;
				payload.__isCaching = true;

				const loadImageIdx = addNode(payload, {
					class_type: "LoadImage",
					inputs: { image: startFramePath }
				});

				let resizeIdx = null;

				if (changeAspectRatio === 'keepProportionsStartFrame' || changeAspectRatio === 'keepProportionsLastFrame') {
					resizeIdx = addNode(payload, {
						class_type: "WanVideoImageResizeToClosest",
						inputs: {
							generation_width: baseWidth,
							generation_height: baseHeight,
							aspect_ratio_preservation: "keep_input",
							image: [loadImageIdx, 0]
						}
					});
				} else if (changeAspectRatio === 'closestARStartFrame' || changeAspectRatio === 'closestARLastFrame') {
					resizeIdx = addNode(payload, {
						class_type: "WanVideoImageResizeToClosest",
						inputs: {
							generation_width: startWidth,
							generation_height: startHeight,
							aspect_ratio_preservation: "crop_to_new",
							image: [loadImageIdx, 0]
						}
					});
				} else {
					resizeIdx = addNode(payload, {
						class_type: "WanVideoImageResizeToClosest",
						inputs: {
							generation_width: width,
							generation_height: height,
							aspect_ratio_preservation: "crop_to_new",
							image: [loadImageIdx, 0]
						}
					});
				}

				const clipLoaderIdx = addNode(payload, {
					class_type: "CLIPLoader",
					inputs: {
						clip_name: false /*&& /nsfw/i.test(positivePrompt) && containsAdultContent(positivePrompt)*/ ? "nsfw_wan_umt5-xxl_fp8_scaled.safetensors" : "umt5_xxl_fp16.safetensors",
						type: "wan",
						device: "default"
					}
				});

				const vaeLoaderIdx = addNode(payload, {
					class_type: "VAELoaderKJ",
					inputs: {
						vae_name: "wan_fp16.safetensors",
						device: "main_device",
						weight_dtype: "fp16"
					}
				});

				// —————————————————————————————————————————————————————————————————————
				// 7. Text Encoding
				// —————————————————————————————————————————————————————————————————————

				const clipSetLayerIdx = addNode(payload, {
					class_type: "CLIPSetLastLayer",
					inputs: { stop_at_clip_layer: clipSkip * -1, clip: [clipLoaderIdx, 0] }
				});

				clipEncodeNegIdx = addNode(payload, {
					class_type: "CLIPTextEncode",
					inputs: {
						text: negativePrompt, // [deepTranslatorNegativeTextNodeIdx, 0],
						clip: [clipSetLayerIdx, 0]
					}
				});

				let samplerLastIdx;

				const finalHighModelIdx = buildVideoModelPipeline(
					payload,
					modelHigh,
				);

				const finalLowModelIdx = buildVideoModelPipeline(
					payload,
					modelLow,
				);

				wanMoESchedulerIdx = addNode(payload, {
					class_type: "WanMoEScheduler",
					inputs: {
						scheduler: scheduler !== 'light' ? scheduler : 'ddim_uniform',
						steps_high: highSteps,
						steps_low: lowSteps,
						boundary: 0.875,
						interval: 0.01,
						denoise: 1.0,
						model: [finalHighModelIdx, 0]
					}
				});

				let ModelSamplingSD3;

				if (/*parseInt(shift !== 8)*/true) {
					ModelSamplingSD3 = addNode(payload, {
						class_type: "ModelSamplingSD3",
						inputs: { shift: parseInt(shift) === 0 ? [wanMoESchedulerIdx, 0] : shift, model: [finalHighModelIdx, 0] }
					});
				}

				let lightSchedulerSigmasIdx;
				let basicSchedulerIdx;

				if (scheduler === 'light') {
					lightSchedulerSigmasIdx = addNode(payload, {
						class_type: "WanLightx2vSchedulerBasic",
						inputs: {
							steps,
							sigma_max: 1.0,
							sigma_min: 0.0,
							shift: parseInt(shift) === 0 ? [wanMoESchedulerIdx, 0] : shift
						}
					});
				}
				else {
					basicSchedulerIdx = addNode(payload, {
						class_type: "BasicScheduler",
						inputs: {
							model: [ModelSamplingSD3, 0],
							scheduler: scheduler !== 'light' ? scheduler : 'ddim_uniform',
							steps: steps,
							denoise: 1.0
						}
					});
				}

				const splitSigmasIdx = addNode(payload, {
					class_type: "SplitSigmas",
					inputs: {
						sigmas: (scheduler !== 'light' ? (moe === 'true' ? [wanMoESchedulerIdx, 4] : [basicSchedulerIdx, 0]) : [lightSchedulerSigmasIdx, 0]),
						step: highSteps
					}
				});

				const samplerSelectIdx = addNode(payload, {
					class_type: "KSamplerSelect",
					inputs: {
						sampler_name: sampler
					}
				});

				// —————————————————————————————————————————————————————————————————————
				// 9. Video Generation
				// —————————————————————————————————————————————————————————————————————

				let stitchedImagesIdx = null;
				let images = null;

				if (!segments) {
					const clipEncodePosIdx = addNode(payload, {
						class_type: "CLIPTextEncode",
						inputs: {
							text: positivePrompt,
							clip: [clipSetLayerIdx, 0]
						}
					});

					let wanLatentIdx = addNode(payload, {
						class_type: "PainterI2VAdvanced",
						inputs: {
							width: [resizeIdx, 1],
							height: [resizeIdx, 2],
							length: length,
							motion_amplitude: 1 + (0.1 * Number(motion)),
							batch_size: 1,
							positive: [clipEncodePosIdx, 0],
							negative: [clipEncodeNegIdx, 0],
							color_protect: Number(colorDriftCorrection) !== 0,
							correct_strength: Number(colorDriftCorrection),
							vae: [vaeLoaderIdx, 0],
							start_image: [resizeIdx, 0]
						}
					});

					// -------------------------------
					// LoRAs
					// -------------------------------
					const loraResult = addLora14B(
						payload,
						finalHighModelIdx,
						finalLowModelIdx,
						finalHighModelIdx,
						finalLowModelIdx,
						positivePrompt,
						negativePrompt,
						modelHigh || modelLow
					);

					if (sampler.includes('/')) {
						const samplerFirstIdx = addNode(payload, {
							class_type: "ClownsharKSampler_Beta",
							inputs: {
								eta: 0.5,
								seed: seed,
								cfg: cfg,
								sampler_name: sampler,
								scheduler: scheduler,
								steps: steps,
								steps_to_run: highSteps,
								denoise: 1,
								sampler_mode: 'standard',
								bongmath: true,
								model: [loraResult.highModelIdx, 0],
								positive: [wanLatentIdx, 0],
								negative: [wanLatentIdx, 1],
								latent_image: [wanLatentIdx, 4],
								sigmas: [basicSchedulerIdx, 0]
							}
						});

						samplerLastIdx = addNode(payload, {
							class_type: "ClownsharkChainsampler_Beta",
							inputs: {
								eta: 0.5,
								sampler_name: sampler,
								steps_to_run: -1,
								cfg: cfg,
								sampler_mode: 'resample',
								bongmath: true,
								model: [loraResult.lowModelIdx, 0],
								positive: [wanLatentIdx, 0],
								negative: [wanLatentIdx, 1],
								latent_image: [samplerFirstIdx, 0],
							}
						});
					}
					else {
						const samplerFirstIdx = addNode(payload, {
							class_type: "SamplerCustom",
							inputs: {
								model: [loraResult.highModelIdx, 0],
								positive: [wanLatentIdx, 0],
								negative: [wanLatentIdx, 1],
								latent_image: [wanLatentIdx, 4],
								sampler: [samplerSelectIdx, 0],
								sigmas: [splitSigmasIdx, 0],
								cfg,
								add_noise: 'enable',
								noise_seed: seed,
							}
						});

						samplerLastIdx = addNode(payload, {
							class_type: "SamplerCustom",
							inputs: {
								model: [loraResult.lowModelIdx, 0],
								positive: [wanLatentIdx, 0],
								negative: [wanLatentIdx, 1],
								latent_image: [samplerFirstIdx, 1],
								sampler: [samplerSelectIdx, 0],
								sigmas: [splitSigmasIdx, 1],
								cfg,
								add_noise: disableSamplerNoise === "true" ? "disable" : "false",
								noise_seed: seed,
							}
						});
					}

					/*const VRAMDebugDecodeVaeIdx = addNode(payload, {
						class_type: "VRAM_Debug",
						inputs: {
							empty_cache: true,
							gc_collect: true,
							unload_all_models: true,
							any_input: [samplerLastIdx, 0]
						}
					});*/

					// decode node
					vaeDecodeIdx = addNode(payload, {
						class_type: "VAEDecodeTiled",
						inputs: {
							tile_size: 256,
							overlap: length + 4,
							temporal_size: length + 4,
							temporal_overlap: length + 4,
							samples: [samplerLastIdx, 0],
							vae: [vaeLoaderIdx, 0]
						}
					}); /* gives frames */

					images = [vaeDecodeIdx, 0];
				} else {
					let start_image = [resizeIdx, 0];
					let previousSamplesIdx = null;
					let previousDecodeIdx = null;
					let anchorSamplesIdx = null;
					let firstAnchorSampleIdx = null;
					let currentLowModelIdx = null;
					let currentHighModelIdx = null;
					let lastSVILowModelIdx = null;
					let lastSVIHighModelIdx = null;

					for (let i = 0; i < segments.length; i++) {
						const seg = segments[i];
						const cached = cachePrompts.get(seg.text);

						// -------------------------------
						// CLIP encode
						// -------------------------------
						const clipEncodePosIdx_i = addNode(payload, {
							class_type: "CLIPTextEncode",
							inputs: {
								text: cached.positivePrompt,
								clip: [clipSetLayerIdx, 0]
							}
						});

						const segFrames = Math.max(1, Math.round((seg.end - seg.start) * 16));
						const motionAmp = 1 + (0.1 * Number(motion));

						let latentIdx_i;

						if (i === 0) {
							anchorSamplesIdx = addNode(payload, {
								class_type: "VAEEncode",
								inputs: {
									pixels: start_image,
									vae: [vaeLoaderIdx, 0],
								}
							});

							latentIdx_i = addNode(payload, {
								class_type: "PainterI2VAdvanced",
								inputs: {
									positive: [clipEncodePosIdx_i, 0],
									negative: [clipEncodeNegIdx, 0],
									width: [resizeIdx, 1],
									height: [resizeIdx, 2],
									length: segFrames + 1,
									motion_amplitude: motionAmp,
									color_protect: Number(colorDriftCorrection) !== 0,
									correct_strength: Number(colorDriftCorrection),
									batch_size: 1,
									vae: [vaeLoaderIdx, 0],
									start_image: start_image
								}
							});

							firstAnchorSampleIdx = anchorSamplesIdx;
						}
						else {
							if (previousDecodeIdx && sampler.includes('/')) {
								let VAEEncodePreviousFrames = addNode(payload, {
									class_type: "VAEEncode",
									inputs: {
										pixels: [previousDecodeIdx, 0],
										vae: [vaeLoaderIdx, 0],
									}
								});
								previousSamplesIdx = [VAEEncodePreviousFrames, 0];
							}

							latentIdx_i = addNode(payload, {
								class_type: "IAMCCS_WanImageMotion",
								inputs: {
									positive: [clipEncodePosIdx_i, 0],
									negative: [clipEncodeNegIdx, 0],
									anchor_samples: [anchorSamplesIdx, 0],
									anchor_image: start_image,
									structural_repulsion_boost,
									prev_samples: dynamicLatent === "true" ? null : previousSamplesIdx,
									length: (segFrames + (motion_latent_count * 4)) + 1,
									motion_latent_count,
									motion: motionAmp,
									motion_mode: 'all_nonfirst (anchor+motion)',
									color_protect: Number(colorDriftCorrection) !== 0,
									correct_strength: Number(colorDriftCorrection),
									add_reference_latents: true,
									latent_precision: fp16Latent === "true" ? 'fp16' : 'auto',
									vram_profile: 'normal',
									include_padding_in_motion: dynamicLatent === "true",
								}
							});
						}

						// -------------------------------
						// LoRAs
						// -------------------------------
						if (i === 0) {
							payload.__isCaching = false;
							const loraResult = addLora14B(
								payload,
								0, 0,
								finalHighModelIdx, finalLowModelIdx,
								seg.text,
								negativePrompt,
								modelHigh || modelLow,
								i
							);
							payload.__isCaching = true;

							currentHighModelIdx = loraResult.highModelIdx;
							currentLowModelIdx = loraResult.lowModelIdx;
						}
						else if (i === 1) {
							const fakePayload = structuredClone(payload);
							fakePayload.__isFake = true;

							let loraResult = addLora14B(
								fakePayload,
								0, 0,
								finalHighModelIdx, finalLowModelIdx,
								seg.text,
								negativePrompt,
								modelHigh || modelLow,
								-1
							);

							const newLora = (loraResult.highModelIdx > currentHighModelIdx) ||
								(loraResult.lowModelIdx > currentLowModelIdx);

							const highModelIdx = newLora
								? finalHighModelIdx
								: currentHighModelIdx;

							const lowModelIdx = newLora
								? finalLowModelIdx
								: currentLowModelIdx;

							currentHighModelIdx = addNode(payload, {
								class_type: "LoraLoaderModelOnly",
								inputs: {
									lora_name: '14b/i2v/2.5/svi/high.safetensors',
									strength_model: 1.0,
									model: [highModelIdx, 0]
								}
							});

							currentLowModelIdx = addNode(payload, {
								class_type: "LoraLoaderModelOnly",
								inputs: {
									lora_name: '14b/i2v/2.5/svi/low.safetensors',
									strength_model: 1.0,
									model: [lowModelIdx, 0]
								}
							});

							lastSVILowModelIdx = currentLowModelIdx;
							lastSVIHighModelIdx = currentHighModelIdx;

							if (newLora) {
								loraResult = addLora14B(
									payload,
									0, 0,
									lastSVIHighModelIdx, lastSVILowModelIdx,
									seg.text,
									negativePrompt,
									modelHigh || modelLow,
									i
								);

								currentHighModelIdx = loraResult.highModelIdx;
								currentLowModelIdx = loraResult.lowModelIdx;
							}
						}
						else {
							const loraResult = addLora14B(
								payload,
								0, 0,
								lastSVIHighModelIdx, lastSVILowModelIdx,
								seg.text,
								negativePrompt,
								modelHigh || modelLow,
								i
							);

							currentHighModelIdx = (loraResult.highModelIdx > lastSVIHighModelIdx)
								? loraResult.highModelIdx
								: lastSVIHighModelIdx;

							currentLowModelIdx = (loraResult.lowModelIdx > lastSVILowModelIdx)
								? loraResult.lowModelIdx
								: lastSVILowModelIdx;
						}

						// -------------------------------
						// Samplers
						// -------------------------------
						let samplerLastIdx_i;

						if (sampler.includes('/')) {
							const samplerFirstIdx = addNode(payload, {
								class_type: "ClownsharKSampler_Beta",
								inputs: {
									eta: 0.5,
									seed: seed,
									cfg: cfg,
									sampler_name: sampler,
									scheduler: scheduler,
									steps: steps,
									steps_to_run: highSteps,
									denoise: 1,
									sampler_mode: 'standard',
									bongmath: true,
									model: [currentHighModelIdx, 0],
									positive: [latentIdx_i, 0],
									negative: [latentIdx_i, 1],
									latent_image: [latentIdx_i, 4],
									sigmas: [basicSchedulerIdx, 0]
								}
							});

							samplerLastIdx_i = addNode(payload, {
								class_type: "ClownsharkChainsampler_Beta",
								inputs: {
									eta: 0.5,
									sampler_name: sampler,
									steps_to_run: -1,
									cfg: cfg,
									sampler_mode: 'resample',
									bongmath: true,
									model: [currentLowModelIdx, 0],
									positive: [latentIdx_i, 2],
									negative: [latentIdx_i, 3],
									latent_image: [samplerFirstIdx, 0],
								}
							});
						}
						else {
							const samplerFirstIdx = addNode(payload, {
								class_type: "SamplerCustom",
								inputs: {
									model: [currentHighModelIdx, 0],
									positive: [latentIdx_i, 0],
									negative: [latentIdx_i, 1],
									latent_image: [latentIdx_i, 4],
									sampler: [samplerSelectIdx, 0],
									sigmas: [splitSigmasIdx, 0],
									cfg,
									add_noise: "enable",
									noise_seed: seed + (increaseSamplerSeeds === "true" ? i : 0),
								}
							});

							samplerLastIdx_i = addNode(payload, {
								class_type: "SamplerCustom",
								inputs: {
									model: [currentLowModelIdx, 0],
									positive: [latentIdx_i, 2],
									negative: [latentIdx_i, 3],
									latent_image: [samplerFirstIdx, 1],
									sampler: [samplerSelectIdx, 0],
									sigmas: [splitSigmasIdx, 1],
									cfg,
									add_noise: disableSamplerNoise === "true" ? "disable" : "false",
									noise_seed: seed + (increaseSamplerSeeds === "true" ? i : 0),
								}
							});
						}

						// -------------------------------
						// Decode
						// -------------------------------
						const vaeDecodeIdx_i = addNode(payload, {
							class_type: "VAEDecodeTiled",
							inputs: {
								tile_size: 256,
								overlap: segFrames + 4,
								temporal_size: segFrames + 4,
								temporal_overlap: segFrames + 4,
								samples: [samplerLastIdx_i, 0],
								vae: [vaeLoaderIdx, 0]
							}
						});

						const sourceImages = stitchedImagesIdx ? [stitchedImagesIdx, 2] : [previousDecodeIdx, 0];

						// -------------------------------
						// Stitch output
						// -------------------------------
						if (i !== 0) {
							stitchedImagesIdx = addNode(payload, {
								class_type: "ImageBatchExtendWithOverlap",
								inputs: {
									source_images: sourceImages,
									new_images: [vaeDecodeIdx_i, 0],
									overlap: (motion_latent_count * 4) + 1,
									overlap_side: 'source',
									overlap_mode: 'ease_in_out',
								}
							});
						}

						previousDecodeIdx = vaeDecodeIdx_i;

						if (segments.length > 1 && i !== segments.length - 1) {
							if (anchorSample !== "use_first") {
								const reverseIdx = addNode(payload, {
									class_type: "ReverseImageBatch",
									inputs: { images: [vaeDecodeIdx_i, 0] }
								});

								const lastFrameIdx = addNode(payload, {
									class_type: "ImageFromBatch",
									inputs: {
										image: [reverseIdx, 0],
										batch_index: 0,
										length: 1,
									}
								});

								let newAnchorSamplesIdx = addNode(payload, {
									class_type: "VAEEncode",
									inputs: {
										pixels: [lastFrameIdx, 0],
										vae: [vaeLoaderIdx, 0],
									}
								});

								if (anchorSample === "use_previous_last") {
									anchorSamplesIdx = newAnchorSamplesIdx;
								}
								else if (anchorSample === "add_previous_last_to_first") {
									anchorSamplesIdx = addNode(payload, {
										class_type: "LatentInterpolate",
										inputs: {
											samples1: [firstAnchorSampleIdx, 0],
											samples2: [newAnchorSamplesIdx, 0],
											ratio: 0.6,
										}
									});
								}
								else if (anchorSample === "add_all_previous_last_to_first") {
									let previousAnchorSamplesIdx = anchorSamplesIdx;
									anchorSamplesIdx = addNode(payload, {
										class_type: "LatentInterpolate",
										inputs: {
											samples1: [previousAnchorSamplesIdx, 0],
											samples2: [newAnchorSamplesIdx, 0],
											ratio: 0.6,
										}
									});
								}
							}

							//previousVideoIdx = vaeDecodeIdx_i;*/
							previousSamplesIdx = [samplerLastIdx_i, 0]
						}
					}

					images = stitchedImagesIdx ? [stitchedImagesIdx, 2] : [previousDecodeIdx, 0];
				}

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

				if (upscaleResolution !== '480p') {
					const LoadUpscalerTensorrtModel = addNode(payload, {
						class_type: "LoadUpscalerTensorrtModel",
						inputs: {
							model: '4x-UltraSharpV2_Lite',
							precision: 'fp16'
						}
					});

					const UpscalerTensorrt = addNode(payload, {
						class_type: "UpscalerTensorrt",
						inputs: {
							images,
							upscaler_trt_model: [LoadUpscalerTensorrtModel, 0],
							resize_to: upscaleResolution,
							keep_aspect_ratio: 'keep',
						}
					});

					images = [UpscalerTensorrt, 0];
					/*const CacheCleaner = addNode(payload, {
						class_type: "CacheCleaner",
						inputs: {
							clean_cache: false,
							unload_models: false,
							free_memory: true,
							disable_gc: false,
							anything: images,
						}
					});
					images = [CacheCleaner, 0];*/
				}

				if (interpolation_factor !== 1) {
					const VRAM_Debug = addNode(payload, {
						class_type: "VRAM_Debug",
						inputs: {
							empty_cache: false,
							gc_collect: false,
							unload_all_models: true,
							any_input: images
						}
					});
					images = [VRAM_Debug, 0];

					const RifeTensorrt = addNode(payload, {
						class_type: "RifeTensorRT",
						inputs: {
							frames: images,
							model: "rife47",
							precision: "fp16",
							interpolation: interpolation_factor,
							cuda_graph: true,
							keep_loaded: false,
						}
					});

					images = [RifeTensorrt, 0];
				}

				let MMAudioSampler = null;

				if (generateAudio === 'true') {
					const MMAudioModelLoader = addNode(payload, {
						class_type: "MMAudioModelLoader",
						inputs: {
							mmaudio_model: 'mmaudio_44k_nsfw_fp16.safetensors',
							base_precision: 'fp16',
							use_offload_device: true
						}
					});

					const MMAudioFeatureUtilsLoader = addNode(payload, {
						class_type: "MMAudioFeatureUtilsLoader",
						inputs: {
							vae_model: 'mmaudio_vae_44k_fp16.safetensors',
							synchformer_model: 'mmaudio_synchformer_fp16.safetensors',
							clip_model: 'mmaudio_clip_fp16.safetensors',
							mode: '44k',
							precision: 'fp16',
							use_offload_device: true
						}
					});

					MMAudioSampler = addNode(payload, {
						class_type: "MMAudioSampler",
						inputs: {
							mmaudio_model: [MMAudioModelLoader, 0],
							feature_utils: [MMAudioFeatureUtilsLoader, 0],
							images,
							steps: 100,
							cfg: 4.5,
							seed,
							prompt: positiveAudioPrompt,
							negative_prompt: negativeAudioPrompt,
							mask_away_clip: false,
							force_offload: true,
							fps: interpolation_fps,
							force_fps: 25,
						}
					});
				}

				/*const CacheCleaner = addNode(payload, {
					class_type: "CacheCleaner",
					inputs: {
						clean_cache: false,
						unload_models: false,
						free_memory: true,
						disable_gc: false,
						anything: images,
					}
				});
				images = [CacheCleaner, 0];
	
				const RAMCleanup = addNode(payload, {
					class_type: "RAMCleanup",
					inputs: {
						clean_file_cache: true,
						clean_processes: true,
						clean_dlls: true,
						retry_times: 1,
						anything: images,
					}
				});
				images = [RAMCleanup, 0];*/

				const VHS_VideoCombine = addNode(payload, {
					class_type: "VHS_VideoCombine",
					inputs: {
						frame_rate: interpolation_fps,
						loop_count: 0,
						filename_prefix: fileOutputId + seed,
						format: "video/h264-mp4",
						pix_fmt: "yuv420p",
						crf: losslessEncoder === 'true' ? 0 : 18,
						save_metadata: userName === 'durieun02' || userName === 'Hobbs',
						pingpong: false,
						save_output: userName === 'durieun02' || userName === 'Hobbs',
						images,
						...(MMAudioSampler ? { audio: [MMAudioSampler, 0] } : {}),
						vae: [vaeLoaderIdx, 0]
					}
				});

				images = [VHS_VideoCombine, 0];
				addNode(payload, {
					class_type: "DynamicRAMCacheControl",
					inputs: {
						mode: 'RAM_PRESSURE (Auto Purge)',
						cleanup_threshold: "24",
						any_input: images,
					}
				});

				adjustLoraStrengthsByCategory(payload);
				//console.dir(payload, { depth: null }); 1
				////console.dir(payload, { depth: null }); 1
			}
			else if (lastFrameFile === null && startFrameFile === null) {
				payload = { prompt: {} };
				payload.__isFake = false;
				payload.__isCaching = true;

				const vaeLoaderIdx = addNode(payload, {
					class_type: "VAELoaderKJ",
					inputs: {
						vae_name: "wan_fp16.safetensors",
						device: "main_device",
						weight_dtype: "fp16"
					}
				});

				/*const vaeCompileIdx = addNode(payload, {
					class_type: "TorchCompileVAE",
					inputs: {
						backend: "inductor",
						fullgraph: false,
						mode: "default",
						compile_encoder: false,
						compile_decoder: true,
						vae: [vaeLoaderIdx, 0]
					}
				});*/

				const clipLoaderIdx = addNode(payload, {
					class_type: "CLIPLoader",
					inputs: {
						clip_name: false /*&& /nsfw/i.test(positivePrompt) && containsAdultContent(positivePrompt)*/ ? "nsfw_wan_umt5-xxl_fp8_scaled.safetensors" : "umt5_xxl_fp16.safetensors",
						type: "wan",
						device: "default"
					}
				});

				const clipSetLayerIdx = addNode(payload, {
					class_type: "CLIPSetLastLayer",
					inputs: { stop_at_clip_layer: clipSkip * -1, clip: [clipLoaderIdx, 0] }
				});

				clipEncodeNegIdx = addNode(payload, {
					class_type: "CLIPTextEncode",
					inputs: {
						text: negativePrompt,
						clip: [clipSetLayerIdx, 0]
					}
				});

				let samplerLastIdx;
				let lightSchedulerSigmasIdx;

				if (scheduler === 'light') {
					lightSchedulerSigmasIdx = addNode(payload, {
						class_type: "WanLightx2vSchedulerBasic",
						inputs: {
							steps,
							sigma_max: 1.0,
							sigma_min: 0.0,
							shift: parseInt(shift) === 0 ? [wanMoESchedulerIdx, 0] : shift
						}
					});
				}

				const samplerSelectIdx = addNode(payload, {
					class_type: "KSamplerSelect",
					inputs: {
						sampler_name: sampler
					}
				});

				// —————————————————————————————————————————————————————————————————————
				// 9. Video Generation
				// —————————————————————————————————————————————————————————————————————
				let stitchedImagesIdx = null;
				let images = null;

				if (!segments) {
					const clipEncodePosIdx = addNode(payload, {
						class_type: "CLIPTextEncode",
						inputs: {
							text: positivePrompt,
							clip: [clipSetLayerIdx, 0]
						}
					});

					const wanLatentIdx = addNode(payload, {
						class_type: "EmptyHunyuanLatentVideo",
						inputs: {
							width,
							height,
							length,
							batch_size: 1,
						}
					});

					let finalHighModelIdx = buildVideoModelPipeline(
						payload,
						modelHigh,
					);

					let finalLowModelIdx = buildVideoModelPipeline(
						payload,
						modelLow,
					);

					wanMoESchedulerIdx = addNode(payload, {
						class_type: "WanMoEScheduler",
						inputs: {
							scheduler: scheduler !== 'light' ? scheduler : 'ddim_uniform',
							steps_high: highSteps,
							steps_low: lowSteps,
							boundary: 0.875,
							interval: 0.01,
							denoise: 1.0,
							model: [finalHighModelIdx, 0]
						}
					});

					let ModelSamplingSD3;

					if (/*parseInt(shift !== 8)*/true) {
						ModelSamplingSD3 = addNode(payload, {
							class_type: "ModelSamplingSD3",
							inputs: { shift: parseInt(shift) === 0 ? [wanMoESchedulerIdx, 0] : shift, model: [finalHighModelIdx, 0] }
						});
					}

					let lightSchedulerSigmasIdx;
					let basicSchedulerIdx;

					if (scheduler === 'light') {
						lightSchedulerSigmasIdx = addNode(payload, {
							class_type: "WanLightx2vSchedulerBasic",
							inputs: {
								steps,
								sigma_max: 1.0,
								sigma_min: 0.0,
								shift: parseInt(shift) === 0 ? [wanMoESchedulerIdx, 0] : shift
							}
						});
					}
					else {
						basicSchedulerIdx = addNode(payload, {
							class_type: "BasicScheduler",
							inputs: {
								model: [ModelSamplingSD3, 0],
								scheduler: scheduler !== 'light' ? scheduler : 'ddim_uniform',
								steps: steps,
								denoise: 1.0
							}
						});
					}

					const splitSigmasIdx = addNode(payload, {
						class_type: "SplitSigmas",
						inputs: {
							sigmas: (scheduler !== 'light' ? (moe === 'true' ? [wanMoESchedulerIdx, 4] : [basicSchedulerIdx, 0]) : [lightSchedulerSigmasIdx, 0]),
							step: highSteps
						}
					});

					let previousLowModelIdx = finalLowModelIdx;

					if (!modelLow.includes('lightx')) {
						finalLowModelIdx = addNode(payload, {
							class_type: "LoraLoaderModelOnly",
							inputs: {
								lora_name: '14b/t2v/boost/t2v_low_noise_model.safetensors',
								strength_model: 1.0,
								model: [previousLowModelIdx, 0]
							}
						});
					}

					const loraResult = addLora14B(
						payload,
						finalHighModelIdx,
						finalLowModelIdx,
						finalHighModelIdx,
						finalLowModelIdx,
						positivePrompt,
						negativePrompt,
						modelHigh || modelLow
					);

					if (sampler.includes('/')) {
						const samplerFirstIdx = addNode(payload, {
							class_type: "ClownsharKSampler_Beta",
							inputs: {
								eta: 0.5,
								seed: seed,
								cfg: cfg,
								sampler_name: sampler,
								scheduler: scheduler,
								steps: steps,
								steps_to_run: highSteps,
								denoise: 1,
								sampler_mode: 'standard',
								bongmath: true,
								model: [loraResult.highModelIdx, 0],
								positive: [clipEncodePosIdx, 0],
								negative: [clipEncodeNegIdx, 0],
								latent_image: [wanLatentIdx, 0],
								sigmas: [basicSchedulerIdx, 0]
							}
						});

						samplerLastIdx_i = addNode(payload, {
							class_type: "ClownsharkChainsampler_Beta",
							inputs: {
								eta: 0.5,
								sampler_name: sampler,
								steps_to_run: -1,
								cfg: cfg,
								sampler_mode: 'resample',
								bongmath: true,
								model: [loraResult.lowModelIdx, 0],
								positive: [clipEncodePosIdx, 0],
								negative: [clipEncodeNegIdx, 0],
								latent_image: [samplerFirstIdx, 0],
							}
						});
					}
					else {
						const samplerFirstIdx = addNode(payload, {
							class_type: "SamplerCustom",
							inputs: {
								model: [loraResult.highModelIdx, 0],
								positive: [clipEncodePosIdx, 0],
								negative: [clipEncodeNegIdx, 0],
								latent_image: [wanLatentIdx, 0],
								sampler: [samplerSelectIdx, 0],
								sigmas: [splitSigmasIdx, 0],
								cfg,
								add_noise: 'enable',
								noise_seed: seed,
							}
						});

						samplerLastIdx = addNode(payload, {
							class_type: "SamplerCustom",
							inputs: {
								model: [loraResult.lowModelIdx, 0],
								positive: [clipEncodePosIdx, 0],
								negative: [clipEncodeNegIdx, 0],
								latent_image: [samplerFirstIdx, 1],
								sampler: [samplerSelectIdx, 0],
								sigmas: [splitSigmasIdx, 1],
								cfg,
								add_noise: disableSamplerNoise === "true" ? "disable" : "false",
								noise_seed: seed,
							}
						});
					}

					/*const VRAMDebugDecodeVaeIdx = addNode(payload, {
						class_type: "VRAM_Debug",
						inputs: {
							empty_cache: true,
							gc_collect: true,
							unload_all_models: true,
							any_input: [samplerLastIdx, 0]
						}
					});*/

					// decode node
					vaeDecodeIdx = addNode(payload, {
						class_type: "VAEDecodeTiled",
						inputs: {
							tile_size: 256,
							overlap: length + 4,
							temporal_size: length + 4,
							temporal_overlap: length + 4,
							samples: [samplerLastIdx, 0],
							vae: [vaeLoaderIdx, 0]
						}
					}); /* gives frames */

					images = [vaeDecodeIdx, 0];
				} else {
					let start_image = null;
					let previousSamplesIdx = null;
					let previousDecodeIdx = null;
					let firstAnchorSampleIdx = null;
					let anchorSamplesIdx = null;
					let finalHighModelIdx = null;
					let finalLowModelIdx = null;
					let currentLowModelIdx = null;
					let currentHighModelIdx = null;
					let lastSVILowModelIdx = null;
					let lastSVIHighModelIdx = null;

					let ModelSamplingSD3;
					let lightSchedulerSigmasIdx;
					let basicSchedulerIdx;
					let splitSigmasIdx;

					for (let i = 0; i < segments.length; i++) {
						const seg = segments[i];
						const cached = cachePrompts.get(seg.text);

						// -------------------------------
						// CLIP encode
						// -------------------------------
						const clipEncodePosIdx_i = addNode(payload, {
							class_type: "CLIPTextEncode",
							inputs: {
								text: cached.positivePrompt,
								clip: [clipSetLayerIdx, 0]
							}
						});

						const segFrames = Math.max(1, Math.round((seg.end - seg.start) * 16));
						const motionAmp = 1 + (0.1 * Number(motion));

						let latentIdx_i;

						if (i === 0) {
							finalHighModelIdx = buildVideoModelPipeline(
								payload,
								modelHigh,
							);

							finalLowModelIdx = buildVideoModelPipeline(
								payload,
								modelLow,
							);

							let previousLowModelIdx = finalLowModelIdx;

							if (!modelLow.includes('lightx')) {
								finalLowModelIdx = addNode(payload, {
									class_type: "LoraLoaderModelOnly",
									inputs: {
										lora_name: '14b/t2v/boost/t2v_low_noise_model.safetensors',
										strength_model: 1.0,
										model: [previousLowModelIdx, 0]
									}
								});
							}

							wanMoESchedulerIdx = addNode(payload, {
								class_type: "WanMoEScheduler",
								inputs: {
									scheduler: scheduler !== 'light' ? scheduler : 'ddim_uniform',
									steps_high: highSteps,
									steps_low: lowSteps,
									boundary: 0.875,
									interval: 0.01,
									denoise: 1.0,
									model: [finalHighModelIdx, 0]
								}
							});


							if (/*parseInt(shift !== 8)*/true) {
								ModelSamplingSD3 = addNode(payload, {
									class_type: "ModelSamplingSD3",
									inputs: { shift: parseInt(shift) === 0 ? [wanMoESchedulerIdx, 0] : shift, model: [finalHighModelIdx, 0] }
								});
							}

							if (scheduler === 'light') {
								lightSchedulerSigmasIdx = addNode(payload, {
									class_type: "WanLightx2vSchedulerBasic",
									inputs: {
										steps,
										sigma_max: 1.0,
										sigma_min: 0.0,
										shift: parseInt(shift) === 0 ? [wanMoESchedulerIdx, 0] : shift
									}
								});
							}
							else {
								basicSchedulerIdx = addNode(payload, {
									class_type: "BasicScheduler",
									inputs: {
										model: [ModelSamplingSD3, 0],
										scheduler: scheduler !== 'light' ? scheduler : 'ddim_uniform',
										steps: steps,
										denoise: 1.0
									}
								});
							}

							splitSigmasIdx = addNode(payload, {
								class_type: "SplitSigmas",
								inputs: {
									sigmas: (scheduler !== 'light' ? (moe === 'true' ? [wanMoESchedulerIdx, 4] : [basicSchedulerIdx, 0]) : [lightSchedulerSigmasIdx, 0]),
									step: highSteps
								}
							});

							latentIdx_i = addNode(payload, {
								class_type: "EmptyHunyuanLatentVideo",
								inputs: {
									width,
									height,
									length: segFrames + 1,
									batch_size: 1,
								}
							});

							payload.__isCaching = false;
							const loraResult = addLora14B(
								payload,
								0, 0,
								finalHighModelIdx, finalLowModelIdx,
								seg.text,
								negativePrompt,
								modelHigh || modelLow,
								i
							);
							payload.__isCaching = true;

							currentHighModelIdx = loraResult.highModelIdx;
							currentLowModelIdx = loraResult.lowModelIdx;
						}
						else {
							if (previousDecodeIdx && sampler.includes('/')) {
								let VAEEncodePreviousFrames = addNode(payload, {
									class_type: "VAEEncode",
									inputs: {
										pixels: [previousDecodeIdx, 0],
										vae: [vaeLoaderIdx, 0],
									}
								});
								previousSamplesIdx = [VAEEncodePreviousFrames, 0];
							}

							latentIdx_i = addNode(payload, {
								class_type: "IAMCCS_WanImageMotion",
								inputs: {
									positive: [clipEncodePosIdx_i, 0],
									negative: [clipEncodeNegIdx, 0],
									anchor_samples: [anchorSamplesIdx, 0],
									anchor_image: start_image,
									structural_repulsion_boost,
									prev_samples: dynamicLatent === "true" ? null : previousSamplesIdx,
									length: (segFrames + (motion_latent_count * 4)) + 1,
									motion_latent_count,
									motion: motionAmp,
									motion_mode: 'all_nonfirst (anchor+motion)',
									color_protect: Number(colorDriftCorrection) !== 0,
									correct_strength: Number(colorDriftCorrection),
									add_reference_latents: true,
									latent_precision: fp16Latent === "true" ? 'fp16' : 'auto',
									vram_profile: 'normal',
									include_padding_in_motion: dynamicLatent === "true",
								}
							});

							if (i === 1) {
								modelHigh = "i2v/2.5/lightx2v_1030_high_fp8_e4m3fn_scaled.safetensors";
								modelLow = "i2v/2.5/lightx2v_low_fp8_e4m3fn_scaled.safetensors";

								finalHighModelIdx = buildVideoModelPipeline(
									payload,
									modelHigh,
								);

								finalLowModelIdx = buildVideoModelPipeline(
									payload,
									modelLow,
								);

								wanMoESchedulerIdx = addNode(payload, {
									class_type: "WanMoEScheduler",
									inputs: {
										scheduler: scheduler !== 'light' ? scheduler : 'ddim_uniform',
										steps_high: highSteps,
										steps_low: lowSteps,
										boundary: 0.875,
										interval: 0.01,
										denoise: 1.0,
										model: [finalHighModelIdx, 0]
									}
								});

								if (/*parseInt(shift !== 8)*/true) {
									ModelSamplingSD3 = addNode(payload, {
										class_type: "ModelSamplingSD3",
										inputs: { shift: parseInt(shift) === 0 ? [wanMoESchedulerIdx, 0] : shift, model: [finalHighModelIdx, 0] }
									});
								}

								if (scheduler === 'light') {
									lightSchedulerSigmasIdx = addNode(payload, {
										class_type: "WanLightx2vSchedulerBasic",
										inputs: {
											steps,
											sigma_max: 1.0,
											sigma_min: 0.0,
											shift: parseInt(shift) === 0 ? [wanMoESchedulerIdx, 0] : shift
										}
									});
								}
								else {
									basicSchedulerIdx = addNode(payload, {
										class_type: "BasicScheduler",
										inputs: {
											model: [ModelSamplingSD3, 0],
											scheduler: scheduler !== 'light' ? scheduler : 'ddim_uniform',
											steps: steps,
											denoise: 1.0
										}
									});
								}

								splitSigmasIdx = addNode(payload, {
									class_type: "SplitSigmas",
									inputs: {
										sigmas: (scheduler !== 'light' ? (moe === 'true' ? [wanMoESchedulerIdx, 4] : [basicSchedulerIdx, 0]) : [lightSchedulerSigmasIdx, 0]),
										step: highSteps
									}
								});

								const fakePayload = structuredClone(payload);
								fakePayload.__isFake = true;

								let loraResult = addLora14B(
									fakePayload,
									0, 0,
									finalHighModelIdx, finalLowModelIdx,
									seg.text,
									negativePrompt,
									modelHigh || modelLow,
									-1
								);

								const newLora = (loraResult.highModelIdx > currentHighModelIdx) ||
									(loraResult.lowModelIdx > currentLowModelIdx);

								const highModelIdx = newLora
									? finalHighModelIdx
									: currentHighModelIdx;

								const lowModelIdx = newLora
									? finalLowModelIdx
									: currentLowModelIdx;

								currentHighModelIdx = addNode(payload, {
									class_type: "LoraLoaderModelOnly",
									inputs: {
										lora_name: '14b/i2v/2.5/svi/high.safetensors',
										strength_model: 1.0,
										model: [highModelIdx, 0]
									}
								});

								currentLowModelIdx = addNode(payload, {
									class_type: "LoraLoaderModelOnly",
									inputs: {
										lora_name: '14b/i2v/2.5/svi/low.safetensors',
										strength_model: 1.0,
										model: [lowModelIdx, 0]
									}
								});

								lastSVILowModelIdx = currentLowModelIdx;
								lastSVIHighModelIdx = currentHighModelIdx;

								if (newLora) {
									loraResult = addLora14B(
										payload,
										0, 0,
										lastSVIHighModelIdx, lastSVILowModelIdx,
										seg.text,
										negativePrompt,
										modelHigh || modelLow,
										i
									);

									currentHighModelIdx = loraResult.highModelIdx;
									currentLowModelIdx = loraResult.lowModelIdx;
								}
							}
							else {
								const loraResult = addLora14B(
									payload,
									0, 0,
									lastSVIHighModelIdx, lastSVILowModelIdx,
									seg.text,
									negativePrompt,
									modelHigh || modelLow,
									i
								);

								currentHighModelIdx = (loraResult.highModelIdx > lastSVIHighModelIdx)
									? loraResult.highModelIdx
									: lastSVIHighModelIdx;

								currentLowModelIdx = (loraResult.lowModelIdx > lastSVILowModelIdx)
									? loraResult.lowModelIdx
									: lastSVILowModelIdx;
							}
						}

						let samplerLastIdx_i;

						if (sampler.includes('/')) {
							const samplerFirstIdx = addNode(payload, {
								class_type: "ClownsharKSampler_Beta",
								inputs: {
									eta: 0.5,
									seed: seed,
									cfg: cfg,
									sampler_name: sampler,
									scheduler: scheduler,
									steps: steps,
									steps_to_run: highSteps,
									denoise: 1,
									sampler_mode: 'standard',
									bongmath: true,
									model: [currentHighModelIdx, 0],
									positive: i === 0 ? [clipEncodePosIdx_i, 0] : [latentIdx_i, 0],
									negative: i === 0 ? [clipEncodeNegIdx, 0] : [latentIdx_i, 1],
									latent_image: [latentIdx_i, i === 0 ? 0 : 4],
									sigmas: [basicSchedulerIdx, 0]
								}
							});

							samplerLastIdx_i = addNode(payload, {
								class_type: "ClownsharkChainsampler_Beta",
								inputs: {
									eta: 0.5,
									sampler_name: sampler,
									steps_to_run: -1,
									cfg: cfg,
									sampler_mode: 'resample',
									bongmath: true,
									model: [currentLowModelIdx, 0],
									positive: i === 0 ? [clipEncodePosIdx_i, 0] : [latentIdx_i, 2],
									negative: i === 0 ? [clipEncodeNegIdx, 0] : [latentIdx_i, 3],
									latent_image: [samplerFirstIdx, 0],
								}
							});
						}
						else {
							const samplerFirstIdx = addNode(payload, {
								class_type: "SamplerCustom",
								inputs: {
									model: [currentHighModelIdx, 0],
									positive: i === 0 ? [clipEncodePosIdx_i, 0] : [latentIdx_i, 0],
									negative: i === 0 ? [clipEncodeNegIdx, 0] : [latentIdx_i, 1],
									latent_image: [latentIdx_i, i === 0 ? 0 : 4],
									sampler: [samplerSelectIdx, 0],
									sigmas: [splitSigmasIdx, 0],
									cfg,
									add_noise: "enable",
									noise_seed: seed + (increaseSamplerSeeds === "true" ? i : 0),
								}
							});

							samplerLastIdx_i = addNode(payload, {
								class_type: "SamplerCustom",
								inputs: {
									model: [currentLowModelIdx, 0],
									positive: i === 0 ? [clipEncodePosIdx_i, 0] : [latentIdx_i, 2],
									negative: i === 0 ? [clipEncodeNegIdx, 0] : [latentIdx_i, 3],
									latent_image: [samplerFirstIdx, 1],
									sampler: [samplerSelectIdx, 0],
									sigmas: [splitSigmasIdx, 1],
									cfg,
									add_noise: disableSamplerNoise === "true" ? "disable" : "false",
									noise_seed: seed + (increaseSamplerSeeds === "true" ? i : 0),
								}
							});
						}

						const vaeDecodeIdx_i = addNode(payload, {
							class_type: "VAEDecodeTiled",
							inputs: {
								tile_size: 256,
								overlap: segFrames + 4,
								temporal_size: segFrames + 4,
								temporal_overlap: segFrames + 4,
								samples: [samplerLastIdx_i, 0],
								vae: [vaeLoaderIdx, 0]
							}
						});

						const sourceImages = stitchedImagesIdx ? [stitchedImagesIdx, 2] : [previousDecodeIdx, 0];

						if (i !== 0) {
							stitchedImagesIdx = addNode(payload, {
								class_type: "ImageBatchExtendWithOverlap",
								inputs: {
									source_images: sourceImages,
									new_images: [vaeDecodeIdx_i, 0],
									overlap: (motion_latent_count * 4) + 1,
									overlap_side: 'source',
									overlap_mode: 'ease_in_out',
								}
							});
						}

						previousDecodeIdx = vaeDecodeIdx_i;

						if (segments.length > 1 && i !== segments.length - 1) {
							if (i === 0) {
								const getFirstFrameIdx = addNode(payload, {
									class_type: "ImageFromBatch",
									inputs: {
										image: [vaeDecodeIdx_i, 0],
										batch_index: 0,
										length: 1,
									}
								});

								start_image = [getFirstFrameIdx, 0];
								anchorSamplesIdx = addNode(payload, {
									class_type: "VAEEncode",
									inputs: {
										pixels: start_image,
										vae: [vaeLoaderIdx, 0],
									}
								});
								firstAnchorSampleIdx = anchorSamplesIdx;
							}

							{
								if (anchorSample !== "use_first") {
									const reverseIdx = addNode(payload, {
										class_type: "ReverseImageBatch",
										inputs: { images: [vaeDecodeIdx_i, 0] }
									});

									const lastFrameIdx = addNode(payload, {
										class_type: "ImageFromBatch",
										inputs: {
											image: [reverseIdx, 0],
											batch_index: 0,
											length: 1,
										}
									});

									let newAnchorSamplesIdx = addNode(payload, {
										class_type: "VAEEncode",
										inputs: {
											pixels: [lastFrameIdx, 0],
											vae: [vaeLoaderIdx, 0],
										}
									});

									if (anchorSample === "use_previous_last") {
										anchorSamplesIdx = newAnchorSamplesIdx;
									}
									else if (anchorSample === "add_previous_last_to_first") {
										anchorSamplesIdx = addNode(payload, {
											class_type: "LatentAdd",
											inputs: {
												samples1: [firstAnchorSampleIdx, 0],
												samples2: [newAnchorSamplesIdx, 0]
											}
										});
									}
									else if (anchorSample === "add_all_previous_last_to_first") {
										let previousAnchorSamplesIdx = anchorSamplesIdx;
										anchorSamplesIdx = addNode(payload, {
											class_type: "LatentAdd",
											inputs: {
												samples1: [previousAnchorSamplesIdx, 0],
												samples2: [newAnchorSamplesIdx, 0]
											}
										});
									}
								}
							}

							previousSamplesIdx = [samplerLastIdx_i, 0]
						}
					}

					images = stitchedImagesIdx ? [stitchedImagesIdx, 2] : [previousDecodeIdx, 0];
				}

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

				if (upscaleResolution !== '480p') {
					const LoadUpscalerTensorrtModel = addNode(payload, {
						class_type: "LoadUpscalerTensorrtModel",
						inputs: {
							model: '4x-UltraSharpV2_Lite',
							precision: 'fp16'
						}
					});

					const UpscalerTensorrt = addNode(payload, {
						class_type: "UpscalerTensorrt",
						inputs: {
							images,
							upscaler_trt_model: [LoadUpscalerTensorrtModel, 0],
							resize_to: upscaleResolution,
							keep_aspect_ratio: 'keep',
						}
					});

					images = [UpscalerTensorrt, 0];
					/*const CacheCleaner = addNode(payload, {
						class_type: "CacheCleaner",
						inputs: {
							clean_cache: false,
							unload_models: false,
							free_memory: true,
							disable_gc: false,
							anything: images,
						}
					});
					images = [CacheCleaner, 0];*/
				}

				if (interpolation_factor !== 1) {
					const VRAM_Debug = addNode(payload, {
						class_type: "VRAM_Debug",
						inputs: {
							empty_cache: false,
							gc_collect: false,
							unload_all_models: true,
							any_input: images
						}
					});
					images = [VRAM_Debug, 0];

					const RifeTensorrt = addNode(payload, {
						class_type: "RifeTensorRT",
						inputs: {
							frames: images,
							model: "rife47",
							precision: "fp16",
							interpolation: interpolation_factor,
							cuda_graph: true,
							keep_loaded: false,
						}
					});

					images = [RifeTensorrt, 0];
				}

				let MMAudioSampler = null;

				if (generateAudio === 'true') {
					const MMAudioModelLoader = addNode(payload, {
						class_type: "MMAudioModelLoader",
						inputs: {
							mmaudio_model: 'mmaudio_44k_nsfw_fp16.safetensors',
							base_precision: 'fp16',
							use_offload_device: true
						}
					});

					const MMAudioFeatureUtilsLoader = addNode(payload, {
						class_type: "MMAudioFeatureUtilsLoader",
						inputs: {
							vae_model: 'mmaudio_vae_44k_fp16.safetensors',
							synchformer_model: 'mmaudio_synchformer_fp16.safetensors',
							clip_model: 'mmaudio_clip_fp16.safetensors',
							mode: '44k',
							precision: 'fp16',
							use_offload_device: true
						}
					});

					MMAudioSampler = addNode(payload, {
						class_type: "MMAudioSampler",
						inputs: {
							mmaudio_model: [MMAudioModelLoader, 0],
							feature_utils: [MMAudioFeatureUtilsLoader, 0],
							images,
							steps: 100,
							cfg: 4.5,
							seed,
							prompt: positiveAudioPrompt,
							negative_prompt: negativeAudioPrompt,
							mask_away_clip: false,
							force_offload: true,
							fps: interpolation_fps,
							force_fps: 25,
						}
					});
				}

				/*const CacheCleaner = addNode(payload, {
					class_type: "CacheCleaner",
					inputs: {
						clean_cache: false,
						unload_models: false,
						free_memory: true,
						disable_gc: false,
						anything: images,
					}
				});
				images = [CacheCleaner, 0];
	
				const RAMCleanup = addNode(payload, {
					class_type: "RAMCleanup",
					inputs: {
						clean_file_cache: true,
						clean_processes: true,
						clean_dlls: true,
						retry_times: 1,
						anything: images,
					}
				});
				images = [RAMCleanup, 0];*/

				const VHS_VideoCombine = addNode(payload, {
					class_type: "VHS_VideoCombine",
					inputs: {
						frame_rate: interpolation_fps,
						loop_count: 0,
						filename_prefix: fileOutputId + seed,
						format: "video/h264-mp4",
						pix_fmt: "yuv420p",
						crf: losslessEncoder === 'true' ? 0 : 18,
						save_metadata: userName === 'durieun02' || userName === 'Hobbs',
						pingpong: false,
						save_output: userName === 'durieun02' || userName === 'Hobbs',
						images,
						...(MMAudioSampler ? { audio: [MMAudioSampler, 0] } : {}),
						vae: [vaeLoaderIdx, 0]
					}
				});

				images = [VHS_VideoCombine, 0];
				addNode(payload, {
					class_type: "DynamicRAMCacheControl",
					inputs: {
						mode: 'RAM_PRESSURE (Auto Purge)',
						cleanup_threshold: "24",
						any_input: images,
					}
				});

				adjustLoraStrengthsByCategory(payload);
				//console.dir(payload, { depth: null }); 1
				////console.dir(payload, { depth: null }); 1
			}

			if (
				!payload ||
				typeof payload !== "object" ||
				Array.isArray(payload) ||
				Object.keys(payload).length === 0
			) {
				const err = new Error("❌ Payload is empty or invalid");
				err.code = "EMPTY_PAYLOAD";
				throw err;
			} else console.dir(payload, { depth: null });
			

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

			async function processFile(imageBuffer) {
				try {
					const tempInputPath = path.join(__dirname, `videos/temp_${fileOutputId}.mp4`);
					await fs.promises.writeFile(tempInputPath, imageBuffer);

					let inputWidth, inputHeight;

					try {
						const { stdout } = await execFileAsync('ffprobe', [
							'-v', 'error',
							'-select_streams', 'v:0',
							'-show_entries', 'stream=width,height',
							'-of', 'csv=s=x:p=0',
							tempInputPath
						]);

						if (!stdout.trim()) throw new Error('Empty ffprobe output');

						[inputWidth, inputHeight] = stdout.trim().split('x').map(Number);
						if (!inputWidth || !inputHeight) throw new Error('Invalid width/height');
					} catch (err) {
						console.error('[ffprobe failed]', err.message);
						throw new Error('Failed to detect input resolution');
					}

					const inputs = ['-i', tempInputPath];
					let filterAdded = false; // track if we added a filter_complex

					if (removeBanner !== 'true') {
						//console.log(`Processing with banner for the ${inputWidth}x${inputHeight} video...`);
						const bannerImagePath = path.join(__dirname, 'banners', 'white_banner.png');
						if (!fs.existsSync(bannerImagePath)) {
							throw new Error(`Banner image not found: ${bannerImagePath}`);
						}

						inputs.push('-i', bannerImagePath);

						const metadata = await sharp(bannerImagePath).metadata();
						const { width: bannerWidth, height: bannerHeight } = metadata;
						const aspectRatio = inputWidth / inputHeight;

						// interpolation mapping (you already had these values)
						const referenceFractions = [
							{ ratio: 0.5, fraction: 0.75 },
							{ ratio: 1, fraction: 0.5 },
							{ ratio: 2, fraction: 0.25 }
						];

						const interpolateFraction = (ratio) => {
							for (let i = 0; i < referenceFractions.length - 1; i++) {
								const a = referenceFractions[i];
								const b = referenceFractions[i + 1];
								if (ratio >= a.ratio && ratio <= b.ratio) {
									const t = (ratio - a.ratio) / (b.ratio - a.ratio);
									return a.fraction + t * (b.fraction - a.fraction);
								}
							}
							if (ratio < referenceFractions[0].ratio) return referenceFractions[0].fraction;
							return referenceFractions[referenceFractions.length - 1].fraction;
						};

						const fraction = interpolateFraction(aspectRatio);
						const smallBannerWidth = Math.round(inputWidth * fraction);
						const smallBannerHeight = Math.round((bannerHeight / bannerWidth) * smallBannerWidth);

						// Random corner for small banner
						const corners = [
							{ x: 10, y: 10 },
							{ x: inputWidth - smallBannerWidth - 10, y: 10 },
							{ x: 10, y: inputHeight - smallBannerHeight - 10 },
							{ x: inputWidth - smallBannerWidth - 10, y: inputHeight - smallBannerHeight - 10 }
						];
						const randomCorner = corners[Math.floor(Math.random() * corners.length)];

						// Center banner full width, low alpha
						const centerBannerWidth = inputWidth;
						const centerBannerHeight = Math.round((bannerHeight / bannerWidth) * centerBannerWidth);

						// Use explicit [0:v] and [1] -> [1:v] where appropriate; final label is [outv]
						const filters = [
							`[1:v]scale=${smallBannerWidth}:${smallBannerHeight}[banner1]`,
							`[1:v]scale=${centerBannerWidth}:${centerBannerHeight},format=yuva420p,colorchannelmixer=aa=0.05[banner2]`,
							`[0:v][banner2]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2[temp1]`,
							`[temp1][banner1]overlay=${randomCorner.x}:${randomCorner.y}[outv]`
						];

						inputs.push('-filter_complex', filters.join(','));
						filterAdded = true;
					}

					// Add anullsrc only if there is no audio
					const hasAudio = hasAudioStream(tempInputPath);
					if (!hasAudio) {
						inputs.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
					}

					// compute final maps safely
					const numberOfInputs = inputs.filter(x => x === '-i').length;
					const lastInputIndex = numberOfInputs - 1; // last input index for mapping null audio if used

					const args = [...inputs];

					// choose proper video map: filtered output if we added filters, otherwise raw first video
					const finalVideoMap = filterAdded ? '[outv]' : '0:v:0';

					args.push(
						'-map', finalVideoMap,
						...(hasAudio
							? ['-map', '0:a:0']
							: ['-map', `${lastInputIndex}:a:0`, '-shortest'] // map the null audio we appended
						),
						'-r', fps,
						'-c:v', 'libx264',
						'-preset', 'veryfast'
					);

					if (losslessEncoder === 'true') {
						args.push('-crf', '1', '-x264-params', 'lossless=1');
					} else {
						args.push('-crf', '18', '-profile:v', 'high', '-level:v', '4.2');
					}

					args.push(
						'-pix_fmt', 'yuv420p',
						'-c:a', 'aac',
						'-movflags', '+faststart',
						'-f', 'mp4',
						outputPath
					);

					// Log important debug info
					//console.log('--- FFmpeg debug ---');
					//console.log('filterAdded =', filterAdded);
					//console.log('numberOfInputs =', numberOfInputs);
					//console.log('finalVideoMap =', finalVideoMap);
					//console.log('audio map will be =', hasAudio ? '0:a:0' : `${lastInputIndex}:a:0`);
					//console.log(`FFmpeg Arguments: ${args.join(' ')}`);

					// spawn ffmpeg as before...
					const ffmpegProcess = spawn('ffmpeg', args);
					//ffmpegProcess.stdout.on('data', d => console.log(`[FFmpeg stdout] ${d.toString()}`));
					//ffmpegProcess.stderr.on('data', d => console.error(`[FFmpeg stderr] ${d.toString()}`));

					await new Promise((resolve, reject) => {
						ffmpegProcess.on('close', (code) => {
							fs.unlink(tempInputPath, () => { });
							//console.log(`FFmpeg process completed with code ${code}`);
							if (code === 0) resolve();
							else reject(new Error(`FFmpeg exited with code ${code}. Check logs above.`));
						});
						ffmpegProcess.on('error', err => {
							console.error('FFmpeg process error:', err);
							reject(err);
						});
					});
				} catch (error) {
					console.error('Error during video processing:', error.message);
					throw error;
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
							(async () => {
								const logFilePath = path.join(__dirname, 'creditsLog.txt');
								const now = new Date().toISOString();

								try {
									async function logCreditUsage({ username, totalCredits, consumedCredits, fileUrl, date }) {
										const logLine = `${username} | Total Credits: ${totalCredits} | Consumed Credits: ${consumedCredits} | URL: ${fileUrl} | ${date}\n`;
										try {
											await fs.promises.appendFile(logFilePath, logLine);
										} catch (err) {
											console.error("Failed to write to credits log:", err);
										}
									}

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
							})();
						}

						(async () => {
							if (totalCredits <= 0) {
								await sendSatisfactionEmail(userDoc, totalsDoc, userId, userName, userEmail);
							}
						})();

						console.log(
							`\x1b[32m[FIREBASE-AUTH] \x1b[0mCredit To ${paidCredits + dailyCredits + rewardCredits
							} - Was ${totalCredits} - Decrease ${creditsUsedFromDaily + creditsUsedFromPaid} (Reward: ${creditsUsedFromReward}, Daily: ${creditsUsedFromDaily}, Paid: ${creditsUsedFromPaid})`
						);
					} else {
						console.log(
							`\x1b[32m[FIREBASE-AUTH] \x1b[0mNo need to consume credits for this user.`
						);
					}

					previousFiles.push({
						settings: req.body
					});

					(async () => {
						const successfulDV = (userDoc.data().successfulDV || 0) + 1;
						await usersRef.doc(userId).update({ successfulDV });
					})();
				} else {
					console.error("No output found.");
				}
			} catch (updateErr) {
				console.error(updateErr.message);
			}
		} catch (error) {
			const timeoutMatch = error.message.match(/ETIMEDOUT\s.*:(\d+)/);
			if (timeoutMatch) {
				const port = parseInt(timeoutMatch[1], 10);
				const serverIndex = port - 6050; // since 6051 = 1, 6052 = 2, etc.
				const baseName = `6000-${serverIndex}-dv`;
				const processesToRestart = [baseName, `${baseName}-server`];

				console.log(`\x1b[33m[PROCESSNEXTREQUEST]\x1b[0m Timeout detected on port ${port}. Restarting: ${processesToRestart.join(', ')}`);

				processesToRestart.forEach(proc => {
					exec(`pm2 restart ${proc}`, (error, stdout, stderr) => {
						if (error) {
							console.error(`Error restarting ${proc}: ${error.message}`);
							return;
						}
						if (stderr) {
							console.error(`${proc} stderr: ${stderr}`);
							return;
						}
						console.log(`${proc} restarted: ${stdout}`);
					});
				});
			}

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
					await serversRef.doc(config.SERVER_1).update({ onDeepVideo: isProcessing });
				} catch (error) { }

				try {
					await serversRef.doc(config.SERVER_1).update({ deepVideoQueue: requestQueue.length });
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

	const MAX_SIZE = 200 * 1024 * 1024
	const multer = require('multer');
	const upload = multer({
		dest: 'uploads/',
		limits: { fileSize: MAX_SIZE },
	});
	app.post(
		'/start-process',
		(req, res, next) => {
			req.socket.setTimeout(5000);
			next();
		},

		(req, res, next) => {
			const size = Number(req.headers['content-length'] || 0);
			if (size > MAX_SIZE) {
				return sendBadStatus(res, { server: "Request exceeds 50MB limit." });
			}
			next();
		},

		upload.fields([
			{ name: 'startFrameFile', maxCount: 1 },
			{ name: 'lastFrameFile', maxCount: 1 },
			{ name: 'videoFile', maxCount: 1 },
		]),

		(err, req, res, next) => {
			if (err?.code === "LIMIT_FILE_SIZE") {
				return sendBadStatus(res, { server: "File too large (max 50MB)." });
			}
			next(err);
		},
		async (req, res) => {

			const maintenanceFile = path.join(__dirname, `checkMaintaince_${config.GPU}.txt`);

			/*const allowedOrigins = corsOptions.origin;
			const country = req.headers['cf-ipcountry'] || 'Unknown';
			//const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
			const userAgent = req.headers['user-agent'] || 'Unknown';
			const host = req.headers['host'] || 'Unknown';
			const language = req.headers['accept-language'] || 'Unknown';
			const contentType = req.headers['content-type'] || 'Unknown';
			//const contentLength = req.headers['content-length'] || 'Unknown';
			const cacheControl = req.headers['cache-control'] || 'Unknown';
			const connection = req.headers['connection'] || 'Unknown';
			const encoding = req.headers['accept-encoding'] || 'Unknown';
			//const cookie = req.headers['cookie'] || 'None';
			const forwardedFor = req.headers['forwarded'] || 'None';
			//const timestamp = new Date().toISOString();*/

			const allowedOrigins = corsOptions.origin;
			const origin = req.headers['origin'] || 'Unknown';

			if (!allowedOrigins.includes(origin)) {
				return sendBadStatus(res, {
					server: `Origin that made a request (/start-process) isn't allowed: ${req.headers.referer}.`,
					code: "unkown_origin"
				});
			}

			res.setHeader('Access-Control-Allow-Origin', origin);
			res.setHeader('Access-Control-Allow-Methods', 'POST');
			res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

			let { onlineStatus, userId, processToken, userUniqueInternetProtocolId, userInternetProtocolAddress, fileOutputId, removeBanner, positivePrompt, negativePrompt, enhanceDetails, resolution, aspectRatio, model, quality, duration } = req.body;
			if (!userId || !fileOutputId) {
				console.log(`\x1b[31m[ERROR] \x1b[32m[RESPONSE] \x1b[0mMissing required inputs`);
				res.status(STATUS_NOTFOUND).json({ server: `Your queue finished with an error due to missing prompt or id.` });
				return;
			}

			/*const ref = req.headers.referer || "";
			if (!ref.includes("deepany.ai")) {
				return sendBadStatus(res, {
					server: `Referer that made a request (/start-process) isn't allowed: ${req.headers.referer}.`,
					code: "unkown_referer"
				});
			}

			const url = new URL(ref);
			if (url.pathname !== "/video-generator") {
				//return res.status(403).send('Update your browser!');
			}*/

			let score = 0;

			const ua = req.headers['user-agent'] || "";
			if (ua.length < 30) score++;
			if (/curl|wget|python|java|go-http|bot|spider/i.test(ua)) score += 5;

			if (req.headers['sec-fetch-site'] !== "same-origin" &&
				req.headers['sec-fetch-site'] !== "same-site") {
				score++;
			}
			if (!req.headers['sec-fetch-mode']) score++;
			if (!req.headers['sec-fetch-site']) score++;
			if (!req.headers['sec-ch-ua-platform']) score++;
			if (!req.headers['sec-ch-ua']) score++;
			if (!req.headers['accept-language']) score++;
			if (!req.headers['cookie']) score++;
			if (/HeadlessChrome/i.test(ua)) score += 3;

			if (score > 4) {
				return sendBadStatus(res, { server: `Human Verification Failed` });
			}

			//const clientTime = Number(req.headers['x-time']);
			//if (!clientTime || Math.abs(Date.now() - clientTime) > 14000) {
			//return sendBadStatus(res, { server: "Invalid Timestamp" });
			//}

			const contentLength = Number(req.headers['content-length'] || 0);
			if (contentLength > MAX_SIZE) {
				return sendBadStatus(res, { server: "Request too large" });
			}

			function getIp(req) {
				const ip =
					req.headers['cf-connecting-ip'] ||
					req.headers['x-forwarded-for']?.split(',')[0].trim() ||
					req.ip ||
					req.socket.remoteAddress;
				return ip;
			}

			const ip = getIp(req);
			if (!onlineStatus || !onlineClients[onlineStatus]) {
				return sendBadStatus(res, { server: "Unknown Client" });
			}

			const client = onlineClients[onlineStatus];
			const acceptLanguage = req.headers['accept-language'] || '';
			const secChUa = req.headers['sec-ch-ua'] || '';
			const secChUaPlatform = req.headers['sec-ch-ua-platform'] || '';
			const secFetchSite = req.headers['sec-fetch-site'] || '';
			const secFetchMode = req.headers['sec-fetch-mode'] || '';
			const secFetchDest = req.headers['sec-fetch-dest'] || '';
			const cookie = req.headers['cookie'] || undefined;

			const checkIfExistsAndMatches = (currentValue, clientValue) => {
				if (currentValue === undefined || currentValue === null || currentValue === '' || !currentValue) {
					return true;
				}
				return currentValue === clientValue;
			};

			const checks = {
				ip: checkIfExistsAndMatches(ip, client.ip),
				userAgent: checkIfExistsAndMatches(ua, client.userAgent),
				acceptLanguage: checkIfExistsAndMatches(acceptLanguage, client.acceptLanguage),
				secChUa: checkIfExistsAndMatches(secChUa, client.secChUa),
				secChUaPlatform: checkIfExistsAndMatches(secChUaPlatform, client.secChUaPlatform),
				secFetchSite: checkIfExistsAndMatches(secFetchSite, client.secFetchSite),
				secFetchMode: checkIfExistsAndMatches(secFetchMode, client.secFetchMode),
				secFetchDest: checkIfExistsAndMatches(secFetchDest, client.secFetchDest),
				cookie: checkIfExistsAndMatches(cookie, client.cookie)
			};

			const match = Object.values(checks).every(Boolean);
			if (!match) {
				return sendBadStatus(res, { server: "Client Verification Failed" });
			}

			delete onlineClients[onlineStatus];

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

			//generateAudio = 'false';
			// interpolation = 1;
			//if (duration === 8)
			//duration = 5;

			if (!model)
				model = 'realistic any 2.5';

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

					const previousUserDocRef = usersRef.doc(previous.settings.userId);
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
				fileStatusCache.set(fileOutputId, { status: 'failed', server: 'Already Generated...' });
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
				const currentDeadline = [userDoc.data().deadline, userDoc.data().deadlineDV].filter(Boolean).map(d => d.toDate()).sort((a, b) => b - a)[0] || null;
				const shouldCheckCredits = !userDoc.data().moderator && !userDoc.data().admin;

				if (containsProhibitedContent(positivePrompt) && shouldCheckCredits)
					throw new Error(`Prohibited content detected`)

				function getTotalDurationFromPrompt(text) {
					if (!text) return 0;

					const regex = /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/g;
					let maxEnd = 0;
					let match;

					while ((match = regex.exec(text)) !== null) {
						const end = parseFloat(match[2]);
						if (Number.isFinite(end) && end > maxEnd) {
							maxEnd = end;
						}
					}

					return maxEnd;
				}

				let neededCredits = 1;

				if (shouldCheckCredits && (currentDate > currentDeadline || !currentDeadline)) {
					neededCredits = 1;
					neededCredits *= Number(getTotalDurationFromPrompt(positivePrompt) || duration);
					neededCredits *= 1 + (Number(quality) - 1) * 0.5;

					if (removeBanner === "true") neededCredits *= 2;
					//if (model.includes('2.5')) neededCredits *= 4;
					//if (resolution === '720p') neededCredits *= 2;

					neededCredits /= 2;
					neededCredits = Math.max(1, Math.round(neededCredits));

					if (currentCredits - neededCredits < 0) {
						throw new Error(`${userName} don't have enough credits. You need extra ${neededCredits - currentCredits} credits.`)
					}
				}
			} catch (error) {
				sendBadStatus(res, { server: error.message })
				fileStatusCache.set(fileOutputId, { status: 'failed', server: 'User Not Found...' });
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
						console.error("Maintaince detected: ", userName);
						return sendBadStatus(res, { server: 'Maintaince' });
					}
				} catch (err) {
					console.error('Maintenance check error:', err);
					return sendBadStatus(res, { server: 'Maintenance Check Failed' });
				}
			}

			let lastRestart = 0;
			const RESTART_COOLDOWN = 5 * 60 * 1000;

			if (requestQueue.length > MAX_TASK_LIMIT) {
				sendBadStatus(res, { server: `Server Overloaded` });

				const now = Date.now();
				if (now - lastRestart > RESTART_COOLDOWN) {
					lastRestart = now;

					exec('pm2 restart all', (error, stdout, stderr) => {
						if (error) {
							console.error(`Error restarting pm2: ${error.message}`);
							return;
						}
						if (stderr) {
							console.error(`pm2 stderr: ${stderr}`);
							return;
						}
						console.log(`pm2 restarted: ${stdout}`);
					});
				}

				fileStatusCache.set(fileOutputId, { status: 'failed', server: 'Server Restarting...' });
				return;
			}

			const userIdExists = requestQueue.some(r => r.req.body.userId === userId);
			if (userIdExists && !isAdmin) {
				sendBadStatus(res, { server: `Request for ${userName} already exists.` });
				fileStatusCache.set(fileOutputId, { status: 'failed', server: 'Request Already Exists...' });
				return;
			}

			requestQueue.push({ req, res, });
			setTotalQueue(requestQueue.length);

			try {
				await privateRef.doc(config.SERVER_1).update({ requestQueue: requestQueue.map(request => ({ userId: request?.req?.body?.userId, processToken: request?.req?.body?.processToken, language: request.req.headers['accept-language'] || 'Unknown', userAgent: request.req.headers['user-agent'] || 'Unknown', origin: request.req.headers['origin'] || 'Unknown', referer: request.req.headers['referer'] || request.req.headers['referrer'] || 'Unknown', host: request.req.headers['host'] || 'Unknown', ip: request.req.headers['x-forwarded-for'] || request.req.socket.remoteAddress, country: request.req.headers['cf-ipcountry'] || 'Unknown' })) });
				await serversRef.doc(config.SERVER_1).update({ requestQueue: requestQueue.map(request => ({ userId: request?.req?.body?.userId })) });
				await serversRef.doc(config.SERVER_1).update({ deepVideoQueue: requestQueue.length });
				await usersRef.doc(userId).update({ isProcessing: true });
			} catch (error) {
				console.error("An error occurred while updating Firestore documents:", error);
			}

			sendOkStatus(res, { fileOutputId, server: `Your queue has started.` });
			fileStatusCache.set(fileOutputId, { status: 'processing', server: 'Processing...' });
			console.log(`\x1b[33m[QUEUE] \x1b[31m[WAITING RESPONSE] \x1b[33mQueue ${requestQueue.length} for \x1b[32m${userName}\x1b[0m`);

			if (isProcessing) {
				console.log(`\x1b[33m[QUEUE] \x1b[31m[WAITING RESPONSE] \x1b[0mUser \x1b[32m${userName} \x1b[0mis waiting for current process.`);
				return;
			}

			return await processNextRequest();
		});

	app.get('/get-process-state/:fileOutputId', async (req, res) => {
		const fileOutputId = req.params.fileOutputId;
		const outputPath = path.join(__dirname, `videos/${fileOutputId}.mp4`);

		if (await fileExists(outputPath)) {
			const statusData = {
				status: 'completed',
				server: 'Process Completed',
				fileOutputId,
				processingAmount: null,
				frameCount: null,
				totalFrames: null,
				elapsedTime: null,
				remainingTime: null,
			};
			return res.status(STATUS_CREATED).json(statusData);
		}

		const cached = fileStatusCache.get(fileOutputId);
		if (cached) {
			return res.status(200).json(cached);
		}

		const failedData = {
			status: 'failed',
			server: 'Unkown Status...',
			fileOutputId,
			processingAmount,
			frameCount,
			totalFrames,
			elapsedTime,
			remainingTime,
		};
		return sendBadStatus(res, failedData);
	});

	app.get('/download-output/:fileOutputId', async (req, res) => {
		const fileOutputId = req.params.fileOutputId;
		const isImage = fileOutputId.slice(-1) === '1';
		const outputFormat = isImage ? 'png' : 'mp4';
		const outputPath = path.join(__dirname, `videos/${fileOutputId}.${outputFormat}`);

		if (await fileExists(outputPath)) {
			try {
				const stat = await fs.promises.stat(outputPath);
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

					const inputFileStream = fs.createReadStream(outputPath, { start, end });
					inputFileStream.on('error', err => {
						console.error('File Stream Error:', err);
						res.status(500).send('Internal Server Error');
					});
					inputFileStream.pipe(res);
				} else {
					res.setHeader('Content-Disposition', `attachment; filename=output.${outputFormat}`);
					res.setHeader('Content-Type', isImage ? 'image/png' : 'video/mp4');
					res.setHeader('Content-Length', fileSize);

					const inputFileStream = fs.createReadStream(outputPath);
					inputFileStream.on('error', err => {
						console.error('File Stream Error:', err);
						res.status(500).send('Internal Server Error');
					});
					inputFileStream.pipe(res);
				}
			} catch (err) {
				console.error('Error reading file stats:', err);
				res.status(500).send('Internal Server Error');
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
			//console.log(`[REQUEST BODY] userId=${userId}, processToken=${processToken}, types=(${typeof userId}, ${typeof processToken})`);

			const headers = {
				country: req.headers['cf-ipcountry'] || 'Unknown',
				ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
				userAgent: req.headers['user-agent'] || 'Unknown',
				referer: req.headers['referer'] || req.headers['referrer'] || 'Unknown',
				host: req.headers['host'] || 'Unknown',
				origin: req.headers['origin'] || 'Unknown',
				language: req.headers['accept-language'] || 'Unknown',
				contentType: req.headers['content-type'] || 'Unknown',
				contentLength: req.headers['content-length'] || 'Unknown',
				cacheControl: req.headers['cache-control'] || 'Unknown',
				connection: req.headers['connection'] || 'Unknown',
				encoding: req.headers['accept-encoding'] || 'Unknown',
				cookie: req.headers['cookie'] || 'None',
				forwardedFor: req.headers['forwarded'] || 'None'
			};
			//console.log(`[REQUEST HEADERS]`, headers);

			if (!userId || !processToken || typeof userId !== 'string' || userId.trim() === '') {
				console.error(`[ERROR] Invalid body. userId=${userId}, processToken=${processToken}`);
				res.status(STATUS_BADREQUEST).json({ server: 'Invalid Body Request' });
				return;
			}

			/*console.log(`[QUEUE STATE BEFORE]`, requestQueue.map((r, i) => ({
				index: i,
				userId: r?.req?.body?.userId,
				processToken: r?.req?.body?.processToken
			})));*/

			const index = requestQueue.findIndex(r =>
				r?.req?.body?.userId === userId &&
				r?.req?.body?.processToken === processToken
			);
			//console.log(`[QUEUE SEARCH] Found index=${index} for userId=${userId}, token=${processToken}`);

			if (requestQueue.length > 0 && index !== -1) {
				//console.log(`[INFO] Removing request at index=${index} for userId=${userId}`);

				/*const canceledRequest = */requestQueue.splice(index, 1)[0];
				//console.log(`[QUEUE ITEM REMOVED]`, {
				//	userId: canceledRequest?.req?.body?.userId,
				//	processToken: canceledRequest?.req?.body?.processToken
				//});
				//console.log(`[QUEUE STATE AFTER]`, requestQueue.map((r, i) => ({
				//	index: i,
				//	userId: r?.req?.body?.userId,
				//	processToken: r?.req?.body?.processToken
				//})));

				if (requestQueue.length === 0) {
					//console.log(`[QUEUE EMPTY] Clearing Firestore server queues`);
					setTotalQueue(requestQueue.length);
					await serversRef.doc(config.SERVER_1).update({ requestQueue: [], deepVideoQueue: 0 });
					await privateRef.doc(config.SERVER_1).update({ requestQueue: [] });
				} else {
					//console.log(`[QUEUE SYNC] Updating Firestore with ${requestQueue.length} requests`);
					await serversRef.doc(config.SERVER_1).update({
						requestQueue: requestQueue.map(r => ({ userId: r.req.body.userId })),
						deepVideoQueue: requestQueue.length
					});
					await privateRef.doc(config.SERVER_1).update({
						requestQueue: requestQueue.map(r => ({
							userId: r.req.body.userId,
							processToken: r.req.body.processToken,
							language: r.req.headers['accept-language'] || 'Unknown',
							userAgent: r.req.headers['user-agent'] || 'Unknown',
							origin: r.req.headers['origin'] || 'Unknown',
							referer: r.req.headers['referer'] || r.req.headers['referrer'] || 'Unknown',
							host: r.req.headers['host'] || 'Unknown',
							ip: r.req.headers['x-forwarded-for'] || r.req.socket.remoteAddress,
							country: r.req.headers['cf-ipcountry'] || 'Unknown'
						}))
					});
				}

				try {
					const userDoc = await usersRef.doc(userId).get();
					if (userDoc.exists) {
						await usersRef.doc(userId).update({ isProcessing: false });
						//console.log(`[USER UPDATE] isProcessing=false for userId=${userId}, username=${userDoc.data().username}`);
					}
				} catch (error) {
					console.error(`[ERROR] Failed to update user doc for userId=${userId}:`, error);
				}

				if (index === 0) {
					try {
						const queueRes = await axios.get(`http://${config.URL}/api/queue`);
						const { queue_running } = queueRes.data;

						if (queue_running.length > 0) {
							//console.log(`[INTERRUPT] Sending interrupt to ${config.URL}`);
							await axios.post(`http://${config.URL}/api/interrupt`);
						}
						else {
							//console.log(`[INFO] Queue is empty. Nothing to interrupt.`);
						}
					} catch (error) {
						await axios.post(`http://${config.URL}/api/interrupt`);
						console.error(`[ERROR] Failed to check queue or send interrupt:`, error);
					}
				}

				return res.status(200).json({ server: `Process has been cancelled.` });
			} else {
				//console.log(`[INFO] Not in-memory. Checking Firestore... userId=${userId}, processToken=${processToken}`);

				const serversSnapshot = await serversRef.get();
				const privateSnapshot = await privateRef.get();
				const promises = [];
				let matchedServerId = null;

				privateSnapshot.forEach(serverDoc => {
					const serverData = serverDoc.data();
					const queue = serverData.requestQueue || [];
					const idx = queue.findIndex(r =>
						r?.req?.body?.userId === userId &&
						r?.req?.body?.processToken === processToken
					);

					if (idx !== -1) {
						//console.log(`[PRIVATE MATCH] Removing request from private server=${serverDoc.id}, index=${idx}`);
						queue.splice(idx, 1);
						matchedServerId = serverDoc.id;
						setTotalQueue(requestQueue.length);
						promises.push(privateRef.doc(serverDoc.id).update({ requestQueue: queue }));
					}
				});

				if (matchedServerId) {
					//console.log(`[SERVER MATCH] Updating main server queue for serverId=${matchedServerId}`);
					const serverDoc = await serversRef.doc(matchedServerId).get();
					const serverData = serverDoc.data();
					const queue = serverData.requestQueue || [];
					const idx = queue.findIndex(r => r?.req?.body?.userId === userId);
					if (idx !== -1) {
						queue.splice(idx, 1);
						promises.push(serversRef.doc(matchedServerId).update({
							requestQueue: queue,
							deepVideoQueue: queue.length
						}));
					}
				}

				await Promise.all(promises);
				const isProcessing = promises.length > 0;

				if (!isProcessing) {
					//console.log(`[INFO] No active process found for userId=${userId}. Resetting isProcessing.`);
					await usersRef.doc(userId).update({ isProcessing: false });
					return res.status(STATUS_NOTFOUND).json({ server: `No active process found. Process status is now removed.` });
				} else {
					//console.log(`[INFO] Process removed from Firestore for userId=${userId}`);
					return res.status(STATUS_NOTFOUND).json({ server: `No active process found.` });
				}
			}
		} catch (error) {
			console.error(`[CRITICAL ERROR] /cancel-process failed:`, error);
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

			const onlineStatus = uuidv4();
			const now = Date.now();
			const ip = req.headers['cf-connecting-ip'] ||
				req.headers['x-forwarded-for']?.split(',')[0].trim() ||
				req.ip ||
				req.socket.remoteAddress;

			onlineClients[onlineStatus] = {
				ip,
				userAgent: req.headers['user-agent'] || '',
				acceptLanguage: req.headers['accept-language'] || '',
				secChUa: req.headers['sec-ch-ua'] || '',
				secChUaPlatform: req.headers['sec-ch-ua-platform'] || '',
				secFetchSite: req.headers['sec-fetch-site'] || '',
				secFetchMode: req.headers['sec-fetch-mode'] || '',
				secFetchDest: req.headers['sec-fetch-dest'] || '',
				cookie: req.headers['cookie'] || '',
				lastSeen: now
			};

			for (const id in onlineClients) {
				if (now - onlineClients[id].lastSeen > 15000) {
					delete onlineClients[id];
				}
			}

			setTotalQueue(requestQueue.length);

			return sendOkStatus(res, {
				onlineStatus,
				server: hasMaintenance ? 99999 : getTotalQueue(),
				requestQueue: requestQueue && requestQueue.length ? requestQueue.map(request => request?.req?.body?.userId) : [],
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