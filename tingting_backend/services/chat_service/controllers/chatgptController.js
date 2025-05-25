require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = {
    chatGPTResponse: async (req, res) => {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Missing message' });
        }

        try {
            const messages = [
                {
                    role: 'system',
                    content: 'Bạn là một trợ lý AI thân thiện và hữu ích. Hãy trả lời ngắn gọn, rõ ràng và hữu ích.',
                },
                {
                    role: 'user',
                    content: message
                }
            ];

            const chatResponse = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: messages,
                temperature: 0.7,
                max_tokens: 3000,
            });

            const response = chatResponse.choices[0].message.content;
            res.json({
                data: {
                    message: response,
                    role: 'assistant'
                }
            });
        } catch (error) {
            console.error('Error in chat response:', error);
            res.status(500).json({ error: 'Something went wrong' });
        }
    }
};



