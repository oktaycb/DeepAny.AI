async function startServer(config) {
	const express = require('express');
	const path = require('path');
	const admin = require('firebase-admin');
	const fs = require('fs');
	const axios = require('axios');
	const sharp = require('sharp');
	const WebSocket = require('ws');
	const { v4: uuidv4 } = require('uuid');

	const util = require('util');
	const readFileAsync = util.promisify(fs.readFile);

	const { execFile } = require('child_process');
	//const execFileAsync = util.promisify(execFile)

	const { exec } = require("child_process");
	const execPromise = util.promisify(exec);

	const { spawn } = require('child_process');
	//const spawnPromise = util.promisify(spawn);

	const { execSync } = require('child_process');

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
			"https://deepany.ai"
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

	const fileStatusCache = new Map();

	let userName = '';
	let isProcessing = false;
	let requestQueue = [];
	let onlineClients = {};

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
			/lolicon/i,
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
	let currentModel = null;

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

		deleteOldFiles(path.join(__dirname, 'processing'));
		deleteOldFiles(path.join(__dirname, 'mask'));
		deleteOldFiles(path.join(__dirname, 'inpaint'));
		deleteOldFiles(path.join(__dirname, 'output'));
		deleteOldFiles(path.join(__dirname, 'output'));
		deleteOldFiles(path.join(__dirname, 'uploads'));

		if (requestQueue.length === 0) {
			setTotalQueue(requestQueue.length);
			didSentTheOutput = true;
			isProcessing = false;
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

		let { og, tensorrt, userId, seed, adaptiveGuidance, adaptiveThreshold, aspectRatio, noise, batch, faceDetailer, resolution, automaticCFG, skimmedCFG, skimmingCFG, rescaleCFG, rescaleMultiplier, enableSAG, enableFDG, enableAPG, enableSEG, enablePAG, enableFREEU, epsilon, fp16, sag, vpred, znsr, uncondZeroScale, uncondMethod, nag, cache, cacheStart, sampler, scheduler, cfg, steps, removeBanner, s_lora, s_strength, instantid, lora, strength, model, clipSkip, positivePrompt, negativePrompt, fileOutputId } = req.body;

		let portraitFile =
			req.file && req.file.mimetype.startsWith('image/')
				? req.file
				: null;

		if (model.includes('anime')) {
			portraitFile = null;
			faceDetailer = null;
		}

		let hasPortrait = portraitFile !== null ? true : false;
		let portraitFilePath = path.join(__dirname, `processing/${config.PORT}_portrait.png`);
		if (hasPortrait) {
			try {
				await sharp(portraitFile.path, { failOnError: false })
					.toFormat('png')
					.toFile(portraitFilePath);
			} catch (error) {
				portraitFile = null;
				hasPortrait = false;
				console.error('Failed to move portrait:', error);
			}
		}

		if (!s_lora)
			s_lora = 'disabled';

		if (!clipSkip)
			clipSkip = 1;

		function processPrompt(prompt) {
			let lines = prompt.split(/\r?\n/).map(line => line.trim().replace(/,+/g, ','));
			let processedPrompt = lines.join(', ');
			return processedPrompt.endsWith(',') ? processedPrompt.slice(0, -1) : processedPrompt;
		}

		if (negativePrompt.length < 1) {
			negativePrompt = 'bright colors, overexposed, static, blurred details, subtitles, overall gray, bad quality, worst quality, low quality, JPEG compression residue, ugly, incomplete, extra fingers, poorly drawn hands, poorly drawn faces, deformed, disfigured, malformed limbs, fused fingers, text, watermark';
		}

		positivePrompt = processPrompt(positivePrompt);
		negativePrompt = processPrompt(negativePrompt);

		const resolutionMap = {
			'720p': {
				'2:5': [640, 1536],
				'4:7': [768, 1344],
				'3:5': [768, 1280],
				'2:3': [832, 1216],
				'7:9': [896, 1152],
				'1:1': [1024, 1024],
				'5:4': [1152, 896],
				'3:2': [1216, 832],
				'5:3': [1280, 768],
				'7:4': [1344, 768],
				'12:5': [1536, 640],
				'default': [1024, 1024]
			},
			'512p': {
				'9:16': [512, 912],
				'2:3': [512, 768],
				'1:1': [512, 512],
				'3:2': [768, 512],
				'16:9': [912, 512],
				'default': [512, 512]
			}
		};

		function getDimensions(resolution, aspectRatio) {
			const res = resolutionMap[resolution] || resolutionMap['720p'];
			const [width, height] = res[aspectRatio] || res['default'];
			return { width, height };
		}

		const { width, height } = getDimensions(resolution, aspectRatio);

		userName = 'Guest_' + userId;
		isAdmin = false;
		currentCredits = 0;
		currentDate = new Date();
		currentDeadline = new Date();
		didSentTheOutput = false;

		if (userName)
			userName = userName.replace(/\s/g, '');

		console.log(`\x1b[32m[PROCESSNEXTREQUEST] \x1b[32m[RESPONSE] \x1b[0mStarting the process for \x1b[32m${userName}\x1b[0m`);

		const outputPath = path.join(__dirname, `output/${fileOutputId}.png`);

		let nodeCounter = 0;
		function addNode(payload, node) {
			if (payload === null)
				return 0;
			if (node.inputs) {
				for (const key in node.inputs) {
					if (node.inputs[key] === null) {
						delete node.inputs[key];
					}
				}
			}
			nodeCounter += 1;
			const key = String(nodeCounter);
			payload.prompt[key] = node;
			return key;
		}

		let payload = {
			prompt: {}
		};

		currentModel = model;
		const ckpt_name = model.replace(/^(anime|realistic)\s+/, "");

		let vaeIdx = -1;

		let clipIdx = -1;
		let previousClipIdx = -1;

		let modelIdx = -1;
		let previousModelIdx = -1;

		if (ckpt_name.includes('D-')) {
			modelIdx = addNode(payload, {
				class_type: "UNETLoader",
				inputs: {
					"unet_name": ckpt_name,
					"weight_dtype": 'default'
				}
			});
			previousModelIdx = modelIdx;

			clipIdx = addNode(payload, {
				class_type: "CLIPLoader",
				inputs: {
					"clip_name": "qwen3_4b_fp8_scaled.safetensors",
					"type": "lumina2",
					"device": "default",
				}
			});
			previousClipIdx = [clipIdx, 0];

			let vaeLoaderIdx = addNode(payload, {
				class_type: "VAELoader",
				inputs: {
					"vae_name": "ZImage-AE.safetensors",
				}
			});
			vaeIdx = [vaeLoaderIdx, 0];
		}
		else {
			if (tensorrt === 'false') {
				if (!ckpt_name.includes("NoobAI")) {
					modelIdx = addNode(payload, {
						class_type: "UNETLoader",
						inputs: {
							"unet_name": ckpt_name,
							"weight_dtype": 'default'
						}
					});
					previousModelIdx = modelIdx;
				}
				else {
					modelIdx = addNode(payload, {
						class_type: "CheckpointLoaderSimple",
						inputs: {
							"ckpt_name": ckpt_name,
						}
					});
					previousModelIdx = modelIdx;
				}
			} else {
				modelIdx = addNode(payload, {
					class_type: "TensorRTLoader",
					inputs: {
						"unet_name": ckpt_name.replace(/\.safetensors$/i, '.engine'),
						"model_type": ckpt_name.includes('1.5')  ? 'sd1.x' :'sdxl_base'
					}
				});
				previousModelIdx = modelIdx;
			}
			let vaeLoaderIdx = addNode(payload, {
				class_type: "VAELoader",
				inputs: {
					"vae_name": ckpt_name.includes('1.5') ? "SD-VAE.safetensors" :  "SDXL-VAE-FP16.safetensors",
					"device": "main_device",
					"weight_dtype": "fp16"
				}
			});
			vaeIdx = [vaeLoaderIdx, 0];

			let clipLoaderIdx = null;
			if (ckpt_name.includes('1.5')) {
				clipLoaderIdx = addNode(payload, {
					class_type: "CLIPLoader",
					inputs: {
						"clip_name": ckpt_name.replace(/\.safetensors$/i, '_ClipL.safetensors'),
						"type": "stable_diffusion",
						"device": "default"
					}
				});
			}
			else {
				clipLoaderIdx = addNode(payload, {
					class_type: "DualCLIPLoader",
					inputs: {
						"clip_name1": ckpt_name.replace(/\.safetensors$/i, '_ClipL.safetensors'),
						"clip_name2": ckpt_name.replace(/\.safetensors$/i, '_ClipG.safetensors'),
						"type": "sdxl",
						"device": "default"
					}
				});
			}
			clipIdx = addNode(payload, {
				class_type: "CLIPSetLastLayer",
				inputs: {
					"stop_at_clip_layer": Math.max(2, clipSkip) * -1,
					"clip": [clipLoaderIdx, 0]
				}
			});
			previousClipIdx = [clipIdx, 0];
		}

		if (s_lora !== 'disabled') {
			modelIdx = addNode(payload, {
				class_type: "LoraLoader",
				inputs: {
					"lora_name": s_lora,
					"strength_model": s_strength,
					"strength_clip": s_strength,
					"model": [previousModelIdx, 0],
					"clip": previousClipIdx
				}

			});
			previousModelIdx = modelIdx;
		}

		if (lora !== 'disabled') {
			modelIdx = addNode(payload, {
				class_type: "LoraLoader",
				inputs: {
					"lora_name": lora + '.safetensors',
					"strength_model": strength,
					"strength_clip": strength,
					"model": [previousModelIdx, 0],
					"clip": previousClipIdx
				}
			});

			previousModelIdx = modelIdx;
		}

		const loadImageIdx = addNode(payload, {
			class_type: "LoadImage",
			inputs: {
				"image": portraitFilePath
			}
		});

		function buildConditioningNodes(payload, opts) {
			const {
				positivePrompt,
				hasPortrait = false,
				previousClipIdx = 0,
				noise = "default",
				tokenNormalization = "length+mean"
			} = opts;

			// prepare text with optional portrait prefix
			const inputText = (hasPortrait ? 'fcsks fxhks fhyks, ' : '') + (positivePrompt || '');

			// helpers
			function splitAND(text) {
				// split by word "AND" case-insensitive, allow surrounding whitespace
				return text.split(/\s+AND\s+/i).map(s => s.trim()).filter(Boolean);
			}
			function splitBREAK(text) {
				// split by word "BREAK" case-insensitive
				return text.split(/\s+BREAK\s+/i).map(s => s.trim()).filter(Boolean);
			}

			function createClipNode(text) {
				if (ckpt_name.includes('D-')) {
					return addNode(payload, {
						class_type: "CLIPTextEncode",
						inputs: {
							"text": text,
							"clip": previousClipIdx
						}
					});
				} else {
					return addNode(payload, {
						class_type: "BNK_CLIPTextEncodeAdvanced",
						inputs: {
							"text": text,
							"token_normalization": tokenNormalization,
							"weight_interpretation": noise,
							"clip": previousClipIdx
						}
					});
				}
			}

			function foldConcat(nodesArray) {
				// left-fold with ConditioningConcat
				if (!nodesArray || nodesArray.length === 0) return null;
				if (nodesArray.length === 1) return nodesArray[0];

				let left = nodesArray[0];
				for (let i = 1; i < nodesArray.length; i++) {
					const right = nodesArray[i];
					// create ConditioningConcat node that concatenates left and right
					left = addNode(payload, {
						class_type: "ConditioningConcat",
						inputs: {
							// Different ComfyUI variants use slightly different input names.
							// Provide both common variations to increase compatibility.
							"conditioning_to": [left, 0],
							"conditioning_from": [right, 0]
						}
					});
				}
				return left;
			}

			function foldCombine(nodesArray) {
				// left-fold with ConditioningCombine
				if (!nodesArray || nodesArray.length === 0) return null;
				if (nodesArray.length === 1) return nodesArray[0];

				let left = nodesArray[0];
				for (let i = 1; i < nodesArray.length; i++) {
					const right = nodesArray[i];
					left = addNode(payload, {
						class_type: "ConditioningCombine",
						inputs: {
							// again include both naming variants (some node builds use different keys)
							"conditioning_1": [left, 0],
							"conditioning_2": [right, 0],
						}
					});
				}
				return left;
			}

			// Main parsing logic:
			// 1) Split top-level by AND (because AND is for combining different conditionings).
			// 2) For each AND part, if it contains BREAK, split by BREAK and concat the CLIP encodings.
			// 3) If no BREAK, just create a CLIP node for that part.
			// 4) Finally, if there are multiple AND parts, combine them.

			const andParts = splitAND(inputText);

			const conditioningNodes = andParts.map(andPart => {
				const breakParts = splitBREAK(andPart);
				// build clip nodes for each break segment
				const clipNodes = breakParts.map(bp => createClipNode(bp));

				if (clipNodes.length === 0) {
					return null;
				} else if (clipNodes.length === 1) {
					// single segment — just return the clip node
					return clipNodes[0];
				} else {
					// multiple break segments — concat their outputs
					return foldConcat(clipNodes);
				}
			}).filter(Boolean);

			if (conditioningNodes.length === 0) {
				// no meaningful text -> still create an empty/default CLIP node just in case
				return createClipNode("");
			} else if (conditioningNodes.length === 1) {
				return conditioningNodes[0];
			} else {
				// multiple AND parts -> combine them
				return foldCombine(conditioningNodes);
			}
		}

		const node2 = buildConditioningNodes(payload, {
			positivePrompt: positivePrompt,
			hasPortrait: hasPortrait,
			previousClipIdx: previousClipIdx,
			noise: noise,
			tokenNormalization: "length+mean"
		});

		const node3 = buildConditioningNodes(payload, {
			positivePrompt: negativePrompt,
			hasPortrait: false,
			previousClipIdx: previousClipIdx,
			noise: noise,
			tokenNormalization: "length+mean"
		});

		let ApplyInstantIDAdvanced = -1;
		if (hasPortrait) {
			const InstantIDModelLoader = addNode(payload, {
				class_type: "InstantIDModelLoader",
				inputs: {
					"instantid_file": "ip-adapter.bin"
				}
			});

			const InstantIDFaceAnalysis = addNode(payload, {
				class_type: "InstantIDFaceAnalysis",
				inputs: {
					"provider": "CUDA"
				}
			});

			const ControlNetLoader = addNode(payload, {
				class_type: "ControlNetLoader",
				inputs: {
					"control_net_name": "diffusion_pytorch_model.safetensors"
				}
			});

			if (instantid === 'true') {
				ApplyInstantIDAdvanced = addNode(payload, {
					class_type: "ApplyInstantIDAdvanced",
					inputs: {
						"ip_weight": 0,
						"cn_strength": 0.6,
						"start_at": 0.1,
						"end_at": 1,
						"noise": 0,
						"combine_embeds": "average",
						"instantid": [
							InstantIDModelLoader,
							0
						],
						"insightface": [
							InstantIDFaceAnalysis,
							0
						],
						"control_net": [
							ControlNetLoader,
							0
						],
						"image": [
							loadImageIdx,
							0
						],
						"model": [
							previousModelIdx,
							0
						],
						"positive": [
							node2,
							0
						],
						"negative": [
							node3,
							0
						],
					}
				});
			}
		}

		if (hasPortrait) {
			const HyperLoRAConfig = addNode(payload, {
				class_type: "HyperLoRAConfig",
				inputs: {
					"image_processor": "clip_vit_large_14_processor",
					"image_encoder": "clip_vit_large_14",
					"resampler.dim": 1024,
					"resampler.dim_head": 64,
					"resampler.heads": 12,
					"resampler.depth": 4,
					"resampler.ff_mult": 4,
					"encoder_types": "clip + arcface",
					"face_analyzer": "antelopev2",
					"id_embed_dim": 512,
					"num_id_tokens": 16,
					"hyper_dim": 128,
					"lora_rank": 8,
					"has_base_lora": false
				}
			});

			const HyperLoRALoader = addNode(payload, {
				class_type: "HyperLoRALoader",
				inputs: {
					"model": "sdxl_hyper_id_lora_v1_edit",
					"dtype": "fp16",
					"config": [
						HyperLoRAConfig,
						0
					]
				}
			});
			const ImpactMakeImageBatch = addNode(payload, {
				class_type: "ImpactMakeImageBatch",
				inputs: {
					"image1": [
						loadImageIdx,
						0
					]
				}
			});

			const HyperLoRAFaceAttr = addNode(payload, {
				class_type: "HyperLoRAFaceAttr",
				inputs: {
					"hyper_lora": [
						HyperLoRALoader,
						0
					],
					"images": [
						ImpactMakeImageBatch,
						0
					]
				}
			});

			const HyperLoRAIDCond = addNode(payload, {
				class_type: "HyperLoRAIDCond",
				inputs: {
					"grayscale": false,
					"remove_background": true,
					"hyper_lora": [
						HyperLoRALoader,
						0
					],
					"images": [
						ImpactMakeImageBatch,
						0
					],
					"face_attr": [
						HyperLoRAFaceAttr,
						0
					]
				}
			});

			const HyperLoRAGenerateIDLoRA = addNode(payload, {
				class_type: "HyperLoRAGenerateIDLoRA",
				inputs: {
					"hyper_lora": [
						HyperLoRALoader,
						0
					],
					"id_cond": [
						HyperLoRAIDCond,
						0
					]
				}
			});

			modelIdx = addNode(payload, {
				class_type: "HyperLoRAApplyLoRA",
				inputs: {
					"weight": 0.9,
					"model": [
						previousModelIdx,
						0
					],
					"lora": [
						HyperLoRAGenerateIDLoRA,
						0
					]
				}
			});
			previousModelIdx = modelIdx;
		}

		if (rescaleCFG === 'true') {
			modelIdx = addNode(payload, {
				class_type: "RescaleCFG",
				inputs: {
					"multiplier": rescaleMultiplier,
					"model": [
						previousModelIdx,
						0
					]
				}
			});
			previousModelIdx = modelIdx;
		}

		if (automaticCFG === 'true' && false) {
			modelIdx = addNode(payload, {
				class_type: "Automatic CFG",
				inputs: {
					"hard_mode": true,
					"boost": true,
					"model": [
						previousModelIdx,
						0
					]
				}
			});
			previousModelIdx = modelIdx;
		}

		if (skimmedCFG === 'true') {
			modelIdx = addNode(payload, {
				class_type: "Skimmed CFG",
				inputs: {
					"Skimming_CFG": skimmingCFG,
					"full_skim_negative": false,
					"disable_flipping_filter": false,
					"model": [
						previousModelIdx,
						0
					]
				}
			});
			previousModelIdx = modelIdx;
		}

		if (epsilon !== '1') {
			modelIdx = addNode(payload, {
				class_type: "Epsilon Scaling",
				inputs: {
					"scaling_factor": epsilon,
					"model": [
						previousModelIdx,
						0
					]
				}
			});
			previousModelIdx = modelIdx;
		}

		if (enableSAG === 'true' && !ckpt_name.includes('D-') && tensorrt === "false") {
			modelIdx = addNode(payload, {
				class_type: "SelfAttentionGuidance",
				inputs: {
					"scale": '0.50',
					"blur_sigma": '2.0',
					"model": [
						previousModelIdx,
						0
					]
				}
			});
			previousModelIdx = modelIdx;
		}

		if (enablePAG === 'true') {
			modelIdx = addNode(payload, {
				class_type: "PerturbedAttentionGuidance",
				inputs: {
					"scale": '3.00',
					"model": [
						previousModelIdx,
						0
					]
				}
			});
			previousModelIdx = modelIdx;
		}

		if (enableAPG === 'true') {
			modelIdx = addNode(payload, {
				class_type: "AdaptiveProjectedGuidance",
				inputs: {
					"momentum": '0.50',
					"eta": '1.0',
					"norm_threshold": '15.0',
					"mode": 'normal',
					"adaptive_momentum": '0.18',
					"model": [
						previousModelIdx,
						0
					]
				}
			});
			previousModelIdx = modelIdx;
		}

		if (enableFDG === 'true') {
			modelIdx = addNode(payload, {
				class_type: "FDGNode",
				inputs: {
					"guidance_scale_high": '7.50',
					"guidance_scale_low": '1.50',
					"levels": '2',
					"fdg_steps": '2',
					"model": [
						previousModelIdx,
						0
					]
				}
			});
			previousModelIdx = modelIdx;
		}

		if (enableSEG === 'true') {
			modelIdx = addNode(payload, {
				class_type: "SEGAttention",
				inputs: {
					"scale": '3.00',
					"blur": '10.00',
					"inf_blur": false,
					"model": [
						previousModelIdx,
						0
					]
				}
			});
			previousModelIdx = modelIdx;
		}

		if (enableFREEU === 'true') {
			modelIdx = addNode(payload, {
				class_type: "FreeU_V2",
				inputs: {
					"b1": '1.30',
					"b2": '1.40',
					"s1": '0.90',
					"s2": '0.20',
					"model": [
						previousModelIdx,
						0
					]
				}
			});
			previousModelIdx = modelIdx;
		}

		modelIdx = addNode(payload, {
			class_type: "PathchSageAttentionKJ",
			inputs: {
				"sage_attention": !model.includes('1.5') && sag === "true" ? "auto" : "disabled",
				"model": [
					previousModelIdx,
					0
				]
			}
		});
		previousModelIdx = modelIdx;

		modelIdx = addNode(payload, {
			class_type: "ModelPatchTorchSettings",
			inputs: {
				"enable_fp16_accumulation": fp16 === "true" ? true : false,
				"model": [
					previousModelIdx,
					0
				]
			}
		});
		previousModelIdx = modelIdx;

		if (!ckpt_name.includes('D-') && cacheStart !== 1 && tensorrt === "false") {
			if (cache === 'firstBlock') {
				modelIdx = addNode(payload, {
					class_type: "ApplyFBCacheOnModel",
					inputs: {
						"object_to_patch": "diffusion_model",
						"residual_diff_threshold": cache === 'firstBlock' ? 0.25 : 0,
						"start": cache === 'firstBlock' ? cacheStart : 1,
						"end": 1,
						"max_consecutive_cache_hits": cache === 'firstBlock' ? -1 : 0,
						"model": [
							previousModelIdx,
							0
						]
					}
				});
				previousModelIdx = modelIdx;
			}
			else if (cache !== "disabled") {
				modelIdx = addNode(payload, {
					class_type: "DonutSDXLTeaCache",
					inputs: {
						"cache_threshold": cache !== "disabled" ? 7 : 0,
						"start_percent": cache !== "disabled" ? cacheStart : 1,
						"end_percent": 1,
						"cache_device": "cuda",
						"enable": cache !== "disabled",
						"cache_mode": cache !== "disabled" ? cache : "conservative",
						"model": [
							previousModelIdx,
							0
						]
					}
				});
				previousModelIdx = modelIdx;
			}
		}

		if (nag === "true") {
			modelIdx = addNode(payload, {
				class_type: "NormalizedAttentionGuidance",
				inputs: {
					"scale": nag === "true" ? 5 : 0,
					"tau": nag === "true" ? 2.5 : 0,
					"alpha": nag === "true" ? 0.5 : 0,
					"sigma_start": -1,
					"sigma_end": -1,
					"unet_block_list": "",
					"model": [
						previousModelIdx,
						0
					],
					"negative": [
						node3,
						0
					]
				}
			});
			previousModelIdx = modelIdx;
			/*modelIdx = addNode(payload, {
				class_type: "ModelNAG",
				inputs: {
					"model": [
						previousModelIdx,
						0
					],
					"nag_negative": [
						node3,
						0
					],
					"nag_scale": !ckpt_name.includes('D-') ? 5.0 : 3.0,
					"nag_alpha": !ckpt_name.includes('D-') ? 0.50 : 0.250,
					"nag_tau": !ckpt_name.includes('D-') ? 2.5 : 1.0,
					"nag_sigma_end": !ckpt_name.includes('D-') ? 0.75 : 0.75,
				}
			});
			previousModelIdx = modelIdx;*/
			//cfg = 1;
		}

		if (uncondMethod !== "adaptive" && Number(uncondZeroScale) !== 0) {
			modelIdx = addNode(payload, {
				class_type: "Uncond Zero",
				inputs: {
					"model": [
						previousModelIdx,
						0
					],
					"scale": Number(uncondZeroScale),
					"method": uncondMethod
				}
			});
			previousModelIdx = modelIdx;
		}

		if (ckpt_name.includes('-VP') || znsr === "true") {
			modelIdx = addNode(payload, {
				class_type: "ModelSamplingDiscrete",
				inputs: {
					"sampling": ckpt_name.includes('-VP') ? "v_prediction" : "eps",
					"zsnr": znsr === "true" ? true : false,
					"model": [
						previousModelIdx,
						0
					]
				}
			});
			previousModelIdx = modelIdx;
		}

		const node13 = addNode(payload, {
			class_type: ckpt_name.includes('D-') ? "EmptySD3LatentImage" : "EmptyLatentImage",
			inputs: {
				"width": width,
				"height": height,
				"batch_size": batch ? Math.min(8, batch) : 1,
			}
		});

		if (ckpt_name.includes('D-') && !ckpt_name.includes('Base')) {
			cfg = 1;
			steps = Math.min(8, steps);
		}

		let samplerIdx = -1;

		if (sampler.includes('/')) {
			let SharkOptions_GuiderInput = -1;

			if (cfg !== 1 && adaptiveGuidance === 'true') {
				const AdaptiveGuidance = addNode(payload, {
					class_type: "AdaptiveGuidance",
					inputs: {
						"model": [previousModelIdx, 0],
						"positive": hasPortrait && ApplyInstantIDAdvanced !== -1 ? [ApplyInstantIDAdvanced, 1] : [node2, 0],
						"negative": hasPortrait && ApplyInstantIDAdvanced !== -1 ? [ApplyInstantIDAdvanced, 2] : [node3, 0],
						"threshold": cfg !== 1 && adaptiveGuidance === 'true' ? adaptiveThreshold : 1,
						"cfg": cfg,
						"uncond_zero_scale": uncondMethod !== "adaptive" ? 0 : Number(uncondZeroScale),
						"cfg_start_pct": 0,
					}
				});

				SharkOptions_GuiderInput = addNode(payload, {
					class_type: "SharkOptions_GuiderInput",
					inputs: {
						"guider": [
							AdaptiveGuidance,
							0
						]
					}
				});
			}

			samplerIdx = addNode(payload, {
				class_type: "ClownsharKSampler_Beta",
				inputs: {
					"eta": 0.5,
					"seed": seed,
					"cfg": cfg,
					"sampler_name": sampler,
					"scheduler": scheduler,
					"steps": Math.min(25, steps),
					"steps_to_run": -1,
					"denoise": 1,
					"sampler_mode": 'standard',
					"bongmath": true,
					"model": [previousModelIdx, 0],
					"positive": hasPortrait && ApplyInstantIDAdvanced !== -1 ? [ApplyInstantIDAdvanced, 1] : [node2, 0],
					"negative": hasPortrait && ApplyInstantIDAdvanced !== -1 ? [ApplyInstantIDAdvanced, 2] : [node3, 0],
					"latent_image": [node13, 0],
					"options": adaptiveGuidance === 'true' && SharkOptions_GuiderInput !== -1 ? [SharkOptions_GuiderInput, 0] : null,
				}
			});
		}
		else {
			const RandomNoise = addNode(payload, {
				class_type: "RandomNoise",
				inputs: {
					"noise_seed": seed
				}
			});

			const node11 = addNode(payload, {
				class_type: "KSamplerSelect",
				inputs: {
					"sampler_name": sampler
				}
			});

			const node12 = addNode(payload, {
				class_type: "BasicScheduler",
				inputs: {
					"scheduler": scheduler,
					"steps": Math.min(25, steps),
					"denoise": 1,
					"model": [
						previousModelIdx,
						0
					]
				}
			});

			let guider = addNode(payload, {
				class_type: "AdaptiveGuidance",
				inputs: {
					"model": [previousModelIdx, 0],
					"positive": hasPortrait && ApplyInstantIDAdvanced !== -1 ? [ApplyInstantIDAdvanced, 1] : [node2, 0],
					"negative": hasPortrait && ApplyInstantIDAdvanced !== -1 ? [ApplyInstantIDAdvanced, 2] : [node3, 0],
					"threshold": cfg !== 1 && adaptiveGuidance === 'true' ? adaptiveThreshold : 1,
					"cfg": cfg,
					"uncond_zero_scale": uncondMethod !== "adaptive" ? 0 : Number(uncondZeroScale),
					"cfg_start_pct": 0,
				}
			});

			samplerIdx = addNode(payload, {
				class_type: "SamplerCustomAdvanced",
				inputs: {
					"noise": [
						RandomNoise,
						0
					],
					"guider": [
						guider,
						0
					],
					"sampler": [
						node11,
						0
					],
					"sigmas": [
						node12,
						0
					],
					"latent_image": [
						node13,
						0
					]
				}
			})
		}

		const node15 = addNode(payload, {
			class_type: "VAEDecode",
			inputs: {
				"samples": [
					samplerIdx,
					0
				],
				"vae": vaeIdx
			}
		});

		let images = [node15, 0];

		if (faceDetailer === 'true') {
			const UltralyticsDetectorProvider = addNode(payload, {
				class_type: "UltralyticsDetectorProvider",
				inputs: {
					"model_name": "bbox/face_yolov8m.pt"
				}
			});

			// Detailer defaults
			const guide_size_detailer = 360;
			const guide_size_for_detailer = true;
			const max_size_detailer = 1024;
			const steps_detailer = 10;
			const cfg_detailer = 1;
			const sampler_name_detailer = "euler";
			const scheduler_detailer = "simple";
			const denoise_detailer = 0.1;
			const feather_detailer = 5;
			const noise_mask_detailer = true;
			const force_inpaint_detailer = false;
			const bbox_threshold_detailer = 0.5;
			const bbox_dilation_detailer = 15;
			const bbox_crop_factor_detailer = 3;
			const sam_dilation_detailer = 0;
			const sam_threshold_detailer = 0.93;
			const sam_bbox_expansion_detailer = 0;
			const sam_mask_hint_threshold_detailer = 0.7;
			const drop_size_detailer = 1;
			const wildcard_detailer = "";
			const cycle_detailer = 1;
			const inpaint_model_detailer = false;
			const noise_mask_feather_detailer = 20;
			const tiled_encode_detailer = false;
			const tiled_decode_detailer = false;

			const faceDetailerIdx = addNode(payload, {
				class_type: "FaceDetailer",
				inputs: {
					guide_size: guide_size_detailer,
					guide_size_for: guide_size_for_detailer,
					max_size: max_size_detailer,
					seed,
					steps: steps_detailer,
					cfg: cfg_detailer,
					sampler_name: sampler_name_detailer,
					scheduler: scheduler_detailer,
					denoise: denoise_detailer,
					feather: feather_detailer,
					noise_mask: noise_mask_detailer,
					force_inpaint: force_inpaint_detailer,
					bbox_threshold: bbox_threshold_detailer,
					bbox_dilation: bbox_dilation_detailer,
					bbox_crop_factor: bbox_crop_factor_detailer,
					sam_detection_hint: "center-1",
					sam_dilation: sam_dilation_detailer,
					sam_threshold: sam_threshold_detailer,
					sam_bbox_expansion: sam_bbox_expansion_detailer,
					sam_mask_hint_threshold: sam_mask_hint_threshold_detailer,
					sam_mask_hint_use_negative: "False",
					drop_size: drop_size_detailer,
					wildcard: wildcard_detailer,
					cycle: cycle_detailer,
					inpaint_model: inpaint_model_detailer,
					noise_mask_feather: noise_mask_feather_detailer,
					tiled_encode: tiled_encode_detailer,
					tiled_decode: tiled_decode_detailer,
					image: images,
					model: [previousModelIdx, 0],
					clip: [clipIdx, 0],
					vae: vaeIdx,
					positive: hasPortrait && ApplyInstantIDAdvanced !== -1 ? [ApplyInstantIDAdvanced, 1] : [node2, 0],
					negative: hasPortrait && ApplyInstantIDAdvanced !== -1 ? [ApplyInstantIDAdvanced, 2] : [node3, 0],
					bbox_detector: [UltralyticsDetectorProvider, 0]
				}
			});

			images = [faceDetailerIdx, 0];
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

		addNode(payload, {
			class_type: "PreviewImage",
			inputs: {
				"images": images
			}
		});

		async function startGeneration(payload) {
			try {
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
					let progress_time = Date.now();

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
										ws.off('message', messageHandler);
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
									break;
								}
								case 'executed': {
									const data = out.data;
									prompt_id = data.prompt_id;
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
										`Progress ${processingAmount.toFixed(1)}% ` +
										`(${data.value}/${data.max}) – ETA ${elapsedTime}<${remainingTime}`
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

				const fsp = fs.promises;

				// CRC32 table + helpers
				function makeCrc32Table() {
					const table = new Uint32Array(256);
					for (let n = 0; n < 256; n++) {
						let c = n;
						for (let k = 0; k < 8; k++) {
							if (c & 1) c = 0xedb88320 ^ (c >>> 1);
							else c = c >>> 1;
						}
						table[n] = c >>> 0;
					}
					return table;
				}
				const CRC_TABLE = makeCrc32Table();

				function crc32(buffer) {
					let crc = 0xffffffff;
					for (let i = 0; i < buffer.length; i++) {
						crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xff];
					}
					return (crc ^ 0xffffffff) >>> 0;
				}

				function u32be(value) {
					const b = Buffer.allocUnsafe(4);
					b.writeUInt32BE(value >>> 0, 0);
					return b;
				}

				// Build uncompressed iTXt chunk
				function buildITXtChunk(key, text) {
					const keyBuf = Buffer.from(String(key), 'utf8');
					const nul = Buffer.from([0]);
					const compFlag = Buffer.from([0]); // 0 = uncompressed
					const compMethod = Buffer.from([0]);
					const langTag = Buffer.from([]);    // empty -> followed by NUL
					const transKeyword = Buffer.from([]); // empty -> followed by NUL
					const textBuf = Buffer.from(String(text), 'utf8');

					const data = Buffer.concat([
						keyBuf, nul,
						compFlag,
						compMethod,
						langTag, nul,
						transKeyword, nul,
						textBuf
					]);

					const type = Buffer.from('iTXt', 'ascii');
					const lengthBuf = u32be(data.length);
					const crc = crc32(Buffer.concat([type, data]));
					const crcBuf = u32be(crc);

					return Buffer.concat([lengthBuf, type, data, crcBuf]);
				}

				// Inject iTXt chunk after IHDR chunk (safe place)
				async function injectITXtChunk(filePath, key, text) {
					const buf = await fsp.readFile(filePath);
					// PNG signature
					if (buf.length < 8 || buf.toString('binary', 0, 8) !== '\x89PNG\r\n\x1a\n') {
						throw new Error('Not a PNG file');
					}

					let pos = 8;
					// Normally IHDR is first chunk; ensure we locate it
					let ihdrPos = null;
					while (pos < buf.length - 8) {
						const len = buf.readUInt32BE(pos);
						const type = buf.toString('ascii', pos + 4, pos + 8);
						if (type === 'IHDR') {
							ihdrPos = pos;
							break;
						}
						pos += 8 + len + 4;
					}
					if (ihdrPos === null) throw new Error('IHDR chunk not found');

					const ihdrLen = buf.readUInt32BE(ihdrPos);
					const ihdrEnd = ihdrPos + 8 + ihdrLen + 4; // end index after IHDR chunk (past CRC)

					const chunk = buildITXtChunk(key, text);
					const newBuf = Buffer.concat([buf.slice(0, ihdrEnd), chunk, buf.slice(ihdrEnd)]);

					await fsp.writeFile(filePath, newBuf);
					return true;
				}

				// Optional: small verifier (sync)
				function dumpTextChunksSync(filePath) {
					const b = fs.readFileSync(filePath);
					if (b.toString('ascii', 0, 8) !== '\x89PNG\r\n\x1a\n') {
						console.log('Not a PNG');
						return;
					}
					let pos = 8;
					while (pos < b.length) {
						const len = b.readUInt32BE(pos);
						const type = b.toString('ascii', pos + 4, pos + 8);
						const dataStart = pos + 8;
						const dataEnd = dataStart + len;
						if (type === 'tEXt') {
							const chunk = b.slice(dataStart, dataEnd);
							const nul = chunk.indexOf(0);
							const key = chunk.slice(0, nul).toString('utf8');
							const val = chunk.slice(nul + 1).toString('utf8');
							console.log('tEXt', key, val.slice(0, 400));
						} else if (type === 'iTXt') {
							const chunk = b.slice(dataStart, dataEnd);
							let i = 0;
							const keyEnd = chunk.indexOf(0, i);
							const key = chunk.slice(0, keyEnd).toString('utf8');
							i = keyEnd + 1;
							const compFlag = chunk[i++];
							const compMethod = chunk[i++];
							const langEnd = chunk.indexOf(0, i);
							const lang = chunk.slice(i, langEnd).toString('utf8');
							i = langEnd + 1;
							const transEnd = chunk.indexOf(0, i);
							const trans = chunk.slice(i, transEnd).toString('utf8');
							i = transEnd + 1;
							const text = chunk.slice(i).toString('utf8');
							console.log('iTXt', key, 'compFlag:', compFlag, text.slice(0, 400));
						}
						pos = dataEnd + 4;
					}
				}

				async function processFile(imageBuffer) {
					try {
						const tempInputPath = path.join(__dirname, `output/temp_${fileOutputId}.png`);
						await fsp.writeFile(tempInputPath, imageBuffer);

						const inputMetadata = await sharp(tempInputPath).metadata();
						const inputWidth = inputMetadata.width;
						const inputHeight = inputMetadata.height;

						// Build pipeline and apply banner if needed (keep as you had)
						let finalImage = sharp(tempInputPath);

						// Apply banner AFTER metadata injection
						if (removeBanner !== 'true') {
							const bannerImagePath = path.join(__dirname, 'banners', 'white_banner.png');

							const bannerMetadata = await sharp(bannerImagePath).metadata();
							const { width: bannerWidth, height: bannerHeight } = bannerMetadata;

							const aspectRatio = inputWidth / inputHeight;
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

							const corners = [
								{ x: 10, y: 10 },
								{ x: inputWidth - smallBannerWidth - 10, y: 10 },
								{ x: 10, y: inputHeight - smallBannerHeight - 10 },
								{ x: inputWidth - smallBannerWidth - 10, y: inputHeight - smallBannerHeight - 10 }
							];
							const randomCorner = corners[Math.floor(Math.random() * corners.length)];

							const smallBanner = await sharp(bannerImagePath)
								.resize(smallBannerWidth, smallBannerHeight)
								.png()
								.toBuffer();

							finalImage = finalImage.composite([
								{ input: smallBanner, left: randomCorner.x, top: randomCorner.y }
							]);
						}

						// Save PNG (force png)
						await finalImage.png().toFile(outputPath);

						// Inject the generationData chunk AFTER the PNG is saved (reliable)
						const generationData = JSON.stringify(req.body);
						console.log('DEBUG: generationData length =', generationData.length);
						console.log('DEBUG: generationData preview =', generationData.slice(0, 200));

						try {
							await injectITXtChunk(outputPath, 'generationData', generationData);
							// Optional: dump for debug
							dumpTextChunksSync(outputPath);
						} catch (injectErr) {
							console.warn('Failed to inject iTXt chunk:', injectErr);
						}

						// Clean up temp file
						fs.unlink(tempInputPath, () => { });
						return outputPath;
					} catch (error) {
						console.error('Error during image processing:', error.message);
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
								rejectWs(new Error("No outputs received — output not found."));
								fileStatusCache.set(fileOutputId, { status: 'failed', server: 'Output Not Found...' });
								return;
							}

							for (const nodeId in outputs) {
								const imageArray = outputs[nodeId];
								if (imageArray && imageArray.length > 0) {
									let finalBuffer;

									if (imageArray.length === 1) {
										finalBuffer = imageArray[0];
									} else {
										async function combineImages(buffers) {
											const sharpImages = await Promise.all(
												buffers.map(b => sharp(b).ensureAlpha().toBuffer())
											);
											const metas = await Promise.all(
												sharpImages.map(img => sharp(img).metadata())
											);
											const count = sharpImages.length;

											if (count === 2) {
												const height = Math.max(metas[0].height, metas[1].height);
												const width = metas[0].width + metas[1].width;

												return sharp({
													create: {
														width,
														height,
														channels: 4,
														background: { r: 0, g: 0, b: 0, alpha: 0 }
													}
												})
													.composite([
														{ input: sharpImages[0], top: 0, left: 0 },
														{ input: sharpImages[1], top: 0, left: metas[0].width }
													])
													.png()
													.toBuffer();
											}

											if (count === 4) {
												const row1Height = Math.max(metas[0].height, metas[1].height);
												const row2Height = Math.max(metas[2].height, metas[3].height);
												const col1Width = Math.max(metas[0].width, metas[2].width);
												const col2Width = Math.max(metas[1].width, metas[3].width);
												const totalWidth = col1Width + col2Width;
												const totalHeight = row1Height + row2Height;

												return sharp({
													create: {
														width: totalWidth,
														height: totalHeight,
														channels: 4,
														background: { r: 0, g: 0, b: 0, alpha: 0 }
													}
												})
													.composite([
														{ input: sharpImages[0], top: 0, left: 0 },
														{ input: sharpImages[1], top: 0, left: col1Width },
														{ input: sharpImages[2], top: row1Height, left: 0 },
														{ input: sharpImages[3], top: row1Height, left: col1Width }
													])
													.png()
													.toBuffer();
											}

											if (count === 8) {
												const row1Height = Math.max(metas[0].height, metas[1].height, metas[2].height, metas[3].height);
												const row2Height = Math.max(metas[4].height, metas[5].height, metas[6].height, metas[7].height);

												const colWidths = [
													Math.max(metas[0].width, metas[4].width),
													Math.max(metas[1].width, metas[5].width),
													Math.max(metas[2].width, metas[6].width),
													Math.max(metas[3].width, metas[7].width)
												];

												const totalWidth = colWidths.reduce((a, b) => a + b, 0);
												const totalHeight = row1Height + row2Height;

												const colX = [
													0,
													colWidths[0],
													colWidths[0] + colWidths[1],
													colWidths[0] + colWidths[1] + colWidths[2]
												];

												const rowY = [0, row1Height];

												const composite = [
													{ input: sharpImages[0], top: rowY[0], left: colX[0] },
													{ input: sharpImages[1], top: rowY[0], left: colX[1] },
													{ input: sharpImages[2], top: rowY[0], left: colX[2] },
													{ input: sharpImages[3], top: rowY[0], left: colX[3] },
													{ input: sharpImages[4], top: rowY[1], left: colX[0] },
													{ input: sharpImages[5], top: rowY[1], left: colX[1] },
													{ input: sharpImages[6], top: rowY[1], left: colX[2] },
													{ input: sharpImages[7], top: rowY[1], left: colX[3] }
												];

												return sharp({
													create: {
														width: totalWidth,
														height: totalHeight,
														channels: 4,
														background: { r: 0, g: 0, b: 0, alpha: 0 }
													}
												})
													.composite(composite)
													.png()
													.toBuffer();
											}

											let currentY = 0;
											const maxWidth = Math.max(...metas.map(m => m.width));
											const totalHeight = metas.reduce((sum, m) => sum + m.height, 0);

											const compositeList = sharpImages.map((img, i) => {
												const comp = { input: img, left: 0, top: currentY };
												currentY += metas[i].height;
												return comp;
											});

											return sharp({
												create: {
													width: maxWidth,
													height: totalHeight,
													channels: 4,
													background: { r: 0, g: 0, b: 0, alpha: 0 }
												}
											})
												.composite(compositeList)
												.png()
												.toBuffer();
										}

										finalBuffer = await combineImages(imageArray);
									}
									await processFile(finalBuffer);
									fileStatusCache.set(fileOutputId, { status: 'processing', server: 'Finalising...' });
								} else {
									console.warn("No image data in outputs.");
									fileStatusCache.set(fileOutputId, { status: 'failed', server: 'Process Failed...' });
									rejectWs(new Error("No image data in outputs."));
									return;
								}
							}
						} catch (err) {
							console.error('Error while handling outputs:', err);
							fileStatusCache.set(fileOutputId, { status: 'failed', server: 'Handling Failed...' });
							rejectWs(err);
						} finally {
							ws.close();
						}
					})();
				});

				await wsClosed;
			} catch (error) {
				fileStatusCache.set(fileOutputId, { status: 'failed', server: 'Process Failed...' });
				console.error('Error:', error.message);
				throw error;
			}
		}

		try {
			//console.dir(payload, { depth: null, colors: true });
			await startGeneration(payload);
			fileStatusCache.set(fileOutputId, { status: 'completed', server: 'Completed!' });
		} catch (error) {
			const timeoutMatch = error.message.match(/ETIMEDOUT\s.*:(\d+)/);
			if (timeoutMatch) {
				const port = parseInt(timeoutMatch[1], 10);
				const serverIndex = port - 6050; // since 6051 = 1, 6052 = 2, etc.
				const baseName = `6000-${serverIndex}`;
				const currentServer = `${baseName}-da`;
				const processesToRestart = [currentServer, `${baseName}-server`];

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
			fileStatusCache.set(fileOutputId, { status: 'failed', server: 'Process Failed...' });
			console.log(`\x1b[31m[PROCESSNEXTREQUEST] \x1b[0mFailed output:`, error);
		} finally {
			processingAmount = null;
			frameCount = null;
			totalFrames = null;
			elapsedTime = null;
			remainingTime = null;
			isProcessing = false;

			try {
				const indexToRemove = requestQueue.findIndex(r => r.req.body.userId === req.body.userId);
				if (indexToRemove !== -1) {
					requestQueue.splice(indexToRemove, 1)[0];
					setTotalQueue(requestQueue.length);
				}
			} catch (error) { }

			return await processNextRequest();
		}
	}

	const MAX_SIZE = 25 * 1024 * 1024
	const multer = require('multer');
	const upload = multer({
		dest: 'uploads/',
		limits: { fileSize: MAX_SIZE },
	});
	app.post('/start-process',
		(req, res, next) => {
			req.socket.setTimeout(5000);
			next();
		},

		(req, res, next) => {
			const size = Number(req.headers['content-length'] || 0);

			if (size > MAX_SIZE) {
				return sendBadStatus(res, { server: "Request exceeds 25MB limit." });
			}
			next();
		},

		upload.single('portraitFile'),

		(err, req, res, next) => {
			if (err?.code === "LIMIT_FILE_SIZE") {
				return sendBadStatus(res, { server: "File too large (max 25MB)." });
			}
			next(err);
		},

		async (req, res) => {
			const maintenanceFile = path.join(__dirname, `checkMaintaince_${config.GPU}.txt`);

			const allowedOrigins = corsOptions.origin;
			const origin = req.headers['origin'] || undefined;

			res.setHeader('Access-Control-Allow-Origin', origin);
			res.setHeader('Access-Control-Allow-Methods', 'POST');
			res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

			let { onlineStatus, userId, positivePrompt, fileOutputId } = req.body;
			if (!userId || !fileOutputId) {
				console.log(`\x1b[31m[ERROR] \x1b[32m[RESPONSE] \x1b[0mMissing required inputs`);
				return sendBadStatus(res, { server: "Missing Inputs" });
				return;
			}

			if (!positivePrompt.includes('Σ')) {
				if (!allowedOrigins.includes(origin)) {
					return sendBadStatus(res, {
						server: `Origin that made a request (/start-process) isn't allowed: ${req.headers.referer}.`,
						code: "unkown_origin"
					});
				}

				const ref = req.headers.referer || "";
				if (!ref.includes("deepany.ai")) {
					return sendBadStatus(res, {
						server: `Referer that made a request (/start-process) isn't allowed: ${req.headers.referer}.`,
						code: "unkown_referer"
					});
				}

				//const url = new URL(ref);
				//if (url.pathname !== "/art-generator") {
					//return res.status(403).send('Update your browser!');
				//}

				if (!positivePrompt.includes('ε')) {
					try {
						if (!fs.existsSync(maintenanceFile)) {
							fs.writeFileSync(maintenanceFile, 'false');
						}

						const fileContent = fs.readFileSync(maintenanceFile, 'utf8').trim();
						if (fileContent === 'true') {
							console.error("Maintaince detected");
							return sendBadStatus(res, { server: 'Maintenance' });
						}
					} catch (err) {
						console.error('Maintenance check error:', err);
						return sendBadStatus(res, { server: 'Maintenance Check Failed' });
					}
				}

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
				const ipAlreadyQueued = requestQueue.some(item => {
					try {
						const itemIp = getIp(item.req);
						return itemIp === ip;
					} catch (err) {
						console.warn('[ipAlreadyQueued] Error comparing IP:', err);
						return false;
					}
				});

				const alreadyProcessing = requestQueue.some(r => r.req.body?.userId === userId) || ipAlreadyQueued;
				if (alreadyProcessing) {
					return sendBadStatus(res, { server: 'Already Processing' });
				}

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
			}

			try {
				if (containsProhibitedContent(positivePrompt) && !positivePrompt.includes('ε'))
					throw new Error(`Prohibited Content`)
			} catch (error) {
				sendBadStatus(res, { server: error.message })
				fileStatusCache.set(fileOutputId, { status: 'failed', server: 'Prohibited Content' });
				return;
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

			requestQueue.push({ req, res, });
			setTotalQueue(requestQueue.length);
			sendOkStatus(res, { fileOutputId, server: `Your queue has started.` });
			fileStatusCache.set(fileOutputId, { status: 'processing', server: 'Processing...' });
			console.log(`\x1b[33m[QUEUE] \x1b[31m[WAITING RESPONSE] \x1b[33mQueue ${requestQueue.length} for \x1b[32m${userName}\x1b[0m`);

			if (isProcessing) {
				console.log(`\x1b[33m[QUEUE] \x1b[31m[WAITING RESPONSE] \x1b[0mUser \x1b[32m${userName} \x1b[0mis waiting for current process.`);
				return;
			}

			return await processNextRequest();
		});

	app.get('/get-process-state/:fileOutputId', async  (req, res) => {
		const fileOutputId = req.params.fileOutputId;
		const outputPath = path.join(__dirname, `output/${fileOutputId}.png`);

		if (fs.existsSync(outputPath)) {
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
			server: 'Process Failed',
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
		const outputPath = path.join(__dirname, `output/${fileOutputId}.${outputFormat}`);

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

				const inputFileStream = fs.createReadStream(outputPath, { start, end });
				inputFileStream.on('error', (err) => {
					console.error('File Stream Error:', err);
					res.status(500).send('Internal Server Error');
				});
				inputFileStream.pipe(res);
			} else {
				res.setHeader('Content-Disposition', `attachment; filename=output.${outputFormat}`);
				res.setHeader('Content-Type', isImage ? 'image/png' : 'video/mp4');
				res.setHeader('Content-Length', fileSize);
				const inputFileStream = fs.createReadStream(outputPath);
				inputFileStream.on('error', (err) => {
					console.error('File Stream Error:', err);
					res.status(500).send('Internal Server Error');
				});
				inputFileStream.pipe(res);
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
			const { userId } = req.body;
			if (!userId || typeof userId !== 'string' || userId.trim() === '') {
				console.log(`[ERROR] Invalid body. userId=${userId}`);
				res.status(STATUS_BADREQUEST).json({ server: 'Invalid Body Request' });
				return;
			}

			console.log(`[INFO] userId=${userId}`);

			const index = requestQueue.findIndex(r =>
				r?.req?.body?.userId === userId
			);

			console.dir(requestQueue, { depth: null });
			console.log(`[INFO] index=${index}`);

			if (requestQueue.length > 0 && index !== -1) {
				requestQueue.splice(index, 1)[0];

				if (requestQueue.length === 0) {
					console.log(`[QUEUE EMPTY] Clearing Firestore server queues`);
					setTotalQueue(requestQueue.length);
				} else {
					console.log(`[QUEUE SYNC] Updating Firestore with ${requestQueue.length} requests`);
				}

				if (index === 0) {
					try {
						const queueRes = await axios.get(`http://${config.URL}/api/queue`);
						const { queue_running } = queueRes.data;

						if (queue_running.length > 0) {
							console.log(`[INTERRUPT] Sending interrupt to ${config.URL}`);
							await axios.post(`http://${config.URL}/api/interrupt`);
						}
						else {
							console.log(`[INFO] Queue is empty. Nothing to interrupt.`);
						}
					} catch (error) {
						await axios.post(`http://${config.URL}/api/interrupt`);
						console.log(`[ERROR] Failed to check queue or send interrupt:`, error);
					}
				}

				return res.status(200).json({ server: `Process has been cancelled.` });
			} else {
				console.log(`[INFO] Nothing in-memory.`);
			}
		} catch (error) {
			console.log(`[CRITICAL ERROR] /cancel-process failed:`, error);
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
			//if (!ref) {
				//return res.status(403).send('Update your browser!');
			//}

			//const url = new URL(ref);
			//if (url.pathname !== "/art-generator") {
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
				requestQueue: requestQueue.map(r => r.req?.body?.userId ?? null),
				remainingTime: remainingTime || 0,
				elapsedTime: elapsedTime || 0,
				frameCount: frameCount || 0,
				totalFrames: totalFrames || 0,
				processingAmount: processingAmount || 0,
				currentModel: currentModel || '',
				SERVER_1: config.SERVER_1,
			});

		} catch (error) {
			console.error(`[\x1b[31mERROR] An error occurred: ${error}`);
			return res.status(STATUS_NOTFOUND).json({ server: 'An error occurred while processing the request' });
		}
	});

	const serviceAccount = require('./serviceAccountKey.json');
	admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

	serverListen = app.listen(config.PORT, async () => {
		async function setupTunnel() {
			try {
				const db = admin.firestore();
				const serversRef = db.collection('servers');
				const serverDoc = serversRef.doc(config.SERVER_1);
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