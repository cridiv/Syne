import OpenAI from 'openai';

// Initialize the OpenAI client pointing to NVIDIA's NIM API
// Expects NVIDIA_API_KEY to be set in environment variables
const client = new OpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.MODEL_API_KEY || '',
});

export interface ModelMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelResponse {
  content: string;
  reasoning: string | null;
}

/**
 * Calls DeepSeek-v4-flash model via NVIDIA NIM and returns the content and reasoning.
 * 
 * @param messages Array of ChatCompletionMessageParam
 * @param options Additional options such as temperature
 */
export async function callModel(
  messages: ModelMessage[],
  options: { temperature?: number; reasoningEffort?: 'low' | 'medium' | 'high' } = {}
): Promise<ModelResponse> {
  const temperature = options.temperature ?? 1;
  const reasoningEffort = options.reasoningEffort ?? 'high';

  const completion = await client.chat.completions.create({
    model: 'deepseek-ai/deepseek-v4-flash',
    messages: messages,
    temperature: temperature,
    top_p: 0.95,
    max_tokens: 16384,
    extra_body: {
      chat_template_kwargs: {
        thinking: true,
        reasoning_effort: reasoningEffort,
      },
    },
    stream: false,
  });

  const choice = completion.choices[0];
  const content = choice.message?.content || '';

  // Extract reasoning content using typical custom fields returned by DeepSeek on NVIDIA NIM
  const reasoning =
    (choice.message as any).reasoning ||
    (choice.message as any).reasoning_content ||
    null;

  return {
    content,
    reasoning,
  };
}
