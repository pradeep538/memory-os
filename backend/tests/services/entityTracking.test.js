import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import EntityService from '../../src/services/entities/entityService.js';
import EntityExtractionService from '../../src/services/entities/entityExtractionService.js';
import db from '../../src/db/index.js';
import llmService from '../../src/services/understanding/llmService.js';

// Mock dependencies
jest.mock('../../src/db/index.js', () => ({
    default: {
        query: jest.fn()
    }
}));

jest.mock('../../src/services/understanding/llmService.js', () => ({
    default: {
        ai: {
            models: {
                generateContent: jest.fn()
            }
        }
    }
}));

describe('Entity Tracking System', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('EntityService', () => {
        let service;

        beforeEach(() => {
            service = new EntityService.constructor();
        });

        describe('getUserEntities()', () => {
            it('should get all entities for user', async () => {
                db.query.mockResolvedValueOnce({
                    rows: [
                        { id: '1', entity_type: 'person', name: 'John', mention_count: 5 },
                        { id: '2', entity_type: 'place', name: 'Gym', mention_count: 10 }
                    ]
                });

                const entities = await EntityService.getUserEntities('test-user');

                expect(entities.length).toBe(2);
                expect(entities[0].entity_type).toBe('person');
                expect(db.query).toHaveBeenCalled();
            });

            it('should filter by entity_type', async () => {
                db.query.mockResolvedValueOnce({
                    rows: [{ id: '1', entity_type: 'person', name: 'John' }]
                });

                await EntityService.getUserEntities('test-user', { entity_type: 'person' });

                const query = db.query.mock.calls[0][0];
                expect(query).toContain('entity_type = $2');
            });

            it('should filter by category', async () => {
                db.query.mockResolvedValueOnce({ rows: [] });

                await EntityService.getUserEntities('test-user', { category: 'fitness' });

                const query = db.query.mock.calls[0][0];
                expect(query).toContain('category = $2');
            });

            it('should search by name', async () => {
                db.query.mockResolvedValueOnce({ rows: [] });

                await EntityService.getUserEntities('test-user', { search: 'john' });

                const query = db.query.mock.calls[0][0];
                expect(query).toContain('ILIKE');
            });

            it('should apply pagination', async () => {
                db.query.mockResolvedValueOnce({ rows: [] });

                await EntityService.getUserEntities('test-user', { limit: 10, offset: 20 });

                const query = db.query.mock.calls[0][0];
                expect(query).toContain('LIMIT 10 OFFSET 20');
            });
        });

        describe('searchEntities()', () => {
            it('should search entities by name', async () => {
                db.query.mockResolvedValueOnce({
                    rows: [{ id: '1', name: 'John Doe' }]
                });

                const results = await EntityService.searchEntities('test-user', 'john');

                expect(results.length).toBe(1);
                expect(results[0].name).toBe('John Doe');
            });

            it('should filter search by entity_type', async () => {
                db.query.mockResolvedValueOnce({ rows: [] });

                await EntityService.searchEntities('test-user', 'test', 'person');

                const query = db.query.mock.calls[0][0];
                expect(query).toContain('entity_type = $3');
            });
        });

        describe('getEntityStats()', () => {
            it('should return entity statistics', async () => {
                db.query.mockResolvedValueOnce({
                    rows: [
                        { entity_type: 'person', count: '5', total_mentions: '25' },
                        { entity_type: 'place', count: '3', total_mentions: '15' }
                    ]
                });

                const stats = await EntityService.getEntityStats('test-user');

                expect(stats.length).toBe(2);
                expect(stats[0].entity_type).toBe('person');
                expect(stats[0].count).toBe('5');
            });
        });

        describe('getTopEntities()', () => {
            it('should get top entities by mention count', async () => {
                db.query.mockResolvedValueOnce({
                    rows: [
                        { id: '1', name: 'Gym', mention_count: 20 },
                        { id: '2', name: 'John', mention_count: 15 }
                    ]
                });

                const top = await EntityService.getTopEntities('test-user', 10);

                expect(top.length).toBe(2);
                expect(top[0].mention_count).toBe(20);
            });

            it('should filter top entities by type', async () => {
                db.query.mockResolvedValueOnce({ rows: [] });

                await EntityService.getTopEntities('test-user', 5, 'person');

                const query = db.query.mock.calls[0][0];
                expect(query).toContain('entity_type = $2');
            });
        });

        describe('updateEntity()', () => {
            it('should update entity fields', async () => {
                db.query.mockResolvedValueOnce({
                    rows: [{ id: '1', name: 'Updated Name', category: 'fitness' }]
                });

                const updated = await EntityService.updateEntity('test-user', 'entity-1', {
                    name: 'Updated Name',
                    category: 'fitness'
                });

                expect(updated.name).toBe('Updated Name');
            });

            it('should throw error when no valid fields', async () => {
                await expect(
                    EntityService.updateEntity('test-user', 'entity-1', {})
                ).rejects.toThrow('No valid fields to update');
            });

            it('should throw error when entity not found', async () => {
                db.query.mockResolvedValueOnce({ rows: [] });

                await expect(
                    EntityService.updateEntity('test-user', 'entity-1', { name: 'Test' })
                ).rejects.toThrow('Entity not found');
            });
        });

        describe('deleteEntity()', () => {
            it('should delete entity', async () => {
                db.query.mockResolvedValueOnce({
                    rows: [{ id: '1', name: 'Deleted' }]
                });

                const deleted = await EntityService.deleteEntity('test-user', 'entity-1');

                expect(deleted.name).toBe('Deleted');
            });

            it('should throw error when entity not found', async () => {
                db.query.mockResolvedValueOnce({ rows: [] });

                await expect(
                    EntityService.deleteEntity('test-user', 'entity-1')
                ).rejects.toThrow('Entity not found');
            });
        });
    });

    describe('EntityExtractionService', () => {
        describe('llmExtractEntities()', () => {
            it('should extract entities using LLM', async () => {
                const mockResponse = {
                    text: JSON.stringify([
                        { entity_type: 'person', name: 'Sarah', category: null, confidence: 0.95 },
                        { entity_type: 'place', name: 'Starbucks', category: 'finance', confidence: 0.9 }
                    ])
                };

                llmService.ai.models.generateContent.mockResolvedValueOnce(mockResponse);

                const entities = await EntityExtractionService.llmExtractEntities(
                    'Had coffee with Sarah at Starbucks',
                    {}
                );

                expect(entities.length).toBe(2);
                expect(entities[0].entity_type).toBe('person');
                expect(entities[0].name).toBe('Sarah');
                expect(entities[1].entity_type).toBe('place');
            });

            it('should handle JSON in code blocks', async () => {
                const mockResponse = {
                    text: '```json\n[{"entity_type":"person","name":"John","confidence":0.9}]\n```'
                };

                llmService.ai.models.generateContent.mockResolvedValueOnce(mockResponse);

                const entities = await EntityExtractionService.llmExtractEntities('text', {});

                expect(entities.length).toBe(1);
                expect(entities[0].name).toBe('John');
            });

            it('should fallback when LLM fails', async () => {
                llmService.ai.models.generateContent.mockRejectedValueOnce(new Error('LLM error'));

                const entities = await EntityExtractionService.llmExtractEntities(
                    'test',
                    { person: 'John', category: 'finance' }
                );

                expect(entities.length).toBe(1);
                expect(entities[0].entity_type).toBe('person');
                expect(entities[0].name).toBe('John');
            });

            it('should return empty array for invalid JSON', async () => {
                llmService.ai.models.generateContent.mockResolvedValueOnce({
                    text: 'Not JSON'
                });

                const entities = await EntityExtractionService.llmExtractEntities('text', {});

                expect(Array.isArray(entities)).toBe(true);
                expect(entities.length).toBe(0);
            });
        });

        describe('fallbackExtraction()', () => {
            it('should extract person from normalized data', () => {
                const entities = EntityExtractionService.fallbackExtraction('text', {
                    person: 'John',
                    category: 'finance'
                });

                expect(entities.length).toBe(1);
                expect(entities[0].entity_type).toBe('person');
                expect(entities[0].name).toBe('John');
            });

            it('should extract item from normalized data', () => {
                const entities = EntityExtractionService.fallbackExtraction('text', {
                    item: 'laptop',
                    category: 'routine'
                });

                expect(entities.length).toBe(1);
                expect(entities[0].entity_type).toBe('item');
            });

            it('should extract both person and item', () => {
                const entities = EntityExtractionService.fallbackExtraction('text', {
                    person: 'Sarah',
                    item: 'book'
                });

                expect(entities.length).toBe(2);
            });
        });

        describe('storeEntities()', () => {
            it('should store entities with upsert', async () => {
                db.query
                    .mockResolvedValueOnce({ rows: [{ id: '1', name: 'John', mention_count: 1 }] })
                    .mockResolvedValueOnce({ rows: [{ id: '2', name: 'Gym', mention_count: 1 }] });

                const stored = await EntityExtractionService.storeEntities('user-1', [
                    { entity_type: 'person', name: 'John', confidence: 0.9 },
                    { entity_type: 'place', name: 'Gym', confidence: 0.85 }
                ], 'memory-1');

                expect(stored.length).toBe(2);
                expect(db.query).toHaveBeenCalledTimes(2);
            });

            it('should handle storage errors gracefully', async () => {
                db.query.mockRejectedValueOnce(new Error('DB error'));

                const stored = await EntityExtractionService.storeEntities('user-1', [
                    { entity_type: 'person', name: 'John' }
                ], 'memory-1');

                expect(stored.length).toBe(0);
            });
        });
    });
});
