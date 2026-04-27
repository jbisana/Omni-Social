import { GoogleGenAI, Type } from '@google/genai';

// We initialize it dynamically so it doesn't break if API key is missing during import.
let ai: GoogleGenAI | null = null;

export function getGenAIClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export type Platform = 'twitter' | 'linkedin' | 'instagram';

export interface SocialPostDraft {
  post: string;
  imagePrompt: string;
}

export interface GeneratedDrafts {
  twitter: SocialPostDraft;
  linkedin: SocialPostDraft;
  instagram: SocialPostDraft;
}

export async function generateDrafts(idea: string, tone: string, hashtags: string, useEmojis: boolean): Promise<GeneratedDrafts> {
  const client = getGenAIClient();
  const emojiInstruction = useEmojis ? "Use emojis appropriately." : "DO NOT use any emojis in the posts.";
  const response = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Idea: ${idea}\nTone: ${tone}\nHashtags (for Instagram): ${hashtags}\n\nAct as an expert social media manager. I need drafted posts for Twitter/X (short & punchy), LinkedIn (long-form, professional but engaging), and Instagram (visual-focused with relevant hashtags) based on the idea and tone. Make sure to accurately and naturally incorporate the provided hashtags into the Instagram post.\n\n${emojiInstruction}\n\nAlso, provide a highly descriptive, contextually relevant prompt for an AI image generator to create a unique image tailored to each platform's style and audience based on the idea. The image prompt MUST include detailed aesthetics, subject matter, mood/lighting, and composition to generate a high quality and specific image.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          twitter: {
            type: Type.OBJECT,
            properties: {
              post: { type: Type.STRING },
              imagePrompt: { type: Type.STRING, description: "Detailed prompt for 16:9 image" }
            },
            required: ['post', 'imagePrompt']
          },
          linkedin: {
            type: Type.OBJECT,
            properties: {
              post: { type: Type.STRING },
              imagePrompt: { type: Type.STRING, description: "Detailed prompt for 4:3 image" }
            },
            required: ['post', 'imagePrompt']
          },
          instagram: {
            type: Type.OBJECT,
            properties: {
              post: { type: Type.STRING },
              imagePrompt: { type: Type.STRING, description: "Detailed prompt for 1:1 image" }
            },
            required: ['post', 'imagePrompt']
          }
        },
        required: ['twitter', 'linkedin', 'instagram']
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error('Failed to generate drafts');
  }

  return JSON.parse(text) as GeneratedDrafts;
}

export async function regenerateCaption(idea: string, tone: string, platform: string, hashtags: string, useEmojis: boolean): Promise<SocialPostDraft> {
  const client = getGenAIClient();
  const emojiInstruction = useEmojis ? "Use emojis appropriately." : "DO NOT use any emojis.";
  let platformInstruction = 'Twitter/X (short & punchy)';
  if (platform === 'linkedin') platformInstruction = 'LinkedIn (long-form, professional)';
  if (platform === 'instagram') platformInstruction = 'Instagram (visual-focused with relevant hashtags)';
  
  const response = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Idea: ${idea}\nTone: ${tone}\nHashtags: ${hashtags}\n\nAct as an expert social media manager. I need a drafted post for ${platformInstruction} based on the idea and tone. Make sure to accurately and naturally incorporate the provided hashtags if applicable.\n\n${emojiInstruction}\n\nAlso, provide a highly descriptive prompt for an AI image generator to create a unique image tailored to this platform's style and audience based on the idea.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          post: { type: Type.STRING },
          imagePrompt: { type: Type.STRING, description: "Detailed prompt for image generation" }
        },
        required: ['post', 'imagePrompt']
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error('Failed to generate caption');
  return JSON.parse(text) as SocialPostDraft;
}

export async function generateImage(prompt: string, aspectRatio: "16:9" | "4:3" | "1:1"): Promise<string> {
  const client = getGenAIClient();
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: prompt,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio,
      }
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
  }

  throw new Error('Image generation failed to return image data');
}
