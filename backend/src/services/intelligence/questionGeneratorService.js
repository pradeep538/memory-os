import llmService from '../understanding/llmService.js';

class QuestionGeneratorService {
    /**
     * Generate a teaser question from an insight
     * This creates curiosity without revealing the answer
     */
    async generateQuestion(insight) {
        const prompt = `
You are generating a curiosity-driven teaser question for a user insight.

Insight: "${insight.insight}"
Category: ${insight.category}
Type: ${insight.type}

Generate a short, engaging question (max 10 words) that:
- Creates curiosity about the insight
- Doesn't reveal the answer
- Sounds intriguing and personal
- Makes user want to tap to reveal

Good examples:
Insight: "You meditate best at 6 AM with 90% success rate"
Question: "When is your meditation sweet spot? 🧘"

Insight: "You work out 4x per week consistently"
Question: "How consistent are your workouts? 💪"

Insight: "Late dinners correlate with poor sleep quality"
Question: "What affects your sleep quality most? 😴"

Insight: "You spend 23% less on days you work out"
Question: "How do workouts affect your spending? 💰"

Now generate a teaser question for the given insight. Return ONLY the question, nothing else.
`;

        try {
            const question = await llmService.generateResponse('teaser_question', { insight });
            return question.trim();
        } catch (error) {
            console.error('Question generation failed:', error);
            // Fallback questions by category
            return this.getFallbackQuestion(insight.category);
        }
    }

    /**
     * Fallback questions if LLM fails
     */
    getFallbackQuestion(category) {
        const fallbacks = {
            fitness: "What's your fitness pattern? 💪",
            finance: "What's your spending habit? 💰",
            mindfulness: "When do you feel most centered? 🧘",
            routine: "Are you consistent with routines? ⏰",
            health: "What affects your wellbeing most? 🌟",
            generic: "What have we noticed about you? 🤔"
        };

        return fallbacks[category] || "What did we discover? 🔍";
    }

    /**
     * Generate emoji for category
     */
    getCategoryEmoji(category) {
        const emojis = {
            fitness: "💪",
            finance: "💰",
            mindfulness: "🧘",
            routine: "⏰",
            health: "🌟",
            generic: "✨"
        };

        return emojis[category] || "💡";
    }
}

export default new QuestionGeneratorService();
