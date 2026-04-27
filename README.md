# OmniSocial

An AI-powered social media content generator that drafts posts and generates custom imagery for Twitter, LinkedIn, and Instagram simultaneously.

## Features

- **Multi-Platform Generation**: Create tailored content for Twitter, LinkedIn, and Instagram from a single idea.
- **AI Imagery**: Automatically generates unique images for each platform in the correct aspect ratio (16:9, 4:3, 1:1).
- **Tone Control**: Choose between Professional, Witty, or Urgent tones.
- **Save & Schedule**: Keep track of your content and set publish dates.
- **Post Analytics**: Track your drafted vs. scheduled content.
- **Emoji Toggle**: Enable or disable emojis with a single click.
- **Custom Links**: Automatically append your business or campaign link to every post.

## Getting Started

To set up the project locally, run our setup script:

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

Then start the development server:

```bash
npm run dev
```

## Environment Variables

Make sure to set your `GEMINI_API_KEY` in the `.env` file. See `.env.example` for the required format.
