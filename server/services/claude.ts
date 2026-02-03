
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY || "",
});

const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';

export async function generateContentFromClaude(
    systemInstruction: string,
    userContent: string
): Promise<{ text: string }> {
    try {
        console.log(`Using fallback model: ${CLAUDE_MODEL}`);
        const message = await anthropic.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: 4096, // Reasonable default for itinerary generation
            system: systemInstruction,
            messages: [
                { role: 'user', content: userContent }
            ],
        });

        // Content is an array of content blocks. expecting text type.
        const textBlock = message.content.find(block => block.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
            throw new Error('Unexpected response format from Claude');
        }

        return {
            text: textBlock.text
        };

    } catch (error) {
        console.error("Error generating content with Claude:", error);
        throw error;
    }
}
