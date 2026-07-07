import OpenAI from 'openai';

let clientInstance: OpenAI | null = null;

function getClient(): OpenAI {
  if (!clientInstance) {
    const apiKey = process.env.MODEL_API_KEY;
    if (!apiKey) {
      throw new Error('MODEL_API_KEY environment variable is not defined!');
    }
    clientInstance = new OpenAI({
      baseURL: 'https://integrate.api.nvidia.com/v1',
      apiKey: apiKey,
    });
  }
  return clientInstance;
}

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

  const completion = await getClient().chat.completions.create({
    model: 'qwen/qwen3-next-80b-a3b-instruct',
    messages: messages as any,
    temperature: temperature,
    top_p: 0.95,
    max_tokens: 16384,
    chat_template_kwargs: {
      thinking: true,
      reasoning_effort: reasoningEffort,
    },
    stream: false,
  } as any);

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
