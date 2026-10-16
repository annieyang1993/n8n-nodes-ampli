import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { ampliApiRequest } from '../../shared/transport';
import { compact, sleep, toStringArray } from '../../shared/utils';

const showOnlyForGenerations = {
	resource: ['generation'],
};

const showOnlyForGenerationCreate = {
	...showOnlyForGenerations,
	operation: ['create'],
};

/** How often a waiting Create polls the job (ms). */
const POLL_INTERVAL_MS = 10_000;

export const generationProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForGenerations,
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Generate posts',
				description:
					'Generate new posts from a URL, a topic or pasted text (costs credits: slideshow 4, pin 1 per post)',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a generation job',
				description: 'Get a generation job and, once completed, its posts',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many generation jobs',
				description: 'List the 25 most recent generation jobs',
			},
		],
		default: 'create',
	},

	// ── Create ──
	{
		displayName: 'Input',
		name: 'input',
		type: 'string',
		typeOptions: {
			rows: 3,
		},
		default: '',
		required: true,
		placeholder: 'e.g. https://example.com/blog/7-garlic-mistakes',
		description:
			'What the posts are about: a URL (the page is read and its photos can be used), a topic, or pasted text. Text with "Slide 1: …" lines is followed as an outline.',
		displayOptions: {
			show: showOnlyForGenerationCreate,
		},
	},
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		options: [
			{
				name: 'Pin',
				value: 'pin',
				description: 'One Pinterest image',
			},
			{
				name: 'Slideshow',
				value: 'slideshow',
				description: 'Swipeable image carousel for TikTok, Instagram or LinkedIn',
			},
		],
		default: 'slideshow',
		displayOptions: {
			show: showOnlyForGenerationCreate,
		},
	},
	{
		displayName: 'Wait for Completion',
		name: 'waitForCompletion',
		type: 'boolean',
		default: true,
		description:
			'Whether to wait until the posts are generated (usually 1–3 minutes) and return them, instead of returning the job ID right away',
		displayOptions: {
			show: showOnlyForGenerationCreate,
		},
	},
	{
		displayName: 'Max Wait Time (Seconds)',
		name: 'maxWaitSeconds',
		type: 'number',
		typeOptions: {
			minValue: 30,
		},
		default: 600,
		description: 'How long to wait for the generation before giving up',
		displayOptions: {
			show: {
				...showOnlyForGenerationCreate,
				waitForCompletion: [true],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: showOnlyForGenerationCreate,
		},
		options: [
			{
				displayName: 'Collection Name or ID',
				name: 'collection',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCollections',
				},
				default: '',
				description:
					'Photo pack for the background images. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Count',
				name: 'count',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 10,
				},
				default: 1,
				description: 'How many posts to generate (each costs credits)',
			},
			{
				displayName: 'Custom Hook',
				name: 'customHook',
				type: 'string',
				default: '',
				description: 'A cover headline written by you, used verbatim (overrides Hook Style)',
			},
			{
				displayName: 'First Slide Pack',
				name: 'firstSlidePack',
				type: 'string',
				default: '',
				description:
					'Selfie pack name for the cover slide only, for UGC-style templates (the body slides keep the collection)',
			},
			{
				displayName: 'Hook Style',
				name: 'hookStyle',
				type: 'options',
				options: [
					{ name: 'AI Pick', value: 'ai' },
					{ name: 'Article Headline', value: 'article' },
					{ name: 'Before & After', value: 'before-after' },
					{ name: 'Best Of', value: 'best-of' },
					{ name: 'Contrarian', value: 'contrarian' },
					{ name: 'Cooked In A…', value: 'cooked-in' },
					{ name: 'Craveable', value: 'craveable' },
					{ name: 'Curiosity Gap', value: 'curiosity-gap' },
					{ name: 'Free Download', value: 'free-download' },
					{ name: 'Gift Idea', value: 'gift-idea' },
					{ name: 'Headline', value: 'headline' },
					{ name: 'How-To', value: 'how-to' },
					{ name: 'Motivational', value: 'motivational' },
					{ name: 'Named Style', value: 'named-style' },
					{ name: 'Numbered (Listicle)', value: 'numbered' },
					{ name: 'Outfit Formula', value: 'outfit-formula' },
					{ name: 'Personal Take', value: 'personal' },
					{ name: 'Quick & Easy', value: 'quick-easy' },
					{ name: 'Real Numbers', value: 'real-numbers' },
					{ name: 'Seasonal Capsule', value: 'seasonal-capsule' },
					{ name: 'Shop the Look', value: 'shop-the-look' },
					{ name: "Who It's For", value: 'who-its-for' },
				],
				default: 'numbered',
				description:
					'Cover headline format. When omitted, a URL reuses the page headline and a topic gets the listicle hook.',
			},
			{
				displayName: 'Slides Per Post',
				name: 'slidesPerPost',
				type: 'number',
				typeOptions: {
					minValue: 2,
					maxValue: 12,
				},
				default: 6,
				description: 'Slideshows only: total slides per post, cover included',
			},
			{
				displayName: 'Template Names or IDs',
				name: 'templates',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTemplates',
				},
				default: [],
				description:
					'Layout templates to build on (several names rotate through the batch). Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Voice',
				name: 'voice',
				type: 'string',
				default: '',
				placeholder: 'e.g. casual and funny',
				description:
					'Tone: a preset ("gen-z" or "blunt-authority") or plain words. Defaults to gen-z.',
			},
		],
	},
	{
		displayName: 'Advanced Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForGenerationCreate,
		},
		options: [
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'string',
				default: '',
				placeholder: 'e.g. 4:5',
				description: 'Image aspect ratio such as 4:5, 9:16 or 1:1 (defaults to the template\'s)',
			},
			{
				displayName: 'Call to Action Comment Word',
				name: 'ctaCommentWord',
				type: 'string',
				default: '',
				placeholder: 'e.g. GUIDE',
				description: 'The word viewers should comment (with Call to Action Kind = Comment a Word)',
			},
			{
				displayName: 'Call to Action Kind',
				name: 'ctaKind',
				type: 'options',
				options: [
					{ name: 'Comment a Word', value: 'comment' },
					{ name: 'Link in Bio', value: 'link-bio' },
					{ name: 'Recommend a Product', value: 'product' },
				],
				default: 'link-bio',
				description: 'What the call to action asks viewers to do',
			},
			{
				displayName: 'Call to Action Placement',
				name: 'ctaMode',
				type: 'options',
				options: [
					{ name: 'Auto', value: 'auto' },
					{ name: 'Body Slide', value: 'body' },
					{ name: 'Caption Only', value: 'caption' },
					{ name: 'Last Slide', value: 'last-slide' },
					{ name: 'None', value: 'none' },
				],
				default: 'auto',
				description: 'Where the call to action goes (None removes it entirely)',
			},
			{
				displayName: 'Call to Action Product Name',
				name: 'ctaProductName',
				type: 'string',
				default: '',
				description: 'Product to recommend by name (with Call to Action Kind = Recommend a Product)',
			},
			{
				displayName: 'Custom Prompt',
				name: 'customPrompt',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: '',
				description: 'Your own creative instruction, followed above everything else',
			},
			{
				displayName: 'Include Caption',
				name: 'includeCaption',
				type: 'boolean',
				default: true,
				description: 'Whether to write a caption',
			},
			{
				displayName: 'Include Title',
				name: 'includeTitle',
				type: 'boolean',
				default: false,
				description: 'Whether to also write a separate post title (slideshows)',
			},
			{
				displayName: 'Keywords',
				name: 'keywords',
				type: 'string',
				default: '',
				description: 'SEO keywords to weave into titles and text (pins especially)',
			},
			{
				displayName: 'Media Mode',
				name: 'mediaMode',
				type: 'options',
				options: [
					{ name: 'Auto', value: 'auto' },
					{ name: 'Link Images Only', value: 'url-images' },
					{ name: 'Stock Photos', value: 'pexels' },
					{ name: 'Stock Video', value: 'pexels-video' },
					{ name: 'Web Search', value: 'web-search' },
				],
				default: 'auto',
				description: 'Where images come from when no collection is set',
			},
			{
				displayName: 'Media Query',
				name: 'mediaQuery',
				type: 'string',
				default: '',
				description: 'Search words for stock photos, stock video or web search',
			},
			{
				displayName: 'Promo Level',
				name: 'promoLevel',
				type: 'options',
				options: [
					{ name: 'Balanced', value: 'balanced' },
					{ name: 'Heavy', value: 'heavy' },
					{ name: 'Light', value: 'light' },
					{ name: 'None', value: 'none' },
				],
				default: 'balanced',
				description: 'How hard the posts push the linked product or site',
			},
		],
	},

	// ── Get ──
	{
		displayName: 'Generation ID',
		name: 'generationId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 3f2c9b1e-4a5d-4c6e-8f7a-9b0c1d2e3f4a',
		description: 'The ID of the generation job',
		displayOptions: {
			show: {
				...showOnlyForGenerations,
				operation: ['get'],
			},
		},
	},
];

export async function executeGeneration(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'getAll') {
		const response = await ampliApiRequest.call(this, 'GET', '/generations');
		return (response.jobs as IDataObject[] | undefined) ?? [];
	}

	if (operation === 'get') {
		const id = encodeURIComponent(this.getNodeParameter('generationId', itemIndex) as string);
		const response = await ampliApiRequest.call(this, 'GET', `/generations/${id}`);
		return (response.job as IDataObject | undefined) ?? response;
	}

	if (operation === 'create') {
		const additional = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;
		const options = compact(this.getNodeParameter('options', itemIndex, {}) as IDataObject);
		const body = compact({
			input: this.getNodeParameter('input', itemIndex) as string,
			format: this.getNodeParameter('format', itemIndex) as string,
			...additional,
			templates: toStringArray(additional.templates),
		});
		if (Object.keys(options).length > 0) body.options = options;

		const created = await ampliApiRequest.call(this, 'POST', '/generations', body);
		const waitForCompletion = this.getNodeParameter('waitForCompletion', itemIndex) as boolean;
		let job = (created.job as IDataObject | undefined) ?? created;
		if (!waitForCompletion) return job;

		const maxWaitSeconds = this.getNodeParameter('maxWaitSeconds', itemIndex) as number;
		const jobId = encodeURIComponent(String(job.id));
		const deadline = Date.now() + maxWaitSeconds * 1000;
		for (;;) {
			const status = String(job.status ?? '');
			if (status === 'completed') return job;
			if (status === 'failed') {
				throw new NodeOperationError(
					this.getNode(),
					`Generation failed: ${String(job.error ?? 'unknown error')}`,
					{ itemIndex },
				);
			}
			if (Date.now() >= deadline) {
				throw new NodeOperationError(
					this.getNode(),
					`Generation ${String(job.id)} is still ${status || 'running'} after ${maxWaitSeconds}s. Fetch it later with Generation → Get.`,
					{ itemIndex },
				);
			}
			await sleep(POLL_INTERVAL_MS);
			const polled = await ampliApiRequest.call(this, 'GET', `/generations/${jobId}`);
			job = (polled.job as IDataObject | undefined) ?? polled;
		}
	}
	return {};
}
