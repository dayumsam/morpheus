// server/src/routes/dailyPrompts.ts
import { Router } from "express";
import OpenAI from "openai";

const router = Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/generate", async (req, res) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that generates thoughtful daily reflection prompts. 
          The prompts should encourage deep thinking, self-reflection, and knowledge connection. 
          Each prompt should be unique and engaging.`,
        },
        {
          role: "user",
          content: `Generate a thoughtful daily reflection prompt for ${new Date().toLocaleDateString()}. 
          The prompt should be concise (max 2 sentences) and encourage deep thinking about knowledge, learning, or personal growth.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const prompt = completion.choices[0].message.content;
    res.json({ prompt });
  } catch (error) {
    console.error("Error generating prompt:", error);
    res.status(500).json({ error: "Failed to generate prompt" });
  }
});

export default router;
