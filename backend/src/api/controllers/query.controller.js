import queryEngineService from '../../services/intelligence/queryEngineService.js';
import { queryParser } from '../../services/query/queryParser.js';
import { consistencyCalculator } from '../../services/query/consistencyCalculator.js';
import { transcribeAudio } from '../../services/ai/geminiService.js';
import { query as db } from '../../db/index.js';

class QueryController {
    /**
     * Process natural language query
     * POST /api/v1/query
     */
    async query(request, reply) {
        try {
            const { question } = request.body;

            if (!question) {
                return reply.code(400).send({
                    success: false,
                    error: 'Question is required'
                });
            }


            const userId = request.userId;

            const result = await queryEngineService.query(userId, question);

            reply.send(result);
        } catch (error) {
            request.log.error(error);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Handle voice query with consistency data
     * POST /api/v1/query/voice
     */
    async voiceQuery(request, reply) {
        try {
            const { audio, mimeType } = request.body;
            const userId = request.userId;

            if (!audio) {
                return reply.code(400).send({
                    success: false,
                    error: 'Audio is required'
                });
            }

            // 1. Speech-to-text
            const text = await transcribeAudio(audio, mimeType);

            // 2. Parse query with LLM
            const extracted = await queryParser.parse(text);

            // 3. Execute database query
            const queryResult = await queryParser.execute(userId, extracted, db);

            // 4. Fill answer template
            const answer = queryParser.fillTemplate(
                extracted.answer_template,
                queryResult.data,
                queryResult.found
            );

            // 5. Calculate consistency
            const consistency = await consistencyCalculator.calculate(
                userId,
                extracted.subject,
                extracted.search_keywords,
                7,
                db
            );

            reply.send({
                success: true,
                question: text,
                answer,
                subject: extracted.subject,
                query_type: extracted.query_type,
                consistency,
                evidence: queryResult.data || null
            });

        } catch (error) {
            request.log.error('Voice query error:', error);
            reply.code(500).send({
                success: false,
                error: 'Failed to process voice query',
                message: error.message
            });
        }
    }

    /**
     * Handle text query with consistency data (for testing)
     * POST /api/v1/query/text
     */
    async textQuery(request, reply) {
        try {
            const { question } = request.body;
            const userId = request.userId;

            if (!question) {
                return reply.code(400).send({
                    success: false,
                    error: 'Question is required'
                });
            }

            // Same logic as voice, but skip STT
            const extracted = await queryParser.parse(question);
            const queryResult = await queryParser.execute(userId, extracted, db);
            const answer = queryParser.fillTemplate(
                extracted.answer_template,
                queryResult.data,
                queryResult.found
            );

            const consistency = await consistencyCalculator.calculate(
                userId,
                extracted.subject,
                extracted.search_keywords,
                7,
                db
            );

            reply.send({
                success: true,
                question,
                answer,
                subject: extracted.subject,
                query_type: extracted.query_type,
                consistency,
                evidence: queryResult.data || null
            });

        } catch (error) {
            request.log.error('Text query error:', error);
            reply.code(500).send({
                success: false,
                error: 'Failed to process text query',
                message: error.message
            });
        }
    }
}

export default new QueryController();
