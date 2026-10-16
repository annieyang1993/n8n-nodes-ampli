import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { ampliApiRequest } from '../../shared/transport';
import { compact, toStringArray } from '../../shared/utils';

const showOnlyForPosts = {
	resource: ['post'],
};

const showOnlyForPostCreate = {
	...showOnlyForPosts,
	operation: ['create'],
};

export const postProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForPosts,
		},
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				action: 'Cancel a scheduled post',
				description: 'Cancel a scheduled post (published posts cannot be cancelled)',
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Schedule or publish a post',
				description: 'Schedule a post, or publish it right away, to connected accounts',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a post',
				description: 'Get one scheduled or published post with its status, media and errors',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many posts',
				description: 'List scheduled and published posts',
			},
			{
				name: 'Retry',
				value: 'retry',
				action: 'Retry a failed post',
				description:
					'Re-run a failed post now with the same media (accounts that already published are skipped)',
			},
		],
		default: 'create',
	},

	// ── Create ──
	{
		displayName: 'Social Account Names or IDs',
		name: 'socialAccountIds',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getAccounts',
		},
		default: [],
		required: true,
		description:
			'The connected accounts to post to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: showOnlyForPostCreate,
		},
	},
	{
		displayName: 'Media Source',
		name: 'mediaSource',
		type: 'options',
		options: [
			{
				name: 'Generated Post',
				value: 'generatedPost',
				description: 'A post from Generation → Create or the generated-post library',
			},
			{
				name: 'Media URLs',
				value: 'mediaUrls',
				description: 'Your own hosted images or video, e.g. from Media → Upload',
			},
		],
		default: 'generatedPost',
		displayOptions: {
			show: showOnlyForPostCreate,
		},
	},
	{
		displayName: 'Generated Post ID',
		name: 'generatedPostId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 8c4e1f0a-1b2c-4d3e-9f8a-7b6c5d4e3f2a',
		description: 'The generated post to publish; its slides are exported to hosted images automatically',
		displayOptions: {
			show: {
				...showOnlyForPostCreate,
				mediaSource: ['generatedPost'],
			},
		},
	},
	{
		displayName: 'Media URLs',
		name: 'mediaUrls',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. https://…/slide-1.jpg, https://…/slide-2.jpg',
		description:
			'Hosted image or video URLs, comma-separated (an array from an expression also works). Host files first with Media → Upload.',
		displayOptions: {
			show: {
				...showOnlyForPostCreate,
				mediaSource: ['mediaUrls'],
			},
		},
	},
	{
		displayName: 'Timing',
		name: 'timing',
		type: 'options',
		options: [
			{
				name: 'Publish Now',
				value: 'now',
				description: 'Publish immediately and wait for the outcome',
			},
			{
				name: 'Schedule',
				value: 'schedule',
				description: 'Queue the post for a later time',
			},
		],
		default: 'schedule',
		displayOptions: {
			show: showOnlyForPostCreate,
		},
	},
	{
		displayName: 'Scheduled At',
		name: 'scheduledAt',
		type: 'dateTime',
		default: '',
		required: true,
		description: 'When to publish',
		displayOptions: {
			show: {
				...showOnlyForPostCreate,
				timing: ['schedule'],
			},
		},
	},
	{
		displayName: 'Timezone',
		name: 'timezone',
		type: 'string',
		default: '',
		placeholder: 'e.g. America/Los_Angeles',
		description: 'IANA timezone the scheduled time is in. Defaults to UTC.',
		displayOptions: {
			show: {
				...showOnlyForPostCreate,
				timing: ['schedule'],
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
			show: showOnlyForPostCreate,
		},
		options: [
			{
				displayName: 'Caption',
				name: 'caption',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description: 'Post caption (defaults to the generated caption)',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description:
					'Title for platforms that have one: TikTok photo posts (90 characters max), Pinterest and YouTube (100 max)',
			},
		],
	},
	{
		displayName: 'Platform Options',
		name: 'platformOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForPostCreate,
		},
		options: [
			{
				displayName: 'Instagram Post Type',
				name: 'instagramType',
				type: 'options',
				options: [
					{ name: 'Feed', value: 'FEED' },
					{ name: 'Reel', value: 'REELS' },
					{ name: 'Story', value: 'STORIES' },
				],
				default: 'FEED',
				description: 'Where the post goes on Instagram',
			},
			{
				displayName: 'Pinterest Board ID',
				name: 'pinterestBoardId',
				type: 'string',
				default: '',
				description: 'The board to pin to',
			},
			{
				displayName: 'TikTok Allow Comments',
				name: 'tiktokAllowComments',
				type: 'boolean',
				default: true,
				description: 'Whether viewers can comment on the post',
			},
			{
				displayName: 'TikTok Allow Duet',
				name: 'tiktokAllowDuet',
				type: 'boolean',
				default: false,
				description: 'Whether others can Duet the video',
			},
			{
				displayName: 'TikTok Allow Stitch',
				name: 'tiktokAllowStitch',
				type: 'boolean',
				default: false,
				description: 'Whether others can Stitch the video',
			},
			{
				displayName: 'TikTok Auto Add Music',
				name: 'tiktokAutoAddMusic',
				type: 'boolean',
				default: false,
				description: 'Whether TikTok adds a trending song to a photo post',
			},
			{
				displayName: 'TikTok Branded Content',
				name: 'tiktokBrandedContent',
				type: 'boolean',
				default: false,
				description:
					'Whether the post promotes a third party (paid partnership). Requires TikTok Commercial Disclosure and cannot be combined with Only Me privacy.',
			},
			{
				displayName: 'TikTok Commercial Disclosure',
				name: 'tiktokCommercialDisclosure',
				type: 'boolean',
				default: false,
				description:
					'Whether the post is commercial content. Turn on TikTok Your Brand, TikTok Branded Content, or both.',
			},
			{
				displayName: 'TikTok Post Mode',
				name: 'tiktokPostMode',
				type: 'options',
				options: [
					{
						name: 'Direct Publish',
						value: 'direct',
						description: 'The post goes live on TikTok',
					},
					{
						name: 'Send to Inbox',
						value: 'inbox',
						description:
							'A draft arrives as a notification in the TikTok app for the creator to finish and post',
					},
				],
				default: 'inbox',
				description: 'How the post reaches TikTok',
			},
			{
				displayName: 'TikTok Privacy',
				name: 'tiktokPrivacy',
				type: 'options',
				options: [
					{ name: 'Followers', value: 'FOLLOWER_OF_CREATOR' },
					{ name: 'Friends', value: 'MUTUAL_FOLLOW_FRIENDS' },
					{ name: 'Only Me', value: 'SELF_ONLY' },
					{ name: 'Public', value: 'PUBLIC_TO_EVERYONE' },
				],
				default: 'SELF_ONLY',
				description: 'Who can view the post. Required for Direct Publish.',
			},
			{
				displayName: 'TikTok Your Brand',
				name: 'tiktokYourBrand',
				type: 'boolean',
				default: false,
				description: 'Whether the post promotes your own brand, product or service',
			},
		],
	},

	// ── Get / Cancel / Retry ──
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 0241d6e7-b9b4-4dc8-9ea3-1fe4420f5c3d',
		description: 'The ID of the scheduled post',
		displayOptions: {
			show: {
				...showOnlyForPosts,
				operation: ['cancel', 'get', 'retry'],
			},
		},
	},

	// ── Get Many ──
	{
		displayName: 'Status',
		name: 'status',
		type: 'multiOptions',
		options: [
			{ name: 'Cancelled', value: 'cancelled' },
			{ name: 'Failed', value: 'failed' },
			{ name: 'Published', value: 'published' },
			{ name: 'Publishing', value: 'publishing' },
			{ name: 'Retrying', value: 'retrying' },
			{ name: 'Scheduled', value: 'scheduled' },
		],
		default: [],
		description: 'Only posts in these states (all states when empty)',
		displayOptions: {
			show: {
				...showOnlyForPosts,
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				...showOnlyForPosts,
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				...showOnlyForPosts,
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'How many matching posts to skip',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
				options: [
					{ name: 'Earliest First', value: 'asc' },
					{ name: 'Newest First', value: 'desc' },
				],
				default: 'desc',
				description: 'Sort by posting time',
			},
		],
	},
];

/** The `platformOverrides` body field from the Platform Options collection. */
function buildPlatformOverrides(options: IDataObject): IDataObject {
	const has = (key: string): boolean => options[key] !== undefined;
	const tiktok: IDataObject = {};
	if (has('tiktokPostMode')) tiktok.post_mode = options.tiktokPostMode;
	if (has('tiktokPrivacy')) tiktok.privacy_level = options.tiktokPrivacy;
	if (has('tiktokAllowComments')) tiktok.disable_comment = !options.tiktokAllowComments;
	if (has('tiktokAllowDuet')) tiktok.disable_duet = !options.tiktokAllowDuet;
	if (has('tiktokAllowStitch')) tiktok.disable_stitch = !options.tiktokAllowStitch;
	if (has('tiktokAutoAddMusic')) tiktok.auto_add_music = options.tiktokAutoAddMusic;
	if (has('tiktokCommercialDisclosure')) {
		tiktok.commercial_disclosure = options.tiktokCommercialDisclosure;
	}
	if (has('tiktokYourBrand')) tiktok.brand_organic = options.tiktokYourBrand;
	if (has('tiktokBrandedContent')) tiktok.branded_content = options.tiktokBrandedContent;

	const overrides: IDataObject = {};
	if (Object.keys(tiktok).length > 0) overrides.tiktok = tiktok;
	if (options.pinterestBoardId) overrides.pinterest = { board_id: options.pinterestBoardId };
	if (options.instagramType) overrides.instagram = { type: options.instagramType };
	return overrides;
}

export async function executePost(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'create') {
		const socialAccountIds = toStringArray(this.getNodeParameter('socialAccountIds', itemIndex));
		if (socialAccountIds.length === 0) {
			throw new NodeOperationError(this.getNode(), 'Select at least one social account', {
				itemIndex,
			});
		}
		const body: IDataObject = { socialAccountIds };

		const mediaSource = this.getNodeParameter('mediaSource', itemIndex) as string;
		if (mediaSource === 'generatedPost') {
			body.generatedPostId = this.getNodeParameter('generatedPostId', itemIndex) as string;
		} else {
			const mediaUrls = toStringArray(this.getNodeParameter('mediaUrls', itemIndex));
			if (mediaUrls.length === 0) {
				throw new NodeOperationError(this.getNode(), 'Media URLs must contain at least one URL', {
					itemIndex,
				});
			}
			body.mediaUrls = mediaUrls;
		}

		const timing = this.getNodeParameter('timing', itemIndex) as string;
		if (timing === 'now') {
			body.publishNow = true;
		} else {
			body.scheduledAt = String(this.getNodeParameter('scheduledAt', itemIndex)).trim();
			const timezone = (this.getNodeParameter('timezone', itemIndex, '') as string).trim();
			if (timezone) body.timezone = timezone;
		}

		const additional = compact(this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject);
		Object.assign(body, additional);

		const overrides = buildPlatformOverrides(
			this.getNodeParameter('platformOptions', itemIndex, {}) as IDataObject,
		);
		if (Object.keys(overrides).length > 0) body.platformOverrides = overrides;

		return await ampliApiRequest.call(this, 'POST', '/posts', body);
	}

	if (operation === 'getAll') {
		const status = toStringArray(this.getNodeParameter('status', itemIndex));
		const limit = this.getNodeParameter('limit', itemIndex) as number;
		const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
		const response = await ampliApiRequest.call(
			this,
			'GET',
			'/posts',
			undefined,
			compact({ ...options, status: status.join(','), limit: Math.min(limit, 100) }),
		);
		return (response.posts as IDataObject[] | undefined) ?? [];
	}

	const id = encodeURIComponent(this.getNodeParameter('postId', itemIndex) as string);
	if (operation === 'get') {
		const response = await ampliApiRequest.call(this, 'GET', `/posts/${id}`);
		return (response.post as IDataObject | undefined) ?? response;
	}
	if (operation === 'retry') {
		return await ampliApiRequest.call(this, 'POST', `/posts/${id}/retry`);
	}
	if (operation === 'cancel') {
		return await ampliApiRequest.call(this, 'DELETE', `/posts/${id}`);
	}
	return {};
}
