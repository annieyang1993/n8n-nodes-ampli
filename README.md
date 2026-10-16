# n8n-nodes-ampli

This is an n8n community node for [Ampli](https://www.useampli.com), a social media scheduler that also generates posts for you. With it, an n8n workflow can turn a URL, topic or text into slideshow or pin posts, upload your own images or videos, and schedule or publish to TikTok, Instagram, Pinterest, LinkedIn, Threads, Facebook, YouTube and X through the accounts connected in Ampli.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

- [Installation](#installation)
- [Credentials](#credentials)
- [Operations](#operations)
- [Example workflows](#example-workflows)
- [Notes](#notes)
- [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. The package name is `n8n-nodes-ampli`.

On n8n Cloud, search for **Ampli** in the nodes panel once the node is verified.

## Credentials

1. Sign in to [Ampli](https://www.useampli.com) and open **Settings → API Keys**.
2. Create a key and copy it (it starts with `vf_`).
3. In n8n, create an **Ampli API** credential and paste the key. Leave the base URL as `https://www.useampli.com/api/v1` unless you use Ampli on another domain.

Free and trial accounts include one active API key; paid plans include more. If you have already connected an AI assistant to Ampli, it holds a key too.

## Operations

| Resource | Operation | What it does |
| --- | --- | --- |
| Account | Get Many | List the connected social accounts (their IDs are what Post → Create takes) |
| Generation | Create | Generate posts from a URL, a topic or pasted text. Waits for the result by default |
| Generation | Get | Get a generation job and, once completed, its posts |
| Generation | Get Many | List the 25 most recent generation jobs |
| Generated Post | Get | Get the full record of one generated post |
| Generated Post | Get Many | List the generated-post library, newest first |
| Generated Post | Get Media | Render a generated post as hosted images or a video |
| Media | Upload | Upload an image or video from a binary field and get a hosted URL to post |
| Media | Get Many Collections | List the Ampli photo packs and your own collections |
| Media | Create Collection | Create one of your own photo collections |
| Media | Add to Collection | Add hosted image URLs to one of your own collections |
| Post | Create | Schedule a post, or publish it right away, to connected accounts |
| Post | Get | Get one scheduled or published post with its status, media and errors |
| Post | Get Many | List scheduled and published posts, filtered by status |
| Post | Retry | Re-run a failed post with the same media |
| Post | Cancel | Cancel a scheduled post |
| Template | Get Many | Browse the post templates to pass to Generation → Create |
| User | Get | The account behind the API key, with its credit balance |

The node can also be used as a tool by n8n's AI Agent node.

## Example workflows

### New blog post → TikTok and Instagram slideshow

1. **RSS Trigger** on your blog feed.
2. **Ampli → Generation → Create** with `Input` set to `{{ $json.link }}` and `Format` = Slideshow. Leave *Wait for Completion* on; the node returns the finished job.
3. **Ampli → Post → Create** with your TikTok and Instagram accounts selected, `Media Source` = Generated Post, `Generated Post ID` = `{{ $json.result.posts[0].id }}`, and a `Scheduled At` time.

### Upload a file from Google Drive and publish it now

1. **Google Drive → Download** a file (binary data in the `data` field).
2. **Ampli → Media → Upload** with `Input Binary Field` = `data`.
3. **Ampli → Post → Create** with `Media Source` = Media URLs, `Media URLs` = `{{ $json.mediaUrl }}`, `Timing` = Publish Now, and a caption under Additional Fields.

### Retry anything that failed overnight

1. **Schedule Trigger** every morning.
2. **Ampli → Post → Get Many** with `Status` = Failed.
3. **Ampli → Post → Retry** with `Post ID` = `{{ $json.id }}`.

## Notes

- **Credits.** Generating posts costs Ampli credits (4 per slideshow, 1 per pin). Posting your own media is free.
- **TikTok.** Under *Platform Options*, *TikTok Post Mode* defaults to *Send to Inbox*: the post arrives as a draft notification in the TikTok app for the creator to finish and post. Choose *Direct Publish* to post live, and then also set *TikTok Privacy*. Branded content cannot be posted with *Only Me* privacy.
- **Publish Now** waits for the attempt and returns its real outcome in `publishNow.outcome`: `published`, `retrying` (Ampli retries on its own at `nextAttemptAt`, so do not re-send) or `failed` (use Post → Retry rather than creating a new post).
- **Scheduled At** is read in the `Timezone` you give (UTC when empty), unless the value already carries an offset.
- **Uploads.** Files up to 3 MB are sent inline; larger files are streamed to Ampli's storage with a presigned upload. JPEG, PNG, WebP, GIF, MP4 and QuickTime are accepted.

## Resources

- [Ampli](https://www.useampli.com)
- [Ampli API reference (OpenAPI)](https://www.useampli.com/api/v1/openapi)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## Support

Email [hi@useampli.com](mailto:hi@useampli.com) or open an issue in this repository.

## License

[MIT](LICENSE)
