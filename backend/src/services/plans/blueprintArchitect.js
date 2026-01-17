import db from '../../db/index.js';
import llmService from '../understanding/llmService.js';
import { v4 as uuidv4 } from 'uuid';
import PlanModel from '../../models/plan.model.js';

class BlueprintArchitect {
    /**
     * Start a new Architect Session
     */
    async startSession(userId) {
        // Create a new session in DB
        const sessionId = uuidv4();
        const query = `
            INSERT INTO blueprint_sessions (id, user_id, status, current_draft, conversation_history)
            VALUES ($1, $2, 'active', '{}', '[]')
            RETURNING id
        `;
        await db.query(query, [sessionId, userId]);

        return {
            sessionId,
            message: "I'm ready to design your blueprint. What goal do you want to achieve?"
        };
    }

    /**
     * Process User Interaction
     * @param {string} userId 
     * @param {string} sessionId 
     * @param {string} userInput 
     */
    async processInteraction(userId, sessionId, userInput) {
        // 1. Fetch Session
        const sessionRes = await db.query(
            'SELECT * FROM blueprint_sessions WHERE id = $1 AND user_id = $2',
            [sessionId, userId]
        );

        if (sessionRes.rows.length === 0) {
            throw new Error('Session not found');
        }

        const session = sessionRes.rows[0];
        if (session.status !== 'active') {
            throw new Error('Session is closed');
        }

        let history = session.conversation_history;
        let draft = session.current_draft;

        // 2. Update History
        history.push({ role: 'user', text: userInput });

        // 3. Call LLM
        const prompt = this.buildPrompt(draft, history);
        const llmResponse = await llmService.generateStructuredResponse(prompt);
        const parsedResponse = this.parseResponse(llmResponse);

        // 4. Update Session State
        const nextMessage = parsedResponse.question || "Let's continue.";
        history.push({ role: 'assistant', text: nextMessage });

        let newDraft = { ...draft, ...parsedResponse.draft_updates };
        let newStatus = 'active';
        let finalPlan = null;

        if (parsedResponse.is_complete && parsedResponse.final_blueprint) {
            newStatus = 'completed';
            finalPlan = parsedResponse.final_blueprint;

            // Create the actual plan in the DB automatically? 
            // Or wait for frontend confirmation?
            // "Saperated once for the creation purpose" -> likely create it now.

            // Save final plan to Plans table
            const createdPlan = await PlanModel.create({
                userId,
                name: finalPlan.plan_name,
                description: finalPlan.description,
                category: finalPlan.category, // e.g., 'fitness'
                goal: finalPlan.goal,
                durationWeeks: finalPlan.duration_weeks || 4,
                phases: finalPlan.phases,
            });

            finalPlan.id = createdPlan.id; // Return the real ID
        }

        // Save session updates
        await db.query(`
            UPDATE blueprint_sessions 
            SET current_draft = $1, conversation_history = $2, status = $3, last_interaction_at = NOW()
            WHERE id = $4
        `, [newDraft, JSON.stringify(history), newStatus, sessionId]);

        return {
            sessionId,
            message: nextMessage,
            isComplete: parsedResponse.is_complete,
            blueprint: finalPlan
        };
    }

    /**
     * Build Prompt for the Architect Persona
     */
    buildPrompt(currentDraft, history) {
        // Limit history to last 10 turns to save tokens
        const recentHistory = history.slice(-10).map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n');

        return `You are Kairo, an expert Life Architect.
Your goal: Help the user design a scientifically robust Action Plan (Blueprint).

CURRENT DRAFT STATE:
${JSON.stringify(currentDraft, null, 2)}

CONVERSATION HISTORY:
${recentHistory}

TASK:
1. Analyze the user's latest input.
2. Update the Draft State with new info.
3. Determine if the Blueprint is complete (Needs: Goal, Domain, Frequency, Duration ~4-12 weeks, and at least 1 Phase).
4. If INCOMPLETE: Ask the next most important clarifying question (be brief, friendly, encouraging).
5. If COMPLETE: Generate the final JSON.

Respond ONLY with valid JSON:
{
  "draft_updates": { ...any new fields found... },
  "question": "Your next question to the user (if incomplete)",
  "is_complete": boolean,
  "final_blueprint": {
      "plan_name": "string",
      "category": "fitness|finance|routine|mindfulness|career|health",
      "goal": "string",
      "description": "string",
      "duration_weeks": number,
      "phases": [
          { "week": 1, "goal": "string", "target": "e.g. 3x/week" }
      ]
  } (only if is_complete is true)
}`;
    }

    parseResponse(jsonString) {
        try {
            let clean = jsonString;
            if (clean.includes('```json')) {
                clean = clean.split('```json')[1].split('```')[0].trim();
            } else if (clean.includes('```')) {
                clean = clean.split('```')[1].split('```')[0].trim();
            }
            return JSON.parse(clean);
        } catch (e) {
            console.error("LLM Parse Error", e);
            // Fallback
            return {
                draft_updates: {},
                question: "Could you clarify that?",
                is_complete: false
            };
        }
    }
}

export default new BlueprintArchitect();
