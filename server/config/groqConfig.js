import dotenv from 'dotenv';

dotenv.config();

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
    this.candidateModels = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768'
    ];
  }

  async generateContent(prompt) {
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY is not defined in environment variables.');
    }

    let lastError = null;

    for (const model of this.candidateModels) {
      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5
          })
        });

        const data = await response.json();

        if (response.ok && data?.choices?.[0]?.message?.content) {
          return data.choices[0].message.content;
        }

        throw new Error(data?.error?.message || `Groq HTTP ${response.status}`);
      } catch (err) {
        console.warn(`Groq Model "${model}" failed:`, err?.message || err);
        lastError = err;
      }
    }

    throw lastError || new Error('All Groq candidate models failed to generate a response.');
  }
}

const groq = new GroqService();
export default groq;