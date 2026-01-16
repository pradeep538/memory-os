#!/usr/bin/env node

/**
 * Seed Intent Registry with Core Intents
 */

import { db } from '../src/db/index.js';

const CORE_INTENTS = [
    {
        intent_name: 'TRACK_MEDICATION',
        description: 'Log medication intake or supplements',
        pattern_examples: [
            'I took aspirin',
            'Had my vitamin C',
            'Took 5mg of medication X',
            'Consumed my daily multivitamin'
        ],
        confidence_threshold: 0.9,
        is_critical: true,
        validation_rules: {
            duplicate_window_hours: 12,
            backdate_limit_hours: 2,
            require_checksum: true
        }
    },
    {
        intent_name: 'TRACK_EXPENSE',
        description: 'Financial transaction or expense',
        pattern_examples: [
            'Spent $50 on groceries',
            'Paid $120 for utilities',
            '$15 for coffee'
        ],
        confidence_threshold: 0.9,
        is_critical: true,
        validation_rules: {
            duplicate_window_minutes: 5,
            backdate_limit_days: 7,
            require_checksum: true,
            amount_precision: 2
        }
    },
    {
        intent_name: 'BUILD_HABIT',
        description: 'Building or maintaining a habit/routine',
        pattern_examples: [
            'I ran 5k',
            'Meditated for 10 minutes',
            'Did 20 pushups',
            'Went to the gym'
        ],
        confidence_threshold: 0.8,
        is_critical: false,
        validation_rules: {}
    },
    {
        intent_name: 'LEARN_SKILL',
        description: 'Learning new skill, language, or subject',
        pattern_examples: [
            'Studied Spanish for 30 minutes',
            'Practiced piano',
            'Read chapter 3 of calculus',
            'Learned Python functions'
        ],
        confidence_threshold: 0.7,
        is_critical: false,
        validation_rules: {}
    },
    {
        intent_name: 'TRACK_ROUTINE',
        description: 'Routine task or maintenance activity',
        pattern_examples: [
            'Watered the plants',
            'Fed the cat',
            'Changed air filter',
            'Cleaned the bathroom'
        ],
        confidence_threshold: 0.8,
        is_critical: false,
        validation_rules: {}
    },
    {
        intent_name: 'LOG_HEALTH',
        description: 'Health metrics or symptoms',
        pattern_examples: [
            'Blood pressure 120/80',
            'Weight 75kg',
            'Feeling tired today',
            'Headache severity 7/10'
        ],
        confidence_threshold: 0.8,
        is_critical: true,
        validation_rules: {
            backdate_limit_hours: 24
        }
    },
    {
        intent_name: 'GENERAL_LOG',
        description: 'General life event or note',
        pattern_examples: [
            'Had a good meeting today',
            'Saw a beautiful sunset',
            'Feeling grateful'
        ],
        confidence_threshold: 0.5,
        is_critical: false,
        validation_rules: {}
    }
];

const CORE_SIGNALS = [
    {
        signal_key: 'medication',
        signal_type: 'string',
        description: 'Name of medication or supplement',
        extractors: [
            {
                type: 'regex',
                pattern: '\\b(took|had|consumed|taken)\\s+([a-zA-Z\\s\\-]+)',
                group: 2
            },
            {
                type: 'regex',
                pattern: '\\b([a-zA-Z\\s\\-]+)\\s+(medication|pill|tablet|dose)',
                group: 1
            }
        ],
        validation_rules: {
            min_length: 2,
            max_length: 100
        }
    },
    {
        signal_key: 'amount',
        signal_type: 'number',
        description: 'Monetary amount',
        unit: 'dollars',
        extractors: [
            {
                type: 'regex',
                pattern: '\\$?(\\d+\\.?\\d*)',
                group: 1
            }
        ],
        validation_rules: {
            min: 0.01,
            max: 1000000,
            precision: 2
        }
    },
    {
        signal_key: 'activity',
        signal_type: 'string',
        description: 'Physical or mental activity',
        extractors: [
            {
                type: 'llm',
                prompt: 'Extract the main activity from this text'
            }
        ]
    },
    {
        signal_key: 'duration',
        signal_type: 'number',
        description: 'Duration in minutes',
        unit: 'minutes',
        extractors: [
            {
                type: 'regex',
                pattern: '(\\d+)\\s*(minutes?|mins?|m)',
                group: 1
            },
            {
                type: 'regex',
                pattern: '(\\d+)\\s*(hours?|hrs?|h)',
                group: 1,
                multiplier: 60
            }
        ],
        validation_rules: {
            min: 1,
            max: 1440
        }
    },
    {
        signal_key: 'skill',
        signal_type: 'string',
        description: 'Skill being learned',
        extractors: [
            {
                type: 'llm',
                prompt: 'Extract the skill or subject being learned'
            }
        ]
    },
    {
        signal_key: 'metric_value',
        signal_type: 'number',
        description: 'Health metric value',
        extractors: [
            {
                type: 'llm',
                prompt: 'Extract the numeric health metric value'
            }
        ]
    },
    {
        signal_key: 'metric_name',
        signal_type: 'string',
        description: 'Health metric name',
        extractors: [
            {
                type: 'llm',
                prompt: 'Extract the health metric name (e.g., blood pressure, weight)'
            }
        ]
    }
];

async function seedIntents() {
    console.log('📝 Seeding intent registry...\n');

    try {
        for (const intent of CORE_INTENTS) {
            await db.query(`
        INSERT INTO intent_registry (
          intent_name, description, pattern_examples,
          confidence_threshold, is_critical, validation_rules
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (intent_name) DO UPDATE SET
          description = EXCLUDED.description,
          pattern_examples = EXCLUDED.pattern_examples,
          confidence_threshold = EXCLUDED.confidence_threshold,
          validation_rules = EXCLUDED.validation_rules,
          updated_at = NOW()
      `, [
                intent.intent_name,
                intent.description,
                JSON.stringify(intent.pattern_examples),
                intent.confidence_threshold,
                intent.is_critical,
                JSON.stringify(intent.validation_rules)
            ]);

            console.log(`  ✓ ${intent.intent_name} (critical: ${intent.is_critical})`);
        }

        console.log(`\n✅ Seeded ${CORE_INTENTS.length} intents\n`);

    } catch (error) {
        console.error('❌ Failed to seed intents:', error.message);
        throw error;
    }
}

async function seedSignals() {
    console.log('📝 Seeding signal definitions...\n');

    try {
        for (const signal of CORE_SIGNALS) {
            await db.query(`
        INSERT INTO signal_definitions (
          signal_key, signal_type, description,
          extractors, validation_rules, unit
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (signal_key) DO UPDATE SET
          signal_type = EXCLUDED.signal_type,
          description = EXCLUDED.description,
          extractors = EXCLUDED.extractors,
          validation_rules = EXCLUDED.validation_rules,
          unit = EXCLUDED.unit
      `, [
                signal.signal_key,
                signal.signal_type,
                signal.description,
                JSON.stringify(signal.extractors),
                JSON.stringify(signal.validation_rules || {}),
                signal.unit || null
            ]);

            console.log(`  ✓ ${signal.signal_key} (${signal.signal_type})`);
        }

        console.log(`\n✅ Seeded ${CORE_SIGNALS.length} signals\n`);

    } catch (error) {
        console.error('❌ Failed to seed signals:', error.message);
        throw error;
    }
}

async function run() {
    console.log('='.repeat(60));
    console.log('Seeding Intent Architecture');
    console.log('='.repeat(60));
    console.log('');

    try {
        await seedIntents();
        await seedSignals();

        console.log('='.repeat(60));
        console.log('🎉 SEEDING COMPLETE');
        console.log('='.repeat(60));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run();
