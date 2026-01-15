import db from '../../db/index.js';
import llmService from '../understanding/llmService.js';

/**
 * Entity Extraction Service
 * Extracts entities (people, places, items, organizations) from memory data
 */
class EntityExtractionService {
    /**
     * Extract entities from memory unit using LLM
     */
    async extractEntities(memoryUnit) {
        const { user_id, normalized_data, original_input } = memoryUnit;

        try {
            // Use LLM to extract entities
            const entities = await this.llmExtractEntities(original_input, normalized_data);

            // Store entities in database
            const storedEntities = await this.storeEntities(user_id, entities, memoryUnit.id);

            return {
                extracted: entities.length,
                stored: storedEntities.length,
                entities: storedEntities
            };
        } catch (error) {
            console.error('Entity extraction error:', error);
            return { extracted: 0, stored: 0, entities: [], error: error.message };
        }
    }

    /**
     * Use LLM to extract entities from text
     */
    async llmExtractEntities(originalInput, normalizedData) {
        const prompt = `
Extract all meaningful entities from this user input. An entity is a specific person, place, item, organization, or concept.

Input: "${originalInput}"
Normalized data: ${JSON.stringify(normalizedData)}

Extract entities in these categories:
- person: Names of people (e.g., "John", "Dr. Smith", "mom")
- place: Locations (e.g., "gym", "Starbucks", "Central Park", "home")
- item: Physical objects (e.g., "laptop", "vitamin D", "yoga mat")
- organization: Companies, groups (e.g., "Google", "cooking class", "book club")
- concept: Abstract concepts (e.g., "productivity", "mindfulness")

Return ONLY a JSON array of entity objects. Each entity should have:
{
  "entity_type": "person" | "place" | "item" | "organization" | "concept",
  "name": "entity name",
  "category": "category from normalized data if applicable",
  "confidence": 0.0-1.0
}

Example:
Input: "Had coffee with Sarah at Starbucks, discussed my new MacBook"
Output: [
  {"entity_type": "person", "name": "Sarah", "category": null, "confidence": 0.95},
  {"entity_type": "place", "name": "Starbucks", "category": "finance", "confidence": 0.9},
  {"entity_type": "item", "name": "MacBook", "category": null, "confidence": 0.85}
]

Return empty array [] if no entities found. Return ONLY the JSON array.
`;

        try {
            const result = await llmService.ai.models.generateContent({
                model: 'gemini-2.0-flash-exp',
                contents: prompt
            });

            let jsonText = result.text.trim();

            // Extract JSON from code blocks
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.slice(7, -3).trim();
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.slice(3, -3).trim();
            }

            const entities = JSON.parse(jsonText);

            // Validate entities
            return Array.isArray(entities) ? entities : [];
        } catch (error) {
            console.error('LLM entity extraction failed:', error);
            // Fallback to simple extraction
            return this.fallbackExtraction(originalInput, normalizedData);
        }
    }

    /**
     * Fallback extraction when LLM fails
     */
    fallbackExtraction(input, normalizedData) {
        const entities = [];

        // Extract from normalized data
        if (normalizedData.person) {
            entities.push({
                entity_type: 'person',
                name: normalizedData.person,
                category: normalizedData.category,
                confidence: 0.7
            });
        }

        if (normalizedData.item) {
            entities.push({
                entity_type: 'item',
                name: normalizedData.item,
                category: normalizedData.category,
                confidence: 0.7
            });
        }

        return entities;
    }

    /**
     * Store entities in database (upsert to update mention count)
     */
    async storeEntities(userId, entities, memoryId) {
        const stored = [];

        for (const entity of entities) {
            try {
                const query = `
                    INSERT INTO entities (
                        user_id, entity_type, name, category, 
                        properties, confidence_score, mention_count
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, 1)
                    ON CONFLICT (user_id, entity_type, name)
                    DO UPDATE SET
                        last_seen_at = NOW(),
                        mention_count = entities.mention_count + 1,
                        category = COALESCE($4, entities.category),
                        confidence_score = GREATEST(entities.confidence_score, $6),
                        properties = entities.properties || $5
                    RETURNING *
                `;

                const values = [
                    userId,
                    entity.entity_type,
                    entity.name,
                    entity.category || null,
                    JSON.stringify({ memory_id: memoryId }),
                    entity.confidence || 0.7
                ];

                const result = await db.query(query, values);
                stored.push(result.rows[0]);
            } catch (error) {
                console.error(`Failed to store entity ${entity.name}:`, error.message);
            }
        }

        return stored;
    }

    /**
     * Extract entities from batch of memories
     */
    async extractFromMemories(userId, limit = 100) {
        // Get recent unprocessed memories
        const query = `
            SELECT * FROM memory_units
            WHERE user_id = $1
              AND status = 'validated'
            ORDER BY created_at DESC
            LIMIT $2
        `;

        const result = await db.query(query, [userId, limit]);
        const memories = result.rows;

        const results = {
            processed: 0,
            extracted: 0,
            failed: 0,
            entities: []
        };

        for (const memory of memories) {
            try {
                const extraction = await this.extractEntities(memory);
                results.processed++;
                results.extracted += extraction.extracted;
                results.entities.push(...extraction.entities);
            } catch (error) {
                results.failed++;
            }
        }

        return results;
    }
}

export default new EntityExtractionService();
